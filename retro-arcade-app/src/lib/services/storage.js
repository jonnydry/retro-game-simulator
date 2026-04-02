import { writable, get } from 'svelte/store';
import { DEFAULT_THEME } from './theme.js';

const STORAGE_KEY = 'retroArcade_data';

export const DEFAULT_SETTINGS = Object.freeze({
  soundEnabled: false,
  showHints: true,
  resolution: 'auto',
  uiScale: 1.25,
  theme: DEFAULT_THEME,
  sidebarCollapsed: true,
  watchFoldersEnabled: false
});

function cloneSaveStateMeta(nextSaveStates) {
  if (!nextSaveStates || typeof nextSaveStates !== 'object') return {};

  const cloned = {};
  for (const [romId, slots] of Object.entries(nextSaveStates)) {
    cloned[romId] = slots && typeof slots === 'object' ? { ...slots } : {};
  }
  return cloned;
}

let saveStateMetaCache = null;

function getSaveStateMetaCache() {
  if (saveStateMetaCache === null) {
    saveStateMetaCache = cloneSaveStateMeta(getSavedData().saveStates);
  }
  return saveStateMetaCache;
}

export const saveStateMetaByRom = writable({});

function syncSaveStateMetaCache(nextSaveStates) {
  saveStateMetaCache = cloneSaveStateMeta(nextSaveStates);
  saveStateMetaByRom.set(saveStateMetaCache);
}

function ensureCacheInitialized() {
  const cache = getSaveStateMetaCache();
  const storeValue = get(saveStateMetaByRom);
  if (Object.keys(storeValue).length === 0 && Object.keys(cache).length > 0) {
    saveStateMetaByRom.set(cache);
  }
}

/** Sync reactive save-state metadata from localStorage (e.g. on boot for sidebar badges). */
export function hydrateSaveStateMetaStore() {
  ensureCacheInitialized();
}

export function getSavedData() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch (e) {
    return {};
  }
}

export function saveData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    syncSaveStateMetaCache(data.saveStates);
    return true;
  } catch (e) {
    if (e.name === 'QuotaExceededError') {
      console.warn('Storage quota exceeded');
    }
    return false;
  }
}

export { getRomLibrary, getRomFromLibrary, getRomBlob, addToRomLibrary, removeFromRomLibrary, updateRomLastPlayed } from './romStorage.js';

export function getHighScore(gameId) {
  const data = getSavedData();
  return data.highScores?.[gameId] || 0;
}

export function setHighScore(gameId, score) {
  const data = getSavedData();
  if (!data.highScores) data.highScores = {};
  if (score > (data.highScores[gameId] || 0)) {
    data.highScores[gameId] = score;
    saveData(data);
    return true;
  }
  return false;
}

export function getSettings() {
  const data = getSavedData();
  return {
    ...DEFAULT_SETTINGS,
    ...(data.settings || {})
  };
}

export function saveSettings(settings) {
  const data = getSavedData();
  data.settings = settings;
  return saveData(data);
}

/**
 * Save state metadata: { [romId]: { [slot]: savedAt } }
 * Tracks when user saved state for each ROM/slot so we can show indicators.
 */
export function getSaveStateMeta(romId) {
  ensureCacheInitialized();
  return getSaveStateMetaCache()[romId] || null;
}

export function setSaveStateMeta(romId, slot, savedAt = Date.now()) {
  const data = getSavedData();
  if (!data.saveStates) data.saveStates = {};
  if (!data.saveStates[romId]) data.saveStates[romId] = {};
  data.saveStates[romId][slot] = savedAt;
  const result = saveData(data);
  return result;
}

export function clearSaveStateMeta(romId, slot) {
  const data = getSavedData();
  if (!data.saveStates?.[romId]) return true;
  if (slot !== undefined) {
    delete data.saveStates[romId][slot];
    if (Object.keys(data.saveStates[romId]).length === 0) {
      delete data.saveStates[romId];
    }
  } else {
    delete data.saveStates[romId];
  }
  return saveData(data);
}

