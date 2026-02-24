const PADDLE_HEIGHT = 80;
const PADDLE_WIDTH = 10;
const BALL_SIZE = 10;

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
    playerScore: 0,
    aiScore: 0
  };
}

export function updatePong(state, ctx, canvas, getKeys, playSound) {
  const p = state;
  const keys = getKeys();

  if (keys['ArrowUp']) p.playerY -= 6;
  if (keys['ArrowDown']) p.playerY += 6;
  p.playerY = Math.max(0, Math.min(canvas.height - p.paddleHeight, p.playerY));

  const aiSpeed = 3.5;
  if (p.aiY + p.paddleHeight / 2 < p.ballY) p.aiY += aiSpeed;
  else p.aiY -= aiSpeed;
  p.aiY = Math.max(0, Math.min(canvas.height - p.paddleHeight, p.aiY));

  p.ballX += p.ballVX;
  p.ballY += p.ballVY;

  if (p.ballY <= 0 || p.ballY >= canvas.height - p.ballSize) {
    p.ballVY *= -1;
  }

  if (
    p.ballX <= p.paddleWidth &&
    p.ballY + p.ballSize >= p.playerY &&
    p.ballY <= p.playerY + p.paddleHeight
  ) {
    p.ballVX = Math.abs(p.ballVX) * 1.05;
    playSound('hit');
    p.ballVY += (p.ballY - (p.playerY + p.paddleHeight / 2)) * 0.1;
  }

  if (
    p.ballX >= canvas.width - p.paddleWidth - p.ballSize &&
    p.ballY + p.ballSize >= p.aiY &&
    p.ballY <= p.aiY + p.paddleHeight
  ) {
    p.ballVX = -Math.abs(p.ballVX) * 1.05;
    playSound('hit');
    p.ballVY += (p.ballY - (p.aiY + p.paddleHeight / 2)) * 0.1;
  }

  if (p.ballX < 0) {
    p.aiScore++;
    p.ballX = 315;
    p.ballY = 235;
    p.ballVX = 4;
    p.ballVY = 3;
    return { gameOver: p.aiScore >= 10, score: p.playerScore * 10 };
  }
  if (p.ballX > canvas.width) {
    p.playerScore++;
    p.ballX = 315;
    p.ballY = 235;
    p.ballVX = -4;
    p.ballVY = 3;
    return { gameOver: p.playerScore >= 10, score: p.playerScore * 10 };
  }

  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = '#00ffa3';
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 10]);
  ctx.beginPath();
  ctx.moveTo(canvas.width / 2, 0);
  ctx.lineTo(canvas.width / 2, canvas.height);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = '#00ffa3';
  ctx.fillRect(10, p.playerY, p.paddleWidth, p.paddleHeight);
  ctx.fillRect(canvas.width - p.paddleWidth - 10, p.aiY, p.paddleWidth, p.paddleHeight);

  ctx.fillStyle = '#fff';
  ctx.fillRect(p.ballX, p.ballY, p.ballSize, p.ballSize);

  ctx.font = '20px "VT323", "IBM Plex Mono", monospace';
  ctx.fillStyle = '#00ffa3';
  ctx.textAlign = 'center';
  ctx.fillText(String(p.playerScore), canvas.width / 4, 40);
  ctx.fillText(String(p.aiScore), canvas.width * 3 / 4, 40);

  return { gameOver: false, score: p.playerScore * 10 };
}
