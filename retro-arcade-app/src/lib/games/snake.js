const GRID_SIZE = 20;

const FOOD_TYPES = [
  { color: '#ff5c8d', points: 10, probability: 0.6 },
  { color: '#00ffa3', points: 20, probability: 0.25 },
  { color: '#ffd700', points: 50, probability: 0.1 },
  { color: '#ff3366', points: 100, probability: 0.05 }
];

function createParticles(x, y, color, count = 6) {
  return Array.from({ length: count }, () => ({
    x: x * GRID_SIZE + GRID_SIZE / 2,
    y: y * GRID_SIZE + GRID_SIZE / 2,
    vx: (Math.random() - 0.5) * 4,
    vy: (Math.random() - 0.5) * 4,
    life: 1.0,
    color,
    size: Math.random() * 4 + 2
  }));
}

function getRandomFoodType() {
  const rand = Math.random();
  let cumulative = 0;
  for (const type of FOOD_TYPES) {
    cumulative += type.probability;
    if (rand < cumulative) return type;
  }
  return FOOD_TYPES[0];
}

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
  const cell = freeCells[Math.floor(Math.random() * freeCells.length)];
  return { ...cell, type: getRandomFoodType() };
}

export function initSnake() {
  return {
    gridSize: GRID_SIZE,
    snake: [{ x: 10, y: 10 }],
    direction: { x: 1, y: 0 },
    nextDirection: { x: 1, y: 0 },
    food: { x: 15, y: 10, type: FOOD_TYPES[0] },
    speed: 120,
    lastUpdate: 0,
    score: 0,
    particles: [],
    wrapAround: false,
    combo: 0,
    lastEatTime: 0,
    snakeColor: '#00ffa3',
    pulsePhase: 0
  };
}

export function updateSnake(state, ctx, canvas, getKeys, playSound, timestamp) {
  const s = state;
  const keys = getKeys();

  // Update visual effects
  s.pulsePhase += 0.1;
  s.particles = s.particles.filter(pt => {
    pt.x += pt.vx;
    pt.y += pt.vy;
    pt.life -= 0.04;
    pt.vy += 0.05;
    return pt.life > 0;
  });

  // Input buffering - store next direction but don't apply until next tick
  let newDir = null;
  if (keys['ArrowUp']) newDir = { x: 0, y: -1 };
  if (keys['ArrowDown']) newDir = { x: 0, y: 1 };
  if (keys['ArrowLeft']) newDir = { x: -1, y: 0 };
  if (keys['ArrowRight']) newDir = { x: 1, y: 0 };

  // Prevent 180-degree turns
  if (newDir && (newDir.x !== -s.direction.x || newDir.y !== -s.direction.y)) {
    s.nextDirection = newDir;
  }

  // Speed up game progression
  if (timestamp - s.lastUpdate < s.speed) {
    render(ctx, canvas, s);
    return { gameOver: false, score: s.score, skip: true };
  }
  s.lastUpdate = timestamp;

  // Apply buffered direction
  s.direction = s.nextDirection;

  const cols = Math.floor(canvas.width / s.gridSize);
  const rows = Math.floor(canvas.height / s.gridSize);

  let head = { 
    x: s.snake[0].x + s.direction.x, 
    y: s.snake[0].y + s.direction.y 
  };

  // Handle wrap-around or wall collision
  if (s.wrapAround) {
    if (head.x < 0) head.x = cols - 1;
    if (head.x >= cols) head.x = 0;
    if (head.y < 0) head.y = rows - 1;
    if (head.y >= rows) head.y = 0;
  } else {
    if (head.x < 0 || head.x >= cols || head.y < 0 || head.y >= rows) {
      return { gameOver: true, score: s.score };
    }
  }

  // Self collision (always check regardless of wrap)
  for (const segment of s.snake) {
    if (head.x === segment.x && head.y === segment.y) {
      return { gameOver: true, score: s.score };
    }
  }

  s.snake.unshift(head);

  // Check food collision
  if (head.x === s.food.x && head.y === s.food.y) {
    // Calculate combo bonus
    const timeSinceLastEat = timestamp - s.lastEatTime;
    if (timeSinceLastEat < 3000) {
      s.combo = Math.min(s.combo + 1, 5);
    } else {
      s.combo = 0;
    }
    s.lastEatTime = timestamp;

    const basePoints = s.food.type.points;
    const comboBonus = s.combo * 5;
    s.score += basePoints + comboBonus;
    
    // Spawn particles
    s.particles.push(...createParticles(head.x, head.y, s.food.type.color, 10));
    
    // Speed up slightly based on score
    s.speed = Math.max(60, 120 - Math.floor(s.score / 50) * 3);
    
    playSound('start');
    
    // Spawn new food
    s.food = getNextFoodCell(s.snake, cols, rows);
    if (!s.food) {
      // Win condition - board full
      return { gameOver: true, score: s.score };
    }
  } else {
    s.snake.pop();
  }

  render(ctx, canvas, s);

  return { gameOver: false, score: s.score };
}

function render(ctx, canvas, s) {
  // Clear with trail effect
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw grid (subtle)
  ctx.strokeStyle = 'rgba(0, 255, 163, 0.03)';
  ctx.lineWidth = 1;
  for (let x = 0; x < canvas.width; x += s.gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y < canvas.height; y += s.gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }

  // Draw particles
  s.particles.forEach(pt => {
    ctx.globalAlpha = pt.life;
    ctx.fillStyle = pt.color;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, pt.size * pt.life, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;

  // Draw snake with gradient and glow
  for (let i = 0; i < s.snake.length; i++) {
    const segment = s.snake[i];
    const isHead = i === 0;
    
    // Pulse effect for head
    const pulse = isHead ? Math.sin(s.pulsePhase) * 2 : 0;
    const size = isHead ? s.gridSize - 2 + pulse : s.gridSize - 6;
    const offset = isHead ? 1 - pulse / 2 : 3;
    
    const x = segment.x * s.gridSize + offset;
    const y = segment.y * s.gridSize + offset;
    
    // Gradient based on position in snake
    const alpha = Math.max(0.4, 1 - (i / s.snake.length) * 0.6);
    ctx.fillStyle = isHead ? '#ffffff' : `rgba(0, 255, 163, ${alpha})`;
    
    if (isHead) {
      ctx.shadowColor = '#00ffa3';
      ctx.shadowBlur = 20;
    }
    
    // Rounded corners for segments
    roundRect(ctx, x, y, size, size, 3);
    ctx.fill();
    ctx.shadowBlur = 0;
    
    // Draw eyes on head
    if (isHead) {
      ctx.fillStyle = '#000';
      const eyeSize = 3;
      const eyeOffset = size / 4;
      
      if (s.direction.x === 1) { // Moving right
        ctx.fillRect(x + size - eyeOffset - eyeSize, y + eyeOffset, eyeSize, eyeSize);
        ctx.fillRect(x + size - eyeOffset - eyeSize, y + size - eyeOffset * 2, eyeSize, eyeSize);
      } else if (s.direction.x === -1) { // Moving left
        ctx.fillRect(x + eyeOffset, y + eyeOffset, eyeSize, eyeSize);
        ctx.fillRect(x + eyeOffset, y + size - eyeOffset * 2, eyeSize, eyeSize);
      } else if (s.direction.y === -1) { // Moving up
        ctx.fillRect(x + eyeOffset, y + eyeOffset, eyeSize, eyeSize);
        ctx.fillRect(x + size - eyeOffset * 2, y + eyeOffset, eyeSize, eyeSize);
      } else { // Moving down
        ctx.fillRect(x + eyeOffset, y + size - eyeOffset - eyeSize, eyeSize, eyeSize);
        ctx.fillRect(x + size - eyeOffset * 2, y + size - eyeOffset - eyeSize, eyeSize, eyeSize);
      }
    }
  }

  // Draw food with glow based on type
  if (s.food) {
    const foodX = s.food.x * s.gridSize;
    const foodY = s.food.y * s.gridSize;
    const pulse = Math.sin(s.pulsePhase * 2) * 2;
    
    ctx.shadowColor = s.food.type.color;
    ctx.shadowBlur = 15 + pulse;
    ctx.fillStyle = s.food.type.color;
    
    // Draw food as circle
    ctx.beginPath();
    ctx.arc(
      foodX + s.gridSize / 2, 
      foodY + s.gridSize / 2, 
      (s.gridSize / 2 - 3) + pulse * 0.3, 
      0, 
      Math.PI * 2
    );
    ctx.fill();
    ctx.shadowBlur = 0;
    
    // Draw point value for special food
    if (s.food.type.points >= 50) {
      ctx.font = '10px monospace';
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.fillText(s.food.type.points, foodX + s.gridSize / 2, foodY - 5);
    }
  }

  // Draw score and combo
  ctx.font = 'bold 20px "VT323", "IBM Plex Mono", monospace';
  ctx.fillStyle = '#00ffa3';
  ctx.textAlign = 'left';
  ctx.fillText(`SCORE: ${s.score}`, 15, 30);
  
  if (s.combo > 0) {
    ctx.font = 'bold 16px "VT323", "IBM Plex Mono", monospace';
    ctx.fillStyle = `rgba(255, 215, 0, ${Math.min(s.combo * 0.2, 1)})`;
    ctx.fillText(`${s.combo}x COMBO!`, 15, 55);
  }
  
  // Draw speed indicator
  ctx.fillStyle = 'rgba(0, 255, 163, 0.5)';
  ctx.font = '12px "VT323", "IBM Plex Mono", monospace';
  ctx.textAlign = 'right';
  ctx.fillText(`SPEED: ${Math.round((120 - s.speed) / 60 * 100)}%`, canvas.width - 15, 30);
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}
