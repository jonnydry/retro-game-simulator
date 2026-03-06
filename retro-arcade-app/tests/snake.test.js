import test from 'node:test';
import assert from 'node:assert/strict';

import { initSnake, updateSnake } from '../src/lib/games/snake.js';

function makeCtx() {
  return {
    fillStyle: '',
    fillRect() {}
  };
}

test('snake respawns food only on free cells', () => {
  const state = initSnake();
  state.snake = [
    { x: 1, y: 1 },
    { x: 1, y: 2 },
    { x: 1, y: 3 }
  ];
  state.direction = { x: 1, y: 0 };
  state.food = { x: 2, y: 1 };
  state.speed = 0;
  state.lastUpdate = 0;

  const originalRandom = Math.random;
  Math.random = () => 0;

  try {
    updateSnake(state, makeCtx(), { width: 100, height: 100 }, () => ({}), () => {}, 200);
  } finally {
    Math.random = originalRandom;
  }

  assert.deepEqual(state.food, { x: 0, y: 0 });
  assert.equal(
    state.snake.some((segment) => segment.x === state.food.x && segment.y === state.food.y),
    false
  );
});

test('snake ends the round when it fills the board', () => {
  const state = initSnake();
  state.snake = [{ x: 0, y: 0 }];
  state.direction = { x: 1, y: 0 };
  state.food = { x: 1, y: 0 };
  state.speed = 0;
  state.lastUpdate = 0;

  const result = updateSnake(state, makeCtx(), { width: 40, height: 20 }, () => ({}), () => {}, 200);

  assert.equal(result.gameOver, true);
  assert.equal(result.score, 10);
});
