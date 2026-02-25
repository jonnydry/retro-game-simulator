const STORAGE_KEY = 'retroArcade_data';

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
  return data.settings || {
    soundEnabled: false,
    showHints: true,
    difficulty: 'normal',
    resolution: 'auto',
    uiScale: 1.15,
    sidebarCollapsed: true,
    myGamesExpanded: false,
    watchFoldersEnabled: false
  };
}

export function saveSettings(settings) {
  const data = getSavedData();
  data.settings = settings;
  return saveData(data);
}

