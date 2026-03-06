import { writable } from 'svelte/store';

const CLOSED_DIALOG_STATE = {
  open: false,
  message: '',
  title: null,
  isConfirm: false,
  resolve: null
};

export const dialogState = writable(CLOSED_DIALOG_STATE);

export function showAlert(message, title = 'Notice') {
  return new Promise((resolve) => {
    dialogState.set({
      open: true,
      message,
      title,
      isConfirm: false,
      resolve: (r) => {
        resolve(r);
        dialogState.set(CLOSED_DIALOG_STATE);
      }
    });
  });
}

export function showConfirm(message, title = 'Confirm') {
  return new Promise((resolve) => {
    dialogState.set({
      open: true,
      message,
      title,
      isConfirm: true,
      resolve: (r) => {
        resolve(r);
        dialogState.set(CLOSED_DIALOG_STATE);
      }
    });
  });
}
