-- NLAMS Relational Database Schema (SQLite / PostgreSQL Compatible)
-- RFCTLARR Act, 2013 Statutory Compliance & Multi-Year Archives

PRAGMA foreign_keys = ON;

-- 1. Projects Table
CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id VARCHAR(30) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    state VARCHAR(50) NOT NULL,
    district VARCHAR(50) NOT NULL,
    project_type VARCHAR(50) NOT NULL,
    total_land_acres REAL NOT NULL,
    acquired_land_acres REAL DEFAULT 0.0,
    working_land_acres REAL DEFAULT 0.0,
    occupied_land_acres REAL DEFAULT 0.0,
    affected_families INTEGER DEFAULT 0,
    budget_estimate_crores REAL NOT NULL,
    budget_spent_crores REAL DEFAULT 0.0,
    current_stage_index INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'On Track',
    start_date DATE,
    deadline DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Parcels Table (Bhuvan GIS Cadastral Data)
CREATE TABLE IF NOT EXISTS parcels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    parcel_id VARCHAR(30) UNIQUE NOT NULL,
    ulpin VARCHAR(30) NOT NULL,
    village VARCHAR(100) NOT NULL,
    survey_number VARCHAR(50) NOT NULL,
    rtc_number VARCHAR(50) NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    area_acres REAL NOT NULL,
    occupied_acres REAL DEFAULT 0.0,
    working_acres REAL DEFAULT 0.0,
    status VARCHAR(20) DEFAULT 'Pending',
    work_progress VARCHAR(100) DEFAULT 'Not Started',
    work_progress_pct INTEGER DEFAULT 0,
    contractor VARCHAR(100) DEFAULT 'Awaiting Award',
    chainage VARCHAR(100) DEFAULT '',
    machinery VARCHAR(200) DEFAULT '',
    compensation_amount REAL DEFAULT 0.0,
    compensation_paid REAL DEFAULT 0.0,
    owner_name_masked VARCHAR(50) DEFAULT '****',
    aadhaar_masked VARCHAR(20) DEFAULT 'XXXX-XXXX-****',
    account_masked VARCHAR(20) DEFAULT '**masked**',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- 3. Historical Annual Summary (FY 2021-22 to FY 2026-27)
CREATE TABLE IF NOT EXISTS historical_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    financial_year VARCHAR(10) NOT NULL,
    state VARCHAR(50) DEFAULT 'National',
    occupied_land_acres REAL DEFAULT 0.0,
    working_land_acres REAL DEFAULT 0.0,
    budget_allocated_crores REAL DEFAULT 0.0,
    budget_spent_crores REAL DEFAULT 0.0,
    families_compensated INTEGER DEFAULT 0,
    milestones_completed INTEGER DEFAULT 0,
    status_summary TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Historical Detailed Project Records (Corridor-level Breakdown)
CREATE TABLE IF NOT EXISTS historical_project_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    record_id VARCHAR(30) UNIQUE NOT NULL,
    financial_year VARCHAR(10) NOT NULL,
    project_name VARCHAR(200) NOT NULL,
    state VARCHAR(50) NOT NULL,
    district VARCHAR(50) NOT NULL,
    agency VARCHAR(50) NOT NULL,
    occupied_land_acres REAL DEFAULT 0.0,
    working_land_acres REAL DEFAULT 0.0,
    budget_sanctioned_crores REAL DEFAULT 0.0,
    budget_spent_crores REAL DEFAULT 0.0,
    families_compensated INTEGER DEFAULT 0,
    status VARCHAR(50) NOT NULL,
    doc_id VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Official Demo Documents Table (Statutory Verification Records)
CREATE TABLE IF NOT EXISTS demo_documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    doc_id VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(250) NOT NULL,
    category VARCHAR(50) NOT NULL,
    statutory_act VARCHAR(100) NOT NULL,
    gazette_number VARCHAR(100),
    issuing_authority VARCHAR(150) NOT NULL,
    issue_date DATE NOT NULL,
    file_name VARCHAR(100) NOT NULL,
    file_size_kb INTEGER NOT NULL,
    sha256_hash VARCHAR(64) NOT NULL,
    content_html TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_email VARCHAR(120) NOT NULL,
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50),
    entity_id VARCHAR(50),
    details TEXT,
    ip_address VARCHAR(45) DEFAULT '10.24.18.91 (NIC-GOV-LAN)',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_parcels_parcel_id ON parcels(parcel_id);
CREATE INDEX IF NOT EXISTS idx_parcels_ulpin ON parcels(ulpin);
CREATE INDEX IF NOT EXISTS idx_projects_project_id ON projects(project_id);
CREATE INDEX IF NOT EXISTS idx_historical_fy ON historical_records(financial_year);
CREATE INDEX IF NOT EXISTS idx_hist_proj_fy ON historical_project_records(financial_year);
CREATE INDEX IF NOT EXISTS idx_demo_doc_id ON demo_documents(doc_id);
\n\n-- Seed Data Automatically Exported\n-- Projects: 4\n-- Parcels: 8\n-- Historical Annual Records: 6\n-- Historical Project Records: 18\n-- Demo Documents: 6\n