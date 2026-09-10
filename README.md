# SIH 26016 — National Land Acquisition System (Prototype)

Real-Time National Land Acquisition & Management System for End-to-End Digital Monitoring and Decision Support.
Ministry of Rural Development, Dept. of Land Resources.

Static prototype: open `index.html` or enable GitHub Pages (root).

## Demo
- Login: `admin@gov.in` / `demo123` / Central Admin (also state@, district@, agency@, field@)
- Flow: Dashboard → LA-2026-001 → Timeline → GIS Map (KA-00123) → AI Risk 81% → Alerts → mark Compensation Completed → risk 38%

## Structure
- `index.html` — all screens + Leaflet map
- `app.js` — auth, lifecycle, AI risk engine (30/25/20/15/10), alerts
- `styles.css`

Prototype uses simulated data. Production integrates land records / cadastral maps / state portals via APIs.
