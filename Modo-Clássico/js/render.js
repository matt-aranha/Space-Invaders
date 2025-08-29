import { state } from "./state.js";
import { canvas, ctx, baseImg, playerFrames } from "./config.js";
import { enemyImg1, enemyImg1_frame2, enemyImg2, enemyImg2_frame2, enemyImg3, enemyImg3_frame2 } from "./config.js";

const getPlayerImage = (animationFrame) => playerFrames[animationFrame];

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

const drawRect = (x, y, w, h, color) => { ctx.fillStyle = color; ctx.fillRect(x, y, w, h); };

const renderLives = (lives, maxLives = 3) => 
  Array.from({ length: maxLives }, (_, i) =>
    i < lives ? "assets/vida(192x192).png" : "assets/sem-vida(192x192).png");

const livesToHTML = (lives) =>
  renderLives(lives)
    .map(src => `<img src="${src}" width="30" height="30" />`)
    .join("");

const updateLivesUI = (state) => {
  const container = document.getElementById("lives-container");
  container.innerHTML = livesToHTML(state.player.lives);
};

export const render = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    updateLivesUI(state);

    const currentPlayerImg = getPlayerImage(state.player.animationFrame);
    if (state.player.invincible > 0) {
        if (Math.floor(Date.now() / 100) % 2 === 0) {
            ctx.drawImage(currentPlayerImg, state.player.x, state.player.y, state.player.w, state.player.h);
        }
    } else {
        ctx.drawImage(currentPlayerImg, state.player.x, state.player.y, state.player.w, state.player.h);
    }

    ctx.fillStyle = "#fff";
    ctx.font = "16px 'Press Start 2P'";
    ctx.fillText("Vidas: ", canvas.width - 150, 20);

    state.bullets.forEach(b => drawRect(b.x, b.y, b.w, b.h, "#58a6ff"));

    state.base.forEach(b => {
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

    state.enemyBullets.forEach(b => drawRect(b.x, b.y, b.w, b.h, "#ff5470"));

    state.enemies.forEach(e => {
        if (!e.alive) return;
        const img = getEnemyImage(e.type, state.enemyAnimationFrame);
        ctx.drawImage(img, e.x, e.y, e.w, e.h)
    });
  
    ctx.fillStyle = "#fff"; ctx.font = "16px 'Press Start 2P'"; ctx.fillText("Score: " + state.score, 550, 20);

    if (!state.running) {
        ctx.fillStyle = "rgba(0,0,0,0.75)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.font = "48px 'Press Start 2P'";
        ctx.textAlign = "center";

        ctx.fillStyle = "#fff";
        ctx.fillText("GAME OVER", canvas.width / 2 + 3, canvas.height / 2 - 50 + 3);
    
        ctx.fillStyle = "#25f82fff";
        ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2 - 50);

        ctx.font = "14px 'Press Start 2P'";
        ctx.fillStyle = "#fff";
        ctx.fillText("Clique no botão para reiniciar", canvas.width / 2, canvas.height / 2);

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

        ctx.textAlign = "start";
        ctx.textBaseline = "alphabetic";
    }
};