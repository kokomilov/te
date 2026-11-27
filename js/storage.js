const DB_NAME = "electric-diagnostic";
const DB_VERSION = 1;
let dbPromise;
function openDB() {
  if (!dbPromise) dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("projects")) db.createObjectStore("projects", { keyPath: "id" });
      if (!db.objectStoreNames.contains("assets")) db.createObjectStore("assets", { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}
export async function saveProject(project) {
  const db = await openDB();
  project.updatedAt = new Date().toISOString();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("projects", "readwrite");
    tx.objectStore("projects").put(project);
    tx.oncomplete = () => resolve(project.id);
    tx.onerror = () => reject(tx.error);
  });
}
export async function loadLatestProject() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction("projects").objectStore("projects").getAll();
    req.onsuccess = () => resolve(req.result.sort((a,b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""))[0] || null);
    req.onerror = () => reject(req.error);
  });
}
export async function saveAsset(asset) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("assets", "readwrite");
    tx.objectStore("assets").put(asset);
    tx.oncomplete = () => resolve(asset.id);
    tx.onerror = () => reject(tx.error);
  });
}
export async function getAsset(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction("assets").objectStore("assets").get(id);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}
