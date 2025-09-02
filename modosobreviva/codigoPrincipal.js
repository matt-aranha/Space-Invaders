const canvas = document.querySelector("#ultimo-Sobrevivente");
const ctx = canvas.getContext("2d");
const playBtn = document.querySelector("#play-btn");
const retornarBtn = document.querySelector("#retornar-btn");
const menu = document.querySelector("#menu");
const muteBtn = document.querySelector("#mute-btn");
const menuMusic = document.getElementById("bg-music");

// imagens
const bgImg = new Image();
bgImg.src = "sprites/planodefundo.png";

const playerImg = new Image();
playerImg.src = "sprites/SpaceShip(192x192)_0003.png";

const enemyImg = new Image();
enemyImg.src = "sprites/Alien1(192x192).png";

// áudios
// === Áudio (funcional) ===
const musica = (() => {
  const audio = new Audio("sons/musica.mp3");
  audio.loop = true;
  audio.volume = 0.2;
  return audio;
})();

const somTiro = (() => {
  const audio = new Audio("sons/tiro.mp3");
  audio.volume = 0.2;
  return audio;
})();

const somDano = (() => {
  const audio = new Audio("sons/dano.mp3");
  audio.volume = 0.2;
  return audio;
})();

// Função auxiliar funcional para tocar qualquer som
const tocarSom = (som) => {
  if (rootState.current.game.isMuted) {
    return; // Não faz nada se estiver mutado (essa sacada aqui é genial pq mesmo mutado os outros sons continuariam, pq estão sendo clonados cada novo frame)
  }//(, carregando consigo o state de muted = false incial, agr isso n acontece mais)
  const clone = som.cloneNode();
  clone.volume = som.volume;
  clone.play().catch(() => {});
};

// Tocar música de fundo
const tocarMusica = () => {
  musica.currentTime = 0;
  musica.play().catch(() => {});
};

// Parar música
const pararMusica = () => {
  musica.pause();
  musica.currentTime = 0;
};

// Sons específicos
const tocarTiro = () => tocarSom(somTiro);
const tocarDanoSom = () => tocarSom(somDano);


const updateMuteBtnPosition = () => {
  if (!muteBtn || !canvas) return;
  const computed = getComputedStyle(muteBtn);
  const wasDisplayNone = computed.display === "none";

  if (wasDisplayNone) {
    muteBtn.style.visibility = "hidden";
    muteBtn.style.display = "block";
  }

  const coords = computeMuteBtnCoords(canvas, muteBtn, 16);
  applyMuteBtnCoords(muteBtn, coords);

  if (wasDisplayNone) {
    muteBtn.style.display = "none";
    muteBtn.style.visibility = "";
  }
};

// helpers de imutabilidade
const freezeObj = (o) => Object.freeze(o);
const freezeArray = (arr) => Object.freeze(arr.map(item => Object.freeze(item)));

// inputs iniciais imutáveis
const initialMouse = freezeObj({ x: 0, y: 0 });
const initialKeys = freezeObj({});

// sizing do canvas
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

  // atualiza posição do botão de mute se existir
  if (typeof updateMuteBtnPosition === "function") updateMuteBtnPosition();
};


const debugUI = (() => {
  const q = (s) => document.querySelector(s);
  const menuEl = q("#menu");
  const playEl = q("#play-btn");
  const retEl = q("#retornar-btn");
  console.log("[DEBUG UI] playBtn exists:", !!playEl, "retBtn exists:", !!retEl, "menu exists:", !!menuEl);
  if (menuEl) {
    const style = getComputedStyle(menuEl);
    console.log("[DEBUG UI] menu display:", style.display, "visibility:", style.visibility, "pointer-events:", style.pointerEvents);
    try {
      const rect = menuEl.getBoundingClientRect();
      const elAtPoint = document.elementFromPoint(rect.left + 10, rect.top + 10);
      console.log("[DEBUG UI] elementAtMenuPoint:", elAtPoint && (elAtPoint.id || elAtPoint.className || elAtPoint.tagName));
    } catch (err) {
      console.log("[DEBUG UI] elementFromPoint error:", err);
    }
  }
  return true;
})();

// util: posição do botão de mute
const computeMuteBtnCoords = (canvasElement, btnElement, margin = 16) => {
  const rect = canvasElement.getBoundingClientRect();
  const btnRect = btnElement.getBoundingClientRect();
  const left = Math.round(rect.left + rect.width - btnRect.width - margin);
  const top = Math.round(rect.top + margin);
  return freezeObj({ left, top });
};

const applyMuteBtnCoords = (btnElement, coords) => {
  btnElement.style.position = "fixed";
  btnElement.style.left = coords.left + "px";
  btnElement.style.top = coords.top + "px";
  btnElement.style.zIndex = "9999";
  return btnElement;
};



// botões Game Over
const gameOverButton = (canvas) => ({ x: canvas.width / 2 - 120, y: canvas.height / 2 + 30, w: 240, h: 50 });
const gameOverReturnButton = (canvas) => ({ x: canvas.width / 2 - 120, y: canvas.height / 2 + 110, w: 240, h: 50 });
const isMouseOverAnyGameOverButton = (mouseX, mouseY, canvas) => {
  const r = gameOverButton(canvas);
  const t = gameOverReturnButton(canvas);
  const overR = mouseX >= r.x && mouseX <= r.x + r.w && mouseY >= r.y && mouseY <= r.y + r.h;
  const overT = mouseX >= t.x && mouseX <= t.x + t.w && mouseY >= t.y && mouseY <= t.y + t.h;
  return overR || overT;
};

// utilitarios
const degToRad = (deg) => (deg * Math.PI) / 180;

// cria inimigo imutável
const createEnemy = (x, y, w = 64, h = 64, type = 1) => freezeObj({ x, y, w, h, type, alive: true });

const spawnEnemyAtBorder = (canvas, w = 64, h = 64, type = 1) => {
  const side = Math.floor(Math.random() * 4); // 0=topo, 1=baixo, 2=esq, 3=dir
  const xInside = Math.random() * (canvas.width - w);
  const yInside = Math.random() * (canvas.height - h);

  const pos =
    side === 0 ? { x: xInside, y: -h } :
    side === 1 ? { x: xInside, y: canvas.height } :
    side === 2 ? { x: -w,      y: yInside } :
                 { x: canvas.width, y: yInside };

  return createEnemy(pos.x, pos.y, w, h, type);
};

// Novo: wave nas bordas (puro)
const spawnEnemiesAtBorders = (canvas, count = 12) =>
  freezeArray(Array.from({ length: count }, () => spawnEnemyAtBorder(canvas, 64, 64, 1)));

// bullets helpers (imutáveis)
const createBullet = (x, y, dx, dy, w = 6, h = 6) => freezeObj({ x, y, dx, dy, w, h });
const pushBullet = (bullets, bullet) => freezeArray(bullets.concat([freezeObj(bullet)]));

// estado inicial do jogador e do jogo
const initialPlayer = (canvas) =>
  freezeObj({
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

const initialGame = (canvas) =>
  freezeObj({
    player: initialPlayer(canvas),
    enemies: freezeArray([]),
    bullets: freezeArray([]),
    enemyBullets: freezeArray([]),
    score: 0,
    running: false,
    isPaused: false, // NOVO: Adicionado estado de pause
    lastTime: 0,
    hoverRestart: false,
    inimigoAcertado: false,
    foiAcertado: false,
    isMuted: false,
    ultimoDano: false,
    ultimoHitInimigo: false
  });

// rootState snapshot (a referência em si é const, mas a propriedade .current será trocada por um novo objeto congelado)
const rootState = {
  current: Object.freeze({ game: initialGame(canvas), mouse: initialMouse })
};

// teclado: célula imutável por cópia
const updateKeys = (keys, code, pressed) => freezeObj({ ...keys, [code]: pressed });
const keysCell = Object.seal({ current: initialKeys });
document.addEventListener("keydown", (e) => {
  keysCell.current = updateKeys(keysCell.current, e.code, true);
});
document.addEventListener("keyup", (e) => {
  keysCell.current = updateKeys(keysCell.current, e.code, false);
});
const setKeys = (game, keys) => freezeObj({ ...game, keys: freezeObj(keys) });

// NOVO: Listener para a tecla 'Escape' para pausar o jogo
document.addEventListener("keydown", e => {
    if (e.code === 'Escape' && rootState.current.game.running) {
        const currentGame = rootState.current.game;
        const newGameState = freezeObj({ ...currentGame, isPaused: !currentGame.isPaused });
        rootState.current = Object.freeze({ ...rootState.current, game: newGameState });
    }
});


// update helpers
const updatePlayer = (player, keys, dt, canvas) => {
  const angle = player.angle + (keys["KeyA"] ? -360 * dt : 0) + (keys["KeyD"] ? 360 * dt : 0);
  const move = keys["KeyW"] ? player.maxSpeed : keys["KeyS"] ? -player.maxSpeed : 0;
  const rad = degToRad(angle);
  const x = Math.max(0, Math.min(canvas.width, player.x + Math.cos(rad) * move * dt));
  const y = Math.max(0, Math.min(canvas.height, player.y + Math.sin(rad) * move * dt));
  const cooldown = Math.max(0, (player.cooldown || 0) - dt);
  return freezeObj({ ...player, x, y, angle, speed: move, cooldown });
};

const updateBullets = (bullets, dt, canvas) =>
  freezeArray(
    bullets
      .map((b) => ({ ...b, x: b.x + b.dx * dt, y: b.y + b.dy * dt }))
      .filter((b) => b.x > 0 && b.x < canvas.width && b.y > 0 && b.y < canvas.height)
  );

const updateEnemies = (enemies, player, dt) =>
  freezeArray(
    enemies.map((e) => {
      if (!e.alive) return { ...e };
      const dx = player.x - e.x;
      const dy = player.y - e.y;
      const dist = Math.hypot(dx, dy) || 1;
      const vx = (dx / dist) * (e.speed || 60) * dt;
      const vy = (dy / dist) * (e.speed || 60) * dt;
      return freezeObj({ ...e, x: e.x + vx, y: e.y + vy });
    })
  );

// tiro inimigo orientado (imutável)
const aimedShot = (enemy, player) => {
  const ang = Math.atan2(player.y - enemy.y, player.x - enemy.x);
  return createBullet(enemy.x, enemy.y, Math.cos(ang) * 250, Math.sin(ang) * 250, 6, 6);
};

// enemyShoot: retorna novo array de enemyBullets (imutável)
const enemyShoot = (enemies, player, enemyBullets) =>
  freezeArray(
    enemies.reduce((acc, enemy) => {
      const distancia = Math.hypot(player.x - enemy.x, player.y - enemy.y);
      if (enemy.alive && distancia < 300 && Math.random() < 0.008) {
        // toca som do tiro do inimigo
        tocarTiro();
        return acc.concat([aimedShot(enemy, player)]);
      }
      return acc;
    }, enemyBullets)
  );

// colisões: processBullets retorna { bullets, enemies, score, inimigoAcertado }
const processBullets = (bullets, enemies, score) => {
  const processBullet = (bullet, enemiesArr, idx = 0) => {
    if (idx >= enemiesArr.length) return { hit: false, updatedEnemies: enemiesArr, scoreDelta: 0 };
    const e = enemiesArr[idx];
    if (
      e.alive &&
      bullet.x < e.x + e.w &&
      bullet.x + bullet.w > e.x &&
      bullet.y < e.y + e.h &&
      bullet.y + bullet.h > e.y
    ) {
      const updatedEnemies = enemiesArr.map((en, i) => (i === idx ? freezeObj({ ...en, alive: false }) : en));
      return { hit: true, updatedEnemies, scoreDelta: 10 };
    }
    return processBullet(bullet, enemiesArr, idx + 1);
  };

  const init = { bullets: [], enemies: enemies.map((e) => ({ ...e })), score, inimigoAcertado: false };
  const reduced = bullets.reduce((acc, b) => {
    const { hit, updatedEnemies, scoreDelta } = processBullet(b, acc.enemies);
    if (hit) {
      return { bullets: acc.bullets, enemies: updatedEnemies, score: acc.score + scoreDelta, inimigoAcertado: true };
    } else {
      return { bullets: acc.bullets.concat([b]), enemies: acc.enemies, score: acc.score, inimigoAcertado: acc.inimigoAcertado };
    }
  }, init);

  return {
    bullets: freezeArray(reduced.bullets),
    enemies: freezeArray(reduced.enemies),
    score: reduced.score,
    inimigoAcertado: reduced.inimigoAcertado
  };
};

// processPlayerHit serve para detectar colisões do player com balas inimigas
const processPlayerHit = (player, enemyBullets, ts) => {
  if (ts < (player.invulneravelAte || 0)) {
    return { player, enemyBullets, foiAcertado: false };
  }

  const hitboxX = player.x - player.w / 2;
  const hitboxY = player.y - player.h / 2;
  const hitboxW = player.w;
  const hitboxH = player.h;

  const hits = enemyBullets.filter(
    (b) => b.x < hitboxX + hitboxW && b.x + b.w > hitboxX && b.y < hitboxY + hitboxH && b.y + b.h > hitboxY
  ).length;

  const newBullets = enemyBullets.filter(
    (b) =>
      !(
        b.x < hitboxX + hitboxW &&
        b.x + b.w > hitboxX &&
        b.y < hitboxY + hitboxH &&
        b.y + b.h > hitboxY
      )
  );

  return {
    player: hits > 0 ? freezeObj({ ...player, lives: player.lives - hits, invulneravelAte: ts + 3000 }) : player,
    enemyBullets: freezeArray(newBullets),
    foiAcertado: hits > 0
  };
};

// tiro do jogador (imutável)
const tiro = (state) => {
  if ((state.player.cooldown || 0) > 0) return { state, atirou: false };
  const rad = degToRad(state.player.angle);
  const bullet = createBullet(state.player.x + Math.cos(rad) * 30, state.player.y + Math.sin(rad) * 30, Math.cos(rad) * 400, Math.sin(rad) * 400, 6, 6);
  // tocar som já aqui
  tocarTiro();
  const newState = freezeObj({
    ...state,
    player: freezeObj({ ...state.player, cooldown: 0.19 }),
    bullets: pushBullet(state.bullets, bullet)
  });
  return { state: newState, atirou: true };
};

window.addEventListener("resize", ajustarCanvas);
ajustarCanvas();


// nextState (puro)
const nextState = (state, keys, dt, canvas, ts, mouse) => {
  // spawn se vazio
  const precisaSpawnInicial = state.enemies.length === 0;
  const todosMortos = state.enemies.length > 0 && state.enemies.every((e) => !e.alive);
  const novosInimigos = (precisaSpawnInicial || todosMortos) ? spawnEnemiesAtBorders(canvas, 12) : [];

  const enemies = freezeArray(state.enemies.filter((e) => e.alive).concat(novosInimigos));
  
  const playerAtualizado = updatePlayer(state.player, keys || {}, dt, canvas);

  const podeAtirar = (keys || {})["Space"] && (playerAtualizado.cooldown === 0);
  const stateAfterTiro = podeAtirar ? tiro(freezeObj({ ...state, player: playerAtualizado, bullets: state.bullets })).state : freezeObj({ ...state, player: playerAtualizado, bullets: state.bullets });
  const enemiesMoved = updateEnemies(enemies, stateAfterTiro.player, dt);
  const bullets = updateBullets(stateAfterTiro.bullets, dt, canvas);
  const enemyBullets = updateBullets(stateAfterTiro.enemyBullets || [], dt, canvas);
  const enemyBulletsShot = enemyShoot(enemiesMoved, stateAfterTiro.player, enemyBullets);
  
  const bulletResult = processBullets(bullets, enemiesMoved, stateAfterTiro.score || 0);

  const playerHitResult = processPlayerHit(stateAfterTiro.player, enemyBulletsShot, ts);

  const running = (playerHitResult.player.lives || 0) > 0;

  const hoverRestart = !running && isMouseOverAnyGameOverButton((mouse && mouse.x) || -1, (mouse && mouse.y) || -1, canvas);

  const newState = freezeObj({
    ...state,
    player: playerHitResult.player,
    bullets: bulletResult.bullets,
    enemies: bulletResult.enemies,
    enemyBullets: playerHitResult.enemyBullets,
    score: bulletResult.score,
    running,
    lastTime: ts,
    foiAcertado: playerHitResult.foiAcertado,
    inimigoAcertado: bulletResult.inimigoAcertado,
    inimigosAtiraram: (enemyBulletsShot.length > (state.enemyBullets ? state.enemyBullets.length : 0)),
    hoverRestart,
    // controle de som por transição
    ultimoDano: playerHitResult.foiAcertado,
    ultimoHitInimigo: bulletResult.inimigoAcertado
  });

  return newState;
};

// mute button handler (imutável)
if (muteBtn) {
  muteBtn.addEventListener("click", () => {
    const isMuted = !rootState.current.game.isMuted;
    const newGame = freezeObj({ ...rootState.current.game, isMuted });
    rootState.current = Object.freeze({ ...rootState.current, game: newGame });
    musica.muted = isMuted;
    somTiro.muted = isMuted;
    somDano.muted = isMuted;
    muteBtn.textContent = isMuted ? "🔊 Desmutar" : "🔇 Mutar Som";
  });
}

// desenhar glow rect util
const drawGlowingRect = (x, y, w, h, fill, glow, blur = 18) => {
  ctx.save();
  ctx.shadowBlur = blur;
  ctx.shadowColor = glow;
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
};

// render puro a partir de state
const render = (state) => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // desenha background se carregado
  if (bgImg.complete && bgImg.naturalWidth) {
    const imgRatio = bgImg.width / bgImg.height;
    const canvasRatio = canvas.width / canvas.height;
    const opts =
      canvasRatio > imgRatio
        ? { drawWidth: canvas.width, drawHeight: canvas.width / imgRatio, offsetX: 0, offsetY: (canvas.height - canvas.width / imgRatio) / 2 }
        : { drawHeight: canvas.height, drawWidth: canvas.height * imgRatio, offsetX: (canvas.width - canvas.height * imgRatio) / 2, offsetY: 0 };
    ctx.drawImage(bgImg, opts.offsetX, opts.offsetY, opts.drawWidth, opts.drawHeight);
  } else {
    // fallback: fundo escuro
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  const invulneravel = state.lastTime < (state.player.invulneravelAte || 0);
  const deveDesenhar = !invulneravel || Math.floor(state.lastTime / 100) % 2 === 0;

  // desenha player se sprite carregou
  if (deveDesenhar) {
    ctx.save();
    ctx.translate(state.player.x, state.player.y);
    const angRad = Number.isFinite(state.player.angle) ? degToRad(state.player.angle) + Math.PI / 2 : Math.PI / 2;
    ctx.rotate(angRad);
    if (playerImg.complete && playerImg.naturalWidth) {
      ctx.drawImage(playerImg, -state.player.w / 2, -state.player.h / 2, state.player.w, state.player.h);
    } else {
      // fallback de forma
      ctx.fillStyle = "#fff";
      ctx.fillRect(-state.player.w / 2, -state.player.h / 2, state.player.w, state.player.h);
    }
    ctx.restore();
  }

  // desenhar balas rotacionadas com base em dx/dy
  const drawRotatedBullet = (b, fill, glow, blur = 15) => {
    // se não tiver dx/dy, cai para dy negativo (legacy)
    const dx = b.dx !== undefined ? b.dx : 0;
    const dy = b.dy !== undefined ? b.dy : (b.dy || -420);
    const angle = Math.atan2(dy, dx) + Math.PI / 2; // compensação para sprite
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(angle);
    ctx.shadowBlur = blur;
    ctx.shadowColor = glow;
    ctx.fillStyle = fill;
    ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h * 2);
    ctx.restore();
  };

  (state.bullets || []).forEach((b) => drawRotatedBullet(b, "#13f71eff", "#2aeef5ff", 15));
  (state.enemyBullets || []).forEach((b) => drawRotatedBullet(b, "#8528ffff", "#ff54d4ff", 15));

  // inimigos
  (state.enemies || []).forEach((e) => {
    if (e.alive) {
      if (enemyImg.complete && enemyImg.naturalWidth) ctx.drawImage(enemyImg, e.x, e.y, e.w, e.h);
      else {
        ctx.fillStyle = "#f00";
        ctx.fillRect(e.x, e.y, e.w, e.h);
      }
    }
  });

  // HUD
  ctx.fillStyle = "#fff";
  ctx.font = "16px 'Press Start 2P'";
  ctx.fillText("Vidas: " + (state.player.lives || 0), 10, 20);
  ctx.fillText("Score: " + (state.score || 0), 10, 40);

  // NOVO: Menu de Pause
  if (state.isPaused) {
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
    ctx.font = "18px 'Press Start 2P'";
    ctx.fillStyle = "#fff";
    ctx.textBaseline = "middle";
    ctx.fillText("Reiniciar", canvas.width / 2, restartBtnY + (btnHeight / 2));

    const returnBtnY = canvas.height / 2 + 125;
    ctx.fillStyle = "#232946";
    ctx.fillRect(canvas.width / 2 - btnWidth / 2, returnBtnY, btnWidth, btnHeight);
    ctx.font = "18px 'Press Start 2P'";
    ctx.fillStyle = "#fff";
    ctx.textBaseline = "middle";
    ctx.fillText("Tela de Início", canvas.width / 2, returnBtnY + (btnHeight / 2));
    
    ctx.textAlign = "start";
    ctx.textBaseline = "alphabetic";
  }

  // Game Over
  if (!state.running) {
    ctx.fillStyle = "rgba(0,0,0,0.75)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = "48px 'Press Start 2P'";
    ctx.textAlign = "center";
    ctx.fillStyle = "#fff";
    ctx.fillText("GAME OVER", canvas.width / 2 + 3, canvas.height / 2 - 50 + 3);
    ctx.fillStyle = "#ff1818";
    ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2 - 50);

    const restartBtn = gameOverButton(canvas);
    const scale = state.hoverRestart ? 1.1 : 1.0;
    const centerX = restartBtn.x + restartBtn.w / 2;
    const centerY = restartBtn.y + restartBtn.h / 2;

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.scale(scale, scale);
    ctx.translate(-centerX, -centerY);
    ctx.fillStyle = "#860101";
    ctx.fillRect(restartBtn.x, restartBtn.y, restartBtn.w, restartBtn.h);
    ctx.fillStyle = "#232946";
    ctx.fillRect(restartBtn.x, restartBtn.y - 5, restartBtn.w, restartBtn.h);
    ctx.font = "18px 'Press Start 2P'";
    ctx.fillStyle = "#fff";
    ctx.textBaseline = "middle";
    ctx.fillText("Reiniciar", centerX, restartBtn.y - 5 + restartBtn.h / 2);
    ctx.restore();

    const returnBtn = gameOverReturnButton(canvas);
    const centerX2 = returnBtn.x + returnBtn.w / 2;
    ctx.save();
    ctx.translate(centerX2, returnBtn.y + returnBtn.h / 2);
    ctx.scale(scale, scale);
    ctx.translate(-centerX2, -(returnBtn.y + returnBtn.h / 2));
    ctx.fillStyle = "#860101";
    ctx.fillRect(returnBtn.x, returnBtn.y, returnBtn.w, returnBtn.h);
    ctx.fillStyle = "#232946";
    ctx.fillRect(returnBtn.x, returnBtn.y - 5, returnBtn.w, returnBtn.h);
    ctx.font = "18px 'Press Start 2P'";
    ctx.fillStyle = "#fff";
    ctx.fillText("Retornar", centerX2, returnBtn.y - 10 + returnBtn.h / 2+15);
    ctx.restore();
    ctx.textAlign = "start";
  }
};

// mouse listener (imutável por cópias)
const addMouseListener = (canvas, onMove) => {
  canvas.addEventListener("mousemove", (event) => {
    onMove(event);
  });
};

// flush actions vazio (assinatura funcional)
const flushActions = () => freezeArray([]);

// step (loop) funcional que recebe um snapshot e retorna a próxima frame
const step = (state, lastTs, keysCellRef, canvasRef) => (ts) => {
  const dt = lastTs ? Math.min(0.05, (ts - lastTs) / 1000) : 0;

  // CORREÇÃO: Sincroniza o estado de pause com o estado global antes de qualquer outra ação.
  const syncedState = freezeObj({ ...state, isPaused: rootState.current.game.isPaused });

  // Se o jogo estiver pausado, apenas renderize e continue o loop com o estado atualizado.
  if (syncedState.isPaused) {
    render(syncedState);
    requestAnimationFrame(step(syncedState, ts, keysCellRef, canvasRef));
    return;
  }

  // Se não estiver pausado, executa a lógica normal do jogo.
  const reduced = flushActions().reduce((s, f) => f(s), syncedState);
  const stateWithKeys = setKeys(reduced, keysCellRef.current);
  const next = nextState(
    stateWithKeys,
    keysCellRef.current,
    dt,
    canvasRef,
    ts,
    (rootState.current && rootState.current.mouse) ? rootState.current.mouse : initialMouse
  );
  
  // Se o jogo estava rodando e no próximo estado não está mais (jogador morreu), pare a música.
  if (syncedState.running && !next.running) {
    pararMusica();
  }

  // som de dano/inimigo apenas quando ocorrer transição
  if (next.foiAcertado && !syncedState.ultimoDano) tocarDanoSom();
  if (next.inimigoAcertado && !syncedState.ultimoHitInimigo) tocarDanoSom();

  render(next);

  if (next.running) {
    requestAnimationFrame(step(next, ts, keysCellRef, canvasRef));
  } else {
    // atualiza snapshot final
    rootState.current = Object.freeze({ ...rootState.current, game: next });
  }
};

// resetGame e startGame (imutáveis, criam novos snapshots)
const resetGame = () => {
  tocarMusica();
  const novoJogo = freezeObj({ ...initialGame(canvas), running: true, isPaused: false });
  rootState.current = Object.freeze({ ...rootState.current, game: novoJogo });
  requestAnimationFrame(step(novoJogo, 0, keysCell, canvas));
};

const startGame = () => {
  const fresh = freezeObj({ ...initialGame(canvas), running: true });
  const withKeys = setKeys(fresh, keysCell.current);
  rootState.current = Object.freeze({ ...rootState.current, game: withKeys });
  tocarMusica();
  if (muteBtn) muteBtn.style.display = "block";
  updateMuteBtnPosition();
  requestAnimationFrame(step(withKeys, 0, keysCell, canvas));
};

// clique canvas (pausa / gameover / botões)
canvas.addEventListener("click", (e) => {
  const rect = canvas.getBoundingClientRect();
  const mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
  const mouseY = (e.clientY - rect.top) * (canvas.height / rect.height);

  const currentGame = rootState.current.game;
  
  // NOVO: Lógica de clique para o menu de PAUSE
  if (currentGame.isPaused) {
      const btnWidth = 320, btnHeight = 50;
      const btnX = canvas.width / 2 - btnWidth / 2;
      const continueBtnY = canvas.height / 2 - 25;
      const restartBtnY = canvas.height / 2 + 50;
      const returnBtnY = canvas.height / 2 + 125;

      if (mouseX >= btnX && mouseX <= btnX + btnWidth && mouseY >= continueBtnY && mouseY <= continueBtnY + btnHeight) {
          const ng = freezeObj({ ...currentGame, isPaused: false });
          rootState.current = Object.freeze({ ...rootState.current, game: ng });
      } else if (mouseX >= btnX && mouseX <= btnX + btnWidth && mouseY >= restartBtnY && mouseY <= restartBtnY + btnHeight) {
          resetGame();
      } else if (mouseX >= btnX && mouseX <= btnX + btnWidth && mouseY >= returnBtnY && mouseY <= returnBtnY + btnHeight) {
          window.location.href = "../index.html";
      }
      return; // Impede que a lógica de game over execute ao mesmo tempo
  }

  if (!currentGame.running) {
    const restartBtn = gameOverButton(canvas);
    const returnBtn = gameOverReturnButton(canvas);
    if (mouseX >= restartBtn.x && mouseX <= restartBtn.x + restartBtn.w && mouseY >= restartBtn.y && mouseY <= restartBtn.y + restartBtn.h) {
      resetGame();
    } else if (mouseX >= returnBtn.x && mouseX <= returnBtn.x + returnBtn.w && mouseY >= returnBtn.y && mouseY <= returnBtn.y + returnBtn.h) {
      window.location.href = "../index.html";
    }
  }
});

// play button
if (playBtn) {
  playBtn.addEventListener("click", () => {
     if (menuMusic) {
      menuMusic.pause();
      menuMusic.currentTime = 0;
    }
  menu.style.display = "none";
  canvas.style.display = "block";
  
  startGame();
});
}

// mouse tracking (gera novo objeto imutável a cada evento)
addMouseListener(canvas, (event) => {
  const rect = canvas.getBoundingClientRect();
  const newMouse = freezeObj({
    x: (event.clientX - rect.left) * (canvas.width / rect.width),
    y: (event.clientY - rect.top) * (canvas.height / rect.height)
  });
  rootState.current = Object.freeze({ ...rootState.current, mouse: newMouse });
});

// retornar botão (se existir)
if (retornarBtn) {
  retornarBtn.addEventListener("click", () => {
    window.location.href = "../index.html";
  });
}

// inicial render do menu (não inicia loop)
rootState.current = Object.freeze({ ...rootState.current, game: initialGame(canvas) });
render(rootState.current.game);

// debug: log quando imagens carregarem (opcional)
bgImg.onload = playerImg.onload = enemyImg.onload = () => {
  console.log("Imagens carregadas.");
};