import { state } from "./state.js";

export const ensureAudio = () => {
    if (state.audio.ctx) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const a = new AudioCtx();
    state.audio.ctx = a;
    state.audio.masterGain = a.createGain();
    state.audio.masterGain.gain.value = 0.9;
    state.audio.masterGain.connect(a.destination);
};

export const playAudioTiro = (audioElement) => {
    const soundToPlay = audioElement.cloneNode();
    soundToPlay.muted = audioElement.muted;
    soundToPlay.volume = audioElement.volume;
    soundToPlay.play().catch(e => console.error("Audio do Tiro Falhou:", e));
};

export const playTone = (freq, duration = 0.08, type = "square", vol = 0.12, endFreq = null) => {
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

export const playInvaderTone = () => {
    const a = state.audio;
    if (!a.ctx) return;

    const now = performance.now();
    const timeBetweenBeats = Math.max(100, 550 - (state.enemies.filter(e => e.alive).length * 5));

    if (now - a.lastTime < timeBetweenBeats) {
        return;
    }

    const noteToPlay = a.tones[a.index];
    playTone(noteToPlay, 0.1, "square", 0.1);

    a.index = (a.index + 1) % a.tones.length;
    a.lastTime = now;
};