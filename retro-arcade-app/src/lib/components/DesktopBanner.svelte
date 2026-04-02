<script>
  import { onMount } from 'svelte';
  import { isMobile } from '$lib/utils/mobile.js';
  import { desktopBannerVisible } from '$lib/stores/desktopBannerStore.js';

  const STORAGE_KEY = 'retroArcade_desktopBannerDismissed';

  let visible = false;
  let mounted = false;

  onMount(() => {
    mounted = true;
    if (isMobile() && !localStorage.getItem(STORAGE_KEY)) {
      visible = true;
      desktopBannerVisible.set(true);
    }
  });

  function dismiss() {
    visible = false;
    desktopBannerVisible.set(false);
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch (e) {}
  }
</script>

{#if mounted && visible}
  <div class="desktop-banner">
    <div class="banner-content">
      <span class="banner-icon">📱</span>
      <span class="desktop-banner-text">Touch controls available for built-in games. ROM emulation works best on desktop.</span>
    </div>
    <button
      type="button"
      class="desktop-banner-dismiss"
      aria-label="Dismiss"
      on:click={dismiss}
    >×</button>
  </div>
{/if}

<style>
  .desktop-banner {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-sm);
    padding: var(--space-sm) var(--space-md);
    background: linear-gradient(135deg, rgba(123, 92, 255, 0.95), rgba(255, 51, 102, 0.95));
    color: white;
    font-size: var(--text-xs);
    font-family: var(--font-mono);
  }

  .banner-content {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    flex: 1;
  }

  .banner-icon {
    font-size: var(--text-sm);
    flex-shrink: 0;
  }

  .desktop-banner-text {
    opacity: 0.95;
    line-height: 1.4;
  }

  .desktop-banner-dismiss {
    background: rgba(255, 255, 255, 0.2);
    border: none;
    color: white;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    cursor: pointer;
    font-size: var(--text-base);
    line-height: 1;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.2s;
  }

  .desktop-banner-dismiss:hover {
    background: rgba(255, 255, 255, 0.3);
  }
</style>
