const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreElement = document.getElementById("score");

const WIDTH = 800, HEIGHT = 600, GRID_SIZE = 20;

let snake = [{x: 20, y: 15}];
let direction = {x: 1, y: 0};
let food = {};
let score = 0;
let gameInterval;
let gameRunning = false;
let currentSpeed = 100;
let isPaused = false;

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSound(type) {
    const oscillator = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    oscillator.connect(gain);
    gain.connect(audioCtx.destination);

    switch(type) {
        case "eat":
            oscillator.type = "sine";
            oscillator.frequency.setValueAtTime(1200, audioCtx.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(600, audioCtx.currentTime + 0.25);
            gain.gain.value = 0.35;
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.28);
            break;
        case "gameover":
            oscillator.type = "sawtooth";
            oscillator.frequency.setValueAtTime(300, audioCtx.currentTime);
            gain.gain.value = 0.4;
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.9);
            break;
    }
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.4);
}

let bgMusicInterval;
let isMusicPlaying = false;

function startBackgroundMusic() {
    if (isMusicPlaying) return;
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
        gain.gain.value = 0.12;
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.35);
        note++;
    }, 280);
}

function stopBackgroundMusic() {
    if (bgMusicInterval) clearInterval(bgMusicInterval);
    isMusicPlaying = false;
}

function randomFood() {
    food = { x: Math.floor(Math.random() * (WIDTH/GRID_SIZE)), y: Math.floor(Math.random() * (HEIGHT/GRID_SIZE)) };
}

function draw() {
    ctx.fillStyle = "#000811";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.strokeStyle = "rgba(0, 255, 180, 0.06)";
    for (let x = 0; x < WIDTH; x += GRID_SIZE) {
        ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,HEIGHT); ctx.stroke();
    }
    for (let y = 0; y < HEIGHT; y += GRID_SIZE) {
        ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(WIDTH,y); ctx.stroke();
    }

    snake.forEach((s, i) => {
        ctx.fillStyle = i === 0 ? "#00ffcc" : `rgba(0, 240, 160, ${0.95 - i*0.04})`;
        ctx.fillRect(s.x * GRID_SIZE + 2, s.y * GRID_SIZE + 2, GRID_SIZE - 4, GRID_SIZE - 4);
    });

    // 紅蘋果
    const fx = food.x * GRID_SIZE + GRID_SIZE / 2;
    const fy = food.y * GRID_SIZE + GRID_SIZE / 2;
    ctx.fillStyle = "#e74c3c";
    ctx.beginPath();
    ctx.arc(fx, fy, GRID_SIZE/2 - 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.65)";
    ctx.beginPath();
    ctx.arc(fx - 6, fy - 6, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#2e7d32";
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(fx + 1, fy - GRID_SIZE/2 + 5);
    ctx.quadraticCurveTo(fx + 6, fy - GRID_SIZE/2 - 3, fx + 4, fy - GRID_SIZE/2 - 8);
    ctx.stroke();
    ctx.fillStyle = "#27ae60";
    ctx.beginPath();
    ctx.ellipse(fx + 7, fy - GRID_SIZE/2 + 1, 7, 4, -0.6, 0, Math.PI * 2);
    ctx.fill();
}

function update() {
    if (!gameRunning || isPaused) return;

    let head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };

    if (head.x < 0) head.x = Math.floor(WIDTH/GRID_SIZE)-1;
    if (head.x >= WIDTH/GRID_SIZE) head.x = 0;
    if (head.y < 0) head.y = Math.floor(HEIGHT/GRID_SIZE)-1;
    if (head.y >= HEIGHT/GRID_SIZE) head.y = 0;

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

        if (score % 30 === 0 && currentSpeed > 40) {
            currentSpeed -= 10;
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
    gameRunning = false;
    const name = prompt(`遊戲結束！你的分數是 ${score} 分\n輸入名字上排行榜：`, "玩家") || "勇者";
    let leaderboard = JSON.parse(localStorage.getItem("snakeLeaderboard")) || [];
    leaderboard.push({name, score, date: new Date().toLocaleDateString()});
    leaderboard.sort((a,b)=>b.score-a.score);
    leaderboard = leaderboard.slice(0,10);
    localStorage.setItem("snakeLeaderboard", JSON.stringify(leaderboard));
    setTimeout(showLeaderboard, 300);
}

function startGame() {
    snake = [{x: 20, y: 15}];
    direction = {x: 1, y: 0};
    score = 0;
    currentSpeed = 100;
    scoreElement.textContent = score;
    randomFood();
    gameRunning = true;
    isPaused = false;
    if (gameInterval) clearInterval(gameInterval);
    gameInterval = setInterval(update, currentSpeed);
    draw();
    startBackgroundMusic();
}

function togglePause() {
    if (!gameRunning) return;
    isPaused = !isPaused;
    if (!isPaused) gameInterval = setInterval(update, currentSpeed);
}

function showLeaderboard() {
    let leaderboard = JSON.parse(localStorage.getItem("snakeLeaderboard")) || [];
    let html = "<h2>🏆 排行榜 Top 10</h2><ol>";
    leaderboard.forEach((e,i) => html += `<li>#${i+1} ${e.name} — ${e.score} 分 (${e.date})</li>`);
    html += "</ol><button onclick='this.parentElement.remove();startGame()'>關閉並重新開始</button>";
    const div = document.createElement("div");
    div.style.cssText = "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#112211;padding:25px;border:5px solid #00ffaa;border-radius:15px;color:white;z-index:100;min-width:340px;";
    div.innerHTML = html;
    document.body.appendChild(div);
}

window.changeDirection = function(dx, dy) {
    if (!gameRunning || isPaused) return;
    if (dx === -direction.x && dy === -direction.y) return;
    direction = {x: dx, y: dy};
};

document.addEventListener("keydown", e => {
    if (!gameRunning || isPaused) return;
    switch(e.key) {
        case "ArrowUp": if(direction.y !== 1) direction = {x:0,y:-1}; break;
        case "ArrowDown": if(direction.y !== -1) direction = {x:0,y:1}; break;
        case "ArrowLeft": if(direction.x !== 1) direction = {x:-1,y:0}; break;
        case "ArrowRight": if(direction.x !== -1) direction = {x:1,y:0}; break;
    }
});

startGame();
