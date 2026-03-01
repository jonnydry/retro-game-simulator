import { writable } from 'svelte/store';
import { getSettings } from '$lib/services/storage.js';

const initial = (() => {
  try {
    return getSettings().sidebarCollapsed ?? true;
  } catch {
    return false;
  }
})();

export const sidebarCollapsed = writable(initial);
