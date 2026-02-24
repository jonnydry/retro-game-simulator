const BREAKOUT_COLORS = ['#ff3366', '#ff6b35', '#ffaa00', '#00ffa3', '#00d4ff', '#7b5cff'];

function createBricks() {
  const bricks = [];
  const rows = 5;
  const cols = 8;
  const brickWidth = 70;
  const brickHeight = 20;
  const padding = 8;
  const offsetX = 35;
  const offsetY = 50;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      bricks.push({
        x: offsetX + col * (brickWidth + padding),
        y: offsetY + row * (brickHeight + padding),
        width: brickWidth,
        height: brickHeight,
        color: BREAKOUT_COLORS[row % BREAKOUT_COLORS.length],
        alive: true
      });
    }
  }
  return bricks;
}

export function initBreakout() {
  return {
    paddleX: 270,
    paddleY: 450,
    paddleWidth: 80,
    paddleHeight: 12,
    ball: { x: 320, y: 440, vx: 4, vy: -4, radius: 6, active: false },
    bricks: createBricks(),
    lives: 3,
    level: 1,
    score: 0,
    launched: false,
    speed: 5,
    lastMoveSoundAt: 0
  };
}

export function updateBreakout(state, ctx, canvas, getKeys, playSound, timestamp = 0) {
  const b = state;
  const keys = getKeys();
  const movingLeft = keys['ArrowLeft'];
  const movingRight = keys['ArrowRight'];

  if (movingLeft) {
    b.paddleX -= 7;
  }
  if (movingRight) {
    b.paddleX += 7;
  }
  if ((movingLeft || movingRight) && timestamp - b.lastMoveSoundAt > 80) {
    playSound('move');
    b.lastMoveSoundAt = timestamp;
  }
  b.paddleX = Math.max(0, Math.min(canvas.width - b.paddleWidth, b.paddleX));

  if (!b.launched && (keys[' '] || keys['Space'])) {
    b.launched = true;
    b.ball.active = true;
    b.ball.vx = (Math.random() > 0.5 ? 1 : -1) * b.speed;
    b.ball.vy = -b.speed;
    playSound('start');
  }

  if (b.launched) {
    b.ball.x += b.ball.vx;
    b.ball.y += b.ball.vy;

    if (b.ball.x - b.ball.radius <= 0 || b.ball.x + b.ball.radius >= canvas.width) {
      b.ball.vx *= -1;
      playSound('hit');
    }
    if (b.ball.y - b.ball.radius <= 0) {
      b.ball.vy *= -1;
      playSound('hit');
    }

    if (
      b.ball.y + b.ball.radius >= b.paddleY &&
      b.ball.y - b.ball.radius <= b.paddleY + b.paddleHeight &&
      b.ball.x >= b.paddleX &&
      b.ball.x <= b.paddleX + b.paddleWidth
    ) {
      b.ball.vy = -Math.abs(b.ball.vy);
      const hitPos = (b.ball.x - b.paddleX) / b.paddleWidth;
      b.ball.vx = (hitPos - 0.5) * 8;
      b.speed = Math.min(10, b.speed + 0.1);
      playSound('hit');
    }

    for (const brick of b.bricks) {
      if (!brick.alive) continue;
      if (
        b.ball.x + b.ball.radius > brick.x &&
        b.ball.x - b.ball.radius < brick.x + brick.width &&
        b.ball.y + b.ball.radius > brick.y &&
        b.ball.y - b.ball.radius < brick.y + brick.height
      ) {
        brick.alive = false;
        const points = 10 * (6 - Math.floor((brick.y - 50) / 28));
        b.score += points;
        b.ball.vy *= -1;
        playSound('explosion');
        break;
      }
    }

    if (b.ball.y > canvas.height) {
      b.lives--;
      b.launched = false;
      b.ball.x = b.paddleX + b.paddleWidth / 2;
      b.ball.y = b.paddleY - 20;
      b.ball.vx = 0;
      b.ball.vy = 0;
      playSound('die');
      if (b.lives <= 0) {
        return { gameOver: true, score: b.score };
      }
    }

    const allDead = b.bricks.every((br) => !br.alive);
    if (allDead) {
      b.level++;
      b.speed += 0.5;
      b.bricks = createBricks();
    }
  } else {
    b.ball.x = b.paddleX + b.paddleWidth / 2;
  }

  ctx.fillStyle = '#0a0a0f';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = 'rgba(123, 92, 255, 0.05)';
  ctx.lineWidth = 1;
  for (let x = 0; x < canvas.width; x += 30) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y < canvas.height; y += 30) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }

  for (const brick of b.bricks) {
    if (!brick.alive) continue;
    ctx.fillStyle = brick.color;
    ctx.shadowColor = brick.color;
    ctx.shadowBlur = 10;
    ctx.fillRect(brick.x, brick.y, brick.width, brick.height);
    ctx.shadowBlur = 0;
  }

  ctx.fillStyle = '#00ffa3';
  ctx.shadowColor = '#00ffa3';
  ctx.shadowBlur = 15;
  ctx.fillRect(b.paddleX, b.paddleY, b.paddleWidth, b.paddleHeight);
  ctx.shadowBlur = 0;

  ctx.beginPath();
  ctx.arc(b.ball.x, b.ball.y, b.ball.radius, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.shadowColor = '#ffffff';
  ctx.shadowBlur = 10;
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.font = 'bold 20px "VT323", "IBM Plex Mono", monospace';
  ctx.fillStyle = '#00ffa3';
  ctx.textAlign = 'left';
  ctx.fillText(`SCORE: ${b.score}`, 20, 30);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#7b5cff';
  ctx.fillText(`LEVEL ${b.level}`, canvas.width / 2, 30);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#ff3366';
  ctx.fillText(`LIVES: ${'♥'.repeat(b.lives)}`, canvas.width - 20, 30);

  if (!b.launched) {
    ctx.font = '16px "VT323", "IBM Plex Mono", monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.textAlign = 'center';
    ctx.fillText('Press SPACE to launch', canvas.width / 2, canvas.height / 2 + 50);
  }

  return { gameOver: false, score: b.score };
}
