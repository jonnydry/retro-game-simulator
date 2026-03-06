<script>
  import { THEME_OPTIONS } from '$lib/services/theme.js';
  import { theme as currentTheme, setTheme } from '$lib/stores/themeStore.js';
</script>

<div class="theme-tint-switcher" role="group" aria-label="Tint themes">
  <span class="theme-tint-label">Tint</span>
  <div class="theme-tint-track">
    {#each THEME_OPTIONS as theme}
      <button
        type="button"
        class="theme-tint-option"
        class:active={theme.id === $currentTheme}
        aria-pressed={theme.id === $currentTheme}
        aria-label={`Switch tint to ${theme.label}`}
        title={theme.label}
        on:click={() => setTheme(theme.id)}
      >
        <span
          class="theme-tint-option-swatch"
          aria-hidden="true"
          style={`--theme-accent-secondary: ${theme.accentSecondary}; --theme-accent-tertiary: ${theme.accentTertiary};`}
        ></span>
        <span class="theme-tint-option-label" aria-hidden="true">{theme.label}</span>
      </button>
    {/each}
  </div>
</div>
