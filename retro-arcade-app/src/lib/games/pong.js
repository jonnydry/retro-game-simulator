const PADDLE_HEIGHT = 80;
const PADDLE_WIDTH = 10;
const BALL_SIZE = 10;

function createParticles(x, y, color, count = 8) {
  return Array.from({ length: count }, () => ({
    x,
    y,
    vx: (Math.random() - 0.5) * 6,
    vy: (Math.random() - 0.5) * 6,
    life: 1.0,
    color
  }));
}

export function initPong() {
  return {
    paddleHeight: PADDLE_HEIGHT,
    paddleWidth: PADDLE_WIDTH,
    ballSize: BALL_SIZE,
    playerY: 200,
    aiY: 200,
    ballX: 315,
    ballY: 235,
    ballVX: 4,
    ballVY: 3,
    ballSpin: 0,
    playerScore: 0,
    aiScore: 0,
    particles: [],
    ballTrail: [],
    playerVelocity: 0,
    aiVelocity: 0,
    lastPlayerY: 200,
    lastAiY: 200,
    rallyCount: 0,
    baseSpeed: 4
  };
}

export function updatePong(state, ctx, canvas, getKeys, playSound) {
  const p = state;
  const keys = getKeys();

  // Track paddle velocities for spin effect
  p.playerVelocity = p.playerY - p.lastPlayerY;
  p.aiVelocity = p.aiY - p.lastAiY;
  p.lastPlayerY = p.playerY;
  p.lastAiY = p.aiY;

  // Player movement with acceleration
  let playerTarget = p.playerY;
  if (keys['ArrowUp']) playerTarget -= 8;
  if (keys['ArrowDown']) playerTarget += 8;
  p.playerY = p.playerY * 0.7 + playerTarget * 0.3;
  p.playerY = Math.max(0, Math.min(canvas.height - p.paddleHeight, p.playerY));

  // Predictive AI with reaction delay and error
  const aiCenter = p.aiY + p.paddleHeight / 2;
  let targetY = p.ballY;
  
  // Predict where ball will be when it reaches AI paddle
  if (p.ballVX > 0) {
    const timeToReach = (canvas.width - p.paddleWidth - p.ballX) / p.ballVX;
    targetY = p.ballY + p.ballVY * timeToReach;
    
    // Bounce prediction off walls
    while (targetY < 0 || targetY > canvas.height) {
      if (targetY < 0) targetY = -targetY;
      if (targetY > canvas.height) targetY = 2 * canvas.height - targetY;
    }
  }
  
  // AI difficulty based on score difference (gets harder when losing)
  const scoreDiff = p.aiScore - p.playerScore;
  const baseSpeed = 3.5 + Math.max(0, -scoreDiff * 0.15);
  const maxSpeed = baseSpeed + Math.min(p.rallyCount * 0.1, 2);
  
  // AI reaction delay
  const reactionDelay = Math.max(2, 8 - p.rallyCount * 0.3);
  if (Math.random() > 1 / reactionDelay) {
    if (aiCenter < targetY - 5) {
      p.aiY += Math.min(maxSpeed, targetY - aiCenter);
    } else if (aiCenter > targetY + 5) {
      p.aiY -= Math.min(maxSpeed, aiCenter - targetY);
    }
  }
  
  p.aiY = Math.max(0, Math.min(canvas.height - p.paddleHeight, p.aiY));

  // Update ball trail
  p.ballTrail.push({ x: p.ballX, y: p.ballY, alpha: 1.0 });
  if (p.ballTrail.length > 10) p.ballTrail.shift();
  p.ballTrail.forEach(t => t.alpha *= 0.85);

  // Ball movement with spin
  p.ballX += p.ballVX;
  p.ballY += p.ballVY + p.ballSpin;
  p.ballSpin *= 0.95; // Spin decay

  // Wall collisions with particle effects
  if (p.ballY <= 0) {
    p.ballY = 0;
    p.ballVY = Math.abs(p.ballVY);
    p.particles.push(...createParticles(p.ballX, 0, '#00ffa3'));
    playSound('hit');
  }
  if (p.ballY >= canvas.height - p.ballSize) {
    p.ballY = canvas.height - p.ballSize;
    p.ballVY = -Math.abs(p.ballVY);
    p.particles.push(...createParticles(p.ballX, canvas.height, '#00ffa3'));
    playSound('hit');
  }

  // Player paddle collision with spin physics
  if (
    p.ballX <= p.paddleWidth + 10 &&
    p.ballY + p.ballSize >= p.playerY &&
    p.ballY <= p.playerY + p.paddleHeight &&
    p.ballVX < 0
  ) {
    p.ballVX = Math.abs(p.ballVX) * 1.02;
    const hitOffset = (p.ballY - (p.playerY + p.paddleHeight / 2)) / (p.paddleHeight / 2);
    p.ballVY = hitOffset * 5 + p.playerVelocity * 0.3;
    p.ballSpin = p.playerVelocity * 0.05;
    p.rallyCount++;
    
    p.particles.push(...createParticles(p.ballX, p.ballY + p.ballSize / 2, '#00ffa3', 12));
    playSound('hit');
  }

  // AI paddle collision with spin physics
  if (
    p.ballX >= canvas.width - p.paddleWidth - 10 - p.ballSize &&
    p.ballY + p.ballSize >= p.aiY &&
    p.ballY <= p.aiY + p.paddleHeight &&
    p.ballVX > 0
  ) {
    p.ballVX = -Math.abs(p.ballVX) * 1.02;
    const hitOffset = (p.ballY - (p.aiY + p.paddleHeight / 2)) / (p.paddleHeight / 2);
    p.ballVY = hitOffset * 5 + p.aiVelocity * 0.3;
    p.ballSpin = p.aiVelocity * 0.05;
    p.rallyCount++;
    
    p.particles.push(...createParticles(p.ballX, p.ballY + p.ballSize / 2, '#00ffa3', 12));
    playSound('hit');
  }

  // Cap ball speed
  const maxBallSpeed = 10 + Math.min(p.rallyCount * 0.2, 4);
  const currentSpeed = Math.sqrt(p.ballVX * p.ballVX + p.ballVY * p.ballVY);
  if (currentSpeed > maxBallSpeed) {
    p.ballVX = (p.ballVX / currentSpeed) * maxBallSpeed;
    p.ballVY = (p.ballVY / currentSpeed) * maxBallSpeed;
  }

  // Score and reset
  if (p.ballX < -20) {
    p.aiScore++;
    p.rallyCount = 0;
    p.particles.push(...createParticles(0, p.ballY, '#ff3366', 20));
    resetBall(p, canvas, 1);
    playSound('die');
    return { gameOver: p.aiScore >= 10, score: p.playerScore * 100 + p.rallyCount * 10 };
  }
  if (p.ballX > canvas.width + 20) {
    p.playerScore++;
    p.rallyCount = 0;
    p.particles.push(...createParticles(canvas.width, p.ballY, '#00ffa3', 20));
    resetBall(p, canvas, -1);
    playSound('start');
    return { gameOver: p.playerScore >= 10, score: p.playerScore * 100 + p.rallyCount * 10 };
  }

  // Update particles
  p.particles = p.particles.filter(pt => {
    pt.x += pt.vx;
    pt.y += pt.vy;
    pt.life -= 0.03;
    pt.vy += 0.1; // Gravity
    return pt.life > 0;
  });

  render(ctx, canvas, p);

  return { gameOver: false, score: p.playerScore * 100 + p.rallyCount * 10 };
}

function resetBall(p, canvas, direction) {
  p.ballX = canvas.width / 2;
  p.ballY = canvas.height / 2;
  p.ballVX = p.baseSpeed * direction;
  p.ballVY = (Math.random() - 0.5) * 4;
  p.ballSpin = 0;
  p.ballTrail = [];
}

function render(ctx, canvas, p) {
  // Clear with slight fade for motion blur effect
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw center line
  ctx.strokeStyle = 'rgba(0, 255, 163, 0.3)';
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 15]);
  ctx.beginPath();
  ctx.moveTo(canvas.width / 2, 0);
  ctx.lineTo(canvas.width / 2, canvas.height);
  ctx.stroke();
  ctx.setLineDash([]);

  // Draw ball trail
  p.ballTrail.forEach((t, i) => {
    const size = BALL_SIZE * (i / p.ballTrail.length);
    ctx.fillStyle = `rgba(255, 255, 255, ${t.alpha * 0.3})`;
    ctx.fillRect(t.x + (BALL_SIZE - size) / 2, t.y + (BALL_SIZE - size) / 2, size, size);
  });

  // Draw particles
  p.particles.forEach(pt => {
    ctx.globalAlpha = pt.life;
    ctx.fillStyle = pt.color;
    ctx.fillRect(pt.x - 2, pt.y - 2, 4, 4);
  });
  ctx.globalAlpha = 1;

  // Draw paddles with glow
  ctx.shadowColor = '#00ffa3';
  ctx.shadowBlur = 15;
  ctx.fillStyle = '#00ffa3';
  ctx.fillRect(10, p.playerY, p.paddleWidth, p.paddleHeight);
  ctx.fillRect(canvas.width - p.paddleWidth - 10, p.aiY, p.paddleWidth, p.paddleHeight);
  ctx.shadowBlur = 0;

  // Draw ball with glow
  ctx.shadowColor = '#ffffff';
  ctx.shadowBlur = 20;
  ctx.fillStyle = '#fff';
  ctx.fillRect(p.ballX, p.ballY, p.ballSize, p.ballSize);
  ctx.shadowBlur = 0;

  // Draw scores
  ctx.font = 'bold 40px "VT323", "IBM Plex Mono", monospace';
  ctx.fillStyle = 'rgba(0, 255, 163, 0.5)';
  ctx.textAlign = 'center';
  ctx.fillText(String(p.playerScore), canvas.width / 4, 60);
  ctx.fillStyle = 'rgba(255, 51, 102, 0.5)';
  ctx.fillText(String(p.aiScore), canvas.width * 3 / 4, 60);
  
  // Draw rally counter
  if (p.rallyCount > 2) {
    ctx.font = '20px "VT323", "IBM Plex Mono", monospace';
    ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(p.rallyCount * 0.1, 1)})`;
    ctx.fillText(`${p.rallyCount}x RALLY!`, canvas.width / 2, canvas.height - 20);
  }
}
