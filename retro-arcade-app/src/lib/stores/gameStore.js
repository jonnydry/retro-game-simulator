import { writable } from 'svelte/store';

export const currentGame = writable(null); // 'pong' | 'snake' | 'breakout' | null (for ROM)
export const score = writable(0);
export const isPaused = writable(true);
export const gameLoop = writable(null); // RAF id for cleanup
export const keys = writable({});

export const BUILTIN_GAMES = [
  { id: 'pong', name: 'Pong', year: '1972', icon: '🏓', type: 'builtin' },
  { id: 'snake', name: 'Snake', year: '1976', icon: '🐍', type: 'builtin' },
  { id: 'breakout', name: 'Breakout', year: '1976', icon: '🧱', type: 'builtin' }
];
