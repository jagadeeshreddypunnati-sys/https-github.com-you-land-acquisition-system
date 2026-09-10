# backend/seed.py
from sqlalchemy.orm import Session
from .models import (User, Project, Milestone, Parcel, Document, Alert,
                     AIRisk, HistoricalRecord, AuditLog,
                     UserRole, ProjectStatus, MilestoneStatus, ParcelStatus, WorkProgress)
from .auth import get_password_hash
from .ai_risk import calculate_risk_score
from datetime import datetime, timedelta
import random

DEMO_USERS = [
    ("admin@gov.in", "demo123", "Central Officer (DoLR)", UserRole.CENTRAL_ADMIN, None, None),
    ("state@gov.in", "demo123", "State Officer KA", UserRole.STATE_OFFICER, "Karnataka", None),
    ("district@gov.in", "demo123", "DC Kolar", UserRole.DISTRICT_OFFICER, "Karnataka", "Kolar"),
    ("agency@gov.in", "demo123", "NHAI Agency", UserRole.PROJECT_AGENCY, None, None),
    ("field@gov.in", "demo123", "Field Surveyor", UserRole.FIELD_OFFICER, "Karnataka", "Kolar"),
]

STAGES = ["Proposal","Verification","Notification","Social Impact Assessment",
          "Land Valuation","Award Declaration","Compensation","Possession","R&R","Completed"]
SLA_MAP = {"Proposal":7,"Verification":15,"Notification":10,"Social Impact Assessment":30,
           "Land Valuation":21,"Award Declaration":14,"Compensation":30,"Possession":15,"R&R":60,"Completed":0}

def seed_demo_data(db: Session):
    if db.query(User).filter(User.email == "admin@gov.in").first():
        return  # Already seeded

    # Users
    user_objs = {}
    for email, pwd, name, role, state, dist in DEMO_USERS:
        u = User(email=email, hashed_password=get_password_hash(pwd), name=name,
                 role=role, state=state, district=dist)
        db.add(u)
        db.flush()
        user_objs[role] = u

    # Projects with historical data
    projects_data = [
        {
            "project_id": "LA-2026-001", "name": "Bengaluru–Chennai Highway Expansion",
            "state": "Karnataka", "district": "Kolar", "project_type": "Highway",
            "total_land_acres": 500, "acquired_land_acres": 320,
            "working_land_acres": 180, "occupied_land_acres": 120,
            "affected_families": 148, "budget_estimate_crores": 42, "budget_spent_crores": 28,
            "current_stage_index": 6, "status": ProjectStatus.DELAYED,
            "start_date": datetime(2026, 1, 15), "deadline": datetime(2027, 6, 30),
            "historical": [
                {"fy": "2023-24", "occ": 20, "work": 5, "alloc": 8, "spent": 6, "fam": 15, "ms": 2, "summary": "SIA completed, notification issued"},
                {"fy": "2024-25", "occ": 65, "work": 35, "alloc": 22, "spent": 18, "fam": 52, "ms": 4, "summary": "Valuation & award declared, compensation started"},
            ]
        },
        {
            "project_id": "LA-2026-002", "name": "NH-48 Spur, Jaipur",
            "state": "Rajasthan", "district": "Jaipur", "project_type": "Highway",
            "total_land_acres": 620, "acquired_land_acres": 410,
            "working_land_acres": 280, "occupied_land_acres": 200,
            "affected_families": 200, "budget_estimate_crores": 65, "budget_spent_crores": 41,
            "current_stage_index": 6, "status": ProjectStatus.CRITICAL,
            "start_date": datetime(2025, 8, 1), "deadline": datetime(2026, 12, 31),
            "historical": [
                {"fy": "2023-24", "occ": 30, "work": 10, "alloc": 12, "spent": 9, "fam": 22, "ms": 2, "summary": "SIA & notification"},
                {"fy": "2024-25", "occ": 120, "work": 60, "alloc": 35, "spent": 28, "fam": 88, "ms": 5, "summary": "Compensation underway, litigation 8 cases"},
            ]
        },
        {
            "project_id": "LA-2026-003", "name": "NH-65 Corridor, Hyderabad",
            "state": "Telangana", "district": "Rangareddy", "project_type": "Highway",
            "total_land_acres": 450, "acquired_land_acres": 380,
            "working_land_acres": 350, "occupied_land_acres": 320,
            "affected_families": 120, "budget_estimate_crores": 38, "budget_spent_crores": 34,
            "current_stage_index": 8, "status": ProjectStatus.ON_TRACK,
            "start_date": datetime(2025, 3, 10), "deadline": datetime(2026, 9, 30),
            "historical": [
                {"fy": "2023-24", "occ": 45, "work": 20, "alloc": 10, "spent": 8, "fam": 30, "ms": 3, "summary": "Notification & valuation"},
                {"fy": "2024-25", "occ": 280, "work": 240, "alloc": 28, "spent": 26, "fam": 90, "ms": 7, "summary": "Fast-tracked, possession & R&R in progress"},
            ]
        },
        {
            "project_id": "LA-2026-004", "name": "NH-31 Bridge Approach, Patna",
            "state": "Bihar", "district": "Patna", "project_type": "Bridge",
            "total_land_acres": 300, "acquired_land_acres": 150,
            "working_land_acres": 80, "occupied_land_acres": 40,
            "affected_families": 95, "budget_estimate_crores": 22, "budget_spent_crores": 11,
            "current_stage_index": 5, "status": ProjectStatus.DELAYED,
            "start_date": datetime(2025, 11, 1), "deadline": datetime(2026, 11, 30),
            "historical": [
                {"fy": "2024-25", "occ": 25, "work": 10, "alloc": 8, "spent": 5, "fam": 18, "ms": 2, "summary": "SIA done, verification pending"},
            ]
        },
    ]

    for pd in projects_data:
        hist_data = pd.pop("historical")
        p = Project(**pd)
        db.add(p); db.flush()

        # Milestones
        for i, s in enumerate(STAGES):
            m = Milestone(project_id=p.id, name=s, stage_order=i, sla_days=SLA_MAP.get(s, 14))
            if i < p.current_stage_index:
                m.status = MilestoneStatus.COMPLETED
                m.started_at = p.start_date + timedelta(days=sum(SLA_MAP.get(STAGES[j], 14) for j in range(i)))
                m.completed_at = m.started_at + timedelta(days=SLA_MAP.get(s, 14) - 2)
            elif i == p.current_stage_index:
                m.status = MilestoneStatus.IN_PROGRESS
                m.started_at = datetime.utcnow() - timedelta(days=random.randint(1, 20))
            db.add(m)

        # AI Risk
        ai_inputs = {
            "LA-2026-001": (3, 42, 12, 70, 18),
            "LA-2026-002": (4, 60, 8, 80, 32),
            "LA-2026-003": (1, 5, 1, 20, 2),
            "LA-2026-004": (2, 25, 5, 50, 12),
        }
        appr, comp, lit, rr, over = ai_inputs.get(p.project_id, (1, 5, 0, 10, 0))
        score, level, reason, action = calculate_risk_score(appr, comp, lit, rr, over)
        ai = AIRisk(project_id=p.id, pending_approvals=appr, pending_compensation_cases=comp,
                    litigation_cases=lit, rr_pending_percent=rr, days_overdue=over,
                    risk_score=score, risk_level=level, reason=reason, recommended_action=action)
        db.add(ai)

        # Historical records
        for h in hist_data:
            hr = HistoricalRecord(project_id=p.id, financial_year=h["fy"],
                occupied_land_acres=h["occ"], working_land_acres=h["work"],
                budget_allocated_crores=h["alloc"], budget_spent_crores=h["spent"],
                families_compensated=h["fam"], milestones_completed=h["ms"],
                status_summary=h["summary"])
            db.add(hr)

    # Parcels for Kolar project (LA-2026-001)
    kolar_project = db.query(Project).filter(Project.project_id == "LA-2026-001").first()
    if kolar_project:
        parcels = [
            ("KA-00121", "Malur", "Sy 112/3", "RTC-44/21", 13.140, 78.125, 2.4, ParcelStatus.ACQUIRED, 840000, 840000, WorkProgress.COMPLETED),
            ("KA-00122", "Malur", "Sy 114/1", "RTC-44/22", 13.142, 78.130, 3.1, ParcelStatus.ACQUIRED, 1050000, 1050000, WorkProgress.COMPLETED),
            ("KA-00123", "Malur", "Sy 115/2", "RTC-44/23", 13.135, 78.132, 2.4, ParcelStatus.PENDING, 840000, 0, WorkProgress.NOT_STARTED),
            ("KA-00124", "Tekal", "Sy 88/5", "RTC-45/04", 13.130, 78.128, 1.8, ParcelStatus.UNDER_PROCESS, 620000, 300000, WorkProgress.EARTHWORK),
            ("KA-00125", "Tekal", "Sy 91/2", "RTC-45/09", 13.128, 78.135, 4.0, ParcelStatus.PENDING, 1400000, 0, WorkProgress.NOT_STARTED),
            ("KA-00126", "Huralagere", "Sy 60/4", "RTC-46/11", 13.145, 78.138, 2.0, ParcelStatus.ACQUIRED, 700000, 700000, WorkProgress.PAVING),
            ("KA-00127", "Huralagere", "Sy 63/1", "RTC-46/14", 13.125, 78.122, 2.9, ParcelStatus.UNDER_PROCESS, 980000, 400000, WorkProgress.CLEARING),
            ("KA-00128", "Kasaba", "Sy 20/7", "RTC-47/02", 13.138, 78.120, 3.5, ParcelStatus.PENDING, 1220000, 0, WorkProgress.NOT_STARTED),
        ]
        for pid, village, survey, rtc, lat, lng, area, status, comp, paid, wprog in parcels:
            par = Parcel(project_id=kolar_project.id, parcel_id=pid, village=village,
                survey_number=survey, rtc_number=rtc, latitude=lat, longitude=lng,
                area_acres=area, status=status, compensation_amount=comp, compensation_paid=paid,
                work_progress=wprog)
            if wprog != WorkProgress.NOT_STARTED:
                par.work_started_date = datetime(2026, 3, 1) + timedelta(days=random.randint(0, 90))
            if wprog == WorkProgress.COMPLETED:
                par.work_completed_date = datetime.utcnow() - timedelta(days=random.randint(1, 30))
            db.add(par)

    # Documents for kolar
    docs = [
        ("Land Acquisition Proposal.pdf", "1.0", "Project Agency", "2026-06-01", "Approved"),
        ("Notification.pdf", "1.0", "District Officer", "2026-07-10", "Approved"),
        ("Social Impact Assessment.pdf", "2.0", "District Officer", "2026-08-02", "Approved"),
        ("Land Valuation.pdf", "1.2", "State Officer", "2026-08-20", "Approved"),
        ("Compensation Report.pdf", "2.0", "District Officer", "2026-09-10", "Pending"),
        ("R&R Report.pdf", "0.9", "Field Officer", "2026-09-05", "Draft"),
    ]
    for name, ver, by, date, status in docs:
        d = Document(project_id=kolar_project.id, name=name, version=ver, uploaded_by=by,
                     upload_date=datetime.fromisoformat(date), status=status)
        db.add(d)

    # Alerts
    alerts = [
        (kolar_project.id, "critical", "LA-2026-001 has 42 pending compensation cases, deadline approaching"),
        (kolar_project.id, "warning", "Compensation verification lagging by 18 days"),
    ]
    for pid, sev, msg in alerts:
        db.add(Alert(project_id=pid, severity=sev, message=msg))

    # Audit log seed
    db.add(AuditLog(user_email="System", action="SEED_DEMO", entity_type="system", entity_id=0,
                    details="Seeded demo data for SIH 26016 prototype"))

    db.commit()
    print("Demo data seeded successfully")