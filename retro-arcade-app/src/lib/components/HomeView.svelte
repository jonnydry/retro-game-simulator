<script>
  import { BUILTIN_GAMES } from '$lib/stores/gameStore.js';

  export let onLoadGame = (id) => {};
</script>

<div class="main-view" style="display: flex; flex-direction: column; flex: 1;">
  <div style="flex:1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px">
    <h1 class="home-title">Select a Game</h1>
    <div class="game-list" style="display: flex; flex-wrap: wrap; gap: 16px; justify-content: center; max-width: 600px">
      {#each BUILTIN_GAMES as game}
        <div
          class="game-card"
          role="button"
          tabindex="0"
          on:click={() => onLoadGame(game.id)}
          on:keydown={(e) => e.key === 'Enter' || e.key === ' ' ? (e.preventDefault(), onLoadGame(game.id)) : null}
        >
          <div class="game-icon">{game.icon}</div>
          <div class="game-info">
            <h3>{game.name}</h3>
            <p>{game.year}</p>
          </div>
        </div>
      {/each}
    </div>
  </div>
</div>
