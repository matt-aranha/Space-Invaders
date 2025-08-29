import { canvas, playBtn, menu, muteBtn, playerShotSound, baseDestroyedSound } from "./config.js";
import { state } from "./state.js";
import { ensureAudio, playAudioTiro, playInvaderTone, playTone } from "./audio.js";
import { render } from "./render.js";
import { updatePlayerAnimation } from "./utils.js";

const keys = {};
document.addEventListener("keydown", e => { keys[e.code] = true;
    if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) e.preventDefault(); });
document.addEventListener("keyup", e => { keys[e.code] = false; });

const tiro = () => {
    const p = state.player;
    if (p.cooldown > 0) return;
    p.cooldown = 0.420;
    state.bullets.push({ x: p.x + p.w / 2 - 2, y: p.y - 6, w: 4, h: 8, dy: -420 });
    playAudioTiro(playerShotSound);
};

function processPlayerBulletBase(bullet, base, idx) {
    if (idx >= base.length) return;
    const b = base[idx];
    if (b.alive &&
        bullet.x < b.x + b.w && bullet.x + bullet.w > b.x &&
        bullet.y < b.y + b.h && bullet.y + bullet.h > b.y) {
        bullet.y = -9999;
        return;
    }
    processPlayerBulletBase(bullet, base, idx + 1);
};

function processBullets(bullets, enemies, idx = 0) {
    if (idx >= bullets.length) return;
    const b = bullets[idx];
    processEnemies(b, enemies, 0);
    processBullets(bullets, enemies, idx + 1);
}

const enemyPoints = {
    1: 10,
    2: 20,
    3: 30
};

function processEnemies(bullet, enemies, idx) {
    if (idx >= enemies.length) return;
    const e = enemies[idx];
    if (e.alive &&
        bullet.x < e.x + e.w && bullet.x + bullet.w > e.x &&
        bullet.y < e.y + e.h && bullet.y + bullet.h > e.y) {
        e.alive = false;
        bullet.y = -9999;
        state.score += enemyPoints[e.type];
        playTone(600, 0.15, "sawtooth", 0.08, 50);
        return;
    }
    processEnemies(bullet, enemies, idx + 1);
}

function processBulletBase(bullet, base, idx) {
    if (idx >= base.length) return;
    const e = base[idx];
    if (e.alive &&
        bullet.x < e.x + e.w && bullet.x + bullet.w > e.x &&
        bullet.y < e.y + e.h && bullet.y + bullet.h > e.y) {
        e.hp -= 1;
        e.hit = 0.12;
        bullet.y = canvas.height + 100;
        if (e.hp <= 0) {
            e.alive = false;
            e.justDied = true;
        };
        return;
    };
    processBulletBase(bullet, base, idx + 1);
}

const regenerateBases = (bases) => {
    return bases.map(base => ({
        ...base,
        hp: base.hpMax,
        alive: true
    }));
};

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

function enemyShoot() {
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

const update = (dt) => {
    if (state.player.invincible > 0) {
        state.player.invincible -= dt;
    }

    const newAnimationState = updatePlayerAnimation(state.player, dt, 2.5);
    state.player = {...state.player, ...newAnimationState};

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
            if (p.invincible <= 0) {
                p.lives -= 1;
                p.invincible = 1.5;
                playTone(80, 0.2, "sawtooth", 0.15);
                if (p.lives <= 0) {
                    state.running = false;
                }
            }
            b.y = canvas.height + 100;
            return;
        };

        processBulletBase(b, state.base, 0);
    });

    state.base.forEach(b => {
        if (b.justDied){
            playAudioTiro(baseDestroyedSound);
            b.justDied = false;
        }
    })

    state.base = state.base.map(br => br.alive ? { ...br, hit: Math.max(0, (br.hit || 0) - dt) } : br);

    const dir = (keys["ArrowLeft"] || keys["KeyA"] ? -0.5 : 0) + (keys["ArrowRight"] || keys["KeyD"] ? 0.5 : 0);
    state.player.x += dir * state.player.speed * dt;
    if (state.player.x < 2) state.player.x = 2;
    if (state.player.x + state.player.w > canvas.width - 2) state.player.x = canvas.width - 2 - state.player.w;

    if (state.player.cooldown > 0) state.player.cooldown -= dt;
    if (keys["Space"] || keys["KeyW"] || keys["ArrowUp"]) tiro();

    state.bullets = state.bullets.map(b => ({ ...b, y: b.y + b.dy * dt })).filter(b => b.y > -20);

    const alive = state.enemies.filter(e => e.alive);
    if (alive.length === 0) {
        state.wave += 1;
        state.enemySpeed += 10.5;
        state.enemyFireRate *= 1.12;
        state.base = regenerateBases(state.base);
        state.enemies = (function spawn() {
            const cols = 12, rows = 4;
            return Array.from({ length: cols * rows }, (_, i) => {
                const row = Math.floor(i / cols);
                const typeMapping = [3, 2, 2, 1];
                const enemyType = typeMapping[row];
                
                return {
                    x: 300 + (i % cols) * 60,
                    y: 40 + row * 40,
                    w: 64, h: 64,
                    alive: true,
                    type: enemyType
                };
            });
        })()
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

    state.lastEnemyFrameTime += dt;
    const animationInterval = 0.5;
    if (state.lastEnemyFrameTime >= animationInterval) {
        state.enemyAnimationFrame = (state.enemyAnimationFrame + 1) % 2;
        state.lastEnemyFrameTime -= animationInterval;
    }

    state.bullets.forEach(bullet => {
        processEnemies(bullet, state.enemies, 0);
        processPlayerBulletBase(bullet, state.base, 0);
    });
  
    state.bullets = state.bullets.filter(b => b.y > -50);

    checkEnemyBase(state.enemies);

    playInvaderTone();
};

muteBtn.addEventListener("click", () => {
    state.isMuted = !state.isMuted;

    if (state.isMuted) {
        if (state.audio.masterGain) {
            state.audio.masterGain.gain.value = 0;
        }
        playerShotSound.muted = true;
        baseDestroyedSound.muted = true;
        muteBtn.textContent = "Desmutar";
    } else {
        if (state.audio.masterGain) {
            state.audio.masterGain.gain.value = 0.9;
        }
        playerShotSound.muted = false;
        baseDestroyedSound.muted = false;
        muteBtn.textContent = "Mutar";
    }
});

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
        ensureAudio();
        if (state.audio.ctx && state.audio.ctx.state === "suspended") state.audio.ctx.resume();
        menu.style.display = "none";
        canvas.style.display = "block";
        muteBtn.style.display = 'block';
        state.running = true;
        state.lastTime = 0;
        state.score = 0;
        state.player.lives = 3;
        state.enemyBullets = [];
        state.bullets = [];
        state.enemies = (function spawn() {
            const cols = 9, rows = 4;
            return Array.from({ length: cols * rows }, (_, i) => {
                const row = Math.floor(i / cols);
                const typeMapping = [3, 2, 2, 1];
                const enemyType = typeMapping[row];
                return {
                    x: 300 + (i % cols) * 60,
                    y: 40 + row * 40,
                    w: 64, h: 64,
                    alive: true,
                    type: enemyType
                };
            });
        })();

        state.base = (function spawn() { const cols = 3, rows = 1; return Array.from({ length: cols * rows }, (_, i) => ({ x: 170 + (i % cols) * ((canvas.width - 80) / cols),
            y: 500 + Math.floor(i / cols) * 40, w: 120, h: 100, hp: 30, hpMax: 30, hit: 0, alive: true
        }));
        })();
    
        requestAnimationFrame(loop);
    }
});

const loop = (ts) => {
    if (!state.running) return;
    const dt = Math.min(0.05, (ts - (state.lastTime || ts)) / 1000);
    state.lastTime = ts;
    update(dt);
    render();
    requestAnimationFrame(loop);
};

playBtn.addEventListener("click", () => {
    ensureAudio();
    if (state.audio.ctx && state.audio.ctx.state === "suspended") { state.audio.ctx.resume() }

    const originalPlayerVolume = playerShotSound.volume;
    const originalExplosionVolume = baseDestroyedSound.volume;

    playerShotSound.volume = 0;
    baseDestroyedSound.volume = 0;

    playerShotSound.play().catch(() => {});
    baseDestroyedSound.play().catch(() => {});

    setTimeout(() => {
        playerShotSound.pause();
        playerShotSound.currentTime = 0;
        playerShotSound.volume = originalPlayerVolume;

        baseDestroyedSound.pause();
        baseDestroyedSound.currentTime = 0;
        baseDestroyedSound.volume = originalExplosionVolume;
    }, 10);

    menu.style.display = "none";
    canvas.style.display = "block";
    muteBtn.style.display = 'block';
    state.running = true;
    state.lastTime = 0;
    state.score = 0;
    state.player.lives = 3;
    state.enemyBullets = [];
    state.bullets = [];
    state.enemies = (function spawn() {
        const cols = 9, rows = 4;
        return Array.from({ length: cols * rows }, (_, i) => {
            const row = Math.floor(i / cols);
            const typeMapping = [3, 2, 2, 1];
            const enemyType = typeMapping[row];
            return {
                x: 300 + (i % cols) * 60,
                y: 40 + row * 40,
                w: 64, h: 64,
                alive: true,
                type: enemyType
            };
        });
    })();
    state.base = (function spawn() { const cols = 3, rows = 1; return Array.from({ length: cols * rows }, (_, i) => ({ x: 170 + (i % cols) * ((canvas.width - 80) / cols),
        y: 500 + Math.floor(i / cols) * 40, w: 120, h: 100, hp: 30, hpMax: 30, hit: 0,alive: true
    }));
    })();
  
    requestAnimationFrame(loop);
});