import { writable } from 'svelte/store';
import { getSettings, saveSettings } from '$lib/services/storage.js';
import { applyTheme, DEFAULT_THEME, normalizeTheme } from '$lib/services/theme.js';

function readInitialTheme() {
  try {
    return normalizeTheme(getSettings().theme);
  } catch {
    return DEFAULT_THEME;
  }
}

const initialTheme = readInitialTheme();
const themeStore = writable(initialTheme);
let currentTheme = initialTheme;

if (typeof document !== 'undefined') {
  applyTheme(initialTheme);
}

themeStore.subscribe((value) => {
  currentTheme = value;
});

export const theme = {
  subscribe: themeStore.subscribe
};

export function setTheme(themeId) {
  const nextTheme = normalizeTheme(themeId);

  if (nextTheme === currentTheme) {
    return nextTheme;
  }

  currentTheme = nextTheme;
  themeStore.set(nextTheme);
  applyTheme(nextTheme);

  const settings = getSettings();
  if (settings.theme !== nextTheme) {
    saveSettings({
      ...settings,
      theme: nextTheme
    });
  }

  return nextTheme;
}
