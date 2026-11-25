import { createProject, normalizeProject } from "./schema.js";
import { saveProject, loadLatestProject, saveAsset, getAsset } from "./storage.js";
import { setBoardVisual, boardPointFromEvent } from "./board.js";
import { templateById } from "./svg-library.js";
import { renderOverlay } from "./render.js";

let project = createProject();
project.activeSetupId = project.setups[0].id;
let mode = "select";
let selection = null;
let activeBoardUrl = null;
const $ = id => document.getElementById(id);
const ui = {
  boardViewport:$("boardViewport"), boardStage:$("boardStage"), boardBackground:$("boardBackground"), overlay:$("overlay"),
  projectName:$("projectName"), boardRevision:$("boardRevision"), setupSelect:$("setupSelect"),
  inspector:$("inspectorContent"), status:$("statusText"), cursor:$("cursorPosition"),
  componentList:$("componentList"), setupSummary:$("setupSummary")
};
const activeSetup = () => project.setups.find(s => s.id === project.activeSetupId) || project.setups[0];
function status(message) { ui.status.textContent = message; }
function render() {
  ui.projectName.value = project.name; ui.boardRevision.value = project.revision;
  ui.setupSelect.innerHTML = "";
  project.setups.forEach(s => { const o=document.createElement("option");o.value=s.id;o.textContent=`${s.name} (${s.pinpoints.length})`;o.selected=s.id===project.activeSetupId;ui.setupSelect.append(o); });
  const setup=activeSetup();
  renderOverlay(ui.overlay,project,setup,{showPins:$("showPinsToggle").checked,showComponents:$("showComponentsToggle").checked,selection},select);
  ui.componentList.innerHTML = "";
  project.components.forEach(c=>{const d=document.createElement("div");d.className="list-item";d.textContent=`${c.ref} · ${templateById(c.templateId).name}`;ui.componentList.append(d);});
  ui.setupSummary.textContent = `${setup.name}: ${setup.pinpoints.length} pinpoint(s). Setup data is isolated from other configurations.`;
  renderInspector();
}
function select(item) { selection=item; render(); }
function renderInspector() {
  const s=activeSetup();
  if (!selection) { ui.inspector.textContent="Select a component or pinpoint to inspect its properties."; return; }
  if (selection.type==="pinpoint") {
    const p=s.pinpoints.find(x=>x.id===selection.id);
    if (!p) { selection=null; ui.inspector.textContent="Selection not found in this setup."; return; }
    ui.inspector.innerHTML="";
    const form=document.createElement("div");form.className="field-grid";
    const fields=[["Name","name",p.name],["Net","net",p.net||""],["Type","measurementType",p.measurement?.type||"voltage"],["Expected","expected",p.measurement?.expected??""]];
    fields.forEach(([label,key,value])=>{const l=document.createElement("label");l.textContent=label;const input=document.createElement("input");input.value=value;input.dataset.key=key;l.append(input);form.append(l);});
    const unitLabel=document.createElement("label");unitLabel.textContent="Unit";const unit=document.createElement("input");unit.value=p.measurement?.unit||"V";unit.dataset.key="unit";unitLabel.append(unit);form.append(unitLabel);
    const del=document.createElement("button");del.className="danger";del.textContent="Delete pinpoint";del.addEventListener("click",()=>{s.pinpoints=s.pinpoints.filter(x=>x.id!==p.id);selection=null;persist();render();});
    const save=document.createElement("button");save.textContent="Apply changes";save.addEventListener("click",()=>{form.querySelectorAll("input").forEach(i=>{const k=i.dataset.key;if(k==="measurementType")p.measurement.type=i.value;else if(k==="expected")p.measurement.expected=i.value===""?null:Number(i.value);else if(k==="unit")p.measurement.unit=i.value;else p[k]=i.value;});persist();render();});
    ui.inspector.append(form,save,del);
  } else if (selection.type==="component") {
    const c=project.components.find(x=>x.id===selection.id);
    ui.inspector.textContent=c?`${c.ref} · ${templateById(c.templateId).name} · (${c.x}, ${c.y})`:"Component not found.";
  } else if (selection.type==="componentPin") {
    const c=project.components.find(x=>x.id===selection.componentId);
    ui.inspector.textContent=c?`${c.ref} · Pin ${selection.pin}. To create a test point at this pin, use Add pinpoint and place a point at its board coordinate.`:"Component not found.";
  }
}
async function persist() { try { await saveProject(project); status("Saved locally · "+new Date().toLocaleTimeString()); } catch(e) { status("Save failed: "+e.message); } }
function addPinpoint(x,y,componentId=null,pin=null) {
  const s=activeSetup();
  const n=s.pinpoints.length+1;
  s.pinpoints.push({id:crypto.randomUUID(),name:`TP${String(n).padStart(3,"0")}`,x,y,componentId,pin,net:"",measurement:{type:"voltage",expected:null,unit:"V"},notes:""});
  selection={type:"pinpoint",id:s.pinpoints.at(-1).id};persist();render();
}
function addComponent(x,y) {
  const templateId=$("templateSelect").value;
  const n=project.components.length+1;
  const c={id:crypto.randomUUID(),ref:`U${n}`,templateId,x,y,rotation:0,properties:{}};
  project.components.push(c);selection={type:"component",id:c.id};persist();render();
}
ui.overlay.addEventListener("click",e=>{
  const pt=boardPointFromEvent(e,ui.overlay);
  if(mode==="point") addPinpoint(pt.x,pt.y);
  else if(mode==="component") addComponent(pt.x,pt.y);
  else select(null);
});
ui.overlay.addEventListener("mousemove",e=>{const p=boardPointFromEvent(e,ui.overlay);ui.cursor.textContent=`x: ${p.x} y: ${p.y}`;});
document.querySelectorAll("[data-mode]").forEach(b=>b.addEventListener("click",()=>{mode=b.dataset.mode;document.querySelectorAll("[data-mode]").forEach(x=>x.classList.toggle("active",x===b));status(`Tool: ${mode}`);}));
$("boardFileInput").addEventListener("change",async e=>{
  const file=e.target.files[0];if(!file)return;
  const id=crypto.randomUUID();await saveAsset({id,name:file.name,mime:file.type,blob:file,kind:"board-visual"});
  project.assets.push({id,name:file.name,kind:"board-visual"});project.board.visualAssetId=id;project.board.visualType=file.type;
  setBoardVisual(ui.boardBackground,file);$("canvasMeta").textContent=file.name;status("Board visual loaded");persist();e.target.value="";
});
$("gerberInput").addEventListener("change",async e=>{
  for(const file of e.target.files){const id=crypto.randomUUID();await saveAsset({id,name:file.name,mime:file.type,blob:file,kind:"gerber"});project.assets.push({id,name:file.name,kind:"gerber"});project.board.gerberAssetIds.push(id);}
  status(`${e.target.files.length} Gerber file(s) stored locally. Renderer adapter not yet connected.`);persist();e.target.value="";
});
$("addSetupBtn").addEventListener("click",()=>{const name=prompt("Setup name?","New setup");if(!name)return;const s={id:crypto.randomUUID(),name,visible:true,pinpoints:[]};project.setups.push(s);project.activeSetupId=s.id;selection=null;persist();render();});
$("setupSelect").addEventListener("change",e=>{project.activeSetupId=e.target.value;selection=null;render();});
$("renameSetupBtn").addEventListener("click",()=>{const s=activeSetup();const name=prompt("Rename setup",s.name);if(name){s.name=name;persist();render();}});
$("deleteSetupBtn").addEventListener("click",()=>{if(project.setups.length===1){alert("A project must retain at least one setup.");return;}const s=activeSetup();if(!confirm(`Delete setup "${s.name}" and its pinpoints?`))return;project.setups=project.setups.filter(x=>x.id!==s.id);project.activeSetupId=project.setups[0].id;selection=null;persist();render();});
$("showPinsToggle").addEventListener("change",render);$("showComponentsToggle").addEventListener("change",render);
$("projectName").addEventListener("change",e=>{project.name=e.target.value;persist();});
$("boardRevision").addEventListener("change",e=>{project.revision=e.target.value;persist();});
$("saveNowBtn").addEventListener("click",persist);
$("exportBtn").addEventListener("click",()=>{
  const data=JSON.stringify(project,null,2);const blob=new Blob([data],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`${project.name.replace(/[^a-z0-9-_]/gi,"_")}.json`;a.click();URL.revokeObjectURL(a.href);
});
$("importProjectInput").addEventListener("change",async e=>{const f=e.target.files[0];if(!f)return;try{project=normalizeProject(JSON.parse(await f.text()));selection=null;await restoreBoardVisual();await persist();render();status("Project imported");}catch(err){alert("Import failed: "+err.message);}e.target.value="";});
async function restoreBoardVisual(){if(!project.board.visualAssetId)return;const asset=await getAsset(project.board.visualAssetId);if(asset?.blob){setBoardVisual(ui.boardBackground,asset.blob);$("canvasMeta").textContent=asset.name;}}
$("fitBoardBtn").addEventListener("click",()=>{ui.boardStage.style.transform="translate(-50%,-50%) scale(1)";});
$("newProjectBtn").addEventListener("click",()=>{if(!confirm("Create a new project? Export the current project first if you need a backup."))return;project=createProject();project.activeSetupId=project.setups[0].id;selection=null;ui.boardBackground.innerHTML='<div class="empty-state"><strong>Load a PCB image or SVG</strong><span>PNG, JPG, WebP and SVG supported as visual backgrounds</span></div>';$("canvasMeta").textContent="No board loaded";persist();render();});
(async()=>{try{const saved=await loadLatestProject();if(saved){project=normalizeProject(saved);await restoreBoardVisual();}else project.activeSetupId=project.setups[0].id;}catch(e){status("Local database unavailable: "+e.message);}render();})();
