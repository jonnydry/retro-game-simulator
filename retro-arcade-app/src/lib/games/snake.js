const GRID_SIZE = 20;

function getNextFoodCell(snake, cols, rows) {
  const occupied = new Set(snake.map((segment) => `${segment.x},${segment.y}`));
  const freeCells = [];

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (!occupied.has(`${x},${y}`)) {
        freeCells.push({ x, y });
      }
    }
  }

  if (freeCells.length === 0) return null;
  return freeCells[Math.floor(Math.random() * freeCells.length)];
}

export function initSnake() {
  return {
    gridSize: GRID_SIZE,
    snake: [{ x: 10, y: 10 }],
    direction: { x: 1, y: 0 },
    food: { x: 15, y: 10 },
    speed: 100,
    lastUpdate: 0,
    score: 0
  };
}

export function updateSnake(state, ctx, canvas, getKeys, playSound, timestamp) {
  const s = state;
  const keys = getKeys();

  if (timestamp - s.lastUpdate < s.speed) {
    return { gameOver: false, score: s.score, skip: true };
  }
  s.lastUpdate = timestamp;

  let newDir = s.direction;
  if (keys['ArrowUp']) newDir = { x: 0, y: -1 };
  if (keys['ArrowDown']) newDir = { x: 0, y: 1 };
  if (keys['ArrowLeft']) newDir = { x: -1, y: 0 };
  if (keys['ArrowRight']) newDir = { x: 1, y: 0 };

  if (newDir.x !== -s.direction.x || newDir.y !== -s.direction.y) {
    s.direction = newDir;
  }

  const head = { x: s.snake[0].x + s.direction.x, y: s.snake[0].y + s.direction.y };
  const cols = Math.floor(canvas.width / s.gridSize);
  const rows = Math.floor(canvas.height / s.gridSize);

  if (head.x < 0 || head.x >= cols || head.y < 0 || head.y >= rows) {
    return { gameOver: true, score: s.score };
  }

  for (const segment of s.snake) {
    if (head.x === segment.x && head.y === segment.y) {
      return { gameOver: true, score: s.score };
    }
  }

  s.snake.unshift(head);

  if (head.x === s.food.x && head.y === s.food.y) {
    s.score += 10;
    s.food = getNextFoodCell(s.snake, cols, rows);
    s.speed = Math.max(50, s.speed - 2);
    if (!s.food) {
      return { gameOver: true, score: s.score };
    }
  } else {
    s.snake.pop();
  }

  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#00ffa3';
  for (let i = 0; i < s.snake.length; i++) {
    const segment = s.snake[i];
    const size = i === 0 ? s.gridSize : s.gridSize - 4;
    const offset = i === 0 ? 0 : 2;
    ctx.fillRect(
      segment.x * s.gridSize + offset,
      segment.y * s.gridSize + offset,
      size,
      size
    );
  }

  ctx.fillStyle = '#ff5c8d';
  if (s.food) {
    ctx.fillRect(s.food.x * s.gridSize, s.food.y * s.gridSize, s.gridSize, s.gridSize);
  }

  return { gameOver: false, score: s.score };
}
