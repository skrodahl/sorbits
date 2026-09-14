import { S } from './state.js';
import { TAU } from './utils.js';
import { cx, cy, coreR, gap, maxR, W, H } from './geometry.js';

// small radial burst of fading dots
export function burst(x, y, n, col, sp) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * TAU, s = (0.4 + Math.random()) * sp * 60;
    S.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.5 + Math.random() * 0.5, max: 1, col, size: 1 + Math.random() * 2 });
  }
}

// power-event FX: 'hit' = strike at a point (outward shock), 'decay' = passive loss at the core,
// 'in' = gain: motes drawn from the cosmos into the core + contracting ring
export function shockFX(kind, x, y, ring) {
  if (kind === 'hit') S.shocks.push({ x, y, t: 0, dur: 0.5, min: 8, max: 74, rgb: '255,110,140', plane: true, ring: ring });
  else if (kind === 'decay') S.shocks.push({ x: cx, y: cy, t: 0, dur: 0.8, min: coreR * 0.4, max: coreR * 0.4 + gap * 1.6, rgb: '190,170,255', plane: true, ring: 0 });
  else if (kind === 'in') {
    S.shocks.push({ x: cx, y: cy, t: 0, dur: 0.6, min: coreR * 0.5, max: maxR * 0.55, rgb: '255,217,122', inward: true, plane: true, ring: 0 });
    const n = 10 + Math.floor(Math.random() * 5);
    for (let i = 0; i < n; i++)
      S.sucks.push({ a: Math.random() * TAU, r0: Math.max(W, H) * 0.45 + 20, t: 0, dur: 0.5 + Math.random() * 0.3 });
  }
}
