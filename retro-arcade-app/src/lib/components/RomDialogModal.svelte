<script>
  import { showAlert } from '$lib/services/dialog.js';
  import { systemDisplayNames } from '$lib/config/systems.js';
  import { enabledSystems } from '$lib/stores/systemStore.js';

  export let preselectedSystem = '';
  export let onClose = () => {};
  export let onImport = (system) => {};
  export let onRun = (system) => {};

  let selectedSystem = preselectedSystem;
  let lastPreselectedSystem = preselectedSystem;
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
    onClose();
  }

  function handleRun() {
    if (!selectedSystem) {
      showAlert('Please select a system first.');
      return;
    }
    onRun(selectedSystem);
    onClose();
  }

  function handleBackdropKeydown(e) {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  }
</script>

<div class="dialog-modal show" role="dialog" aria-modal="true">
  <div
    class="dialog-backdrop"
    role="button"
    tabindex="0"
    aria-label="Close ROM dialog"
    on:click={onClose}
    on:keydown={handleBackdropKeydown}
  ></div>
  <div class="dialog-panel" style="min-width: 320px">
    <h2 class="dialog-title">Import or Run ROM</h2>
    <div style="margin: 16px 0">
      <label for="romDialogSystem" class="dialog-label">System</label>
      <select
        id="romDialogSystem"
        class="control-btn"
        style="width: 100%; padding: 10px"
        bind:value={selectedSystem}
      >
        <option value="">-- Select System --</option>
        {#each systemOptions as opt}
          <option value={opt.value}>{opt.label}</option>
        {/each}
      </select>
    </div>
    <div class="dialog-buttons" style="margin-top: 20px">
      <button class="dialog-btn" on:click={onClose}>Cancel</button>
      <button class="dialog-btn" on:click={handleImport}>Import ROM</button>
      <button class="dialog-btn dialog-btn-primary" on:click={handleRun}>Run ROM</button>
    </div>
  </div>
</div>
