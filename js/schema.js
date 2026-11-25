export function createProject(name = "Untitled board") {
  const now = new Date().toISOString();
  return {
    schemaVersion: 1,
    id: crypto.randomUUID(),
    name,
    revision: "A",
    createdAt: now,
    updatedAt: now,
    board: { visualAssetId: null, visualType: null, width: 1000, height: 700, gerberAssetIds: [] },
    components: [],
    setups: [{ id: crypto.randomUUID(), name: "Default", visible: true, pinpoints: [] }],
    activeSetupId: null,
    assets: []
  };
}
export function normalizeProject(p) {
  if (!p || typeof p !== "object") throw new Error("Invalid project file");
  if (!Array.isArray(p.components) || !Array.isArray(p.setups)) throw new Error("Project is missing components or setups");
  p.schemaVersion ??= 1;
  p.assets ??= [];
  p.board ??= { visualAssetId: null, visualType: null, width: 1000, height: 700, gerberAssetIds: [] };
  p.setups.forEach(s => { s.pinpoints ??= []; s.visible ??= true; });
  if (!p.setups.length) p.setups.push({ id: crypto.randomUUID(), name: "Default", visible: true, pinpoints: [] });
  p.activeSetupId ??= p.setups[0].id;
  return p;
}
