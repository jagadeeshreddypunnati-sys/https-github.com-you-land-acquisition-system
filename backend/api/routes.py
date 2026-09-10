# backend/api/routes.py
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from typing import List, Optional
from datetime import datetime, timedelta
import random

from ..database import get_db
from ..models import (User, Project, Milestone, Parcel, Document, Alert,
                      AIRisk, HistoricalRecord, AuditLog,
                      UserRole, ProjectStatus, MilestoneStatus, ParcelStatus, WorkProgress)
from ..schemas import (UserCreate, UserLogin, UserOut, Token, ProjectCreate, ProjectUpdate,
                       ProjectOut, ProjectListOut, MilestoneOut, ParcelOut,
                       HistoricalRecordCreate, HistoricalRecordOut,
                       AIRiskInput, AIRiskOut, DocumentOut, AlertOut,
                       SearchResult, DashboardStats)
from ..auth import verify_password, get_password_hash, create_access_token, decode_access_token
from ..ai_risk import calculate_risk_score

router = APIRouter()

# --- Auth ---
def get_current_user(token: str = None, db: Session = Depends(get_db)) -> User:
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = db.query(User).filter(User.id == payload.get("sub")).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

def log_audit(db: Session, user: User, action: str, entity_type: str, entity_id: int, details: str):
    audit = AuditLog(user_id=user.id, user_email=user.email, action=action,
                     entity_type=entity_type, entity_id=entity_id, details=details)
    db.add(audit)
    db.commit()

@router.post("/auth/register", response_model=UserOut)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == user_data.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(email=user_data.email, hashed_password=get_password_hash(user_data.password),
                name=user_data.name, role=user_data.role, state=user_data.state, district=user_data.district)
    db.add(user); db.commit(); db.refresh(user)
    return user

@router.post("/auth/login", response_model=Token)
def login(creds: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == creds.email, User.role == creds.role).first()
    if not user or not verify_password(creds.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token({"sub": user.id, "role": user.role.value})
    return {"access_token": token, "token_type": "bearer", "user": user}

@router.get("/auth/me", response_model=UserOut)
def me(current: User = Depends(get_current_user)):
    return current

# --- Projects ---
@router.get("/projects", response_model=List[ProjectListOut])
def list_projects(state: Optional[str] = None, status: Optional[str] = None,
                  search: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(Project)
    if state: q = q.filter(Project.state == state)
    if status: q = q.filter(Project.status == status)
    if search:
        q = q.filter(or_(Project.project_id.ilike(f"%{search}%"),
                         Project.name.ilike(f"%{search}%"),
                         Project.state.ilike(f"%{search}%")))
    projects = q.all()
    out = []
    for p in projects:
        risk = db.query(AIRisk).filter(AIRisk.project_id == p.id).first()
        prog = round((p.acquired_land_acres / p.total_land_acres * 100) if p.total_land_acres > 0 else 0, 1)
        ms = p.milestones
        current_stage = ms[p.current_stage_index].name if ms and 0 <= p.current_stage_index < len(ms) else "Proposal"
        out.append(ProjectListOut(
            id=p.id, project_id=p.project_id, name=p.name, state=p.state,
            progress=prog, risk_level=risk.risk_level if risk else "LOW",
            risk_score=risk.risk_score if risk else 0, current_stage=current_stage
        ))
    return out

@router.get("/projects/{project_id}", response_model=ProjectOut)
def get_project(project_id: int, db: Session = Depends(get_db)):
    p = db.query(Project).filter(Project.id == project_id).first()
    if not p: raise HTTPException(404, "Project not found")
    return p

@router.get("/projects/by-code/{code}", response_model=ProjectOut)
def get_project_by_code(code: str, db: Session = Depends(get_db)):
    p = db.query(Project).filter(Project.project_id == code.upper()).first()
    if not p: raise HTTPException(404, "Project not found")
    return p

@router.post("/projects", response_model=ProjectOut)
def create_project(data: ProjectCreate, current: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current.role not in [UserRole.PROJECT_AGENCY, UserRole.CENTRAL_ADMIN]:
        raise HTTPException(403, "Only Project Agency or Central Admin can create")
    p = Project(**data.model_dump())
    db.add(p); db.commit(); db.refresh(p)
    # Create default milestones
    stages = ["Proposal","Verification","Notification","Social Impact Assessment",
              "Land Valuation","Award Declaration","Compensation","Possession","R&R","Completed"]
    sla_map = {"Proposal":7,"Verification":15,"Notification":10,"Social Impact Assessment":30,
               "Land Valuation":21,"Award Declaration":14,"Compensation":30,"Possession":15,"R&R":60,"Completed":0}
    for i, s in enumerate(stages):
        m = Milestone(project_id=p.id, name=s, stage_order=i, sla_days=sla_map.get(s, 14))
        db.add(m)
    # Create AI risk record
    ai = AIRisk(project_id=p.id)
    db.add(ai)
    db.commit()
    log_audit(db, current, "CREATE_PROJECT", "project", p.id, f"Created {p.project_id}")
    return p

@router.patch("/projects/{project_id}", response_model=ProjectOut)
def update_project(project_id: int, data: ProjectUpdate, current: User = Depends(get_current_user), db: Session = Depends(get_db)):
    p = db.query(Project).filter(Project.id == project_id).first()
    if not p: raise HTTPException(404, "Not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(p, field, value)
    p.updated_at = datetime.utcnow()
    db.commit(); db.refresh(p)
    log_audit(db, current, "UPDATE_PROJECT", "project", p.id, f"Updated {data.model_dump(exclude_unset=True)}")
    return p

# --- Milestones ---
@router.get("/projects/{project_id}/milestones", response_model=List[MilestoneOut])
def get_milestones(project_id: int, db: Session = Depends(get_db)):
    return db.query(Milestone).filter(Milestone.project_id == project_id).order_by(Milestone.stage_order).all()

@router.patch("/projects/{project_id}/milestones/{milestone_id}", response_model=MilestoneOut)
def update_milestone(project_id: int, milestone_id: int, status: MilestoneStatus,
                     current: User = Depends(get_current_user), db: Session = Depends(get_db)):
    m = db.query(Milestone).filter(Milestone.id == milestone_id, Milestone.project_id == project_id).first()
    if not m: raise HTTPException(404, "Not found")
    # Role gate for Compensation
    if m.name == "Compensation" and status == MilestoneStatus.COMPLETED:
        if current.role not in [UserRole.STATE_OFFICER, UserRole.DISTRICT_OFFICER, UserRole.CENTRAL_ADMIN]:
            raise HTTPException(403, "Compensation completion requires State/District/Central Admin")
    m.status = status
    if status == MilestoneStatus.IN_PROGRESS and not m.started_at:
        m.started_at = datetime.utcnow()
    if status == MilestoneStatus.COMPLETED:
        m.completed_at = datetime.utcnow()
        # Advance project stage
        p = db.query(Project).filter(Project.id == project_id).first()
        if p and p.current_stage_index < len(p.milestones) - 1:
            p.current_stage_index += 1
            if m.name == "Compensation":
                p.ai_risk.pending_compensation_cases = 0
                p.ai_risk.days_overdue = 2
                p.acquired_land_acres = p.total_land_acres
                p.status = ProjectStatus.ON_TRACK
    db.commit(); db.refresh(m)
    log_audit(db, current, f"MILESTONE_{status.value.upper()}", "milestone", m.id, f"{m.name} -> {status.value}")
    return m

# --- Parcels (GIS) ---
@router.get("/projects/{project_id}/parcels", response_model=List[ParcelOut])
def get_parcels(project_id: int, work_progress: Optional[WorkProgress] = None, db: Session = Depends(get_db)):
    q = db.query(Parcel).filter(Parcel.project_id == project_id)
    if work_progress: q = q.filter(Parcel.work_progress == work_progress)
    return q.all()

@router.get("/parcels/{parcel_id}", response_model=ParcelOut)
def get_parcel_by_id(parcel_id: str, db: Session = Depends(get_db)):
    p = db.query(Parcel).filter(Parcel.parcel_id == parcel_id.upper()).first()
    if not p: raise HTTPException(404, "Parcel not found")
    return p

@router.patch("/parcels/{parcel_id}/work-progress", response_model=ParcelOut)
def update_work_progress(parcel_id: str, progress: WorkProgress,
                         current: User = Depends(get_current_user), db: Session = Depends(get_db)):
    p = db.query(Parcel).filter(Parcel.parcel_id == parcel_id.upper()).first()
    if not p: raise HTTPException(404, "Not found")
    p.work_progress = progress
    if progress != WorkProgress.NOT_STARTED and not p.work_started_date:
        p.work_started_date = datetime.utcnow()
    if progress == WorkProgress.COMPLETED:
        p.work_completed_date = datetime.utcnow()
        # Update project working/occupied land
        proj = db.query(Project).filter(Project.id == p.project_id).first()
        if proj:
            acquired_parcels = [par for par in proj.parcels if par.work_progress == WorkProgress.COMPLETED]
            proj.working_land_acres = sum(par.area_acres for par in proj.parcels if par.work_progress != WorkProgress.NOT_STARTED)
            proj.occupied_land_acres = sum(par.area_acres for par in acquired_parcels)
    db.commit(); db.refresh(p)
    log_audit(db, current, "UPDATE_WORK_PROGRESS", "parcel", p.id, f"{p.parcel_id} -> {progress.value}")
    return p

# --- Historical Records (visible to all) ---
@router.get("/projects/{project_id}/historical", response_model=List[HistoricalRecordOut])
def get_historical(project_id: int, db: Session = Depends(get_db)):
    return db.query(HistoricalRecord).filter(HistoricalRecord.project_id == project_id).order_by(HistoricalRecord.financial_year.desc()).all()

@router.get("/historical/all", response_model=List[HistoricalRecordOut])
def get_all_historical(fy: Optional[str] = None, state: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(HistoricalRecord).join(Project)
    if fy: q = q.filter(HistoricalRecord.financial_year == fy)
    if state: q = q.filter(Project.state == state)
    return q.all()

@router.post("/projects/{project_id}/historical", response_model=HistoricalRecordOut)
def add_historical(project_id: int, data: HistoricalRecordCreate,
                   current: User = Depends(get_current_user), db: Session = Depends(get_db)):
    p = db.query(Project).filter(Project.id == project_id).first()
    if not p: raise HTTPException(404, "Project not found")
    hr = HistoricalRecord(project_id=project_id, **data.model_dump())
    db.add(hr); db.commit(); db.refresh(hr)
    log_audit(db, current, "ADD_HISTORICAL", "historical", hr.id, f"FY {data.financial_year}")
    return hr

# --- AI Risk ---
@router.post("/projects/{project_id}/ai/risk", response_model=AIRiskOut)
def compute_risk(project_id: int, inp: AIRiskInput,
                 current: User = Depends(get_current_user), db: Session = Depends(get_db)):
    p = db.query(Project).filter(Project.id == project_id).first()
    if not p: raise HTTPException(404, "Not found")
    score, level, reason, action = calculate_risk_score(
        inp.pending_approvals, inp.pending_compensation_cases,
        inp.litigation_cases, inp.rr_pending_percent, inp.days_overdue
    )
    risk = db.query(AIRisk).filter(AIRisk.project_id == project_id).first()
    if not risk:
        risk = AIRisk(project_id=project_id)
        db.add(risk)
    risk.pending_approvals = inp.pending_approvals
    risk.pending_compensation_cases = inp.pending_compensation_cases
    risk.litigation_cases = inp.litigation_cases
    risk.rr_pending_percent = inp.rr_pending_percent
    risk.days_overdue = inp.days_overdue
    risk.risk_score = score
    risk.risk_level = level
    risk.reason = reason
    risk.recommended_action = action
    risk.calculated_at = datetime.utcnow()
    # Update project status if critical
    if level == "CRITICAL":
        p.status = ProjectStatus.CRITICAL
    elif level == "HIGH":
        p.status = ProjectStatus.DELAYED
    db.commit(); db.refresh(risk)
    log_audit(db, current, "AI_RISK_CALCULATE", "ai_risk", risk.id, f"Score: {score} ({level})")
    if level in ["HIGH", "CRITICAL"]:
        alert = Alert(project_id=project_id, severity=level.lower(), message=f"{p.project_id} {level} risk: {reason}. {action}")
        db.add(alert); db.commit()
    return risk

@router.get("/projects/{project_id}/ai/risk", response_model=AIRiskOut)
def get_risk(project_id: int, db: Session = Depends(get_db)):
    risk = db.query(AIRisk).filter(AIRisk.project_id == project_id).first()
    if not risk: raise HTTPException(404, "Risk not calculated yet")
    return risk

# --- Documents ---
@router.get("/projects/{project_id}/documents", response_model=List[DocumentOut])
def get_documents(project_id: int, db: Session = Depends(get_db)):
    return db.query(Document).filter(Document.project_id == project_id).order_by(Document.upload_date.desc()).all()

# --- Alerts ---
@router.get("/alerts", response_model=List[AlertOut])
def get_alerts(resolved: Optional[bool] = None, severity: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(Alert)
    if resolved is not None: q = q.filter(Alert.is_resolved == resolved)
    if severity: q = q.filter(Alert.severity == severity)
    return q.order_by(Alert.created_at.desc()).limit(50).all()

@router.patch("/alerts/{alert_id}/resolve")
def resolve_alert(alert_id: int, current: User = Depends(get_current_user), db: Session = Depends(get_db)):
    a = db.query(Alert).filter(Alert.id == alert_id).first()
    if not a: raise HTTPException(404, "Not found")
    a.is_resolved = True; a.resolved_by = current.id; a.resolved_at = datetime.utcnow()
    db.commit(); log_audit(db, current, "RESOLVE_ALERT", "alert", a.id, a.message)
    return {"ok": True}

# --- Search ---
@router.get("/search", response_model=List[SearchResult])
def search(q: str = Query(..., min_length=2), db: Session = Depends(get_db)):
    results = []
    # Projects
    projects = db.query(Project).filter(or_(Project.project_id.ilike(f"%{q}%"), Project.name.ilike(f"%{q}%"))).limit(10).all()
    for p in projects:
        results.append(SearchResult(type="project", id=p.id, title=p.project_id, subtitle=p.name, url=f"/projects/{p.id}"))
    # Parcels
    parcels = db.query(Parcel).filter(or_(Parcel.parcel_id.ilike(f"%{q}%"), Parcel.village.ilike(f"%{q}%"))).limit(10).all()
    for par in parcels:
        results.append(SearchResult(type="parcel", id=par.id, title=par.parcel_id, subtitle=f"{par.village} - {par.area_acres} acres", url=f"/projects/{par.project_id}/parcels/{par.id}"))
    # Historical
    hist = db.query(HistoricalRecord).join(Project).filter(or_(HistoricalRecord.financial_year.ilike(f"%{q}%"), Project.name.ilike(f"%{q}%"))).limit(5).all()
    for h in hist:
        results.append(SearchResult(type="historical", id=h.id, title=h.financial_year, subtitle=f"Occupied: {h.occupied_land_acres} acres", url=f"/projects/{h.project_id}/historical"))
    return results

# --- Dashboard ---
@router.get("/dashboard/stats", response_model=DashboardStats)
def dashboard_stats(db: Session = Depends(get_db)):
    projects = db.query(Project).all()
    alerts = db.query(Alert).filter(Alert.is_resolved == False).order_by(Alert.created_at.desc()).limit(5).all()
    by_status = {}
    by_state = {}
    for p in projects:
        by_status[p.status.value] = by_status.get(p.status.value, 0) + 1
        by_state[p.state] = by_state.get(p.state, 0) + 1
    return DashboardStats(
        total_projects=len(projects),
        total_land_proposed=sum(p.total_land_acres for p in projects),
        total_land_acquired=sum(p.acquired_land_acres for p in projects),
        total_land_working=sum(p.working_land_acres for p in projects),
        total_land_occupied=sum(p.occupied_land_acres for p in projects),
        total_budget_crores=sum(p.budget_estimate_crores for p in projects),
        total_budget_spent_crores=sum(p.budget_spent_crores for p in projects),
        by_status=by_status, by_state=by_state, recent_alerts=alerts
    )

# --- Random ID generator for demo ---
@router.get("/utils/random-id")
def random_id(prefix: str = "LA"):
    year = datetime.now().year
    return f"{prefix}-{year}-{random.randint(100,999)}"