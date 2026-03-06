import { writable } from 'svelte/store';
import { DEFAULT_THEME } from './theme.js';

const STORAGE_KEY = 'retroArcade_data';

export const DEFAULT_SETTINGS = Object.freeze({
  soundEnabled: false,
  showHints: true,
  resolution: 'auto',
  uiScale: 1.25,
  theme: DEFAULT_THEME,
  sidebarCollapsed: false,
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

let saveStateMetaCache = cloneSaveStateMeta(getSavedData().saveStates);

export const saveStateMetaByRom = writable(saveStateMetaCache);

function syncSaveStateMetaCache(nextSaveStates) {
  saveStateMetaCache = cloneSaveStateMeta(nextSaveStates);
  saveStateMetaByRom.set(saveStateMetaCache);
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
  return saveStateMetaCache[romId] || null;
}

export function setSaveStateMeta(romId, slot, savedAt = Date.now()) {
  const data = getSavedData();
  if (!data.saveStates) data.saveStates = {};
  if (!data.saveStates[romId]) data.saveStates[romId] = {};
  data.saveStates[romId][slot] = savedAt;
  return saveData(data);
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

