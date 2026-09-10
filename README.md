# SIH 26016 — National Land Acquisition & Management System (NLAMS)

An enterprise-grade, transparent digital monitoring portal for the **Department of Land Resources (DoLR), Ministry of Rural Development, Government of India**, built under the **Right to Fair Compensation and Transparency in Land Acquisition, Rehabilitation and Resettlement Act, 2013 (RFCTLARR Act)**.

Compliant with **india.gov.in** and **GIGW 3.0** government web standards.

---

## 🏛️ Key Features

1. **Multi-Year Historical Records (2021–2027)**
   - Open Data archives of **Occupied Land (Acres)**, **Active Working Land (Acres under Construction)**, and **Project Budgets (Allocated vs Spent via PFMS DBT)**.
   - Accessible to all citizens and statutory auditors without login via the Public Archives portal.
   - One-click export to CSV.

2. **Bhuvan GIS & Live Working Land Tracking**
   - Geo-referenced cadastral map with distinct markers for:
     - 🚧 **Active Working Land:** Civil construction, earthwork, subgrade paving, and bridge foundations with contractor and machinery details.
     - 🟢 **Occupied & Possessed Land:** Possession handed over to executing agencies.
     - 🟡 **Under Statutory Process:** Section 11/19 preliminary surveys & valuation.
     - 🔴 **Pending Possession:** Compensation dispute resolution.
   - Interactive category filter buttons and NHAI alignment corridor overlay.

3. **Universal Search by Record ID / ULPIN / Survey No**
   - Search across all national registries by:
     - **Gazette ID:** e.g., `LA-2026-001`
     - **Parcel Record ID:** e.g., `KA-00121`
     - **ULPIN (Bhu-Aadhaar):** e.g., `ULPIN-KA-29-0121`
     - **Survey Number:** e.g., `Sy 112/3`
     - **RTC Number:** e.g., `RTC-44/21`
   - Instant modal displaying verified statutory details and direct map navigation.

4. **Python & SQL Enterprise Backend**
   - **Python FastAPI Application:** Located in `backend/main.py` with SQLAlchemy ORM models (`backend/models.py`).
   - **Production Relational SQL Schema:** Located in `backend/schema.sql` (PostgreSQL & SQLite compatible) with tables for `projects`, `parcels`, `historical_records`, `milestones`, and `audit_logs`.
   - **Interactive SQL Console:** Run live `SELECT` queries directly in the web UI to inspect multi-year aggregations, parcels, and budgets.
   - **Dual-Mode Architecture:** Runs as a zero-dependency static site on GitHub Pages, or connects seamlessly to `http://127.0.0.1:8000` when running the Python backend locally.

---

## 🚀 Running the Project

### Option A: Static Demo (GitHub Pages)
- Open `index.html` in any modern web browser, or access the live GitHub Pages link.
- **Demo Credentials (Password: `demo123`):**
  - Central Admin: `admin@gov.in`
  - State Officer (KA): `state@gov.in`
  - District Officer (DC): `district@gov.in`
  - Project Agency (NHAI): `agency@gov.in`
  - Field Surveyor: `field@gov.in`

### Option B: Local Python FastAPI Backend
```bash
# 1. Install dependencies
pip install -r backend/requirements.txt

# 2. Run the FastAPI server
uvicorn backend.main:app --reload --port 8000
```
- API Documentation (Swagger UI): `http://127.0.0.1:8000/docs`
- Root Endpoint: `http://127.0.0.1:8000/`

---

## 📂 Repository Structure

```
├── index.html              # Main web portal compliant with india.gov.in & GIGW 3.0
├── app.js                  # Frontend logic, Leaflet GIS, search, multi-year archives & SQL runner
├── styles.css              # Official NIC & india.gov.in design tokens, high contrast mode
├── backend/
│   ├── main.py             # Python FastAPI application with REST endpoints
│   ├── models.py           # SQLAlchemy ORM database models
│   ├── database.py         # Database engine and session handling
│   ├── schema.sql          # Relational SQL schema & multi-year seed data
│   └── requirements.txt    # Python dependencies
└── README.md
```

