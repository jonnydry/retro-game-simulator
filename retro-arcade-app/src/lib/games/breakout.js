const BREAKOUT_COLORS = ['#ff3366', '#ff6b35', '#ffaa00', '#00ffa3', '#00d4ff', '#7b5cff'];

const POWER_UP_TYPES = [
  { type: 'multiball', color: '#00d4ff', symbol: '●', duration: 0, probability: 0.15 },
  { type: 'expand', color: '#00ffa3', symbol: '↔', duration: 10000, probability: 0.2 },
  { type: 'slow', color: '#ffaa00', symbol: '◐', duration: 8000, probability: 0.25 },
  { type: 'laser', color: '#ff3366', symbol: '|', duration: 12000, probability: 0.1 },
  { type: 'points', color: '#ffd700', symbol: '+', duration: 0, probability: 0.3 }
];

function createBricks(level = 1) {
  const bricks = [];
  const rows = Math.min(5 + Math.floor(level / 2), 8);
  const cols = 8;
  const brickWidth = 70;
  const brickHeight = 20;
  const padding = 8;
  const offsetX = 35;
  const offsetY = 50;
  
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      // Skip some bricks on higher levels for interesting patterns
      if (level > 2 && (row + col) % (11 - level) === 0 && Math.random() > 0.5) {
        continue;
      }
      
      bricks.push({
        x: offsetX + col * (brickWidth + padding),
        y: offsetY + row * (brickHeight + padding),
        width: brickWidth,
        height: brickHeight,
        color: BREAKOUT_COLORS[row % BREAKOUT_COLORS.length],
        alive: true,
        health: level > 3 ? Math.min(Math.floor(level / 3), 3) : 1,
        maxHealth: level > 3 ? Math.min(Math.floor(level / 3), 3) : 1
      });
    }
  }
  return bricks;
}

function createParticles(x, y, color, count = 8) {
  return Array.from({ length: count }, () => ({
    x,
    y,
    vx: (Math.random() - 0.5) * 8,
    vy: (Math.random() - 0.5) * 8,
    life: 1.0,
    color,
    size: Math.random() * 4 + 2
  }));
}

function createPowerUp(x, y) {
  const rand = Math.random();
  let cumulative = 0;
  
  for (const p of POWER_UP_TYPES) {
    cumulative += p.probability;
    if (rand < cumulative) {
      return {
        x,
        y,
        ...p,
        active: true
      };
    }
  }
  return null;
}

export function initBreakout() {
  return {
    paddleX: 270,
    paddleY: 450,
    paddleWidth: 80,
    paddleHeight: 12,
    basePaddleWidth: 80,
    balls: [{
      x: 320, y: 440, vx: 4, vy: -4, radius: 6, active: false
    }],
    bricks: createBricks(),
    lives: 3,
    level: 1,
    score: 0,
    launched: false,
    baseSpeed: 5,
    speed: 5,
    lastMoveSoundAt: 0,
    particles: [],
    powerUps: [],
    activePowerUps: {},
    lasers: [],
    shake: 0,
    combo: 0,
    lastHitTime: 0,
    brickHits: 0
  };
}

export function updateBreakout(state, ctx, canvas, getKeys, playSound, timestamp = 0) {
  const b = state;
  const keys = getKeys();
  const movingLeft = keys['ArrowLeft'];
  const movingRight = keys['ArrowRight'];

  // Screen shake decay
  b.shake *= 0.9;

  // Paddle movement
  if (movingLeft) b.paddleX -= 8;
  if (movingRight) b.paddleX += 8;
  if ((movingLeft || movingRight) && timestamp - b.lastMoveSoundAt > 80) {
    playSound('move');
    b.lastMoveSoundAt = timestamp;
  }
  b.paddleX = Math.max(0, Math.min(canvas.width - b.paddleWidth, b.paddleX));

  // Laser firing
  if (b.activePowerUps.laser && keys[' '] && timestamp - (b.lastLaserShot || 0) > 300) {
    b.lasers.push({
      x: b.paddleX + 5,
      y: b.paddleY,
      width: 4,
      height: 15,
      active: true
    });
    b.lasers.push({
      x: b.paddleX + b.paddleWidth - 9,
      y: b.paddleY,
      width: 4,
      height: 15,
      active: true
    });
    b.lastLaserShot = timestamp;
    playSound('hit');
  }

  // Launch ball
  if (!b.launched && (keys[' '] || keys['Space'])) {
    b.launched = true;
    b.balls.forEach(ball => {
      ball.active = true;
      ball.vx = (Math.random() > 0.5 ? 1 : -1) * b.speed;
      ball.vy = -b.speed;
    });
    playSound('start');
  }

  // Update particles
  b.particles = b.particles.filter(pt => {
    pt.x += pt.vx;
    pt.y += pt.vy;
    pt.vy += 0.2;
    pt.life -= 0.025;
    return pt.life > 0;
  });

  // Update power-ups
  b.powerUps = b.powerUps.filter(p => {
    p.y += 3;
    
    // Check collection
    if (
      p.y + 15 >= b.paddleY &&
      p.y <= b.paddleY + b.paddleHeight &&
      p.x >= b.paddleX &&
      p.x <= b.paddleX + b.paddleWidth
    ) {
      activatePowerUp(b, p, timestamp);
      playSound('start');
      return false;
    }
    
    return p.y < canvas.height;
  });

  // Update active power-up timers
  Object.keys(b.activePowerUps).forEach(key => {
    if (b.activePowerUps[key].expires && timestamp > b.activePowerUps[key].expires) {
      deactivatePowerUp(b, key);
    }
  });

  // Update lasers
  b.lasers = b.lasers.filter(laser => {
    laser.y -= 10;
    
    // Check laser-brick collision
    for (const brick of b.bricks) {
      if (!brick.alive) continue;
      if (
        laser.x + laser.width > brick.x &&
        laser.x < brick.x + brick.width &&
        laser.y < brick.y + brick.height &&
        laser.y + laser.height > brick.y
      ) {
        hitBrick(b, brick, playSound);
        return false;
      }
    }
    
    return laser.y > 0;
  });

  // Update balls
  let activeBalls = 0;
  b.balls = b.balls.filter(ball => {
    if (!ball.active) return true;
    
    ball.x += ball.vx;
    ball.y += ball.vy;

    // Wall collisions
    if (ball.x - ball.radius <= 0 || ball.x + ball.radius >= canvas.width) {
      ball.vx *= -1;
      playSound('hit');
    }
    if (ball.y - ball.radius <= 0) {
      ball.vy *= -1;
      playSound('hit');
    }

    // Paddle collision
    if (
      ball.y + ball.radius >= b.paddleY &&
      ball.y - ball.radius <= b.paddleY + b.paddleHeight &&
      ball.x >= b.paddleX &&
      ball.x <= b.paddleX + b.paddleWidth &&
      ball.vy > 0
    ) {
      ball.vy = -Math.abs(ball.vy);
      const hitPos = (ball.x - b.paddleX) / b.paddleWidth;
      ball.vx = (hitPos - 0.5) * 10;
      
      // Speed up slightly with each hit
      b.speed = Math.min(10, b.speed + 0.05);
      b.combo = 0; // Reset combo on paddle hit
      playSound('hit');
    }

    // Brick collisions
    for (const brick of b.bricks) {
      if (!brick.alive) continue;
      if (
        ball.x + ball.radius > brick.x &&
        ball.x - ball.radius < brick.x + brick.width &&
        ball.y + ball.radius > brick.y &&
        ball.y - ball.radius < brick.y + brick.height
      ) {
        const overlapLeft = (ball.x + ball.radius) - brick.x;
        const overlapRight = (brick.x + brick.width) - (ball.x - ball.radius);
        const overlapTop = (ball.y + ball.radius) - brick.y;
        const overlapBottom = (brick.y + brick.height) - (ball.y - ball.radius);
        
        const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);
        
        if (minOverlap === overlapLeft || minOverlap === overlapRight) {
          ball.vx *= -1;
        } else {
          ball.vy *= -1;
        }
        
        hitBrick(b, brick, playSound);
        break;
      }
    }

    // Ball out of bounds
    if (ball.y > canvas.height) {
      return false;
    }
    
    activeBalls++;
    return true;
  });

  // Lose life if no balls
  if (b.launched && activeBalls === 0) {
    b.lives--;
    b.balls = [{ x: b.paddleX + b.paddleWidth / 2, y: b.paddleY - 20, vx: 0, vy: 0, radius: 6, active: false }];
    b.launched = false;
    b.speed = b.baseSpeed;
    b.combo = 0;
    b.activePowerUps = {};
    b.paddleWidth = b.basePaddleWidth;
    playSound('die');
    
    if (b.lives <= 0) {
      return { gameOver: true, score: b.score };
    }
  }

  // Check level complete
  const aliveBricks = b.bricks.filter(br => br.alive).length;
  if (aliveBricks === 0) {
    b.level++;
    b.baseSpeed = Math.min(8, b.baseSpeed + 0.3);
    b.speed = b.baseSpeed;
    b.bricks = createBricks(b.level);
    b.balls = [{ x: b.paddleX + b.paddleWidth / 2, y: b.paddleY - 20, vx: 0, vy: 0, radius: 6, active: false }];
    b.launched = false;
    b.activePowerUps = {};
    b.paddleWidth = b.basePaddleWidth;
    b.combo = 0;
    playSound('start');
  }

  render(ctx, canvas, b);

  return { gameOver: false, score: b.score };
}

function hitBrick(b, brick, playSound) {
  brick.health--;
  b.brickHits++;
  
  if (brick.health <= 0) {
    brick.alive = false;
    b.shake = 5;
    
    // Combo system
    const now = Date.now();
    if (now - b.lastHitTime < 2000) {
      b.combo = Math.min(b.combo + 1, 10);
    } else {
      b.combo = 0;
    }
    b.lastHitTime = now;
    
    const points = (10 * (6 - Math.floor((brick.y - 50) / 28))) * (1 + b.combo * 0.1);
    b.score += Math.floor(points);
    
    // Spawn particles
    b.particles.push(...createParticles(
      brick.x + brick.width / 2,
      brick.y + brick.height / 2,
      brick.color,
      12
    ));
    
    // Chance to spawn power-up
    if (Math.random() < 0.2) {
      const powerUp = createPowerUp(brick.x + brick.width / 2, brick.y);
      if (powerUp) b.powerUps.push(powerUp);
    }
    
    playSound('explosion');
  } else {
    // Brick damaged but not destroyed
    b.particles.push(...createParticles(
      brick.x + brick.width / 2,
      brick.y + brick.height / 2,
      '#ffffff',
      4
    ));
    playSound('hit');
  }
}

function activatePowerUp(b, powerUp, timestamp) {
  switch (powerUp.type) {
    case 'multiball':
      const newBalls = [];
      b.balls.forEach(ball => {
        if (ball.active) {
          newBalls.push({
            x: ball.x,
            y: ball.y,
            vx: -ball.vx,
            vy: ball.vy,
            radius: ball.radius,
            active: true
          });
        }
      });
      b.balls.push(...newBalls);
      break;
      
    case 'expand':
      b.paddleWidth = Math.min(160, b.basePaddleWidth * 1.5);
      b.activePowerUps.expand = { expires: timestamp + powerUp.duration };
      break;
      
    case 'slow':
      b.speed = Math.max(3, b.baseSpeed * 0.6);
      b.activePowerUps.slow = { expires: timestamp + powerUp.duration };
      break;
      
    case 'laser':
      b.activePowerUps.laser = { expires: timestamp + powerUp.duration };
      break;
      
    case 'points':
      b.score += 500;
      break;
  }
}

function deactivatePowerUp(b, type) {
  delete b.activePowerUps[type];
  
  switch (type) {
    case 'expand':
      b.paddleWidth = b.basePaddleWidth;
      break;
    case 'slow':
      b.speed = b.baseSpeed;
      break;
  }
}

function render(ctx, canvas, b) {
  // Apply screen shake
  const shakeX = (Math.random() - 0.5) * b.shake;
  const shakeY = (Math.random() - 0.5) * b.shake;
  ctx.save();
  ctx.translate(shakeX, shakeY);

  // Clear
  ctx.fillStyle = '#0a0a0f';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw grid
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

  // Draw bricks with health indicators
  for (const brick of b.bricks) {
    if (!brick.alive) continue;
    
    ctx.fillStyle = brick.color;
    ctx.shadowColor = brick.color;
    ctx.shadowBlur = brick.health > 1 ? 15 : 5;
    ctx.fillRect(brick.x, brick.y, brick.width, brick.height);
    
    // Draw health indicator
    if (brick.health > 1) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.fillRect(brick.x + 5, brick.y + 5, brick.width - 10, 3);
      ctx.fillStyle = '#fff';
      ctx.fillRect(brick.x + 5, brick.y + 5, (brick.width - 10) * (brick.health / brick.maxHealth), 3);
    }
    
    ctx.shadowBlur = 0;
  }

  // Draw particles
  b.particles.forEach(pt => {
    ctx.globalAlpha = pt.life;
    ctx.fillStyle = pt.color;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, pt.size * pt.life, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;

  // Draw paddle with glow
  ctx.fillStyle = b.activePowerUps.laser ? '#ff3366' : '#00ffa3';
  ctx.shadowColor = b.activePowerUps.laser ? '#ff3366' : '#00ffa3';
  ctx.shadowBlur = 20;
  ctx.fillRect(b.paddleX, b.paddleY, b.paddleWidth, b.paddleHeight);
  
  // Draw laser ports if active
  if (b.activePowerUps.laser) {
    ctx.fillStyle = '#fff';
    ctx.fillRect(b.paddleX + 3, b.paddleY - 5, 8, 5);
    ctx.fillRect(b.paddleX + b.paddleWidth - 11, b.paddleY - 5, 8, 5);
  }
  ctx.shadowBlur = 0;

  // Draw balls
  b.balls.forEach(ball => {
    if (!ball.active) return;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.shadowBlur = 0;
  });

  // Draw lasers
  b.lasers.forEach(laser => {
    ctx.fillStyle = '#ff3366';
    ctx.shadowColor = '#ff3366';
    ctx.shadowBlur = 10;
    ctx.fillRect(laser.x, laser.y, laser.width, laser.height);
    ctx.shadowBlur = 0;
  });

  // Draw falling power-ups
  b.powerUps.forEach(p => {
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(p.symbol, p.x, p.y + 5);
  });

  // Draw HUD
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
  
  // Draw combo
  if (b.combo > 0) {
    ctx.font = 'bold 18px "VT323", "IBM Plex Mono", monospace';
    ctx.fillStyle = `rgba(255, 215, 0, ${Math.min(b.combo * 0.15, 1)})`;
    ctx.textAlign = 'center';
    ctx.fillText(`${b.combo}x COMBO!`, canvas.width / 2, 55);
  }
  
  // Draw active power-up timers
  let powerUpY = 55;
  Object.keys(b.activePowerUps).forEach(key => {
    const pu = b.activePowerUps[key];
    if (pu.expires) {
      const remaining = Math.max(0, (pu.expires - Date.now()) / 1000);
      const pType = POWER_UP_TYPES.find(p => p.type === key);
      if (pType && remaining > 0) {
        ctx.fillStyle = pType.color;
        ctx.font = '12px "VT323", monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`${pType.symbol} ${remaining.toFixed(1)}s`, 20, powerUpY);
        powerUpY += 18;
      }
    }
  });

  // Launch hint
  if (!b.launched) {
    ctx.font = '16px "VT323", "IBM Plex Mono", monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.textAlign = 'center';
    ctx.fillText('Press SPACE to launch', canvas.width / 2, canvas.height / 2 + 50);
  }

  ctx.restore();
}
