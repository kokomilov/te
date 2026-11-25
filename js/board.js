export function setBoardVisual(container, file) {
  const old = container.querySelector("img");
  if (old?.dataset.objectUrl) URL.revokeObjectURL(old.dataset.objectUrl);
  container.innerHTML = "";
  const img = document.createElement("img");
  const url = URL.createObjectURL(file);
  img.src = url;
  img.dataset.objectUrl = url;
  img.alt = "PCB background";
  container.append(img);
}
export function boardPointFromEvent(event, svg) {
  const p = svg.createSVGPoint();
  p.x = event.clientX; p.y = event.clientY;
  const matrix = svg.getScreenCTM();
  if (!matrix) return {x:0,y:0};
  const local = p.matrixTransform(matrix.inverse());
  return { x: Math.round(local.x), y: Math.round(local.y) };
}
