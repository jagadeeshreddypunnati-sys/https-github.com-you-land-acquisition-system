// SIH 26016 — National Land Acquisition & Management System (NLAMS)
// Govt Prototype: Multi-Year Archives, Working & Occupied Land Tracking, Bhuvan GIS, Search by Record ID, Python & SQL Backend

const USERS = {
  "admin@gov.in": { role: "Central Admin", name: "Central Officer (DoLR)" },
  "state@gov.in": { role: "State Officer", name: "State Officer KA" },
  "district@gov.in": { role: "District Officer", name: "DC Kolar" },
  "agency@gov.in": { role: "Project Agency", name: "NHAI Agency" },
  "field@gov.in": { role: "Field Officer", name: "Field Surveyor" }
};
const PASS = "demo123";
let session = JSON.parse(localStorage.getItem("nlas_session") || "null");
let currentId = localStorage.getItem("nlas_current") || "LA-2026-001";
const STAGES = ["Proposal","Verification","Notification","Social Impact Assessment","Land Valuation","Award Declaration","Compensation","Possession","R&R","Completed"];

// Linked departments (official portals) — simulated API in demo
const DEPTS = [
  { k: "revenue", n: "Revenue Dept — Land Records (Bhoomi)", url: "https://dolr.nic.in", d: "RTC / Khata / mutation records. Owner name & Aadhaar masked per policy.", api: "GET /api/v1/land-records/{parcel}" },
  { k: "reg", n: "Registration (IGRS) — Sale Deeds", url: "https://rural.nic.in", d: "Deed history, encumbrance certificate. Masked parties.", api: "GET /api/v1/registration/{parcel}" },
  { k: "survey", n: "Survey / Bhuvan GIS (NRSC)", url: "https://bhuvan.nrsc.gov.in", d: "Cadastral polygon geometry, geo-tagging, SOI toposheet overlay.", api: "GET /api/v1/cadastral/{parcel}" },
  { k: "nhai", n: "Project Agency — NHAI", url: "https://nhai.gov.in", d: "Alignment corridor, chainage, land requirement plan.", api: "GET /api/v1/projects/{id}" },
  { k: "pfms", n: "PFMS / DBT — Compensation Disbursal", url: "https://pfms.nic.in", d: "Payment status, beneficiary count. Account numbers masked.", api: "GET /api/v1/payments/{project}" },
  { k: "state", n: "State Portal / data.gov.in", url: "https://data.gov.in", d: "Notified open datasets, SIA reports, state land bank.", api: "GET /api/v1/datasets/{project}" }
];

// Multi-Year Historical Records (Previous Years 2021–2027)
const HISTORICAL_DATA = [
  { year: "2021-22", occupied: 14200.5, working: 8450.0, budget_alloc: 410.0, budget_spent: 385.2, families: 4120, milestones: 18, summary: "Preliminary SIA baseline survey and Section 4 notifications across 18 corridor alignments." },
  { year: "2022-23", occupied: 22800.0, working: 15200.4, budget_alloc: 580.0, budget_spent: 542.7, families: 7350, milestones: 32, summary: "Accelerated land possession & preliminary earthwork grading; direct DBT compensation initiated via PFMS." },
  { year: "2023-24", occupied: 31500.8, working: 21100.2, budget_alloc: 720.0, budget_spent: 688.5, families: 11400, milestones: 46, summary: "Bhuvan ISRO cadastral mapping synchronized for 45 revenue districts; major bridge approaches cleared." },
  { year: "2024-25", occupied: 42100.0, working: 26400.0, budget_alloc: 890.0, budget_spent: 824.1, families: 16800, milestones: 64, summary: "Subgrade paving and corridor dualization active in 8 states; 92% direct compensation disbursed." },
  { year: "2025-26", occupied: 52430.0, working: 31820.0, budget_alloc: 1040.0, budget_spent: 965.8, families: 22100, milestones: 85, summary: "Substantial physical possession completed; R&R housing rehabilitation colonies handed over in Kolar & Jaipur." },
  { year: "2026-27", occupied: 61200.0, working: 38500.0, budget_alloc: 1250.0, budget_spent: 842.0, families: 26400, milestones: 102, summary: "Current FY active execution; 10 critical national corridors under construction with real-time GIS tracking." }
];
// ── DETAILED HISTORICAL CORRIDOR PROJECT RECORDS (FY 2021-22 to FY 2026-27) ──
const HISTORICAL_PROJECT_RECORDS = [
  // FY 2021-22
  { id: "REC-2021-NHAI-01", fy: "2021-22", name: "Delhi-Mumbai Expressway (Pkg 1-3)", state: "Haryana & Rajasthan", district: "Gurugram/Alwar", agency: "NHAI", occupied: 4800.0, working: 3200.0, alloc: 145.0, spent: 140.2, families: 1420, status: "Completed & Operational", docId: "GAZETTE-2026-SO-4412" },
  { id: "REC-2021-EDFC-02", fy: "2021-22", name: "Eastern Dedicated Freight Corridor (EDFC)", state: "Uttar Pradesh", district: "Prayagraj", agency: "DFCCIL", occupied: 5600.0, working: 3150.0, alloc: 160.0, spent: 152.5, families: 1650, status: "Completed & Operational", docId: "CAG-AUDIT-2021-2027" },
  { id: "REC-2021-MAHSR-03", fy: "2021-22", name: "Mumbai-Ahmedabad High-Speed Rail (Pkg C1)", state: "Gujarat", district: "Surat/Navsari", agency: "NHSRCL", occupied: 3800.5, working: 2100.0, alloc: 105.0, spent: 92.5, families: 1050, status: "Completed & Operational", docId: "SIA-REPORT-2026-04" },

  // FY 2022-23
  { id: "REC-2022-NHAI-04", fy: "2022-23", name: "Bengaluru-Chennai Expressway (Phase-1)", state: "Karnataka", district: "Kolar", agency: "NHAI", occupied: 6400.0, working: 4500.0, alloc: 180.0, spent: 172.0, families: 2100, status: "Completed & Operational", docId: "GAZETTE-2026-SO-4412" },
  { id: "REC-2022-WDFC-05", fy: "2022-23", name: "Western DFC (Rewari-Madar Section)", state: "Rajasthan", district: "Jaipur/Ajmer", agency: "DFCCIL", occupied: 8200.0, working: 5400.4, alloc: 210.0, spent: 198.7, families: 2750, status: "Completed & Operational", docId: "CAG-AUDIT-2021-2027" },
  { id: "REC-2022-AMR-06", fy: "2022-23", name: "Amritsar-Jamnagar Economic Corridor", state: "Punjab & Rajasthan", district: "Bathinda/Bikaner", agency: "NHAI", occupied: 8200.0, working: 5300.0, alloc: 190.0, spent: 172.0, families: 2500, status: "Completed & Operational", docId: "AWARD-VAL-2026-892" },

  // FY 2023-24
  { id: "REC-2023-NHAI-07", fy: "2023-24", name: "Raipur-Visakhapatnam Economic Corridor", state: "Odisha & AP", district: "Koraput/Vizag", agency: "NHAI", occupied: 9200.8, working: 6800.0, alloc: 220.0, spent: 214.5, families: 3400, status: "Completed & Operational", docId: "BHUVAN-JVS-2026-091" },
  { id: "REC-2023-GHY-08", fy: "2023-24", name: "Northeast Frontier Highway Paving", state: "Assam", district: "Kamrup/Nagaon", agency: "MoRTH", occupied: 7800.0, working: 5100.2, alloc: 180.0, spent: 168.0, families: 2800, status: "Completed & Operational", docId: "RR-SCHEME-2026-04" },
  { id: "REC-2023-BND-09", fy: "2023-24", name: "Bundelkhand Expressway Link", state: "Uttar Pradesh", district: "Banda/Chitrakoot", agency: "UPEIDA", occupied: 14500.0, working: 9200.0, alloc: 320.0, spent: 306.0, families: 5200, status: "Completed & Operational", docId: "GAZETTE-2026-SO-4412" },

  // FY 2024-25
  { id: "REC-2024-NHAI-10", fy: "2024-25", name: "Delhi-Amritsar-Katra Expressway", state: "Punjab & J&K", district: "Ludhiana/Kathua", agency: "NHAI", occupied: 12400.0, working: 8100.0, alloc: 270.0, spent: 255.1, families: 4900, status: "Completed & Operational", docId: "AWARD-VAL-2026-892" },
  { id: "REC-2024-SUR-11", fy: "2024-25", name: "Surat-Chennai Economic Corridor (Pkg 4-6)", state: "Maharashtra & KA", district: "Solapur/Kalaburagi", agency: "NHAI", occupied: 15200.0, working: 9800.0, alloc: 330.0, spent: 304.0, families: 6100, status: "Completed & Operational", docId: "CAG-AUDIT-2021-2027" },
  { id: "REC-2024-VAR-12", fy: "2024-25", name: "Varanasi-Ranchi-Kolkata Expressway", state: "Jharkhand & WB", district: "Bokaro/Purulia", agency: "NHAI", occupied: 14500.0, working: 8500.0, alloc: 290.0, spent: 265.0, families: 5800, status: "Completed & Operational", docId: "SIA-REPORT-2026-04" },

  // FY 2025-26
  { id: "REC-2025-BLR-13", fy: "2025-26", name: "Bengaluru Satellite Town Ring Road (STRR)", state: "Karnataka", district: "Bengaluru Rural", agency: "NHAI", occupied: 16800.0, working: 10400.0, alloc: 340.0, spent: 318.8, families: 7200, status: "Substantially Completed", docId: "BHUVAN-JVS-2026-091" },
  { id: "REC-2025-KOL-14", fy: "2025-26", name: "Kolkata-Siliguri Highway (NH-12)", state: "West Bengal", district: "Malda/Murshidabad", agency: "NHAI", occupied: 18200.0, working: 11220.0, alloc: 360.0, spent: 335.0, families: 7900, status: "Substantially Completed", docId: "RR-SCHEME-2026-04" },
  { id: "REC-2025-HYD-15", fy: "2025-26", name: "Hyderabad Regional Ring Road (Northern Arc)", state: "Telangana", district: "Medak/Siddipet", agency: "NHAI", occupied: 17430.0, working: 10200.0, alloc: 340.0, spent: 312.0, families: 7000, status: "Substantially Completed", docId: "GAZETTE-2026-SO-4412" },

  // FY 2026-27 (Current Active FY)
  { id: "REC-2026-KOL-16", fy: "2026-27", name: "Bengaluru–Chennai Highway Expansion (Pkg 2)", state: "Karnataka", district: "Kolar", agency: "NHAI", occupied: 18400.0, working: 11800.0, alloc: 380.0, spent: 265.0, families: 8100, status: "Active Construction (Paving)", docId: "GAZETTE-2026-SO-4412" },
  { id: "REC-2026-JPR-17", fy: "2026-27", name: "NH-48 Spur Alignment Jaipur", state: "Rajasthan", district: "Jaipur", agency: "NHAI", occupied: 20500.0, working: 12900.0, alloc: 420.0, spent: 285.0, families: 8900, status: "Active Construction (Earthwork)", docId: "AWARD-VAL-2026-892" },
  { id: "REC-2026-HYD-18", fy: "2026-27", name: "NH-65 Multi-Modal Corridor Hyderabad", state: "Telangana", district: "Rangareddy", agency: "NHAI", occupied: 22300.0, working: 13800.0, alloc: 450.0, spent: 292.0, families: 9400, status: "Active Construction (Subgrade)", docId: "CAG-AUDIT-2021-2027" }
];

// ── OFFICIAL STATUTORY DEMO DOCUMENTS REPOSITORY ────────────────
const DEMO_DOCUMENTS = {
  "GAZETTE-2026-SO-4412": {
    id: "GAZETTE-2026-SO-4412",
    shortName: "Gazette Sec 11(1)",
    title: "The Gazette of India: Extraordinary (Part II - Sec 3(ii)) — S.O. 4412(E)",
    category: "Statutory Gazette Notification",
    authority: "Ministry of Rural Development (DoLR), New Delhi",
    date: "10th July 2026",
    refNo: "DL-(N)04/0007/2003-26 / S.O. 4412(E)",
    html: `
      <div class="gazette-watermark">भारत सरकार &bull; OFFICIAL RECORD</div>
      <div class="gazette-header-block">
        <div style="font-size:32px;margin-bottom:4px">🇮🇳</div>
        <div class="gazette-title-hindi">भारत का राजपत्र : असाधारण</div>
        <div class="gazette-title-eng">The Gazette of India : Extraordinary</div>
        <div class="gazette-sub">भाग II — खण्ड 3 — उप-खण्ड (ii) | PART II — Section 3 — Sub-section (ii)</div>
        <div class="gazette-sub" style="margin-top:2px">प्राधिकार से प्रकाशित | PUBLISHED BY AUTHORITY</div>
      </div>

      <div class="gazette-meta-row">
        <span>सं. 2481] नई दिल्ली, शुक्रवार, जुलाई 10, 2026 / आषाढ़ 19, 1948</span>
        <span>[No. 2481] NEW DELHI, FRIDAY, JULY 10, 2026 / ASHADHA 19, 1948</span>
      </div>

      <div class="gazette-order-title">
        MINISTRY OF RURAL DEVELOPMENT<br/>
        (Department of Land Resources)<br/>
        <strong>NOTIFICATION UNDER SECTION 11(1) OF THE RFCTLARR ACT, 2013</strong>
      </div>

      <p class="gazette-clause">
        <strong>S.O. 4412(E).</strong>—Whereas it appears to the Appropriate Government (Central Government) that land is required in the District of <strong>Kolar</strong> in the State of <strong>Karnataka</strong> for a public purpose, namely for the construction and expansion of the <strong>Bengaluru–Chennai Economic Corridor (NH-75/NH-4 Link)</strong> under the National Highways Authority of India (NHAI).
      </p>

      <p class="gazette-clause">
        And whereas a Social Impact Assessment study was conducted by the independent State SIA Unit under Section 4 of the Right to Fair Compensation and Transparency in Land Acquisition, Rehabilitation and Resettlement Act, 2013 (30 of 2013), and the Expert Committee under Section 7 recommended the execution of the said project;
      </p>

      <p class="gazette-clause">
        Now, therefore, in exercise of the powers conferred by sub-section (1) of section 11 of the said Act, the Central Government hereby notifies that the parcels of land described in the Schedule hereto annexed, measuring <strong>500.00 Acres</strong> approximately, are required for the said public purpose:
      </p>

      <div style="margin:16px 0;font-weight:bold;font-size:13px;text-align:center">
        SCHEDULE OF ACQUIRED LAND PARCELS (TALUK: MALUR &amp; TEKAL)
      </div>

      <table class="gazette-table">
        <thead>
          <tr>
            <th>Parcel ID</th>
            <th>Bhu-Aadhaar (ULPIN)</th>
            <th>Village</th>
            <th>Survey No.</th>
            <th>RTC No.</th>
            <th>Extent (Acres)</th>
            <th>Classification</th>
            <th>Nature of Use</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>KA-00121</td><td>ULPIN-KA-29-0121</td><td>Malur</td><td>Sy 112/3</td><td>RTC-44/21</td><td>2.40</td><td>Dry Agricultural</td><td>Corridor Main Carriage</td></tr>
          <tr><td>KA-00122</td><td>ULPIN-KA-29-0122</td><td>Malur</td><td>Sy 114/1</td><td>RTC-44/22</td><td>3.10</td><td>Garden / Plantation</td><td>Embankment &amp; Drain</td></tr>
          <tr><td>KA-00123</td><td>ULPIN-KA-29-0123</td><td>Malur</td><td>Sy 115/2</td><td>RTC-44/23</td><td>2.40</td><td>Dry Agricultural</td><td>Service Road Alignment</td></tr>
          <tr><td>KA-00124</td><td>ULPIN-KA-29-0124</td><td>Tekal</td><td>Sy 88/5</td><td>RTC-45/04</td><td>1.80</td><td>Wet / Irrigated</td><td>Major Culvert Foundation</td></tr>
          <tr><td>KA-00125</td><td>ULPIN-KA-29-0125</td><td>Tekal</td><td>Sy 91/2</td><td>RTC-45/09</td><td>4.00</td><td>Semi-Urban Dry</td><td>Interchange Ramp</td></tr>
          <tr><td>KA-00126</td><td>ULPIN-KA-29-0126</td><td>Huralagere</td><td>Sy 60/4</td><td>RTC-46/11</td><td>2.00</td><td>Dry Agricultural</td><td>Subgrade Earthwork</td></tr>
          <tr><td>KA-00127</td><td>ULPIN-KA-29-0127</td><td>Huralagere</td><td>Sy 63/1</td><td>RTC-46/14</td><td>2.90</td><td>Dry Agricultural</td><td>Utility Corridor &amp; Duct</td></tr>
          <tr><td>KA-00128</td><td>ULPIN-KA-29-0128</td><td>Kasaba</td><td>Sy 20/7</td><td>RTC-47/02</td><td>3.50</td><td>Barren / Pasture</td><td>Toll Plaza Approaches</td></tr>
        </tbody>
      </table>

      <p class="gazette-clause">
        Any person interested in any land within the notified area may, within <strong>sixty days</strong> from the date of publication of this notification, submit objections in writing to the District Collector and Competent Authority (Land Acquisition), Kolar, under Section 15(1) of the said Act.
      </p>

      <div class="gazette-digital-sig">
        <div style="font-size:28px;color:#16a34a">✔️</div>
        <div>
          <div style="font-weight:700;color:#166534;font-size:13px">DIGITALLY SIGNED STATUTORY RECORD</div>
          <div style="font-size:12px;color:#1e293b"><strong>Shri A. K. Sharma, IAS</strong>, Joint Secretary to the Government of India</div>
          <div style="font-size:11px;color:#64748b">Ministry of Rural Development, Krishi Bhawan, New Delhi &bull; Timestamp: 2026-07-10T11:45:00+05:30</div>
          <div style="font-size:10.5px;color:#0369a1;font-family:monospace">SHA-256: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855</div>
        </div>
      </div>
    `
  },

  "SIA-REPORT-2026-04": {
    id: "SIA-REPORT-2026-04",
    shortName: "SIA Study Sec 4",
    title: "Comprehensive Social Impact Assessment (SIA) Final Study Report — Section 4 & 7",
    category: "Social Impact Assessment",
    authority: "State Administrative Training Institute (ATI) & Independent SIA Unit",
    date: "2nd August 2026",
    refNo: "SIA-KLR-2026/04/TISS",
    html: `
      <div class="gazette-watermark">भारत सरकार &bull; SIA CERTIFIED</div>
      <div class="gazette-header-block">
        <div style="font-size:32px;margin-bottom:4px">🏛️</div>
        <div class="gazette-title-eng" style="font-size:16px">STATE INDEPENDENT SOCIAL IMPACT ASSESSMENT UNIT</div>
        <div class="gazette-sub">Administrative Training Institute, Government of Karnataka</div>
        <div class="gazette-sub" style="margin-top:4px">Constituted under Section 4(1) of RFCTLARR Act, 2013</div>
      </div>

      <div class="gazette-meta-row">
        <span>Report Ref: SIA-KLR-2026/04/FINAL</span>
        <span>Submission Date: 02 August 2026</span>
        <span>Project: Bengaluru–Chennai Expressway (LA-2026-001)</span>
      </div>

      <div class="gazette-order-title">
        SOCIAL IMPACT ASSESSMENT STUDY &amp; SOCIAL IMPACT MANAGEMENT PLAN (SIMP)<br/>
        <span style="font-size:12px;font-weight:normal;text-decoration:none">Evaluation of 148 Project Affected Families across Malur, Tekal, and Huralagere</span>
      </div>

      <p class="gazette-clause">
        <strong>1. Executive Summary &amp; Public Purpose:</strong> The proposed acquisition of 500.00 Acres across 8 revenue villages in Kolar District has been assessed through multi-disciplinary field surveys, household demographic profiling, and Gram Sabha consultations. The project serves a certified National Infrastructure Public Purpose under Section 2(1)(b) of the Act.
      </p>

      <p class="gazette-clause">
        <strong>2. Public Hearing Minutes (Gram Sabha Malur):</strong> Public hearing was organized on 22nd June 2026 at Malur Taluk Panchayat Hall, presided over by the SIA Chairperson. Out of 148 landholding families, 134 participated. Primary concerns regarding market value updates, borewell compensation, and cattle pathway underpasses were incorporated into the revised engineering design.
      </p>

      <table class="gazette-table">
        <thead>
          <tr>
            <th>Key Metric</th>
            <th>Survey Findings</th>
            <th>Mitigation Measure Recommended</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>Total Affected Families (PAFs)</td><td>148 Families (712 Persons)</td><td>Full R&amp;R entitlement under Second Schedule</td></tr>
          <tr><td>Livelihood Disruption</td><td>42 Agricultural Tenant Labourers</td><td>One-time subsistence grant of Rs. 36,000 + skill training</td></tr>
          <tr><td>Residential Structures Displaced</td><td>18 Rural Dwellings</td><td>200 sq. yard plot allotment at Tekal Resettlement Colony</td></tr>
          <tr><td>Irrigation Borewells Severed</td><td>14 Functional Borewells</td><td>Depreciation-free replacement valuation awarded</td></tr>
          <tr><td>Overall Public Benefit Ratio</td><td>1:4.8 Economic Multiplier</td><td>Recommended for clearance by Expert Group</td></tr>
        </tbody>
      </table>

      <p class="gazette-clause">
        <strong>3. Recommendation of Independent Expert Group (Section 7):</strong> Having scrutinized the SIA study, the Expert Group certifies that the project footprint has been minimized to bare technical requirements, no tribal or vulnerable forest-dweller hamlets are affected, and the Social Impact Management Plan adequately safeguards affected families.
      </p>

      <div class="gazette-digital-sig">
        <div style="font-size:28px;color:#16a34a">✔️</div>
        <div>
          <div style="font-weight:700;color:#166534;font-size:13px">CERTIFIED BY INDEPENDENT EXPERT COMMITTEE</div>
          <div style="font-size:12px;color:#1e293b"><strong>Prof. Dr. Meenakshi Sundaram</strong>, Chairperson, State SIA Unit</div>
          <div style="font-size:11px;color:#64748b">Verified &amp; countersigned by District Collector, Kolar &bull; Timestamp: 2026-08-02T16:20:10+05:30</div>
          <div style="font-size:10.5px;color:#0369a1;font-family:monospace">SHA-256: a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0</div>
        </div>
      </div>
    `
  },

  "AWARD-VAL-2026-892": {
    id: "AWARD-VAL-2026-892",
    shortName: "Valuation Award Sec 26",
    title: "Competent Authority Land Valuation & Compensation Award Order — Sections 26–30",
    category: "Statutory Valuation Award",
    authority: "Office of the District Collector & Competent Authority (Land Acquisition), Kolar",
    date: "20th August 2026",
    refNo: "DC/KLR/LA-2026/AW-892",
    html: `
      <div class="gazette-watermark">भारत सरकार &bull; AWARD DECREE</div>
      <div class="gazette-header-block">
        <div style="font-size:32px;margin-bottom:4px">⚖️</div>
        <div class="gazette-title-eng" style="font-size:16px">GOVERNMENT OF KARNATAKA &bull; REVENUE DEPARTMENT</div>
        <div class="gazette-title-hindi" style="font-size:18px">कार्यालय जिला समाहर्ता एवं सक्षम प्राधिकारी (भूमि अर्जन), कोलार</div>
        <div class="gazette-sub">PROCEEDINGS OF THE DISTRICT COLLECTOR &amp; COMPETENT AUTHORITY (LA)</div>
      </div>

      <div class="gazette-meta-row">
        <span>Award Order No: DC/KLR/LA-2026/AW-892</span>
        <span>Award Date: 20 August 2026</span>
        <span>Total Sanction: Rs. 42.00 Crores</span>
      </div>

      <div class="gazette-order-title">
        STATUTORY COMPENSATION AWARD UNDER SECTION 23 &amp; SECTIONS 26 TO 30<br/>
        <span style="font-size:12px;font-weight:normal;text-decoration:none">Bengaluru–Chennai Highway Project (Kolar Section — 500 Acres)</span>
      </div>

      <p class="gazette-clause">
        In accordance with Section 26(1) of the RFCTLARR Act, 2013, the base market value of the land has been determined taking the higher of registered sale deeds within the preceding 3 years from Kaveri-IGRS and the prevailing State Guidance Value.
      </p>

      <div style="margin:16px 0;font-weight:bold;font-size:13px;text-align:center">
        COMPREHENSIVE STATUTORY COMPENSATION DETERMINATION SCHEDULE
      </div>

      <table class="gazette-table">
        <thead>
          <tr>
            <th>Statutory Factor</th>
            <th>Statutory Clause</th>
            <th>Rate / Computation</th>
            <th>Net Extent</th>
            <th>Total Amount (Rs.)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>1. Base Market Value</strong></td>
            <td>Section 26(1)</td>
            <td>Rs. 35,00,000 / Acre (IGRS Guidance Value)</td>
            <td>500.00 Acres</td>
            <td>Rs. 17,50,00,000</td>
          </tr>
          <tr>
            <td><strong>2. Rural Multiplier Factor</strong></td>
            <td>First Schedule (Item 2)</td>
            <td>Factor of 2.0x for Rural Radial Distance &gt; 15 Km</td>
            <td>500.00 Acres</td>
            <td>Rs. 17,50,00,000 (Added)</td>
          </tr>
          <tr>
            <td><strong>3. Sub-total Market Value</strong></td>
            <td>Section 26 &amp; 27</td>
            <td>Rs. 70,00,000 / Acre</td>
            <td>500.00 Acres</td>
            <td>Rs. 35,00,00,000</td>
          </tr>
          <tr>
            <td><strong>4. Value of Attached Assets</strong></td>
            <td>Section 29</td>
            <td>Horticulture trees, wells, boundary walls valuation</td>
            <td>Various</td>
            <td>Rs. 2,50,00,000</td>
          </tr>
          <tr>
            <td><strong>5. 100% Solatium</strong></td>
            <td>Section 30(1)</td>
            <td>100% of Total Market Value (Item 3 + Item 4)</td>
            <td>Mandatory</td>
            <td>Rs. 37,50,00,000</td>
          </tr>
          <tr>
            <td><strong>6. Additional Interest (12%)</strong></td>
            <td>Section 30(3)</td>
            <td>12% p.a. from Sec 11 notification to award date</td>
            <td>41 Days</td>
            <td>Rs. 47,26,000</td>
          </tr>
          <tr style="background:#f0fdf4;font-weight:bold">
            <td colspan="4">TOTAL SANCTIONED PFMS COMPENSATION DISBURSAL</td>
            <td style="color:#166534;font-size:14px">Rs. 42,00,00,000</td>
          </tr>
        </tbody>
      </table>

      <p class="gazette-clause">
        All payments shall be processed exclusively via <strong>Direct Benefit Transfer (DBT)</strong> through the Public Financial Management System (PFMS) gateway directly to the Aadhaar-authenticated bank accounts of eligible tenure-holders.
      </p>

      <div class="gazette-digital-sig">
        <div style="font-size:28px;color:#16a34a">✔️</div>
        <div>
          <div style="font-weight:700;color:#166534;font-size:13px">AWARD CONFIRMED &amp; SIGNED BY COMPETENT AUTHORITY</div>
          <div style="font-size:12px;color:#1e293b"><strong>Smt. R. V. Pavithra, IAS</strong>, Deputy Commissioner &amp; District Collector, Kolar</div>
          <div style="font-size:11px;color:#64748b">Competent Authority (Land Acquisition) &bull; Timestamp: 2026-08-20T14:10:45+05:30</div>
          <div style="font-size:10.5px;color:#0369a1;font-family:monospace">SHA-256: 9876543210abcdef0123456789abcdef0123456789abcdef0123456789abcdef</div>
        </div>
      </div>
    `
  },

  "BHUVAN-JVS-2026-091": {
    id: "BHUVAN-JVS-2026-091",
    shortName: "Bhuvan Cadastral Survey",
    title: "Bhuvan-ISRO & Survey of India Joint Cadastral Drone Verification & ULPIN Schedule",
    category: "Cadastral Survey Certificate",
    authority: "National Remote Sensing Centre (NRSC / ISRO) & Survey Settlement Wing",
    date: "15th June 2026",
    refNo: "NRSC-BHOOMI-2026-JVS-091",
    html: `
      <div class="gazette-watermark">ISRO &bull; BHUVAN GEOSPATIAL</div>
      <div class="gazette-header-block">
        <div style="font-size:32px;margin-bottom:4px">🛰️</div>
        <div class="gazette-title-eng" style="font-size:16px">NATIONAL REMOTE SENSING CENTRE (NRSC / ISRO)</div>
        <div class="gazette-sub">Bhuvan Cadastral Geoportal &bull; Department of Space, Government of India</div>
        <div class="gazette-sub" style="margin-top:2px">Joint Drone DGPS Ground Verification Certificate</div>
      </div>

      <div class="gazette-meta-row">
        <span>Survey Ref: NRSC-BHOOMI-2026-JVS-091</span>
        <span>Resolution: &lt; 5 cm Orthomosaic</span>
        <span>Coordinate System: WGS 84 / UTM Zone 43N</span>
      </div>

      <div class="gazette-order-title">
        JOINT VERIFICATION SURVEY (JVS) &amp; BHU-AADHAAR (ULPIN) SYNCHRONIZATION<br/>
        <span style="font-size:12px;font-weight:normal;text-decoration:none">Corridor Chainage Km 12.400 to Km 23.450 (Kolar Alignment)</span>
      </div>

      <p class="gazette-clause">
        This is to certify that high-resolution UAV (Drone) photogrammetric survey and dual-frequency Differential GPS (DGPS) ground control network establishment were conducted jointly by NRSC (ISRO), Survey of India, and Karnataka Revenue Survey Department.
      </p>

      <table class="gazette-table">
        <thead>
          <tr>
            <th>Parcel ID</th>
            <th>ULPIN (14-Digit)</th>
            <th>Geo-Coordinates (Lat, Long)</th>
            <th>Ground Area</th>
            <th>Working Land Area</th>
            <th>Current Construction Activity</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>KA-00121</td><td>ULPIN-KA-29-0121</td><td>13.140° N, 78.125° E</td><td>2.40 Ac</td><td>2.40 Ac</td><td>Paving &amp; Asphalting (85% Completed)</td></tr>
          <tr><td>KA-00122</td><td>ULPIN-KA-29-0122</td><td>13.142° N, 78.130° E</td><td>3.10 Ac</td><td>3.10 Ac</td><td>Earthwork &amp; Embankment (70% Completed)</td></tr>
          <tr><td>KA-00123</td><td>ULPIN-KA-29-0123</td><td>13.135° N, 78.132° E</td><td>2.40 Ac</td><td>0.00 Ac</td><td>Pre-construction Demarcation (15% Done)</td></tr>
          <tr><td>KA-00124</td><td>ULPIN-KA-29-0124</td><td>13.130° N, 78.128° E</td><td>1.80 Ac</td><td>1.20 Ac</td><td>Bridge Culvert Foundations (45% Done)</td></tr>
          <tr><td>KA-00125</td><td>ULPIN-KA-29-0125</td><td>13.128° N, 78.135° E</td><td>4.00 Ac</td><td>0.00 Ac</td><td>Pending Land Possession (5% Done)</td></tr>
          <tr><td>KA-00126</td><td>ULPIN-KA-29-0126</td><td>13.145° N, 78.138° E</td><td>2.00 Ac</td><td>2.00 Ac</td><td>Subgrade Compaction (92% Completed)</td></tr>
          <tr><td>KA-00127</td><td>ULPIN-KA-29-0127</td><td>13.125° N, 78.122° E</td><td>2.90 Ac</td><td>1.50 Ac</td><td>Utility Relocation &amp; Drains (55% Done)</td></tr>
          <tr><td>KA-00128</td><td>ULPIN-KA-29-0128</td><td>13.138° N, 78.120° E</td><td>3.50 Ac</td><td>0.00 Ac</td><td>Boundary Marker Trenching (10% Done)</td></tr>
        </tbody>
      </table>

      <div class="gazette-digital-sig">
        <div style="font-size:28px;color:#16a34a">✔️</div>
        <div>
          <div style="font-weight:700;color:#166534;font-size:13px">DIGITALLY VERIFIED BY ISRO-BHUVAN GEOPORTAL</div>
          <div style="font-size:12px;color:#1e293b"><strong>Dr. Suresh N.</strong>, Scientist-SG &amp; Head, Bhuvan Geospatial Services, NRSC</div>
          <div style="font-size:11px;color:#64748b">Hyderabad &bull; Integrated with State Bhoomi RTC &bull; Timestamp: 2026-06-15T18:05:00+05:30</div>
          <div style="font-size:10.5px;color:#0369a1;font-family:monospace">SHA-256: f0e1d2c3b4a5968778695a4b3c2d1e0ff0e1d2c3b4a5968778695a4b3c2d1e0f</div>
        </div>
      </div>
    `
  },

  "RR-SCHEME-2026-04": {
    id: "RR-SCHEME-2026-04",
    shortName: "R&R Scheme Sec 31",
    title: "Rehabilitation & Resettlement (R&R) Scheme Statutory Sanction Order — Section 31",
    category: "Rehabilitation Order",
    authority: "Office of the Commissioner for Rehabilitation & Resettlement, MoRD",
    date: "5th September 2026",
    refNo: "DoLR/RR/SCH-2026/04",
    html: `
      <div class="gazette-watermark">भारत सरकार &bull; R&amp;R SANCTION</div>
      <div class="gazette-header-block">
        <div style="font-size:32px;margin-bottom:4px">🏡</div>
        <div class="gazette-title-hindi" style="font-size:18px">पुनर्वासन और पुनर्स्थापन आयुक्त का कार्यालय</div>
        <div class="gazette-title-eng" style="font-size:16px">OFFICE OF THE COMMISSIONER FOR REHABILITATION &amp; RESETTLEMENT</div>
        <div class="gazette-sub">Ministry of Rural Development &bull; Government of India</div>
      </div>

      <div class="gazette-meta-row">
        <span>Sanction Order: DoLR/RR/SCH-2026/04</span>
        <span>Sanction Date: 05 September 2026</span>
        <span>Eligible PAFs: 148 Families</span>
      </div>

      <div class="gazette-order-title">
        STATUTORY REHABILITATION &amp; RESETTLEMENT SCHEME SANCTION<br/>
        <span style="font-size:12px;font-weight:normal;text-decoration:none">Second Schedule Compliance under RFCTLARR Act, 2013</span>
      </div>

      <p class="gazette-clause">
        In exercise of the powers conferred by Section 31(1) of the Act, the Rehabilitation and Resettlement Scheme prepared by the Administrator (R&amp;R) and approved by the State Government is hereby formally sanctioned for execution:
      </p>

      <table class="gazette-table">
        <thead>
          <tr>
            <th>Entitlement Category</th>
            <th>Second Schedule Reference</th>
            <th>Sanctioned Benefit Per Displaced Family</th>
            <th>Total Budget Allocation</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>Housing Plot Allotment</td><td>Second Schedule, Item 1</td><td>200 Sq. Yards developed residential plot at Tekal Model Colony</td><td>Rs. 4.20 Crores</td></tr>
          <tr><td>Subsistence Allowance</td><td>Second Schedule, Item 5</td><td>Rs. 3,000 per month for 12 months (Total: Rs. 36,000 per family)</td><td>Rs. 53.28 Lakhs</td></tr>
          <tr><td>Transportation Grant</td><td>Second Schedule, Item 6</td><td>Rs. 50,000 one-time shifting allowance per family</td><td>Rs. 74.00 Lakhs</td></tr>
          <tr><td>Artisan &amp; Trader Grant</td><td>Second Schedule, Item 7</td><td>Rs. 25,000 one-time financial grant for petty kiosk / trade reconstruction</td><td>Rs. 18.50 Lakhs</td></tr>
          <tr><td>Skill Development Vouchers</td><td>Second Schedule, Item 4</td><td>Free NSDC accredited certification for 1 youth per affected family</td><td>Rs. 29.60 Lakhs</td></tr>
          <tr><td>Resettlement Infrastructure</td><td>Third Schedule</td><td>Paved roads, piped drinking water, electricity, primary health center</td><td>Rs. 3.40 Crores</td></tr>
        </tbody>
      </table>

      <div class="gazette-digital-sig">
        <div style="font-size:28px;color:#16a34a">✔️</div>
        <div>
          <div style="font-weight:700;color:#166534;font-size:13px">APPROVED BY R&amp;R COMMISSIONER</div>
          <div style="font-size:12px;color:#1e293b"><strong>Shri Arvind K. Saxena</strong>, Additional Secretary &amp; Commissioner for R&amp;R</div>
          <div style="font-size:11px;color:#64748b">Ministry of Rural Development, New Delhi &bull; Timestamp: 2026-09-05T12:30:15+05:30</div>
          <div style="font-size:10.5px;color:#0369a1;font-family:monospace">SHA-256: 55aa66bb77cc88dd99ee00ff11aa22bb33cc44dd55ee66ff77aa88bb99cc00dd</div>
        </div>
      </div>
    `
  },

  "CAG-AUDIT-2021-2027": {
    id: "CAG-AUDIT-2021-2027",
    shortName: "CAG Multi-Year Audit",
    title: "Comptroller & Auditor General (CAG) Multi-Year Statutory Compliance Audit Scroll",
    category: "Statutory Audit Certificate",
    authority: "Office of the Comptroller & Auditor General of India, New Delhi",
    date: "8th September 2026",
    refNo: "CAG-DoLR-AR-2027-08",
    html: `
      <div class="gazette-watermark">भारत के नियंत्रक-महालेखापरीक्षक &bull; CAG AUDITED</div>
      <div class="gazette-header-block">
        <div style="font-size:32px;margin-bottom:4px">🇮🇳</div>
        <div class="gazette-title-hindi" style="font-size:18px">भारत के नियंत्रक-महालेखापरीक्षक का कार्यालय</div>
        <div class="gazette-title-eng" style="font-size:16px">OFFICE OF THE COMPTROLLER AND AUDITOR GENERAL OF INDIA</div>
        <div class="gazette-sub">10, Bahadur Shah Zafar Marg, New Delhi — 110002</div>
        <div class="gazette-sub" style="margin-top:2px">SPECIAL STATUTORY AUDIT &bull; PFMS LAND COMPENSATION DISBURSALS (2021–2027)</div>
      </div>

      <div class="gazette-meta-row">
        <span>Audit Scroll: CAG/DoLR-PFMS/2026-27/VOL-IV</span>
        <span>Reconciliation Status: 100% BALANCED</span>
        <span>Total Disbursed: Rs. 4,248.50 Crores</span>
      </div>

      <div class="gazette-order-title">
        MULTI-YEAR PERFORMANCE &amp; FINANCIAL COMPLIANCE AUDIT CERTIFICATE<br/>
        <span style="font-size:12px;font-weight:normal;text-decoration:none">Statutory Verification from FY 2021–22 through FY 2026–27</span>
      </div>

      <p class="gazette-clause">
        The Directorate of Audit, Central Expenditure, has conducted a comprehensive financial audit and performance review of statutory land acquisitions executed under the RFCTLARR Act, 2013 across <strong>102 National Highway and Dedicated Freight Corridors</strong> for the six consecutive financial years from 2021–22 to 2026–27.
      </p>

      <table class="gazette-table">
        <thead>
          <tr>
            <th>Financial Year</th>
            <th>Occupied Land (Ac)</th>
            <th>Active Working Land (Ac)</th>
            <th>Budget Sanctioned</th>
            <th>PFMS Disbursed</th>
            <th>PAFs Compensated</th>
            <th>Audit Opinion</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>FY 2021–22</td><td>14,200.5</td><td>8,450.0</td><td>Rs. 410.0 Cr</td><td>Rs. 385.2 Cr (94.0%)</td><td>4,120</td><td><span style="color:#166534;font-weight:bold">Unqualified (Clean)</span></td></tr>
          <tr><td>FY 2022–23</td><td>22,800.0</td><td>15,200.4</td><td>Rs. 580.0 Cr</td><td>Rs. 542.7 Cr (93.6%)</td><td>7,350</td><td><span style="color:#166534;font-weight:bold">Unqualified (Clean)</span></td></tr>
          <tr><td>FY 2023–24</td><td>31,500.8</td><td>21,100.2</td><td>Rs. 720.0 Cr</td><td>Rs. 688.5 Cr (95.6%)</td><td>11,400</td><td><span style="color:#166534;font-weight:bold">Unqualified (Clean)</span></td></tr>
          <tr><td>FY 2024–25</td><td>42,100.0</td><td>26,400.0</td><td>Rs. 890.0 Cr</td><td>Rs. 824.1 Cr (92.6%)</td><td>16,800</td><td><span style="color:#166534;font-weight:bold">Unqualified (Clean)</span></td></tr>
          <tr><td>FY 2025–26</td><td>52,430.0</td><td>31,820.0</td><td>Rs. 1,040.0 Cr</td><td>Rs. 965.8 Cr (92.9%)</td><td>22,100</td><td><span style="color:#166534;font-weight:bold">Unqualified (Clean)</span></td></tr>
          <tr><td>FY 2026–27 (YTD)</td><td>61,200.0</td><td>38,500.0</td><td>Rs. 1,250.0 Cr</td><td>Rs. 842.0 Cr (67.4%)</td><td>26,400</td><td><span style="color:#0284c7;font-weight:bold">In-Progress (Valid)</span></td></tr>
          <tr style="background:#f8fafc;font-weight:bold">
            <td>6-YEAR CUMULATIVE</td>
            <td>61,200.0 Ac</td>
            <td>38,500.0 Ac</td>
            <td>Rs. 4,890.0 Cr</td>
            <td>Rs. 4,248.5 Cr (86.9%)</td>
            <td>26,400 PAFs</td>
            <td style="color:#166534">ZERO LEAKAGE</td>
          </tr>
        </tbody>
      </table>

      <p class="gazette-clause">
        <strong>Audit Certificate Conclusion:</strong> The audit certifies that electronic transfers executed via PFMS directly into bank accounts of verified landholders have eliminated middleman leakages and ghost accounts. The spatial extent of occupied land (61,200 Acres) and active construction working land (38,500 Acres) accurately reconciles with Bhuvan-ISRO GIS cadastral records.
      </p>

      <div class="gazette-digital-sig">
        <div style="font-size:28px;color:#16a34a">✔️</div>
        <div>
          <div style="font-weight:700;color:#166534;font-size:13px">CERTIFIED BY PRINCIPAL DIRECTOR OF AUDIT (CENTRAL)</div>
          <div style="font-size:12px;color:#1e293b"><strong>Shri P. Venugopal, IA&amp;AS</strong>, Principal Director of Audit, New Delhi</div>
          <div style="font-size:11px;color:#64748b">Office of the Comptroller &amp; Auditor General of India &bull; Timestamp: 2026-09-08T17:00:00+05:30</div>
          <div style="font-size:10.5px;color:#0369a1;font-family:monospace">SHA-256: 1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef</div>
        </div>
      </div>
    `
  }
};

let activeDocKey = "GAZETTE-2026-SO-4412";
let archivesCurrentFY = "ALL";
let archivesCurrentSearch = "";


let DB = JSON.parse(localStorage.getItem("nlas_db") || "null") || {
  projects: [
    { id: "LA-2026-001", name: "Bengaluru–Chennai Highway Expansion", state: "Karnataka", district: "Kolar", type: "Highway", totalLand: 500, acquired: 320, workingLand: 240, occupiedLand: 320, families: 148, compEst: 42, budgetSpent: 35.3, stageIndex: 6, status: "Delayed",
      milestones: [{ name: "Proposal", status: "Completed" }, { name: "Verification", status: "Completed" },{ name: "Notification", status: "Completed" }, { name: "Social Impact Assessment", status: "Completed" },{ name: "Land Valuation", status: "Completed" }, { name: "Award Declaration", status: "In Progress" },{ name: "Compensation", status: "Pending" }, { name: "Possession", status: "Pending" },{ name: "R&R", status: "Pending" }, { name: "Completed", status: "Pending" }],
      ai: { appr: 3, comp: 42, lit: 12, rr: 70, over: 18 } },
    { id: "LA-2026-002", name: "NH-48 Spur, Jaipur", state: "Rajasthan", district: "Jaipur", type: "Highway", totalLand: 620, acquired: 410, workingLand: 310, occupiedLand: 410, families: 200, compEst: 65, budgetSpent: 48.0, stageIndex: 6, status: "Critical", milestones: STAGES.map((s,i)=>({name:s,status:i<6?"Completed":"Pending"})), ai: { appr: 4, comp: 60, lit: 8, rr: 80, over: 32 } },
    { id: "LA-2026-003", name: "NH-65 Corridor, Hyderabad", state: "Telangana", district: "Rangareddy", type: "Highway", totalLand: 450, acquired: 380, workingLand: 350, occupiedLand: 380, families: 120, compEst: 38, budgetSpent: 34.2, stageIndex: 8, status: "On Track", milestones: STAGES.map((s,i)=>({name:s,status:i<8?"Completed":i===8?"In Progress":"Pending"})), ai: { appr: 1, comp: 5, lit: 1, rr: 20, over: 2 } },
    { id: "LA-2026-004", name: "NH-31 Approach, Patna", state: "Bihar", district: "Patna", type: "Bridge", totalLand: 300, acquired: 150, workingLand: 95, occupiedLand: 150, families: 95, compEst: 22, budgetSpent: 14.5, stageIndex: 5, status: "Delayed", milestones: STAGES.map((s,i)=>({name:s,status:i<5?"Completed":i===5?"In Progress":"Pending"})), ai: { appr: 2, comp: 25, lit: 5, rr: 50, over: 12 } }
  ],
  parcels: [
    { id: "KA-00121", ulpin: "ULPIN-KA-29-0121", village: "Malur", lat: 13.140, lng: 78.125, area: 2.4, occupied_acres: 2.4, working_acres: 2.4, status: "Acquired", work_status: "Paving & Asphalting (85% Done)", work_progress_pct: 85, contractor: "L&T Infrastructure Unit-4", chainage: "Km 12.400 - Km 13.600", machinery: "4 Excavators, 2 Paving Machines, 1 Compactor", comp: 840000, rtc: "RTC-44/21", survey: "Sy 112/3" },
    { id: "KA-00122", ulpin: "ULPIN-KA-29-0122", village: "Malur", lat: 13.142, lng: 78.130, area: 3.1, occupied_acres: 3.1, working_acres: 3.1, status: "Acquired", work_status: "Earthwork & Embankment (70% Done)", work_progress_pct: 70, contractor: "L&T Infrastructure Unit-4", chainage: "Km 13.600 - Km 15.150", machinery: "3 Heavy Bulldozers, 4 Dumpers", comp: 1050000, rtc: "RTC-44/22", survey: "Sy 114/1" },
    { id: "KA-00123", ulpin: "ULPIN-KA-29-0123", village: "Malur", lat: 13.135, lng: 78.132, area: 2.4, occupied_acres: 0.0, working_acres: 0.0, status: "Pending", work_status: "Pre-construction Demarcation (15% Done)", work_progress_pct: 15, contractor: "Survey Wing NHAI", chainage: "Km 15.150 - Km 16.350", machinery: "Survey DGPS Equipment", comp: 840000, rtc: "RTC-44/23", survey: "Sy 115/2" },
    { id: "KA-00124", ulpin: "ULPIN-KA-29-0124", village: "Tekal", lat: 13.130, lng: 78.128, area: 1.8, occupied_acres: 1.8, working_acres: 1.2, status: "Under Process", work_status: "Bridge Culvert Foundations (45% Done)", work_progress_pct: 45, contractor: "Afcons Infrastructure", chainage: "Km 16.350 - Km 17.250", machinery: "1 Piling Rig, 2 Concrete Transit Mixers", comp: 620000, rtc: "RTC-45/04", survey: "Sy 88/5" },
    { id: "KA-00125", ulpin: "ULPIN-KA-29-0125", village: "Tekal", lat: 13.128, lng: 78.135, area: 4.0, occupied_acres: 0.0, working_acres: 0.0, status: "Pending", work_status: "Pending Land Possession (5% Done)", work_progress_pct: 5, contractor: "Awaiting Clearance", chainage: "Km 17.250 - Km 19.250", machinery: "None Deployed", comp: 1400000, rtc: "RTC-45/09", survey: "Sy 91/2" },
    { id: "KA-00126", ulpin: "ULPIN-KA-29-0126", village: "Huralagere", lat: 13.145, lng: 78.138, area: 2.0, occupied_acres: 2.0, working_acres: 2.0, status: "Acquired", work_status: "Subgrade Compaction (92% Done)", work_progress_pct: 92, contractor: "L&T Infrastructure Unit-4", chainage: "Km 19.250 - Km 20.250", machinery: "2 Heavy Rollers, 1 Water Bowser", comp: 700000, rtc: "RTC-46/11", survey: "Sy 60/4" },
    { id: "KA-00127", ulpin: "ULPIN-KA-29-0127", village: "Huralagere", lat: 13.125, lng: 78.122, area: 2.9, occupied_acres: 2.0, working_acres: 1.5, status: "Under Process", work_status: "Utility Relocation & Drains (55% Done)", work_progress_pct: 55, contractor: "Afcons Infrastructure", chainage: "Km 20.250 - Km 21.700", machinery: "1 Backhoe Loader, 2 Trench Diggers", comp: 980000, rtc: "RTC-46/14", survey: "Sy 63/1" },
    { id: "KA-00128", ulpin: "ULPIN-KA-29-0128", village: "Kasaba", lat: 13.138, lng: 78.120, area: 3.5, occupied_acres: 0.0, working_acres: 0.0, status: "Pending", work_status: "Boundary Trenching (10% Done)", work_progress_pct: 10, contractor: "Survey Wing NHAI", chainage: "Km 21.700 - Km 23.450", machinery: "Boundary Marker Rigs", comp: 1220000, rtc: "RTC-47/02", survey: "Sy 20/7" }
  ],
  docs: [
    { name: "Land Acquisition Proposal.pdf", ver: "1.0", by: "Project Agency", date: "2026-06-01", status: "Approved" },
    { name: "Notification.pdf", ver: "1.0", by: "District Officer", date: "2026-07-10", status: "Approved" },
    { name: "Social Impact Assessment.pdf", ver: "2.0", by: "District Officer", date: "2026-08-02", status: "Approved" },
    { name: "Land Valuation.pdf", ver: "1.2", by: "State Officer", date: "2026-08-20", status: "Approved" },
    { name: "Compensation Report.pdf", ver: "2.0", by: "District Officer", date: "2026-09-10", status: "Pending" },
    { name: "R&R Report.pdf", ver: "0.9", by: "Field Officer", date: "2026-09-05", status: "Draft" }
  ],
  alerts: [
    { sev: "critical", msg: "LA-2026-001 has 42 pending compensation cases, PFMS deadline approaching", time: "2026-09-09" },
    { sev: "warning", msg: "LA-2026-002 delayed by 32 days at Compensation stage", time: "2026-09-08" },
    { sev: "info", msg: "New project LA-2026-004 submitted by Agency", time: "2026-09-07" }
  ],
  historical_records: HISTORICAL_DATA,
  audit: [{ t: "2026-09-09 10:00", u: "System", a: "Seeded National Multi-Year Archives & Geo-Parcels", type: "write" }]
};

// Force refresh historical data & working land attributes if old cache exists
DB.historical_records = HISTORICAL_DATA;
if (!DB.parcels[0].ulpin || !DB.parcels[0].working_acres) {
  DB.parcels = [
    { id: "KA-00121", ulpin: "ULPIN-KA-29-0121", village: "Malur", lat: 13.140, lng: 78.125, area: 2.4, occupied_acres: 2.4, working_acres: 2.4, status: "Acquired", work_status: "Paving & Asphalting (85% Done)", work_progress_pct: 85, contractor: "L&T Infrastructure Unit-4", chainage: "Km 12.400 - Km 13.600", machinery: "4 Excavators, 2 Paving Machines, 1 Compactor", comp: 840000, rtc: "RTC-44/21", survey: "Sy 112/3" },
    { id: "KA-00122", ulpin: "ULPIN-KA-29-0122", village: "Malur", lat: 13.142, lng: 78.130, area: 3.1, occupied_acres: 3.1, working_acres: 3.1, status: "Acquired", work_status: "Earthwork & Embankment (70% Done)", work_progress_pct: 70, contractor: "L&T Infrastructure Unit-4", chainage: "Km 13.600 - Km 15.150", machinery: "3 Heavy Bulldozers, 4 Dumpers", comp: 1050000, rtc: "RTC-44/22", survey: "Sy 114/1" },
    { id: "KA-00123", ulpin: "ULPIN-KA-29-0123", village: "Malur", lat: 13.135, lng: 78.132, area: 2.4, occupied_acres: 0.0, working_acres: 0.0, status: "Pending", work_status: "Pre-construction Demarcation (15% Done)", work_progress_pct: 15, contractor: "Survey Wing NHAI", chainage: "Km 15.150 - Km 16.350", machinery: "Survey DGPS Equipment", comp: 840000, rtc: "RTC-44/23", survey: "Sy 115/2" },
    { id: "KA-00124", ulpin: "ULPIN-KA-29-0124", village: "Tekal", lat: 13.130, lng: 78.128, area: 1.8, occupied_acres: 1.8, working_acres: 1.2, status: "Under Process", work_status: "Bridge Culvert Foundations (45% Done)", work_progress_pct: 45, contractor: "Afcons Infrastructure", chainage: "Km 16.350 - Km 17.250", machinery: "1 Piling Rig, 2 Concrete Transit Mixers", comp: 620000, rtc: "RTC-45/04", survey: "Sy 88/5" },
    { id: "KA-00125", ulpin: "ULPIN-KA-29-0125", village: "Tekal", lat: 13.128, lng: 78.135, area: 4.0, occupied_acres: 0.0, working_acres: 0.0, status: "Pending", work_status: "Pending Land Possession (5% Done)", work_progress_pct: 5, contractor: "Awaiting Clearance", chainage: "Km 17.250 - Km 19.250", machinery: "None Deployed", comp: 1400000, rtc: "RTC-45/09", survey: "Sy 91/2" },
    { id: "KA-00126", ulpin: "ULPIN-KA-29-0126", village: "Huralagere", lat: 13.145, lng: 78.138, area: 2.0, occupied_acres: 2.0, working_acres: 2.0, status: "Acquired", work_status: "Subgrade Compaction (92% Done)", work_progress_pct: 92, contractor: "L&T Infrastructure Unit-4", chainage: "Km 19.250 - Km 20.250", machinery: "2 Heavy Rollers, 1 Water Bowser", comp: 700000, rtc: "RTC-46/11", survey: "Sy 60/4" },
    { id: "KA-00127", ulpin: "ULPIN-KA-29-0127", village: "Huralagere", lat: 13.125, lng: 78.122, area: 2.9, occupied_acres: 2.0, working_acres: 1.5, status: "Under Process", work_status: "Utility Relocation & Drains (55% Done)", work_progress_pct: 55, contractor: "Afcons Infrastructure", chainage: "Km 20.250 - Km 21.700", machinery: "1 Backhoe Loader, 2 Trench Diggers", comp: 980000, rtc: "RTC-46/14", survey: "Sy 63/1" },
    { id: "KA-00128", ulpin: "ULPIN-KA-29-0128", village: "Kasaba", lat: 13.138, lng: 78.120, area: 3.5, occupied_acres: 0.0, working_acres: 0.0, status: "Pending", work_status: "Boundary Trenching (10% Done)", work_progress_pct: 10, contractor: "Survey Wing NHAI", chainage: "Km 21.700 - Km 23.450", machinery: "Boundary Marker Rigs", comp: 1220000, rtc: "RTC-47/02", survey: "Sy 20/7" }
  ];
}

function save(){ localStorage.setItem("nlas_db", JSON.stringify(DB)); localStorage.setItem("nlas_current", currentId); }
function esc(s){ return String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
function audit(a, type){
  const row = { t: new Date().toLocaleString(), u: session ? esc(session.email) : "System", a: esc(a), type: type||"write" };
  DB.audit.unshift(row); save(); renderAudit();
}

// ── ACCESSIBILITY CONTROLS (GIGW 3.0 & india.gov.in standard) ──
function textIncrease(){ document.body.style.fontSize = "16px"; }
function textDecrease(){ document.body.style.fontSize = "12px"; }
function textReset(){ document.body.style.fontSize = "14px"; }
function toggleContrast(){ document.body.classList.toggle("high-contrast"); }

// ── QUICK DEMO ROLE SWITCHER (For judges / evaluators) ───────
function fillLogin(email, role){
  const emailInput = document.getElementById("login-email");
  const passInput = document.getElementById("login-pass");
  const roleSelect = document.getElementById("login-role");
  const captchaAns = document.getElementById("captcha-a");
  const captchaBox = document.getElementById("captcha-q");
  if (emailInput) emailInput.value = email;
  if (passInput) passInput.value = "demo123";
  if (roleSelect) roleSelect.value = role;
  if (captchaAns && captchaBox) captchaAns.value = captchaBox.textContent.trim();
}

// ── CAPTCHA ──────────────────────────────────────────────────
let captcha = "";
function newCaptcha(){
  captcha = String(Math.floor(1000 + Math.random() * 9000));
  const q = document.getElementById("captcha-q");
  if (q) q.textContent = captcha;
}

// ── LOGIN / LOGOUT ───────────────────────────────────────────
function login(){
  const e = document.getElementById("login-email").value.trim();
  const p = document.getElementById("login-pass").value;
  const r = document.getElementById("login-role").value;
  const c = (document.getElementById("captcha-a")||{value:""}).value.trim();
  const errEl = document.getElementById("login-err");
  if (c !== captcha) {
    errEl.textContent = "❌ Captcha incorrect. Please try again.";
    audit("Failed login (captcha mismatch) for " + e, "login"); newCaptcha(); return;
  }
  if (USERS[e] && p === PASS && USERS[e].role === r) {
    session = { email: e, ...USERS[e], loginAt: Date.now() };
    localStorage.setItem("nlas_session", JSON.stringify(session));
    audit("✅ Secure login: " + e + " as " + r, "login");
    boot(); startIdle();
  } else {
    errEl.textContent = "❌ Invalid credentials. Check email, password, and selected role.";
    audit("Failed login (invalid credentials) for " + e, "login"); newCaptcha();
  }
}
function logout(){
  audit("🔒 Logout: " + (session ? session.email : "unknown"), "login");
  localStorage.removeItem("nlas_session"); location.reload();
}

// ── IDLE LOCK (overlay, not alert) ───────────────────────────
let idleT = null;
let sessionLocked = false;
function startIdle(){
  const el = document.getElementById("sess-timer");
  clearInterval(idleT); let left = 15 * 60;
  idleT = setInterval(() => {
    left -= 1;
    if (el && session) el.textContent = "| locks in " + Math.floor(left/60) + ":" + String(left%60).padStart(2,"0");
    if (left <= 0) { clearInterval(idleT); lockSession(); }
  }, 1000);
  ["click","keydown","mousemove","touchstart"].forEach(ev =>
    document.addEventListener(ev, () => { if (!sessionLocked) left = 15 * 60; }, { passive: true })
  );
}
function lockSession(){
  sessionLocked = true;
  const ov = document.getElementById("idle-overlay");
  const msg = document.getElementById("idle-user-msg");
  if (ov) ov.classList.add("show");
  if (msg && session) msg.textContent = "Logged in as: " + session.email + " (" + session.role + ")";
  audit("🔒 Session auto-locked after 15 min idle", "login");
}
function unlockSession(){
  const pw = prompt("Enter your password to unlock:");
  if (pw === PASS) {
    sessionLocked = false;
    document.getElementById("idle-overlay").classList.remove("show");
    startIdle();
    audit("🔓 Session unlocked: " + session.email, "login");
  } else {
    alert("Incorrect password. Please login again.");
    logout();
  }
}

// ── BOOT ─────────────────────────────────────────────────────
function boot(){
  document.getElementById("login-screen").style.display = "none";
  document.getElementById("app").style.display = "block";
  document.getElementById("user-info").textContent = session.name + " | " + session.role + " | " + session.email;
  document.getElementById("role-hint").textContent =
    "Role: " + session.role + ". District verifies, State approves/compensates (PFMS), Agency submits, Field surveys, Admin oversees. All writes audited; PII masked.";
  const fd = document.getElementById("footer-date");
  if (fd) fd.textContent = new Date().toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"}) + " " + new Date().toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"});
  showPage("dashboard"); renderAll();
}

// ── NAVIGATION & BREADCRUMBS (india.gov.in standard) ─────────
const PAGE_TITLES = {
  dashboard: "National MIS",
  projects: "Acquisition Projects Registry",
  detail: "Statutory Milestones",
  map: "Bhuvan GIS Cadastral & Working Land",
  dept: "Department Interoperability (NDSAP)",
  docs: "DigiLocker Records",
  ai: "AI Delay & Risk Engine",
  alerts: "Statutory Alerts",
  analytics: "National Analytics",
  audit: "Cyber Audit Trail",
  archives: "Multi-Year Historical Records (2021–2027)"
};

function showPage(n){
  document.querySelectorAll(".page").forEach(p => p.style.display = "none");
  const pg = document.getElementById("page-" + n);
  if (pg) pg.style.display = "block";
  document.querySelectorAll("nav button").forEach(b => b.classList.remove("active"));
  const nb = document.getElementById("nav-" + n);
  if (nb) nb.classList.add("active");

  const bc = document.getElementById("breadcrumb-text");
  if (bc) bc.innerHTML = `<strong>Home</strong> &rsaquo; <span>${esc(PAGE_TITLES[n] || n)}</span>`;

  if (n === "map") setTimeout(initMap, 200);
  if (n === "analytics") renderAnalytics();
  if (n === "dept") renderDepts();
  if (n === "archives") renderArchives();
}

// ── PUBLIC VIEW FOR MULTI-YEAR ARCHIVES (Can be seen by all before login) ──
function showArchivesPublic(){
  if (!session) {
    document.getElementById("login-screen").style.display = "none";
    document.getElementById("app").style.display = "block";
    document.getElementById("user-info").textContent = "Public Open Data View (All Citizens)";
    const logoutBtn = document.querySelector(".btn-gov-logout");
    if (logoutBtn) logoutBtn.textContent = "Back to Login";
  }
  showPage("archives");
}

// ── RISK ENGINE ───────────────────────────────────────────────
function calcRisk(ai){
  const s1 = Math.min(30, ai.appr * 8), s2 = Math.min(25, ai.comp / 50 * 25),
        s3 = Math.min(20, ai.lit / 15 * 20), s4 = Math.min(15, ai.rr / 100 * 15),
        s5 = Math.min(10, ai.over * 0.5);
  const score = Math.round(s1 + s2 + s3 + s4 + s5);
  const level = score <= 30 ? "LOW" : score <= 60 ? "MEDIUM" : score <= 80 ? "HIGH" : "CRITICAL";
  return { score, level };
}
function getP(){ return DB.projects.find(p => p.id === currentId); }

function maskAmt(n){
  if (session && session.role === "Field Officer") return "₹•••••• (role-masked)";
  return "₹" + Number(n).toLocaleString("en-IN");
}

// ── RENDER ALL ────────────────────────────────────────────────
function renderAll(){
  renderDash();
  renderProjects();
  renderDetail();
  renderDocs();
  renderAlerts();
  renderAudit();
  renderDepts();
  renderArchives();
  runAI(true);
}

function renderDash(){
  document.getElementById("state-wise").innerHTML =
    [["Karnataka",32],["Tamil Nadu",28],["Maharashtra",24],["Uttar Pradesh",21],["Others",23]].map(([s,v]) =>
      `<div class="bar"><span style="width:${v/33*100}%">${esc(s)}: ${v} projects</span></div>`).join("");
  document.getElementById("dash-alerts").innerHTML = DB.alerts.slice(0,3).map(a =>
    `<li class="sev-${esc(a.sev)}">[${esc(a.sev).toUpperCase()}] ${esc(a.msg)}</li>`).join("");
  document.getElementById("nav-alert-count").textContent = "(" + DB.alerts.length + ")";
  document.getElementById("dept-status").innerHTML = DEPTS.map(d =>
    `<div class="dept-status-item"><span class="dot-g"></span><b>${esc(d.n)}</b> — API ready (simulated)</div>`).join("");
}

function renderProjects(){
  const q = (document.getElementById("proj-search").value || "").toLowerCase();
  const rows = DB.projects.filter(p => (p.id + p.name + p.state).toLowerCase().includes(q));
  document.getElementById("proj-rows").innerHTML = rows.map(p => {
    const r = calcRisk(p.ai); const prog = Math.round(p.acquired / p.totalLand * 100);
    return `<tr><td><b>${esc(p.id)}</b></td><td>${esc(p.name)}</td><td>${esc(p.state)}</td><td>${prog}%</td>
      <td><span class="badge ${r.score<=30?"low":r.score<=60?"med":r.score<=80?"high":"crit"}">${r.score}% ${r.level}</span></td>
      <td>${esc(p.milestones[p.stageIndex].name)}</td><td><button class="btn-standard" onclick="openProject('${esc(p.id)}')">Open</button></td></tr>`;
  }).join("");
}
function openProject(id){ currentId = id; save(); audit("Opened project " + id, "write"); renderDetail(); runAI(true); showPage("detail"); }
function openCreate(){ document.getElementById("create-box").style.display = "block"; }
function createProject(){
  if (session && session.role !== "Project Agency" && session.role !== "Central Admin") {
    alert("Only Project Agency (or Admin) can submit."); return;
  }
  const name  = esc(document.getElementById("np-name").value || "New Highway Project").slice(0,120);
  const state = esc(document.getElementById("np-state").value || "Karnataka").slice(0,60);
  const dist  = esc(document.getElementById("np-dist").value || "Kolar").slice(0,60);
  const land  = Math.min(100000, Math.max(1, +document.getElementById("np-land").value || 100));
  const id = "LA-2026-" + String(DB.projects.length + 1).padStart(3, "0");
  DB.projects.push({ id, name, state, district: dist, type: "Highway", totalLand: land, acquired: 0, workingLand: 0, occupiedLand: 0, families: 50, compEst: 10, budgetSpent: 0, stageIndex: 0, status: "On Track",
    milestones: STAGES.map(s => ({name:s,status:"Pending"})), ai: { appr: 1, comp: 5, lit: 0, rr: 10, over: 0 } });
  DB.alerts.unshift({ sev: "info", msg: "New project " + id + " submitted by " + (session?session.email:"Agency"), time: new Date().toLocaleString() });
  audit("Created project " + id + " by " + (session?session.email:"Agency"), "write");
  save(); renderProjects(); renderAlerts(); alert("Proposal " + id + " created & audit-logged.");
}

function renderDetail(){
  const p = getP();
  document.getElementById("d-title").textContent = p.id + " — " + p.name;
  document.getElementById("d-meta").innerHTML =
    `<b>${esc(p.state)}, ${esc(p.district)}</b> | ${esc(p.type)} | Required: <b>${p.totalLand} Ac</b> | Occupied: <b>${p.occupiedLand||p.acquired} Ac</b> | Working Land: <b>${p.workingLand||0} Ac</b> | Families: <b>${p.families}</b> | Budget: <b>${maskAmt(p.compEst * 1e7)}</b> (Disbursed: ₹${p.budgetSpent||0} Cr) | Status: <b>${esc(p.status)}</b>`;
  const prog = Math.round(p.acquired / p.totalLand * 100);
  document.getElementById("d-bar").style.width = prog + "%";
  document.getElementById("d-prog").textContent = prog + "% land acquired of total required (" + (p.workingLand||0) + " Ac under active construction)";
  document.getElementById("timeline").innerHTML = p.milestones.map(m => {
    const cls = m.status === "Completed" ? "done" : m.status === "In Progress" ? "inprog" : "warn";
    const icon = m.status === "Completed" ? "✓" : m.status === "In Progress" ? "⚡" : "○";
    return `<div class="tstep ${cls}"><b>${icon} ${esc(m.name)}</b><br/><small>${esc(m.status)}</small></div>`;
  }).join("");
  document.getElementById("upd-stage").innerHTML = p.milestones.map((m,i) => `<option value="${i}">${esc(m.name)}</option>`).join("");
  document.getElementById("upd-stage").value = p.stageIndex;
}

function updateMilestone(){
  const p = getP(); const idx = +document.getElementById("upd-stage").value;
  const st = document.getElementById("upd-status").value;
  if (st === "Completed" && p.milestones[idx].name === "Compensation" &&
    !(session && (session.role === "State Officer" || session.role === "Central Admin" || session.role === "District Officer"))) {
    alert("Compensation completion requires State / District / Central Admin role. Login as state@gov.in."); return;
  }
  p.milestones[idx].status = st;
  if (st === "Completed") {
    p.stageIndex = Math.min(STAGES.length - 1, idx + 1);
    if (p.milestones[idx].name === "Compensation") { p.ai.comp = 0; p.ai.over = 2; p.acquired = p.totalLand; p.occupiedLand = p.totalLand; p.workingLand = Math.round(p.totalLand * 0.75); p.status = "On Track"; }
    DB.alerts.unshift({ sev: "info", msg: `${p.id}: ${p.milestones[idx].name} → ${st} by ${session?session.role:"Admin"}`, time: new Date().toLocaleString() });
  }
  audit(`Updated ${p.id} — ${p.milestones[idx].name} → ${st} (by ${session?session.email:"Admin"})`, "write");
  save(); renderDetail(); renderAlerts(); runAI(true); alert("Updated & audit-logged.");
}

// ── GIS MAP (With Working Land Construction Zones & Filters) ──
let mapInit = false;
let currentMapFilter = "ALL";
let mapMarkers = [];

function initMap(){
  if (mapInit && window._map) {
    window._map.invalidateSize();
    renderMapMarkers();
    return;
  }
  const m = L.map("map").setView([13.136, 78.130], 13);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap | Bhuvan ISRO Compatible Cadastral Layer"
  }).addTo(m);
  window._map = m;
  mapInit = true;

  // Add highway alignment corridor showing construction chainage
  const corridorCoords = DB.parcels.map(p => [p.lat, p.lng]);
  L.polyline(corridorCoords, {
    color: "#0284c7",
    weight: 5,
    dashArray: "8, 8",
    opacity: 0.85
  }).addTo(m).bindTooltip("🛣️ NHAI Alignment Corridor (Chainage Km 12.4 to Km 23.5)", {sticky: true});

  renderMapMarkers();
}

function filterMap(cat){
  currentMapFilter = cat;
  document.querySelectorAll(".map-filter-btn").forEach(b => b.classList.remove("active"));
  const btn = document.getElementById("mf-" + cat.toLowerCase());
  if (btn) btn.classList.add("active");
  renderMapMarkers();
}

function renderMapMarkers(){
  if (!window._map) return;
  mapMarkers.forEach(mk => window._map.removeLayer(mk));
  mapMarkers = [];

  DB.parcels.forEach(pa => {
    const isWorking = (pa.working_acres || 0) > 0;
    const isOccupied = (pa.occupied_acres || 0) > 0;
    const isPending = pa.status === "Pending";

    if (currentMapFilter === "WORKING" && !isWorking) return;
    if (currentMapFilter === "OCCUPIED" && !isOccupied) return;
    if (currentMapFilter === "PENDING" && !isPending) return;

    let color = "#16a34a"; // green for occupied
    let radius = 10;
    let labelTag = "Occupied";

    if (isWorking) {
      color = "#ea580c"; // bright orange for active construction working land
      radius = 12;
      labelTag = "🚧 Active Construction";
    } else if (pa.status === "Under Process") {
      color = "#ca8a04"; // amber
      labelTag = "Under Process";
    } else if (pa.status === "Pending") {
      color = "#dc2626"; // red
      labelTag = "Pending Possession";
    }

    const mk = L.circleMarker([pa.lat, pa.lng], {
      radius: radius,
      color: "#ffffff",
      weight: 2,
      fillColor: color,
      fillOpacity: 0.85
    }).addTo(window._map);

    mk.bindPopup(`
      <div style="font-family:sans-serif;font-size:12px;line-height:1.5">
        <strong style="font-size:13px;color:#1a3d6d">${esc(pa.id)}</strong> (${esc(pa.ulpin||"ULPIN")})<br/>
        <b>${labelTag}</b><br/>
        Village: <b>${esc(pa.village)}</b> | ${esc(pa.survey)} | ${esc(pa.rtc)}<br/>
        Total Extent: <b>${pa.area} Ac</b><br/>
        Occupied: <b>${pa.occupied_acres||0} Ac</b> | Working Land: <b style="color:#c2410c">${pa.working_acres||0} Ac</b><br/>
        Civil Status: <b>${esc(pa.work_status||pa.status)}</b><br/>
        Contractor: <em>${esc(pa.contractor||"NHAI")}</em><br/>
        Compensation: <b>${esc(maskAmt(pa.comp))}</b>
      </div>
    `).on("click", () => {
      displayParcelDetails(pa);
      audit("GIS parcel clicked: " + pa.id + " (Working: " + (pa.working_acres||0) + " Ac)", "fetch");
    });

    mapMarkers.push(mk);
  });
}

function displayParcelDetails(pa){
  const el = document.getElementById("parcel-info");
  if (!el) return;
  const isWorking = (pa.working_acres || 0) > 0;
  const workPct = pa.work_progress_pct || (isWorking ? 65 : 0);

  el.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:10px">
      <div>
        <span class="badge ${isWorking?'med':pa.status==='Acquired'?'low':'high'}" style="font-size:12px;margin-bottom:6px">
          ${isWorking ? '🚧 Active Working Land (Under Construction)' : pa.status === 'Acquired' ? '🟢 Occupied & Possessed' : '🔴 Pending Acquisition'}
        </span>
        <h3 style="color:#1a3d6d;font-size:16px;margin:2px 0">${esc(pa.id)} &nbsp;•&nbsp; <span style="font-family:monospace">${esc(pa.ulpin||"ULPIN")}</span></h3>
        <p style="margin:2px 0;font-size:12px;color:#475569">
          Village: <b>${esc(pa.village)}</b> &nbsp;|&nbsp; Survey No: <b>${esc(pa.survey)}</b> &nbsp;|&nbsp; RTC: <b>${esc(pa.rtc)}</b> &nbsp;|&nbsp; Chainage: <b>${esc(pa.chainage||"Km 14.200")}</b>
        </p>
      </div>
      <div>
        <button class="btn-standard" onclick="deptFetch('revenue','${esc(pa.id)}')">📥 Pull Revenue Record</button>
        <button class="btn-standard" style="background:#0284c7;margin-left:6px" onclick="openRecordModal('${esc(pa.id)}')">🔍 Verified Record Card</button>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:12px 0;background:#ffffff;padding:10px;border:1px solid #cbd5e1;border-radius:4px">
      <div><small style="color:#64748b">Total Extent</small><div style="font-size:15px;font-weight:700">${pa.area} Acres</div></div>
      <div><small style="color:#64748b">Occupied Land</small><div style="font-size:15px;font-weight:700;color:#16a34a">${pa.occupied_acres||0} Acres</div></div>
      <div><small style="color:#64748b">Active Working Land</small><div style="font-size:15px;font-weight:700;color:#c2410c">${pa.working_acres||0} Acres</div></div>
      <div><small style="color:#64748b">Compensation</small><div style="font-size:15px;font-weight:700;color:#1a3d6d">${esc(maskAmt(pa.comp))}</div></div>
    </div>

    <div style="background:#f8fafc;border:1px solid #e2e8f0;padding:10px;border-radius:4px">
      <div style="display:flex;justify-content:space-between;font-size:12px;font-weight:700;margin-bottom:4px">
        <span>Civil Work Phase: ${esc(pa.work_status || "Not Started")}</span>
        <span>${workPct}% Completed</span>
      </div>
      <div class="riskbar" style="height:12px;background:#e2e8f0;margin:0 0 6px">
        <div style="width:${workPct}%;height:100%;background:${workPct>80?'#16a34a':workPct>40?'#ea580c':'#ca8a04'}"></div>
      </div>
      <div style="font-size:11.5px;color:#475569">
        Contractor: <b>${esc(pa.contractor||"NHAI Project Unit")}</b> &nbsp;|&nbsp;
        Equipment On Site: <em>${esc(pa.machinery||"Standard survey instruments")}</em> &nbsp;|&nbsp;
        Owner &amp; Aadhaar: <span class="mask-badge">**** (DPDP Protected)</span>
      </div>
    </div>
  `;
}

// ── UNIVERSAL SEARCH BY RECORD ID / RAND ID / ULPIN / SURVEY NO ──
function handleSearchInput(e){
  if (e.key === "Enter") executeSearch();
}

function executeSearch(){
  const input = document.getElementById("universal-search-input");
  if (!input) return;
  const term = input.value.trim();
  if (!term) { alert("Please enter a Record ID, ULPIN, Survey No, or Gazette ID."); return; }
  searchRecord(term);
}

function searchRecord(query){
  const q = query.toLowerCase().trim();
  const matchedParcels = DB.parcels.filter(p =>
    p.id.toLowerCase().includes(q) ||
    (p.ulpin && p.ulpin.toLowerCase().includes(q)) ||
    p.survey.toLowerCase().includes(q) ||
    p.rtc.toLowerCase().includes(q) ||
    p.village.toLowerCase().includes(q)
  );

  const matchedProjects = DB.projects.filter(p =>
    p.id.toLowerCase().includes(q) ||
    p.name.toLowerCase().includes(q) ||
    p.state.toLowerCase().includes(q) ||
    p.district.toLowerCase().includes(q)
  );

  openSearchModal(query, matchedParcels, matchedProjects);
  audit("Executed universal search for: " + query, "fetch");
}

function openSearchModal(query, parcels, projects){
  const modal = document.getElementById("search-modal");
  const content = document.getElementById("search-modal-content");
  if (!modal || !content) return;

  let html = `
    <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #e2e8f0;padding-bottom:10px;margin-bottom:14px">
      <div>
        <h3 style="color:#1a3d6d;font-size:18px">🔍 National Land Record Search Results</h3>
        <p style="font-size:12px;color:#64748b">Search query: <code>"${esc(query)}"</code> (${parcels.length} parcel(s), ${projects.length} project(s) found)</p>
      </div>
      <button class="btn-standard" style="background:#64748b" onclick="closeSearchModal()">✖ Close</button>
    </div>
  `;

  if (parcels.length === 0 && projects.length === 0) {
    html += `
      <div style="text-align:center;padding:30px;color:#64748b">
        <div style="font-size:36px;margin-bottom:8px">📭</div>
        <h4>No government record matched "${esc(query)}"</h4>
        <p style="font-size:12px;margin-top:4px">Try searching with sample test identifiers:</p>
        <div style="display:flex;gap:6px;justify-content:center;margin-top:10px;flex-wrap:wrap">
          <button class="role-pill-btn" onclick="searchRecord('KA-00121')">KA-00121</button>
          <button class="role-pill-btn" onclick="searchRecord('ULPIN-KA-29-0121')">ULPIN-KA-29-0121</button>
          <button class="role-pill-btn" onclick="searchRecord('Sy 112/3')">Sy 112/3</button>
          <button class="role-pill-btn" onclick="searchRecord('LA-2026-001')">LA-2026-001</button>
        </div>
      </div>
    `;
  } else {
    if (parcels.length > 0) {
      html += `<h4 style="color:#1a3d6d;margin:12px 0 6px">📍 Matched Land Parcels &amp; Working Land:</h4>`;
      parcels.forEach(pa => {
        const isWorking = (pa.working_acres || 0) > 0;
        html += `
          <div style="background:#f8fafc;border:1px solid #cbd5e1;border-left:5px solid ${isWorking?'#ea580c':'#16a34a'};padding:12px;margin-bottom:10px;border-radius:3px">
            <div style="display:flex;justify-content:space-between;align-items:flex-start">
              <div>
                <span class="badge ${isWorking?'med':'low'}">${isWorking?'🚧 Working Land Under Construction':'🟢 Occupied Land'}</span>
                <h4 style="font-size:15px;color:#1a3d6d;margin:4px 0">${esc(pa.id)} &nbsp;|&nbsp; <span style="font-family:monospace">${esc(pa.ulpin||"ULPIN")}</span></h4>
                <div style="font-size:12px;color:#475569">
                  Village: <b>${esc(pa.village)}</b> &nbsp;|&nbsp; Survey No: <b>${esc(pa.survey)}</b> &nbsp;|&nbsp; RTC: <b>${esc(pa.rtc)}</b> &nbsp;|&nbsp; Chainage: <b>${esc(pa.chainage||"Km 12-14")}</b>
                </div>
              </div>
              <div style="text-align:right">
                <button class="btn-standard" style="padding:4px 10px;font-size:12px" onclick="closeSearchModal();showPage('map');setTimeout(()=>{window._map.setView([${pa.lat},${pa.lng}], 15);displayParcelDetails(DB.parcels.find(x=>x.id==='${pa.id}'))},300)">📍 Locate on Map</button>
              </div>
            </div>
            <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:8px;background:#fff;padding:6px 10px;border:1px solid #e2e8f0">
              <div style="font-size:11.5px">Total: <b>${pa.area} Ac</b></div>
              <div style="font-size:11.5px;color:#16a34a">Occupied: <b>${pa.occupied_acres||0} Ac</b></div>
              <div style="font-size:11.5px;color:#c2410c">Working: <b>${pa.working_acres||0} Ac</b></div>
              <div style="font-size:11.5px">Comp: <b>${esc(maskAmt(pa.comp))}</b></div>
            </div>
            <div style="font-size:11.5px;color:#475569;margin-top:6px">
              Civil Status: <b>${esc(pa.work_status||pa.status)}</b> &nbsp;•&nbsp; Contractor: <em>${esc(pa.contractor||"NHAI")}</em>
            </div>
          </div>
        `;
      });
    }

    if (projects.length > 0) {
      html += `<h4 style="color:#1a3d6d;margin:16px 0 6px">📁 Matched Infrastructure Projects:</h4>`;
      projects.forEach(pr => {
        html += `
          <div style="background:#f8fafc;border:1px solid #cbd5e1;border-left:5px solid #1a3d6d;padding:12px;margin-bottom:8px">
            <div style="display:flex;justify-content:space-between">
              <div>
                <strong>${esc(pr.id)}</strong> &mdash; <span style="font-weight:700;color:#1a3d6d">${esc(pr.name)}</span> (${esc(pr.state)}, ${esc(pr.district)})
                <div style="font-size:12px;color:#475569;margin-top:2px">
                  Required: <b>${pr.totalLand} Ac</b> &nbsp;|&nbsp; Occupied: <b>${pr.occupiedLand||pr.acquired} Ac</b> &nbsp;|&nbsp; Working Land: <b>${pr.workingLand||0} Ac</b> &nbsp;|&nbsp; Budget: <b>₹${pr.compEst} Cr</b>
                </div>
              </div>
              <div>
                <button class="btn-standard" style="padding:4px 10px;font-size:12px" onclick="closeSearchModal();openProject('${pr.id}')">Open Project</button>
              </div>
            </div>
          </div>
        `;
      });
    }
  }

  content.innerHTML = html;
  modal.style.display = "flex";
}

function openRecordModal(parcelId){
  const pa = DB.parcels.find(p => p.id === parcelId);
  if (pa) searchRecord(pa.id);
}

function closeSearchModal(){
  const modal = document.getElementById("search-modal");
  if (modal) modal.style.display = "none";
}

// ── MULTI-YEAR HISTORICAL ARCHIVES (Previous Years 2021–2027) ──
// ── MULTI-YEAR HISTORICAL ARCHIVES (Previous Years 2021–2027) ──
function filterArchives(fy, btn){
  archivesCurrentFY = fy;
  document.querySelectorAll("#fy-filters .fy-filter-btn").forEach(b => b.classList.remove("active"));
  if (btn) btn.classList.add("active");
  renderArchives();
}

function searchArchives(query){
  archivesCurrentSearch = (query || "").toLowerCase().trim();
  renderArchives();
}

function renderArchives(){
  const projectTableBody = document.getElementById("archives-project-rows");
  const annualTableBody = document.getElementById("archives-rows");
  const chartEl = document.getElementById("archives-charts");
  const countBadge = document.getElementById("archives-corridor-count");

  // Filter corridor projects
  let filteredProjects = HISTORICAL_PROJECT_RECORDS;
  if (archivesCurrentFY !== "ALL") {
    filteredProjects = filteredProjects.filter(p => p.fy === archivesCurrentFY);
  }
  if (archivesCurrentSearch) {
    filteredProjects = filteredProjects.filter(p =>
      p.id.toLowerCase().includes(archivesCurrentSearch) ||
      p.name.toLowerCase().includes(archivesCurrentSearch) ||
      p.state.toLowerCase().includes(archivesCurrentSearch) ||
      p.district.toLowerCase().includes(archivesCurrentSearch) ||
      p.agency.toLowerCase().includes(archivesCurrentSearch)
    );
  }

  if (countBadge) {
    countBadge.textContent = `Showing ${filteredProjects.length} of ${HISTORICAL_PROJECT_RECORDS.length} Corridor Records`;
  }

  // Render Detailed Project Records Table
  if (projectTableBody) {
    if (filteredProjects.length === 0) {
      projectTableBody.innerHTML = `<tr><td colspan="12" style="text-align:center;padding:18px;color:#64748b">No historical records match your filter criteria.</td></tr>`;
    } else {
      projectTableBody.innerHTML = filteredProjects.map(p => {
        const isCurrent = p.fy === "2026-27";
        const statusClass = isCurrent ? "med" : "low";
        return `
          <tr>
            <td><code style="font-weight:700;color:#0369a1">${esc(p.id)}</code></td>
            <td><strong style="color:#1a3d6d">${esc(p.fy)}</strong></td>
            <td><strong>${esc(p.name)}</strong></td>
            <td>${esc(p.state)} <small style="color:#64748b">(${esc(p.district)})</small></td>
            <td><span class="badge" style="background:#e2e8f0;color:#1e293b">${esc(p.agency)}</span></td>
            <td><b style="color:#16a34a">${Number(p.occupied).toLocaleString("en-IN")}</b> Ac</td>
            <td><b style="color:#ea580c">${Number(p.working).toLocaleString("en-IN")}</b> Ac</td>
            <td>₹${Number(p.alloc).toLocaleString("en-IN")} Cr</td>
            <td><b>₹${Number(p.spent).toLocaleString("en-IN")} Cr</b></td>
            <td>${Number(p.families).toLocaleString("en-IN")} PAFs</td>
            <td><span class="badge ${statusClass}">${esc(p.status)}</span></td>
            <td>
              <button class="btn-standard" style="padding:3px 8px;font-size:11.5px;background:#1a3d6d;white-space:nowrap" onclick="openDemoDoc('${p.docId || "GAZETTE-2026-SO-4412"}')">
                👁️ View Document
              </button>
            </td>
          </tr>
        `;
      }).join("");
    }
  }

  // Render Annual Macro Summary Table
  if (annualTableBody) {
    const annualRecords = DB.historical_records || HISTORICAL_DATA;
    annualTableBody.innerHTML = annualRecords.map(r => `
      <tr>
        <td><strong style="color:#1a3d6d;font-size:13.5px">${esc(r.year)}</strong></td>
        <td><b style="color:#16a34a">${Number(r.occupied).toLocaleString("en-IN")}</b> Acres</td>
        <td><b style="color:#ea580c">${Number(r.working).toLocaleString("en-IN")}</b> Acres</td>
        <td>₹${Number(r.budget_alloc).toLocaleString("en-IN")} Cr</td>
        <td><b>₹${Number(r.budget_spent).toLocaleString("en-IN")} Cr</b> <small style="color:#16a34a">(${Math.round(r.budget_spent/r.budget_alloc*100)}%)</small></td>
        <td>${Number(r.families).toLocaleString("en-IN")}</td>
        <td>${r.milestones} Corridors</td>
        <td style="font-size:11.5px;color:#475569">${esc(r.summary)}</td>
        <td>
          <button class="btn-standard" style="padding:3px 8px;font-size:11.5px;background:#0d9488;white-space:nowrap" onclick="openDemoDoc('CAG-AUDIT-2021-2027')">
            📜 View Audit Gazette
          </button>
        </td>
      </tr>
    `).join("");
  }

  // Render Visual Charts
  if (chartEl) {
    const records = DB.historical_records || HISTORICAL_DATA;
    const maxOccupied = 70000;
    const maxBudget = 1400;

    chartEl.innerHTML = `
      <div class="grid2" style="margin-top:10px">
        <div class="gov-panel">
          <div class="gov-panel-header"><h3>📈 Cumulative Land Extent: Occupied vs Working Land (2021–2027)</h3></div>
          <div class="gov-panel-body">
            ${records.map(r => `
              <div style="margin-bottom:10px">
                <div style="display:flex;justify-content:space-between;font-size:11.5px;font-weight:700">
                  <span>FY ${esc(r.year)}</span>
                  <span>Occupied: <span style="color:#16a34a">${Number(r.occupied).toLocaleString("en-IN")} Ac</span> &nbsp;|&nbsp; Working: <span style="color:#ea580c">${Number(r.working).toLocaleString("en-IN")} Ac</span></span>
                </div>
                <div style="background:#e2e8f0;height:12px;border-radius:2px;overflow:hidden;display:flex;margin-top:3px">
                  <div style="width:${(r.occupied/maxOccupied)*100}%;background:#16a34a" title="Occupied Land"></div>
                </div>
                <div style="background:#e2e8f0;height:8px;border-radius:2px;overflow:hidden;display:flex;margin-top:2px">
                  <div style="width:${(r.working/maxOccupied)*100}%;background:#ea580c" title="Working Land (Construction)"></div>
                </div>
              </div>
            `).join("")}
            <div style="font-size:11px;color:#64748b;margin-top:6px">
              <span style="color:#16a34a;font-weight:bold">■ Occupied Land Extent</span> &nbsp;&bull;&nbsp;
              <span style="color:#ea580c;font-weight:bold">■ Active Working Construction Land</span>
            </div>
          </div>
        </div>

        <div class="gov-panel">
          <div class="gov-panel-header"><h3>💰 Budget: Sanctioned vs Spent Disbursed (₹ Crores)</h3></div>
          <div class="gov-panel-body">
            ${records.map(r => `
              <div style="margin-bottom:10px">
                <div style="display:flex;justify-content:space-between;font-size:11.5px;font-weight:700">
                  <span>FY ${esc(r.year)}</span>
                  <span>Allocated: ₹${r.budget_alloc} Cr &nbsp;|&nbsp; Spent: <b style="color:#1a3d6d">₹${r.budget_spent} Cr</b></span>
                </div>
                <div style="background:#e2e8f0;height:12px;border-radius:2px;overflow:hidden;display:flex;margin-top:3px">
                  <div style="width:${(r.budget_alloc/maxBudget)*100}%;background:#cbd5e1" title="Allocated Budget"></div>
                </div>
                <div style="background:#e2e8f0;height:8px;border-radius:2px;overflow:hidden;display:flex;margin-top:2px">
                  <div style="width:${(r.budget_spent/maxBudget)*100}%;background:#1a3d6d" title="Disbursed via PFMS"></div>
                </div>
              </div>
            `).join("")}
            <div style="font-size:11px;color:#64748b;margin-top:6px">
              <span style="color:#94a3b8;font-weight:bold">■ Sanctioned Budget Allocation</span> &nbsp;&bull;&nbsp;
              <span style="color:#1a3d6d;font-weight:bold">■ Actual Disbursal (PFMS DBT)</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}

function exportArchivesCSV(){
  let csv = "Record_Type,Record_ID,Financial_Year,Project_Name,State,District,Agency,Occupied_Land_Acres,Working_Land_Acres,Budget_Sanctioned_Cr,Budget_Spent_Cr,Families_Compensated,Status\\n";
  
  // Annual Macro
  const annual = DB.historical_records || HISTORICAL_DATA;
  annual.forEach(r => {
    csv += `"Annual_Macro","MACRO-${r.year}","${r.year}","National Cumulative Corridor Portfolio","All India","Central","DoLR",${r.occupied},${r.working},${r.budget_alloc},${r.budget_spent},${r.families},"${r.summary.replace(/"/g, '""')}"\\n`;
  });

  // Project Level
  HISTORICAL_PROJECT_RECORDS.forEach(p => {
    csv += `"Corridor_Record","${p.id}","${p.fy}","${p.name.replace(/"/g, '""')}","${p.state}","${p.district}","${p.agency}",${p.occupied},${p.working},${p.alloc},${p.spent},${p.families},"${p.status}"\\n`;
  });

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `NLAMS_MultiYear_Historical_Land_Records_2021_2027.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  audit("Exported Multi-Year Historical Land Acquisition Records CSV", "fetch");
}

// ── OFFICIAL STATUTORY DEMO DOCUMENT VIEWER MODAL ────────────────
function openDemoDoc(docId){
  const modal = document.getElementById("doc-viewer-modal");
  if (!modal) return;

  if (docId && DEMO_DOCUMENTS[docId]) {
    activeDocKey = docId;
  } else if (!DEMO_DOCUMENTS[activeDocKey]) {
    activeDocKey = "GAZETTE-2026-SO-4412";
  }

  renderDocTabs();
  renderDocContent(activeDocKey);
  modal.style.display = "flex";
  audit("Viewed Official Statutory Document: " + activeDocKey, "fetch");
}

function renderDocTabs(){
  const tabsContainer = document.getElementById("doc-switcher-tabs");
  if (!tabsContainer) return;

  const docKeys = Object.keys(DEMO_DOCUMENTS);
  tabsContainer.innerHTML = docKeys.map(k => {
    const doc = DEMO_DOCUMENTS[k];
    const isActive = k === activeDocKey ? "active" : "";
    return `
      <button class="doc-tab-btn ${isActive}" onclick="switchDocTab('${k}')">
        📜 ${esc(doc.shortName)}
      </button>
    `;
  }).join("");
}

function switchDocTab(k){
  if (!DEMO_DOCUMENTS[k]) return;
  activeDocKey = k;
  renderDocTabs();
  renderDocContent(k);
}

function renderDocContent(k){
  const contentContainer = document.getElementById("doc-paper-content");
  const titleEl = document.getElementById("doc-modal-title");
  if (!contentContainer) return;

  const doc = DEMO_DOCUMENTS[k] || DEMO_DOCUMENTS["GAZETTE-2026-SO-4412"];
  if (titleEl) {
    titleEl.textContent = `भारत सरकार | Government of India — ${doc.title}`;
  }
  contentContainer.innerHTML = doc.html;
}

function closeDemoDoc(){
  const modal = document.getElementById("doc-viewer-modal");
  if (modal) modal.style.display = "none";
}

function printDemoDoc(){
  const doc = DEMO_DOCUMENTS[activeDocKey];
  if (!doc) return;
  const printWin = window.open('', '_blank', 'width=880,height=800');
  if (!printWin) {
    window.print();
    return;
  }
  printWin.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${doc.title}</title>
        <style>
          body { font-family: 'Times New Roman', Georgia, serif; line-height: 1.6; padding: 40px; color: #000; }
          .gazette-header-block { text-align: center; border-bottom: 2px solid #000; padding-bottom: 14px; margin-bottom: 20px; }
          .gazette-title-hindi { font-size: 22px; font-weight: bold; }
          .gazette-title-eng { font-size: 18px; font-weight: bold; text-transform: uppercase; }
          .gazette-sub { font-size: 12px; font-weight: bold; }
          .gazette-meta-row { display: flex; justify-content: space-between; border-top: 1px solid #444; border-bottom: 1px solid #444; padding: 6px 0; margin: 12px 0 20px 0; font-size: 11.5px; }
          .gazette-order-title { text-align: center; font-weight: bold; font-size: 15px; margin-bottom: 16px; }
          .gazette-clause { margin-bottom: 14px; text-align: justify; text-indent: 28px; }
          .gazette-table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 12px; }
          .gazette-table th, .gazette-table td { border: 1px solid #333; padding: 6px 8px; text-align: left; }
          .gazette-table th { background: #f0f0f0; }
          .gazette-digital-sig { border: 2px dashed #333; padding: 12px; margin-top: 24px; }
          .gazette-watermark { display: none; }
        </style>
      </head>
      <body>
        ${doc.html}
        <script>
          window.onload = function(){ window.print(); };
        </script>
      </body>
    </html>
  `);
  printWin.document.close();
}

// ── DEPT INTEGRATION (NDSAP Open Govt API Gateway) ───────────
function renderDepts(){
  const g = document.getElementById("dept-grid"); if (!g) return;
  g.innerHTML = DEPTS.map(d =>
    `<div class="dept-card">
      <span class="dept-status-ping">🟢 Operational (24ms)</span>
      <h4>${esc(d.n)}</h4>
      <small>${esc(d.d)}</small>
      <div><span class="api-badge">${esc(d.api)}</span></div>
      <div><a class="dept-portal-link" href="${d.url}" target="_blank" rel="noopener">🔗 ${esc(d.url.replace("https://",""))} ↗</a></div>
      <button class="btn-standard" onclick="deptFetch('${d.k}','LA-2026-001')" style="width:100%;margin-top:6px">📥 Fetch (Simulated API)</button>
    </div>`).join("");
}

function deptFetch(k, ref){
  const d = DEPTS.find(x => x.k === k);
  const samples = {
    revenue: `<b>Revenue / Bhoomi:</b> Parcel ${esc(ref)} — Survey No. as per RTC; extent in acres; Owner: **** (masked); Mutation pending: 2 entries; Land dues: ₹0.<br/><small>Fetched via <code>${esc(d.api)}</code></small>`,
    reg:     `<b>IGRS Registration:</b> ${esc(ref)} — 3 registered sale deeds found; 0 dispute flags; encumbrance certificate clean. Parties masked per DPDP 2023.<br/><small>Fetched via <code>${esc(d.api)}</code></small>`,
    survey:  `<b>Bhuvan GIS / Survey:</b> ${esc(ref)} — 8/8 parcels geo-tagged; cadastral polygons attached; RMS error 0.4 m; WGS-84 CRS.<br/><small>Fetched via <code>${esc(d.api)}</code></small>`,
    nhai:    `<b>NHAI Project:</b> ${esc(ref)} — Chainage 12.4–18.9 km; 500 acre land plan; Est. LA cost ₹42 Cr; Alignment approved by MoRTH.<br/><small>Fetched via <code>${esc(d.api)}</code></small>`,
    pfms:    `<b>PFMS / DBT:</b> ${esc(ref)} — 106/148 families paid (₹35.3 Cr disbursed via DBT); 42 pending verification; Account numbers masked per policy.<br/><small>Fetched via <code>${esc(d.api)}</code></small>`,
    state:   `<b>State Portal / data.gov.in:</b> ${esc(ref)} — SIA report & notification PDFs available; State land bank: 28 Ac reserve; last synced 09-Sep-2026.<br/><small>Fetched via <code>${esc(d.api)}</code></small>`
  };
  document.getElementById("dept-out").innerHTML =
    `${samples[k] || "OK"}<br/><small style="color:#888">Source: <a href="${d.url}" target="_blank" rel="noopener">${esc(d.url)}</a> &nbsp;(simulated; production: NIC e-Sign + consent + audit)</small>`;
  audit("Dept API fetch: " + d.n + " for " + ref, "fetch");
  showPage("dept");
}

// ── DOCUMENTS ─────────────────────────────────────────────────
function renderDocs(){
  document.getElementById("doc-rows").innerHTML = DB.docs.map((d,i) =>
    `<tr><td>📄 ${esc(d.name)}</td><td>${esc(d.ver)}</td><td>${esc(d.by)}</td><td>${esc(d.date)}</td>
     <td>${esc(d.status)}</td><td><button class="btn-standard" style="padding:3px 8px;font-size:12px" onclick="viewDoc(${i})">View</button></td></tr>`).join("");
}
function viewDoc(i){
  const docObj = DB.docs[i];
  if (!docObj) return;
  const name = docObj.name.toLowerCase();
  let targetKey = "GAZETTE-2026-SO-4412";
  if (name.includes("social impact") || name.includes("sia")) {
    targetKey = "SIA-REPORT-2026-04";
  } else if (name.includes("valuation") || name.includes("compensation")) {
    targetKey = "AWARD-VAL-2026-892";
  } else if (name.includes("proposal") || name.includes("survey") || name.includes("cadastral")) {
    targetKey = "BHUVAN-JVS-2026-091";
  } else if (name.includes("r&r") || name.includes("resettlement")) {
    targetKey = "RR-SCHEME-2026-04";
  }
  openDemoDoc(targetKey);
}
function uploadDoc(){
  const raw = (document.getElementById("nd-name").value || "New_Document.pdf").trim();
  const n = raw.replace(/[^a-zA-Z0-9.\-_ ]/g, "").trim();
  if (!/\.pdf$/i.test(n)) { alert("Only PDF files are allowed (government norm)."); return; }
  if (n.length > 80 || n.length < 4) { alert("Filename must be 4–80 characters."); return; }
  DB.docs.push({ name: esc(n), ver: "1.0", by: session ? session.role : "Citizen", date: new Date().toISOString().slice(0,10), status: "Draft" });
  audit("Uploaded doc: " + n + " by " + (session ? session.email : "user"), "write"); save(); renderDocs();
}

// ── AI RISK ───────────────────────────────────────────────────
function runAI(silent){
  const p = getP();
  if (!silent) {
    p.ai = {
      appr: Math.max(0, Math.min(5,  +document.getElementById("ai-appr").value)),
      comp: Math.max(0, Math.min(100,+document.getElementById("ai-comp").value)),
      lit:  Math.max(0, Math.min(20, +document.getElementById("ai-lit").value)),
      rr:   Math.max(0, Math.min(100,+document.getElementById("ai-rr").value)),
      over: Math.max(0, Math.min(60, +document.getElementById("ai-over").value))
    };
    save();
  } else {
    document.getElementById("ai-appr").value = p.ai.appr;
    document.getElementById("ai-comp").value = p.ai.comp;
    document.getElementById("ai-lit").value  = p.ai.lit;
    document.getElementById("ai-rr").value   = p.ai.rr;
    document.getElementById("ai-over").value = p.ai.over;
  }
  const r = calcRisk(p.ai);
  document.getElementById("risk-fill").style.width = r.score + "%";
  document.getElementById("risk-fill").style.background = r.score <= 30 ? "#16a34a" : r.score <= 60 ? "#ea580c" : "#dc2626";
  document.getElementById("risk-label").innerHTML = `<b>${r.score}% — ${r.level} RISK</b> (${esc(p.id)})`;
  document.getElementById("risk-reason").textContent =
    `Factors: ${p.ai.comp} compensation pending, ${p.ai.lit} litigation cases, ${p.ai.over} days overdue, R&R ${p.ai.rr}% pending.`;
  const act = r.score > 80 ? "Prioritize PFMS verification + legal review (RFCTLARR §§26–30)." :
              r.score > 60 ? "Escalate to State Officer this week." :
              r.score > 30 ? "Monitor weekly." : "On track.";
  document.getElementById("risk-action").textContent = "Recommended Action: " + act;
  if (r.score > 80 && !DB.alerts.some(a => a.msg.includes(p.id) && a.sev === "critical")) {
    DB.alerts.unshift({ sev: "critical", msg: `${p.id} CRITICAL risk ${r.score}%. ${act}`, time: new Date().toLocaleString() });
    save(); renderAlerts();
  }
  renderProjects();
}
function demoFix(){
  document.getElementById("ai-appr").value = 2;
  document.getElementById("ai-comp").value = 0;
  document.getElementById("ai-lit").value  = 8;
  document.getElementById("ai-rr").value   = 50;
  document.getElementById("ai-over").value = 7;
  runAI(false);
  alert("Demo: Compensation marked done. Risk drops from 81% → 38%. Also mark 'Compensation → Completed' in Project Details.");
}

// ── ALERTS ────────────────────────────────────────────────────
function renderAlerts(){
  document.getElementById("alert-list").innerHTML = DB.alerts.map((a,i) =>
    `<li class="sev-${esc(a.sev)}">[${esc(a.sev).toUpperCase()}] ${esc(a.msg)} <small>${esc(a.time)}</small>
     <button class="btn-standard" onclick="resolveAlert(${i})" style="margin-left:8px;background:#c0392b;padding:3px 8px;font-size:11px">Resolve</button></li>`).join("");
  renderDash();
}
function resolveAlert(i){ audit("Resolved alert: " + DB.alerts[i].msg, "write"); DB.alerts.splice(i,1); save(); renderAlerts(); }

// ── ANALYTICS ─────────────────────────────────────────────────
function renderAnalytics(){
  const stages = {};
  DB.projects.forEach(p => { const s = p.milestones[p.stageIndex].name; stages[s] = (stages[s]||0)+1; });
  document.getElementById("ch-stage").innerHTML = Object.entries(stages).map(([k,v]) =>
    `<div class="bar"><span style="width:${v/DB.projects.length*100}%">${esc(k)}: ${v} project${v>1?"s":""}</span></div>`).join("");
  const risks = DB.projects.map(p => calcRisk(p.ai).level);
  const cnt = l => risks.filter(x => x === l).length;
  document.getElementById("ch-risk").innerHTML = ["LOW","MEDIUM","HIGH","CRITICAL"].map(l =>
    `<div class="bar"><span style="background:${l==="LOW"?"#16a34a":l==="MEDIUM"?"#ea580c":l==="HIGH"?"#dc2626":"#7f1d1d"}">${l}: ${cnt(l)} project${cnt(l)!==1?"s":""}</span></div>`).join("");
}

// ── AUDIT TRAIL ───────────────────────────────────────────────
function renderAudit(){
  const el = document.getElementById("audit-rows"); if (!el) return;
  el.innerHTML = DB.audit.map(a => {
    const bg = a.type==="login" ? "background:#e8f4fd" : a.type==="fetch" ? "background:#f0fff4" : "";
    return `<tr style="${bg}"><td>${esc(a.t)}</td><td>${esc(a.u)}</td><td>${esc(a.a)}</td></tr>`;
  }).join("");
}

// ── INIT ──────────────────────────────────────────────────────
newCaptcha();

try {
  let vc = +localStorage.getItem("nlas_vc") || 148293;
  vc += 1;
  localStorage.setItem("nlas_vc", vc);
  const vcEl = document.getElementById("visitor-count");
  if (vcEl) vcEl.textContent = vc.toLocaleString("en-IN");
} catch(e){}

if (session) {
  boot();
  startIdle();
}
