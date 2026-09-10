# backend/models.py
from sqlalchemy import Column, Integer, String, Float, DateTime, Text, Boolean, ForeignKey, Enum as SQLEnum, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from .database import Base

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

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(120), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    name = Column(String(100), nullable=False)
    role = Column(SQLEnum(UserRole), nullable=False)
    state = Column(String(50))
    district = Column(String(50))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Project(Base):
    __tablename__ = "projects"
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(String(30), unique=True, index=True, nullable=False)
    name = Column(String(200), nullable=False)
    state = Column(String(50), index=True)
    district = Column(String(50), index=True)
    project_type = Column(String(50))
    total_land_acres = Column(Float, default=0)
    acquired_land_acres = Column(Float, default=0)
    working_land_acres = Column(Float, default=0)
    occupied_land_acres = Column(Float, default=0)
    affected_families = Column(Integer, default=0)
    budget_estimate_crores = Column(Float, default=0)
    budget_spent_crores = Column(Float, default=0)
    current_stage_index = Column(Integer, default=0)
    status = Column(SQLEnum(ProjectStatus), default=ProjectStatus.ON_TRACK)
    start_date = Column(DateTime(timezone=True))
    deadline = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    milestones = relationship("Milestone", back_populates="project", cascade="all, delete-orphan")
    parcels = relationship("Parcel", back_populates="project", cascade="all, delete-orphan")
    documents = relationship("Document", back_populates="project", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="project", cascade="all, delete-orphan")
    ai_risk = relationship("AIRisk", back_populates="project", uselist=False, cascade="all, delete-orphan")
    historical_records = relationship("HistoricalRecord", back_populates="project", cascade="all, delete-orphan")

class Milestone(Base):
    __tablename__ = "milestones"
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    name = Column(String(100), nullable=False)
    stage_order = Column(Integer, nullable=False)
    status = Column(SQLEnum(MilestoneStatus), default=MilestoneStatus.PENDING)
    started_at = Column(DateTime(timezone=True))
    completed_at = Column(DateTime(timezone=True))
    sla_days = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    project = relationship("Project", back_populates="milestones")

class Parcel(Base):
    __tablename__ = "parcels"
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    parcel_id = Column(String(30), unique=True, index=True, nullable=False)
    village = Column(String(100))
    survey_number = Column(String(50))
    rtc_number = Column(String(50))
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    area_acres = Column(Float, default=0)
    status = Column(SQLEnum(ParcelStatus), default=ParcelStatus.PENDING)
    compensation_amount = Column(Float, default=0)
    compensation_paid = Column(Float, default=0)
    work_progress = Column(SQLEnum(WorkProgress), default=WorkProgress.NOT_STARTED)
    work_started_date = Column(DateTime(timezone=True))
    work_completed_date = Column(DateTime(timezone=True))
    owner_name_masked = Column(String(50), default="****")
    aadhaar_masked = Column(String(20), default="XXXX-XXXX-****")
    account_masked = Column(String(20), default="**masked**")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    project = relationship("Project", back_populates="parcels")

class Document(Base):
    __tablename__ = "documents"
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    name = Column(String(200), nullable=False)
    version = Column(String(20), default="1.0")
    uploaded_by = Column(String(100))
    upload_date = Column(DateTime(timezone=True), server_default=func.now())
    status = Column(String(30), default="Draft")
    file_path = Column(String(500))
    mime_type = Column(String(100), default="application/pdf")
    file_size = Column(Integer)
    checksum = Column(String(64))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    project = relationship("Project", back_populates="documents")

class Alert(Base):
    __tablename__ = "alerts"
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    severity = Column(String(20))
    message = Column(Text, nullable=False)
    is_resolved = Column(Boolean, default=False)
    resolved_by = Column(Integer, ForeignKey("users.id"))
    resolved_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    project = relationship("Project", back_populates="alerts")

class AIRisk(Base):
    __tablename__ = "ai_risks"
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False, unique=True)
    pending_approvals = Column(Integer, default=0)
    pending_compensation_cases = Column(Integer, default=0)
    litigation_cases = Column(Integer, default=0)
    rr_pending_percent = Column(Float, default=0)
    days_overdue = Column(Integer, default=0)
    risk_score = Column(Integer, default=0)
    risk_level = Column(String(20), default="LOW")
    reason = Column(Text)
    recommended_action = Column(Text)
    calculated_at = Column(DateTime(timezone=True), server_default=func.now())

    project = relationship("Project", back_populates="ai_risk")

class HistoricalRecord(Base):
    __tablename__ = "historical_records"
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    financial_year = Column(String(10), nullable=False)
    occupied_land_acres = Column(Float, default=0)
    working_land_acres = Column(Float, default=0)
    budget_allocated_crores = Column(Float, default=0)
    budget_spent_crores = Column(Float, default=0)
    families_compensated = Column(Integer, default=0)
    milestones_completed = Column(Integer, default=0)
    status_summary = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    project = relationship("Project", back_populates="historical_records")

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    user_email = Column(String(120))
    action = Column(String(50), nullable=False)
    entity_type = Column(String(50))
    entity_id = Column(Integer)
    details = Column(Text)
    ip_address = Column(String(45))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

Index("ix_parcels_parcel_id", Parcel.parcel_id)
Index("ix_projects_project_id", Project.project_id)
Index("ix_historical_fy", HistoricalRecord.financial_year)
Index("ix_audit_created", AuditLog.created_at)