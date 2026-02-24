<script>
  import { dialogState } from '$lib/services/dialog.js';

  function handleResolve(result) {
    const state = $dialogState;
    if (state.resolve) state.resolve(result);
  }
</script>

{#if $dialogState.open}
  <div class="dialog-modal show" role="dialog" aria-modal="true">
    <div class="dialog-backdrop" on:click={() => handleResolve(false)}></div>
    <div class="dialog-panel">
      <h2 class="dialog-title" style="display: none">Dialog</h2>
      <p class="dialog-message">{$dialogState.message}</p>
      <div class="dialog-buttons">
        {#if $dialogState.isConfirm}
          <button class="dialog-btn" on:click={() => handleResolve(false)}>Cancel</button>
          <button class="dialog-btn dialog-btn-primary" on:click={() => handleResolve(true)}>OK</button>
        {:else}
          <button class="dialog-btn dialog-btn-primary" on:click={() => handleResolve(true)}>OK</button>
        {/if}
      </div>
    </div>
  </div>
{/if}
