
const canvas = document.querySelector("#space-invaders");
const ctx = canvas.getContext("2d");
const playBtn = document.querySelector("#play-btn");
const menu = document.querySelector("#menu");

// images dos jogadores e dos inimigos
const playerImg = new Image();
playerImg.src = "assets/nave.png";
const enemyImg = new Image();
enemyImg.src = "assets/invader2.png";
const baseImg = new Image();
baseImg.src = "assets/base(escudo).png"


const state = {
  running: false,
  lastTime: 0,
  player: { x: (canvas.width / 2) - 25, y: canvas.height - 80, w: 90, h: 70, speed: 450, cooldown: 0, lives: 3 },
  enemyBullets: [],
  bullets: [],
  enemies: (function spawn() { const cols = 8, rows = 3; return Array.from({ length: cols * rows }, (_, i) => ({ x: 40 + (i % cols) * ((canvas.width - 80) / cols), y: 40 + Math.floor(i / cols) * 40, w: 36, h: 28, alive: true })); })(),
  enemyDir: 1, enemySpeed: 30, score: 0, audio: { ctx: null, masterGain: null, bgOscs: [] },
  base: (function spawn() { const cols = 3, rows = 1; return Array.from({ length: cols * rows }, (_, i) => ({ x: 170 + (i % cols) * ((canvas.width - 80) / cols), y: 550 + Math.floor(i / cols) * 40, w: 100, h: 35, alive: true })); })()
};

const keys = {};
document.addEventListener("keydown", e => { keys[e.code] = true; if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) e.preventDefault(); });
document.addEventListener("keyup", e => { keys[e.code] = false; });

// --- Áudio (WebAudio) ---
const ensureAudio = () => {
  if (state.audio.ctx) return;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;
  const a = new AudioCtx();
  state.audio.ctx = a;
  state.audio.masterGain = a.createGain();
  state.audio.masterGain.gain.value = 0.9; // volume geral (ajusta se quiser)
  state.audio.masterGain.connect(a.destination);
};


// Função para tocar um tom com frequência, duração e tipo especificados
const playTone = (freq, duration = 0.08, type = "square", vol = 0.12) => {
  const a = state.audio.ctx;
  if (!a) return;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.value = vol;
  o.connect(g); g.connect(state.audio.masterGain);
  o.start();
  g.gain.setValueAtTime(vol, a.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + duration);
  o.stop(a.currentTime + duration + 0.02);
};

// --- Ações do jogo ---
const tiro = () => {
  const p = state.player;
  if (p.cooldown > 0) return;
  p.cooldown = 0.18;
  state.bullets.push({ x: p.x + p.w / 2 - 2, y: p.y - 6, w: 4, h: 8, dy: -420 });
  playTone(1000, 0.06, "square", 0.08);
};


// Função recursiva para processar colisões entre balas e inimigos
function processBullets(bullets, enemies, idx = 0) {
  if (idx >= bullets.length) return;
  const b = bullets[idx];
  processEnemies(b, enemies, 0);
  processBullets(bullets, enemies, idx + 1);
}

function processEnemies(bullet, enemies, idx) {
  if (idx >= enemies.length) return;
  const e = enemies[idx];
  if (e.alive &&
    bullet.x < e.x + e.w && bullet.x + bullet.w > e.x &&
    bullet.y < e.y + e.h && bullet.y + bullet.h > e.y) {
    e.alive = false;
    bullet.y = -9999; // marca pra remoção
    state.score += 10;
    playTone(220 + Math.random() * 200, 0.12, "sawtooth", 0.06);
    return; // Para após a primeira colisão
  }
  processEnemies(bullet, enemies, idx + 1);
}

// Função para processar colisão entre balas e a base
function processBulletBase(bullet, base, idx) {
  if (idx >= base.length) return;
  const e = base[idx];
  if (e.alive &&
    bullet.x < e.x + e.w && bullet.x + bullet.w > e.x &&
    bullet.y < e.y + e.h && bullet.y + bullet.h > e.y) {
    e.alive = false;
    bullet.y = -9999; // marca pra remoção // Para após a primeira colisão
  }
  processBulletBase(bullet, base, idx + 1);

}


// Função recursiva para verificar se algum inimigo chegou na base
function checkEnemyBase(enemies, idx = 0) {
  if (idx >= enemies.length) return;
  const e = enemies[idx];
  if (e.alive && e.y + e.h >= state.player.y) {
    state.running = false;
    playTone(60, 0.6, "sine", 0.12);
    return;
  }
  checkEnemyBase(enemies, idx + 1);
}


//verefica se esta respeitando os paradigmas funcinal
function enemyShoot() {
  // Escolhe inimigos vivos aleatoriamente para atirar
  state.enemies.forEach(e => {
    if (e.alive && Math.random() < 0.002) { // ajuste a chance como quiser
      state.enemyBullets.push({
        x: e.x + e.w / 2 - 2,
        y: e.y + e.h,
        w: 4,
        h: 10,
        dy: 220
      });
      playTone(320, 0.07, "triangle", 0.08);
    }
  });
}




const update = (dt) => {
  //verefica se esta respeitando os paradigmas funcinal

  // movimento e tiro dos inimigos

  enemyShoot();
  state.enemyBullets = state.enemyBullets.map(b => ({ ...b, y: b.y + b.dy * dt })).filter(b => b.y < canvas.height + 20);

  state.enemyBullets.forEach(b => {
    const p = state.player;
    if (
      b.x < p.x + p.w &&
      b.x + b.w > p.x &&
      b.y < p.y + p.h &&
      b.y + b.h > p.y
    ) {
      b.y = canvas.height + 100; // remove o tiro
      state.player.lives -= 1;
      playTone(80, 0.2, "sawtooth", 0.15);
      if (state.player.lives <= 0) {
        state.running = false;
      }
    }
  });

  // movimento do jogador
  const dir = (keys["ArrowLeft"] || keys["KeyA"] ? -0.5 : 0) + (keys["ArrowRight"] || keys["KeyD"] ? 0.5 : 0);
  state.player.x += dir * state.player.speed * dt;
  if (state.player.x < 2) state.player.x = 2;
  if (state.player.x + state.player.w > canvas.width - 2) state.player.x = canvas.width - 2 - state.player.w;

  if (state.player.cooldown > 0) state.player.cooldown -= dt;
  if (keys["Space"] || keys["KeyW"] || keys["ArrowUp"]) tiro();

  // atualizar balas
  state.bullets = state.bullets.map(b => ({ ...b, y: b.y + b.dy * dt })).filter(b => b.y > -20);

  // mover inimigos e tratar troca de direção / queda
  const alive = state.enemies.filter(e => e.alive);
  if (alive.length === 0) {
    // respawn e aumenta velocidade
    state.enemies = (function spawn() { const cols = 8, rows = 4; return Array.from({ length: cols * rows }, (_, i) => ({ x: 40 + (i % cols) * ((canvas.width - 80) / cols), y: 40 + Math.floor(i / cols) * 40, w: 36, h: 18, alive: true })); })();
    state.enemySpeed += 8;
    state.enemies = (function spawn() { const cols = 9, rows = 4; return Array.from({ length: cols * rows }, (_, i) => ({ x: 40 + (i % cols) * ((canvas.width - 80) / cols), y: 40 + Math.floor(i / cols) * 40, w: 36, h: 18, alive: true })); })();
    state.enemySpeed += 9;
    state.enemies = (function spawn() { const cols = 8, rows = 5; return Array.from({ length: cols * rows }, (_, i) => ({ x: 40 + (i % cols) * ((canvas.width - 80) / cols), y: 40 + Math.floor(i / cols) * 40, w: 36, h: 18, alive: true })); })();
    state.enemySpeed += 9.5;
    state.enemies = (function spawn() { const cols = 9, rows = 6; return Array.from({ length: cols * rows }, (_, i) => ({ x: 40 + (i % cols) * ((canvas.width - 80) / cols), y: 40 + Math.floor(i / cols) * 40, w: 36, h: 18, alive: true })); })();
    state.enemySpeed += 9.5;

  } else {
    const minX = Math.min(...alive.map(e => e.x));
    const maxX = Math.max(...alive.map(e => e.x + e.w));
    const willHit = (state.enemyDir > 0 && maxX + state.enemyDir * state.enemySpeed * dt > canvas.width - 10) ||
      (state.enemyDir < 0 && minX + state.enemyDir * state.enemySpeed * dt < 10);
    if (willHit) {
      state.enemyDir *= -1;
      state.enemies = state.enemies.map(e => ({ ...e, y: e.y + 12 }));
    } else {
      state.enemies = state.enemies.map(e => ({ ...e, x: e.x + state.enemyDir * state.enemySpeed * dt }));
    }
  }
  //Definir base (escudo)
 







  // colisões balas x inimigos
  processBullets(state.bullets, state.enemies);
  state.bullets = state.bullets.filter(b => b.y > -50);


  // inimigo chega na base -> game over
  checkEnemyBase(state.enemies);
};
//oi
// --- Render ---
const drawRect = (x, y, w, h, color) => { ctx.fillStyle = color; ctx.fillRect(x, y, w, h); };

const render = () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Player
  ctx.drawImage(playerImg, state.player.x, state.player.y, state.player.w, state.player.h);

  //verefica se esta respeitando os paradigmas funcinal
  // Player lives
  ctx.fillStyle = "#fff";
  ctx.font = "16px monospace";
  ctx.fillText("Vidas: " + state.player.lives, canvas.width - 100, 20);

  // Bullets
  state.bullets.forEach(b => drawRect(b.x, b.y, b.w, b.h, "#58a6ff"));

  // Escudo(base) 

  // state.base.forEach(b => drawRect(b.x, b.y, b.w, b.h, "#721e04ff"));

  // Enemy bullets
  state.enemyBullets.forEach(b => drawRect(b.x, b.y, b.w, b.h, "#ff5470"));

  // Enemies
  state.enemies.forEach(e => {
    if (e.alive) ctx.drawImage(enemyImg, e.x, e.y, e.w, e.h);
  });

  ctx.fillStyle = "#fff"; ctx.font = "16px monospace"; ctx.fillText("Score: " + state.score, 10, 20);


  //verefica se esta respeitando os paradigmas funcinal
  if (!state.running) {
    ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ff5470"; ctx.font = "34px monospace"; ctx.textAlign = "center";
    ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2 - 10);
    ctx.font = "16px monospace"; ctx.fillStyle = "#fff";
    ctx.fillText("Clique em Play para reiniciar", canvas.width / 2, canvas.height / 2 + 20);

    // Desenha botão de reiniciar
    const btnWidth = 180, btnHeight = 44;
    const btnX = canvas.width / 2 - btnWidth / 2;
    const btnY = canvas.height / 2 + 40;
    ctx.fillStyle = "#232946";
    ctx.strokeStyle = "#ff5470";
    ctx.lineWidth = 3;
    ctx.fillRect(btnX, btnY, btnWidth, btnHeight);
    ctx.strokeRect(btnX, btnY, btnWidth, btnHeight);
    ctx.font = "20px monospace";
    ctx.fillStyle = "#ff5470";
    ctx.fillText("Reiniciar", canvas.width / 2, btnY + 29);
    ctx.textAlign = "start";
  }
};
//verefica se esta respeitando os paradigmas funcinal
// --- Detecta clique no botão de reiniciar ---
canvas.addEventListener("click", function (e) {
  if (state.running) return;
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;
  const btnWidth = 180, btnHeight = 44;
  const btnX = canvas.width / 2 - btnWidth / 2;
  const btnY = canvas.height / 2 + 40;
  if (
    mouseX >= btnX && mouseX <= btnX + btnWidth &&
    mouseY >= btnY && mouseY <= btnY + btnHeight
  ) {
    // Reinicia o jogo
    ensureAudio();
    if (state.audio.ctx && state.audio.ctx.state === "suspended") state.audio.ctx.resume();
    menu.style.display = "none";
    canvas.style.display = "block";
    state.running = true;
    state.lastTime = 0;
    state.score = 0;
    state.player.lives = 3;
    state.enemyBullets = [];
    state.bullets = [];
    state.enemies = (function spawn() { const cols = 8, rows = 3; return Array.from({ length: cols * rows }, (_, i) => ({ x: 40 + (i % cols) * ((canvas.width - 80) / cols), y: 40 + Math.floor(i / cols) * 40, w: 36, h: 18, alive: true })); })();
    requestAnimationFrame(loop);
  }
});

// --- Loop principal ---
const loop = (ts) => {
  if (!state.running) return;
  const dt = Math.min(0.05, (ts - (state.lastTime || ts)) / 1000);
  state.lastTime = ts;
  update(dt);
  render();
  requestAnimationFrame(loop);
};

// --- Play button ---
playBtn.addEventListener("click", () => {
  ensureAudio();
  if (state.audio.ctx && state.audio.ctx.state === "suspended") state.audio.ctx.resume();
  menu.style.display = "none";
  canvas.style.display = "block";
  state.running = true;
  state.lastTime = 0;
  state.score = 0;
  state.player.lives = 3;
  state.enemyBullets = [];
  state.bullets = [];
  state.enemies = (function spawn() { const cols = 8, rows = 3; return Array.from({ length: cols * rows }, (_, i) => ({ x: 40 + (i % cols) * ((canvas.width - 80) / cols), y: 40 + Math.floor(i / cols) * 40, w: 36, h: 18, alive: true })); })();
  requestAnimationFrame(loop);
});