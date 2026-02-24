<script>
  import { onMount, onDestroy } from 'svelte';
  import { get } from 'svelte/store';
  import { currentView, previousView } from '$lib/stores/viewStore.js';
  import {
    currentGame,
    score,
    isPaused,
    keys as keysStore,
    BUILTIN_GAMES
  } from '$lib/stores/gameStore.js';
  import { getSettings } from '$lib/services/storage.js';
  import { setSoundEnabled, initAudio, playSound, stopGameAudio, resumeGameAudio, isSoundEnabled } from '$lib/services/audio.js';
  import { setHighScore } from '$lib/services/storage.js';
  import { runGame } from '$lib/games/gameRunner.js';
  import { nativeResolutions } from '$lib/config/systems.js';
  import { saveSettings } from '$lib/services/storage.js';
  import {
    emptyEmulatorCapabilities,
    getEmulatorCapabilities,
    loadEmulatorState,
    openEmulatorMenu,
    resetEmulator,
    saveEmulatorState,
    setEmulatorPaused,
    setEmulatorVolume
  } from '$lib/services/emulator.js';

  export let showView = (v) => {};

  let canvasEl = null;
  let crtFrameEl = null;
  let emulatorEl = null;
  let gameOver = false;
  let showPressStart = true;
  let showGameOver = false;
  let finalScore = 0;
  let newHighScore = false;
  let romInfo = '';
  let gameTitle = 'Select a Game';
  let soundOn = false;
  let resolution = 'auto';
  let showEmulator = false;
  let emulatorContainerEl = null;
  let showControlsGuide = false;
  let isEmulatorRunning = false;
  let currentRomSystem = null; // e.g. 'gba', 'nes' when ROM is running
  let theaterMode = false;
  let onGlobalKeydown = null;
  let emulatorCapabilities = emptyEmulatorCapabilities;
  let emulatorCapabilityPoll = null;

  const BUILTIN_IDS = ['pong', 'snake', 'breakout'];

  function getResolutionSize(system) {
    const native = nativeResolutions[system] || nativeResolutions.builtin;
    if (resolution === 'auto') return null;
    const scale = parseInt(resolution) || 1;
    return { width: native.width * scale, height: native.height * scale };
  }

  function applyResolution() {
    if (!crtFrameEl) return;

    if (showEmulator && currentRomSystem) {
      const size = getResolutionSize(currentRomSystem);
      if (size && emulatorEl) {
        emulatorEl.style.width = size.width + 'px';
        emulatorEl.style.height = size.height + 'px';
        emulatorEl.style.maxWidth = size.width + 'px';
        emulatorEl.style.maxHeight = size.height + 'px';
        crtFrameEl.style.maxWidth = size.width + 'px';
        crtFrameEl.style.maxHeight = size.height + 'px';
      } else if (emulatorEl) {
        emulatorEl.style.width = '100%';
        emulatorEl.style.height = '100%';
        emulatorEl.style.maxWidth = '100%';
        emulatorEl.style.maxHeight = '100%';
        crtFrameEl.style.maxWidth = '100%';
        crtFrameEl.style.maxHeight = '100%';
      }
    } else {
      const size = getResolutionSize('builtin');
      if (canvasEl) {
        canvasEl.width = 640;
        canvasEl.height = 480;
      }
      if (size) {
        crtFrameEl.style.maxWidth = size.width + 'px';
        crtFrameEl.style.maxHeight = size.height + 'px';
      } else {
        crtFrameEl.style.maxWidth = '100%';
        crtFrameEl.style.maxHeight = '100%';
      }
    }
  }

  $: isBuiltinGame = $currentGame && BUILTIN_IDS.includes($currentGame);
  $: gameInfo = BUILTIN_GAMES.find((g) => g.id === $currentGame);
  $: if ($currentGame && BUILTIN_IDS.includes($currentGame)) {
    showEmulator = false;
    currentRomSystem = null;
    isEmulatorRunning = false;
    emulatorCapabilities = emptyEmulatorCapabilities;
  }

  $: if (gameInfo) gameTitle = gameInfo.name;
  $: keyboardHint =
    $currentGame === 'breakout'
      ? 'Press SPACE to launch'
      : `Press SPACE to ${$isPaused ? 'start' : 'pause'}`;

  const CONTROL_GUIDES = {
    pong: [
      { keys: ['↑', '↓'], action: 'Move paddle' },
      { keys: ['SPACE'], action: 'Start/Pause' }
    ],
    snake: [
      { keys: ['↑', '↓', '←', '→'], action: 'Move snake' },
      { keys: ['SPACE'], action: 'Start/Pause' }
    ],
    breakout: [
      { keys: ['←', '→'], action: 'Move paddle' },
      { keys: ['SPACE'], action: 'Launch ball' },
      { keys: ['SPACE'], action: 'Start/Pause' }
    ]
  };

  function updateControlsGuide() {
    const settings = getSettings();
    showControlsGuide = (settings.showHints ?? true) && !!$currentGame;
  }

  function refreshEmulatorCapabilities() {
    emulatorCapabilities = showEmulator ? getEmulatorCapabilities() : emptyEmulatorCapabilities;
  }

  function togglePause() {
    if (showEmulator) {
      const next = !$isPaused;
      if (!setEmulatorPaused(next)) return;
      isPaused.set(next);
      refreshEmulatorCapabilities();
      return;
    }
    let next = false;
    isPaused.update((p) => {
      next = !p;
      playSound(next ? 'pause' : 'start');
      return next;
    });
  }

  function toggleSound() {
    soundOn = !soundOn;
    setSoundEnabled(soundOn);
    if (showEmulator) {
      setEmulatorVolume(soundOn ? 1 : 0);
      refreshEmulatorCapabilities();
    }
    const settings = getSettings();
    settings.soundEnabled = soundOn;
    saveSettings(settings);
    if (soundOn) initAudio();
  }

  function handleEmulatorReset() {
    if (!resetEmulator()) {
      romInfo = 'Reset control unavailable for this emulator core.';
      return;
    }
    isPaused.set(false);
    refreshEmulatorCapabilities();
  }

  function handleEmulatorSaveState() {
    if (!saveEmulatorState(0)) {
      romInfo = 'Save state is unavailable for this emulator core.';
      return;
    }
    romInfo = 'Saved state slot 1';
    refreshEmulatorCapabilities();
  }

  function handleEmulatorLoadState() {
    if (!loadEmulatorState(0)) {
      romInfo = 'Load state is unavailable for this emulator core.';
      return;
    }
    romInfo = 'Loaded state slot 1';
    isPaused.set(false);
    refreshEmulatorCapabilities();
  }

  function handleEmulatorMenu() {
    if (!openEmulatorMenu()) {
      romInfo = 'Emulator menu could not be opened.';
      return;
    }
    refreshEmulatorCapabilities();
  }

  function syncTheaterClass() {
    const appRoot = document.querySelector('.app-container');
    if (appRoot) appRoot.classList.toggle('theater-mode', theaterMode);
  }

  function closeTheaterMode() {
    if (!theaterMode) return;
    theaterMode = false;
    syncTheaterClass();
  }

  function toggleTheaterMode() {
    theaterMode = !theaterMode;
    syncTheaterClass();
  }

  function exitGame() {
    closeTheaterMode();
    stopGameAudio();
    window.__stopEmulator?.();
    currentGame.set(null);
    isPaused.set(true);
    score.set(0);
    showPressStart = true;
    showGameOver = false;
    showEmulator = false;
    isEmulatorRunning = false;
    emulatorCapabilities = emptyEmulatorCapabilities;
    currentRomSystem = null;
    showView($previousView ?? 'home');
  }

  function showGameOverOverlay() {
    const s = $score;
    newHighScore = setHighScore($currentGame, s);
    finalScore = s;
    showGameOver = true;
    isPaused.set(true);
  }

  function restartGame() {
    showGameOver = false;
    if (isBuiltinGame) {
      score.set(0);
      window.__restartBuiltinGame?.();
    }
  }

  let gameLoopCleanup = null;

  $: if (canvasEl && $currentGame && BUILTIN_IDS.includes($currentGame) && !showGameOver) {
    if (gameLoopCleanup) {
      gameLoopCleanup();
      gameLoopCleanup = null;
    }
    showPressStart = false;
    isPaused.set(false);
    score.set(0);
    if (isSoundEnabled()) resumeGameAudio();
    gameLoopCleanup = runGame(
      $currentGame,
      canvasEl,
      () => get(keysStore),
      (s) => score.set(s),
      showGameOverOverlay,
      () => get(isPaused)
    );
  } else if (gameLoopCleanup) {
    gameLoopCleanup();
    gameLoopCleanup = null;
    stopGameAudio();
  }

  $: resolution, showEmulator, currentRomSystem, $currentGame, applyResolution();
  $: if (showEmulator) {
    refreshEmulatorCapabilities();
    if (!emulatorCapabilityPoll) {
      emulatorCapabilityPoll = setInterval(refreshEmulatorCapabilities, 1000);
    }
  } else if (emulatorCapabilityPoll) {
    clearInterval(emulatorCapabilityPoll);
    emulatorCapabilityPoll = null;
  }

  onMount(() => {
    const settings = getSettings();
    soundOn = settings.soundEnabled ?? false;
    resolution = settings.resolution ?? 'auto';
    setSoundEnabled(soundOn);
    if (soundOn) initAudio();
    updateControlsGuide();
    const api = {
      canvas: () => canvasEl,
      emulatorContainer: () => emulatorContainerEl,
      setRomInfo: (text) => (romInfo = text),
      setGameTitle: (text) => (gameTitle = text),
      setShowEmulator: (v) => {
        showEmulator = v;
        isPaused.set(!v);
        if (!v) {
          currentRomSystem = null;
          isEmulatorRunning = false;
          emulatorCapabilities = emptyEmulatorCapabilities;
        }
        refreshEmulatorCapabilities();
      },
      setShowPressStart: (v) => (showPressStart = v),
      setCurrentRomSystem: (sys) => (currentRomSystem = sys),
      showGameOverOverlay,
      updateControlsGuide,
      setEmulatorRunning: (v) => {
        isEmulatorRunning = v;
        refreshEmulatorCapabilities();
      },
      refreshEmulatorCapabilities,
      applyResolution
    };
    window.__playViewReady = () => api;
    window.__togglePause = togglePause;
    window.__restartBuiltinGame = () => {
      showGameOver = false;
      score.set(0);
      if (gameLoopCleanup) gameLoopCleanup();
      gameLoopCleanup = null;
    };
    onGlobalKeydown = (e) => {
      if (e.key === 'Escape' && theaterMode) {
        e.preventDefault();
        closeTheaterMode();
      }
    };
    document.addEventListener('keydown', onGlobalKeydown);
    refreshEmulatorCapabilities();
  });

  onDestroy(() => {
    closeTheaterMode();
    if (gameLoopCleanup) gameLoopCleanup();
    gameLoopCleanup = null;
    stopGameAudio();
    if (onGlobalKeydown) {
      document.removeEventListener('keydown', onGlobalKeydown);
      onGlobalKeydown = null;
    }
    if (emulatorCapabilityPoll) {
      clearInterval(emulatorCapabilityPoll);
      emulatorCapabilityPoll = null;
    }
    window.__stopEmulator?.();
    window.__playViewReady = null;
    window.__togglePause = null;
    window.__restartBuiltinGame = null;
  });
</script>

<div class="main-view gameplay-view" class:theater-mode={theaterMode} style="display: flex; flex-direction: column; flex: 1;">
  {#if theaterMode}
    <button
      type="button"
      class="theater-overlay"
      aria-label="Exit theater mode"
      on:click={closeTheaterMode}
    ></button>
  {/if}
  <div class="game-header">
    <h1 class="game-title">{gameTitle}</h1>
    <div class="score-display">SCORE<span>{$score}</span></div>
    {#if romInfo}
      <span style="font-size: 12px; margin-left: 12px; color: var(--text-secondary)">{romInfo}</span>
    {/if}
  </div>
  <div class="game-container">
    <div class="scanline-effect"></div>
    <div class="game-frame" id="crtFrame" bind:this={crtFrameEl}>
      <canvas
        bind:this={canvasEl}
        id="gameCanvas"
        width="640"
        height="480"
        aria-label="Game display"
        style="display: {showEmulator ? 'none' : 'block'}"
      ></canvas>
      <div class="press-start" class:show={showPressStart && $currentGame && !showGameOver}>
        <div class="press-start-text">PRESS START</div>
        <div class="coin-slot">◄ INSERT COIN ►</div>
      </div>
      <div class="game-over" class:show={showGameOver}>
        <h2>GAME OVER</h2>
        <p>Final Score: <span>{finalScore}</span></p>
        {#if newHighScore}
          <div class="new-high-score">NEW HIGH SCORE!</div>
        {/if}
        <button class="restart-btn" on:click={restartGame}>Play Again</button>
      </div>
      <div
        class="emulator-container"
        class:active={showEmulator}
        style="display: {showEmulator ? 'flex' : 'none'}"
        bind:this={emulatorContainerEl}
      >
        <div id="emulator" bind:this={emulatorEl}></div>
      </div>
    </div>
  </div>
  <div class="controls-bar">
    <button class="control-btn" on:click={togglePause} aria-label="Start or pause game">
      <span>{$isPaused ? '▶' : '⏸'}</span>
      <span>{$isPaused ? 'START' : 'PAUSE'}</span>
    </button>
    <button
      class="control-btn"
      class:active={soundOn}
      on:click={toggleSound}
      aria-label="Toggle sound effects"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M11 5L6 9H2v6h4l5 4V5zM23 9l-6 6M17 9l6 6" />
      </svg>
      <span>Sound {soundOn ? 'On' : 'Off'}</span>
    </button>
    {#if showEmulator}
      <button
        class="control-btn"
        on:click={handleEmulatorReset}
        aria-label="Reset emulator game"
        disabled={!emulatorCapabilities.canReset}
      >
        Reset
      </button>
      <button
        class="control-btn"
        on:click={handleEmulatorSaveState}
        aria-label="Save state slot one"
        disabled={!emulatorCapabilities.canSaveState}
      >
        Save
      </button>
      <button
        class="control-btn"
        on:click={handleEmulatorLoadState}
        aria-label="Load state slot one"
        disabled={!emulatorCapabilities.canLoadState}
      >
        Load
      </button>
      <button
        class="control-btn"
        on:click={handleEmulatorMenu}
        aria-label="Open emulator controls menu"
        disabled={!emulatorCapabilities.canOpenMenu}
      >
        Menu
      </button>
    {/if}
    <button
      class="control-btn"
      class:active={theaterMode}
      on:click={toggleTheaterMode}
      aria-label="Toggle theater mode"
      aria-pressed={theaterMode}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path
          d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3"
        />
      </svg>
      Theater {theaterMode ? 'On' : 'Off'}
    </button>
    <button class="control-btn" on:click={exitGame} aria-label="Exit to menu">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
      </svg>
      Exit
    </button>
    <select
      class="resolution-select"
      aria-label="Select resolution scale"
      bind:value={resolution}
      on:change={() => {
        const s = getSettings();
        s.resolution = resolution;
        saveSettings(s);
        applyResolution();
      }}
    >
      <option value="auto">Auto Fit</option>
      <option value="1x">1x (Native)</option>
      <option value="2x">2x</option>
      <option value="3x">3x</option>
      <option value="4x">4x</option>
    </select>
    <span class="keyboard-hint">{keyboardHint}</span>
  </div>
  {#if showControlsGuide && $currentGame}
    <div class="controls-guide show">
      <h4>Controls</h4>
      <div class="controls-grid">
        {#each (CONTROL_GUIDES[$currentGame] || []) as c}
          <div class="control-item">
            {#each c.keys as k}
              <span class="key">{k}</span>
            {/each}
            <span>{c.action}</span>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>
