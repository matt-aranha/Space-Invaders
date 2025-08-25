const canvas = document.querySelector("#ultimo-Sobrevivente");
const ctx = canvas.getContext("2d");
const playBtn = document.querySelector("#play-btn");
const menu = document.querySelector("#menu");

const playerImg = new Image();
playerImg.src = "sprites/nave.png";
const enemyImg = new Image();
enemyImg.src = "sprites/invader2.png";

const musica = new Audio('sons/musica.mp3');// musica de kim lightyear
musica.loop = true;
musica.volume = 0.4;

const somTiro = new Audio('sons/tiro.mp3');
somTiro.volume = 0.2;

const somDano = new Audio('sons/dano.mp3');
somDano.volume = 0.2;
const tocarDano = () => {
  const s = somDano.cloneNode();
  s.volume = somDano.volume;
  s.play();
};



// funções para tocar música e som de tiro
const tocarMusica = () => {
  if (musica.paused) {
    musica.currentTime = 0;
    musica.play();
  }
};

const pararMusica = () => {
  musica.pause();
  musica.currentTime = 0;
};

const tocarTiro = () => {
  // Para permitir tiros rápidos, clone o áudio
  const s = somTiro.cloneNode();
  s.volume = somTiro.volume;
  s.play();
};



// converte graus para radianos
const degToRad = deg => deg * Math.PI / 180;
// estado inicial do jogador
const initialPlayer = () => ({
  x: canvas.width / 2,
  y: canvas.height / 2,
  w: 60,
  h: 50,
  angle: 0,
  speed: 0,
  maxSpeed: 360,
  cooldown: 0,
  lives: 5,
  invulneravelAte: 0
});

// estado inicial do jogo
const initialState = () => ({
  running: false,
  lastTime: 0,
  player: initialPlayer(),
  bullets: [],
  enemies: [],
  enemyBullets: [],
  score: 0
});

// captura de teclas
const keys = {};
document.addEventListener("keydown", e => { keys[e.code] = true; });
document.addEventListener("keyup", e => { keys[e.code] = false; });

// função para criar um inimigo em uma posição aleatória na borda do canvas
const spawnEnemy = canvas => {
  const side = Math.floor(Math.random() * 4);
  return {
    x: side === 0 ? Math.random() * canvas.width : (side === 1 ? canvas.width : (side === 2 ? Math.random() * canvas.width : 0)),
    y: side === 0 ? 0 : (side === 1 ? Math.random() * canvas.height : (side === 2 ? canvas.height : Math.random() * canvas.height)),
    w: 36,
    h: 28,
    speed: 60 + Math.random() * 60,
    alive: true
  };
};



//função para atualizar o estado do jogado
const updatePlayer = (player, keys, dt, canvas) => {
  const angle = player.angle + (keys["KeyA"] ? -360 * dt : 0) + (keys["KeyD"] ? 360 * dt : 0);
  const move = keys["KeyW"] ? player.maxSpeed : (keys["KeyS"] ? -player.maxSpeed : 0);
  const rad = degToRad(angle);
  const x = Math.max(0, Math.min(canvas.width, player.x + Math.cos(rad) * move * dt));
  const y = Math.max(0, Math.min(canvas.height, player.y + Math.sin(rad) * move * dt));
  const cooldown = Math.max(0, player.cooldown - dt);
  return { ...player, x, y, angle, speed: move, cooldown };
};

//função para atualizar os estado da bala
const updateBullets = (bullets, dt, canvas) =>
  bullets
    .map(b => ({ ...b, x: b.x + b.dx * dt, y: b.y + b.dy * dt }))
    .filter(b => b.x > 0 && b.x < canvas.width && b.y > 0 && b.y < canvas.height);

// função para atualizar o estado dos inimigos
const updateEnemies = (enemies, player, dt) =>
  enemies.map(e => {
    if (!e.alive) return e;
    const dx = player.x - e.x;
    const dy = player.y - e.y;
    const dist = Math.hypot(dx, dy) || 1;
    const vx = (dx / dist) * e.speed * dt;
    const vy = (dy / dist) * e.speed * dt;
    return { ...e, x: e.x + vx, y: e.y + vy };
  });

// função para os inimigos atirarem
const enemyShoot = (enemies, player, enemyBullets) =>
  enemies.reduce((bullets, e) => {
    if (e.alive && Math.hypot(player.x - e.x, player.y - e.y) < 200 && Math.random() < 0.01) {
      const dx = player.x - e.x;
      const dy = player.y - e.y;
      const dist = Math.hypot(dx, dy) || 1;
      return bullets.concat([{
        x: e.x + dx / dist * 20,
        y: e.y + dy / dist * 20,
        dx: (dx / dist) * 200,
        dy: (dy / dist) * 200,
        w: 5, h: 5
      }]);
    }
    return bullets;
  }, enemyBullets);

// função para processar colisões entre balas e inimigos
const processBullets = (bullets, enemies, score) => {
  // Função recursiva para processar colisão de uma bala com os inimigos
  const processBullet = (bullet, enemiesArr, idx = 0) => {
    if (idx >= enemiesArr.length) return { hit: false, updatedEnemies: enemiesArr, scoreDelta: 0 };
    const e = enemiesArr[idx];
    if (
      e.alive &&
      bullet.x < e.x + e.w && bullet.x + bullet.w > e.x &&
      bullet.y < e.y + e.h && bullet.y + bullet.h > e.y
    ) {
      // Marca inimigo como morto
      const updatedEnemies = enemiesArr.map((en, i) =>
        i === idx ? { ...en, alive: false } : en
      );
      return { hit: true, updatedEnemies, scoreDelta: 10 };
    }
    return processBullet(bullet, enemiesArr, idx + 1);
  };

  // Processa todas as balas de forma funcional
  return bullets.reduce(
    (acc, b) => {
      const { hit, updatedEnemies, scoreDelta } = processBullet(b, acc.enemies);
      return hit
        ? { bullets: acc.bullets, enemies: updatedEnemies, score: acc.score + scoreDelta, inimigoAcertado: true }
        : { bullets: acc.bullets.concat([b]), enemies: acc.enemies, score: acc.score, inimigoAcertado: acc.inimigoAcertado };
    },
    { bullets: [], enemies: enemies.map(e => ({ ...e })), score, inimigoAcertado: false }
  );
};

// função para processar colisões entre inimigos e o jogador
const processPlayerHit = (player, enemyBullets, ts) => {
  // se ainda está invulnerável, não sofre dano
  if (ts < player.invulneravelAte) {
    return {
      player,
      enemyBullets,
      foiAcertado: false
    };
  }

  const hitboxX = player.x - player.w / 2;
  const hitboxY = player.y - player.h / 2;
  const hitboxW = player.w;
  const hitboxH = player.h;

  const hits = enemyBullets.filter(b =>
    b.x < hitboxX + hitboxW &&
    b.x + b.w > hitboxX &&
    b.y < hitboxY + hitboxH &&
    b.y + b.h > hitboxY
  ).length;

  const newBullets = enemyBullets.filter(b =>
    !(
      b.x < hitboxX + hitboxW &&
      b.x + b.w > hitboxX &&
      b.y < hitboxY + hitboxH &&
      b.y + b.h > hitboxY
    )
  );

  return {
    player: hits > 0
      ? { ...player, lives: player.lives - hits, invulneravelAte: ts + 2000 } // dois segundos de invulnerabilidade
      : player,
    enemyBullets: newBullets,
    foiAcertado: hits > 0
  };
};

// função para spawnar uma onda de inimigos
const spawnEnemiesWave = (canvas, quantidade = 5) =>
  Array.from({ length: quantidade }, () => spawnEnemy(canvas));

// função para o jogador atirar
const tiro = (state) => {
  if (state.player.cooldown > 0) return { state, atirou: false };
  const rad = degToRad(state.player.angle);
  const bullet = {
    x: state.player.x + Math.cos(rad) * 30,
    y: state.player.y + Math.sin(rad) * 30,
    dx: Math.cos(rad) * 400,
    dy: Math.sin(rad) * 400,
    w: 6,
    h: 6
  };
  return {
    state: {
      ...state,
      player: { ...state.player, cooldown: 0.19 },
      bullets: state.bullets.concat([bullet])
    },
    atirou: true
  };
};

// função para proximos estados do jogo
const nextState = (state, keys, dt, canvas, ts) => {
  const precisaSpawnInicial = state.enemies.length === 0;
  const todosMortos = state.enemies.length > 0 && state.enemies.every(e => !e.alive);
  const novosInimigos = (precisaSpawnInicial || todosMortos)
    ? spawnEnemiesWave(canvas, 5 + Math.floor(state.score / 50))
    : [];
  const enemies = state.enemies.filter(e => e.alive).concat(novosInimigos);

  const playerAtualizado = updatePlayer(state.player, keys, dt, canvas);

  const podeAtirar = keys["Space"] && playerAtualizado.cooldown === 0;
  const stateAfterTiro = podeAtirar
    ? tiro({ ...state, player: playerAtualizado, bullets: state.bullets }).state
    : { ...state, player: playerAtualizado, bullets: state.bullets };

  const bullets = updateBullets(stateAfterTiro.bullets, dt, canvas);
  const movedEnemies = updateEnemies(enemies, stateAfterTiro.player, dt);
  const enemyBullets = enemyShoot(movedEnemies, stateAfterTiro.player, updateBullets(state.enemyBullets, dt, canvas));
  const bulletResult = processBullets(bullets, movedEnemies, state.score);

  //  agora passa o ts absoluto
  const playerHitResult = processPlayerHit(stateAfterTiro.player, enemyBullets, ts);

  const running = playerHitResult.player.lives > 0;

  return {
    ...state,
    player: playerHitResult.player,
    bullets: bulletResult.bullets,
    enemies: bulletResult.enemies,
    enemyBullets: playerHitResult.enemyBullets,
    score: bulletResult.score,
    running,
    lastTime: ts, // atualizado aqui
    foiAcertado: playerHitResult.foiAcertado,
    inimigoAcertado: bulletResult.inimigoAcertado,
    inimigosAtiraram: enemyBullets.length > state.enemyBullets.length
  };
};

// função para renderizar o estado do jogo
const render = (state) => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const invulneravel = state.lastTime < state.player.invulneravelAte;
  const deveDesenhar = !invulneravel || Math.floor(state.lastTime / 100) % 2 === 0;

  if (deveDesenhar) {
    ctx.save();
    ctx.translate(state.player.x, state.player.y);
    ctx.rotate(degToRad(state.player.angle) + Math.PI / 2);
    ctx.drawImage(playerImg, -state.player.w / 2, -state.player.h / 2, state.player.w, state.player.h);
    ctx.restore();
  }
 // desenha balas
  state.bullets.forEach(b => drawRect(b.x, b.y, b.w, b.h, "#58a6ff"));
  state.enemyBullets.forEach(b => drawRect(b.x, b.y, b.w, b.h, "#ff5470"));

  state.enemies.forEach(e => {
    if (e.alive) ctx.drawImage(enemyImg, e.x, e.y, e.w, e.h);
  });

  ctx.fillStyle = "#fff";
  ctx.font = "16px monospace";
  ctx.fillText("Vidas: " + state.player.lives, 10, 20);
  ctx.fillText("Score: " + state.score, 10, 40);

  if (!state.running) {
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ff5470";
    ctx.font = "34px monospace";
    ctx.textAlign = "center";
    ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2 - 10);
    ctx.font = "16px monospace";
    ctx.fillStyle = "#fff";
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

function drawRect(x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

// --- Loop funcional ---
function loop(state, ts) {
  if (!state.running) {
    pararMusica();
    return;
  }
  const dt = Math.min(0.05, (ts - (state.lastTime || ts)) / 1000);
  const newState = nextState(state, keys, dt, canvas, ts);
  
  render(newState);

  // sons
  if (state.player.cooldown === 0 && keys["Space"]) {
    tocarTiro();
  }
  if (newState.inimigosAtiraram) {
    tocarTiro();
  }
  if (newState.foiAcertado) {
    tocarDano();
  }
  if (newState.inimigoAcertado) {
    tocarDano();
  }

  requestAnimationFrame(ts2 => loop(newState, ts2));
}

// --- Clique no botão de reiniciar ---
canvas.addEventListener("click", function(e) {
  // O estado é passado por parâmetro, não precisa checar state.running global
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
    menu.style.display = "none";
    canvas.style.display = "block";
    tocarMusica();
    canvas.focus && canvas.focus();
    const novoEstado = { ...initialState(), running: true };
    render(novoEstado);
    requestAnimationFrame(ts => loop(novoEstado, ts));
  }
});

// --- Clique no botão Play do menu ---
playBtn.addEventListener("click", () => {
  menu.style.display = "none";
  canvas.style.display = "block";
  tocarMusica();
  canvas.focus && canvas.focus();
  
  const novoEstado = { ...initialState(), running: true };
  render(novoEstado);
  requestAnimationFrame(ts => loop(novoEstado, ts));
});

// Inicialização
const estadoInicial = { ...initialState(), running: true };
render(estadoInicial);
requestAnimationFrame(ts => loop(estadoInicial, ts));