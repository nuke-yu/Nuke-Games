// ============================================================
// Tetris Game - 俄罗斯方块
// ============================================================

const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30;
const PREVIEW_BLOCK_SIZE = 24;

const SHAPES = {
  I: { color: '#00f0f0', matrix: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]] },
  O: { color: '#f0f000', matrix: [[1,1],[1,1]] },
  T: { color: '#a000f0', matrix: [[0,1,0],[1,1,1],[0,0,0]] },
  S: { color: '#00f000', matrix: [[0,1,1],[1,1,0],[0,0,0]] },
  Z: { color: '#f00000', matrix: [[1,1,0],[0,1,1],[0,0,0]] },
  J: { color: '#0000f0', matrix: [[1,0,0],[1,1,1],[0,0,0]] },
  L: { color: '#f0a000', matrix: [[0,0,1],[1,1,1],[0,0,0]] },
};
const SHAPE_KEYS = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
canvas.width = COLS * BLOCK_SIZE;
canvas.height = ROWS * BLOCK_SIZE;

const nextCanvas = document.getElementById('next-canvas');
const nextCtx = nextCanvas.getContext('2d');
nextCanvas.width = 4 * PREVIEW_BLOCK_SIZE;
nextCanvas.height = 4 * PREVIEW_BLOCK_SIZE;

const scoreDisplay = document.getElementById('score-display');
const levelDisplay = document.getElementById('level-display');
const restartBtn = document.getElementById('restart-btn');
const gameOverOverlay = document.getElementById('game-over-overlay');
const gameOverScore = document.getElementById('game-over-score');
const gameOverRestartBtn = document.getElementById('game-over-restart-btn');

let board = [];
let currentPiece = null;
let nextPiece = null;
let score = 0;
let level = 1;
let gameOver = false;
let animationId = null;
let lastDropTime = 0;

function getDropInterval(level) {
  return Math.max(100, 800 - (level - 1) * 70);
}

function initBoard() {
  board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

function createPiece(type) {
  const shape = SHAPES[type];
  return {
    type: type,
    matrix: shape.matrix.map(row => [...row]),
    color: shape.color,
    x: Math.floor((COLS - shape.matrix[0].length) / 2),
    y: 0,
  };
}

function getRandomPieceType() {
  return SHAPE_KEYS[Math.floor(Math.random() * SHAPE_KEYS.length)];
}

function spawnNewPiece() {
  if (!nextPiece) {
    nextPiece = createPiece(getRandomPieceType());
  }
  currentPiece = {
    type: nextPiece.type,
    matrix: nextPiece.matrix.map(row => [...row]),
    color: nextPiece.color,
    x: Math.floor((COLS - nextPiece.matrix[0].length) / 2),
    y: 0,
  };
  nextPiece = createPiece(getRandomPieceType());

  if (collision(currentPiece.matrix, currentPiece.x, currentPiece.y)) {
    endGame();
  }
}

function collision(matrix, offsetX, offsetY) {
  for (let r = 0; r < matrix.length; r++) {
    for (let c = 0; c < matrix[0].length; c++) {
      if (matrix[r][c] !== 0) {
        const boardX = offsetX + c;
        const boardY = offsetY + r;
        if (boardX < 0 || boardX >= COLS || boardY >= ROWS || boardY < 0) {
          return true;
        }
        if (boardY >= 0 && board[boardY][boardX] !== null) {
          return true;
        }
      }
    }
  }
  return false;
}

function lockPiece() {
  const m = currentPiece.matrix;
  for (let r = 0; r < m.length; r++) {
    for (let c = 0; c < m[0].length; c++) {
      if (m[r][c] !== 0) {
        const boardX = currentPiece.x + c;
        const boardY = currentPiece.y + r;
        if (boardY >= 0 && boardY < ROWS && boardX >= 0 && boardX < COLS) {
          board[boardY][boardX] = currentPiece.color;
        }
      }
    }
  }
  clearFullRows();
  spawnNewPiece();
}

function clearFullRows() {
  let rowsCleared = 0;
  for (let r = ROWS - 1; r >= 0; ) {
    if (board[r].every(cell => cell !== null)) {
      board.splice(r, 1);
      board.unshift(Array(COLS).fill(null));
      rowsCleared++;
    } else {
      r--;
    }
  }
  if (rowsCleared > 0) {
    addScore(rowsCleared);
  }
}

function addScore(rows) {
  const points = [0, 100, 300, 500, 800];
  const add = points[Math.min(rows, 4)];
  score += add;
  updateLevel();
  updateUI();
}

function updateLevel() {
  const newLevel = Math.floor(score / 1000) + 1;
  if (newLevel !== level) {
    level = newLevel;
    resetDropTimer();
  }
}

function moveLeft() {
  if (gameOver || !currentPiece) return;
  if (!collision(currentPiece.matrix, currentPiece.x - 1, currentPiece.y)) {
    currentPiece.x--;
  }
}

function moveRight() {
  if (gameOver || !currentPiece) return;
  if (!collision(currentPiece.matrix, currentPiece.x + 1, currentPiece.y)) {
    currentPiece.x++;
  }
}

function moveDown() {
  if (gameOver || !currentPiece) return;
  if (!collision(currentPiece.matrix, currentPiece.x, currentPiece.y + 1)) {
    currentPiece.y++;
  } else {
    lockPiece();
  }
}

function hardDrop() {
  if (gameOver || !currentPiece) return;
  while (!collision(currentPiece.matrix, currentPiece.x, currentPiece.y + 1)) {
    currentPiece.y++;
  }
  lockPiece();
}

function rotatePiece() {
  if (gameOver || !currentPiece) return;
  const matrix = currentPiece.matrix;
  const n = matrix.length;
  const rotated = Array.from({ length: n }, () => Array(n).fill(0));
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      rotated[c][n - 1 - r] = matrix[r][c];
    }
  }
  if (!collision(rotated, currentPiece.x, currentPiece.y)) {
    currentPiece.matrix = rotated;
  }
}

function drawBlock(context, x, y, color, size) {
  context.fillStyle = color;
  context.fillRect(x * size, y * size, size - 1, size - 1);
  context.fillStyle = 'rgba(255,255,255,0.15)';
  context.fillRect(x * size, y * size, size - 1, 2);
  context.fillRect(x * size, y * size, 2, size - 1);
}

function draw() {
  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (board[r][c] !== null) {
        drawBlock(ctx, c, r, board[r][c], BLOCK_SIZE);
      }
    }
  }

  if (currentPiece && !gameOver) {
    const m = currentPiece.matrix;
    for (let r = 0; r < m.length; r++) {
      for (let c = 0; c < m[0].length; c++) {
        if (m[r][c] !== 0) {
          const boardX = currentPiece.x + c;
          const boardY = currentPiece.y + r;
          if (boardY >= 0) {
            drawBlock(ctx, boardX, boardY, currentPiece.color, BLOCK_SIZE);
          }
        }
      }
    }
  }

  ctx.strokeStyle = 'rgba(255,255,255,0.03)';
  ctx.lineWidth = 0.5;
  for (let r = 0; r <= ROWS; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * BLOCK_SIZE);
    ctx.lineTo(canvas.width, r * BLOCK_SIZE);
    ctx.stroke();
  }
  for (let c = 0; c <= COLS; c++) {
    ctx.beginPath();
    ctx.moveTo(c * BLOCK_SIZE, 0);
    ctx.lineTo(c * BLOCK_SIZE, canvas.height);
    ctx.stroke();
  }

  drawPreview();
}

function drawPreview() {
  nextCtx.fillStyle = '#111';
  nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);

  if (!nextPiece) return;
  const m = nextPiece.matrix;
  const offsetX = (4 - m[0].length) / 2;
  const offsetY = (4 - m.length) / 2;
  for (let r = 0; r < m.length; r++) {
    for (let c = 0; c < m[0].length; c++) {
      if (m[r][c] !== 0) {
        drawBlock(nextCtx, c + offsetX, r + offsetY, nextPiece.color, PREVIEW_BLOCK_SIZE);
      }
    }
  }
}

function updateUI() {
  scoreDisplay.textContent = score;
  levelDisplay.textContent = level;
}

function gameLoop(timestamp) {
  if (gameOver) {
    draw();
    return;
  }

  const interval = getDropInterval(level);
  if (timestamp - lastDropTime >= interval) {
    if (!collision(currentPiece.matrix, currentPiece.x, currentPiece.y + 1)) {
      currentPiece.y++;
    } else {
      lockPiece();
    }
    lastDropTime = timestamp;
  }

  draw();
  animationId = requestAnimationFrame(gameLoop);
}

function resetDropTimer() {
  lastDropTime = performance.now();
}

function endGame() {
  gameOver = true;
  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }
  gameOverScore.textContent = `得分: ${score}`;
  gameOverOverlay.classList.remove('hidden');
  draw();
}

function restartGame() {
  gameOver = false;
  gameOverOverlay.classList.add('hidden');
  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }
  score = 0;
  level = 1;
  initBoard();
  nextPiece = createPiece(getRandomPieceType());
  spawnNewPiece();
  updateUI();
  lastDropTime = performance.now();
  animationId = requestAnimationFrame(gameLoop);
}

document.addEventListener('keydown', (e) => {
  if (gameOver) return;
  switch (e.key) {
    case 'ArrowLeft':
      e.preventDefault();
      moveLeft();
      draw();
      break;
    case 'ArrowRight':
      e.preventDefault();
      moveRight();
      draw();
      break;
    case 'ArrowDown':
      e.preventDefault();
      moveDown();
      draw();
      break;
    case 'ArrowUp':
      e.preventDefault();
      rotatePiece();
      draw();
      break;
    case ' ':
      e.preventDefault();
      hardDrop();
      draw();
      break;
  }
});

restartBtn.addEventListener('click', restartGame);
gameOverRestartBtn.addEventListener('click', restartGame);

function startGame() {
  initBoard();
  nextPiece = createPiece(getRandomPieceType());
  spawnNewPiece();
  updateUI();
  lastDropTime = performance.now();
  animationId = requestAnimationFrame(gameLoop);
}

startGame();
