<script>
  import { get } from 'svelte/store';
  import { onMount, onDestroy } from 'svelte';
  import { currentView, previousView } from '$lib/stores/viewStore.js';
  import { currentGame, currentRomId } from '$lib/stores/gameStore.js';
  import { sidebarCollapsed } from '$lib/stores/sidebarStore.js';
  import Sidebar from '$lib/components/Sidebar.svelte';
  import HomeView from '$lib/components/HomeView.svelte';
  import EmulatorView from '$lib/components/EmulatorView.svelte';
  import PlayView from '$lib/components/PlayView.svelte';
  import DialogModal from '$lib/components/DialogModal.svelte';
  import RomDialogModal from '$lib/components/RomDialogModal.svelte';
  import SettingsModal from '$lib/components/SettingsModal.svelte';
  import {
    getEnabledSystemExtensions,
    initializeDreamcastSupport,
    loadRomFromLibrary,
    loadRomFromFile,
    stopEmulator,
    attemptAutoSaveRomState
  } from '$lib/services/emulator.js';
  import { stopGameAudio } from '$lib/services/audio.js';
  import { getSettings, getRomFromLibrary } from '$lib/services/storage.js';
  import { initRomStorage } from '$lib/services/romStorage.js';
  import { romLibrary } from '$lib/stores/romLibraryStore.js';
  import { uiScale } from '$lib/stores/uiScaleStore.js';
  import { startWatching } from '$lib/services/watchFolderService.js';
  import { enabledSystems, setDreamcastEnabled } from '$lib/stores/systemStore.js';

  let showRomDialog = false;
  let romDialogPreselected = '';
  let romFileInput = null;
  let pendingRomPick = { system: '', mode: 'import' };
  let storageReady = false;
  let romAccept = '';
  $: romAccept = [...new Set(Object.values(getEnabledSystemExtensions($enabledSystems)).flat())].join(',');

  function showView(view) {
    previousView.set($currentView);
    currentView.set(view);
  }

  function waitForPlayViewApi(timeoutMs = 5000) {
    return new Promise((resolve, reject) => {
      const deadline = Date.now() + timeoutMs;
      const check = () => {
        const fn = window.__playViewReady;
        if (fn) {
          const api = fn();
          if (api) {
            resolve(api);
            return;
          }
        }
        if (Date.now() >= deadline) {
          reject(new Error('Play view not ready in time'));
          return;
        }
        setTimeout(check, 50);
      };
      setTimeout(check, 0);
    });
  }

  async function handleLoadGame(id) {
    const romId = get(currentRomId);
    await attemptAutoSaveRomState(romId);
    stopEmulator();
    stopGameAudio();
    currentGame.set(id);
    currentRomId.set(null);
    showView('play');
  }

  async function handleLoadRom(id) {
    const romIdToSave = get(currentRomId);
    if (romIdToSave && romIdToSave !== id) await attemptAutoSaveRomState(romIdToSave);
    stopGameAudio();
    currentGame.set(null);
    currentRomId.set(id);
    showView('play');
    let playViewApi;
    try {
      playViewApi = await waitForPlayViewApi(5000);
    } catch {
      currentRomId.set(null);
      showView('emulator');
      return;
    }
    const rom = getRomFromLibrary(id);
    const romName = rom?.name || 'ROM';
    playViewApi?.setGameTitle?.(romName);
    playViewApi?.setCurrentRomSystem?.(rom?.system);
    playViewApi?.setEmulatorRunning?.(false);
    playViewApi?.refreshEmulatorCapabilities?.();
    playViewApi?.setRomInfo?.('Loading ROM…');
    const loaded = await loadRomFromLibrary(id, {
      onGameStart: () => {
        playViewApi?.setRomInfo?.(`Playing: ${romName}`);
        playViewApi?.setEmulatorRunning?.(true);
        playViewApi?.refreshEmulatorCapabilities?.();
      },
      onReady: async (opts) => {
        playViewApi?.setRomInfo?.(`Ready: ${romName}`);
        playViewApi?.setShowEmulator?.(true);
        playViewApi?.setShowPressStart?.(false);
        playViewApi?.setEmulatorRunning?.(true);
        playViewApi?.refreshEmulatorCapabilities?.();
        playViewApi?.applyResolution?.();
        await playViewApi?.promptResumeFromSave?.(opts);
      },
      onError: (msg) => {
        playViewApi?.setRomInfo?.(msg || 'Failed to load emulator');
        playViewApi?.setEmulatorRunning?.(false);
        playViewApi?.refreshEmulatorCapabilities?.();
        playViewApi?.setShowEmulator?.(false);
        playViewApi?.setShowPressStart?.(true);
        currentRomId.set(null);
        showView('emulator');
      }
    });
    if (!loaded) {
      playViewApi?.setEmulatorRunning?.(false);
      playViewApi?.refreshEmulatorCapabilities?.();
      playViewApi?.setShowEmulator?.(false);
      playViewApi?.setShowPressStart?.(true);
      currentRomId.set(null);
      showView('emulator');
      return;
    }
    playViewApi?.setEmulatorRunning?.(true);
    playViewApi?.refreshEmulatorCapabilities?.();
    playViewApi?.applyResolution?.();
  }

  function handleOpenRomDialog(system) {
    romDialogPreselected = system || '';
    showRomDialog = true;
  }

  function handleOpenSettings() {
    window.__openSettings?.();
  }

  function handleRomImport(system) {
    pendingRomPick = { system, mode: 'import' };
    showRomDialog = false;
    romFileInput?.click();
  }

  function handleRomRun(system) {
    pendingRomPick = { system, mode: 'run' };
    showRomDialog = false;
    romFileInput?.click();
  }

  let beforeunloadHandler = null;
  onMount(async () => {
    window.__stopEmulator = stopEmulator;
    beforeunloadHandler = () => {
      const romId = get(currentRomId);
      if (romId) attemptAutoSaveRomState(romId);
    };
    window.addEventListener('beforeunload', beforeunloadHandler);
    const dreamcastAvailable = await initializeDreamcastSupport();
    if (dreamcastAvailable) setDreamcastEnabled(true);
    await initRomStorage();
    romLibrary.refresh();
    storageReady = true;
    const settings = getSettings();
    uiScale.set(settings.uiScale ?? 1.15);
    startWatching(settings.watchFoldersEnabled ?? false);
  });

  onDestroy(() => {
    if (beforeunloadHandler) {
      window.removeEventListener('beforeunload', beforeunloadHandler);
      beforeunloadHandler = null;
    }
  });

  async function handleRomFileChange(e) {
    const romIdToSave = get(currentRomId);
    if (romIdToSave) await attemptAutoSaveRomState(romIdToSave);
    stopGameAudio();
    currentGame.set(null);
    currentRomId.set(null);
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    showView('play');
    let playViewApi;
    try {
      playViewApi = await waitForPlayViewApi(5000);
    } catch {
      showView('emulator');
      return;
    }
    playViewApi?.setRomInfo?.('Loading ROM…');
    playViewApi?.setCurrentRomSystem?.(pendingRomPick.system);
    playViewApi?.setEmulatorRunning?.(false);
    playViewApi?.refreshEmulatorCapabilities?.();
    const result = await loadRomFromFile(file, pendingRomPick.system, pendingRomPick.mode, {
      onGameStart: () => {
        playViewApi?.setRomInfo?.(`Playing: ${file.name}`);
        playViewApi?.setEmulatorRunning?.(true);
        playViewApi?.refreshEmulatorCapabilities?.();
      },
      onReady: async (opts) => {
        playViewApi?.setRomInfo?.(`Ready: ${file.name}`);
        playViewApi?.setShowEmulator?.(true);
        playViewApi?.setShowPressStart?.(false);
        playViewApi?.setEmulatorRunning?.(true);
        playViewApi?.refreshEmulatorCapabilities?.();
        playViewApi?.applyResolution?.();
        await playViewApi?.promptResumeFromSave?.(opts);
      },
      onError: (msg) => {
        playViewApi?.setRomInfo?.(msg || 'Failed to load emulator');
        playViewApi?.setEmulatorRunning?.(false);
        playViewApi?.refreshEmulatorCapabilities?.();
        playViewApi?.setShowEmulator?.(false);
        playViewApi?.setShowPressStart?.(true);
        currentRomId.set(null);
        showView('emulator');
      }
    });
    if (!result) {
      playViewApi?.setEmulatorRunning?.(false);
      playViewApi?.refreshEmulatorCapabilities?.();
      playViewApi?.setShowEmulator?.(false);
      playViewApi?.setShowPressStart?.(true);
      showView('emulator');
      return;
    }
    if (result.romId) currentRomId.set(result.romId);
    playViewApi?.setGameTitle?.(file.name.replace(/\.[^/.]+$/, ''));
    playViewApi?.setEmulatorRunning?.(true);
    playViewApi?.refreshEmulatorCapabilities?.();
    playViewApi?.applyResolution?.();
  }
</script>

<div class="app-container dither-bg" style="zoom: {$uiScale}">
  {#if storageReady}
  <Sidebar
    onLoadGame={handleLoadGame}
    onLoadRom={handleLoadRom}
    onOpenSettings={handleOpenSettings}
  />

  <main class="main-area" class:emulator-active={$currentView === 'emulator'} class:browse-mode={$currentView === 'home' || $currentView === 'emulator'} id="main-content" tabindex="-1">
    <div class="main-logo" class:visible={$sidebarCollapsed && $currentView !== 'emulator' && $currentView !== 'play'} aria-hidden="true">
      <img src="/logo-icon-48.png" alt="" class="main-logo-icon" aria-hidden="true" />
      <span class="logo-emu">Emu</span><span>Phoria</span>
    </div>
    {#if $currentView === 'home'}
      <HomeView onLoadGame={handleLoadGame} />
    {:else if $currentView === 'emulator'}
      <EmulatorView
        onLoadRom={handleLoadRom}
        onOpenRomDialog={handleOpenRomDialog}
      />
    {:else if $currentView === 'play'}
      <PlayView showView={showView} />
    {/if}
  </main>
  {:else}
  <div class="main-area" style="display: flex; align-items: center; justify-content: center; min-height: 100vh; color: var(--text-muted)">Loading...</div>
  {/if}
</div>

<input
  type="file"
  bind:this={romFileInput}
  id="romUpload"
  class="rom-upload"
  accept={romAccept}
  style="display: none"
  on:change={handleRomFileChange}
/>

<DialogModal />
{#if showRomDialog}
  <RomDialogModal
    preselectedSystem={romDialogPreselected}
    onClose={() => (showRomDialog = false)}
    onImport={handleRomImport}
    onRun={handleRomRun}
  />
{/if}
<SettingsModal />
