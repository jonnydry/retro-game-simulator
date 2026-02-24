import { addToRomLibrary, getRomLibrary } from '$lib/services/storage.js';
import { romLibrary } from '$lib/stores/romLibraryStore.js';
import { inferSystemFromFileName, systemExtensions } from '$lib/services/emulator.js';

const DB_NAME = 'RetroArcadeWatch';
const DB_VERSION = 1;
const STORE_NAME = 'folders';
const POLL_INTERVAL_MS = 30000; // 30 seconds

let pollTimer = null;
let isWatching = false;

export function isSupported() {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window && 'FileSystemDirectoryHandle' in window;
}

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

export async function getWatchedFolders() {
  if (!isSupported()) return [];
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function addWatchFolder() {
  if (!isSupported()) {
    return { ok: false, error: 'File System Access API is not supported in this browser. Use Chrome or Edge.' };
  }
  try {
    const handle = await window.showDirectoryPicker({ mode: 'read' });
    const db = await openDB();
    const id = 'folder_' + Date.now();
    const entry = { id, name: handle.name, handle };
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.add(entry);
      req.onsuccess = () => resolve({ ok: true, name: handle.name });
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    if (err.name === 'AbortError') return { ok: false, aborted: true };
    return { ok: false, error: err.message || 'Failed to add folder' };
  }
}

export async function removeWatchFolder(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(id);
    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error);
  });
}

function isRomExtension(fileName) {
  const lower = fileName.toLowerCase();
  for (const exts of Object.values(systemExtensions)) {
    if (exts.some((ext) => lower.endsWith(ext))) return true;
  }
  return false;
}

async function scanDirectory(handle, basePath = '', depth = 0) {
  const MAX_DEPTH = 3;
  const roms = [];
  for await (const [, entry] of handle.entries()) {
    if (entry.kind === 'file') {
      const fileName = entry.name.toLowerCase();
      if (isRomExtension(fileName)) {
        roms.push({ handle: entry, name: entry.name, path: basePath || entry.name });
      }
    } else if (entry.kind === 'directory' && depth < MAX_DEPTH) {
      const subPath = basePath ? `${basePath}/${entry.name}` : entry.name;
      const subRoms = await scanDirectory(entry, subPath, depth + 1);
      roms.push(...subRoms);
    }
  }
  return roms;
}

/**
 * Normalize filename to a "game base" for deduplication.
 * "Tony Hawk's Pro Skater 3 (Europe).gba" and "Tony Hawk's Pro Skater 3 (USA, Europe).gba"
 * both normalize to "Tony Hawk's Pro Skater 3" - same game, avoid duplicate.
 */
function gameBaseForDedupe(fileName) {
  const base = fileName.replace(/\.[^.]+$/, '').trim();
  return base.replace(/\s*\([^)]*\)\s*$/, '').trim() || base;
}

async function importRomFromHandle(fileHandle, system) {
  const file = await fileHandle.getFile();
  const arrayBuffer = await file.arrayBuffer();
  /* Use full filename as name so "game.nes" and "game.zip" stay distinct */
  const romName = file.name;
  const blob = new Blob([arrayBuffer], { type: 'application/octet-stream' });
  await addToRomLibrary(romName, system, blob);
}

export async function scanFolderForRoms(handle) {
  const library = getRomLibrary();
  const known = new Set(library.map((r) => `${r.name}|${r.system}`));
  const gameBasesInLibrary = new Set(
    library.map((r) => `${r.system}|${gameBaseForDedupe(r.name)}`)
  );

  const romFiles = await scanDirectory(handle);
  const seenInScan = new Set(); // dedupe same file from root + subfolder
  let added = 0;

  for (const { handle: fileHandle, name } of romFiles) {
    const system = inferSystemFromFileName(name);
    if (!system) continue;

    const key = `${name}|${system}`;
    if (known.has(key)) continue;

    const gameBase = gameBaseForDedupe(name);
    const gameBaseKey = `${system}|${gameBase}`;
    if (gameBasesInLibrary.has(gameBaseKey)) continue;
    if (seenInScan.has(gameBaseKey)) continue;

    try {
      await importRomFromHandle(fileHandle, system);
      known.add(key);
      gameBasesInLibrary.add(gameBaseKey);
      seenInScan.add(gameBaseKey);
      added++;
    } catch (err) {
      console.warn('Watch folder: failed to import', name, err);
      if (added > 0) romLibrary.refresh();
      if (err?.message?.includes('quota') || err?.message?.includes('Storage')) {
        throw err;
      }
    }
  }

  if (added > 0) romLibrary.refresh();
  return added;
}

async function pollAllFolders() {
  const folders = await getWatchedFolders();
  let totalAdded = 0;
  for (const { handle } of folders) {
    if (handle) {
      try {
        const added = await scanFolderForRoms(handle);
        totalAdded += added;
      } catch (err) {
        console.warn('Watch folder: scan failed', err);
        if (err?.message?.includes('quota') || err?.message?.includes('Storage')) {
          throw err;
        }
      }
    }
  }
  return totalAdded;
}

export function startWatching(enabled) {
  if (!isSupported()) return;

  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
  isWatching = false;

  if (enabled) {
    isWatching = true;
    pollAllFolders();
    pollTimer = setInterval(pollAllFolders, POLL_INTERVAL_MS);
  }
}

export function stopWatching() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
  isWatching = false;
}

export async function scanNow() {
  if (!isSupported()) return 0;
  return pollAllFolders();
}
