<script>
  import { onMount, tick } from 'svelte';
  import { showAlert } from '$lib/services/dialog.js';
  import { systemDisplayNames } from '$lib/config/systems.js';
  import { enabledSystems } from '$lib/stores/systemStore.js';
  import { focusFirstElement, trapFocus } from '$lib/utils/modalFocus.js';

  export let preselectedSystem = '';
  export let onClose = () => {};
  export let onImport = (system) => {};
  export let onRun = (system) => {};

  const titleId = 'rom-dialog-title';

  let selectedSystem = preselectedSystem;
  let lastPreselectedSystem = preselectedSystem;
  let dialogPanelEl = null;
  let lastFocusedElement = null;

  $: if (preselectedSystem !== lastPreselectedSystem) {
    selectedSystem = preselectedSystem;
    lastPreselectedSystem = preselectedSystem;
  }

  $: if (selectedSystem && !$enabledSystems.includes(selectedSystem)) {
    selectedSystem = preselectedSystem && $enabledSystems.includes(preselectedSystem)
      ? preselectedSystem
      : '';
  }

  $: systemOptions = $enabledSystems.map((value) => ({
    value,
    label: systemDisplayNames[value] || value.toUpperCase()
  }));

  function handleImport() {
    if (!selectedSystem) {
      showAlert('Please select a system first.');
      return;
    }
    onImport(selectedSystem);
    closeDialog();
  }

  function handleRun() {
    if (!selectedSystem) {
      showAlert('Please select a system first.');
      return;
    }
    onRun(selectedSystem);
    closeDialog();
  }

  function handleModalKeydown(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeDialog();
      return;
    }

    trapFocus(e, dialogPanelEl);
  }

  onMount(() => {
    if (typeof document !== 'undefined') {
      lastFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    }
    tick().then(() => focusFirstElement(dialogPanelEl));
  });

  function closeDialog() {
    onClose();
    lastFocusedElement?.focus?.();
  }
</script>

<div class="dialog-modal show">
  <div
    class="dialog-backdrop"
    aria-hidden="true"
    on:click={closeDialog}
  ></div>
  <div
    class="dialog-panel dialog-panel--rom"
    bind:this={dialogPanelEl}
    role="dialog"
    aria-modal="true"
    aria-labelledby={titleId}
    tabindex="-1"
    on:keydown={handleModalKeydown}
  >
    <p class="home-kicker dialog-kicker">ROM Library</p>
    <h2 id={titleId} class="dialog-title">Import or Run ROM</h2>
    <p class="dialog-intro">
      Choose a system, then either add the file to your shelf or launch it right away.
    </p>
    <div class="dialog-section">
      <label for="romDialogSystem" class="dialog-label">System</label>
      <select
        id="romDialogSystem"
        class="dialog-select"
        bind:value={selectedSystem}
      >
        <option value="">-- Select System --</option>
        {#each systemOptions as opt}
          <option value={opt.value}>{opt.label}</option>
        {/each}
      </select>
    </div>
    <div class="dialog-buttons dialog-buttons--rom">
      <button type="button" class="dialog-btn" on:click={closeDialog}>Cancel</button>
      <button type="button" class="dialog-btn" on:click={handleImport}>Import ROM</button>
      <button type="button" class="dialog-btn dialog-btn-primary" on:click={handleRun}>Run ROM</button>
    </div>
  </div>
</div>
