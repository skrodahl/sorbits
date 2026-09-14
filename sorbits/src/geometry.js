import { TAU, rand } from './utils.js';

// The "view": owns the canvas + all screen-space state, the 3D pose system,
// and orbital projection. No game logic (S) lives here.

export const cvs = document.getElementById('c');
export const ctx = cvs.getContext('2d');

export const N = 5; // orbit rings
export let W, H, DPR, bg;
export let cx, cy, maxR, minR, ringR = [], gap = 0, coreR = 0;
export let POSE = { breath: 1 };
export const RING_POSE = { sq: [], rot: [] }; // shared shape + per-ring orientation
export let twinkles = [], dust = [];

// 3D pose: every ring shares ONE shape (same squash) so the atom reads as a
// coherent family of orbits; the *planes* differ by orientation — a smooth
// twist through the stack plus a slow per-ring drift ("slightly different
// planes", not "different shapes"). Gentle scale/squash breath keeps it alive.
export function poseOf(t) {
  POSE.breath = 1 + 0.02 * Math.sin(t * 1.14);
  const sq = 0.82 + 0.035 * Math.sin(t * 0.5); // one shared squash (all rings the same shape)
  for (let i = 0; i < N; i++) {
    const u = N > 1 ? i / (N - 1) : 0.5;
    RING_POSE.sq[i] = sq;
    RING_POSE.rot[i] = 0.3 * (u - 0.5) + 0.05 * Math.sin(t * 0.3 + i * 1.3); // twist + slow drift
  }
  return POSE;
}

// project an orbital angle on a given ring to screen (that ring's own tilt)
export function project(angle, ringIdx, radius) {
  const sq = RING_POSE.sq[ringIdx], rot = RING_POSE.rot[ringIdx], b = POSE.breath;
  const ex = Math.cos(angle) * radius * b, ey = Math.sin(angle) * radius * sq * b;
  const cr = Math.cos(rot), sr = Math.sin(rot);
  return { x: cx + ex * cr - ey * sr, y: cy + ex * sr + ey * cr };
}

// particle position: uses the particle's gliding radius (p.r) when present,
// else the ring's fixed radius
export function pPos(p) {
  return project(p.angle, p.ring, p.r !== undefined ? p.r : ringR[p.ring]);
}

// interpolated ring pose at a continuous radius — for a wave/ripple passing through
// the ring stack (all rings share one squash; only the per-ring orientation varies)
export function ringPoseAtR(r) {
  let f = Math.max(0, Math.min(N - 1, (r - ringR[0]) / gap));
  const i0 = Math.min(N - 2, Math.floor(f)), i1 = i0 + 1, fr = f - i0;
  return { sq: RING_POSE.sq[0], rot: RING_POSE.rot[i0] + (RING_POSE.rot[i1] - RING_POSE.rot[i0]) * fr };
}

export function angDiff(a, b) {
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
}

export function resize() {
  DPR = Math.min(2, window.devicePixelRatio || 1);
  W = innerWidth; H = innerHeight;
  cvs.width = W * DPR; cvs.height = H * DPR;
  layout(); makeBG();
  twinkles = Array.from({ length: 26 }, () => ({ x: Math.random() * W, y: Math.random() * H, ph: Math.random() * TAU, sp: 0.6 + Math.random() * 1.6, r: 0.8 + Math.random() * 1.4 }));
  dust = Array.from({ length: 12 }, () => ({ x0: Math.random() * W, y0: Math.random() * H, vx: rand(-4, 4), vy: rand(-4, 4),
    ph: Math.random() * TAU, sp: 0.3 + Math.random() * 0.5, r: 0.6 + Math.random() * 0.8, al: 0.04 + Math.random() * 0.08 }));
}

export function layout() {
  cx = W / 2; cy = H / 2; maxR = Math.min(W, H) * 0.42; minR = Math.max(64, maxR * 0.26);
  ringR = Array.from({ length: N }, (_, i) => minR + (maxR - minR) * i / (N - 1)); gap = (maxR - minR) / (N - 1); coreR = minR * 0.5;
}

// pre-render the serene cosmos (radial nebula + stars) to an offscreen canvas
export function makeBG() {
  bg = document.createElement('canvas'); bg.width = W * DPR; bg.height = H * DPR;
  const b = bg.getContext('2d'); b.scale(DPR, DPR);
  const g = b.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * 0.75);
  g.addColorStop(0, '#0c0c24'); g.addColorStop(0.5, '#070716'); g.addColorStop(1, '#030309');
  b.fillStyle = g; b.fillRect(0, 0, W, H);
  const neb = (x, y, r, c) => { const n = b.createRadialGradient(x, y, 0, x, y, r); n.addColorStop(0, c); n.addColorStop(1, 'rgba(0,0,0,0)'); b.fillStyle = n; b.fillRect(0, 0, W, H); };
  neb(W * 0.30, H * 0.25, Math.max(W, H) * 0.5, 'rgba(92,62,190,0.11)');
  neb(W * 0.72, H * 0.70, Math.max(W, H) * 0.45, 'rgba(38,140,180,0.09)');
  neb(W * 0.62, H * 0.32, Math.max(W, H) * 0.30, 'rgba(205,80,160,0.05)');
  for (let i = 0; i < 220; i++) { b.globalAlpha = Math.random() * 0.45 + 0.08; b.fillStyle = '#cfd8ff'; b.beginPath(); b.arc(Math.random() * W, Math.random() * H, Math.random() * 1.2 + 0.2, 0, TAU); b.fill(); }
  b.globalAlpha = 1;
}
