//SCRIPT DO MODO CLÁSSICO DO JOGO SPACE INVADERS, vulgo THE BEST GAME ;)
//inports brabos ;)
const canvas = document.querySelector("#space-invaders");
const ctx = canvas.getContext("2d");
const playBtn = document.querySelector("#play-btn");
const retornarBtn = document.querySelector("#retornar-btn")
const menu = document.querySelector("#menu");
const muteBtn = Object.freeze(document.getElementById("mute-btn"));
const rootState = {
  current: Object.freeze({
    game: initialState(canvas)
  })
};

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

const Sounds = Object.freeze({
  tiro: (() => {
    const audio = new Audio("assets/tiro.mp3");
    audio.volume = 0.25;
    return audio;
  })(),
  dano: (() => {
    const audio = new Audio("assets/explosao.mp3");
    audio.volume = 0.3;
    return audio;
  })()
});

// Função pura para tocar som
const playSound = (audio) => {
  const newAudio = audio.cloneNode(true); // cópia para evitar cortar som
  newAudio.muted = audio.muted;
  newAudio.volume = audio.volume;
  newAudio.play();
  return Object.freeze(audio);
};

// Função para aplicar mute a todos os sons
const applyMute = (isMuted) => {
  Sounds.tiro.muted = isMuted;
  Sounds.dano.muted = isMuted;
};

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
  bases: Object.freeze((() => {
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
  Object.freeze({ ...state, bases: Object.freeze(bases.map(Object.freeze)) });

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
const renderLives = (lives, maxLives = 3) => Array.from({ length: maxLives }, (_, i) => i < lives ? "assets/vida(192x192).png" : "assets/sem-vida(192x192).png");

// Função que transforma a lista de imagens em DOM (strings) HTML
const livesToHTML = (lives) => renderLives(lives).map(src => `<img src="${src}" width="30" height="30" />`).join("");

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
      // Reseta todas as teclas para 'false' se o jogador clicar fora da tela (aqui cabou-se o problema do botão direito do mouse ;) )  (theu: boaaa, edu!)
      Object.keys(keys).forEach(key => {
        keys[key] = false;
      });
    });

// --- Áudio (WebAudio), mecanica de audio exportada ---
const ensureAudio = () => {
  const game = rootState.current && rootState.current.game;
  if (!game) return;
  if (game.audio && game.audio.ctx) return;

  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;

  const a = new AudioCtx();
  const mg = a.createGain();
  mg.gain.value = 0.9;
  mg.connect(a.destination);

  const patched = withAudio(game, { ctx: a, masterGain: mg });
  rootState.current = Object.freeze({ ...rootState.current, game: patched });

  return;
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
  playSound(Sounds.tiro);
  const s2 = pushBullet(s1, { x: s1.player.x + s1.player.w / 2 - 2, y: s1.player.y - 6, w: 4, h: 8, dy: -420 });
  return s2;
};
// efeito (isolado, opcional no loop): () => playAudioTiro(playerShotSound);


// Função para processar as colisões do tiro do jogador com a base
const processPlayerBulletBase = (state) => {
  const newBases = state.bases.map((base) => {
    const hit = state.bullets.some(
      (b) =>
        b.x < base.x + base.w &&
        b.x + b.w > base.x &&
        b.y < base.y + base.h &&
        b.y + b.h > base.y
    );

    return hit
      ? Object.freeze({
          ...base,
          hp: Math.max(0, base.hp - 1),
          alive: base.hp - 1 > 0,
          hit: 0.12,
        })
      : base;
  });

  const newBullets = state.bullets.filter(
    (b) =>
      !newBases.some(
        (base) =>
          b.x < base.x + base.w &&
          b.x + b.w > base.x &&
          b.y < base.y + base.h &&
          b.y + b.h > base.y
      )
  );

  return pipe(
    state,
    (s) => setBases(s, newBases),
    (s) => setBullets(s, newBullets)
  );
};


// Função para processar colisões entre balas e inimigos
const processBullets = (state) =>
  pipe(
    state,
    processEnemies,
    processPlayerBulletBase,
    processBulletBase
  );


// Função que relaciona os inimigos com os tiros que produzem assim também como se posicionam no canva
const enemyPoints = {
      1: 10,   // inimigo de baixo
      2: 20,   // inimigo do meio
      3: 30    // inimigo de cima
};

// fUnção que processa inimigos
const processEnemies = (state) => {
  const bullets = state.bullets;
  const enemies = state.enemies;

  const hits = bullets
    .map((b) => ({
      bullet: b,
      enemy: enemies.find(
        (e) =>
          e.alive &&
          b.x < e.x + e.w &&
          b.x + b.w > e.x &&
          b.y < e.y + e.h &&
          b.y + b.h > e.y
      ),
    }))
    .filter((hit) => hit.enemy);

  const newEnemies = enemies.map((enemy) =>
    hits.find((hit) => hit.enemy === enemy)
      ? { ...enemy, alive: false }
      : enemy
  );

  const newBullets = bullets.filter(
    (b) => !hits.find((hit) => hit.bullet === b)
  );

  const points = hits.length * 10;

  //  Toca som de explosão sempre que acertar inimigo
  if (hits.length > 0) {
    playSound(Sounds.dano);
  }

  return pipe(
    state,
    (s) => setEnemies(s, newEnemies),
    (s) => setBullets(s, newBullets),
    (s) => setScore(s, s.score + points)
  );
};



// Função para processar colisão entre balas do inimigo e a base
const processBulletBase = (state) => {
  const enemyBullets = state.enemyBullets;
  const bases = state.bases;

  const hits = enemyBullets
    .map((b) => ({
      bullet: b,
      base: bases.find(
        (base) =>
          b.x < base.x + base.w &&
          b.x + b.w > base.x &&
          b.y < base.y + base.h &&
          b.y + b.h > base.y
      ),
    }))
    .filter((hit) => hit.base);

  const newBases = bases.map((base) =>
    hits.find((hit) => hit.base === base)
      ? { ...base, hit: base.hit + 1 }
      : base
  );

  const newEnemyBullets = enemyBullets.filter(
    (b) => !hits.find((hit) => hit.bullet === b)
  );

  //  Toca som de dano quando base leva tiro
  if (hits.length > 0) {
    playSound(Sounds.dano);
  }

  return pipe(
    state,
    (s) => setBases(s, newBases),
    (s) => setEnemyBullets(s, newEnemyBullets)
  );
};



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
  playSound(Sounds.tiro);
  return setEnemyBullets(state, state.enemyBullets.concat(newBullets));
};
// efeito (para cada bala gerada): playTone(320, 0.07, "triangle", 0.08)

// Função que calcula o próximo estado de animação da nave
const updatePlayerAnimation = (playerState, dt, fps) => {
      const interval = 1 / fps;     // 2.5 FPS -> intervalo de 0.4s
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

// Função (theu: GIGANTE!! edu: MT msm) que retorna as modificações do state inicial (renato: retirei o update e as dividi em várias funções menores, mais fáceis de entender e manter, tornei mais funcional tbm, sem mutações, só retornando novos states)
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
const updateBulletEnemyCollision = (state) => processEnemies(state); // deve ser refatorado também para não mutar

// colisão de balas dos inimigos com player
const updateBulletPlayerCollision = (state) => {
  const hit = state.enemyBullets.some(
    (b) =>
      b.x < state.player.x + state.player.w &&
      b.x + b.w > state.player.x &&
      b.y < state.player.y + state.player.h &&
      b.y + b.h > state.player.y
  );

  return hit
    ? pipe(
        state,
        (s) =>
          withPlayer(s, {
            lives: Math.max(0, s.player.lives - 1),
            invincible: true,
            invincibilityTimer: 2.0,
          }),
        (s) =>
          setEnemyBullets(
            s,
            s.enemyBullets.filter(
              (b) =>
                !(
                  b.x < state.player.x + state.player.w &&
                  b.x + b.w > state.player.x &&
                  b.y < state.player.y + state.player.h &&
                  b.y + b.h > state.player.y
                )
            )
          )
      )
    : state;
};
 // idem: deve ser puro

// colisão de balas nas bases
const updateBaseCollision = (state) =>
  pipe(
    state,
    processPlayerBulletBase,
    processBulletBase
  ); // idem

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
  musica.muted = isMuted;
  playerShotSound.muted = isMuted;
  enemyShotSound.muted = isMuted;
  damageSound.muted = isMuted;
  // Atualiza o texto do botão
  muteBtn.textContent = isMuted ? "🔊 Desmutar" : "🔇 Mutar";
  return state;
};

// 🔹 Função pura que alterna mute
const toggleMute = (state) => {
  const newState = Object.freeze({
    ...state,
    isMuted: !state.isMuted
  });
  applyMute(newState.isMuted); // aplica mute de forma funcional
  return newState;
};

// IMPORTANTE: o handler agora NÃO toca no state global;
// a atualização do estado acontecerá dentro do loop funcional (ver Seção 5).
// 🔹 Listener do botão (não muta nada, só dispara a troca funcional)
muteBtn.addEventListener("click", () => {
  const gameState = rootState.current.game;
  const newGame = toggleMute(gameState);
  rootState.current = Object.freeze({
    ...rootState.current,
    game: newGame
  });
});

// 🔹 Exibir botão quando o jogo iniciar
const showMuteButton = () => {
  muteBtn.style.display = "block";
};

// --- Render --- (mostrar,criar e desenhar na tela)
const drawRect = (x, y, w, h, color) => { ctx.fillStyle = color; ctx.fillRect(x, y, w, h); };

const drawGlowingRect = (x, y, w, h, shadowColor, fillColor, blur = 10) => {
  ctx.save();
  ctx.shadowBlur = blur;
  ctx.shadowColor = shadowColor;
  ctx.fillStyle = fillColor;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
};

const render = (state) => {
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

  // HUD: Vidas
  ctx.fillStyle = "#fff";
  ctx.font = "16px 'Press Start 2P'";
  ctx.fillText("Vidas: ", canvas.width - 150, 20);

  // Bullets do player
  state.bullets.forEach(b => drawGlowingRect(b.x, b.y, b.w, b.h + 10, "#227dd8ff", "#58a6ff", 15));

  // Bases (escudos)
  state.bases.forEach(b => {
      if (!b.alive) return;
      if (b.hit > 0) ctx.globalAlpha = 0.6;
      ctx.drawImage(baseImg, b.x, b.y, b.w, b.h);
      ctx.globalAlpha = 1;
      const barY = b.y - 10;
      ctx.fillStyle = "red";
      ctx.fillRect(b.x, barY, b.w, 5);
      ctx.fillStyle = "lime";
      ctx.fillRect(b.x, barY, (b.hp / b.hpMax) * b.w, 5);
  });

  // Enemy bullets
  state.enemyBullets.forEach(b => drawGlowingRect(b.x, b.y, b.w, b.h + 8, "#e00d0dff", "#ff5470", 15));

  // Enemies
  state.enemies.forEach(e => {
      if (!e.alive) return;
      const img = getEnemyImage(e.type, state.enemyAnimationFrame);
      ctx.drawImage(img, e.x, e.y, e.w, e.h);
  });

  // Score
  ctx.fillStyle = "#fff";
  ctx.font = "16px 'Press Start 2P'";
  ctx.fillText("Score: " + state.score, 550, 20);

  // Pause menu
  if (state.isPaused) {
    ctx.filter = "blur(5px)";
    ctx.drawImage(canvas, 0, 0);
    ctx.filter = "none";

    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = "48px 'Press Start 2P'";
    ctx.textAlign = "center";
    ctx.fillStyle = "#fff";
    ctx.fillText("PAUSADO", canvas.width / 2, canvas.height / 2 - 100);

    const btnWidth = 320, btnHeight = 50;
    const continueBtnY = canvas.height / 2 - 25;
    ctx.fillStyle = "#232946";
    ctx.fillRect(canvas.width / 2 - btnWidth / 2, continueBtnY, btnWidth, btnHeight);
    ctx.font = "18px 'Press Start 2P'";
    ctx.fillStyle = "#fff";
    ctx.textBaseline = "middle";
    ctx.fillText("Continuar", canvas.width / 2, continueBtnY + (btnHeight / 2));

    const restartBtnY = canvas.height / 2 + 50;
    ctx.fillStyle = "#232946";
    ctx.fillRect(canvas.width / 2 - btnWidth / 2, restartBtnY, btnWidth, btnHeight);
    ctx.fillStyle = "#fff";
    ctx.fillText("Reiniciar", canvas.width / 2, restartBtnY + (btnHeight / 2));

    const returnBtnY = canvas.height / 2 + 125;
    ctx.fillStyle = "#232946";
    ctx.fillRect(canvas.width / 2 - btnWidth / 2, returnBtnY, btnWidth, btnHeight);
    ctx.fillStyle = "#fff";
    ctx.fillText("Tela de Início", canvas.width / 2, returnBtnY + (btnHeight / 2));

    ctx.textAlign = "start";
    ctx.textBaseline = "alphabetic";
  }

  // Game Over menu
  if (!state.running) {
    ctx.font = "48px 'Press Start 2P'";
    ctx.textAlign = "center";

    ctx.fillStyle = "#fff";
    ctx.fillText("GAME OVER", canvas.width / 2 + 3, canvas.height / 2 - 50 + 3);

    ctx.fillStyle = "#25f82fff";
    ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2 - 50);

    const btnWidth = 240, btnHeight = 50;
    const btnX = canvas.width / 2 - btnWidth / 2;
    const btnY = canvas.height / 2 + 30;
    const shadowOffset = 5;

    ctx.fillStyle = "#02a036ff";
    ctx.fillRect(btnX, btnY, btnWidth, btnHeight);

    ctx.fillStyle = "#232946";
    ctx.fillRect(btnX, btnY - shadowOffset, btnWidth, btnHeight);

    ctx.font = "18px 'Press Start 2P'";
    ctx.fillStyle = "#fff";
    ctx.textBaseline = "middle";
    ctx.fillText("Reiniciar", canvas.width / 2, btnY - shadowOffset + (btnHeight / 2));

    const btWidth = 240, btHeight = 50;
    const btX = canvas.width / 2 - btWidth / 2;
    const btY = canvas.height / 2 + 150;
    const shadowOfset = 5;

    ctx.fillStyle = "#02a036ff";
    ctx.fillRect(btX, btY, btWidth, btHeight);

    ctx.fillStyle = "#232946";
    ctx.fillRect(btX, btY - shadowOfset, btWidth, btHeight);

    ctx.fillStyle = "#fff";
    ctx.textBaseline = "middle";
    ctx.fillText("Retornar", canvas.width / 2 - btWidth / 3.5, btY - shadowOfset + (btHeight / 2));

    ctx.textAlign = "start";
    ctx.textBaseline = "alphabetic";
  }
};


// --- Detecta clique no botão de reiniciar, pause, continuar e retornar ao menu ---
canvas.addEventListener("click", function (e) {
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Lógica para quando o jogo ESTÁ PAUSADO
      if (state.isPaused) {
          const btnWidth = 320, btnHeight = 50;
          const btnX = canvas.width / 2 - btnWidth / 2;
          const continueBtnY = canvas.height / 2 - 25;
          const restartBtnY = canvas.height / 2 + 50;
          const returnBtnY = canvas.height / 2 + 125;

          // Checa clique no botão "Continuar"
          /*if (mouseX >= btnX && mouseX <= btnX + btnWidth && mouseY >= continueBtnY && mouseY <= continueBtnY + btnHeight) {
             implementar a lógica de continuar o jogo aqui quando estiver pronto e mais funcional
          }*/

          // Checa clique no botão "Reiniciar"
          /*else if (mouseX >= btnX && mouseX <= btnX + btnWidth && mouseY >= restartBtnY && mouseY <= restartBtnY + btnHeight) {
              implementar a lógica de reinício do jogo aqui quando estiver pronto e mais funcional
          }*/

          // Checa clique no botão "Retornar ao Menu"
          if (mouseX >= btnX && mouseX <= btnX + btnWidth && mouseY >= returnBtnY && mouseY <= returnBtnY + btnHeight) {
              window.location.href = "../index.html";
          }
      }

      // Lógica para a tela de GAME OVER (só executa se não estiver pausado)
      else if (!state.running) {
          const btnWidth = 240, btnHeight = 50; // Largura do botão de reiniciar do game over
          const btnX = canvas.width / 2 - btnWidth / 2;
          const btnY = canvas.height / 2 + 30;
    
          // Checa clique no botão "Reiniciar" do Game Over
          /*if (mouseX >= btnX && mouseX <= btnX + btnWidth && mouseY >= btnY -5 && mouseY <= btnY + btnHeight) { // Pequeno ajuste no Y por causa do seu efeito de sombra
             implementar a lógica de reinício do jogo aqui quando estiver pronto e mais funcional 
          }*/
    
          // Checa clique no botão "Retornar" do Game Over
          const btWidth = 240, btHeight = 50;
          const btX = canvas.width / 2 - btWidth / 2;
          const btY = canvas.height / 2 + 150;
          if (mouseX >= btX && mouseX <= btX + btWidth && mouseY >= btY && mouseY <= btY + btHeight) {
              window.location.href = "../index.html";
          }
      } 
      
});
// --- Detecta clique no botão de reiniciar, como um evento de retorno ---


// --- Loop principal ---
// loop funcional, recursivo, imutável
// recebe estado anterior, timestamp anterior, teclas e canvas
// retorna função que recebe timestamp atual
// e chama requestAnimationFrame com ela mesma (recursão)
const step = (prevState, prevTs, keys, canvas) => (ts) => {
  const dt = Math.min(0.05, (ts - (prevTs ?? ts)) / 1000);

  // consome ações pendentes (mute, etc.)
  const actions = pendingActions.splice(0, pendingActions.length);
  const sA = reduceActions(prevState, actions);

  // aplica lógica pura do jogo
  const sB = updateGame(sA, dt, canvas, keys);

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
  applyMute(false); // sons começam ativos
  menu.style.display = "none";
  canvas.style.display = "block";
  muteBtn.style.display = "block";

  const novoJogo = Object.freeze({
    ...initialState(canvas),
    running: true
  });

  rootState.current = Object.freeze({ game: novoJogo });

  // inicia o loop: requestAnimationFrame recebe a função retornada por step(...)
  requestAnimationFrame(step(novoJogo, 0, keys, canvas));
});