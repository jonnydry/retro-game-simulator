<script>
  import { onMount } from 'svelte';
  import { BUILTIN_GAMES } from '$lib/stores/gameStore.js';
  import { currentView, previousView } from '$lib/stores/viewStore.js';
  import { sidebarCollapsed } from '$lib/stores/sidebarStore.js';
  import { romLibrary } from '$lib/stores/romLibraryStore.js';
  import { getThumbnailUrl } from '$lib/services/thumbnailService.js';
  import { systemIcons } from '$lib/config/systems.js';
  import { getSettings, saveSettings, removeFromRomLibrary } from '$lib/services/storage.js';
  import { showConfirm } from '$lib/services/dialog.js';

  export let onLoadGame = (id) => {};
  export let onLoadRom = (id) => {};
  export let onOpenSettings = () => {};

  let myGamesExpanded = false;

  $: recentRoms = [...$romLibrary].sort((a, b) => (b.lastPlayed || 0) - (a.lastPlayed || 0));

  function getRomThumbnail(rom) {
    return getThumbnailUrl(rom.name, rom.system);
  }

  function getRomFallbackIcon(rom) {
    return systemIcons[rom.system] || null;
  }

  function showView(view) {
    previousView.set($currentView);
    currentView.set(view);
  }

  function toggleSidebar() {
    const next = !$sidebarCollapsed;
    sidebarCollapsed.set(next);
    const s = getSettings();
    s.sidebarCollapsed = next;
    saveSettings(s);
  }

  function toggleMyGames() {
    myGamesExpanded = !myGamesExpanded;
    const s = getSettings();
    s.myGamesExpanded = myGamesExpanded;
    saveSettings(s);
  }

  async function handleRemoveRom(rom, e) {
    e?.stopPropagation?.();
    const ok = await showConfirm(`Remove "${rom.name}" from library?`);
    if (ok) {
      await removeFromRomLibrary(rom.id);
      romLibrary.refresh();
    }
  }

  onMount(() => {
    const s = getSettings();
    sidebarCollapsed.set(s.sidebarCollapsed ?? false);
    myGamesExpanded = s.myGamesExpanded ?? false;
  });
</script>

<aside class="sidebar" class:collapsed={$sidebarCollapsed}>
  <button class="sidebar-toggle" on:click={toggleSidebar} aria-label={$sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'} title={$sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class:rotated={$sidebarCollapsed}>
      <path d="M15 18l-6-6 6-6"/>
    </svg>
  </button>
  <div class="sidebar-scrollable">
    <div class="logo" class:compact={$sidebarCollapsed}>
      {#if $sidebarCollapsed}
        <span class="logo-emu">E</span>
      {:else}
        <span class="logo-emu">Emu</span><span>Phoria</span>
      {/if}
    </div>
    <button class="section-toggle" on:click={toggleMyGames} aria-expanded={myGamesExpanded} title="My Games">
      <span class="section-title">My Games</span>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class:rotated={!myGamesExpanded}>
        <path d="M6 9l6 6 6-6"/>
      </svg>
    </button>
    <div class="game-list" class:collapsed={!myGamesExpanded}>
      {#each BUILTIN_GAMES as game}
        <div class="game-card" role="button" tabindex="0" on:click={() => onLoadGame(game.id)}>
          <div class="game-icon">{game.icon}</div>
          <div class="game-info">
            <h3>{game.name}</h3>
            <p>{game.year}</p>
          </div>
        </div>
      {/each}
    </div>
    <div class="section-title" style="margin-top:16px">Recent ROMs</div>
    <div class="sidebar-library">
      {#if recentRoms.length === 0}
        <p class="library-empty-hint" style="color:var(--text-muted);font-size:11px;padding:8px 0">No ROMs yet</p>
      {:else}
        {#each recentRoms as rom}
          <div class="sidebar-rom-item" role="button" on:click={() => onLoadRom(rom.id)}>
            <div class="rom-thumbnail">
              {#if getRomThumbnail(rom)}
                <img
                  src={getRomThumbnail(rom)}
                  alt=""
                  on:error={(e) => {
                    e.target.style.display = 'none';
                    const fallback = e.target.nextElementSibling;
                    if (fallback) fallback.style.display = 'flex';
                  }}
                />
              {/if}
              <div
                class="rom-thumbnail-fallback"
                style="display: {getRomThumbnail(rom) ? 'none' : 'flex'}"
                aria-hidden="true"
              >
                {#if getRomFallbackIcon(rom)}
                  {@html getRomFallbackIcon(rom)}
                {:else}
                  <span class="rom-thumbnail-placeholder">🎮</span>
                {/if}
              </div>
            </div>
            <span class="rom-name">{rom.name}</span>
            <button
              class="sidebar-rom-remove"
              aria-label="Remove from library"
              title="Remove from library"
              on:click|stopPropagation={(e) => handleRemoveRom(rom, e)}
            >×</button>
          </div>
        {/each}
      {/if}
    </div>
    <button class="control-btn" style="width:100%;margin-top:12px;justify-content:center;padding:10px" on:click={() => showView('emulator')}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:6px">
        <rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="8" cy="12" r="2"/><circle cx="16" cy="12" r="1"/>
      </svg>
      Emulator Select
    </button>
  </div>
  <div class="sidebar-bottom">
    <button class="control-btn" style="width:100%;justify-content:center;padding:10px" on:click={() => onOpenSettings()}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
      </svg>
      <span>Settings</span>
    </button>
  </div>
</aside>
