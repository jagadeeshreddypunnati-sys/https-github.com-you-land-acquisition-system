-- =============================================================================
-- NATIONAL LAND ACQUISITION & MANAGEMENT SYSTEM (NLAMS)
-- Database Schema & Historical Records Seeding (PostgreSQL & SQLite compatible)
-- Department of Land Resources, Ministry of Rural Development, Govt. of India
-- =============================================================================

DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS historical_records;
DROP TABLE IF EXISTS ai_risks;
DROP TABLE IF EXISTS alerts;
DROP TABLE IF EXISTS documents;
DROP TABLE IF EXISTS parcels;
DROP TABLE IF EXISTS milestones;
DROP TABLE IF EXISTS projects;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email VARCHAR(120) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL,
    state VARCHAR(50),
    district VARCHAR(50),
    is_active BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id VARCHAR(30) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    state VARCHAR(50) NOT NULL,
    district VARCHAR(50) NOT NULL,
    project_type VARCHAR(50) NOT NULL,
    total_land_acres REAL DEFAULT 0.0,
    acquired_land_acres REAL DEFAULT 0.0,
    working_land_acres REAL DEFAULT 0.0,
    occupied_land_acres REAL DEFAULT 0.0,
    affected_families INTEGER DEFAULT 0,
    budget_estimate_crores REAL DEFAULT 0.0,
    budget_spent_crores REAL DEFAULT 0.0,
    current_stage_index INTEGER DEFAULT 0,
    status VARCHAR(30) DEFAULT 'On Track',
    start_date DATE,
    deadline DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE milestones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    name VARCHAR(100) NOT NULL,
    stage_order INTEGER NOT NULL,
    status VARCHAR(30) DEFAULT 'Pending',
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    sla_days INTEGER DEFAULT 30,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE parcels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    parcel_id VARCHAR(30) UNIQUE NOT NULL,
    ulpin VARCHAR(50) UNIQUE,
    village VARCHAR(100) NOT NULL,
    survey_number VARCHAR(50) NOT NULL,
    rtc_number VARCHAR(50) NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    area_acres REAL NOT NULL,
    occupied_acres REAL DEFAULT 0.0,
    working_acres REAL DEFAULT 0.0,
    status VARCHAR(30) DEFAULT 'Pending',
    work_progress VARCHAR(50) DEFAULT 'Not Started',
    work_progress_pct INTEGER DEFAULT 0,
    contractor VARCHAR(100),
    compensation_amount REAL DEFAULT 0.0,
    compensation_paid REAL DEFAULT 0.0,
    owner_name_masked VARCHAR(50) DEFAULT '**** (DPDP Masked)',
    aadhaar_masked VARCHAR(20) DEFAULT 'XXXX-XXXX-****',
    account_masked VARCHAR(20) DEFAULT '**masked**',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE historical_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER,
    financial_year VARCHAR(10) NOT NULL,
    state VARCHAR(50) DEFAULT 'National',
    occupied_land_acres REAL NOT NULL,
    working_land_acres REAL NOT NULL,
    budget_allocated_crores REAL NOT NULL,
    budget_spent_crores REAL NOT NULL,
    families_compensated INTEGER DEFAULT 0,
    milestones_completed INTEGER DEFAULT 0,
    status_summary TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
);

CREATE TABLE ai_risks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER UNIQUE NOT NULL,
    pending_approvals INTEGER DEFAULT 0,
    pending_compensation_cases INTEGER DEFAULT 0,
    litigation_cases INTEGER DEFAULT 0,
    rr_pending_percent REAL DEFAULT 0.0,
    days_overdue INTEGER DEFAULT 0,
    risk_score INTEGER DEFAULT 0,
    risk_level VARCHAR(20) DEFAULT 'LOW',
    reason TEXT,
    recommended_action TEXT,
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_email VARCHAR(120) NOT NULL,
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50),
    entity_id VARCHAR(50),
    details TEXT,
    ip_address VARCHAR(45) DEFAULT '10.24.18.91 (NIC-GOV-LAN)',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_parcels_parcel_id ON parcels(parcel_id);
CREATE INDEX idx_parcels_ulpin ON parcels(ulpin);
CREATE INDEX idx_parcels_survey_number ON parcels(survey_number);
CREATE INDEX idx_projects_project_id ON projects(project_id);
CREATE INDEX idx_historical_year ON historical_records(financial_year);
CREATE INDEX idx_audit_logs_time ON audit_logs(created_at);

INSERT INTO historical_records (financial_year, state, occupied_land_acres, working_land_acres, budget_allocated_crores, budget_spent_crores, families_compensated, milestones_completed, status_summary) VALUES
('2021-22', 'National', 14200.5, 8450.0, 410.0, 385.2, 4120, 18, 'Initial notification & baseline survey under RFCTLARR Act across 18 corridor sections.'),
('2022-23', 'National', 22800.0, 15200.4, 580.0, 542.7, 7350, 32, 'Accelerated land possession & preliminary civil earthworks; DBT disbursal initiated via PFMS.'),
('2023-24', 'National', 31500.8, 21100.2, 720.0, 688.5, 11400, 46, 'Bhuvan GIS cadastral mapping completed for 45 districts; major bridge approaches cleared.'),
('2024-25', 'National', 42100.0, 26400.0, 890.0, 824.1, 16800, 64, 'Paving & highway dualization in 8 states; 92% direct compensation transferred.'),
('2025-26', 'National', 52430.0, 31820.0, 1040.0, 965.8, 22100, 85, 'Substantial possession completed; R&R housing colonies handed over in Kolar & Jaipur.'),
('2026-27', 'National', 61200.0, 38500.0, 1250.0, 842.0, 26400, 102, 'Current FY active monitoring; 10 critical corridors under execution with live Bhuvan synchronization.');

INSERT INTO projects (project_id, name, state, district, project_type, total_land_acres, acquired_land_acres, working_land_acres, occupied_land_acres, affected_families, budget_estimate_crores, budget_spent_crores, current_stage_index, status, start_date, deadline) VALUES
('LA-2026-001', 'Bengaluru–Chennai Highway Expansion', 'Karnataka', 'Kolar', 'Highway', 500.0, 320.0, 240.0, 320.0, 148, 42.0, 35.3, 6, 'Delayed', '2026-01-15', '2027-12-31'),
('LA-2026-002', 'NH-48 Spur Alignment, Jaipur', 'Rajasthan', 'Jaipur', 'Highway', 620.0, 410.0, 310.0, 410.0, 200, 65.0, 48.0, 6, 'Critical', '2025-10-01', '2027-08-30'),
('LA-2026-003', 'NH-65 Multi-Modal Corridor', 'Telangana', 'Rangareddy', 'Highway', 450.0, 380.0, 350.0, 380.0, 120, 38.0, 34.2, 8, 'On Track', '2025-06-10', '2026-11-15'),
('LA-2026-004', 'NH-31 Ganga River Bridge Approach', 'Bihar', 'Patna', 'Bridge', 300.0, 150.0, 95.0, 150.0, 95, 22.0, 14.5, 5, 'Delayed', '2026-02-20', '2028-03-31');

INSERT INTO parcels (project_id, parcel_id, ulpin, village, survey_number, rtc_number, latitude, longitude, area_acres, occupied_acres, working_acres, status, work_progress, work_progress_pct, contractor, compensation_amount, compensation_paid) VALUES
(1, 'KA-00121', 'ULPIN-KA-29-0121', 'Malur', 'Sy 112/3', 'RTC-44/21', 13.140, 78.125, 2.4, 2.4, 2.4, 'Acquired', 'Paving & Asphalting', 85, 'L&T Infrastructure Unit-4', 840000, 840000),
(1, 'KA-00122', 'ULPIN-KA-29-0122', 'Malur', 'Sy 114/1', 'RTC-44/22', 13.142, 78.130, 3.1, 3.1, 3.1, 'Acquired', 'Earthwork & Grading', 70, 'L&T Infrastructure Unit-4', 1050000, 1050000),
(1, 'KA-00123', 'ULPIN-KA-29-0123', 'Malur', 'Sy 115/2', 'RTC-44/23', 13.135, 78.132, 2.4, 0.0, 0.0, 'Pending', 'Clearing & Demarcation', 15, 'Pending Contractor Handover', 840000, 0),
(1, 'KA-00124', 'ULPIN-KA-29-0124', 'Tekal', 'Sy 88/5', 'RTC-45/04', 13.130, 78.128, 1.8, 1.8, 1.2, 'Under Process', 'Bridge Culvert Foundations', 45, 'Afcons Infrastructure', 620000, 310000),
(1, 'KA-00125', 'ULPIN-KA-29-0125', 'Tekal', 'Sy 91/2', 'RTC-45/09', 13.128, 78.135, 4.0, 0.0, 0.0, 'Pending', 'Pre-construction Survey', 5, 'Survey Wing NHAI', 1400000, 0),
(1, 'KA-00126', 'ULPIN-KA-29-0126', 'Huralagere', 'Sy 60/4', 'RTC-46/11', 13.145, 78.138, 2.0, 2.0, 2.0, 'Acquired', 'Sub-grade Compaction', 92, 'L&T Infrastructure Unit-4', 700000, 700000),
(1, 'KA-00127', 'ULPIN-KA-29-0127', 'Huralagere', 'Sy 63/1', 'RTC-46/14', 13.125, 78.122, 2.9, 2.0, 1.5, 'Under Process', 'Utility Relocation & Drains', 55, 'Afcons Infrastructure', 980000, 490000),
(1, 'KA-00128', 'ULPIN-KA-29-0128', 'Kasaba', 'Sy 20/7', 'RTC-47/02', 13.138, 78.120, 3.5, 0.0, 0.0, 'Pending', 'Boundary Trenching', 10, 'Survey Wing NHAI', 1220000, 0);

INSERT INTO audit_logs (user_email, action, entity_type, entity_id, details) VALUES
('admin@gov.in', 'SCHEMA_INITIALIZE', 'DATABASE', 'ALL', 'National Database initialized with Multi-Year Archives (2021-2027) and Bhuvan Geo-Parcels.');
