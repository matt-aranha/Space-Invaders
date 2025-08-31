const canvas = document.querySelector("#ultimo-Sobrevivente");
const ctx = canvas.getContext("2d");
const playBtn = document.querySelector("#play-btn");
const retornarBtn = document.querySelector("#retornar-btn")
const menu = document.querySelector("#menu");
const muteBtn = document.querySelector("#mute-btn")
const menuMusic = document.getElementById('bg-music');

const bgImg = new Image();
bgImg.src = "sprites/planodefundo.png"; 

const playerImg = new Image();
playerImg.src = "sprites/SpaceShip(192x192)_0003.png";
const enemyImg = new Image();
enemyImg.src = "sprites/Alien1(192x192).png";

const musica = new Audio('sons/musica.mp3');// musica de kim lightyear
musica.loop = true;
musica.volume = 0.25;

const somTiro = new Audio('sons/tiro.mp3');
somTiro.volume = 0.2;

const somDano = new Audio('sons/dano.mp3');
somDano.volume = 0.2;
const tocarDano = () => {
  const s = somDano.cloneNode();
  s.volume = somDano.volume;
  s.play();
};

const initialMouse = Object.freeze({ x: 0, y: 0 });

// Ajuste funcional do tamanho do canvas
const calcularCanvasSize = (largura, altura, proporcao) => {
  const ratio = largura / altura;
  return ratio > proporcao
    ? { width: altura * proporcao, height: altura }
    : { width: largura, height: largura / proporcao };
};


const computeMuteBtnCoords = (canvasElement, btnElement, margin = 16) => {
  // usa getBoundingClientRect para posição real na viewport
  const rect = canvasElement.getBoundingClientRect();
  const btnRect = btnElement.getBoundingClientRect();
  // left = canto direito do canvas - largura do botão - margem
  const left = Math.round(rect.left + rect.width - btnRect.width - margin);
  const top = Math.round(rect.top + margin);
  return Object.freeze({ left, top });
};

/**
 * Aplica objetos de posição ao botão (efeito colateral controlado).
 * Retorna o botão para composição se for necessário.
 */
const applyMuteBtnCoords = (btnElement, coords) => {
  btnElement.style.position = "fixed"; // garante posição fixa na viewport
  btnElement.style.left = coords.left + "px";
  btnElement.style.top = coords.top + "px";
  btnElement.style.zIndex = "9999";
  return btnElement;
};

/**
 * Atualiza posição do botão de mutar em relação ao canvas.
 * - Se o botão estiver com display:none, mostramos temporariamente (visibilidade:hidden)
 *   para medir seu tamanho, depois restauramos o estado.
 */
const updateMuteBtnPosition = () => {
  if (!muteBtn || !canvas) return;

  const computed = getComputedStyle(muteBtn);
  const wasDisplayNone = computed.display === "none";

  if (wasDisplayNone) {
    // Mostra temporariamente, sem que o usuário veja (visibilidade:hidden)
    muteBtn.style.visibility = "hidden";
    muteBtn.style.display = "block";
  }

  // calcula e aplica coordenadas de forma funcional
  const coords = computeMuteBtnCoords(canvas, muteBtn, 16);
  applyMuteBtnCoords(muteBtn, coords);

  if (wasDisplayNone) {
    // volta ao estado anterior
    muteBtn.style.display = "none";
    muteBtn.style.visibility = "";
  }
};

const ajustarCanvas = () => {
  const proporcao = 1216 / 1024;
  const screenWidth = window.innerWidth;
  const screenHeight = window.innerHeight;

  const { width, height } =
    screenWidth / screenHeight > proporcao
      ? { width: screenHeight * proporcao, height: screenHeight }
      : { width: screenWidth, height: screenWidth / proporcao };

  canvas.width = width;
  canvas.height = height;

  // Atualiza a posição do botão de mutar (efeito colateral isolado)
  updateMuteBtnPosition();
};

window.addEventListener("resize", ajustarCanvas);
ajustarCanvas();

// Função pura que define a posição e tamanho do botão Reiniciar
const gameOverButton = (canvas) => ({
  x: canvas.width / 2 - 120,
  y: canvas.height / 2 + 30,
  w: 240,
  h: 50
});
const gameOverReturnButton = (canvas) => ({
  x: canvas.width / 2 - 120,
  y: canvas.height / 2 + 110, // <-- Posição Y mais baixa que o botão de reiniciar
  w: 240,
  h: 50
})

const isMouseOverAnyGameOverButton = (mouseX, mouseY, canvas) => {
  const restartBtn = gameOverButton(canvas);
  const returnBtn = gameOverReturnButton(canvas);

  // Verifica se o mouse está sobre o botão de Reiniciar
  const overRestart = mouseX >= restartBtn.x && mouseX <= restartBtn.x + restartBtn.w &&
                      mouseY >= restartBtn.y && mouseY <= restartBtn.y + restartBtn.h;

  // Verifica se o mouse está sobre o botão de Retornar
  const overReturn = mouseX >= returnBtn.x && mouseX <= returnBtn.x + returnBtn.w &&
                     mouseY >= returnBtn.y && mouseY <= returnBtn.y + returnBtn.h;
  
  return overRestart || overReturn; // Retorna true se estiver sobre qualquer um dos dois
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
  isPaused: false,
  lastTime: 0,
  isMuted: false,
  player: initialPlayer(),
  bullets: [],
  enemies: [],
  enemyBullets: [],
  score: 0,
  hoverRestart: false,
  ultimoDano: false,      
  ultimoHitInimigo: false 
});

const initialRootState = Object.freeze({
  game: initialState(),
  mouse: initialMouse
});

// captura de teclas
const keys = {};
document.addEventListener("keydown", e => { keys[e.code] = true; });
document.addEventListener("keyup", e => { keys[e.code] = false; });
document.addEventListener("keydown", e => {
  if (e.code === 'Escape') {
    togglePause();
  }
});

// função para criar um inimigo em uma posição aleatória na borda do canvas
const spawnEnemy = canvas => {
  const side = Math.floor(Math.random() * 4);
  return {
    x: side === 0 ? Math.random() * canvas.width : (side === 1 ? canvas.width : (side === 2 ? Math.random() * canvas.width : 0)),
    y: side === 0 ? 0 : (side === 1 ? Math.random() * canvas.height : (side === 2 ? canvas.height : Math.random() * canvas.height)),
    w: 64,
    h: 64,
    speed: 60 + Math.random() * 60,
    alive: true
  };
};

//função para pausar the game .-.
const togglePause = () => {
  const currentGame = rootState.current.game;
  // Só permite pausar se o jogo estiver rodando
  if (!currentGame.running) return; 

  const newGame = Object.freeze({
    ...currentGame,
    isPaused: !currentGame.isPaused // Inverte o valor de isPaused
  });

  rootState.current = Object.freeze({
    ...rootState.current,
    game: newGame
  });
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
const enemyShoot = (enemies, player, enemyBullets) => {
  return enemies.reduce((bullets, enemy) => {
    const distancia = Math.hypot(player.x - enemy.x, player.y - enemy.y);

    if (enemy.alive && distancia < 300 && Math.random() < 0.001) {
      const ang = Math.atan2(player.y - enemy.y, player.x - enemy.x);
      const bullet = {
        x: enemy.x,
        y: enemy.y,
        dx: Math.cos(ang) * 250,
        dy: Math.sin(ang) * 250,
        w: 6,
        h: 6
      };
      // Som do tiro do inimigo
      tocarTiro();
      return bullets.concat([bullet]);
    }
    return bullets;
  }, enemyBullets);
};

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
      ? { ...player, lives: player.lives - hits, invulneravelAte: ts + 3000 } // três segundos de invulnerabilidade
      : player,
    enemyBullets: newBullets,
    foiAcertado: hits > 0
  };
};

//Função pura para atualizar posição do mouse
const updateMouse = (mouse, event, canvas) => {
  const rect = canvas.getBoundingClientRect();
  return Object.freeze({
    x: (event.clientX - rect.left) * (canvas.width / rect.width),
    y: (event.clientY - rect.top) * (canvas.height / rect.height)
  });
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
  tocarTiro();
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
const nextState = (state, keys, dt, canvas, ts, mouse) => {
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

  const hoverRestart = !running && isMouseOverAnyGameOverButton(mouse.x, mouse.y, canvas);
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
    inimigosAtiraram: enemyBullets.length > state.enemyBullets.length,
    hoverRestart
  };
};

//BOTÃO MUTE
muteBtn.addEventListener("click", () => {
  muteBtn.style.display = "block";
  const isMuted = !rootState.current.game.isMuted;

  const newGame = Object.freeze({ 
    ...rootState.current.game, 
    isMuted 
  });
  rootState.current = Object.freeze({
    ...rootState.current,
    game: newGame
  });

  musica.muted = isMuted;
  somTiro.muted = isMuted;
  somDano.muted = isMuted;

  muteBtn.textContent = isMuted ? "🔊 Desmutar" : "🔇 Mutar Som";
});

// função para renderizar o estado do jogo
const render = (state) => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  //  Função funcional para desenhar fundo 
  const drawBackground = (ctx, img, canvas) => {
    const imgRatio = img.width / img.height;
    const canvasRatio = canvas.width / canvas.height;

    const { drawWidth, drawHeight, offsetX, offsetY } =
      canvasRatio > imgRatio
        ? {
            drawWidth: canvas.width,
            drawHeight: canvas.width / imgRatio,
            offsetX: 0,
            offsetY: (canvas.height - canvas.width / imgRatio) / 2
          }
        : {
            drawHeight: canvas.height,
            drawWidth: canvas.height * imgRatio,
            offsetX: (canvas.width - canvas.height * imgRatio) / 2,
            offsetY: 0
          };

    ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
  };

  // Se quiser usar fundo, descomente:
   drawBackground(ctx, bgImg, canvas);

  const invulneravel = state.lastTime < state.player.invulneravelAte;
  const deveDesenhar = !invulneravel || Math.floor(state.lastTime / 100) % 2 === 0;

  if (deveDesenhar) {
    ctx.save();
    ctx.translate(state.player.x, state.player.y);
    ctx.rotate(degToRad(state.player.angle) + Math.PI / 2);
    ctx.drawImage(
      playerImg,
      -state.player.w / 2,
      -state.player.h / 2,
      state.player.w,
      state.player.h
    );
    ctx.restore();
  }

  //  Balas
  state.bullets.forEach(b => drawRect(b.x, b.y, b.w, b.h, "#58a6ff"));
  state.enemyBullets.forEach(b => drawRect(b.x, b.y, b.w, b.h, "#ff5470"));

  //  Inimigos
  state.enemies.forEach(e => {
    if (e.alive) ctx.drawImage(enemyImg, e.x, e.y, e.w, e.h);
  });

  //  HUD
  ctx.fillStyle = "#fff";
  ctx.font = "16px 'Press Start 2P'";
  ctx.fillText("Vidas: " + state.player.lives, 10, 20);
  ctx.fillText("Score: " + state.score, 10, 40);

  // << MENU DE PAUSE >>
if (state.isPaused) {
    ctx.filter = "blur(5px)";     // Fundo borrado
    ctx.drawImage(canvas, 0, 0);
    ctx.filter = "none"           // Tira o blur do menu

    // --- Tela de Pause ---
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = "48px 'Press Start 2P'";
    ctx.textAlign = "center";
    ctx.fillStyle = "#fff";
    ctx.fillText("PAUSADO", canvas.width / 2, canvas.height / 2 - 100);

    // --- Botão de Continuar ---
    const btnWidth = 320, btnHeight = 50;
    const continueBtnY = canvas.height / 2 - 25;
    ctx.fillStyle = "#232946";
    ctx.fillRect(canvas.width / 2 - btnWidth / 2, continueBtnY, btnWidth, btnHeight);
    ctx.font = "18px 'Press Start 2P'";
    ctx.fillStyle = "#fff";
    ctx.textBaseline = "middle";
    ctx.fillText("Continuar", canvas.width / 2, continueBtnY + (btnHeight / 2));

    // --- Botão de Reiniciar ---
    const restartBtnY = canvas.height / 2 + 50;
    ctx.fillStyle = "#232946";
    ctx.fillRect(canvas.width / 2 - btnWidth / 2, restartBtnY, btnWidth, btnHeight);
    ctx.font = "18px 'Press Start 2P'";
    ctx.fillStyle = "#fff";
    ctx.textBaseline = "middle";
    ctx.fillText("Reiniciar", canvas.width / 2, restartBtnY + (btnHeight / 2));

    // --- Botão de Retornar ao Menu ---
    const returnBtnY = canvas.height / 2 + 125;
    ctx.fillStyle = "#232946";
    ctx.fillRect(canvas.width / 2 - btnWidth / 2, returnBtnY, btnWidth, btnHeight);
    ctx.font = "18px 'Press Start 2P'";
    ctx.fillStyle = "#fff";
    ctx.textBaseline = "middle";
    ctx.fillText("Tela de Início", canvas.width / 2, returnBtnY + (btnHeight / 2));

    // Reseta alinhamentos para não afetar outros desenhos
    ctx.textAlign = "start";
    ctx.textBaseline = "alphabetic";
}

  //  Tela de Game Over + Botão
  if (!state.running) {
    // --- Tela de Fundo Escurecida ---
    ctx.fillStyle = "rgba(0,0,0,0.75)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // --- Texto "GAME OVER" com Estilo Retrô ---
    ctx.font = "48px 'Press Start 2P'";
    ctx.textAlign = "center";
    ctx.fillStyle = "#fff";
    ctx.fillText("GAME OVER", canvas.width / 2 + 3, canvas.height / 2 - 50 + 3);
    ctx.fillStyle = "#ff1818";
    ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2 - 50);

    // --- Subtexto de Instrução ---
    ctx.font = "14px 'Press Start 2P'";
    ctx.fillStyle = "#fff";
    ctx.fillText("Clique no botão para reiniciar", canvas.width / 2, canvas.height / 2);

    const restartBtn = gameOverButton(canvas); // <-- Pega as coordenadas da função
    const scale = state.hoverRestart ? 1.1 : 1.0;
    const centerX = restartBtn.x + restartBtn.w / 2;
    const centerY = restartBtn.y + restartBtn.h / 2;

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.scale(scale, scale);
    ctx.translate(-centerX, -centerY);

    const shadowOffset = 5;
    ctx.fillStyle = "#860101";
    ctx.fillRect(restartBtn.x, restartBtn.y, restartBtn.w, restartBtn.h);
    ctx.fillStyle = "#232946";
    ctx.fillRect(restartBtn.x, restartBtn.y - shadowOffset, restartBtn.w, restartBtn.h);

    ctx.font = "18px 'Press Start 2P'";
    ctx.fillStyle = "#fff";
    ctx.textBaseline = "middle";
    ctx.fillText("Reiniciar", centerX, restartBtn.y - shadowOffset + (restartBtn.h / 2));
    ctx.restore();

    const returnBtn = gameOverReturnButton(canvas);
    // Use a mesma variável `scale` para o botão de retornar
    const centerX_return = returnBtn.x + returnBtn.w / 2;
    const centerY_return = returnBtn.y + returnBtn.h / 2;

    ctx.save();
    ctx.translate(centerX_return, centerY_return);
    ctx.scale(scale, scale); // <-- Aplica a mesma escala aqui!
    ctx.translate(-centerX_return, -centerY_return);

    ctx.fillStyle = "#860101";
    ctx.fillRect(returnBtn.x, returnBtn.y, returnBtn.w, returnBtn.h);
    ctx.fillStyle = "#232946";
    ctx.fillRect(returnBtn.x, returnBtn.y - shadowOffset, returnBtn.w, returnBtn.h); // Use o shadowOffset

    ctx.font = "18px 'Press Start 2P'";
    ctx.fillStyle = "#fff";
    ctx.textBaseline = "middle";
    ctx.fillText("Retornar", centerX_return, returnBtn.y - shadowOffset + (returnBtn.h / 2)); // Use o shadowOffset
    ctx.restore();

    // Reseta os alinhamentos para não afetar outros desenhos
    ctx.textAlign = "start";
    ctx.textBaseline = "alphabetic";
  }
};

// função para adicionar listener de mouse
const addMouseListener = (canvas, onMove) => {
  canvas.addEventListener("mousemove", (event) => {
    onMove(event);
  });
};

function drawRect(x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

// --- Loop funcional ---
const loop = (rootState, ts) => {
  const { game, mouse } = rootState.current;
  let newGame; // Usamos 'let' para poder reatribuir o estado

  // CASO 1: O jogo está rodando e NÃO está pausado
  if (game.running && !game.isPaused) {
    const dt = Math.min(0.05, (ts - (game.lastTime || ts)) / 1000);
    const nextGame = nextState(game, keys, dt, canvas, ts, mouse);

    // Controle de som: só toca se mudar de estado
    if (nextGame.foiAcertado && !game.ultimoDano) tocarDano();
    if (nextGame.inimigoAcertado && !game.ultimoHitInimigo) tocarDano();

    // Atualiza o estado com base no resultado da lógica do jogo
    newGame = Object.freeze({
      ...nextGame,
      ultimoDano: nextGame.foiAcertado,
      ultimoHitInimigo: nextGame.inimigoAcertado
    });

  // CASO 2: O jogo está PAUSADO ou em GAME OVER
  } else {
    // A única coisa que fazemos é atualizar o tempo e o estado do mouse sobre os botões
    newGame = Object.freeze({
      ...game,
      lastTime: ts,
      hoverRestart: !game.running && isMouseOverAnyGameOverButton(mouse.x, mouse.y, canvas)
    });
  }

  // Atualiza o estado global com o novo estado do jogo
  rootState.current = Object.freeze({
    ...rootState.current,
    game: newGame
  });

  // Renderiza o estado atual (seja jogo, pause ou game over)
  render(rootState.current.game);
  // Pede o próximo frame para continuar o loop
  requestAnimationFrame((ts2) => loop(rootState, ts2));
};

// --- Clique no botão de reiniciar ---
const resetGame = () => {
  tocarMusica(); // Garante que a música comece
  const novoJogo = Object.freeze({ ...initialState(), running: true });
  rootState.current = Object.freeze({
    ...rootState.current,
    game: novoJogo
  });
};

// --- Clique no canvas ---
canvas.addEventListener("click", (e) => {
  const rect = canvas.getBoundingClientRect();
  const mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
  const mouseY = (e.clientY - rect.top) * (canvas.height / rect.height);

  const currentGame = rootState.current.game;

  if (currentGame.isPaused) {
    const btnWidth = 320, btnHeight = 50;
    const btnX = canvas.width / 2 - btnWidth / 2;
    const continueBtnY = canvas.height / 2 - 25;
    const restartBtnY = canvas.height / 2 + 50;
    const returnBtnY = canvas.height / 2 + 125;

    // Checa clique no botão "Continuar"
    if (mouseX >= btnX && mouseX <= btnX + btnWidth && mouseY >= continueBtnY && mouseY <= continueBtnY + btnHeight) {
      togglePause(); // Simplesmente despausa o jogo
    }
    // Checa clique no botão "Reiniciar"
    else if (mouseX >= btnX && mouseX <= btnX + btnWidth && mouseY >= restartBtnY && mouseY <= restartBtnY + btnHeight) {
      resetGame(); // Reinicia o jogo
    }
    // Checa clique no botão "Retornar ao Menu"
    else if (mouseX >= btnX && mouseX <= btnX + btnWidth && mouseY >= returnBtnY && mouseY <= returnBtnY + btnHeight) {
      window.location.href = "../index.html"; // Volta para a página inicial
    }
    return; // Impede que o código de game over execute
  }
 
  // Lógica para a tela de GAME OVER (só executa se não estiver pausado)
   if (!currentGame.running) {
    const restartBtn = gameOverButton(canvas); // <-- Pega as coordenadas da função
    const returnBtn = gameOverReturnButton(canvas); // <-- Pega as coordenadas da NOVA função

    // Verifica se clicou dentro do botão de reiniciar
    if (mouseX >= restartBtn.x && mouseX <= restartBtn.x + restartBtn.w && 
        mouseY >= restartBtn.y && mouseY <= restartBtn.y + restartBtn.h) {
      
      console.log("Botão de reiniciar do Game Over clicado!");
      resetGame(); // Reutiliza a função de reset
    }
    // Verifica se clicou dentro do botão de retornar
    else if (mouseX >= returnBtn.x && mouseX <= returnBtn.x + returnBtn.w && 
             mouseY >= returnBtn.y && mouseY <= returnBtn.y + returnBtn.h) {
      
      console.log("Botão de retornar do Game Over clicado!");
      window.location.href = "../index.html";
    }
  }
});


// --- Clique no botão Play do menu ---
playBtn.addEventListener("click", () => {
  menuMusic.pause();
  menuMusic.currentTime = 0;
   menu.style.display = "none";
  canvas.style.display = "block";
  muteBtn.style.display = 'block';
  ajustarCanvas();
  updateMuteBtnPosition();  // <-- garante que o botão vá para o canto superior direito do canvas
  tocarMusica();
  canvas.focus && canvas.focus();
  
const novoJogo = Object.freeze({
    ...initialState(),
    running: true
  });

  // Atualiza o rootState atual com o novo jogo
  rootState.current = Object.freeze({
    ...rootState.current,
    game: novoJogo
  });

  // Inicia o loop só agora
  requestAnimationFrame((ts) => loop(rootState, ts));
});

// Inicialização
const rootState = { current: Object.freeze({ 
  ...initialRootState, 
  game: { ...initialState(), running: false } 
}) };



// Inicializa listener de mouse
addMouseListener(canvas, (event) => {
  const newMouse = updateMouse(rootState.current.mouse, event, canvas);
  rootState.current = Object.freeze({
    ...rootState.current,
    mouse: newMouse
  });
});

// Renderiza apenas o menu
render(rootState.current.game);

//Retornar ao menu
// --- Botão Retornar das intruções ---
retornarBtn.addEventListener("click", () => {
  // Para o jogo
  window.location.href = "../index.html";
})
