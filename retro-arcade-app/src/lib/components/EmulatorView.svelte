<script>
  import { romLibrary } from '$lib/stores/romLibraryStore.js';
  import { saveStateRefreshTrigger } from '$lib/stores/gameStore.js';
  import { systemDisplayNames } from '$lib/config/systems.js';
  import { systemIcons } from '$lib/config/systems.js';
  import { enabledSystems } from '$lib/stores/systemStore.js';
  import { getThumbnailUrl } from '$lib/services/thumbnailService.js';
  import { removeFromRomLibrary, getSaveStateMeta, clearSaveStateMeta } from '$lib/services/storage.js';
  import { showConfirm } from '$lib/services/dialog.js';

  export let onOpenRomDialog = (system) => {};
  export let onLoadRom = (id) => {};

  function formatTimeAgo(ts) {
    if (!ts) return 'Ready to play';
    const seconds = Math.floor((Date.now() - ts) / 1000);
    if (seconds < 60) return 'Updated just now';
    if (seconds < 3600) return `Updated ${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `Updated ${Math.floor(seconds / 3600)}h ago`;
    return `Updated ${Math.floor(seconds / 86400)}d ago`;
  }

  async function handleRemoveRom(rom, e) {
    e?.stopPropagation?.();
    const ok = await showConfirm(`Remove "${rom.name}" from library?`);
    if (ok) {
      await removeFromRomLibrary(rom.id);
      clearSaveStateMeta(rom.id);
      romLibrary.refresh();
    }
  }

  function handleActivateKey(e, fn) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fn();
    }
  }

  $: countBySystem = {};
  $: {
    const lib = $romLibrary;
    const counts = {};
    $enabledSystems.forEach(s => { counts[s] = 0; });
    lib.forEach(r => { counts[r.system] = (counts[r.system] || 0) + 1; });
    countBySystem = counts;
  }

  $: _ = $saveStateRefreshTrigger; // refresh save state indicators when auto-save completes
  $: libraryBySystem = {};
  $: {
    const lib = $romLibrary;
    const by = {};
    $enabledSystems.forEach(s => { by[s] = []; });
    lib.forEach((r) => {
      if (by[r.system]) {
        by[r.system].push({
          ...r,
          thumbnail: getThumbnailUrl(r.name, r.system),
          fallbackIcon: systemIcons[r.system] || null,
          activityText: formatTimeAgo(r.lastPlayed ?? r.addedAt ?? 0)
        });
      }
    });
    $enabledSystems.forEach(s => { by[s] = by[s].sort((a,b) => (b.lastPlayed||0) - (a.lastPlayed||0)); });
    libraryBySystem = by;
  }
</script>

<div class="main-view emulator-view">
  <div class="emulator-scroll">
    <div class="emulator-logo-header">
      <img src="/logo-icon-96.png" alt="" class="emulator-logo-icon" aria-hidden="true" />
      <span class="logo-emu">Emu</span><span>Phoria</span>
    </div>
    <div class="emulator-intro">
      <p class="home-kicker">ROM Library</p>
      <p class="emulator-subtitle">
        Import a cartridge, disc, or archive by system, then launch it from your shelf below.
      </p>
    </div>
    <div class="systems-roulette-wrapper">
      <nav class="systems-roulette-bar" aria-label="Game systems">
        <div class="systems-roulette-track">
          {#each $enabledSystems as sys}
            <button
              type="button"
              class="system-chip"
              on:click={() => onOpenRomDialog(sys)}
            >
              <span class="system-chip-icon">{@html systemIcons[sys] || ''}</span>
              <span class="system-chip-label">{systemDisplayNames[sys] || sys.toUpperCase()}</span>
              <span class="system-chip-caption">Import or Run</span>
              <span class="system-chip-count">{countBySystem[sys] || 0} ROM{(countBySystem[sys] || 0) !== 1 ? 's' : ''}</span>
            </button>
          {/each}
        </div>
      </nav>
    </div>
    <div class="section-title emulator-library-title">My Library</div>
    <div class="library-by-system">
      {#if $romLibrary.length === 0}
        <div class="library-empty-state">
          <p class="library-empty-hint">No ROMs yet. Choose a system above to import a game.</p>
        </div>
      {:else}
        {#each $enabledSystems as sys}
          {#if (libraryBySystem[sys] || []).length > 0}
            <details class="library-system-section" open>
              <summary class="library-system-header">
                <span class="library-system-heading">
                  <span class="library-system-name">{systemDisplayNames[sys]}</span>
                  <span class="library-system-meta">{countBySystem[sys]} ROM{(countBySystem[sys] || 0) !== 1 ? 's' : ''}</span>
                </span>
                <svg class="header-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M6 9l6 6 6-6"/>
                </svg>
              </summary>
              <div class="library-system-list">
                {#each libraryBySystem[sys] || [] as rom}
                  <div
                    class="library-rom-item"
                    role="button"
                    tabindex="0"
                    on:click={() => onLoadRom(rom.id)}
                    on:keydown={(e) => handleActivateKey(e, () => onLoadRom(rom.id))}
                  >
                    <div class="library-rom-thumbnail">
                      {#if rom.thumbnail}
                        <img
                          src={rom.thumbnail}
                          alt=""
                          on:error={(e) => {
                            e.target.style.display = 'none';
                            const fallback = e.target.nextElementSibling;
                            if (fallback) fallback.style.display = 'flex';
                          }}
                        />
                      {/if}
                      <div
                        class="library-rom-thumbnail-fallback"
                        style="display: {rom.thumbnail ? 'none' : 'flex'}"
                        aria-hidden="true"
                      >
                        {#if rom.fallbackIcon}
                          {@html rom.fallbackIcon}
                        {:else}
                          <span class="library-rom-thumbnail-placeholder">{rom.system.substring(0,2).toUpperCase()}</span>
                        {/if}
                      </div>
                    </div>
                    <div class="library-rom-info">
                      <div class="library-rom-name">{rom.name}</div>
                      <div class="library-rom-meta">
                        <span class="library-pill">{rom.activityText}</span>
                        {#if getSaveStateMeta(rom.id)}
                          <span class="library-pill library-pill-save" title="Has save state" aria-label="Has save state">Save state</span>
                        {/if}
                      </div>
                    </div>
                    <button
                      class="remove-btn"
                      aria-label="Remove from library"
                      title="Remove from library"
                      on:click|stopPropagation={(e) => handleRemoveRom(rom, e)}
                    >Remove</button>
                  </div>
                {/each}
              </div>
            </details>
          {/if}
        {/each}
      {/if}
    </div>
  </div>
</div>
