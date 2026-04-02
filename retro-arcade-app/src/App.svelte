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
  import ErrorBoundary from '$lib/components/ErrorBoundary.svelte';
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
  import { getSettings, getRomFromLibrary, getSaveStateMeta, hydrateSaveStateMetaStore } from '$lib/services/storage.js';
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
    document.body.style.overflow = 'hidden';
  }
  function closeDrawer() {
    sidebarDrawerOpen.set(false);
    document.body.style.overflow = '';
  }

  let showRomDialog = false;
  let romDialogPreselected = '';
  let romFileInput = null;
  let pendingRomPick = { system: '', mode: 'import' };
  let storageReady = false;
  let showSplash = true;
  let splashExiting = false;
  let bootPhase = 0;
  let progress = 0;
  let skipRequested = false;
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

  function skipSplash() {
    if (skipRequested) return;
    skipRequested = true;
    bootPhase = 3;
    progress = 100;
    setTimeout(() => {
      splashExiting = true;
      setTimeout(() => {
        showSplash = false;
      }, 400);
    }, 200);
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

  // Boot sequence with more phases and storytelling - ~3.5 seconds
  async function runBootSequence() {
    const phases = [
      { phase: 0, duration: 400, targetProgress: 5 },      // 0-400ms: Initial power on
      { phase: 1, duration: 600, targetProgress: 30 },     // 400-1000ms: Memory check
      { phase: 2, duration: 800, targetProgress: 75 },     // 1000-1800ms: Loading cores
      { phase: 3, duration: 600, targetProgress: 95 },     // 1800-2400ms: Verifying systems
      { phase: 4, duration: 400, targetProgress: 100 },    // 2400-2800ms: Ready state
      { phase: 5, duration: 700, targetProgress: 100 },    // 2800-3500ms: Exit transition
    ];
    
    let lastProgress = 0;
    
    for (const { phase, duration, targetProgress: target } of phases) {
      if (skipRequested) break;
      bootPhase = phase;
      
      // Smooth progress animation during active phases
      if (phase >= 1 && phase <= 3) {
        const steps = 30;
        const stepDuration = duration / steps;
        const progressRange = target - lastProgress;
        
        for (let i = 0; i < steps; i++) {
          if (skipRequested) break;
          const easedProgress = easeOutCubic(i / steps);
          progress = Math.min(99, lastProgress + (progressRange * easedProgress));
          await new Promise(r => setTimeout(r, stepDuration));
        }
        lastProgress = target;
      } else {
        progress = target;
        await new Promise(r => setTimeout(r, duration));
        lastProgress = target;
      }
    }
    
    if (!skipRequested) {
      progress = 100;
      await new Promise(r => setTimeout(r, 300));
    }
    
    splashExiting = true;
    await new Promise(r => setTimeout(r, 500));
    showSplash = false;
  }
  
  // Easing function for smoother progress
  function easeOutCubic(x) {
    return 1 - Math.pow(1 - x, 3);
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
    hydrateSaveStateMetaStore();
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
      <ErrorBoundary>
        <EmulatorView
          onLoadRom={handleLoadRom}
          onOpenRomDialog={handleOpenRomDialog}
          systemFilter={activeSystemFilter}
        />
      </ErrorBoundary>
    {:else if $currentView === 'play'}
      <ErrorBoundary>
        <PlayView showView={showView} />
      </ErrorBoundary>
    {/if}
  </main>
  {/if}
  
  {#if showSplash}
  <div class="loading-splash" class:exiting={splashExiting}>
    <div class="loading-splash-scanlines"></div>
    <div class="loading-splash-vignette"></div>
    <div class="loading-splash-noise"></div>
    
    <!-- Matrix rain effect - simplified for performance -->
    <div class="matrix-rain" class:active={bootPhase >= 1 && bootPhase <= 3}>
      {#each Array(12) as _, i}
        <div class="matrix-column" style="
          --delay: {(i * 0.3) % 2}s;
          --speed: {1.5 + (i % 3) * 0.5}s;
          --left: {i * 8}%; 
        ">
          {#each Array(10) as __, j}
            <span class="matrix-char" style="--char-delay: {j * 0.08}s">{String.fromCharCode(48 + (i + j) % 10)}</span>
          {/each}
        </div>
      {/each}
    </div>
    
    <!-- Particle effects - reduced count -->
    <div class="particles-container">
      {#each Array(8) as _, i}
        <div class="particle" style="
          --delay: {(i * 0.5)}s; 
          --duration: {2.5 + (i % 3)}s; 
          --x: {20 + (i * 10)}%; 
          --y: {60 + (i * 5)}%;
          --size: {4 + (i % 3)}px;
        "></div>
      {/each}
    </div>
    
    <!-- Version badge with build info -->
    <div class="version-badge" class:visible={bootPhase >= 0}>
      <span class="version-label">EMU</span>
      <span class="version-number">v{__APP_VERSION__}</span>
      <span class="version-build">BUILD {__BUILD_HASH__}</span>
    </div>
    
    <!-- Easter egg: Hidden konami code hint -->
    <div class="konami-hint" class:visible={bootPhase >= 2}>
      ↑↑↓↓←→←→BA
    </div>
    
    <div class="loading-splash-content">
      <div class="loading-splash-logo-container" class:pulse={bootPhase >= 4}>
        <div class="logo-glow-ring"></div>
        <div class="logo-glow-ring ring-2"></div>
        <div class="logo-glow-ring ring-3"></div>
        <img src="https://emuphoria.com/logo-icon.png" alt="EmuPhoria" class="loading-splash-logo-full" />
        <div class="loading-splash-glitch"></div>
        {#if bootPhase >= 4}
          <div class="ready-indicator">
            <span class="ready-text">SYSTEM READY</span>
            <div class="ready-line"></div>
          </div>
        {/if}
      </div>
      
      <div class="loading-splash-terminal">
        <div class="terminal-header">
          <div class="terminal-controls">
            <span class="terminal-dot red"></span>
            <span class="terminal-dot yellow"></span>
            <span class="terminal-dot green"></span>
          </div>
          <span class="terminal-title">emu_boot_sequence</span>
          <span class="terminal-timestamp">{new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
        </div>
        <div class="terminal-body">
          <!-- Phase 0: Power on -->
          <div class="terminal-line" class:visible={bootPhase >= 0}>
            <span class="terminal-prompt">
              {#if bootPhase === 0}
                <span class="cursor-blink">_</span>
              {:else}
                ➜
              {/if}
            </span>
            <span class="terminal-command">power_on</span>
            <span class="terminal-status-badge" class:ok={bootPhase >= 1}>OK</span>
          </div>
          
          <!-- Phase 1: Memory check -->
          <div class="terminal-line" class:visible={bootPhase >= 1}>
            <span class="terminal-prompt">
              {#if bootPhase === 1}
                <span class="cursor-blink">_</span>
              {:else}
                ➜
              {/if}
            </span>
            <span class="terminal-command">check_memory</span>
          </div>
          {#if bootPhase >= 1}
            <div class="terminal-line indent memory-check" class:visible={bootPhase >= 1}>
              <span class="memory-text">{bootPhase >= 2 ? '64MB OK' : 'checking...'}</span>
              <span class="memory-bar">
                <span class="memory-fill" style="width: {Math.min(100, bootPhase >= 2 ? 100 : (progress / 30) * 100)}%"></span>
              </span>
            </div>
          {/if}
          
          <!-- Phase 2: Load cores -->
          <div class="terminal-line" class:visible={bootPhase >= 2}>
            <span class="terminal-prompt">
              {#if bootPhase === 2}
                <span class="cursor-blink">_</span>
              {:else}
                ➜
              {/if}
            </span>
            <span class="terminal-command">load_cores</span>
            <span class="terminal-args">--all --async</span>
          </div>
          {#if bootPhase >= 2}
            <div class="terminal-line indent">
              <span class="subsystem-list">
                {#if bootPhase === 2}
                  <span class="subsystem" class:active={progress < 35}>NES</span>
                  <span class="subsystem" class:active={progress >= 35 && progress < 50}>SNES</span>
                  <span class="subsystem" class:active={progress >= 50 && progress < 65}>GBA</span>
                  <span class="subsystem" class:active={progress >= 65 && progress < 80}>PSX</span>
                  <span class="subsystem" class:active={progress >= 80}>N64</span>
                {:else}
                  <span class="subsystem loaded">NES ✓</span>
                  <span class="subsystem loaded">SNES ✓</span>
                  <span class="subsystem loaded">GBA ✓</span>
                  <span class="subsystem loaded">PSX ✓</span>
                  <span class="subsystem loaded">N64 ✓</span>
                {/if}
              </span>
            </div>
          {/if}
          
          <!-- Phase 3: Verify -->
          <div class="terminal-line" class:visible={bootPhase >= 3}>
            <span class="terminal-prompt">
              {#if bootPhase === 3}
                <span class="cursor-blink">_</span>
              {:else}
                ➜
              {/if}
            </span>
            <span class="terminal-command">verify_systems</span>
            <span class="terminal-status-badge" class:ok={bootPhase >= 4}>OK</span>
          </div>
          {#if bootPhase >= 3}
            <div class="terminal-line indent verification" class:visible={bootPhase >= 3}>
              <span class="verify-item" class:checked={bootPhase >= 4}>✓</span>
              <span class="verify-text">all systems operational</span>
              {#if bootPhase >= 4}
                <span class="verify-time">({(2.8).toFixed(2)}s)</span>
              {/if}
            </div>
          {/if}
        </div>
        
        <!-- Progress bar -->
        <div class="terminal-progress">
          <div class="progress-label">
            <span class="progress-percent">{Math.round(progress)}%</span>
            <span class="status-text" class:ready={bootPhase >= 4}>
              {#if bootPhase === 0}
                INITIALIZING
              {:else if bootPhase === 1}
                MEMORY CHECK
              {:else if bootPhase === 2}
                LOADING CORES
              {:else if bootPhase === 3}
                VERIFYING
              {:else}
                READY
              {/if}
            </span>
          </div>
          <div class="progress-track">
            <div class="progress-fill" class:complete={bootPhase >= 4} style="width: {progress}%"></div>
            <div class="progress-glow" style="left: {progress}%"></div>
          </div>
        </div>
      </div>
      
      <button class="skip-button" on:click={skipSplash} class:visible={bootPhase >= 2}>
        <span class="skip-icon">⌫</span>
        <span>skip</span>
      </button>
    </div>
    
    <div class="loading-splash-grid"></div>
    
    <!-- Decorative corner elements -->
    <div class="corner corner-tl"></div>
    <div class="corner corner-tr"></div>
    <div class="corner corner-bl"></div>
    <div class="corner corner-br"></div>
    
    <!-- Frame border -->
    <div class="frame-border"></div>
    
    <!-- Tech decoration lines -->
    <div class="tech-line tech-line-left"></div>
    <div class="tech-line tech-line-right"></div>
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
