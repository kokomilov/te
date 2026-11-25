import { templateById } from "./svg-library.js";
const NS = "http://www.w3.org/2000/svg";
function el(tag, attrs = {}) {
  const n = document.createElementNS(NS, tag);
  Object.entries(attrs).forEach(([k,v]) => n.setAttribute(k, v));
  return n;
}
export function renderOverlay(svg, project, activeSetup, state, onSelect) {
  svg.innerHTML = "";
  svg.setAttribute("viewBox", `0 0 ${project.board.width} ${project.board.height}`);
  if (state.showComponents) {
    for (const c of project.components) {
      const t = templateById(c.templateId);
      const g = el("g", { transform: `translate(${c.x-t.width/2} ${c.y-t.height/2}) rotate(${c.rotation||0} ${t.width/2} ${t.height/2})`, class:"svg-hit" });
      const body = el("rect", {x:25,y:18,width:50,height:44,rx:5,class:`component-body ${state.selection?.type==="component"&&state.selection.id===c.id?"selected":""}`});
      g.append(body);
      const label = el("text", {x:50,y:43,class:"component-label"}); label.textContent = c.ref; g.append(label);
      t.pins.forEach(pin => {
        const circle = el("circle", {cx:pin.x,cy:pin.y,r:4,class:"component-pin"});
        circle.addEventListener("click", e => { e.stopPropagation(); onSelect({type:"componentPin", componentId:c.id, pin:pin.n}); });
        g.append(circle);
      });
      g.addEventListener("click", e => { e.stopPropagation(); onSelect({type:"component",id:c.id}); });
      svg.append(g);
    }
  }
  if (state.showPins && activeSetup) {
    activeSetup.pinpoints.forEach(p => {
      const g = el("g", {class:"svg-hit"});
      const circle = el("circle", {cx:p.x,cy:p.y,r:6,class:`pinpoint ${state.selection?.type==="pinpoint"&&state.selection.id===p.id?"selected":""}`});
      const title = el("title"); title.textContent = `${p.name} · ${p.net || "No net"}`; circle.append(title);
      const label = el("text",{x:p.x+9,y:p.y-8,fill:"#1265a8","font-size":"11","font-weight":"700"}); label.textContent=p.name;
      g.append(circle,label);
      g.addEventListener("click",e=>{e.stopPropagation();onSelect({type:"pinpoint",id:p.id});});
      svg.append(g);
    });
  }
}
