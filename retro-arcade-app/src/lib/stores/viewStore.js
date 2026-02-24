import { writable } from 'svelte/store';

export const currentView = writable('emulator'); // 'home' | 'emulator' | 'play'
export const previousView = writable('emulator');
