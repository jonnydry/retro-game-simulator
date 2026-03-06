import { writable } from 'svelte/store';
import { DEFAULT_SETTINGS, getSettings } from '$lib/services/storage.js';

const initial = (() => {
  try {
    return getSettings().sidebarCollapsed;
  } catch {
    return DEFAULT_SETTINGS.sidebarCollapsed;
  }
})();

export const sidebarCollapsed = writable(initial);
export const sidebarDrawerOpen = writable(false);
