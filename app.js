// SIH 26016 — Govt prototype: secure demo, dept integration, masked PII
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
  { k: "revenue", n: "Revenue Dept — Land Records (Bhoomi)", url: "https://dolr.nic.in", d: "RTC / Khata / mutation records. Owner name & Aadhaar masked per policy.", api: "GET /land-records/{parcel}" },
  { k: "reg", n: "Registration (IGRS) — Sale Deeds", url: "https://rural.nic.in", d: "Deed history, encumbrance certificate. Masked parties.", api: "GET /registration/{parcel}" },
  { k: "survey", n: "Survey / Bhuvan GIS (NRSC)", url: "https://bhuvan.nrsc.gov.in", d: "Cadastral polygon geometry, geo-tagging, SOI toposheet overlay.", api: "GET /cadastral/{parcel}" },
  { k: "nhai", n: "Project Agency — NHAI", url: "https://nhai.gov.in", d: "Alignment corridor, chainage, land requirement plan.", api: "GET /projects/{id}" },
  { k: "pfms", n: "PFMS / DBT — Compensation Disbursal", url: "https://pfms.nic.in", d: "Payment status, beneficiary count. Account numbers masked.", api: "GET /payments/{project}" },
  { k: "state", n: "State Portal / data.gov.in", url: "https://data.gov.in", d: "Notified open datasets, SIA reports, state land bank.", api: "GET /datasets/{project}" }
];

let DB = JSON.parse(localStorage.getItem("nlas_db") || "null") || {
  projects: [
    { id: "LA-2026-001", name: "Bengaluru–Chennai Highway Expansion", state: "Karnataka", district: "Kolar", type: "Highway", totalLand: 500, acquired: 320, families: 148, compEst: 42, stageIndex: 6, status: "Delayed",
      milestones: [{ name: "Proposal", status: "Completed" }, { name: "Verification", status: "Completed" },{ name: "Notification", status: "Completed" }, { name: "Social Impact Assessment", status: "Completed" },{ name: "Land Valuation", status: "Completed" }, { name: "Award Declaration", status: "In Progress" },{ name: "Compensation", status: "Pending" }, { name: "Possession", status: "Pending" },{ name: "R&R", status: "Pending" }, { name: "Completed", status: "Pending" }],
      ai: { appr: 3, comp: 42, lit: 12, rr: 70, over: 18 } },
    { id: "LA-2026-002", name: "NH-48 Spur, Jaipur", state: "Rajasthan", district: "Jaipur", type: "Highway", totalLand: 620, acquired: 410, families: 200, compEst: 65, stageIndex: 6, status: "Critical", milestones: STAGES.map((s,i)=>({name:s,status:i<6?"Completed":"Pending"})), ai: { appr: 4, comp: 60, lit: 8, rr: 80, over: 32 } },
    { id: "LA-2026-003", name: "NH-65 Corridor, Hyderabad", state: "Telangana", district: "Rangareddy", type: "Highway", totalLand: 450, acquired: 380, families: 120, compEst: 38, stageIndex: 8, status: "On Track", milestones: STAGES.map((s,i)=>({name:s,status:i<8?"Completed":i===8?"In Progress":"Pending"})), ai: { appr: 1, comp: 5, lit: 1, rr: 20, over: 2 } },
    { id: "LA-2026-004", name: "NH-31 Approach, Patna", state: "Bihar", district: "Patna", type: "Bridge", totalLand: 300, acquired: 150, families: 95, compEst: 22, stageIndex: 5, status: "Delayed", milestones: STAGES.map((s,i)=>({name:s,status:i<5?"Completed":i===5?"In Progress":"Pending"})), ai: { appr: 2, comp: 25, lit: 5, rr: 50, over: 12 } }
  ],
  parcels: [
    { id: "KA-00121", village: "Malur", lat: 13.140, lng: 78.125, area: 2.4, status: "Acquired", comp: 840000, rtc: "RTC-44/21", survey: "Sy 112/3" },
    { id: "KA-00122", village: "Malur", lat: 13.142, lng: 78.130, area: 3.1, status: "Acquired", comp: 1050000, rtc: "RTC-44/22", survey: "Sy 114/1" },
    { id: "KA-00123", village: "Malur", lat: 13.135, lng: 78.132, area: 2.4, status: "Pending", comp: 840000, rtc: "RTC-44/23", survey: "Sy 115/2" },
    { id: "KA-00124", village: "Tekal", lat: 13.130, lng: 78.128, area: 1.8, status: "Under Process", comp: 620000, rtc: "RTC-45/04", survey: "Sy 88/5" },
    { id: "KA-00125", village: "Tekal", lat: 13.128, lng: 78.135, area: 4.0, status: "Pending", comp: 1400000, rtc: "RTC-45/09", survey: "Sy 91/2" },
    { id: "KA-00126", village: "Huralagere", lat: 13.145, lng: 78.138, area: 2.0, status: "Acquired", comp: 700000, rtc: "RTC-46/11", survey: "Sy 60/4" },
    { id: "KA-00127", village: "Huralagere", lat: 13.125, lng: 78.122, area: 2.9, status: "Under Process", comp: 980000, rtc: "RTC-46/14", survey: "Sy 63/1" },
    { id: "KA-00128", village: "Kasaba", lat: 13.138, lng: 78.120, area: 3.5, status: "Pending", comp: 1220000, rtc: "RTC-47/02", survey: "Sy 20/7" }
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
  audit: [{ t: "2026-09-09 10:00", u: "System", a: "Seeded demo data (simulated, no real PII)", type: "write" }]
};

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
  map: "Bhuvan GIS Cadastral",
  dept: "Department Interoperability",
  docs: "DigiLocker Records",
  ai: "AI Delay & Risk Engine",
  alerts: "Statutory Alerts",
  analytics: "National Analytics",
  audit: "Cyber Audit Trail"
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
function renderAll(){ renderDash(); renderProjects(); renderDetail(); renderDocs(); renderAlerts(); renderAudit(); renderDepts(); runAI(true); }

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
      <td>${esc(p.milestones[p.stageIndex].name)}</td><td><button onclick="openProject('${esc(p.id)}')">Open</button></td></tr>`;
  }).join("");
}
function openProject(id){ currentId = id; save(); audit("Opened project " + id, "write"); renderDetail(); runAI(true); showPage("detail"); }
function openCreate(){ document.getElementById("create-box").style.display = "block"; }
function createProject(){
  if (session.role !== "Project Agency" && session.role !== "Central Admin") {
    alert("Only Project Agency (or Admin) can submit."); return;
  }
  const name  = esc(document.getElementById("np-name").value || "New Highway Project").slice(0,120);
  const state = esc(document.getElementById("np-state").value || "Karnataka").slice(0,60);
  const dist  = esc(document.getElementById("np-dist").value || "Kolar").slice(0,60);
  const land  = Math.min(100000, Math.max(1, +document.getElementById("np-land").value || 100));
  const id = "LA-2026-" + String(DB.projects.length + 1).padStart(3, "0");
  DB.projects.push({ id, name, state, district: dist, type: "Highway", totalLand: land, acquired: 0, families: 50, compEst: 10, stageIndex: 0, status: "On Track",
    milestones: STAGES.map(s => ({name:s,status:"Pending"})), ai: { appr: 1, comp: 5, lit: 0, rr: 10, over: 0 } });
  DB.alerts.unshift({ sev: "info", msg: "New project " + id + " submitted by " + session.email, time: new Date().toLocaleString() });
  audit("Created project " + id + " by " + session.email, "write");
  save(); renderProjects(); renderAlerts(); alert("Proposal " + id + " created & audit-logged.");
}

function renderDetail(){
  const p = getP();
  document.getElementById("d-title").textContent = p.id + " — " + p.name;
  document.getElementById("d-meta").innerHTML =
    `<b>${esc(p.state)}, ${esc(p.district)}</b> | ${esc(p.type)} | Required <b>${p.totalLand} Acre</b>, Acquired <b>${p.acquired} Acre</b> | Families <b>${p.families}</b> | Est. Compensation <b>${maskAmt(p.compEst * 1e7)}</b> | Status <b>${esc(p.status)}</b> (RFCTLARR Act, 2013)`;
  const prog = Math.round(p.acquired / p.totalLand * 100);
  document.getElementById("d-bar").style.width = prog + "%";
  document.getElementById("d-prog").textContent = prog + "% land acquired of total required";
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
    !(session.role === "State Officer" || session.role === "Central Admin" || session.role === "District Officer")) {
    alert("Compensation completion requires State / District / Central Admin role. Login as state@gov.in."); return;
  }
  p.milestones[idx].status = st;
  if (st === "Completed") {
    p.stageIndex = Math.min(STAGES.length - 1, idx + 1);
    if (p.milestones[idx].name === "Compensation") { p.ai.comp = 0; p.ai.over = 2; p.acquired = p.totalLand; p.status = "On Track"; }
    DB.alerts.unshift({ sev: "info", msg: `${p.id}: ${p.milestones[idx].name} → ${st} by ${session.role}`, time: new Date().toLocaleString() });
  }
  audit(`Updated ${p.id} — ${p.milestones[idx].name} → ${st} (by ${session.email})`, "write");
  save(); renderDetail(); renderAlerts(); runAI(true); alert("Updated & audit-logged.");
}

// ── GIS MAP ───────────────────────────────────────────────────
let mapInit = false;
function initMap(){
  if (mapInit && window._map) { window._map.invalidateSize(); return; }
  const m = L.map("map").setView([13.135, 78.129], 13);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap | Demo; production: Bhuvan/SOI" }).addTo(m);
  window._map = m; mapInit = true;
  DB.parcels.forEach(pa => {
    const color = pa.status === "Acquired" ? "green" : pa.status === "Under Process" ? "orange" : "red";
    L.circleMarker([pa.lat, pa.lng], { radius: 10, color, fillColor: color, fillOpacity: 0.75 }).addTo(m)
      .bindPopup(`<b>${esc(pa.id)}</b><br/>Village: ${esc(pa.village)}<br/>${esc(pa.survey)} | ${esc(pa.rtc)}<br/>Area: ${pa.area} acre<br/>Owner: **** (masked)<br/>Aadhaar: XXXX-XXXX-**** (masked)<br/>Comp: ${esc(maskAmt(pa.comp))}`)
      .on("click", () => {
        document.getElementById("parcel-info").innerHTML =
          `<b>Parcel ${esc(pa.id)}</b> &nbsp;|&nbsp; ${esc(pa.village)} &nbsp;|&nbsp; <b>${esc(pa.survey)}</b> &nbsp;|&nbsp; ${esc(pa.rtc)}<br/>
           Area: <b>${pa.area} acre</b> &nbsp;|&nbsp; Owner: <b>**** (masked)</b> &nbsp;|&nbsp; Aadhaar: <b>XXXX-XXXX-****</b> &nbsp;|&nbsp; A/c: <b>**masked**</b><br/>
           Status: <b>${esc(pa.status)}</b> &nbsp;|&nbsp; PFMS Compensation: <b>${esc(maskAmt(pa.comp))}</b><br/>
           <button onclick="deptFetch('revenue','${esc(pa.id)}')" style="margin-top:8px">📥 Pull Revenue Record →</button>`;
        audit("GIS parcel clicked: " + pa.id, "fetch");
      });
  });
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
     <td>${esc(d.status)}</td><td><button onclick="viewDoc(${i})">View</button></td></tr>`).join("");
}
function viewDoc(i){ alert("Preview (simulated, access-logged): " + DB.docs[i].name); audit("Viewed doc: " + DB.docs[i].name, "write"); }
function uploadDoc(){
  const raw = (document.getElementById("nd-name").value || "New_Document.pdf").trim();
  const n = raw.replace(/[^a-zA-Z0-9.\-_ ]/g, "").trim();
  if (!/\.pdf$/i.test(n)) { alert("Only PDF files are allowed (government norm)."); return; }
  if (n.length > 80 || n.length < 4) { alert("Filename must be 4–80 characters."); return; }
  DB.docs.push({ name: esc(n), ver: "1.0", by: session.role, date: new Date().toISOString().slice(0,10), status: "Draft" });
  audit("Uploaded doc: " + n + " by " + session.email, "write"); save(); renderDocs();
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
  document.getElementById("risk-fill").style.background = r.score <= 30 ? "#27ae60" : r.score <= 60 ? "#e67e22" : "#c0392b";
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
     <button onclick="resolveAlert(${i})" style="margin-left:8px;background:#c0392b">Resolve</button></li>`).join("");
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
    `<div class="bar"><span style="background:${l==="LOW"?"#27ae60":l==="MEDIUM"?"#e67e22":l==="HIGH"?"#c0392b":"#8b0000"}">${l}: ${cnt(l)} project${cnt(l)!==1?"s":""}</span></div>`).join("");
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

// National Portal Visitor Counter (india.gov.in standard)
try {
  let vc = +localStorage.getItem("nlas_vc") || 148293;
  vc += 1;
  localStorage.setItem("nlas_vc", vc);
  const vcEl = document.getElementById("visitor-count");
  if (vcEl) vcEl.textContent = vc.toLocaleString("en-IN");
} catch(e){}

if (session) { boot(); startIdle(); }
