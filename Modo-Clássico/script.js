//SCRIPT DO MODO CLÁSSICO DO JOGO SPACE INVADERS, vulgo THE BEST GAME ;)
//inports brabos ;)
const canvas = document.querySelector("#space-invaders");
const ctx = canvas.getContext("2d");
const playBtn = document.querySelector("#play-btn");
const menu = document.querySelector("#menu");
const muteBtn = document.querySelector("#mute-btn")

// arquivos dos jogadores e dos inimigos, suas respectivas bases, cenário... :D
const playerImg = new Image();
playerImg.src = "assets/SpaceShip(192x192)_0001.png";
const playerImg_frame2 = new Image();
playerImg_frame2.src = "assets/SpaceShip(192x192)_0002.png"
const playerImg_frame3 = new Image();
playerImg_frame3.src = "assets/SpaceShip(192x192)_0003.png"
const playerFrames = [playerImg, playerImg_frame2, playerImg_frame3]  // array para facilitar a chamada dos frames na nave pew pew. Ed: ÉH
const enemyImg1 = new Image();
enemyImg1.src = "assets/Alien1(192x192).png";
const enemyImg1_frame2 = new Image();
enemyImg1_frame2.src = "assets/Alien1-Quadro2(192x192).png";
const enemyImg2 = new Image();
enemyImg2.src = "assets/Alien2(192x192)_0001.png";
const enemyImg2_frame2 = new Image();
enemyImg2_frame2.src = "assets/Alien2(192x192)_0002.png";
const enemyImg3 = new Image();
enemyImg3.src = "assets/Alien3(192x192)_0001.png";
const enemyImg3_frame2 = new Image();
enemyImg3_frame2.src = "assets/Alien3(192x192)_0002.png";
const baseImg = new Image();
baseImg.src = "assets/escudo(192x192).png";
const vidaImg = new Image();
vidaImg.src = "assets/vida(192x192).png";
const semvidaImg = new Image();
semvidaImg.src = "assets/sem-vida(192x192).png";
const playerShotSound = new Audio();
playerShotSound.src = "assets/tiro-nave.mp3";
playerShotSound.volume = 0.40    //ajustar se precisar
const baseDestroyedSound = new Audio();
baseDestroyedSound.src = "assets/explosao.mp3"
baseDestroyedSound.volume = 0.6 // ajustar se precisar

// Função que carrega as informações de cada entidade do game (atributos e mecânicas)
const initialState = (canvas) => Object.freeze({
  running: false,
  lastTime: 0,
  isMuted: false,
  player: Object.freeze({
    x: (canvas.width / 2) - 40,
    y: canvas.height - 80,
    w: 90, h: 70,
    speed: 450,
    cooldown: 0,
    lives: 3,
    invincible: 0,
    animationFrame: 0,
    lastAnimationFrameTime: 0
  }),
  enemyBullets: Object.freeze([]),
  bullets: Object.freeze([]),
  wave: 1,
  enemyFireRate: 0.0005,
  enemies: Object.freeze((() => {
    const cols = 12, rows = 4;
    const typeMapping = [3, 2, 2, 1];
    return Array.from({ length: cols * rows }, (_, i) => {
      const row = Math.floor(i / cols);
      const enemyType = typeMapping[row];
      return Object.freeze({
        x: 300 + (i % cols) * 60,
        y: 40 + row * 40,
        w: 64, h: 64,
        alive: true,
        type: enemyType
      });
    });
  })()),
  enemyDir: 1,
  enemySpeed: 40,
  score: 0,
  audio: Object.freeze({
    ctx: null,
    masterGain: null,
    bgOscs: Object.freeze([]),
    tones: Object.freeze([65, 60, 55, 50]),
    index: 0,
    lastTime: 0
  }),
  base: Object.freeze((() => {
    const cols = 3, rows = 1;
    return Array.from({ length: cols * rows }, (_, i) => Object.freeze({
      x: 170 + (i % cols) * ((canvas.width - 80) / cols),
      y: 500 + Math.floor(i / cols) * 40,
      w: 100, h: 80,
      hp: 30, hpMax: 30,
      hit: 0,
      alive: true
    }));
  })()),
  enemyAnimationFrame: 0,
  lastEnemyFrameTime: 0
});

const withPatch = (obj, patch) => Object.freeze({ ...obj, ...patch });

const withPlayer = (state, patch) =>
  Object.freeze({ ...state, player: Object.freeze({ ...state.player, ...patch }) });

const withAudio = (state, patch) =>
  Object.freeze({ ...state, audio: Object.freeze({ ...state.audio, ...patch }) });

const withEnemies = (state, mapFn) =>
  Object.freeze({ ...state, enemies: Object.freeze(state.enemies.map(e => Object.freeze(mapFn(e)))) });

const setEnemies = (state, enemies) =>
  Object.freeze({ ...state, enemies: Object.freeze(enemies.map(Object.freeze)) });

const setBases = (state, bases) =>
  Object.freeze({ ...state, base: Object.freeze(bases.map(Object.freeze)) });

const pushBullet = (state, bullet) =>
  Object.freeze({ ...state, bullets: Object.freeze(state.bullets.concat(Object.freeze(bullet))) });

const pushEnemyBullet = (state, bullet) =>
  Object.freeze({ ...state, enemyBullets: Object.freeze(state.enemyBullets.concat(Object.freeze(bullet))) });

const setBullets = (state, bullets) =>
  Object.freeze({ ...state, bullets: Object.freeze(bullets.map(Object.freeze)) });

const setEnemyBullets = (state, bullets) =>
  Object.freeze({ ...state, enemyBullets: Object.freeze(bullets.map(Object.freeze)) });

const setRunning = (state, running) => withPatch(state, { running });
const setMuted = (state, isMuted) => withPatch(state, { isMuted });
const setScore = (state, score) => withPatch(state, { score });
const setLastTime = (state, lastTime) => withPatch(state, { lastTime });
const setWave = (state, wave) => withPatch(state, { wave });
const setEnemyDir = (state, enemyDir) => withPatch(state, { enemyDir });
const setEnemySpeed = (state, enemySpeed) => withPatch(state, { enemySpeed });

const spawnEnemies = (cols, rows) => {
  const typeMapping = [3, 2, 2, 1];
  return Array.from({ length: cols * rows }, (_, i) => {
    const row = Math.floor(i / cols);
    const enemyType = typeMapping[row];
    return Object.freeze({
      x: 300 + (i % cols) * 60,
      y: 40 + row * 40,
      w: 64, h: 64,
      alive: true,
      type: enemyType
    });
  });
};

const spawnBases = (canvas, cols = 3, rows = 1, w = 120, h = 100) =>
  Array.from({ length: cols * rows }, (_, i) => Object.freeze({
    x: 170 + (i % cols) * ((canvas.width - 80) / cols),
    y: 500 + Math.floor(i / cols) * 40,
    w, h,
    hp: 30, hpMax: 30, hit: 0, alive: true
  }));

const resetForNewWave = (state, canvas) =>
  setBases(
    withPatch(state, {
      wave: state.wave + 1,
      enemySpeed: state.enemySpeed + 10.5,
      enemyFireRate: state.enemyFireRate * 1.12
    }),
    spawnBases(canvas, 3, 1, 100, 80).map(b => ({ ...b })) // mesma geometria do seu estado inicial
  );

const resetForStart = (canvas) => {
  // estado novo em folha (sem reaproveitar antigo)
  return initialState(canvas);
};


// -----VIDA------
// Função que recebe o número de vidas e devolve as imagens corretas
const renderLives = (lives, maxLives = 3) => 
  Array.from({ length: maxLives }, (_, i) =>
    i < lives ? "assets/vida(192x192).png" : "assets/sem-vida(192x192).png");

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

// ------ KEYS (teclas ;) ) -----
// Função que recebe os input da interação teclado do usuário e game
const keys = {};
document.addEventListener("keydown", e => { keys[e.code] = true;
  if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) e.preventDefault(); });
document.addEventListener("keyup", e => { keys[e.code] = false; });
//Para evitar o bug clássico  de jogos de navegador (quando o foco do navegador muda e O script n reconhece a mudança e mantém pressionado a última tecla mesmo tendo a soltado)
//Como o bug do mouse ou troca de janela, esse evento é registrado e as teclas congeladas simplesmente param
  window.addEventListener("blur", () => {
  // Reseta todas as teclas para 'false' se o jogador clicar fora da tela (aqui cabou-se o problema do botão direito do mouse ;) )
  // ou ainda a janela perder o foco. Isso previne o bug da "tecla presa".
  Object.keys(keys).forEach(key => {
    keys[key] = false;
  });
});

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

// Função para tocar o som do tiro. (para evitar reiniciar o audio, ela clona o audio sempre que o jogador atirar)
const playAudioTiro = (audioElement) => {
  const soundToPlay = audioElement.cloneNode();
  soundToPlay.muted = audioElement.muted;
  soundToPlay.volume = audioElement.volume;
  soundToPlay.play().catch(e => console.error("Audio do Tiro Falhou:", e));
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
    return; // Ainda não é hora de tocar (segura onda ai :) )
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
const tiro = (state) => {
  if (state.player.cooldown > 0) return state;
  const s1 = withPlayer(state, { cooldown: 0.420 });
  const s2 = pushBullet(s1, { x: s1.player.x + s1.player.w / 2 - 2, y: s1.player.y - 6, w: 4, h: 8, dy: -420 });
  return s2;
};
// efeito (isolado, opcional no loop): () => playAudioTiro(playerShotSound);


// Função para processar as colisões do tiro do jogador com a base
function processPlayerBulletBase(bullet, base, idx) {
  if (idx >= base.length) return;
  const b = base[idx];
  if (b.alive &&
      bullet.x < b.x + b.w && bullet.x + bullet.w > b.x &&
      bullet.y < b.y + b.h && bullet.y + bullet.h > b.y) {
    bullet.y = -9999; // Remove o tiro do jogador
    return;
  }
  processPlayerBulletBase(bullet, base, idx + 1);
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

// fUnção que processa inimigos
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

// Função para processar colisão entre balas do inimigo e a base
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
      e.justDied = true;  // sinaliza que a base foi destruída
    };
    return; // evita múltiplos acertos no mesmo frame
  };
  processBulletBase(bullet, base, idx + 1);
}

// Função para detectar se a horda de aliens morreu e então regenerar o escudo
const regenerateBases = (bases) => {
  return bases.map(base => ({
        ...base,        //copia a base original
        hp: base.hpMax, //regenera o hp para o máximo
        alive: true     // ressuscita o escudo que foi destruído
  }));
};

// Função para verificar se algum inimigo chegou na base
const checkEnemyBase = (state) => {
  const hit = state.enemies.some(e => e.alive && (e.y + e.h >= state.player.y));
  return hit ? setRunning(state, false) : state;
};
// efeito quando game over: playTone(60, 0.6, "sine", 0.12)

// Função tiro dos inimigos, chablau
const enemyShoot = (state) => {
  const newBullets = state.enemies.reduce((acc, e) =>
    (e.alive && Math.random() < state.enemyFireRate)
      ? acc.concat({ x: e.x + e.w / 2 - 2, y: e.y + e.h, w: 4, h: 10, dy: 220 })
      : acc
  , []);
  if (newBullets.length === 0) return state;
  return setEnemyBullets(state, state.enemyBullets.concat(newBullets));
};
// efeito (para cada bala gerada): playTone(320, 0.07, "triangle", 0.08)

// Função que calcula o próximo estado de animação da nave
const updatePlayerAnimation = (playerState, dt, fps) => {
  const interval = 1 / fps; // 2.5 FPS -> intervalo de 0.4s
  const newLastAnimationFrameTime = playerState.lastAnimationFrameTime + dt;

  if (newLastAnimationFrameTime >= interval) {
    const newFrame = (playerState.animationFrame + 1) % 3; // 3 frames (0, 1, 2)
    return {
      animationFrame: newFrame,
      lastAnimationFrameTime: newLastAnimationFrameTime - interval
    };
  }
  
  return {
    animationFrame: playerState.animationFrame,
    lastAnimationFrameTime: newLastAnimationFrameTime
  };
};

// Função para selecionar a imagem correta da nave
const getPlayerImage = (animationFrame) => playerFrames[animationFrame];

// Função (theu: GIGANTE!! edu: MT msm) que retorna as modificações do state inicial
// Helpers: composição

const pipe = (x, ...fns) => fns.reduce((v, f) => f(v), x);


// ---Updates do Player---

// cooldown e invencibilidade
const updatePlayerCooldown = (state, dt) =>
  withPlayer(state, {
    invincible: Math.max(0, state.player.invincible - dt),
    cooldown: Math.max(0, state.player.cooldown - dt)
  });

// animação do player
const updatePlayerAnimationFrame = (state, dt) => {
  const anim = updatePlayerAnimation(state.player, dt, 2.5);
  return withPlayer(state, anim);
};

// movimento do player (sem let)
const updatePlayerMovement = (state, dt, keys, canvas) => {
  const dir =
    (keys["ArrowLeft"] || keys["KeyA"] ? -0.5 : 0) +
    (keys["ArrowRight"] || keys["KeyD"] ? 0.5 : 0);

  const proposedX = state.player.x + dir * state.player.speed * dt;
  const clampedX = Math.max(2, Math.min(proposedX, canvas.width - 2 - state.player.w));

  return withPlayer(state, { x: clampedX });
};

// tiro do player
const updatePlayerShoot = (state, keys) => {
  const wantsShoot = keys["Space"] || keys["KeyW"] || keys["ArrowUp"];
  return wantsShoot ? tiro(state) : state;
};


// ---Updates dos Inimigos---


// movimento dos inimigos (horizontal e descida quando bate borda)
const updateEnemiesMovement = (state, dt, canvas) => {
  const moved = state.enemies.map(e =>
    Object.freeze({ ...e, x: e.x + state.enemySpeed * dt * state.enemyDir })
  );

  const hitLeft = moved.some(e => e.alive && e.x < 5);
  const hitRight = moved.some(e => e.alive && e.x + e.w > canvas.width - 5);

  if (hitLeft || hitRight) {
    const newDir = -state.enemyDir;
    const dropped = moved.map(e =>
      Object.freeze({ ...e, y: e.y + 10, x: e.x })
    );
    return setEnemies(
      withPatch(state, { enemyDir: newDir }),
      dropped
    );
  }

  return setEnemies(state, moved);
};

// inimigos atiram
const updateEnemyShoot = (state) => enemyShoot(state);

// animação dos inimigos
const updateEnemyAnimationFrame = (state, dt) => {
  const interval = 0.5;
  const newLast = state.lastEnemyFrameTime + dt;

  return newLast >= interval
    ? withPatch(state, {
        enemyAnimationFrame: (state.enemyAnimationFrame + 1) % 2,
        lastEnemyFrameTime: newLast - interval
      })
    : withPatch(state, { lastEnemyFrameTime: newLast });
};

// checar se inimigos chegaram à base
const updateEnemyBaseCheck = (state) => checkEnemyBase(state);

// =======================================
// Updates das Balas
// =======================================

// balas do player
const updateBullets = (state, dt) =>
  setBullets(
    state,
    state.bullets
      .map(b => Object.freeze({ ...b, y: b.y + b.dy * dt }))
      .filter(b => b.y > -20)
  );

// balas dos inimigos
const updateEnemyBullets = (state, dt, canvas) =>
  setEnemyBullets(
    state,
    state.enemyBullets
      .map(b => Object.freeze({ ...b, y: b.y + b.dy * dt }))
      .filter(b => b.y < canvas.height + 20)
  );

// =======================================
// Updates de Colisões e Bases
// =======================================

// colisão de balas do player com inimigos
const updateBulletEnemyCollision = (state) =>
  checkCollisions(state); // deve ser refatorado também para não mutar

// colisão de balas dos inimigos com player
const updateBulletPlayerCollision = (state) =>
  checkPlayerHit(state); // idem: deve ser puro

// colisão de balas nas bases
const updateBaseCollision = (state) =>
  checkBaseCollisions(state); // idem

// resetar para próxima wave se todos inimigos mortos
const updateWaveReset = (state, canvas) => {
  const allDead = state.enemies.every(e => !e.alive);
  return allDead ? nextWave(state, canvas) : state;
};

// =======================================
// Composição final do update
// =======================================
const updateGame = (state, dt, canvas, keys) =>
  pipe(
    state,
    (s) => updatePlayerCooldown(s, dt),
    (s) => updatePlayerAnimationFrame(s, dt),
    (s) => updatePlayerMovement(s, dt, keys, canvas),
    (s) => updatePlayerShoot(s, keys),
    (s) => updateEnemiesMovement(s, dt, canvas),
    (s) => updateEnemyShoot(s),
    (s) => updateEnemyAnimationFrame(s, dt),
    (s) => updateBullets(s, dt),
    (s) => updateEnemyBullets(s, dt, canvas),
    (s) => updateBulletEnemyCollision(s),
    (s) => updateBulletPlayerCollision(s),
    (s) => updateBaseCollision(s),
    (s) => updateEnemyBaseCheck(s),
    (s) => updateWaveReset(s, canvas)
  );

// Função que retorna o frame certo da bestafera (alien) (coé, kalil. não poder usar let é paia, ein... nem precisaria dessa função, era só meter o let na parte dos inimigos na função render e dale)
const getEnemyImage = (enemyType, currentFrame) => {
  const isFrame1 = currentFrame === 0;

  if (enemyType === 1) {
      return isFrame1 ? enemyImg1 : enemyImg1_frame2;
  }
  if (enemyType === 2) {
      return isFrame1 ? enemyImg2 : enemyImg2_frame2;
  }
  if (enemyType === 3) {
      return isFrame1 ? enemyImg3 : enemyImg3_frame2
  }
};

//Evento muted, cancelar o som (a cada click(depende do click do mouse no botão de mutar/desmutar), altera o boolean definido no state, invertendo seu valor lógico
const toggleMuteState = (state) => setMuted(state, !state.isMuted);

const applyMuteEffect = (state) => {
  const isMuted = state.isMuted;
  if (state.audio.masterGain) {
    state.audio.masterGain.gain.value = isMuted ? 0 : 0.9;
  }
  playerShotSound.muted = isMuted;
  baseDestroyedSound.muted = isMuted;
  muteBtn.textContent = isMuted ? "🔊 Desmutar" : "🔇 Mutar";
};

// IMPORTANTE: o handler agora NÃO toca no state global;
// a atualização do estado acontecerá dentro do loop funcional (ver Seção 5).
muteBtn.addEventListener("click", () => {
  // Dispara uma ação (veremos como aplicar no loop)
  pendingActions.push((s) => toggleMuteState(s)); // ver Seção 5 — pendingActions
});

// --- Render --- (mostrar,criar e desenhar na tela)
const drawRect = (x, y, w, h, color) => { ctx.fillStyle = color; ctx.fillRect(x, y, w, h); };

const render = () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  updateLivesUI(state);

  // Player
  const currentPlayerImg = getPlayerImage(state.player.animationFrame);
  if (state.player.invincible > 0) {
    if (Math.floor(Date.now() / 100) % 2 === 0) {
      ctx.drawImage(currentPlayerImg, state.player.x, state.player.y, state.player.w, state.player.h);
    }
  } else {
    ctx.drawImage(currentPlayerImg, state.player.x, state.player.y, state.player.w, state.player.h);
  }

  // Player lives (IN PORTUGUESE, please ;-; : vidas)
  ctx.fillStyle = "#fff";
  ctx.font = "16px 'Press Start 2P'";
  ctx.fillText("Vidas: ", canvas.width - 150, 20);


  // Bullets
  state.bullets.forEach(b => drawRect(b.x, b.y, b.w, b.h, "#58a6ff"));

  // Escudos (base)
state.base.forEach(b => {
  if (!b.alive) return;

  // flash quando hit > 0
  if (b.hit > 0) ctx.globalAlpha = 0.6;
  ctx.drawImage(baseImg, b.x, b.y, b.w, b.h);
  ctx.globalAlpha = 1;

  // barra de vida (fundo + frente), aqui é referente a base
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
   const img = getEnemyImage(e.type, state.enemyAnimationFrame);
   ctx.drawImage(img, e.x, e.y, e.w, e.h)
  });
  
  ctx.fillStyle = "#fff"; ctx.font = "16px 'Press Start 2P'"; ctx.fillText("Score: " + state.score, 550, 20);

  if (!state.running) {
    // --- Tela de Fundo Escurecida ---
    ctx.fillStyle = "rgba(0,0,0,0.75)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // --- Texto "GAME OVER" com Estilo Retrô ---
    ctx.font = "48px 'Press Start 2P'";
    ctx.textAlign = "center";

    // Efeito de sombra/contorno para o texto
    ctx.fillStyle = "#fff"; // Cor do contorno
    ctx.fillText("GAME OVER", canvas.width / 2 + 3, canvas.height / 2 - 50 + 3);
    
    // Texto principal
    ctx.fillStyle = "#25f82fff"; // Cor do texto
    ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2 - 50);

    // --- Subtexto de Instrução ---
    ctx.font = "14px 'Press Start 2P'";
    ctx.fillStyle = "#fff";
    ctx.fillText("Clique no botão para reiniciar", canvas.width / 2, canvas.height / 2);

    // --- Botão de Reiniciar com Estilo Retrô ---
    const btnWidth = 240, btnHeight = 50;
    const btnX = canvas.width / 2 - btnWidth / 2;
    const btnY = canvas.height / 2 + 30;
    const shadowOffset = 5; // Tamanho da "sombra 3D"

    // Sombra do botão (desenhada primeiro, por baixo)
    ctx.fillStyle = "#02a036ff"; // Rosa escuro para a sombra
    ctx.fillRect(btnX, btnY, btnWidth, btnHeight);

    // Corpo principal do botão (desenhado por cima, um pouco deslocado)
    ctx.fillStyle = "#232946";
    ctx.fillRect(btnX, btnY - shadowOffset, btnWidth, btnHeight);

    // Texto do botão
    ctx.font = "18px 'Press Start 2P'";
    ctx.fillStyle = "#fff"; // Texto branco para contraste
    ctx.textBaseline = "middle"; // Alinha o texto verticalmente pelo meio
    ctx.fillText("Reiniciar", canvas.width / 2, btnY - shadowOffset + (btnHeight / 2));

    // Reseta os alinhamentos para não afetar outros desenhos
    ctx.textAlign = "start";
    ctx.textBaseline = "alphabetic";
}
};

// --- Detecta clique no botão de reiniciar, como um evento de retorno ---
canvas.addEventListener("click", (e) => {
  // ... seu cálculo de colisão com o botão Reiniciar ...
  if (clicouNoBotao) {
    ensureAudio();
    menu.style.display = "none";
    canvas.style.display = "block";
    muteBtn.style.display = "block";

    const s0 = resetForStart(canvas);
    requestAnimationFrame((ts) => {
      const sStart = Object.freeze({ ...s0, lastTime: ts, running: true });
      render(sStart);
      requestAnimationFrame(step(sStart, ts, keys, canvas));
    });
  }
});

// --- Loop principal ---
const step = (prevState, prevTs, keys, canvas) => (ts) => {
  const dt = Math.min(0.05, (ts - (prevTs ?? ts)) / 1000);

  // consome ações pendentes (mute, etc.)
  const actions = pendingActions.splice(0, pendingActions.length);
  const sA = reduceActions(prevState, actions);

  // aplica lógica pura do jogo
  const sB = updatePure(sA, dt, canvas, keys);

  // efeitos (sons/DOM) ficam fora: ex.: se houve mute, aplicar
  // applyMuteEffect(sB);  // chame aqui quando necessário

  // render com o estado atual
  render(sB);

  // continua se running
  if (!sB.running) return;

  // encadeia próximo frame passando novo estado congelado
  requestAnimationFrame(step(Object.freeze({ ...sB, lastTime: ts }), ts, keys, canvas));
};
// Fila de transformações puras de estado, usada pelos eventos do DOM
const pendingActions = [];

const reduceActions = (state, actions) =>
  actions.reduce((s, fn) => fn(s), state);
// --- Play button ---
playBtn.addEventListener("click", () => {
  ensureAudio(); // desbloqueia contexto de áudio

  // Efeitos visuais iniciais
  menu.style.display = "none";
  canvas.style.display = "block";
  muteBtn.style.display = "block";

  // Estado inicial imutável
  const s0 = resetForStart(canvas);

  // Inicia o loop funcional
  requestAnimationFrame((ts) => {
    const sStart = Object.freeze({ ...s0, lastTime: ts, running: true });
    render(sStart); 
    requestAnimationFrame(step(sStart, ts, keys, canvas));
  });
});