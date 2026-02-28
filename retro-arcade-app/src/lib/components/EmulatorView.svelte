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
          fallbackIcon: systemIcons[r.system] || null
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
    <div class="section-title" style="margin-bottom: 12px">Systems</div>
    <div class="system-cards-grid">
      {#each $enabledSystems as sys}
        <div
          class="system-card"
          role="button"
          tabindex="0"
          on:click={() => onOpenRomDialog(sys)}
          on:keydown={(e) => handleActivateKey(e, () => onOpenRomDialog(sys))}
        >
          <div class="system-card-icon">{@html systemIcons[sys] || ''}</div>
          <div class="system-card-name">{systemDisplayNames[sys] || sys.toUpperCase()}</div>
          <div class="system-card-count">{countBySystem[sys] || 0} ROM{(countBySystem[sys] || 0) !== 1 ? 's' : ''}</div>
        </div>
      {/each}
    </div>
    <div class="section-title" style="margin-top: 24px; margin-bottom: 12px">My Library</div>
    <div class="library-by-system">
      {#if $romLibrary.length === 0}
        <p class="library-empty-hint" style="color: var(--text-secondary); font-size: 14px">No ROMs yet. Click a system card above to import or run a ROM.</p>
      {:else}
        {#each $enabledSystems as sys}
          {#if (libraryBySystem[sys] || []).length > 0}
            <details class="library-system-section" open>
              <summary class="library-system-header">
                <span>{systemDisplayNames[sys]} ({countBySystem[sys]} ROM{(countBySystem[sys] || 0) !== 1 ? 's' : ''})</span>
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
                      {#if getSaveStateMeta(rom.id)}
                        <span class="save-indicator" title="Has save state" aria-label="Has save state">💾</span>
                      {/if}
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
