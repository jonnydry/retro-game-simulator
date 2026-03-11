<script>
  import { onMount } from 'svelte';
  import { BUILTIN_GAMES } from '$lib/stores/gameStore.js';
  import { sidebarCollapsed, sidebarDrawerOpen } from '$lib/stores/sidebarStore.js';
  import { isMobile } from '$lib/utils/mobile.js';
  import { romLibrary } from '$lib/stores/romLibraryStore.js';
  import { enabledSystems } from '$lib/stores/systemStore.js';
  import { systemDisplayNames } from '$lib/config/systems.js';
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
  export let onSystemFilter = (sys) => {};

  // Active nav tab: 'library' | 'recent'
  let activeNav = 'library';
  // Active system filter: '' = all
  let activeSystem = '';

  $: recentlyAddedRoms = [...$romLibrary]
    .sort((a, b) => (b.addedAt ?? b.lastPlayed ?? 0) - (a.addedAt ?? a.lastPlayed ?? 0))
    .slice(0, 5);

  // Count ROMs per system
  $: countBySystem = (() => {
    const counts = {};
    $enabledSystems.forEach(s => { counts[s] = 0; });
    $romLibrary.forEach(r => { counts[r.system] = (counts[r.system] || 0) + 1; });
    return counts;
  })();

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
    activeNav = 'library';
    activeSystem = '';
    onSystemFilter('');
    await onShowLibrary();
    if (isMobile()) onCloseDrawer();
  }

  function handleNavLibrary() {
    activeNav = 'library';
    activeSystem = '';
    onSystemFilter('');
    onShowLibrary();
    if (isMobile()) onCloseDrawer();
  }

  function handleNavRecent() {
    activeNav = 'recent';
    onShowLibrary();
    if (isMobile()) onCloseDrawer();
  }

  function handleSystemFilter(sys) {
    activeSystem = activeSystem === sys ? '' : sys;
    onSystemFilter(activeSystem);
    if (activeNav !== 'library') {
      activeNav = 'library';
      onShowLibrary();
    }
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
  <!-- Header: Logo + toggle -->
  <div class="sidebar-header">
    <div>
      <div class="logo" class:compact={$sidebarCollapsed}>
        {#if $sidebarCollapsed}
          <span class="logo-emu">E</span>
        {:else}
          <span class="logo-caret">&gt;</span><span class="logo-emu">Emu</span><span>Phoria</span>
        {/if}
      </div>
      {#if !$sidebarCollapsed}
        <p class="sidebar-tagline">ARCADE VAULT</p>
      {/if}
    </div>
    <button class="sidebar-toggle" on:click={toggleSidebar}
      aria-label={isMobile() ? 'Close menu' : ($sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar')}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" class:rotated={$sidebarCollapsed}>
        <path d="M15 18l-6-6 6-6"/>
      </svg>
    </button>
  </div>

  <!-- Scrollable content -->
  <div class="sidebar-scroll-wrapper" bind:this={scrollWrapperEl}>
    <div class="sidebar-scrollable" bind:this={scrollEl} on:scroll={updateScrollAffordance} role="region" aria-label="Library navigation">

      <!-- Nav: Library / Recent -->
      <nav class="sidebar-nav" aria-label="View">
        <button type="button" class="sidebar-nav-item" class:active={activeNav === 'library'} on:click={handleNavLibrary}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
          </svg>
          {#if !$sidebarCollapsed}<span>Library</span>{/if}
        </button>
        <button type="button" class="sidebar-nav-item" class:active={activeNav === 'recent'} on:click={handleNavRecent}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
          {#if !$sidebarCollapsed}<span>Recent</span>{/if}
        </button>
      </nav>

      <div class="sidebar-divider"></div>

      <!-- Built-in games -->
      {#if !$sidebarCollapsed}
        <div class="sidebar-section-label">Built-In</div>
      {/if}
      <div class="sidebar-section">
        <div class="game-list">
          {#each BUILTIN_GAMES as game}
            <button type="button" class="game-card" on:click={() => handleLoadGameAndClose(game.id)}>
              <span class="game-icon">{game.icon}</span>
              {#if !$sidebarCollapsed}
                <span class="game-info">
                  <span class="game-name">{game.name}</span>
                  <span class="game-year">{game.year}</span>
                </span>
              {/if}
            </button>
          {/each}
        </div>
      </div>

      <div class="sidebar-divider"></div>

      <!-- Systems filter -->
      {#if !$sidebarCollapsed}
        <div class="sidebar-section-label">Systems</div>
      {/if}
      <div class="sidebar-systems">
        {#each $enabledSystems as sys}
          <button
            type="button"
            class="sidebar-system-item"
            class:active={activeSystem === sys}
            on:click={() => handleSystemFilter(sys)}
          >
            <span>{systemDisplayNames[sys] || sys.toUpperCase()}</span>
            {#if !$sidebarCollapsed}
              <span class="sidebar-system-count">{countBySystem[sys] || 0}</span>
            {/if}
          </button>
        {/each}
      </div>

      <!-- Recently added (only when Recent nav is active) -->
      {#if activeNav === 'recent' && !$sidebarCollapsed}
        <div class="sidebar-divider"></div>
        <div class="sidebar-section-label">Recent ROMs</div>
        <div style="padding: 0 var(--space-sm);">
          {#if recentlyAddedRoms.length === 0}
            <p class="sidebar-empty-state">No ROMs yet</p>
          {:else}
            {#each recentlyAddedRoms as rom}
              <div class="sidebar-rom-row">
                <button
                  type="button"
                  class="sidebar-rom-item"
                  on:click={() => handleLoadRomAndClose(rom.id)}
                  aria-label={`Load ${rom.name}`}
                >
                  <span class="rom-name">{rom.name}</span>
                  {#if $saveStateMetaByRom[rom.id]}
                    <span class="save-indicator" title="Has save state">●</span>
                  {/if}
                </button>
                <button
                  type="button"
                  class="sidebar-rom-remove"
                  aria-label={`Remove ${rom.name}`}
                  title={`Remove ${rom.name}`}
                  on:click|stopPropagation={(e) => handleRemoveRom(rom, e)}
                >×</button>
              </div>
            {/each}
          {/if}
        </div>
      {/if}

    </div>
  </div>

  <!-- Footer -->
  <div class="sidebar-footer">
    <button type="button" class="sidebar-settings-btn" on:click={handleOpenSettingsAndClose} aria-label="Settings" title="Settings">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="sidebar-action-icon">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
      </svg>
      {#if !$sidebarCollapsed}
        <span>Settings</span>
      {/if}
    </button>
  </div>
</aside>
