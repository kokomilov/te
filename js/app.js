import { createProject, normalizeProject } from "./schema.js";
import { saveProject, loadLatestProject, saveAsset, getAsset } from "./storage.js";
import { setBoardVisual, boardPointFromEvent } from "./board.js";
import { allEndpointsForEndpoint, endpointForComponentPin } from "./connectivity.js";
import { getTestpointResult, filterTestpoints } from "./testpoints.js";
import { addMeasurement } from "./measurements.js";
import { renderConnectionList } from "./block-diagram.js";

let project = createProject();
let activeSide = "top";
let mode = "select";
let selectedTestpointId = null;
let selectedConnectionId = null;
let highlightedEndpoints = new Set();
let activeObjectUrl = null;
const $ = id => document.getElementById(id);
const ui = {
  boardBackground: $("boardBackground"), overlay: $("boardOverlay"),
  status: $("statusText"), cursor: $("cursorText"), diagram: $("blockDiagram"),
  rows: $("testpointRows"), selection: $("selectionCard"), measurement: $("measurementForm"),
  connections: $("connectionsList")
};
const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
function status(message) { ui.status.textContent = message; }
function activeTestpoint() { return project.testpoints.find(p => p.id === selectedTestpointId) || null; }
function endpointIsHighlighted(endpoint) { return highlightedEndpoints.has(endpoint); }
function testpointEndpoint(p) { return p.name || p.id; }
function makePinLayout(templateId) {
  if (templateId === "SOT23") return [{number:1,x:18,y:52},{number:2,x:72,y:52},{number:3,x:45,y:8}];
  if (templateId === "RES2") return [{number:1,x:8,y:30},{number:2,x:82,y:30}];
  if (templateId === "QFN16") return [
    ...[1,2,3,4].map((number,i)=>({number,x:15+i*20,y:2})),
    ...[5,6,7,8].map((number,i)=>({number,x:88,y:12+i*12})),
    ...[9,10,11,12].map((number,i)=>({number,x:75-i*20,y:58})),
    ...[13,14,15,16].map((number,i)=>({number,x:2,y:48-i*12}))
  ];
  return [
    ...[1,2,3,4].map((number,i)=>({number,x:3,y:8+i*14})),
    ...[8,7,6,5].map((number,i)=>({number,x:87,y:8+i*14}))
  ];
}

async function persist() {
  try { await saveProject(project); status("Saved locally · " + new Date().toLocaleTimeString()); }
  catch (e) { status("Save failed: " + e.message); }
}
async function setSide(side) {
  activeSide = side;
  document.querySelectorAll(".side-btn").forEach(b => b.classList.toggle("active", b.dataset.side === side));
  $("loadSideLabel").textContent = side.toUpperCase();
  const meta = project.sides[side]?.visualName || "No " + side.toUpperCase() + " image loaded";
  $("boardMeta").textContent = meta;
  await restoreSideVisual();
  renderBoard();
}
async function restoreSideVisual() {
  const assetId = project.sides[activeSide]?.visualAssetId;
  ui.boardBackground.innerHTML = "";
  if (!assetId) {
    const empty = document.createElement("div"); empty.className = "empty";
    empty.innerHTML = `<strong>No ${activeSide.toUpperCase()} image loaded</strong><span>Load a separate image or SVG for this PCB side.</span>`;
    ui.boardBackground.append(empty); return;
  }
  const asset = await getAsset(assetId);
  if (asset?.blob) setBoardVisual(ui.boardBackground, asset.blob);
}
function renderBoard() {
  ui.overlay.innerHTML = "";
  ui.overlay.setAttribute("viewBox", `0 0 ${project.board.width} ${project.board.height}`);
  const NS = "http://www.w3.org/2000/svg";
  const el = (tag, attrs = {}) => { const n = document.createElementNS(NS, tag); Object.entries(attrs).forEach(([k,v]) => n.setAttribute(k,v)); return n; };

  project.components.filter(c => (c.side || "top") === activeSide).forEach(c => {
    const g = el("g", { transform:`translate(${c.x-45} ${c.y-30})`, class:"svg-hit" });
    const body = el("rect", {x:0,y:0,width:90,height:60,rx:5,class:"component-body"});
    const label = el("text",{x:45,y:34,class:"component-label"}); label.textContent = c.ref;
    g.append(body,label);
    const pins = c.pins?.length ? c.pins : makePinLayout(c.templateId || "SOIC8");
    pins.forEach(pin => {
      const ep = endpointForComponentPin(c,pin.number);
      const circle = el("circle",{cx:pin.x,cy:pin.y,r:5,class:"component-pin" + (endpointIsHighlighted(ep) ? " connected" : "")});
      const title = el("title"); title.textContent = `${c.ref}.${pin.number}`; circle.append(title);
      circle.addEventListener("click",e=>{e.stopPropagation();highlightEndpoint(ep);});
      g.append(circle);
    });
    ui.overlay.append(g);
  });

  project.testpoints.filter(p => p.side === activeSide).forEach(p => {
    const connected = endpointIsHighlighted(testpointEndpoint(p));
    const circle = el("circle",{cx:p.x,cy:p.y,r:7,class:"pinpoint" + (connected ? " connected" : "") + (p.id === selectedTestpointId ? " selected" : "")});
    const title = el("title"); title.textContent = `${p.name} · ${p.net || "No net"}`; circle.append(title);
    circle.addEventListener("click",e=>{e.stopPropagation();selectTestpoint(p.id);});
    const label = el("text",{x:p.x+10,y:p.y-9,fill:"#1265a8","font-size":"12","font-weight":"700"}); label.textContent=p.name;
    ui.overlay.append(circle,label);
  });
}
function renderTable() {
  const filtered = filterTestpoints(project.testpoints, {
    search:$("searchInput").value, side:$("sideFilter").value, result:$("resultFilter").value
  });
  ui.rows.innerHTML = "";
  filtered.forEach(p => {
    const tr = document.createElement("tr");
    tr.className = p.id === selectedTestpointId ? "selected" : "";
    const result = getTestpointResult(p);
    const expected = p.measurement?.expected == null ? "—" : `${p.measurement.expected} ${p.measurement.unit || ""}`;
    tr.innerHTML = `<td><strong>${esc(p.name)}</strong></td><td>${p.side === "top" ? "Top" : "Bottom"}</td><td>${esc(p.net || "—")}</td><td>${esc(expected)}</td><td><span class="status ${result}">${result.toUpperCase()}</span></td>`;
    tr.addEventListener("click",()=>selectTestpoint(p.id));
    ui.rows.append(tr);
  });
}
function renderSelection() {
  const p = activeTestpoint();
  if (!p) { ui.selection.innerHTML = '<div class="selection-empty">Select a testpoint from the table or PCB.</div>'; ui.measurement.innerHTML = '<p class="muted">Select a testpoint to enter a measurement.</p>'; return; }
  const spec = p.measurement || {};
  const last = p.history?.at(-1);
  ui.selection.innerHTML = `<div class="selection-title">${esc(p.name)} · ${esc(p.net || "No net")}</div><div class="selection-meta">${p.side.toUpperCase()} side · ${esc(spec.type || "voltage")} · Expected ${esc(spec.expected ?? "—")} ${esc(spec.unit || "")} · Limits ${esc(spec.min ?? "—")} to ${esc(spec.max ?? "—")}</div>${last ? `<div class="selection-meta">Last: ${esc(last.value)} ${esc(spec.unit || "")} · <b>${last.result}</b></div>` : ""}`;
  ui.measurement.innerHTML = `
    <label>Measurement type<select id="measurementType"><option value="voltage">Voltage</option><option value="resistance">Resistance</option><option value="continuity">Continuity</option><option value="current">Current</option><option value="other">Other</option></select></label>
    <label>Measured value<input id="measuredValue" type="number" step="any" placeholder="Enter value"></label>
    <label>Technician<input id="technicianInput" placeholder="Technician name"></label>
    <label>Unit<input id="unitInput" value="${esc(spec.unit || "V")}"></label>
    <label class="wide">Notes<input id="measurementNotes" placeholder="Optional diagnostic notes"></label>
    <button id="saveMeasurementBtn" class="wide">Save measurement</button>
    <div class="history wide"><strong>Measurement history</strong><div>${(p.history || []).slice().reverse().map(h => `${new Date(h.timestamp).toLocaleString()} · ${esc(h.value)} ${esc(spec.unit || "")} · ${h.result} · ${esc(h.technician || "—")}`).join("<br>") || "No measurements recorded."}</div></div>`;
  $("measurementType").value = spec.type || "voltage";
  $("saveMeasurementBtn").addEventListener("click",()=>{
    const value = $("measuredValue").value;
    if (value === "") { alert("Enter a measured value."); return; }
    p.measurement.type = $("measurementType").value;
    p.measurement.unit = $("unitInput").value;
    const record = addMeasurement(project,p,{value,technician:$("technicianInput").value,notes:$("measurementNotes").value});
    status(`Measurement saved · ${record.result}`);
    persist(); render();
  });
}
function renderConnections() {
  renderConnectionList(ui.connections,project,selectedConnectionId,id=>selectConnection(id),id=>{
    if(confirm("Delete this pin connection?")) {
      project.connections = project.connections.filter(c=>c.id!==id);
      selectedConnectionId=null; highlightedEndpoints.clear(); persist(); render();
    }
  });
}
function render() {
  $("projectName").value = project.name;
  $("boardRevision").value = project.revision;
  renderBoard(); renderTable(); renderSelection(); renderConnections();
  document.querySelectorAll(".diagram-node").forEach(node=>node.classList.toggle("active", highlightedEndpoints.has(node.dataset.node)));
}
function selectTestpoint(id) {
  selectedTestpointId = id;
  const p = activeTestpoint();
  if (p) {
    activeSide = p.side;
    document.querySelectorAll(".side-btn").forEach(b=>b.classList.toggle("active",b.dataset.side===activeSide));
    $("loadSideLabel").textContent=activeSide.toUpperCase();
    $("boardMeta").textContent=project.sides[activeSide]?.visualName || `No ${activeSide.toUpperCase()} image loaded`;
    restoreSideVisual();
  }
  highlightedEndpoints = new Set();
  if (p) highlightedEndpoints = allEndpointsForEndpoint(project,testpointEndpoint(p));
  render();
}
function selectConnection(id) {
  selectedConnectionId = id;
  const connection = project.connections.find(c=>c.id===id);
  highlightedEndpoints = new Set(connection?.endpoints || []);
  const linkedTP = project.testpoints.find(p=>highlightedEndpoints.has(testpointEndpoint(p)));
  if (linkedTP) { selectedTestpointId=linkedTP.id; activeSide=linkedTP.side; }
  render();
}
function highlightEndpoint(endpoint) {
  const matching = new Set([endpoint]);
  project.connections.forEach(c => (c.endpoints || []).forEach(ep => {
    if (ep === endpoint || ep.startsWith(endpoint + ".")) matching.add(ep);
  }));
  highlightedEndpoints = new Set();
  matching.forEach(ep => allEndpointsForEndpoint(project,ep).forEach(x => highlightedEndpoints.add(x)));
  const p = project.testpoints.find(t=>highlightedEndpoints.has(testpointEndpoint(t)));
  if (p) { selectedTestpointId=p.id; activeSide=p.side; }
  render();
}
function addComponent(x,y) {
  const templateId = $("componentTemplate").value;
  const prefix = templateId === "RES2" ? "R" : templateId === "SOT23" ? "Q" : "U";
  const next = project.components.filter(c => c.ref.startsWith(prefix)).length + 1;
  const ref = prompt("Component reference designator", `${prefix}${next}`);
  if (!ref) return;
  project.components.push({ id:crypto.randomUUID(), ref:ref.trim(), templateId, x, y, side:activeSide, pins:makePinLayout(templateId) });
  status(`Placed ${ref.trim()} on ${activeSide.toUpperCase()} side`);
  persist(); render();
}
function addTestpoint(x,y) {
  const n=project.testpoints.length+1;
  const p={id:crypto.randomUUID(),name:`TP${String(n).padStart(3,"0")}`,x,y,side:activeSide,net:"",measurement:{type:"voltage",expected:null,min:null,max:null,unit:"V"},history:[]};
  project.testpoints.push(p); selectedTestpointId=p.id; persist(); render();
}
function addConnection() {
  $("connectionName").value=""; $("endpointA").value=""; $("endpointB").value=""; $("endpointExtra").value="";
  $("connectionDialog").showModal();
}
async function loadSideImage(file) {
  const id=crypto.randomUUID();
  await saveAsset({id,name:file.name,mime:file.type,blob:file,kind:`board-${activeSide}`});
  project.sides[activeSide]={visualAssetId:id,visualName:file.name};
  await restoreSideVisual(); $("boardMeta").textContent=file.name; await persist(); status(`${activeSide.toUpperCase()} image loaded`);
}

document.querySelectorAll(".side-btn").forEach(b=>b.addEventListener("click",()=>setSide(b.dataset.side)));
$("boardImageInput").addEventListener("change",async e=>{const f=e.target.files[0];if(f)await loadSideImage(f);e.target.value="";});
$("boardOverlay").addEventListener("click",e=>{
  const p=boardPointFromEvent(e,ui.overlay);
  if(mode==="point") addTestpoint(p.x,p.y);
  else if(mode==="component") addComponent(p.x,p.y);
});
$("boardOverlay").addEventListener("mousemove",e=>{const p=boardPointFromEvent(e,ui.overlay);ui.cursor.textContent=`x: ${p.x} y: ${p.y}`;});
document.querySelectorAll("[data-mode]").forEach(b=>b.addEventListener("click",()=>{mode=b.dataset.mode;document.querySelectorAll("[data-mode]").forEach(x=>x.classList.toggle("active",x===b));status(`Tool: ${mode}`);}));
$("toggleDiagramBtn").addEventListener("click",()=>{
  const wrap=$("diagramWrap"); const hidden=!wrap.classList.contains("hidden");
  wrap.classList.toggle("hidden",hidden); $("toggleDiagramBtn").textContent=hidden?"Show diagram":"Hide diagram";
  $("toggleDiagramBtn").setAttribute("aria-expanded",String(!hidden));
});
$("addConnectionBtn").addEventListener("click",addConnection);
$("connectionForm").addEventListener("submit",e=>{
  e.preventDefault();
  const endpoints=[$("endpointA").value.trim(),$("endpointB").value.trim(),...$("endpointExtra").value.split(",").map(x=>x.trim()).filter(Boolean)];
  if(new Set(endpoints).size<2){alert("A connection needs at least two different endpoints.");return;}
  const c={id:crypto.randomUUID(),name:$("connectionName").value.trim()||"Connection",endpoints:[...new Set(endpoints)]};
  project.connections.push(c);$("connectionDialog").close();selectConnection(c.id);persist();
});
$("addTestpointBtn").addEventListener("click",()=>{mode="point";document.querySelectorAll("[data-mode]").forEach(x=>x.classList.toggle("active",x.dataset.mode==="point"));status("Click the active PCB side to place a testpoint.");});
["searchInput","sideFilter","resultFilter"].forEach(id=>$(id).addEventListener("input",renderTable));
$("projectName").addEventListener("change",e=>{project.name=e.target.value;persist();});
$("boardRevision").addEventListener("change",e=>{project.revision=e.target.value;persist();});
$("saveNowBtn").addEventListener("click",persist);
$("fitBtn").addEventListener("click",()=>{document.getElementById("boardStage").style.transform="translate(-50%,-50%) scale(1)";});
$("exportBtn").addEventListener("click",()=>{
  const blob=new Blob([JSON.stringify(project,null,2)],{type:"application/json"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`${project.name.replace(/[^a-z0-9-_]/gi,"_")}.json`;a.click();URL.revokeObjectURL(a.href);
});
$("importInput").addEventListener("change",async e=>{
  const file=e.target.files[0];if(!file)return;
  try{project=normalizeProject(JSON.parse(await file.text()));selectedTestpointId=null;await setSide("top");render();await persist();status("Project imported");}
  catch(err){alert("Import failed: "+err.message);}e.target.value="";
});
$("newProjectBtn").addEventListener("click",()=>{
  if(!confirm("Create a new project? Export the current project first if needed."))return;
  project=createProject();selectedTestpointId=null;selectedConnectionId=null;highlightedEndpoints.clear();
  ui.boardBackground.innerHTML='<div class="empty"><strong>No TOP image loaded</strong><span>Load a separate image or SVG for each PCB side.</span></div>';
  setSide("top");persist();render();
});
document.querySelectorAll(".diagram-node").forEach(node=>node.addEventListener("click",()=>highlightEndpoint(node.dataset.node)));

(async()=>{
  try {
    const saved=await loadLatestProject();
    if(saved) project=normalizeProject(saved);
    else await persist();
    $("projectName").value=project.name;$("boardRevision").value=project.revision;
    await setSide("top");render();
    status("Ready · Top and bottom PCB sides supported");
  } catch(e) { status("Local database unavailable: "+e.message); render(); }
})();
