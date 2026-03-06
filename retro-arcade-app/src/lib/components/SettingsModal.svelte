<script>
  import { getSettings, saveSettings, getSavedData, saveData } from '$lib/services/storage.js';
  import { setSoundEnabled, initAudio } from '$lib/services/audio.js';
  import { uiScale } from '$lib/stores/uiScaleStore.js';
  import { showConfirm } from '$lib/services/dialog.js';
  import {
    isSupported,
    getWatchedFolders,
    addWatchFolder,
    removeWatchFolder,
    startWatching,
    scanNow
  } from '$lib/services/watchFolderService.js';

  let soundEnabled = false;
  let showHints = true;
  let watchFoldersEnabled = false;
  let highScoresList = [];
  let watchedFoldersList = [];
  let watchFolderError = '';
  let scanStatus = '';

  const GAME_NAMES = { pong: 'Pong', snake: 'Snake', breakout: 'Breakout' };

  let showSettings = false;
  let gamepadStatusText = 'No gamepad connected';
  let gamepadConnected = false;
  let gamepadListenerCleanup = null;

  function open() {
    const settings = getSettings();
    soundEnabled = settings.soundEnabled ?? false;
    showHints = settings.showHints ?? true;
    uiScale.set(settings.uiScale ?? 1.25);
    watchFoldersEnabled = settings.watchFoldersEnabled ?? false;
    updateHighScoresList();
    updateGamepadStatus();
    loadWatchedFolders();
    showSettings = true;
    if (typeof window !== 'undefined') {
      window.addEventListener('gamepadconnected', updateGamepadStatus);
      window.addEventListener('gamepaddisconnected', updateGamepadStatus);
      gamepadListenerCleanup = () => {
        window.removeEventListener('gamepadconnected', updateGamepadStatus);
        window.removeEventListener('gamepaddisconnected', updateGamepadStatus);
        gamepadListenerCleanup = null;
      };
    }
  }

  function close() {
    showSettings = false;
    watchFolderError = '';
    scanStatus = '';
    if (gamepadListenerCleanup) {
      gamepadListenerCleanup();
    }
  }

  async function loadWatchedFolders() {
    if (isSupported()) {
      watchedFoldersList = await getWatchedFolders();
    }
  }

  function updateSettings(extra = {}) {
    const settings = { ...getSettings(), soundEnabled, showHints, watchFoldersEnabled, ...extra };
    saveSettings(settings);
    setSoundEnabled(soundEnabled);
    if (soundEnabled) initAudio();
    startWatching(settings.watchFoldersEnabled ?? false);
  }

  async function handleAddFolder() {
    watchFolderError = '';
    const result = await addWatchFolder();
    if (result.ok) {
      await loadWatchedFolders();
    } else if (!result.aborted) {
      watchFolderError = result.error || 'Failed to add folder';
    }
  }

  async function handleRemoveFolder(id) {
    await removeWatchFolder(id);
    await loadWatchedFolders();
  }

  async function handleScanNow() {
    scanStatus = 'Scanning...';
    try {
      const added = await scanNow();
      scanStatus = added > 0 ? `Added ${added} ROM(s)` : 'No new ROMs found';
    } catch (err) {
      scanStatus = err?.message?.includes('quota') || err?.message?.includes('Storage')
        ? 'Storage full - remove some ROMs to add more'
        : 'Scan failed';
    }
    setTimeout(() => (scanStatus = ''), 5000);
  }

  function updateHighScoresList() {
    const data = getSavedData();
    const scores = data.highScores || {};
    highScoresList = Object.entries(scores)
      .filter(([, v]) => v > 0)
      .map(([id, score]) => ({ id, score, name: GAME_NAMES[id] || id }));
  }

  function updateGamepadStatus() {
    const gamepads = navigator.getGamepads?.();
    const connected = [];
    if (gamepads) {
      for (const gp of gamepads) {
        if (gp) connected.push(gp.id.split('(')[0].trim() || 'Gamepad');
      }
    }
    gamepadConnected = connected.length > 0;
    gamepadStatusText = connected.length > 0 ? connected[0] + (connected.length > 1 ? ` +${connected.length - 1} more` : '') : 'No gamepad connected';
  }

  function handleScanGamepads() {
    updateGamepadStatus();
    if (!gamepadConnected && typeof window !== 'undefined') {
      let pollCount = 0;
      const maxPolls = 25;
      const poll = () => {
        pollCount++;
        updateGamepadStatus();
        if (!gamepadConnected && pollCount < maxPolls) {
          setTimeout(poll, 200);
        }
      };
      setTimeout(poll, 200);
    }
  }

  async function clearHighScores() {
    const ok = await showConfirm('Clear all high scores?');
    if (ok) {
      const data = getSavedData();
      data.highScores = {};
      saveData(data);
      updateHighScoresList();
    }
  }

  function handleBackdropKeydown(e) {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
      e.preventDefault();
      close();
    }
  }

  if (typeof window !== 'undefined') {
    window.__openSettings = open;
  }
</script>

{#if showSettings}
  <div class="settings-modal show" role="dialog" aria-modal="true">
    <div
      class="settings-backdrop"
      role="button"
      tabindex="0"
      aria-label="Close settings"
      on:click={close}
      on:keydown={handleBackdropKeydown}
    ></div>
    <div class="settings-panel">
      <div class="settings-header">
        <div>
          <p class="home-kicker settings-kicker">Control Deck</p>
          <h2>Settings</h2>
        </div>
        <button class="settings-close" on:click={close} aria-label="Close">×</button>
      </div>
      <div class="settings-content">
        <div class="settings-section settings-section-card">
          <h3>Audio</h3>
          <label class="settings-toggle">
            <span>Sound Effects</span>
            <input type="checkbox" bind:checked={soundEnabled} on:change={updateSettings} />
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div class="settings-section settings-section-card">
          <h3>Display</h3>
          <label class="settings-toggle">
            <span>Show Control Hints</span>
            <input type="checkbox" bind:checked={showHints} on:change={updateSettings} />
            <span class="toggle-slider"></span>
          </label>
          <label class="settings-row settings-row-spaced">
            <span>UI Scale</span>
            <select
              class="settings-select"
              value={$uiScale}
              on:change={(e) => {
                const v = parseFloat(e.currentTarget.value);
                uiScale.set(v);
                updateSettings({ uiScale: v });
              }}
            >
              {#each uiScale.options as opt}
                <option value={opt.value}>{opt.label}</option>
              {/each}
            </select>
          </label>
        </div>
        <div class="settings-section settings-section-card">
          <h3>ROM Folders</h3>
          <p class="settings-description settings-description-spaced">
            Automatically import new ROMs from local folders. Requires Chrome or Edge.
          </p>
          {#if !isSupported()}
            <p class="settings-description settings-description-secondary">File System Access API not supported in this browser.</p>
          {:else}
            <label class="settings-toggle">
              <span>Watch folders for new ROMs</span>
              <input type="checkbox" bind:checked={watchFoldersEnabled} on:change={() => updateSettings()} />
              <span class="toggle-slider"></span>
            </label>
            <div class="watch-folders-list settings-row-spaced">
              {#if watchedFoldersList.length === 0}
                <p class="settings-description settings-empty">No folders added yet. Click "Add Folder" to select a directory.</p>
              {:else}
              {#each watchedFoldersList as folder}
                <div class="watch-folder-item">
                  <span class="watch-folder-name">{folder.name}</span>
                  <button
                    type="button"
                    class="control-btn control-btn--small"
                    on:click={() => handleRemoveFolder(folder.id)}
                  >
                    Remove
                  </button>
                </div>
              {/each}
              {/if}
            </div>
            <div class="settings-actions">
              <button class="control-btn" on:click={handleAddFolder}>Add Folder</button>
              <button class="control-btn" on:click={handleScanNow}>
                Scan Now
              </button>
            </div>
            {#if watchFolderError}
              <p class="settings-description settings-status settings-status-error">{watchFolderError}</p>
            {/if}
            {#if scanStatus}
              <p class="settings-description settings-status settings-status-success">{scanStatus}</p>
            {/if}
          {/if}
        </div>
        <div class="settings-section settings-section-card">
          <h3>Gamepad</h3>
          <div class="gamepad-settings">
            <div class="gamepad-status" class:connected={gamepadConnected}>
              <span class="gamepad-status-dot" aria-hidden="true"></span>
              <span class="gamepad-status-text">{gamepadStatusText}</span>
            </div>
            <button
              class="control-btn control-btn--full settings-row-spaced"
              on:click={handleScanGamepads}
            >
              Scan for Gamepads
            </button>
            <p class="settings-note settings-note-spaced">
              If your gamepad doesn't appear: press any button or move a stick <em>while this page is open</em>, then click Scan again. Chrome and Edge require gamepad interaction before detecting it.
            </p>
            <p class="settings-note">
              Modern pads (Xbox, DualSense, Switch Pro/8BitDo) are supported through the browser Gamepad API.
            </p>
          </div>
        </div>
        <div class="settings-section settings-section-card">
          <h3>High Scores</h3>
          <div class="high-scores-list">
            {#if highScoresList.length === 0}
              <p class="settings-description settings-empty settings-empty-centered">
                No high scores yet
              </p>
            {:else}
              {#each highScoresList as { id, score, name }}
                <div class="high-score-item">
                  <span class="game-name">{name}</span>
                  <span class="score">{score}</span>
                </div>
              {/each}
            {/if}
          </div>
          <button class="control-btn settings-row-spaced" on:click={clearHighScores}>Clear All Scores</button>
        </div>
        <div class="settings-section settings-section-card">
          <h3>About</h3>
          <p class="settings-description settings-description-secondary">EmuPhoria v1.0<br />Classic games simulator</p>
        </div>
      </div>
    </div>
  </div>
{/if}
