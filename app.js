// SIH 26016 Prototype - plain JS, localStorage, simulated backend
const USERS = {
  "admin@gov.in": { role: "Central Admin", name: "Central Officer" },
  "state@gov.in": { role: "State Officer", name: "State Officer KA" },
  "district@gov.in": { role: "District Officer", name: "DC Kolar" },
  "agency@gov.in": { role: "Project Agency", name: "NHAI Agency" },
  "field@gov.in": { role: "Field Officer", name: "Field Surveyor" }
};
const PASS = "demo123";
let session = JSON.parse(localStorage.getItem("nlas_session") || "null");
let currentId = localStorage.getItem("nlas_current") || "LA-2026-001";

const STAGES = ["Proposal","Verification","Notification","Social Impact Assessment","Land Valuation","Award Declaration","Compensation","Possession","R&R","Completed"];

let DB = JSON.parse(localStorage.getItem("nlas_db") || "null") || {
  projects: [
    { id: "LA-2026-001", name: "Bengaluru–Chennai Highway Expansion", state: "Karnataka", district: "Kolar", type: "Highway", totalLand: 500, acquired: 320, families: 148, compEst: 42, stageIndex: 6, status: "Delayed",
      milestones: [
        { name: "Proposal", status: "Completed" }, { name: "Verification", status: "Completed" },
        { name: "Notification", status: "Completed" }, { name: "Social Impact Assessment", status: "Completed" },
        { name: "Land Valuation", status: "Completed" }, { name: "Award Declaration", status: "In Progress" },
        { name: "Compensation", status: "Pending" }, { name: "Possession", status: "Pending" },
        { name: "R&R", status: "Pending" }, { name: "Completed", status: "Pending" }
      ],
      ai: { appr: 3, comp: 42, lit: 12, rr: 70, over: 18 } },
    { id: "LA-2026-002", name: "NH-48 Spur, Jaipur", state: "Rajasthan", district: "Jaipur", type: "Highway", totalLand: 620, acquired: 410, families: 200, compEst: 65, stageIndex: 6, status: "Critical", milestones: STAGES.map((s,i)=>({name:s,status:i<6?"Completed":i===6?"Pending":"Pending"})), ai: { appr: 4, comp: 60, lit: 8, rr: 80, over: 32 } },
    { id: "LA-2026-003", name: "NH-65 Corridor, Hyderabad", state: "Telangana", district: "Rangareddy", type: "Highway", totalLand: 450, acquired: 380, families: 120, compEst: 38, stageIndex: 8, status: "On Track", milestones: STAGES.map((s,i)=>({name:s,status:i<8?"Completed":i===8?"In Progress":"Pending"})), ai: { appr: 1, comp: 5, lit: 1, rr: 20, over: 2 } },
    { id: "LA-2026-004", name: "NH-31 Approach, Patna", state: "Bihar", district: "Patna", type: "Bridge", totalLand: 300, acquired: 150, families: 95, compEst: 22, stageIndex: 5, status: "Delayed", milestones: STAGES.map((s,i)=>({name:s,status:i<5?"Completed":i===5?"In Progress":"Pending"})), ai: { appr: 2, comp: 25, lit: 5, rr: 50, over: 12 } }
  ],
  parcels: [
    { id: "KA-00121", village: "Malur", lat: 13.140, lng: 78.125, area: 2.4, status: "Acquired", comp: 840000 },
    { id: "KA-00122", village: "Malur", lat: 13.142, lng: 78.130, area: 3.1, status: "Acquired", comp: 1050000 },
    { id: "KA-00123", village: "Malur", lat: 13.135, lng: 78.132, area: 2.4, status: "Pending", comp: 840000 },
    { id: "KA-00124", village: "Tekal", lat: 13.130, lng: 78.128, area: 1.8, status: "Under Process", comp: 620000 },
    { id: "KA-00125", village: "Tekal", lat: 13.128, lng: 78.135, area: 4.0, status: "Pending", comp: 1400000 },
    { id: "KA-00126", village: "Huralagere", lat: 13.145, lng: 78.138, area: 2.0, status: "Acquired", comp: 700000 },
    { id: "KA-00127", village: "Huralagere", lat: 13.125, lng: 78.122, area: 2.9, status: "Under Process", comp: 980000 },
    { id: "KA-00128", village: "Kasaba", lat: 13.138, lng: 78.120, area: 3.5, status: "Pending", comp: 1220000 }
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
  audit: [{ t: "2026-09-09 10:00", u: "System", a: "Seeded demo data" }]
};
function save(){ localStorage.setItem("nlas_db", JSON.stringify(DB)); localStorage.setItem("nlas_current", currentId); }
function audit(a){ DB.audit.unshift({ t: new Date().toLocaleString(), u: session?session.email:"System", a }); save(); renderAudit(); }

// AUTH
function login(){
  const e = document.getElementById("login-email").value.trim(), p = document.getElementById("login-pass").value, r = document.getElementById("login-role").value;
  if (USERS[e] && p === PASS && USERS[e].role === r) {
    session = { email: e, ...USERS[e] }; localStorage.setItem("nlas_session", JSON.stringify(session));
    boot();
  } else document.getElementById("login-err").textContent = "Invalid demo login. Use e.g. admin@gov.in / demo123 / Central Admin";
}
function logout(){ localStorage.removeItem("nlas_session"); location.reload(); }
function boot(){
  document.getElementById("login-screen").style.display = "none";
  document.getElementById("app").style.display = "block";
  document.getElementById("user-info").textContent = session.name + " | " + session.role + " | " + session.email;
  document.getElementById("role-hint").textContent = "Logged in as " + session.role + ". District verifies docs, State approves/compensates, Agency submits, Field updates survey, Admin oversees.";
  showPage("dashboard"); renderAll();
}
function showPage(n){
  document.querySelectorAll(".page").forEach(p => p.style.display = "none");
  document.getElementById("page-" + n).style.display = "block";
  if (n === "map") setTimeout(initMap, 200);
  if (n === "analytics") renderAnalytics();
}

// RISK ENGINE: 30% approvals + 25% comp + 20% litigation + 15% R&R + 10% timeline
function calcRisk(ai){
  const s1 = Math.min(30, ai.appr * 8), s2 = Math.min(25, ai.comp / 50 * 25),
        s3 = Math.min(20, ai.lit / 15 * 20), s4 = Math.min(15, ai.rr / 100 * 15),
        s5 = Math.min(10, ai.over * 0.5);
  const score = Math.round(s1 + s2 + s3 + s4 + s5);
  const level = score <= 30 ? "LOW" : score <= 60 ? "MEDIUM" : score <= 80 ? "HIGH" : "CRITICAL";
  return { score, level };
}
function getP(){ return DB.projects.find(p => p.id === currentId); }

function renderAll(){ renderDash(); renderProjects(); renderDetail(); renderDocs(); renderAlerts(); renderAudit(); runAI(true); }
function renderDash(){
  document.getElementById("state-wise").innerHTML = ["Karnataka 32","Tamil Nadu 28","Maharashtra 24","UP 21","Others 23"].map(s=>`<div class="bar"><span>${s}</span></div>`).join("");
  document.getElementById("dash-alerts").innerHTML = DB.alerts.slice(0,3).map(a=>`<li>[${a.sev}] ${a.msg}</li>`).join("");
  document.getElementById("nav-alert-count").textContent = "(" + DB.alerts.length + ")";
}
function renderProjects(){
  const q = (document.getElementById("proj-search").value || "").toLowerCase();
  const rows = DB.projects.filter(p => (p.id + p.name + p.state).toLowerCase().includes(q));
  document.getElementById("proj-rows").innerHTML = rows.map(p => {
    const r = calcRisk(p.ai); const prog = Math.round(p.acquired / p.totalLand * 100);
    return `<tr><td><b>${p.id}</b></td><td>${p.name}</td><td>${p.state}</td><td>${prog}%</td>
      <td><span class="badge ${r.score<=30?"low":r.score<=60?"med":r.score<=80?"high":"crit"}">${r.score}% ${r.level}</span></td>
      <td>${p.milestones[p.stageIndex].name}</td>
      <td><button onclick="openProject('${p.id}')">Open</button></td></tr>`;
  }).join("");
}
function openProject(id){ currentId = id; save(); renderDetail(); runAI(true); showPage("detail"); }
function openCreate(){ document.getElementById("create-box").style.display = "block"; }
function createProject(){
  if (session.role !== "Project Agency" && session.role !== "Central Admin") { alert("Only Project Agency (or Admin demo) can submit proposals."); return; }
  const name = document.getElementById("np-name").value || "New Highway Project";
  const state = document.getElementById("np-state").value || "Karnataka";
  const dist = document.getElementById("np-dist").value || "Kolar";
  const land = +document.getElementById("np-land").value || 100;
  const id = "LA-2026-" + String(DB.projects.length + 1).padStart(3, "0");
  DB.projects.push({ id, name, state, district: dist, type: "Highway", totalLand: land, acquired: 0, families: 50, compEst: 10, stageIndex: 0, status: "On Track", milestones: STAGES.map(s=>({name:s,status:"Pending"})), ai: { appr: 1, comp: 5, lit: 0, rr: 10, over: 0 } });
  DB.alerts.unshift({ sev: "info", msg: "New project " + id + " submitted by " + session.email, time: new Date().toLocaleString() });
  audit("Created project " + id); save(); renderProjects(); renderAlerts();
  alert("Proposal " + id + " created!");
}

function renderDetail(){
  const p = getP();
  document.getElementById("d-title").textContent = p.id + " — " + p.name;
  document.getElementById("d-meta").textContent = `${p.state}, ${p.district} | ${p.type} | Required ${p.totalLand} Acre, Acquired ${p.acquired} Acre | Families ${p.families} | Est Comp ₹${p.compEst} Cr | Status ${p.status}`;
  const prog = Math.round(p.acquired / p.totalLand * 100);
  document.getElementById("d-bar").style.width = prog + "%";
  document.getElementById("d-prog").textContent = prog + "% land acquired";
  document.getElementById("timeline").innerHTML = p.milestones.map(m => {
    const cls = m.status === "Completed" ? "done" : m.status === "In Progress" || m.status === "Pending" && p.milestones.indexOf(m) === p.stageIndex ? "warn" : "todo";
    const icon = m.status === "Completed" ? "✓" : m.status === "In Progress" ? "⚠" : "○";
    return `<div class="tstep ${cls}"><b>${icon} ${m.name}</b><br/><small>${m.status}</small></div>`;
  }).join("");
  document.getElementById("upd-stage").innerHTML = p.milestones.map((m,i)=>`<option value="${i}">${m.name}</option>`).join("");
  document.getElementById("upd-stage").value = p.stageIndex;
}
function updateMilestone(){
  const p = getP(); const idx = +document.getElementById("upd-stage").value;
  const st = document.getElementById("upd-status").value;
  // simple role gate
  if (st === "Completed" && p.milestones[idx].name === "Compensation" && !(session.role === "State Officer" || session.role === "Central Admin" || session.role === "District Officer")) {
    alert("Compensation completion requires State/District/Admin role in demo. Login as state@gov.in."); return;
  }
  p.milestones[idx].status = st;
  if (st === "Completed") {
    p.stageIndex = Math.min(STAGES.length - 1, idx + 1);
    if (p.milestones[idx].name === "Compensation") { p.ai.comp = 0; p.ai.over = 2; p.acquired = p.totalLand; p.status = "On Track"; }
    DB.alerts.unshift({ sev: "info", msg: `${p.id}: ${p.milestones[idx].name} marked ${st} by ${session.role}`, time: new Date().toLocaleString() });
  }
  audit(`Updated ${p.id} ${p.milestones[idx].name} -> ${st}`); save();
  renderDetail(); renderAlerts(); runAI(true);
  alert("Milestone updated. Dashboard + AI risk refreshed — check AI Risk page.");
}

// MAP
let mapInit = false;
function initMap(){
  if (mapInit && window._map) { window._map.invalidateSize(); return; }
  const m = L.map("map").setView([13.135, 78.129], 13);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap" }).addTo(m);
  window._map = m; mapInit = true;
  DB.parcels.forEach(pa => {
    const color = pa.status === "Acquired" ? "green" : pa.status === "Under Process" ? "orange" : "red";
    L.circleMarker([pa.lat, pa.lng], { radius: 10, color, fillColor: color, fillOpacity: 0.7 }).addTo(m)
      .bindPopup(`<b>${pa.id}</b><br/>Village: ${pa.village}<br/>Area: ${pa.area} acre<br/>Status: ${pa.status}<br/>Comp: ₹${pa.comp.toLocaleString("en-IN")}`)
      .on("click", () => { document.getElementById("parcel-info").innerHTML = `<b>Parcel ${pa.id}</b> | ${pa.village} | ${pa.area} acre | Owner **** (masked) | Status ${pa.status} | ₹${pa.comp.toLocaleString("en-IN")}`; });
  });
}

// DOCS
function renderDocs(){
  document.getElementById("doc-rows").innerHTML = DB.docs.map((d,i)=>`<tr><td>📄 ${d.name}</td><td>${d.ver}</td><td>${d.by}</td><td>${d.date}</td><td>${d.status}</td><td><button onclick="viewDoc(${i})">View</button></td></tr>`).join("");
}
function viewDoc(i){ alert("Preview (simulated): " + DB.docs[i].name + "\nVersion " + DB.docs[i].ver + " by " + DB.docs[i].by + "\nIn production: secure repository with version control + audit."); audit("Viewed doc " + DB.docs[i].name); }
function uploadDoc(){
  const n = document.getElementById("nd-name").value || "New_Document.pdf";
  DB.docs.push({ name: n, ver: "1.0", by: session.role, date: new Date().toISOString().slice(0,10), status: "Draft" });
  audit("Uploaded doc " + n); save(); renderDocs();
}

// AI
function runAI(silent){
  const p = getP();
  if (!silent) { p.ai = { appr: +document.getElementById("ai-appr").value, comp: +document.getElementById("ai-comp").value, lit: +document.getElementById("ai-lit").value, rr: +document.getElementById("ai-rr").value, over: +document.getElementById("ai-over").value }; save(); }
  else { document.getElementById("ai-appr").value = p.ai.appr; document.getElementById("ai-comp").value = p.ai.comp; document.getElementById("ai-lit").value = p.ai.lit; document.getElementById("ai-rr").value = p.ai.rr; document.getElementById("ai-over").value = p.ai.over; }
  const r = calcRisk(p.ai);
  document.getElementById("risk-fill").style.width = r.score + "%";
  document.getElementById("risk-fill").style.background = r.score <= 30 ? "green" : r.score <= 60 ? "orange" : "red";
  document.getElementById("risk-label").innerHTML = `<b>${r.score}% — ${r.level} RISK</b> (${p.id})`;
  document.getElementById("risk-reason").textContent = `Reason: ${p.ai.comp} compensation pending, ${p.ai.lit} litigation cases, ${p.ai.over} days overdue, R&R ${p.ai.rr}% pending.`;
  const act = r.score > 80 ? "Prioritize compensation verification and route litigation to legal review team." : r.score > 60 ? "Escalate to State Officer, clear pending approvals this week." : r.score > 30 ? "Monitor weekly, clear document pendency." : "On track. Continue monitoring.";
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
  runAI(false);
  alert("Demo: compensation cleared → risk should drop HIGH → MEDIUM/LOW. Now also mark Compensation Completed in Project Details to update timeline.");
}

// ALERTS + ANALYTICS + AUDIT
function renderAlerts(){
  document.getElementById("alert-list").innerHTML = DB.alerts.map((a,i)=>`<li>[${a.sev.toUpperCase()}] ${a.msg} <small>${a.time}</small> <button onclick="resolveAlert(${i})">Resolve</button></li>`).join("");
  renderDash();
}
function resolveAlert(i){ audit("Resolved alert: " + DB.alerts[i].msg); DB.alerts.splice(i,1); save(); renderAlerts(); }
function renderAnalytics(){
  const stages = {}; DB.projects.forEach(p => { const s = p.milestones[p.stageIndex].name; stages[s] = (stages[s] || 0) + 1; });
  document.getElementById("ch-stage").innerHTML = Object.entries(stages).map(([k,v])=>`<div class="bar"><span style="width:${v/DB.projects.length*100}%">${k}: ${v}</span></div>`).join("");
  const risks = DB.projects.map(p => calcRisk(p.ai).level);
  const cnt = l => risks.filter(x => x === l).length;
  document.getElementById("ch-risk").innerHTML = ["LOW","MEDIUM","HIGH","CRITICAL"].map(l=>`<div class="bar"><span>${l}: ${cnt(l)}</span></div>`).join("");
}
function renderAudit(){ const el = document.getElementById("audit-rows"); if (el) el.innerHTML = DB.audit.map(a=>`<tr><td>${a.t}</td><td>${a.u}</td><td>${a.a}</td></tr>`).join(""); }

if (session) boot();
