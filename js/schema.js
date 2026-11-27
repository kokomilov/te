export const SCHEMA_VERSION = 2;

export function createProject(name = "Untitled board") {
  const now = new Date().toISOString();
  return {
    schemaVersion: SCHEMA_VERSION,
    id: crypto.randomUUID(),
    name, revision: "A", createdAt: now, updatedAt: now,
    board: { width: 1000, height: 700 },
    sides: {
      top: { visualAssetId: null, visualName: null },
      bottom: { visualAssetId: null, visualName: null }
    },
    components: [],
    testpoints: [],
    connections: [],
    measurements: []
  };
}

export function normalizeProject(p) {
  if (!p || typeof p !== "object") throw new Error("Invalid project file");
  // Migrate the original Boardview Lab schema v1 without discarding its data.
  if (!p.sides) {
    p.sides = {
      top: { visualAssetId: p.board?.visualAssetId || null, visualName: null },
      bottom: { visualAssetId: null, visualName: null }
    };
  }
  p.sides.top ??= { visualAssetId: null, visualName: null };
  p.sides.bottom ??= { visualAssetId: null, visualName: null };
  p.components ??= [];
  p.testpoints ??= [];
  p.connections ??= [];
  p.measurements ??= [];
  if (!p.testpoints.length && Array.isArray(p.setups)) {
    p.setups.forEach(setup => (setup.pinpoints || []).forEach(point => {
      p.testpoints.push({
        id: point.id, name: point.name, x: point.x, y: point.y,
        side: "top", componentId: point.componentId || null, pin: point.pin || null,
        net: point.net || "", measurement: point.measurement || { type: "voltage", expected: null, min: null, max: null, unit: "V" }
      });
    }));
  }
  p.testpoints.forEach(t => {
    t.side ??= "top";
    t.measurement ??= { type: "voltage", expected: null, min: null, max: null, unit: "V" };
    t.history ??= [];
  });
  p.board ??= { width: 1000, height: 700 };
  p.board.width ??= 1000; p.board.height ??= 700;
  p.schemaVersion = SCHEMA_VERSION;
  return p;
}
