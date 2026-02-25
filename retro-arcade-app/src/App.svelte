<script>
  import { onMount } from 'svelte';
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

  function handleLoadGame(id) {
    stopEmulator();
    stopGameAudio();
    currentGame.set(id);
    currentRomId.set(null);
    showView('play');
  }

  async function handleLoadRom(id) {
    stopGameAudio();
    currentGame.set(null);
    currentRomId.set(id);
    showView('play');
    const playViewApi = await new Promise((resolve) => {
      const check = () => {
        const fn = window.__playViewReady;
        if (fn) {
          const api = fn();
          if (api) resolve(api);
          else setTimeout(check, 50);
        } else setTimeout(check, 50);
      };
      setTimeout(check, 0);
    });
    const rom = getRomFromLibrary(id);
    const romName = rom?.name || 'ROM';
    playViewApi?.setGameTitle?.(romName);
    playViewApi?.setCurrentRomSystem?.(rom?.system);
    playViewApi?.setEmulatorRunning?.(false);
    playViewApi?.refreshEmulatorCapabilities?.();
    const loaded = await loadRomFromLibrary(id, {
      onGameStart: () => {
        playViewApi?.setRomInfo?.(`Playing: ${romName}`);
        playViewApi?.setEmulatorRunning?.(true);
        playViewApi?.refreshEmulatorCapabilities?.();
      },
      onReady: async () => {
        playViewApi?.setRomInfo?.(`Ready: ${romName}`);
        playViewApi?.setEmulatorRunning?.(true);
        playViewApi?.refreshEmulatorCapabilities?.();
        playViewApi?.applyResolution?.();
        await playViewApi?.promptResumeFromSave?.();
      },
      onError: (msg) => {
        playViewApi?.setRomInfo?.(msg || 'Error');
        playViewApi?.setEmulatorRunning?.(false);
        playViewApi?.refreshEmulatorCapabilities?.();
      }
    });
    if (!loaded) {
      playViewApi?.setEmulatorRunning?.(false);
      playViewApi?.refreshEmulatorCapabilities?.();
      playViewApi?.setShowEmulator?.(false);
      playViewApi?.setShowPressStart?.(true);
      showView('emulator');
      return;
    }
    playViewApi?.setShowEmulator?.(true);
    playViewApi?.setShowPressStart?.(false);
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

  onMount(async () => {
    window.__stopEmulator = stopEmulator;
    const dreamcastAvailable = await initializeDreamcastSupport();
    setDreamcastEnabled(dreamcastAvailable);
    await initRomStorage();
    romLibrary.refresh();
    storageReady = true;
    const settings = getSettings();
    uiScale.set(settings.uiScale ?? 1.15);
    startWatching(settings.watchFoldersEnabled ?? false);
  });

  async function handleRomFileChange(e) {
    stopGameAudio();
    currentGame.set(null);
    currentRomId.set(null);
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    showView('play');
    const playViewApi = await new Promise((resolve) => {
      const check = () => {
        if (window.__playViewReady) {
          const api = window.__playViewReady();
          if (api) resolve(api);
          else setTimeout(check, 50);
        } else setTimeout(check, 50);
      };
      setTimeout(check, 0);
    });
    playViewApi?.setCurrentRomSystem?.(pendingRomPick.system);
    playViewApi?.setEmulatorRunning?.(false);
    playViewApi?.refreshEmulatorCapabilities?.();
    const result = await loadRomFromFile(file, pendingRomPick.system, pendingRomPick.mode, {
      onGameStart: () => {
        playViewApi?.setRomInfo?.(`Playing: ${file.name}`);
        playViewApi?.setEmulatorRunning?.(true);
        playViewApi?.refreshEmulatorCapabilities?.();
      },
      onReady: async () => {
        playViewApi?.setRomInfo?.(`Ready: ${file.name}`);
        playViewApi?.setEmulatorRunning?.(true);
        playViewApi?.refreshEmulatorCapabilities?.();
        playViewApi?.applyResolution?.();
        await playViewApi?.promptResumeFromSave?.();
      },
      onError: (msg) => {
        playViewApi?.setRomInfo?.(msg || 'Error');
        playViewApi?.setEmulatorRunning?.(false);
        playViewApi?.refreshEmulatorCapabilities?.();
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
    playViewApi?.setShowEmulator?.(true);
    playViewApi?.setGameTitle?.(file.name.replace(/\.[^/.]+$/, ''));
    playViewApi?.setShowPressStart?.(false);
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
