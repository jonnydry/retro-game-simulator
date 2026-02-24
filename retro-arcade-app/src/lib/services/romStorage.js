const DB_NAME = 'RetroArcadeRoms';
const DB_VERSION = 1;
const META_STORE = 'romMeta';
const BLOBS_STORE = 'romBlobs';
const STORAGE_KEY = 'retroArcade_data';
const MIGRATION_FLAG = 'retroArcade_romsMigrated';

let metaCache = [];
let db = null;

export function isIndexedDBAvailable() {
  return typeof window !== 'undefined' && 'indexedDB' in window;
}

function openDB() {
  if (!isIndexedDBAvailable()) return Promise.reject(new Error('IndexedDB not available'));
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = (e) => {
      const database = e.target.result;
      if (!database.objectStoreNames.contains(META_STORE)) {
        database.createObjectStore(META_STORE, { keyPath: 'id' });
      }
      if (!database.objectStoreNames.contains(BLOBS_STORE)) {
        database.createObjectStore(BLOBS_STORE, { keyPath: 'id' });
      }
    };
  });
}

function base64ToBlob(base64) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return new Blob([bytes.buffer], { type: 'application/octet-stream' });
}

async function migrateFromLocalStorage() {
  if (typeof window === 'undefined') return;
  if (localStorage.getItem(MIGRATION_FLAG)) return;

  let data;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    data = raw ? JSON.parse(raw) : {};
  } catch {
    return;
  }

  const library = data.romLibrary || [];
  if (library.length === 0) {
    localStorage.setItem(MIGRATION_FLAG, 'true');
    return;
  }

  const database = await openDB();
  try {
    const tx = database.transaction([META_STORE, BLOBS_STORE], 'readwrite');
    const metaStore = tx.objectStore(META_STORE);
    const blobsStore = tx.objectStore(BLOBS_STORE);

    for (const rom of library) {
      if (!rom.fileData) continue;
      try {
        const blob = base64ToBlob(rom.fileData);
        const meta = { id: rom.id, name: rom.name, system: rom.system, lastPlayed: rom.lastPlayed || Date.now() };
        metaStore.put(meta);
        blobsStore.put({ id: rom.id, blob });
      } catch (err) {
        console.warn('ROM migration failed for', rom.name, err);
      }
    }

    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });

    data.romLibrary = [];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    localStorage.setItem(MIGRATION_FLAG, 'true');
  } finally {
    database.close();
  }
}

async function loadMetaIntoCache() {
  if (!isIndexedDBAvailable()) {
    metaCache = [];
    return;
  }
  const database = await openDB();
  db = database;
  return new Promise((resolve, reject) => {
    const tx = database.transaction(META_STORE, 'readonly');
    const store = tx.objectStore(META_STORE);
    const req = store.getAll();
    req.onsuccess = () => {
      metaCache = req.result || [];
      resolve();
    };
    req.onerror = () => reject(req.error);
  });
}

/**
 * Initialize ROM storage. Call once on app startup before reading the library.
 * Runs one-time migration from localStorage if needed.
 */
export async function initRomStorage() {
  if (typeof window === 'undefined') return;
  if (!isIndexedDBAvailable()) {
    console.warn('IndexedDB not available - ROM storage disabled');
    metaCache = [];
    return;
  }
  try {
    await migrateFromLocalStorage();
    await loadMetaIntoCache();
  } catch (err) {
    console.error('ROM storage init failed', err);
    metaCache = [];
  }
}

export function getRomLibrary() {
  return [...metaCache];
}

export function getRomFromLibrary(id) {
  return metaCache.find((r) => r.id === id) || null;
}

/**
 * Get the ROM blob from IndexedDB. Used when loading a game for playback.
 */
export async function getRomBlob(id) {
  if (!isIndexedDBAvailable()) return null;
  const database = db || (await openDB());
  return new Promise((resolve, reject) => {
    const tx = database.transaction(BLOBS_STORE, 'readonly');
    const store = tx.objectStore(BLOBS_STORE);
    const req = store.get(id);
    req.onsuccess = () => {
      const row = req.result;
      resolve(row?.blob ?? null);
    };
    req.onerror = () => reject(req.error);
  });
}

/**
 * Add a ROM to the library. blob can be a Blob or ArrayBuffer.
 */
export async function addToRomLibrary(name, system, blob) {
  if (!isIndexedDBAvailable()) {
    throw new Error('IndexedDB not available');
  }
  const blobObj = blob instanceof Blob ? blob : new Blob([blob], { type: 'application/octet-stream' });
  const database = db || (await openDB());

  const existing = metaCache.find((r) => r.name === name && r.system === system);
  const id = existing ? existing.id : 'rom_' + Date.now();
  const lastPlayed = Date.now();

  const meta = { id, name, system, lastPlayed };

  return new Promise((resolve, reject) => {
    const tx = database.transaction([META_STORE, BLOBS_STORE], 'readwrite');
    const metaStore = tx.objectStore(META_STORE);
    const blobsStore = tx.objectStore(BLOBS_STORE);

    metaStore.put(meta);
    blobsStore.put({ id, blob: blobObj });

    tx.oncomplete = () => {
      if (existing) {
        const idx = metaCache.findIndex((r) => r.id === id);
        if (idx >= 0) metaCache[idx] = { ...meta };
        else metaCache.push({ ...meta });
      } else {
        metaCache.push({ ...meta });
      }
      resolve(id);
    };
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Update lastPlayed timestamp for a ROM. Called when loading a game.
 */
export async function updateRomLastPlayed(id) {
  if (!isIndexedDBAvailable()) return;
  const entry = metaCache.find((r) => r.id === id);
  if (!entry) return;
  const meta = { ...entry, lastPlayed: Date.now() };
  const database = db || (await openDB());
  return new Promise((resolve, reject) => {
    const tx = database.transaction(META_STORE, 'readwrite');
    const store = tx.objectStore(META_STORE);
    store.put(meta);
    tx.oncomplete = () => {
      const idx = metaCache.findIndex((r) => r.id === id);
      if (idx >= 0) metaCache[idx] = meta;
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}

export async function removeFromRomLibrary(id) {
  if (!isIndexedDBAvailable()) return;
  const database = db || (await openDB());

  return new Promise((resolve, reject) => {
    const tx = database.transaction([META_STORE, BLOBS_STORE], 'readwrite');
    const metaStore = tx.objectStore(META_STORE);
    const blobsStore = tx.objectStore(BLOBS_STORE);

    metaStore.delete(id);
    blobsStore.delete(id);

    tx.oncomplete = () => {
      metaCache = metaCache.filter((r) => r.id !== id);
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}
