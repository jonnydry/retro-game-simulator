<script>
  import { get } from 'svelte/store';
  import { onMount, onDestroy } from 'svelte';
  import { currentView } from '$lib/stores/viewStore.js';
  import { currentGame, currentRomId, pendingRomLoadId } from '$lib/stores/gameStore.js';
  import { sidebarDrawerOpen } from '$lib/stores/sidebarStore.js';
  import Sidebar from '$lib/components/Sidebar.svelte';
  import EmulatorView from '$lib/components/EmulatorView.svelte';
  import PlayView from '$lib/components/PlayView.svelte';
  import DialogModal from '$lib/components/DialogModal.svelte';
  import RomDialogModal from '$lib/components/RomDialogModal.svelte';
  import SettingsModal from '$lib/components/SettingsModal.svelte';
  import ThemeTintSwitcher from '$lib/components/ThemeTintSwitcher.svelte';
  import DesktopBanner from '$lib/components/DesktopBanner.svelte';
  import { desktopBannerVisible } from '$lib/stores/desktopBannerStore.js';
  import {
    getEnabledSystemExtensions,
    getEmulatorInstance,
    getPendingRomId,
    getPendingResumeFromSave,
    initializeDreamcastSupport,
    loadRomFromLibrary,
    loadRomFromFile,
    stopEmulator,
    attemptAutoSaveRomState
  } from '$lib/services/emulator.js';
  import {
    clearPendingRomLoadAction,
    openSettingsModal,
    setPendingRomLoadAction,
    waitForPlayViewApi
  } from '$lib/services/appController.js';
  import { stopGameAudio } from '$lib/services/audio.js';
  import { showConfirm } from '$lib/services/dialog.js';
  import { getSettings, getRomFromLibrary, getSaveStateMeta } from '$lib/services/storage.js';
  import { initRomStorage } from '$lib/services/romStorage.js';
  import { applyTheme } from '$lib/services/theme.js';
  import { romLibrary } from '$lib/stores/romLibraryStore.js';
  import { uiScale } from '$lib/stores/uiScaleStore.js';
  import { setWatchingActive, startWatching } from '$lib/services/watchFolderService.js';
  import { enabledSystems, setDreamcastEnabled } from '$lib/stores/systemStore.js';
  import { isMobile } from '$lib/utils/mobile.js';
  import { normalizeRomDisplayName } from '$lib/utils/romName.js';

  if (typeof document !== 'undefined') {
    applyTheme(getSettings().theme);
  }

  function openDrawer() {
    sidebarDrawerOpen.set(true);
  }
  function closeDrawer() {
    sidebarDrawerOpen.set(false);
  }

  let showRomDialog = false;
  let romDialogPreselected = '';
  let romFileInput = null;
  let pendingRomPick = { system: '', mode: 'import' };
  let storageReady = false;
  let showSplash = true;
  let splashExiting = false;
  let romAccept = '';
  let activeSystemFilter = '';
  $: romAccept = [...new Set(Object.values(getEnabledSystemExtensions($enabledSystems)).flat())].join(',');

  function showView(view) {
    currentView.set(view);
  }

  function clearPendingRomLoad(action = null) {
    pendingRomLoadId.set(null);
    clearPendingRomLoadAction(action);
  }

  async function handleReturnToLibrary() {
    const romId = get(currentRomId);
    if (romId) {
      await attemptAutoSaveRomState(romId);
    }

    clearPendingRomLoad();
    stopGameAudio();
    stopEmulator();
    currentGame.set(null);
    currentRomId.set(null);
    showView('emulator');
  }

  async function handleLoadGame(id) {
    const romId = get(currentRomId);
    await attemptAutoSaveRomState(romId);
    clearPendingRomLoad();
    stopEmulator();
    stopGameAudio();
    currentGame.set(id);
    currentRomId.set(null);
    showView('play');
  }

  async function handleLoadRom(id, options = {}) {
    const { autoStart = false, resumeFromSave: forcedResumeFromSave = null } = options;
    const romIdToSave = get(currentRomId);
    if (romIdToSave) {
      await attemptAutoSaveRomState(romIdToSave);
    }
    clearPendingRomLoad();
    stopGameAudio();
    stopEmulator();
    currentGame.set(null);
    currentRomId.set(null);
    pendingRomLoadId.set(id);
    showView('play');

    const playViewApiPromise = waitForPlayViewApi(5000);
    let pendingLoadStarted = false;
    const startPendingLoad = async () => {
      if (pendingLoadStarted) {
        return;
      }
      pendingLoadStarted = true;
      let playViewApi;
      try {
        playViewApi = await playViewApiPromise;
      } catch {
        clearPendingRomLoad(startPendingLoad);
        currentRomId.set(null);
        showView('emulator');
        return;
      }

      clearPendingRomLoad(startPendingLoad);
      currentRomId.set(id);
      playViewApi?.setShowEmulator?.(true);
      playViewApi?.setRomInfo?.('Loading ROM…');
      const resumeFromSave = typeof forcedResumeFromSave === 'boolean'
        ? forcedResumeFromSave
        : getSaveStateMeta(id)
            ? await showConfirm('Resume from save state?')
            : false;
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
        },
        onError: (msg) => {
          clearPendingRomLoad();
          playViewApi?.setRomInfo?.(msg || 'Failed to load emulator');
          playViewApi?.setEmulatorRunning?.(false);
          playViewApi?.refreshEmulatorCapabilities?.();
          playViewApi?.setShowEmulator?.(false);
          playViewApi?.setShowPressStart?.(true);
          currentRomId.set(null);
          showView('emulator');
        }
      }, {
        resumeFromSave
      });
      if (loaded && typeof loaded === 'object' && loaded.needReload) {
        return;
      }
      if (!loaded) {
        clearPendingRomLoad(startPendingLoad);
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
    };

    setPendingRomLoadAction(startPendingLoad);

    let playViewApi;
    try {
      playViewApi = await playViewApiPromise;
    } catch {
      clearPendingRomLoad(startPendingLoad);
      currentRomId.set(null);
      showView('emulator');
      return;
    }

    const rom = getRomFromLibrary(id);
    const romName = rom?.name || 'ROM';
    playViewApi?.setShowEmulator?.(false);
    playViewApi?.setShowPressStart?.(false);
    playViewApi?.setEmulatorRunning?.(false);
    playViewApi?.refreshEmulatorCapabilities?.();
    playViewApi?.setGameTitle?.(romName);
    playViewApi?.setCurrentRomSystem?.(rom?.system);
    playViewApi?.setRomInfo?.('Click to load game');
    if (autoStart) {
      void startPendingLoad();
    }
  }

  function handleOpenRomDialog(system) {
    romDialogPreselected = system || '';
    showRomDialog = true;
  }

  function handleOpenSettings() {
    openSettingsModal();
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

  let autoSaveInFlight = null;
  let visibilityChangeHandler = null;
  let pageHideHandler = null;

  $: setWatchingActive($currentView !== 'play');

  async function queueBackgroundAutoSave() {
    const romId = get(currentRomId);
    if (!romId) return;
    if (autoSaveInFlight) return autoSaveInFlight;
    autoSaveInFlight = attemptAutoSaveRomState(romId).finally(() => {
      autoSaveInFlight = null;
    });
    return autoSaveInFlight;
  }

  async function runBootSequence() {
    // Boot sequence: show splash for 900ms, then fade out over 400ms
    await new Promise(resolve => setTimeout(resolve, 900));
    splashExiting = true;
    await new Promise(resolve => setTimeout(resolve, 400));
    showSplash = false;
  }

  onMount(async () => {
    visibilityChangeHandler = () => {
      if (document.visibilityState === 'hidden') {
        void queueBackgroundAutoSave();
      }
    };
    pageHideHandler = () => {
      void queueBackgroundAutoSave();
    };
    document.addEventListener('visibilitychange', visibilityChangeHandler);
    window.addEventListener('pagehide', pageHideHandler);

    // Start boot sequence and storage init in parallel
    const bootPromise = runBootSequence();
    
    await initRomStorage();
    romLibrary.refresh();
    storageReady = true;
    const settings = getSettings();
    uiScale.set(settings.uiScale ?? 1.25);
    startWatching(settings.watchFoldersEnabled ?? false);
    if (!isMobile()) {
      void initializeDreamcastSupport().then((dreamcastAvailable) => {
        if (dreamcastAvailable) setDreamcastEnabled(true);
      });
    }
    
    // Wait for boot sequence to complete
    await bootPromise;
    
    const pendingRomId = getPendingRomId();
    const pendingResumeFromSave = getPendingResumeFromSave();
    if (pendingRomId) {
      showView('play');
      setTimeout(() => handleLoadRom(pendingRomId, {
        autoStart: true,
        resumeFromSave: pendingResumeFromSave
      }), 0);
    }
  });

  onDestroy(() => {
    clearPendingRomLoad();
    if (visibilityChangeHandler) {
      document.removeEventListener('visibilitychange', visibilityChangeHandler);
      visibilityChangeHandler = null;
    }
    if (pageHideHandler) {
      window.removeEventListener('pagehide', pageHideHandler);
      pageHideHandler = null;
    }
  });

  async function handleRomFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const displayName = normalizeRomDisplayName(file.name);

    if (pendingRomPick.mode === 'import') {
      await loadRomFromFile(file, pendingRomPick.system, pendingRomPick.mode);
      return;
    }

    if (getEmulatorInstance()) {
      await loadRomFromFile(file, pendingRomPick.system, pendingRomPick.mode);
      return;
    }

    const romIdToSave = get(currentRomId);
    if (romIdToSave) await attemptAutoSaveRomState(romIdToSave);
    clearPendingRomLoad();
    stopGameAudio();
    currentGame.set(null);
    currentRomId.set(null);
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
    playViewApi?.setShowEmulator?.(true);
    const result = await loadRomFromFile(file, pendingRomPick.system, pendingRomPick.mode, {
      onGameStart: () => {
        playViewApi?.setRomInfo?.(`Playing: ${displayName}`);
        playViewApi?.setEmulatorRunning?.(true);
        playViewApi?.refreshEmulatorCapabilities?.();
      },
      onReady: async (opts) => {
        playViewApi?.setRomInfo?.(`Ready: ${displayName}`);
        playViewApi?.setShowEmulator?.(true);
        playViewApi?.setShowPressStart?.(false);
        playViewApi?.setEmulatorRunning?.(true);
        playViewApi?.refreshEmulatorCapabilities?.();
        playViewApi?.applyResolution?.();
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
      clearPendingRomLoad();
      playViewApi?.setEmulatorRunning?.(false);
      playViewApi?.refreshEmulatorCapabilities?.();
      playViewApi?.setShowEmulator?.(false);
      playViewApi?.setShowPressStart?.(true);
      showView('emulator');
      return;
    }
    if (result.needReload) {
      return;
    }
    if (result.romId) currentRomId.set(result.romId);
    playViewApi?.setCurrentRomSystem?.(result.system || pendingRomPick.system);
    playViewApi?.setGameTitle?.(result.displayName || displayName);
    playViewApi?.setEmulatorRunning?.(true);
    playViewApi?.refreshEmulatorCapabilities?.();
    playViewApi?.applyResolution?.();
  }
</script>

<div class="app-container dither-bg" class:banner-visible={$desktopBannerVisible} style="zoom: {$uiScale}; --ui-zoom: {$uiScale}">
  <DesktopBanner />
  {#if storageReady && !showSplash}
  <Sidebar
    onLoadGame={handleLoadGame}
    onLoadRom={handleLoadRom}
    onOpenSettings={handleOpenSettings}
    onShowLibrary={handleReturnToLibrary}
    onCloseDrawer={closeDrawer}
    onSystemFilter={(sys) => { activeSystemFilter = sys; }}
  />
  <div
    class="sidebar-drawer-backdrop"
    class:show={$sidebarDrawerOpen}
    role="button"
    tabindex="-1"
    aria-label="Close menu"
    on:click={closeDrawer}
    on:keydown={(e) => e.key === 'Enter' && closeDrawer()}
  ></div>

  <button
    class="mobile-hamburger"
    aria-label="Open menu"
    title="Open menu"
    on:click={openDrawer}
  >
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M3 6h18M3 12h18M3 18h18"/>
    </svg>
  </button>
  <main class="main-area" class:emulator-active={$currentView === 'emulator'} class:browse-mode={$currentView === 'emulator'} class:banner-offset={$desktopBannerVisible} id="main-content" tabindex="-1">
    {#if $currentView === 'emulator'}
      <div class="browse-topbar" class:banner-offset={$desktopBannerVisible}>
        <div class="browse-brand" aria-hidden="true">
          <img src="/logo-icon.png" alt="" class="browse-brand-icon" aria-hidden="true" />
          <span class="logo-emu">Emu</span><span>Phoria</span>
        </div>
        <div class="browse-actions">
          <button class="btn-import-rom" on:click={() => handleOpenRomDialog('')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
            </svg>
            Import ROM
          </button>
        </div>
      </div>
    {/if}
    {#if $currentView === 'emulator'}
      <EmulatorView
        onLoadRom={handleLoadRom}
        onOpenRomDialog={handleOpenRomDialog}
        systemFilter={activeSystemFilter}
      />
    {:else if $currentView === 'play'}
      <PlayView showView={showView} />
    {/if}
  </main>
  {/if}
  
  {#if showSplash}
  <div class="loading-splash" class:exiting={splashExiting}>
    <div class="loading-splash-scanlines"></div>
    <div class="loading-splash-vignette"></div>
    <div class="loading-splash-content">
      <div class="loading-splash-logo-container">
        <img src="/logo.png" alt="EmuPhoria" class="loading-splash-logo-full" />
        <div class="loading-splash-glitch"></div>
      </div>
      <div class="loading-splash-terminal">
        <div class="terminal-line">
          <span class="terminal-prompt">$</span>
          <span class="terminal-text" class:typing-complete={!splashExiting}>boot_sequence --retro</span>
          <span class="terminal-cursor" class:blink={!splashExiting}>_</span>
        </div>
        <div class="terminal-status">
          {#if splashExiting}
            <span class="status-ok">[READY]</span>
          {:else}
            <span class="status-loading">loading...</span>
          {/if}
        </div>
      </div>
    </div>
    <div class="loading-splash-grid"></div>
  </div>
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
