<script>
  import { tick } from 'svelte';
  import { dialogState } from '$lib/services/dialog.js';
  import { focusFirstElement, trapFocus } from '$lib/utils/modalFocus.js';

  const titleId = 'app-dialog-title';
  let dialogPanelEl = null;
  let lastFocusedElement = null;
  let wasOpen = false;

  function handleResolve(result) {
    const state = $dialogState;
    if (state.resolve) state.resolve(result);
  }

  function handleModalKeydown(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      handleResolve(false);
      return;
    }

    trapFocus(e, dialogPanelEl);
  }

  $: if ($dialogState.open && !wasOpen) {
    wasOpen = true;
    lastFocusedElement =
      typeof document !== 'undefined' && document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    tick().then(() => focusFirstElement(dialogPanelEl));
  } else if (!$dialogState.open && wasOpen) {
    wasOpen = false;
    lastFocusedElement?.focus?.();
  }
</script>

{#if $dialogState.open}
  <div class="dialog-modal show">
    <div
      class="dialog-backdrop"
      aria-hidden="true"
      on:click={() => handleResolve(false)}
    ></div>
    <div
      class="dialog-panel"
      bind:this={dialogPanelEl}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      tabindex="-1"
      on:keydown={handleModalKeydown}
    >
      <h2 id={titleId} class="dialog-title visually-hidden">{$dialogState.title || 'Dialog'}</h2>
      <p class="dialog-message">{$dialogState.message}</p>
      <div class="dialog-buttons">
        {#if $dialogState.isConfirm}
          <button type="button" class="dialog-btn" on:click={() => handleResolve(false)}>Cancel</button>
          <button type="button" class="dialog-btn dialog-btn-primary" on:click={() => handleResolve(true)}>OK</button>
        {:else}
          <button type="button" class="dialog-btn dialog-btn-primary" on:click={() => handleResolve(true)}>OK</button>
        {/if}
      </div>
    </div>
  </div>
{/if}
