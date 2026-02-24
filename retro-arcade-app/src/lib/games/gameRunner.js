import { initPong, updatePong } from './pong.js';
import { initSnake, updateSnake } from './snake.js';
import { initBreakout, updateBreakout } from './breakout.js';
import { playSound } from '$lib/services/audio.js';

const GAME_INIT = {
  pong: initPong,
  snake: initSnake,
  breakout: initBreakout
};

const GAME_UPDATE_MAP = {
  pong: updatePong,
  snake: updateSnake,
  breakout: updateBreakout
};

export function runGame(gameId, canvas, getKeys, onScore, onGameOver, getIsPaused) {
  const initFn = GAME_INIT[gameId];
  const updateFn = GAME_UPDATE_MAP[gameId];
  if (!initFn || !updateFn) return null;

  const ctx = canvas.getContext('2d');
  const state = initFn();
  let rafId = null;
  let lastTs = 0;

  function loop(timestamp) {
    if (getIsPaused()) {
      rafId = requestAnimationFrame(loop);
      return;
    }
    const result = updateFn(state, ctx, canvas, getKeys, playSound, timestamp);
    if (result.skip) {
      rafId = requestAnimationFrame(loop);
      return;
    }
    if (result.score !== undefined) onScore(result.score);
    if (result.gameOver) {
      onGameOver();
      return;
    }
    rafId = requestAnimationFrame(loop);
  }

  rafId = requestAnimationFrame(loop);
  return () => {
    if (rafId) cancelAnimationFrame(rafId);
  };
}
