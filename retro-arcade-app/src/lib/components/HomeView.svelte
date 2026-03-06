<script>
  import { BUILTIN_GAMES } from '$lib/stores/gameStore.js';

  export let onLoadGame = (id) => {};
</script>

<div class="main-view home-view">
  <div class="home-shell">
    <section class="home-hero">
      <p class="home-kicker">Built-In Classics</p>
      <h1 class="home-title">Select a Game</h1>
      <p class="home-subtitle">
        Three stripped-back arcade staples with instant launch, keyboard support, and cabinet-style presentation.
      </p>
      <div class="home-signal-row" aria-label="Home highlights">
        <span class="status-chip">Instant Launch</span>
        <span class="status-chip">Keyboard + Gamepad</span>
        <span class="status-chip">Retro CRT Frame</span>
      </div>
    </section>

    <div class="home-grid">
      <div class="section-title home-grid-title">Arcade Shelf</div>
      <div class="home-game-grid">
        {#each BUILTIN_GAMES as game}
          <div
            class="game-card home-game-card"
            role="button"
            tabindex="0"
            on:click={() => onLoadGame(game.id)}
            on:keydown={(e) => e.key === 'Enter' || e.key === ' ' ? (e.preventDefault(), onLoadGame(game.id)) : null}
          >
            <div class="game-card-badge">Ready</div>
            <div class="game-icon">{game.icon}</div>
            <div class="game-info">
              <h3>{game.name}</h3>
              <p>{game.year}</p>
            </div>
            <span class="game-card-action">Launch</span>
          </div>
        {/each}
      </div>
    </div>
  </div>
</div>
