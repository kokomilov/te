const DB_NAME = "boardview-lab";
const DB_VERSION = 1;
let dbPromise;
function db() {
  if (!dbPromise) dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const d = request.result;
      if (!d.objectStoreNames.contains("projects")) d.createObjectStore("projects", { keyPath: "id" });
      if (!d.objectStoreNames.contains("assets")) d.createObjectStore("assets", { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
}
export async function saveProject(project) {
  const d = await db();
  project.updatedAt = new Date().toISOString();
  return new Promise((resolve, reject) => {
    const tx = d.transaction("projects", "readwrite");
    tx.objectStore("projects").put(project);
    tx.oncomplete = () => resolve(project.id);
    tx.onerror = () => reject(tx.error);
  });
}
export async function loadLatestProject() {
  const d = await db();
  return new Promise((resolve, reject) => {
    const req = d.transaction("projects").objectStore("projects").getAll();
    req.onsuccess = () => resolve(req.result.sort((a,b) => b.updatedAt.localeCompare(a.updatedAt))[0] || null);
    req.onerror = () => reject(req.error);
  });
}
export async function saveAsset(asset) {
  const d = await db();
  return new Promise((resolve, reject) => {
    const tx = d.transaction("assets", "readwrite");
    tx.objectStore("assets").put(asset);
    tx.oncomplete = () => resolve(asset.id);
    tx.onerror = () => reject(tx.error);
  });
}
export async function getAsset(id) {
  const d = await db();
  return new Promise((resolve, reject) => {
    const req = d.transaction("assets").objectStore("assets").get(id);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}
