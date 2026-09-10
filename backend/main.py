# backend/main.py
"""
National Land Acquisition & Management System (NLAMS)
FastAPI Backend with SQLite / PostgreSQL Engine
Department of Land Resources (DoLR), Ministry of Rural Development, Govt. of India
"""

import os
import sqlite3
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, HTTPException, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session
from .database import engine, SessionLocal, init_db, get_db
from . import models

app = FastAPI(
    title="National Land Acquisition & Management System (NLAMS) API",
    description="Statutory land acquisition, multi-year archives, Bhuvan GIS parcels, and SQL engine",
    version="2.0.0"
)

# Enable CORS for frontend web portal integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_PATH = "nlas.db"

def seed_initial_data():
    """Seed initial multi-year historical records and geo-parcels if database is fresh"""
    schema_path = os.path.join(os.path.dirname(__file__), "schema.sql")
    if os.path.exists(schema_path):
        try:
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            cursor.execute("SELECT count(*) FROM sqlite_master WHERE type='table' AND name='historical_records'")
            table_exists = cursor.fetchone()[0]
            if not table_exists:
                with open(schema_path, "r", encoding="utf-8") as f:
                    conn.executescript(f.read())
                conn.commit()
            conn.close()
        except Exception as e:
            print(f"Database init warning: {e}")

@app.on_event("startup")
def on_startup():
    init_db()
    seed_initial_data()

# ── API Models ──
class SQLQueryRequest(BaseModel):
    query: str

class LoginRequest(BaseModel):
    email: str
    password: str
    role: str

# ── Endpoints ──

@app.get("/")
def read_root():
    return {
        "portal": "National Land Acquisition & Management System (NLAMS)",
        "department": "Department of Land Resources (DoLR), MoRD",
        "act": "RFCTLARR Act, 2013",
        "status": "OPERATIONAL",
        "database": "SQLite / PostgreSQL SQLAlchemy Engine",
        "version": "2.0.0",
        "endpoints": [
            "/api/historical-records",
            "/api/parcels",
            "/api/parcels/search?q={id}",
            "/api/projects",
            "/api/sql-query"
        ]
    }

@app.get("/api/historical-records")
def get_historical_records():
    """Retrieve previous years records: occupied land, working land, and budgets (2021-2027)"""
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()
        cur.execute("SELECT * FROM historical_records ORDER BY financial_year ASC")
        rows = [dict(r) for r in cur.fetchall()]
        conn.close()
        return {"total_records": len(rows), "records": rows}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/parcels")
def get_parcels(work_status: Optional[str] = None):
    """Retrieve Bhuvan GIS geo-parcels with working land and active construction details"""
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()
        if work_status:
            cur.execute("SELECT * FROM parcels WHERE status = ? OR work_progress = ?", (work_status, work_status))
        else:
            cur.execute("SELECT * FROM parcels")
        rows = [dict(r) for r in cur.fetchall()]
        conn.close()
        return {"count": len(rows), "parcels": rows}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/parcels/search")
def search_records(q: str = Query(..., description="Record ID, ULPIN, Survey No, or Gazette ID")):
    """Universal Search by Record ID, ULPIN (Bhu-Aadhaar), Survey Number, or Project ID"""
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()
        term = f"%{q.strip()}%"
        
        # Search in parcels
        cur.execute("""
            SELECT p.*, pr.name as project_name, pr.state as project_state, pr.district as project_district
            FROM parcels p
            LEFT JOIN projects pr ON p.project_id = pr.id
            WHERE p.parcel_id LIKE ? OR p.ulpin LIKE ? OR p.survey_number LIKE ? OR p.rtc_number LIKE ?
        """, (term, term, term, term))
        parcels = [dict(r) for r in cur.fetchall()]

        # Search in projects
        cur.execute("SELECT * FROM projects WHERE project_id LIKE ? OR name LIKE ?", (term, term))
        projects = [dict(r) for r in cur.fetchall()]

        conn.close()
        return {
            "query": q,
            "matched_parcels_count": len(parcels),
            "matched_projects_count": len(projects),
            "parcels": parcels,
            "projects": projects
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/projects")
def get_projects():
    """Retrieve all major national infrastructure land acquisition proposals"""
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()
        cur.execute("SELECT * FROM projects ORDER BY id ASC")
        rows = [dict(r) for r in cur.fetchall()]
        conn.close()
        return {"count": len(rows), "projects": rows}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/sql-query")
def run_sql_query(payload: SQLQueryRequest):
    """
    Execute read-only SQL query against the backend database.
    Allows judges and evaluators to test real SQL queries on previous years data.
    """
    query = payload.query.strip()
    # Enforce read-only constraint for security
    first_word = query.split()[0].upper() if query else ""
    if first_word not in ["SELECT", "EXPLAIN", "PRAGMA"]:
        raise HTTPException(status_code=400, detail="Only read-only SELECT or EXPLAIN queries are permitted in this demo console.")
    
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()
        cur.execute(query)
        rows = [dict(r) for r in cur.fetchall()]
        columns = [desc[0] for desc in cur.description] if cur.description else []
        conn.close()
        return {
            "query": query,
            "columns": columns,
            "row_count": len(rows),
            "rows": rows
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"SQL Execution Error: {str(e)}")

@app.post("/api/auth/login")
def login(req: LoginRequest):
    """Parichay SSO Simulated Authentication"""
    valid_users = {
        "admin@gov.in": "Central Admin",
        "state@gov.in": "State Officer",
        "district@gov.in": "District Officer",
        "agency@gov.in": "Project Agency",
        "field@gov.in": "Field Officer"
    }
    if req.email in valid_users and req.password == "demo123" and valid_users[req.email] == req.role:
        return {
            "status": "SUCCESS",
            "email": req.email,
            "role": req.role,
            "token": f"mock_gov_jwt_{req.email}",
            "expires_in": 900
        }
    raise HTTPException(status_code=401, detail="Invalid government credentials or role mismatch.")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
