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
  { k: "revenue", n: "Revenue Dept — Land Records (Bhoomi)", url: "https://dolr.nic.in", d: "RTC / Khata / mutation. Owner PII masked.", api: "GET /land-records/{parcel}" },
  { k: "reg", n: "Registration (IGRS) — Sale deeds", url: "https://rural.nic.in", d: "Deed history, encumbrance. Masked.", api: "GET /registration/{parcel}" },
  { k: "survey", n: "Survey / Bhuvan GIS (NRSC)", url: "https://bhuvan.nrsc.gov.in", d: "Cadastral geometry, geo-tag.", api: "GET /cadastral/{parcel}" },
  { k: "nhai", n: "Project Agency — NHAI", url: "https://nhai.gov.in", d: "Alignment, chainage, land plan.", api: "GET /projects/{id}" },
  { k: "pfms", n: "PFMS / DBT — Compensation", url: "https://pfms.nic.in", d: "Payment files, beneficiary-masked.", api: "GET /payments/{project}" },
  { k: "state", n: "State portal / Data portal", url: "https://data.gov.in", d: "Notified datasets, SIA reports.", api: "GET /datasets/{project}" }
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
    { sev: "critical", msg: "LA-2026-001 has 42 pending compensation cases, deadline approaching", time: "2026-09-09" },
    { sev: "warning", msg: "LA-2026-002 delayed by 32 days at Compensation", time: "2026-09-08" },
    { sev: "info", msg: "New project LA-2026-004 submitted by Agency", time: "2026-09-07" }
  ],
  audit: [{ t: "2026-09-09 10:00", u: "System", a: "Seeded demo data (simulated, no real PII)" }]
};
function save(){ localStorage.setItem("nlas_db", JSON.stringify(DB)); localStorage.setItem("nlas_current", currentId); }
function esc(s){ return String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
function audit(a){ DB.audit.unshift({ t: new Date().toLocaleString(), u: session?esc(session.email):"System", a: esc(a) }); save(); renderAudit(); }

// CAPTCHA + AUTH (demo) + idle lock
let captcha = "";
function newCaptcha(){ captcha = String(Math.floor(1000 + Math.random()*9000)); const q = document.getElementById("captcha-q"); if (q) q.textContent = captcha; }
function login(){
  const e = document.getElementById("login-email").value.trim(), p = document.getElementById("login-pass").value, r = document.getElementById("login-role").value;
  const c = (document.getElementById("captcha-a")||{value:""}).value.trim();
  if (c !== captcha) { document.getElementById("login-err").textContent = "Captcha incorrect. Try again."; audit("Failed login (captcha) for " + e); newCaptcha(); return; }
  if (USERS[e] && p === PASS && USERS[e].role === r) {
    session = { email: e, ...USERS[e], loginAt: Date.now() }; localStorage.setItem("nlas_session", JSON.stringify(session));
    audit("Secure login: " + e + " as " + r); boot(); startIdle();
  } else { document.getElementById("login-err").textContent = "Invalid demo login."; newCaptcha(); }
}
function logout(){ audit("Logout"); localStorage.removeItem("nlas_session"); location.reload(); }
let idleT = null;
function startIdle(){
  const el = document.getElementById("sess-timer");
  clearInterval(idleT); let left = 15*60;
  idleT = setInterval(() => { left -= 1;
    if (el && session) el.textContent = "| session locks in " + Math.floor(left/60) + ":" + String(left%60).padStart(2,"0");
    if (left <= 0) { clearInterval(idleT); alert("Session auto-locked after 15 min idle (demo security)."); logout(); }
  }, 1000);
  ["click","keydown"].forEach(ev => document.addEventListener(ev, () => { left = 15*60; }, { passive: true }));
}
function boot(){
  document.getElementById("login-screen").style.display = "none";
  document.getElementById("app").style.display = "block";
  document.getElementById("user-info").textContent = session.name + " | " + session.role + " | " + session.email;
  document.getElementById("role-hint").textContent = "Role: " + session.role + ". District verifies, State approves/compensates (PFMS), Agency submits, Field surveys, Admin oversees. All writes audited; PII masked.";
  showPage("dashboard"); renderAll();
}
function showPage(n){
  document.querySelectorAll(".page").forEach(p => p.style.display = "none");
  document.getElementById("page-" + n).style.display = "block";
  if (n === "map") setTimeout(initMap, 200);
  if (n === "analytics") renderAnalytics();
  if (n === "dept") renderDepts();
}

// RISK
function calcRisk(ai){
  const s1 = Math.min(30, ai.appr * 8), s2 = Math.min(25, ai.comp / 50 * 25),
        s3 = Math.min(20, ai.lit / 15 * 20), s4 = Math.min(15, ai.rr / 100 * 15),
        s5 = Math.min(10, ai.over * 0.5);
  const score = Math.round(s1 + s2 + s3 + s4 + s5);
  const level = score <= 30 ? "LOW" : score <= 60 ? "MEDIUM" : score <= 80 ? "HIGH" : "CRITICAL";
  return { score, level };
}
function getP(){ return DB.projects.find(p => p.id === currentId); }
function maskAmt(n){ // Field role sees masked amounts
  if (session && session.role === "Field Officer") return "₹•••••• (masked)";
  return "₹" + Number(n).toLocaleString("en-IN");
}

function renderAll(){ renderDash(); renderProjects(); renderDetail(); renderDocs(); renderAlerts(); renderAudit(); renderDepts(); runAI(true); }
function renderDash(){
  document.getElementById("state-wise").innerHTML = ["Karnataka 32","Tamil Nadu 28","Maharashtra 24","UP 21","Others 23"].map(s=>`<div class="bar"><span>${esc(s)}</span></div>`).join("");
  document.getElementById("dash-alerts").innerHTML = DB.alerts.slice(0,3).map(a=>`<li>[${esc(a.sev)}] ${esc(a.msg)}</li>`).join("");
  document.getElementById("nav-alert-count").textContent = "(" + DB.alerts.length + ")";
  document.getElementById("dept-status").innerHTML = DEPTS.map(d=>`<div class="bar"><span>🟢 ${esc(d.n)} — API ready (simulated)</span></div>`).join("");
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
function openProject(id){ currentId = id; save(); audit("Opened " + id); renderDetail(); runAI(true); showPage("detail"); }
function openCreate(){ document.getElementById("create-box").style.display = "block"; }
function createProject(){
  if (session.role !== "Project Agency" && session.role !== "Central Admin") { alert("Only Project Agency (or Admin) can submit."); return; }
  const name = esc(document.getElementById("np-name").value || "New Highway Project").slice(0,120);
  const state = esc(document.getElementById("np-state").value || "Karnataka").slice(0,60);
  const dist = esc(document.getElementById("np-dist").value || "Kolar").slice(0,60);
  const land = Math.min(100000, Math.max(1, +document.getElementById("np-land").value || 100));
  const id = "LA-2026-" + String(DB.projects.length + 1).padStart(3, "0");
  DB.projects.push({ id, name, state, district: dist, type: "Highway", totalLand: land, acquired: 0, families: 50, compEst: 10, stageIndex: 0, status: "On Track", milestones: STAGES.map(s=>({name:s,status:"Pending"})), ai: { appr: 1, comp: 5, lit: 0, rr: 10, over: 0 } });
  DB.alerts.unshift({ sev: "info", msg: "New project " + id + " submitted by " + session.email, time: new Date().toLocaleString() });
  audit("Created project " + id); save(); renderProjects(); renderAlerts(); alert("Proposal " + id + " created & audit-logged.");
}
function renderDetail(){
  const p = getP();
  document.getElementById("d-title").textContent = p.id + " — " + p.name;
  document.getElementById("d-meta").textContent = `${p.state}, ${p.district} | ${p.type} | Required ${p.totalLand} Acre, Acquired ${p.acquired} Acre | Families ${p.families} | Est Comp ₹${p.compEst} Cr | Status ${p.status} (RFCTLARR Act)`;
  const prog = Math.round(p.acquired / p.totalLand * 100);
  document.getElementById("d-bar").style.width = prog + "%";
  document.getElementById("d-prog").textContent = prog + "% land acquired";
  document.getElementById("timeline").innerHTML = p.milestones.map(m => {
    const cls = m.status === "Completed" ? "done" : "warn";
    const icon = m.status === "Completed" ? "✓" : m.status === "In Progress" ? "⚠" : "○";
    return `<div class="tstep ${cls}"><b>${icon} ${esc(m.name)}</b><br/><small>${esc(m.status)}</small></div>`;
  }).join("");
  document.getElementById("upd-stage").innerHTML = p.milestones.map((m,i)=>`<option value="${i}">${esc(m.name)}</option>`).join("");
  document.getElementById("upd-stage").value = p.stageIndex;
}
function updateMilestone(){
  const p = getP(); const idx = +document.getElementById("upd-stage").value;
  const st = document.getElementById("upd-status").value;
  if (st === "Completed" && p.milestones[idx].name === "Compensation" && !(session.role === "State Officer" || session.role === "Central Admin" || session.role === "District Officer")) {
    alert("Compensation completion needs State/District/Admin. Login as state@gov.in."); return;
  }
  p.milestones[idx].status = st;
  if (st === "Completed") {
    p.stageIndex = Math.min(STAGES.length - 1, idx + 1);
    if (p.milestones[idx].name === "Compensation") { p.ai.comp = 0; p.ai.over = 2; p.acquired = p.totalLand; p.status = "On Track"; }
    DB.alerts.unshift({ sev: "info", msg: `${p.id}: ${p.milestones[idx].name} → ${st} by ${session.role}`, time: new Date().toLocaleString() });
  }
  audit(`Updated ${p.id} ${p.milestones[idx].name} -> ${st}`); save();
  renderDetail(); renderAlerts(); runAI(true); alert("Updated & audit-logged.");
}

// MAP with masked PII + revenue refs
let mapInit = false;
function initMap(){
  if (mapInit && window._map) { window._map.invalidateSize(); return; }
  const m = L.map("map").setView([13.135, 78.129], 13);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap | Demo; production: Bhuvan/SOI" }).addTo(m);
  window._map = m; mapInit = true;
  DB.parcels.forEach(pa => {
    const color = pa.status === "Acquired" ? "green" : pa.status === "Under Process" ? "orange" : "red";
    L.circleMarker([pa.lat, pa.lng], { radius: 10, color, fillColor: color, fillOpacity: 0.7 }).addTo(m)
      .bindPopup(`<b>${esc(pa.id)}</b><br/>Village: ${esc(pa.village)}<br/>${esc(pa.survey)} | ${esc(pa.rtc)}<br/>Area: ${pa.area} acre<br/>Owner: **** (masked)<br/>Comp: ${esc(maskAmt(pa.comp))}`)
      .on("click", () => { document.getElementById("parcel-info").innerHTML = `<b>Parcel ${esc(pa.id)}</b> | ${esc(pa.village)} | ${esc(pa.survey)} | ${esc(pa.rtc)} | ${pa.area} acre | Owner ****, Aadhaar XXXX-****, A/c **masked | Status ${esc(pa.status)} | Comp ${esc(maskAmt(pa.comp))} <button onclick="deptFetch('revenue','${esc(pa.id)}')">Pull Revenue record →</button>`; });
  });
}

// DEPTS
function renderDepts(){
  const g = document.getElementById("dept-grid"); if (!g) return;
  g.innerHTML = DEPTS.map(d => `<div class="dept"><h4>${esc(d.n)}</h4><small>${esc(d.d)}</small><br/><code>${esc(d.api)}</code><br/><a href="${d.url}" target="_blank" rel="noopener">Open official portal ↗</a><br/><button onclick="deptFetch('${d.k}','LA-2026-001')">Fetch (simulated API)</button></div>`).join("");
}
function deptFetch(k, ref){
  const d = DEPTS.find(x => x.k === k);
  const samples = {
    revenue: `RTC ${ref}: Sy No, extent, owner ****, mutation pending 2, dues ₹0. Fetched via ${d.api}.`,
    reg: `Deeds for ${ref}: 3 registered, 0 dispute flags (masked parties).`,
    survey: `Cadastral polygons for ${ref}: 8/8 geo-tagged, RMS 0.4m.`,
    nhai: `NHAI plan ${ref}: chainage 12.4–18.9 km, 500 acre, LA estimate ₹42 Cr.`,
    pfms: `PFMS ${ref}: 106/148 paid, 42 pending, DBT-masked. No account numbers shown.`,
    state: `Dataset ${ref}: SIA + notification PDFs mirrored from state portal.`
  };
  document.getElementById("dept-out").innerHTML = `<b>${esc(d.n)}</b> → ${esc(samples[k]||"OK")} <br/><small>Source: <a href="${d.url}" target="_blank" rel="noopener">${esc(d.url)}</a> (simulated; production: NIC e-Sign + consent + audit)</small>`;
  audit(`Dept fetch ${d.n} for ${ref}`); showPage("dept");
}

// DOCS with validation
function renderDocs(){
  document.getElementById("doc-rows").innerHTML = DB.docs.map((d,i)=>`<tr><td>📄 ${esc(d.name)}</td><td>${esc(d.ver)}</td><td>${esc(d.by)}</td><td>${esc(d.date)}</td><td>${esc(d.status)}</td><td><button onclick="viewDoc(${i})">View</button></td></tr>`).join("");
}
function viewDoc(i){ alert("Preview (simulated, access-logged): " + DB.docs[i].name); audit("Viewed doc " + DB.docs[i].name); }
function uploadDoc(){
  const n = (document.getElementById("nd-name").value || "New_Document.pdf").trim();
  if (!/\.pdf$/i.test(n)) { alert("Only PDF allowed in this demo (gov norm)."); return; }
  if (n.length > 80) { alert("Filename too long."); return; }
  DB.docs.push({ name: esc(n), ver: "1.0", by: session.role, date: new Date().toISOString().slice(0,10), status: "Draft" });
  audit("Uploaded doc " + n); save(); renderDocs();
}

// AI
function runAI(silent){
  const p = getP();
  if (!silent) { p.ai = { appr: Math.max(0,Math.min(5,+document.getElementById("ai-appr").value)), comp: Math.max(0,Math.min(100,+document.getElementById("ai-comp").value)), lit: Math.max(0,Math.min(20,+document.getElementById("ai-lit").value)), rr: Math.max(0,Math.min(100,+document.getElementById("ai-rr").value)), over: Math.max(0,Math.min(60,+document.getElementById("ai-over").value)) }; save(); }
  else { document.getElementById("ai-appr").value = p.ai.appr; document.getElementById("ai-comp").value = p.ai.comp; document.getElementById("ai-lit").value = p.ai.lit; document.getElementById("ai-rr").value = p.ai.rr; document.getElementById("ai-over").value = p.ai.over; }
  const r = calcRisk(p.ai);
  document.getElementById("risk-fill").style.width = r.score + "%";
  document.getElementById("risk-fill").style.background = r.score <= 30 ? "green" : r.score <= 60 ? "orange" : "red";
  document.getElementById("risk-label").innerHTML = `<b>${r.score}% — ${r.level} RISK</b> (${esc(p.id)})`;
  document.getElementById("risk-reason").textContent = `Reason: ${p.ai.comp} compensation pending, ${p.ai.lit} litigation, ${p.ai.over} days overdue, R&R ${p.ai.rr}% pending.`;
  const act = r.score > 80 ? "Prioritize PFMS verification + legal review (RFCTLARR §§26–30)." : r.score > 60 ? "Escalate to State Officer this week." : r.score > 30 ? "Monitor weekly." : "On track.";
  document.getElementById("risk-action").textContent = "Recommended Action: " + act;
  if (r.score > 80 && !DB.alerts.some(a => a.msg.includes(p.id) && a.sev === "critical")) {
    DB.alerts.unshift({ sev: "critical", msg: `${p.id} CRITICAL risk ${r.score}%. ${act}`, time: new Date().toLocaleString() });
    save(); renderAlerts();
  }
  renderProjects();
}
function demoFix(){
  document.getElementById("ai-appr").value = 2; document.getElementById("ai-comp").value = 0;
  document.getElementById("ai-lit").value = 8; document.getElementById("ai-rr").value = 50; document.getElementById("ai-over").value = 7;
  runAI(false); alert("Demo: 81% → 38%. Also mark Compensation Completed in Details.");
}
function renderAlerts(){
  document.getElementById("alert-list").innerHTML = DB.alerts.map((a,i)=>`<li>[${esc(a.sev).toUpperCase()}] ${esc(a.msg)} <small>${esc(a.time)}</small> <button onclick="resolveAlert(${i})">Resolve</button></li>`).join("");
  renderDash();
}
function resolveAlert(i){ audit("Resolved alert: " + DB.alerts[i].msg); DB.alerts.splice(i,1); save(); renderAlerts(); }
function renderAnalytics(){
  const stages = {}; DB.projects.forEach(p => { const s = p.milestones[p.stageIndex].name; stages[s] = (stages[s] || 0) + 1; });
  document.getElementById("ch-stage").innerHTML = Object.entries(stages).map(([k,v])=>`<div class="bar"><span style="width:${v/DB.projects.length*100}%">${esc(k)}: ${v}</span></div>`).join("");
  const risks = DB.projects.map(p => calcRisk(p.ai).level);
  const cnt = l => risks.filter(x => x === l).length;
  document.getElementById("ch-risk").innerHTML = ["LOW","MEDIUM","HIGH","CRITICAL"].map(l=>`<div class="bar"><span>${l}: ${cnt(l)}</span></div>`).join("");
}
function renderAudit(){ const el = document.getElementById("audit-rows"); if (el) el.innerHTML = DB.audit.map(a=>`<tr><td>${esc(a.t)}</td><td>${esc(a.u)}</td><td>${esc(a.a)}</td></tr>`).join(""); }

newCaptcha();
if (session) { boot(); startIdle(); }
