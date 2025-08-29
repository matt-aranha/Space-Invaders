import { canvas } from "./config.js";

export const state = {
    running: false,
    lastTime: 0,
    isMuted: false,
    player: { 
        x: (canvas.width / 2) - 40, y: canvas.height - 80, w: 90, h: 70,
        speed: 450,
        cooldown: 0, 
        lives: 3, 
        invincible: 0,
        animationFrame: 0,
        lastAnimationFrameTime: 0
    },
    enemyBullets: [],
    bullets: [],
    wave: 1,
    enemyFireRate: 0.0005,
    enemies: (function spawn() {
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
    })(),
    enemyDir: 1, 
    enemySpeed: 40, 
    score: 0, 
    audio: { ctx: null, masterGain: null, bgOscs: [],
        tones: [65, 60, 55, 50],
        index: 0, lastTime: 0
    },
    base: (function spawn() {
        const cols = 3, rows = 1;
        return Array.from({ length: cols * rows },
            (_, i) => ({ x: 170 + (i % cols) * ((canvas.width - 80) / cols),
                y: 500 + Math.floor(i / cols) * 40, w: 100, h: 80, hp: 30, hpMax: 30, hit: 0, alive: true
            }));
    })(),
    enemyAnimationFrame: 0,
    lastEnemyFrameTime: 0 
};