# backend/schemas.py
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
import enum

class UserRole(str, enum.Enum):
    CENTRAL_ADMIN = "Central Admin"
    STATE_OFFICER = "State Officer"
    DISTRICT_OFFICER = "District Officer"
    PROJECT_AGENCY = "Project Agency"
    FIELD_OFFICER = "Field Officer"

class ProjectStatus(str, enum.Enum):
    ON_TRACK = "On Track"
    DELAYED = "Delayed"
    CRITICAL = "Critical"
    COMPLETED = "Completed"

class MilestoneStatus(str, enum.Enum):
    PENDING = "Pending"
    IN_PROGRESS = "In Progress"
    COMPLETED = "Completed"

class ParcelStatus(str, enum.Enum):
    ACQUIRED = "Acquired"
    UNDER_PROCESS = "Under Process"
    PENDING = "Pending"

class WorkProgress(str, enum.Enum):
    NOT_STARTED = "Not Started"
    SURVEY = "Survey"
    CLEARING = "Clearing"
    EARTHWORK = "Earthwork"
    PAVING = "Paving"
    COMPLETED = "Completed"

# Auth
class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    name: str
    role: UserRole
    state: Optional[str] = None
    district: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str
    role: UserRole

class UserOut(BaseModel):
    id: int
    email: str
    name: str
    role: UserRole
    state: Optional[str]
    district: Optional[str]
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut

# Project
class MilestoneBase(BaseModel):
    name: str
    stage_order: int
    sla_days: int = 0

class MilestoneOut(MilestoneBase):
    id: int
    status: MilestoneStatus
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    class Config:
        from_attributes = True

class ParcelBase(BaseModel):
    parcel_id: str
    village: str
    survey_number: Optional[str]
    rtc_number: Optional[str]
    latitude: float
    longitude: float
    area_acres: float
    status: ParcelStatus = ParcelStatus.PENDING
    compensation_amount: float = 0
    compensation_paid: float = 0
    work_progress: WorkProgress = WorkProgress.NOT_STARTED

class ParcelOut(ParcelBase):
    id: int
    project_id: int
    work_started_date: Optional[datetime]
    work_completed_date: Optional[datetime]
    owner_name_masked: str
    aadhaar_masked: str
    account_masked: str
    class Config:
        from_attributes = True

class ProjectBase(BaseModel):
    project_id: str
    name: str
    state: str
    district: str
    project_type: str
    total_land_acres: float
    acquired_land_acres: float = 0
    working_land_acres: float = 0
    occupied_land_acres: float = 0
    affected_families: int
    budget_estimate_crores: float
    budget_spent_crores: float = 0

class ProjectCreate(ProjectBase):
    pass

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    acquired_land_acres: Optional[float] = None
    working_land_acres: Optional[float] = None
    occupied_land_acres: Optional[float] = None
    budget_spent_crores: Optional[float] = None
    status: Optional[ProjectStatus] = None
    current_stage_index: Optional[int] = None

class ProjectOut(ProjectBase):
    id: int
    status: ProjectStatus
    current_stage_index: int
    start_date: Optional[datetime]
    deadline: Optional[datetime]
    created_at: datetime
    updated_at: Optional[datetime]
    milestones: List[MilestoneOut] = []
    parcels: List[ParcelOut] = []
    class Config:
        from_attributes = True

class ProjectListOut(BaseModel):
    id: int
    project_id: str
    name: str
    state: str
    progress: float
    risk_level: str
    risk_score: int
    current_stage: str
    class Config:
        from_attributes = True

# Historical Records
class HistoricalRecordBase(BaseModel):
    financial_year: str
    occupied_land_acres: float
    working_land_acres: float
    budget_allocated_crores: float
    budget_spent_crores: float
    families_compensated: int
    milestones_completed: int
    status_summary: Optional[str] = None

class HistoricalRecordCreate(HistoricalRecordBase):
    pass

class HistoricalRecordOut(HistoricalRecordBase):
    id: int
    project_id: int
    created_at: datetime
    class Config:
        from_attributes = True

# AI Risk
class AIRiskInput(BaseModel):
    pending_approvals: int = 0
    pending_compensation_cases: int = 0
    litigation_cases: int = 0
    rr_pending_percent: float = 0
    days_overdue: int = 0

class AIRiskOut(BaseModel):
    project_id: int
    pending_approvals: int
    pending_compensation_cases: int
    litigation_cases: int
    rr_pending_percent: float
    days_overdue: int
    risk_score: int
    risk_level: str
    reason: str
    recommended_action: str
    calculated_at: datetime
    class Config:
        from_attributes = True

# Documents
class DocumentOut(BaseModel):
    id: int
    project_id: int
    name: str
    version: str
    uploaded_by: str
    upload_date: datetime
    status: str
    class Config:
        from_attributes = True

# Alerts
class AlertOut(BaseModel):
    id: int
    project_id: int
    severity: str
    message: str
    is_resolved: bool
    created_at: datetime
    class Config:
        from_attributes = True

# Search
class SearchResult(BaseModel):
    type: str  # "project", "parcel", "historical"
    id: int
    title: str
    subtitle: str
    url: str

# Dashboard Stats
class DashboardStats(BaseModel):
    total_projects: int
    total_land_proposed: float
    total_land_acquired: float
    total_land_working: float
    total_land_occupied: float
    total_budget_crores: float
    total_budget_spent_crores: float
    by_status: dict
    by_state: dict
    recent_alerts: List[AlertOut]