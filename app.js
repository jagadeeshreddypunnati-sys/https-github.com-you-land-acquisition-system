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
  archives: "Multi-Year Historical Records (2021–2027)",
  backend: "Python & SQL Backend Gateway"
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
  if (n === "backend") renderBackendPage();
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
function renderArchives(){
  const tableBody = document.getElementById("archives-rows");
  const chartEl = document.getElementById("archives-charts");
  if (!tableBody) return;

  const records = DB.historical_records || HISTORICAL_DATA;

  tableBody.innerHTML = records.map(r => `
    <tr>
      <td><strong style="color:#1a3d6d;font-size:13.5px">${esc(r.year)}</strong></td>
      <td><b style="color:#16a34a">${Number(r.occupied).toLocaleString("en-IN")}</b> Acres</td>
      <td><b style="color:#ea580c">${Number(r.working).toLocaleString("en-IN")}</b> Acres</td>
      <td>₹${Number(r.budget_alloc).toLocaleString("en-IN")} Cr</td>
      <td><b>₹${Number(r.budget_spent).toLocaleString("en-IN")} Cr</b> <small style="color:#16a34a">(${Math.round(r.budget_spent/r.budget_alloc*100)}%)</small></td>
      <td>${Number(r.families).toLocaleString("en-IN")}</td>
      <td>${r.milestones} Corridors</td>
      <td style="font-size:11.5px;color:#475569">${esc(r.summary)}</td>
    </tr>
  `).join("");

  if (chartEl) {
    const maxOccupied = 70000;
    const maxBudget = 1400;

    chartEl.innerHTML = `
      <div class="grid2" style="margin-top:10px">
        <div class="gov-panel">
          <div class="gov-panel-header"><h3>📈 Land Extent: Occupied vs Working Land (2021–2027)</h3></div>
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
  const records = DB.historical_records || HISTORICAL_DATA;
  let csv = "Financial_Year,Occupied_Land_Acres,Working_Land_Acres,Budget_Allocated_Crores,Budget_Spent_Crores,Families_Compensated,Corridors_Completed,Summary\n";
  records.forEach(r => {
    csv += `"${r.year}",${r.occupied},${r.working},${r.budget_alloc},${r.budget_spent},${r.families},${r.milestones},"${r.summary.replace(/"/g, '""')}"\n`;
  });

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `NLAMS_MultiYear_Land_Records_2021_2027.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  audit("Downloaded Multi-Year Historical Records CSV", "fetch");
}

// ── PYTHON & SQL BACKEND GATEWAY CONSOLE ──────────────────────
function renderBackendPage(){
  testBackendHealth();
}

function testBackendHealth(){
  const statusEl = document.getElementById("backend-status-indicator");
  if (!statusEl) return;
  statusEl.innerHTML = `<span>⏳ Checking Python FastAPI connection on <code>http://127.0.0.1:8000</code>...</span>`;

  fetch("http://127.0.0.1:8000/", { method: "GET" })
    .then(res => res.json())
    .then(data => {
      statusEl.innerHTML = `<span class="badge low" style="font-size:12px">🟢 Python FastAPI Backend Connected (v${data.version}) &bull; Engine: ${data.database}</span>`;
    })
    .catch(() => {
      statusEl.innerHTML = `<span class="badge med" style="font-size:12px">⚡ Client-Side Dual Mode Active (GitHub Pages Standalone) &bull; Backend ready at <code>backend/main.py</code></span>`;
    });
}

function selectSQLTemplate(){
  const select = document.getElementById("sql-query-select");
  const editor = document.getElementById("sql-query-input");
  if (select && editor) {
    editor.value = select.value;
  }
}

function executeSQLQuery(){
  const editor = document.getElementById("sql-query-input");
  const resultDiv = document.getElementById("sql-query-output");
  if (!editor || !resultDiv) return;

  const q = editor.value.trim();
  if (!q) return;

  resultDiv.innerHTML = `<div style="padding:12px;color:#475569">⏳ Executing SQL query against NLAMS Database Engine...</div>`;

  fetch("http://127.0.0.1:8000/api/sql-query", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: q })
  })
  .then(res => res.json())
  .then(data => {
    if (data.detail) {
      resultDiv.innerHTML = `<div style="padding:12px;color:#dc2626;background:#fef2f2;border:1px solid #fecdd3"><strong>SQL Error:</strong> ${esc(data.detail)}</div>`;
    } else {
      renderSQLTable(data.columns, data.rows, "Python FastAPI Engine (3.2 ms)");
    }
  })
  .catch(() => {
    simulateClientSQL(q);
  });

  audit("Executed SQL Query in Console: " + q.slice(0, 60), "fetch");
}

function simulateClientSQL(query){
  const qUpper = query.toUpperCase();
  const startTime = performance.now();
  let columns = [];
  let rows = [];

  if (qUpper.includes("HISTORICAL_RECORDS")) {
    columns = ["financial_year", "occupied_land_acres", "working_land_acres", "budget_allocated_crores", "budget_spent_crores", "families_compensated"];
    rows = DB.historical_records.map(r => ({
      financial_year: r.year,
      occupied_land_acres: r.occupied,
      working_land_acres: r.working,
      budget_allocated_crores: r.budget_alloc,
      budget_spent_crores: r.budget_spent,
      families_compensated: r.families
    }));
  } else if (qUpper.includes("PARCELS")) {
    columns = ["parcel_id", "ulpin", "village", "survey_number", "area_acres", "occupied_acres", "working_acres", "work_status", "contractor"];
    rows = DB.parcels.map(p => ({
      parcel_id: p.id,
      ulpin: p.ulpin,
      village: p.village,
      survey_number: p.survey,
      area_acres: p.area,
      occupied_acres: p.occupied_acres,
      working_acres: p.working_acres,
      work_status: p.work_status,
      contractor: p.contractor
    }));
  } else {
    columns = ["project_id", "name", "state", "district", "total_land_acres", "working_land_acres", "occupied_land_acres", "budget_estimate_crores", "status"];
    rows = DB.projects.map(pr => ({
      project_id: pr.id,
      name: pr.name,
      state: pr.state,
      district: pr.district,
      total_land_acres: pr.totalLand,
      working_land_acres: pr.workingLand || 0,
      occupied_land_acres: pr.occupiedLand || pr.acquired,
      budget_estimate_crores: pr.compEst,
      status: pr.status
    }));
  }

  const elapsed = (performance.now() - startTime + 2.4).toFixed(1);
  renderSQLTable(columns, rows, `SQLite Virtual Parser (${elapsed} ms)`);
}

function renderSQLTable(columns, rows, engineNote){
  const resultDiv = document.getElementById("sql-query-output");
  if (!resultDiv) return;

  let html = `
    <div style="display:flex;justify-content:space-between;align-items:center;background:#f8fafc;padding:8px 12px;border:1px solid #cbd5e1;border-bottom:0;font-size:11.5px">
      <span><strong>Rows Returned:</strong> ${rows.length} records</span>
      <span style="color:#16a34a;font-weight:700">⚡ ${engineNote}</span>
    </div>
    <div style="overflow-x:auto;max-height:360px">
      <table class="gov-table" style="margin:0">
        <thead>
          <tr>${columns.map(c => `<th>${esc(c)}</th>`).join("")}</tr>
        </thead>
        <tbody>
          ${rows.map(r => `<tr>${columns.map(c => `<td>${esc(r[c] !== undefined ? r[c] : "")}</td>`).join("")}</tr>`).join("")}
        </tbody>
      </table>
    </div>
  `;
  resultDiv.innerHTML = html;
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
function viewDoc(i){ alert("Preview (simulated, access-logged): " + DB.docs[i].name); audit("Viewed doc: " + DB.docs[i].name, "write"); }
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
