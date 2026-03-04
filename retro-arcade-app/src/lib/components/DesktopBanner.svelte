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
    <span class="desktop-banner-text">Best experienced on desktop</span>
    <button
      type="button"
      class="desktop-banner-dismiss"
      aria-label="Dismiss"
      on:click={dismiss}
    >×</button>
  </div>
{/if}
