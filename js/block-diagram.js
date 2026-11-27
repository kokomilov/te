export function renderConnectionList(container, project, selectedConnectionId, onSelect, onDelete) {
  container.innerHTML = "";
  if (!project.connections.length) {
    const empty = document.createElement("span"); empty.className = "muted"; empty.textContent = "No pin connections yet. Add a connection to group related pins."; container.append(empty); return;
  }
  project.connections.forEach(c => {
    const chip = document.createElement("button");
    chip.className = "connection-chip" + (c.id === selectedConnectionId ? " active" : "");
    chip.textContent = `${c.name}: ${(c.endpoints || []).join(" ↔ ")}`;
    chip.title = "Highlight connected endpoints";
    chip.addEventListener("click", () => onSelect(c.id));
    chip.addEventListener("contextmenu", e => { e.preventDefault(); onDelete(c.id); });
    container.append(chip);
  });
}
