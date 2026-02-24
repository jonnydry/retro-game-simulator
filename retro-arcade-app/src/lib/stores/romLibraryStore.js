import { writable } from 'svelte/store';
import { getRomLibrary } from '$lib/services/storage.js';

function createRomLibraryStore() {
  const { subscribe, set, update } = writable(getRomLibrary());
  return {
    subscribe,
    refresh: () => set(getRomLibrary()),
    set
  };
}

export const romLibrary = createRomLibraryStore();
