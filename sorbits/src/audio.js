// Generative audio: a low evolving drone (heat-reactive) + bright event blips.
// No samples — oscillators + filtered noise only. Self-contained.

export const A = { ac: null, on: true, master: null, droneGain: null, filter: null };

export function ensureAudio() {
  if (A.ac) return;
  try {
    A.ac = new (window.AudioContext || window.webkitAudioContext)();
    A.master = A.ac.createGain(); A.master.gain.value = A.on ? 0.5 : 0; A.master.connect(A.ac.destination);
    const o1 = A.ac.createOscillator(), o2 = A.ac.createOscillator(); o1.type = 'sawtooth'; o2.type = 'sawtooth';
    o1.frequency.value = 54; o2.frequency.value = 54.7;
    A.filter = A.ac.createBiquadFilter(); A.filter.type = 'lowpass'; A.filter.frequency.value = 300; A.filter.Q.value = 6;
    A.droneGain = A.ac.createGain(); A.droneGain.gain.value = 0.03;
    o1.connect(A.filter); o2.connect(A.filter); A.filter.connect(A.droneGain); A.droneGain.connect(A.master);
    o1.start(); o2.start();
  } catch (e) { A.ac = null; }
}

function blip(f0, f1, dur, vol, type = 'sine') {
  if (!A.ac || !A.on) return;
  const o = A.ac.createOscillator(), g = A.ac.createGain(); o.type = type;
  o.frequency.setValueAtTime(f0, A.ac.currentTime); o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), A.ac.currentTime + dur);
  g.gain.setValueAtTime(vol, A.ac.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, A.ac.currentTime + dur);
  o.connect(g); g.connect(A.master); o.start(); o.stop(A.ac.currentTime + dur + 0.02);
}

export const sGold = () => blip(1320, 520, 0.2, 0.16);
export const sHit = () => blip(150, 45, 0.3, 0.3);
export const sQuasar = () => blip(2200, 1800, 0.4, 0.12, 'triangle');
// power events made physical: OUT = losing (deflation whoosh), IN = gaining (rising inhale)
export const sLose = () => blip(220, 50, 0.45, 0.28, 'triangle');
export const sGain = () => blip(320, 880, 0.4, 0.2, 'sine');
// level-up: the board is sucked in — a rising whoosh as the sweep begins
export const sSweep = () => blip(120, 640, 0.5, 0.22, 'sawtooth');

// level-up: a bright ascending arpeggio — the board clears, the reward lands
export function sLevelUp() {
  if (!A.ac || !A.on) return;
  const notes = [523, 659, 784, 1046]; // C5 E5 G5 C6
  notes.forEach((f, i) => {
    const t0 = A.ac.currentTime + i * 0.07;
    const o = A.ac.createOscillator(), g = A.ac.createGain(); o.type = 'sine';
    o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.18, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.35);
    o.connect(g); g.connect(A.master);
    o.start(t0); o.stop(t0 + 0.4);
  });
}
