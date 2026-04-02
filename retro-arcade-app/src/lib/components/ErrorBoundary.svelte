<script>
  let { children, fallback } = $props();
  
  let hasError = $state(false);
  let errorMessage = $state('');
  
  function handleError(event) {
    hasError = true;
    errorMessage = event?.error?.message || 'An unexpected error occurred';
    console.error('ErrorBoundary caught:', event?.error);
  }
</script>

<div onerror={handleError} role="presentation">
  {#if hasError}
    <div class="error-fallback">
      {#if fallback}
        {@render fallback(errorMessage)}
      {:else}
        <div class="error-content">
          <h2>Something went wrong</h2>
          <p class="error-message">{errorMessage}</p>
          <button onclick={() => { hasError = false; errorMessage = ''; }}>
            Try Again
          </button>
        </div>
      {/if}
    </div>
  {:else}
    {@render children()}
  {/if}
</div>

<style>
  .error-fallback {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 200px;
    padding: 2rem;
    background: rgba(255, 51, 102, 0.1);
    border: 1px solid rgba(255, 51, 102, 0.3);
    border-radius: 8px;
    margin: 1rem;
  }

  .error-content {
    text-align: center;
    color: #ff3366;
  }

  .error-content h2 {
    margin: 0 0 0.5rem;
    font-family: 'VT323', monospace;
    font-size: 1.5rem;
  }

  .error-message {
    color: rgba(255, 255, 255, 0.7);
    font-size: 0.875rem;
    margin: 0 0 1rem;
    word-break: break-word;
  }

  .error-content button {
    background: #ff3366;
    color: white;
    border: none;
    padding: 0.5rem 1.5rem;
    font-family: 'VT323', monospace;
    font-size: 1.25rem;
    cursor: pointer;
    border-radius: 4px;
    transition: background 0.2s;
  }

  .error-content button:hover {
    background: #ff4d7a;
  }
</style>
