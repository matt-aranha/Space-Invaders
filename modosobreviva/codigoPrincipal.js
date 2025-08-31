//SCRIPT DO MODO SOBREVIVENTEEE DO JOGO SPACE INVADERS, TOP DAS GALÁXIAS (LITERALMENTE) :D
//inports clássicos, N PD FALTAR ;)
const canvas = document.querySelector("#ultimo-Sobrevivente");
const ctx = canvas.getContext("2d");
const playBtn = document.querySelector("#play-btn");
const retornarBtn = document.querySelector("#retornar-btn")
const menu = document.querySelector("#menu");
const muteBtn = document.querySelector("#mute-btn")

const bgImg = new Image();
bgImg.src = "sprites/planodefundo.png"; 

const playerImg = new Image();
playerImg.src = "sprites/SpaceShip(192x192)_0003.png";
const enemyImg = new Image();
enemyImg.src = "sprites/Alien1(192x192).png";

const musica = new Audio('sons/musica.mp3');// musica de kim lightyear
musica.loop = true;
musica.volume = 0.27;

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

const isMouseOverRestart = (mouseX, mouseY, canvas) => {
  const { x, y, w, h } = gameOverButton(canvas);
  return mouseX >= x && mouseX <= x + w && mouseY >= y && mouseY <= y + h;
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

    if (event.type === 'CANVAS_CLICK') {
      const btnWidth = 240, btnHeight = 50;
      const btnX = canvas.width / 2 - btnWidth / 2;
      const btnY = canvas.height / 2 + 30;
      console.log("Clique detectado:", event.x, event.y);

    
      // só reinicia se estiver no Game Over
      if (!currentState.running) {
        if (
          event.x >= btnX && event.x <= btnX + btnWidth &&
          event.y >= btnY && event.y <= btnY + btnHeight
        ) {
          tocarMusica();
          return { ...initialState(), running: true, lastTime: 0 };
        }
        // --- Retornar ---
      const btX = canvas.width / 2 - btnWidth / 2;
      const btY = canvas.height / 2 + 150;

      if (
      event.x >= btX && event.x <= btX + btnWidth &&
      event.y >= btY && event.y <= btY + btnHeight
    ) {
        window.location.href = "../index.html";
    }
      }
    }

    return currentState;
  }, state);
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

    if (enemy.alive && distancia < 300 && Math.random() < 0.01) {
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
      ? { ...player, lives: player.lives - hits, invulneravelAte: ts + 2000 } // dois segundos de invulnerabilidade
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

  const hoverRestart = !running && isMouseOverRestart(mouse.x, mouse.y, canvas);
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

  muteBtn.textContent = isMuted ? "Desmutar" : "Mutar Som";
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
  ctx.font = "16px monospace";
  ctx.fillText("Vidas: " + state.player.lives, 10, 20);
  ctx.fillText("Score: " + state.score, 10, 40);

  //  Tela de Game Over + Botão
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
    ctx.fillStyle = "#1c8dddff"; // Cor do texto
    ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2 - 50);

    // --- Subtexto de Instrução ---
    ctx.font = "14px 'Press Start 2P'";
    ctx.fillStyle = "#fff";
    ctx.fillText("Clique no botão para reiniciar", canvas.width / 2, canvas.height / 2);

    // --- Botão de Reiniciar com Estilo Retrô ---
    // const btnWidth = 240, btnHeight = 50;
    // --- Botão de Reiniciar ---
   const { x: btnX, y: btnY, w: btnWidth, h: btnHeight } = gameOverButton(canvas);
   const scale = state.hoverRestart ? 1.1 : 1.0; // aumenta 10% se hover
   const centerX = btnX + btnWidth / 2;
   const centerY = btnY + btnHeight / 2;

   ctx.save();
   ctx.translate(centerX, centerY);
   ctx.scale(scale, scale);
   ctx.translate(-centerX, -centerY);

   const shadowOffset = 5;
   ctx.fillStyle = "#155dbbff";
   ctx.fillRect(btnX, btnY, btnWidth, btnHeight);

   ctx.fillStyle = "#232946";
   ctx.fillRect(btnX, btnY - shadowOffset, btnWidth, btnHeight);

   ctx.font = "18px 'Press Start 2P'";
   ctx.fillStyle = "#fff";
   ctx.textAlign = "center";
   ctx.textBaseline = "middle";
   ctx.fillText("Reiniciar", canvas.width / 2, btnY - shadowOffset + (btnHeight / 2));

   ctx.restore();

    ctx.textAlign = "start";
    ctx.textBaseline = "alphabetic";

    // --- Botão de Retornarar com Estilo Retrô ---
    const btWidth = 240, btHeight = 50;
    const btX = canvas.width / 2 - btWidth / 2;
    const btY = canvas.height / 2 + 150;
    const shadowOfset = 5; // Tamanho da "sombra 3D"

    // Sombra do botão (desenhada primeiro, por baixo)
    ctx.fillStyle = "#155dbbff"; // Rosa escuro para a sombra
    ctx.fillRect(btX, btY, btWidth, btHeight);

    // Corpo principal do botão (desenhado por cima, um pouco deslocado)
    ctx.fillStyle = "#232946";
    ctx.fillRect(btX, btY - shadowOfset, btWidth, btHeight);

    // --- Subtexto de Instrução ---
    ctx.font = "14px 'Press Start 2P'";
    ctx.fillStyle = "#fff";
    ctx.fillText("Clique no botão para retornar ao menu", canvas.width / 2 - 255, canvas.height / 1.5);

    // Texto do botão
    ctx.font = "18px 'Press Start 2P'";
    ctx.fillStyle = "#fff"; // Texto branco para contraste
    ctx.textBaseline = "middle"; // Alinha o texto verticalmente pelo meio
    ctx.fillText("Retornar", canvas.width / 2 - btWidth / 3.5, btY - shadowOfset + (btHeight / 2));

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
  const dt = Math.min(0.05, (ts - (game.lastTime || ts)) / 1000);

  const newGame = game.running
    ? nextState(game, keys, dt, canvas, ts, mouse)
    : {
        ...game,
        lastTime: ts,
        hoverRestart: isMouseOverRestart(mouse.x, mouse.y, canvas)
      };

  //  Controle de som: só toca se mudar de estado
  if (newGame.foiAcertado && !game.ultimoDano) tocarDano();
  if (newGame.inimigoAcertado && !game.ultimoHitInimigo) tocarDano(); // som do dano no inimigo

  const updatedGame = Object.freeze({
    ...newGame,
    ultimoDano: newGame.foiAcertado,
    ultimoHitInimigo: newGame.inimigoAcertado
  });

  rootState.current = Object.freeze({
    ...rootState.current,
    game: updatedGame
  });

  render(rootState.current.game);
  requestAnimationFrame((ts2) => loop(rootState, ts2));
};

// --- Clique no botão de reiniciar ---
canvas.addEventListener("click", (e) => {
  const rect = canvas.getBoundingClientRect();

  // Coordenadas corretas do mouse no canvas
  const mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
  const mouseY = (e.clientY - rect.top) * (canvas.height / rect.height);

  const { x, y, w, h } = gameOverButton(canvas);

  // Debug opcional
  console.log(`MouseX: ${mouseX}, MouseY: ${mouseY}, BtnX: ${x}, BtnY: ${y}`);

  // Verifica se clicou dentro do botão
  if (mouseX >= x && mouseX <= x + w && mouseY >= y && mouseY <= y + h) {
    console.log("Botão de reiniciar clicado!");
    menu.style.display = "none";
    canvas.style.display = "block";
    muteBtn.style.display = "block";
    ajustarCanvas();
    updateMuteBtnPosition();  // atualiza posição logo após ajustar canvas
    tocarMusica();
    canvas.focus && canvas.focus();

    const novoJogo = Object.freeze({ ...initialState(), running: true });
    rootState.current = Object.freeze({
      ...rootState.current,
      game: novoJogo
    });

    // usa o rootState correto — NÃO usar 'novoEstado' (variável inexistente)
    render(rootState.current.game);
    requestAnimationFrame((ts) => loop(rootState, ts));
  }
});


// --- Clique no botão Play do menu (agora só enfileira o evento) ---
playBtn.addEventListener("click", () => {
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

// --- Inicialização ---
// O estado inicial do jogo, antes de qualquer interação
const estadoInicial = { ...initialState(), running: false };
// Mostra o menu e esconde o jogo
menu.style.display = "block";
canvas.style.display = "none";
// Renderiza o estado inicial (que não mostrará nada no canvas, o que está correto)
render(estadoInicial);
// Inicia o loop. Ele ficará esperando por eventos.
requestAnimationFrame(ts => loop(estadoInicial, ts));

//Retornar ao menu
// --- Botão Retornar ---
retornarBtn.addEventListener("click", () => {
  // Para o jogo
  window.location.href = "../index.html";
})

// Renderiza apenas o menu
render(rootState.current.game);