import { cvs, resize, poseOf } from './geometry.js';
import { S, keys, dev, reset } from './state.js';
import { update, queueToasts, hop } from './update.js';
import { render } from './render.js';
import { ensureAudio, A } from './audio.js';
import { $ } from './utils.js';

// ---------- flow / UI ----------
function start() {
  reset(); S.paused = false;
  $('menu').classList.add('hidden'); $('over').classList.add('hidden'); $('hud').style.display = 'block';
  ensureAudio(); queueToasts();
}
function toMenu() {
  S.paused = true; S.over = false;
  $('menu').classList.remove('hidden'); $('over').classList.add('hidden'); $('hud').style.display = 'none';
}

// ---------- input ----------
addEventListener('keydown', e => {
  if (e.code === 'KeyM') { A.on = !A.on; if (A.ac) A.master.gain.value = A.on ? 0.5 : 0; return; }
  if (e.code === 'KeyF') { dev.on = !dev.on; $('dev').style.display = dev.on ? 'block' : 'none'; return; }
  if (e.code === 'Escape') { toMenu(); return; }
  if (S.over) { if (e.code === 'KeyR') start(); return; }
  if (S.paused) { start(); return; }
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.l = true;
  if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.r = true;
  if (e.code === 'ArrowUp' || e.code === 'KeyW') hop(1);
  if (e.code === 'ArrowDown' || e.code === 'KeyS') hop(-1);
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
});
addEventListener('keyup', e => {
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.l = false;
  if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.r = false;
});
$('play').addEventListener('click', start);
cvs.addEventListener('pointerdown', () => { if (S.paused && !S.over) start(); });
addEventListener('resize', resize);

// ---------- loop ----------
let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  poseOf(now / 1000); // update the shared pose (mutates geometry's POSE/RING_POSE in place)
  try {
    if (!S.paused) update(dt);
    render(now / 1000);
  } catch (err) { console.error('SORBITS frame error (loop continues):', err); }
  requestAnimationFrame(loop); // always re-schedule: a bad frame must never freeze the game
}

resize();
reset(); S.paused = true;
requestAnimationFrame(loop);


