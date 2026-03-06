<script>
  import { onMount } from 'svelte';
  import { BUILTIN_GAMES } from '$lib/stores/gameStore.js';
  import { sidebarCollapsed, sidebarDrawerOpen } from '$lib/stores/sidebarStore.js';
  import { isMobile } from '$lib/utils/mobile.js';
  import { romLibrary } from '$lib/stores/romLibraryStore.js';
  import {
    getSettings,
    saveSettings,
    saveStateMetaByRom,
  } from '$lib/services/storage.js';
  import { confirmAndRemoveRom } from '$lib/services/romLibraryActions.js';

  export let onLoadGame = (id) => {};
  export let onLoadRom = (id) => {};
  export let onOpenSettings = () => {};
  export let onShowLibrary = () => {};
  export let onCloseDrawer = () => {};

  $: recentlyAddedRoms = [...$romLibrary]
    .sort((a, b) => (b.addedAt ?? b.lastPlayed ?? 0) - (a.addedAt ?? a.lastPlayed ?? 0))
    .slice(0, 3);

  function toggleSidebar() {
    if (isMobile()) {
      sidebarDrawerOpen.set(false);
      onCloseDrawer();
      return;
    }
    const next = !$sidebarCollapsed;
    sidebarCollapsed.set(next);
    const s = getSettings();
    s.sidebarCollapsed = next;
    saveSettings(s);
  }

  function handleLoadGameAndClose(id) {
    onLoadGame(id);
    if (isMobile()) onCloseDrawer();
  }
  function handleLoadRomAndClose(id) {
    onLoadRom(id);
    if (isMobile()) onCloseDrawer();
  }
  function handleOpenSettingsAndClose() {
    onOpenSettings();
    if (isMobile()) onCloseDrawer();
  }
  async function handleShowEmulatorAndClose() {
    await onShowLibrary();
    if (isMobile()) onCloseDrawer();
  }

  async function handleRemoveRom(rom, e) {
    e?.stopPropagation?.();
    await confirmAndRemoveRom(rom);
  }

  let scrollWrapperEl;
  let scrollEl;

  function updateScrollAffordance() {
    if (!scrollWrapperEl || !scrollEl) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollEl;
    const hasScroll = scrollHeight > clientHeight;
    scrollWrapperEl.classList.toggle('has-scroll-top', hasScroll && scrollTop > 4);
    scrollWrapperEl.classList.toggle('has-scroll-bottom', hasScroll && scrollTop < scrollHeight - clientHeight - 4);
  }

  onMount(() => {
    const s = getSettings();
    sidebarCollapsed.set(s.sidebarCollapsed ?? false);
    if (scrollEl) {
      updateScrollAffordance();
      const ro = new ResizeObserver(updateScrollAffordance);
      ro.observe(scrollEl);
      return () => ro.disconnect();
    }
  });
</script>

<aside class="sidebar" class:collapsed={$sidebarCollapsed && !isMobile()} class:drawer-open={$sidebarDrawerOpen} class:drawer-mode={isMobile()}>
  <div class="sidebar-header">
    <div class="sidebar-marquee">
      <div class="logo" class:compact={$sidebarCollapsed}>
        {#if $sidebarCollapsed}
          <span class="logo-emu">E</span>
        {:else}
          <span class="logo-emu">Emu</span><span>Phoria</span>
        {/if}
      </div>
      {#if !$sidebarCollapsed}
        <p class="sidebar-tagline">BROWSER ARCADE</p>
        <div class="sidebar-status-row" aria-label="Library overview">
          <span class="sidebar-status-pill">{BUILTIN_GAMES.length} arcade</span>
          <span class="sidebar-status-pill">{$romLibrary.length} ROM{$romLibrary.length === 1 ? '' : 's'}</span>
        </div>
      {/if}
    </div>
    <button class="sidebar-toggle" on:click={toggleSidebar} aria-label={isMobile() ? 'Close menu' : ($sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar')} title={isMobile() ? 'Close menu' : ($sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar')}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" class:rotated={$sidebarCollapsed}>
        <path d="M15 18l-6-6 6-6"/>
      </svg>
    </button>
  </div>
  <div class="sidebar-scroll-wrapper" bind:this={scrollWrapperEl}>
    <div class="sidebar-scrollable" bind:this={scrollEl} on:scroll={updateScrollAffordance} role="region" aria-label="Library navigation">
      <div class="sidebar-section">
        <div class="sidebar-section-header">
          <span class="sidebar-heading">My Games</span>
          <span class="sidebar-count-pill">{BUILTIN_GAMES.length}</span>
        </div>
        <div class="game-list">
          {#each BUILTIN_GAMES as game}
            <button
              type="button"
              class="game-card"
              on:click={() => handleLoadGameAndClose(game.id)}
            >
              <span class="game-icon">{game.icon}</span>
              <span class="game-info">
                <span class="game-name">{game.name}</span>
                <span class="game-year">{game.year}</span>
              </span>
            </button>
          {/each}
        </div>
      </div>
      <div class="sidebar-divider"></div>
      <div class="sidebar-section">
        <div class="sidebar-section-header">
          <span class="sidebar-heading">Recently Added</span>
          <span class="sidebar-count-pill">{recentlyAddedRoms.length}</span>
        </div>
        <div class="sidebar-library sidebar-library-simple">
          {#if recentlyAddedRoms.length === 0}
            <p class="sidebar-empty-state">No ROMs yet — Browse Library to add</p>
          {:else}
            {#each recentlyAddedRoms as rom}
              <div class="sidebar-rom-row">
                <button
                  type="button"
                  class="sidebar-rom-item sidebar-rom-item-simple"
                  on:click={() => handleLoadRomAndClose(rom.id)}
                  aria-label={`Load ${rom.name}`}
                >
                  <span class="rom-name">{rom.name}</span>
                  {#if $saveStateMetaByRom[rom.id]}
                    <span class="save-indicator" title="Has save state" aria-label="Has save state">💾</span>
                  {/if}
                </button>
                <button
                  type="button"
                  class="sidebar-rom-remove"
                  aria-label={`Remove ${rom.name} from library`}
                  title={`Remove ${rom.name} from library`}
                  on:click|stopPropagation={(e) => handleRemoveRom(rom, e)}
                >×</button>
              </div>
            {/each}
          {/if}
        </div>
      </div>
      <button type="button" class="sidebar-browse-btn" on:click={handleShowEmulatorAndClose}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="sidebar-action-icon">
          <rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="8" cy="12" r="2"/><circle cx="16" cy="12" r="1"/>
        </svg>
        Browse Library
      </button>
    </div>
  </div>
  <div class="sidebar-footer">
    <button type="button" class="sidebar-settings-btn" on:click={handleOpenSettingsAndClose} aria-label="Settings" title="Settings">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="sidebar-action-icon">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
      </svg>
      {#if !$sidebarCollapsed}
        <span>Settings</span>
      {/if}
    </button>
  </div>
</aside>
