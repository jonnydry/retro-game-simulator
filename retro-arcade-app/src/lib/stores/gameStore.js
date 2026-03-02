import { writable } from 'svelte/store';

export const currentGame = writable(null); // 'pong' | 'snake' | 'breakout' | null (for ROM)
export const currentRomId = writable(null); // rom library id when playing a ROM
export const pendingRomLoadId = writable(null); // ROM to load after user clicks (ensures focus before decompression)
export const score = writable(0);
export const isPaused = writable(true);
export const keys = writable({});
export const saveStateRefreshTrigger = writable(0); // bump to refresh save state indicators in sidebar/emulator view

export const BUILTIN_GAMES = [
  { id: 'pong', name: 'Pong', year: '1972', icon: '🏓', type: 'builtin' },
  { id: 'snake', name: 'Snake', year: '1976', icon: '🐍', type: 'builtin' },
  { id: 'breakout', name: 'Breakout', year: '1976', icon: '🧱', type: 'builtin' }
];
