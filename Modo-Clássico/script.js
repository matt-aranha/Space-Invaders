//inports brabos
const canvas = document.querySelector("#space-invaders");
const ctx = canvas.getContext("2d");
const playBtn = document.querySelector("#play-btn");
const menu = document.querySelector("#menu");

// images dos jogadores e dos inimigos, suas respectivas bases, cenário...
const playerImg = new Image();
playerImg.src = "assets/nave.png";
const enemyImg1 = new Image();
enemyImg1.src = "assets/Alien1(192x192).png";
const enemyImg2 = new Image();
enemyImg2.src = "assets/Alien2(192x192)_0001.png";
const enemyImg3 = new Image();
enemyImg3.src = "assets/Alien3(192x192)_0001.png";
const baseImg = new Image();
baseImg.src = "assets/escudo(192x192).png"
const vidaImg = new Image();
vidaImg.src = "assets/vida(192x192).png"
const semvidaImg = new Image();
semvidaImg.src = "assets/sem-vida(192x192).png"

// Função que carrega as informações de cada entidade do game (atributos e mecânicas)
const state = {
  running: false,
  lastTime: 0,
  player: { x: (canvas.width / 2) - 25, y: canvas.height - 80, w: 90, h: 70, speed: 450, cooldown: 0, lives: 3, invincible: 0 },
  enemyBullets: [],
  bullets: [],
  wave: 1,
  enemyFireRate: 0.002,
  enemies: (function spawn() { const cols = 9, rows = 4;
     return Array.from({ length: cols * rows },
     (_, i) => ({ x: 300 + (i % cols) * 60,
     y: 40 + Math.floor(i / cols) * 40, w: 64, h: 64, alive: true, type: 1 })); })(),
  enemyDir: 1, 
  enemySpeed: 40, 
  score: 0, 
  audio: { ctx: null, masterGain: null, bgOscs: [],
  tones: [65, 60, 55, 50], // notas do tema original
  index: 0, lastTime: 0 },
  base: (function spawn() { const cols = 3, rows = 1;
     return Array.from({ length: cols * rows },
     (_, i) => ({ x: 170 + (i % cols) * ((canvas.width - 80) / cols),
     y: 550 + Math.floor(i / cols) * 40, w: 80, h: 64, hp: 30, hpMax: 30, hit: 0, alive: true })); })()
};

// -----VIDA------
// Função que recebe o número de vidas e devolve as imagens corretas
const renderLives = (lives, maxLives = 3) => 
  Array.from({ length: maxLives }, (_, i) =>
    i < lives ? "assets/vida(192x192).png" : "assets/sem-vida(192x192).png"
  );

// Função que transforma a lista de imagens em DOM (strings) HTML
const livesToHTML = (lives) =>
  renderLives(lives)
    .map(src => `<img src="${src}" width="30" height="30" />`)
    .join("");

// Função que atualiza o DOM
const updateLivesUI = (state) => {
  const container = document.getElementById("lives-container");
  container.innerHTML = livesToHTML(state.player.lives);
};

// ------ KEYS -----
// Função que recebe os input da interação teclado do usuário e game
const keys = {};
document.addEventListener("keydown", e => { keys[e.code] = true;
  if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) e.preventDefault(); });
document.addEventListener("keyup", e => { keys[e.code] = false; });

// --- Áudio (WebAudio), mecanica de audio exportada ---
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

// Função para fazer tocar um tom com frequência, duração e tipo especificados
const playTone = (freq, duration = 0.08, type = "square", vol = 0.12, endFreq = null) => {
  const a = state.audio.ctx;
  if (!a) return;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.value = vol;
  o.connect(g); g.connect(state.audio.masterGain);
  o.start();
  g.gain.setValueAtTime(vol, a.currentTime);
  if (endFreq !== null) {
    o.frequency.exponentialRampToValueAtTime(endFreq, a.currentTime + duration);
  }
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + duration);
  o.stop(a.currentTime + duration + 0.02);
};
const playInvaderTone = () => {
  const a = state.audio;
  if (!a.ctx) return;

  const now = performance.now();
  // Calcula o tempo entre as batidas. Fica mais rápido com menos inimigos vivos.
  const timeBetweenBeats = Math.max(100, 550 - (state.enemies.filter(e => e.alive).length * 5));

  if (now - a.lastTime < timeBetweenBeats) {
    return; // Ainda não é hora de tocar
  }

  // Pega a próxima nota da sequência
  const noteToPlay = a.tones[a.index];
  
  // Usa a funç. 'playTone' já existente para tocar a nota
  playTone(noteToPlay, 0.1, "square", 0.1);

  // Avança para a próxima nota da sequência
  a.index = (a.index + 1) % a.tones.length;
  a.lastTime = now;
};

// --- Ações do jogo ---
const tiro = () => {
  const p = state.player;
  if (p.cooldown > 0) return;
  p.cooldown = 0.420;
  state.bullets.push({ x: p.x + p.w / 2 - 2, y: p.y - 6, w: 4, h: 8, dy: -420 });
  playTone(1000, 0.06, "square", 0.08);
};

// Função para processar colisões entre balas e inimigos
function processBullets(bullets, enemies, idx = 0) {
  if (idx >= bullets.length) return;
  const b = bullets[idx];
  processEnemies(b, enemies, 0);
  processBullets(bullets, enemies, idx + 1);
}
// Função que relaciona os inimigos com os tiros que produzem assim também como se posicionam no canva
const enemyPoints = {
  1: 10,   // inimigo de baixo
  2: 20,   // inimigo do meio
  3: 30    // inimigo de cima
};
function processEnemies(bullet, enemies, idx) {
  if (idx >= enemies.length) return;
  const e = enemies[idx];
  if (e.alive &&
    bullet.x < e.x + e.w && bullet.x + bullet.w > e.x &&
    bullet.y < e.y + e.h && bullet.y + bullet.h > e.y) {
    e.alive = false;
    bullet.y = -9999; // marca pra remoção, saem do plano
    state.score += enemyPoints[e.type];
    playTone(600, 0.15, "sawtooth", 0.08, 50);;
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
    e.hp -= 1;             // perde vida
    e.hit = 0.12;          // flash rápido ao ser atingida
    bullet.y = canvas.height + 100; // remove o tiro (filtro pega)
    if (e.hp <= 0) {
      e.alive = false;
    }
    return; // evita múltiplos acertos no mesmo frame
  }
  processBulletBase(bullet, base, idx + 1);
}

// Função para verificar se algum inimigo chegou na base
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

// Função tiro dos inimigos, chablau
function enemyShoot() {
  // Escolhe inimigos vivos aleatoriamente para atirar
  state.enemies.forEach(e => {
    if (e.alive && Math.random() < state.enemyFireRate) {
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

//função que retorna as modificações do state inicial
const update = (dt) => {
  if (state.player.invincible > 0) {
  state.player.invincible -= dt;
}
  // movimento e tiro dos inimigos
  enemyShoot();
  state.enemyBullets = state.enemyBullets.map(b => ({ ...b, y: b.y + b.dy * dt })).filter(b => b.y < canvas.height + 20);
  //colisões dos tiros inimigos com player e com a base
  state.enemyBullets.forEach(b => {
    const p = state.player;
    //player
    if (
      b.x < p.x + p.w &&
      b.x + b.w > p.x &&
      b.y < p.y + p.h &&
      b.y + b.h > p.y
    ) {
      if (p.invincible <= 0) { // só leva dano se não estiver invencível
        p.lives -= 1;
        p.invincible = 1.5; // 1.5 segundos de invencibilidade
        playTone(80, 0.2, "sawtooth", 0.15);
        if (p.lives <= 0) {
          state.running = false;
    }
  }
    b.y = canvas.height + 100; // remove o tiro
    return;   //já bateu no player, cabou-se
  };

  // contra a base (escudo)
  processBulletBase(b, state.base, 0);
});
// atualiza timer de flash da base
  state.base = state.base.map(br => br.alive ? { ...br, hit: Math.max(0, (br.hit || 0) - dt) } : br);

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
  state.wave += 1;
  state.enemySpeed += 10;
  state.enemyFireRate *= 1,12; // sobe a dificuldade
  state.enemies = (function spawn() { 
    const cols = 9, rows = 4; 
    return Array.from({ length: cols * rows }, (_, i) => ({ 
      x: 300 + (i % cols) * 60, 
      y: 40 + Math.floor(i / cols) * 40, 
      w: 64, h: 64, 
      alive: true, 
      type: Math.floor(Math.random() * 3) + 1 
    })); 
  })();
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
  // colisões balas x inimigos
  processBullets(state.bullets, state.enemies);
  state.bullets = state.bullets.filter(b => b.y > -50);

  // inimigo chega na base -> game over
  checkEnemyBase(state.enemies);

  //manter música tocando
  playInvaderTone();
};

// --- Render --- (mostrar,criar e desenhar na tela)
const drawRect = (x, y, w, h, color) => { ctx.fillStyle = color; ctx.fillRect(x, y, w, h); };
const render = () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  updateLivesUI(state);

  // Player
  if (state.player.invincible > 0) {
  if (Math.floor(Date.now() / 100) % 2 === 0) {
    ctx.drawImage(playerImg, state.player.x, state.player.y, state.player.w, state.player.h);
  }
} else {
  ctx.drawImage(playerImg, state.player.x, state.player.y, state.player.w, state.player.h);
}

  // Player lives
  ctx.fillStyle = "#fff";
  ctx.font = "16px monospace";
  ctx.fillText("Vidas: " + state.player.lives, canvas.width - 100, 20);


  // Bullets
  state.bullets.forEach(b => drawRect(b.x, b.y, b.w, b.h, "#58a6ff"));

  // Escudos (base)
state.base.forEach(b => {
  if (!b.alive) return;

  // flash quando hit > 0
  if (b.hit > 0) ctx.globalAlpha = 0.6;
  ctx.drawImage(baseImg, b.x, b.y, b.w, b.h);
  ctx.globalAlpha = 1;

  // barra de vida (fundo + frente)
  const barY = b.y - 10;
  ctx.fillStyle = "red";
  ctx.fillRect(b.x, barY, b.w, 5); // fundo
  ctx.fillStyle = "lime";
  ctx.fillRect(b.x, barY, (b.hp / b.hpMax) * b.w, 5); // vida proporcional
});

  // Enemy bullets
  state.enemyBullets.forEach(b => drawRect(b.x, b.y, b.w, b.h, "#ff5470"));

  // Enemies
  state.enemies.forEach(e => {
   if (!e.alive) return;
   if (e.type === 1) ctx.drawImage(enemyImg1, e.x, e.y, e.w, e.h);
   if (e.type === 2) ctx.drawImage(enemyImg2, e.x, e.y, e.w, e.h);
   if (e.type === 3) ctx.drawImage(enemyImg3, e.x, e.y, e.w, e.h);
  });
  
  ctx.fillStyle = "#fff"; ctx.font = "16px monospace"; ctx.fillText("Score: " + state.score, 10, 20);

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

// --- Detecta clique no botão de reiniciar, como um evento de retorno ---
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
    state.enemies = (function spawn() { const cols = 8, rows = 3; return Array.from({ length: cols * rows }, (_, i) => ({ x: 300 + (i % cols) *60, 
      y: 40 + Math.floor(i / cols) * 40, w: 64, h: 64, alive: true, type: Math.floor(Math.random() * 3) + 1 })); })();
    requestAnimationFrame(loop);
  }
    state.base = (function spawn() { const cols = 3, rows = 1; return Array.from({ length: cols * rows }, (_, i) => ({ x: 170 + (i % cols) * ((canvas.width - 80) / cols),
    y: 550 + Math.floor(i / cols) * 40, 
    w: 80, h: 64, hp: 30, hpMax: 30, hit: 0,alive: true 
  })); 
})();
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
  state.enemies = (function spawn() { const cols = 8, rows = 3; return Array.from({ length: cols * rows }, (_, i) => ({ x: 300 + (i % cols) * 60,
     y: 40 + Math.floor(i / cols) * 40, w: 64, h: 64, alive: true, type: Math.floor(Math.random() * 3) + 1 })); })();
  requestAnimationFrame(loop);
  state.base = (function spawn() { const cols = 3, rows = 1; return Array.from({ length: cols * rows }, (_, i) => ({ x: 170 + (i % cols) * ((canvas.width - 80) / cols),
    y: 550 + Math.floor(i / cols) * 40, w: 80, h: 64, hp: 30, hpMax: 30, hit: 0,alive: true 
  })); 
})();
});