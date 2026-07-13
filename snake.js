// ==================== 遊戲核心 ====================
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreElement = document.getElementById("score");
const statusDot = document.getElementById("statusDot");
const statusText = document.getElementById("statusText");

const WIDTH = 640;
const HEIGHT = 480;
const GRID_SIZE = 20;

let snake = [{ x: 16, y: 12 }];
let direction = { x: 1, y: 0 };
let food = {};
let score = 0;
let gameInterval = null;
let gameRunning = false;
let currentSpeed = 140;
let isPaused = false;

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

// ========== 狀態指示器 ==========
function updateStatus() {
    statusDot.className = "status-dot";
    if (!gameRunning) {
        statusText.textContent = "尚未開始";
    } else if (isPaused) {
        statusDot.classList.add("paused");
        statusText.textContent = "⏸️ 已暫停";
    } else {
        statusDot.classList.add("running");
        statusText.textContent = "▶️ 遊戲中";
    }
}

// ========== 音效 ==========
function playSound(type) {
    if (audioCtx.state === "suspended") audioCtx.resume();
    const oscillator = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    oscillator.connect(gain);
    gain.connect(audioCtx.destination);

    if (type === "eat") {
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(1200, audioCtx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(600, audioCtx.currentTime + 0.25);
        gain.gain.value = 0.35;
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.28);
    } else if (type === "gameover") {
        oscillator.type = "sawtooth";
        oscillator.frequency.setValueAtTime(300, audioCtx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(80, audioCtx.currentTime + 0.8);
        gain.gain.value = 0.4;
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.9);
    }
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.4);
}

// ========== 背景音樂 ==========
let bgMusicInterval = null;
let isMusicPlaying = false;

function startBackgroundMusic() {
    if (isMusicPlaying) return;
    if (audioCtx.state === "suspended") audioCtx.resume();
    isMusicPlaying = true;
    let note = 0;
    const melody = [262, 294, 330, 349, 392, 440, 494, 523];
    bgMusicInterval = setInterval(() => {
        if (!gameRunning || isPaused) return;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.type = "triangle";
        osc.frequency.value = melody[note % melody.length];
        gain.gain.value = 0.09;
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.35);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
        note++;
    }, 280);
}

function stopBackgroundMusic() {
    if (bgMusicInterval) {
        clearInterval(bgMusicInterval);
        bgMusicInterval = null;
    }
    isMusicPlaying = false;
}

// ========== 食物 ==========
function randomFood() {
    let newFood;
    do {
        newFood = {
            x: Math.floor(Math.random() * (WIDTH / GRID_SIZE)),
            y: Math.floor(Math.random() * (HEIGHT / GRID_SIZE))
        };
    } while (snake.some(s => s.x === newFood.x && s.y === newFood.y));
    food = newFood;
}

// ========== 繪圖 ==========
function draw() {
    ctx.fillStyle = "#000811";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.strokeStyle = "rgba(0, 255, 180, 0.06)";
    ctx.lineWidth = 0.5;
    for (let x = 0; x < WIDTH; x += GRID_SIZE) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, HEIGHT);
        ctx.stroke();
    }
    for (let y = 0; y < HEIGHT; y += GRID_SIZE) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(WIDTH, y);
        ctx.stroke();
    }
    ctx.lineWidth = 1;

    snake.forEach((s, i) => {
        const alpha = Math.max(0.3, 0.95 - i * 0.03);
        if (i === 0) {
            ctx.fillStyle = "#00ffcc";
            ctx.shadowColor = "#00ffcc";
            ctx.shadowBlur = 15;
            ctx.fillRect(s.x * GRID_SIZE + 2, s.y * GRID_SIZE + 2, GRID_SIZE - 4, GRID_SIZE - 4);
            ctx.shadowBlur = 0;

            const cx = s.x * GRID_SIZE + GRID_SIZE / 2;
            const cy = s.y * GRID_SIZE + GRID_SIZE / 2;
            ctx.fillStyle = "#000";
            const eyeOffsetX = direction.x * 4;
            const eyeOffsetY = direction.y * 4;
            ctx.beginPath();
            ctx.arc(cx + eyeOffsetX - 3, cy + eyeOffsetY - 3, 3, 0, Math.PI * 2);
            ctx.arc(cx + eyeOffsetX + 3, cy + eyeOffsetY + 3, 3, 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.fillStyle = `rgba(0, 240, 160, ${alpha})`;
            ctx.fillRect(s.x * GRID_SIZE + 2, s.y * GRID_SIZE + 2, GRID_SIZE - 4, GRID_SIZE - 4);
        }
    });

    const fx = food.x * GRID_SIZE + GRID_SIZE / 2;
    const fy = food.y * GRID_SIZE + GRID_SIZE / 2;

    ctx.shadowColor = "#ff3333";
    ctx.shadowBlur = 15;
    ctx.fillStyle = "#e74c3c";
    ctx.beginPath();
    ctx.arc(fx, fy, GRID_SIZE / 2 - 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
    ctx.beginPath();
    ctx.arc(fx - 5, fy - 5, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#2ecc71";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(fx, fy - GRID_SIZE / 2 + 6);
    ctx.quadraticCurveTo(fx + 6, fy - GRID_SIZE / 2 - 4, fx + 4, fy - GRID_SIZE / 2 - 9);
    ctx.stroke();
    ctx.lineWidth = 1;
}

// ========== 遊戲邏輯 ==========
function update() {
    if (!gameRunning || isPaused) return;

    let head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };

    if (head.x < 0 || head.x >= WIDTH / GRID_SIZE || head.y < 0 || head.y >= HEIGHT / GRID_SIZE) {
        gameOver();
        return;
    }

    if (snake.some(s => s.x === head.x && s.y === head.y)) {
        gameOver();
        return;
    }

    snake.unshift(head);

    if (head.x === food.x && head.y === food.y) {
        score += 10;
        scoreElement.textContent = score;
        randomFood();
        playSound("eat");

        const targetSpeed = 140 - Math.floor(score / 50) * 8;
        if (targetSpeed !== currentSpeed && targetSpeed >= 60) {
            currentSpeed = targetSpeed;
            clearInterval(gameInterval);
            gameInterval = setInterval(update, currentSpeed);
        }
    } else {
        snake.pop();
    }
    draw();
}

function gameOver() {
    playSound("gameover");
    stopBackgroundMusic();
    clearInterval(gameInterval);
    gameInterval = null;
    gameRunning = false;
    updateStatus();

    const name = prompt(`遊戲結束！你的分數是 ${score} 分\n輸入名字上排行榜：`, "玩家") || "勇者";
    let leaderboard = JSON.parse(localStorage.getItem("snakeLeaderboard")) || [];
    leaderboard.push({ name, score, date: new Date().toLocaleDateString() });
    leaderboard.sort((a, b) => b.score - a.score);
    leaderboard = leaderboard.slice(0, 10);
    localStorage.setItem("snakeLeaderboard", JSON.stringify(leaderboard));
    setTimeout(showLeaderboard, 300);
}

function startGame() {
    stopBackgroundMusic();
    if (gameInterval) clearInterval(gameInterval);

    snake = [{ x: 16, y: 12 }];
    direction = { x: 1, y: 0 };
    score = 0;
    currentSpeed = 140;
    scoreElement.textContent = score;
    randomFood();
    gameRunning = true;
    isPaused = false;
    gameInterval = setInterval(update, currentSpeed);
    draw();
    startBackgroundMusic();
    updateStatus();
}

function togglePause() {
    if (!gameRunning) return;
    isPaused = !isPaused;
    if (isPaused) {
        clearInterval(gameInterval);
        gameInterval = null;
    } else {
        if (gameInterval) clearInterval(gameInterval);
        gameInterval = setInterval(update, currentSpeed);
    }
    updateStatus();
}

function showLeaderboard() {
    let leaderboard = JSON.parse(localStorage.getItem("snakeLeaderboard")) || [];
    let html = `
        <h2 style="color:#ffd700;text-shadow:0 0 20px #ffd700;margin-bottom:15px;">🏆 排行榜 Top 10</h2>
        <div style="max-height:350px;overflow-y:auto;">
    `;

    if (leaderboard.length === 0) {
        html += '<p style="color:#aaa;">尚無紀錄，快來挑戰！</p>';
    } else {
        html += '<ol style="text-align:left;padding-left:25px;">';
        leaderboard.forEach((e, i) => {
            const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '';
            html += `
                <li style="margin:8px 0;color:#00ffcc;font-size:16px;">
                    ${medal} <strong>${e.name}</strong> — ${e.score} 分
                    <span style="color:#888;font-size:12px;">(${e.date})</span>
                </li>`;
        });
        html += '</ol>';
    }

    html += `
        </div>
        <button onclick="this.parentElement.remove();startGame()"
            style="margin-top:15px;padding:12px 28px;font-size:16px;font-weight:bold;
            background:linear-gradient(135deg,#00cc88,#008855);color:white;
            border:2px solid rgba(0,255,170,0.5);border-radius:50px;cursor:pointer;">
            🎮 關閉並開始新遊戲
        </button>
    `;

    const div = document.createElement("div");
    div.style.cssText = `
        position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);
        background:rgba(0,20,20,0.95);padding:25px;
        border:3px solid #00ffaa;border-radius:20px;
        color:white;z-index:999;min-width:340px;max-width:90vw;
        text-align:center;
        box-shadow:0 0 60px rgba(0,255,170,0.5);
        backdrop-filter:blur(15px);
    `;
    div.innerHTML = html;
    document.body.appendChild(div);
}

// ========== 方向控制 ==========
window.changeDirection = function(dx, dy) {
    if (!gameRunning || isPaused) return;
    if (dx === -direction.x && dy === -direction.y) return;
    direction = { x: dx, y: dy };
};

document.addEventListener("keydown", e => {
    if (!gameRunning || isPaused) return;
    switch (e.key) {
        case "ArrowUp": case "w": case "W":
            if (direction.y !== 1) direction = { x: 0, y: -1 };
            e.preventDefault();
            break;
        case "ArrowDown": case "s": case "S":
            if (direction.y !== -1) direction = { x: 0, y: 1 };
            e.preventDefault();
            break;
        case "ArrowLeft": case "a": case "A":
            if (direction.x !== 1) direction = { x: -1, y: 0 };
            e.preventDefault();
            break;
        case "ArrowRight": case "d": case "D":
            if (direction.x !== -1) direction = { x: 1, y: 0 };
            e.preventDefault();
            break;
        case " ":
            togglePause();
            e.preventDefault();
            break;
    }
});

// 手機滑動控制
let touchStartX = 0, touchStartY = 0;
canvas.addEventListener("touchstart", e => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
});
canvas.addEventListener("touchend", e => {
    if (!gameRunning || isPaused) return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;
    if (Math.abs(dx) < 20 && Math.abs(dy) < 20) return;
    if (Math.abs(dx) > Math.abs(dy)) {
        changeDirection(dx > 0 ? 1 : -1, 0);
    } else {
        changeDirection(0, dy > 0 ? 1 : -1);
    }
});

// ========== 初始化 ==========
randomFood();
draw();
updateStatus();
