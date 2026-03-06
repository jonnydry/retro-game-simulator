import { writable } from 'svelte/store';

export const currentView = writable('emulator'); // 'emulator' | 'play'
