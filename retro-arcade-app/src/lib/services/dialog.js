import { writable } from 'svelte/store';

export const dialogState = writable({
  open: false,
  message: '',
  title: null,
  isConfirm: false,
  resolve: null
});

export function showAlert(message) {
  return new Promise((resolve) => {
    dialogState.set({
      open: true,
      message,
      title: null,
      isConfirm: false,
      resolve: (r) => { resolve(r); dialogState.set({ open: false }); }
    });
  });
}

export function showConfirm(message) {
  return new Promise((resolve) => {
    dialogState.set({
      open: true,
      message,
      title: null,
      isConfirm: true,
      resolve: (r) => { resolve(r); dialogState.set({ open: false }); }
    });
  });
}
