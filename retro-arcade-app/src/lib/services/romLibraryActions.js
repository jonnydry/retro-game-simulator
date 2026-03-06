import { get } from 'svelte/store';
import { showConfirm } from '$lib/services/dialog.js';
import { clearSaveStateMeta, removeFromRomLibrary } from '$lib/services/storage.js';
import { stopGameAudio } from '$lib/services/audio.js';
import { stopEmulator } from '$lib/services/emulator.js';
import { currentView } from '$lib/stores/viewStore.js';
import { currentGame, currentRomId, isPaused, pendingRomLoadId, score } from '$lib/stores/gameStore.js';
import { romLibrary } from '$lib/stores/romLibraryStore.js';

export async function confirmAndRemoveRom(rom) {
  const ok = await showConfirm(`Remove "${rom.name}" from library?`);
  if (!ok) return false;

  await removeFromRomLibrary(rom.id);
  clearSaveStateMeta(rom.id);
  romLibrary.refresh();

  const isActiveRom = get(currentRomId) === rom.id;
  const isPendingRom = get(pendingRomLoadId) === rom.id;

  if (isActiveRom || isPendingRom) {
    stopGameAudio();
    stopEmulator();
    currentGame.set(null);
    currentRomId.set(null);
    pendingRomLoadId.set(null);
    isPaused.set(true);
    score.set(0);
    currentView.set('emulator');
  }

  return true;
}
