import { writable, derived } from 'svelte/store';
import { getSettings } from '$lib/services/storage.js';

const SCALE_OPTIONS = [
  { value: 1, label: '100%' },
  { value: 1.15, label: '115%' },
  { value: 1.25, label: '125%' },
  { value: 1.35, label: '135%' }
];

function createUiScaleStore() {
  const init = () => {
    const s = getSettings();
    return s.uiScale ?? 1.15;
  };

  const { subscribe, set, update } = writable(init());

  return {
    subscribe,
    set: (v) => {
      set(v);
    },
    init,
    options: SCALE_OPTIONS
  };
}

export const uiScale = createUiScaleStore();

export const uiScaleZoom = derived(uiScale, ($s) => $s);
