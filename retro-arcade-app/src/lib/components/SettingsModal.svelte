<script>
  import { getSettings, saveSettings, getSavedData, saveData } from '$lib/services/storage.js';
  import { setSoundEnabled, initAudio } from '$lib/services/audio.js';
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

  function open() {
    const settings = getSettings();
    soundEnabled = settings.soundEnabled ?? false;
    showHints = settings.showHints ?? true;
    watchFoldersEnabled = settings.watchFoldersEnabled ?? false;
    updateHighScoresList();
    updateGamepadStatus();
    loadWatchedFolders();
    showSettings = true;
  }

  function close() {
    showSettings = false;
    watchFolderError = '';
    scanStatus = '';
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
    gamepadStatusText = connected.length > 0 ? connected[0] + (connected.length > 1 ? ` +${connected.length - 1} more` : '') : 'No gamepad connected';
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
        <h2>Settings</h2>
        <button class="settings-close" on:click={close} aria-label="Close">×</button>
      </div>
      <div class="settings-content">
        <div class="settings-section">
          <h3>Audio</h3>
          <label class="settings-toggle">
            <span>Sound Effects</span>
            <input type="checkbox" bind:checked={soundEnabled} on:change={updateSettings} />
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div class="settings-section">
          <h3>Display</h3>
          <label class="settings-toggle">
            <span>Show Control Hints</span>
            <input type="checkbox" bind:checked={showHints} on:change={updateSettings} />
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div class="settings-section">
          <h3>ROM Folders</h3>
          <p style="color: var(--text-muted); font-size: 12px; margin-bottom: 10px">
            Automatically import new ROMs from local folders. Requires Chrome or Edge.
          </p>
          {#if !isSupported()}
            <p style="color: var(--text-secondary); font-size: 13px">File System Access API not supported in this browser.</p>
          {:else}
            <label class="settings-toggle">
              <span>Watch folders for new ROMs</span>
              <input type="checkbox" bind:checked={watchFoldersEnabled} on:change={() => updateSettings()} />
              <span class="toggle-slider"></span>
            </label>
            <div class="watch-folders-list" style="margin-top: 10px">
              {#if watchedFoldersList.length === 0}
                <p style="color: var(--text-muted); font-size: 12px; padding: 8px 0">No folders added yet. Click "Add Folder" to select a directory.</p>
              {:else}
              {#each watchedFoldersList as folder}
                <div class="watch-folder-item" style="display: flex; align-items: center; justify-content: space-between; padding: 6px 0; border-bottom: 1px dotted var(--border-subtle)">
                  <span style="font-size: 13px; color: var(--text-primary)">{folder.name}</span>
                  <button
                    type="button"
                    class="control-btn"
                    style="padding: 4px 10px; font-size: 11px"
                    on:click={() => handleRemoveFolder(folder.id)}
                  >
                    Remove
                  </button>
                </div>
              {/each}
              {/if}
            </div>
            <div style="display: flex; gap: 8px; margin-top: 10px; flex-wrap: wrap">
              <button class="control-btn" on:click={handleAddFolder}>Add Folder</button>
              <button class="control-btn" on:click={handleScanNow}>
                Scan Now
              </button>
            </div>
            {#if watchFolderError}
              <p style="color: var(--accent-tertiary); font-size: 12px; margin-top: 6px">{watchFolderError}</p>
            {/if}
            {#if scanStatus}
              <p style="color: var(--accent-primary); font-size: 12px; margin-top: 6px">{scanStatus}</p>
            {/if}
          {/if}
        </div>
        <div class="settings-section">
          <h3>Gamepad</h3>
          <div class="gamepad-settings">
            <div class="gamepad-status">
              <span class="gamepad-status-text">{gamepadStatusText}</span>
            </div>
            <button
              class="control-btn"
              style="width: 100%; margin-top: 8px; justify-content: center"
              on:click={updateGamepadStatus}
            >
              Scan for Gamepads
            </button>
          </div>
        </div>
        <div class="settings-section">
          <h3>High Scores</h3>
          <div class="high-scores-list">
            {#if highScoresList.length === 0}
              <p style="color: var(--text-muted); font-size: 13px; text-align: center; padding: 20px">
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
          <button class="control-btn" style="margin-top: 12px" on:click={clearHighScores}>Clear All Scores</button>
        </div>
        <div class="settings-section">
          <h3>About</h3>
          <p style="color: var(--text-secondary); font-size: 13px">EmuPhoria v1.0<br />Classic games simulator</p>
        </div>
      </div>
    </div>
  </div>
{/if}
