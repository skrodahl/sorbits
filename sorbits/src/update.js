import { S, keys, dev, pTarget, drainOf, goldSpawnIv, effGoldMax, effPhotonMax, stayRad, angVelOf, inSanc, ePos, gameOver } from './state.js';
import { C, gaugeColor } from './config.js';
import { TAU, clamp, lerp, $ } from './utils.js';
import { ringR, N, maxR, project, pPos, cx, cy, coreR, W, H } from './geometry.js';
import { burst, shockFX } from './fx.js';
import { A, sHit, sLose, sGain, sLevelUp, sSweep, sGold, sQuasar } from './audio.js';

// ---- onboarding toasts (presentational; shown once, timed off S.t) ----
let toasts = [], toastI = 0;
export function queueToasts() {
  toasts = [
    { at: 1.5, txt: 'GOLD CHARGES THE ATOM · RED DRAINS IT' },
    { at: 6, txt: 'DON’T LET THE CORE DIM — POWER 0 IS GAME OVER' },
    { at: 12, txt: 'FULL CHARGE = LEVEL UP — IT SWEEPS THE BOARD' },
    { at: 19, txt: 'GRAB THE QUASAR → SANCTUARY (SWALLOWS THE REDS)' },
  ];
  toastI = 0;
}
function tickToasts(dt) {
  if (toastI < toasts.length && S.t >= toasts[toastI].at) {
    const el = $('toast'); el.textContent = toasts[toastI].txt; el.style.opacity = 1;
    setTimeout(() => el.style.opacity = 0, 3400); toastI++;
  }
}

// ring-hop: wrap up from outer->inner, down from inner->outer; little spark on a real hop
export function hop(dir) {
  if (S.over || S.paused) return;
  const nr = ((S.e.ring + dir) % N + N) % N;
  if (nr !== S.e.ring) { S.e.ring = nr; burst(ePos(), 10, '#7ef0ff', 1.8); }
}

// floating arcade number/word (score/damage) that pops in, rises, lingers, then dissolves
function popup(x, y, txt, col, size, dur) { S.popups.push({ x, y, txt, col, size, t: 0, dur }); }

// level-up "collection": the whole board is sucked into the core, one particle at a
// time (each emitting its score). It starts in slow-mo and ramps to a fast rush, and
// runs until the board is empty — so every particle visibly reaches the core before the
// level bumps and power resets to ~⅓ of the new (larger) target.
function startCollect() {
  S.collecting = { t: 0 }; // runs until the board is empty: every particle reaches the core
  for (const q of S.photons) q.scoreVal = C.collectRed;        // reds: flat +10, always
  for (const g of S.golds) g.scoreVal = C.goldValByRing[g.ring]; // golds: scored by the ring they're on
  const all = S.photons.concat(S.golds);
  all.sort(() => Math.random() - 0.5); // random order so the sweep doesn't read as mechanical
  let d = 0.15; // brief lead-in before the first pull
  for (const q of all) { q.collecting = true; q.colStart = d; d += C.collectStagger + Math.random() * 0.06; }
  sSweep();
}

function finalizeLevelUp() {
  for (const q of S.photons) S.score += q.scoreVal; // any straggler still counts (no silent loss)
  for (const g of S.golds) S.score += g.scoreVal;
  S.photons.length = 0; S.golds.length = 0; S.quasar = null;
  S.level++; S.ups++;
  S.power = C.resetFraction * pTarget();
  S.envTone = 1; S.coreFlare = 1; // the atom surges into its new level
  S.ringWaves.push({ t: 0, dur: 0.9, r0: coreR, r1: ringR[N - 1], rgb: '255,217,122', a: 0.6 });
  popup(cx, cy - 10, 'LEVEL ' + S.level, '#5fe6ff', 48, 2.0);
  shockFX('in'); sLevelUp();
  S.collecting = null;
  S.slowT = 0; // snap back to full speed exactly as the new level begins
}

export function update(dt) {
  if (S.paused || S.over) return;
  // sweep speed: starts slow (bullet-time) and ramps to a fast rush, so every particle
  // reaches the core before the level bumps; a damage hit-stop falls back to C.slowMo
  let sp = 1;
  if (S.collecting) { const p = Math.min(1, S.collecting.t / C.sweepRamp); sp = lerp(C.slowMo, C.sweepBoost, p * p); }
  else if (S.slowT > 0) sp = C.slowMo;
  const sdt = dt * sp;
  S.t += sdt; S.score += dt * C.survivalVal * S.level; // time ticker: score accrues faster as the atom heats up
  S.invuln = Math.max(0, S.invuln - dt); S.slowT = Math.max(0, S.slowT - dt);
  S.envTone *= Math.exp(-2.2 * dt); if (Math.abs(S.envTone) < 0.01) S.envTone = 0; // environment mood decays to calm
  S.coreRecoil = Math.max(0, S.coreRecoil - dt * 6); S.coreFlare = Math.max(0, S.coreFlare - dt * 6); // mirrored: flinch & flare decay together
  for (const w of S.ringWaves) w.t += sdt;
  S.ringWaves = S.ringWaves.filter(w => w.t < w.dur);
  S.shake = Math.max(0, S.shake - dt * 14);
  S.pump = Math.max(0, S.pump - sdt); // core pump (compress -> expand -> spit)
  tickToasts(dt);

  // heat model: base (level) + surge envelope
  const baseH = Math.min(1, 0.25 + (S.level - 1) * 0.22);
  S.surgeT -= sdt;
  if (S.surgeT <= 0) { S.surge = 3.5; S.surgeT = 9 + Math.random() * 5; }
  if (S.surge > 0) S.surge = Math.max(0, S.surge - sdt);
  const surgeH = S.surge > 0 ? 0.35 * Math.sin(Math.PI * (1 - S.surge / 3.5)) : 0;
  S.heat = baseH + surgeH;
  if (A.ac && A.droneGain) {
    let fc = 250 + S.heat * 1400;
    let dg = 0.03 + S.heat * 0.05;
    if (S.surge > 0) { // surge: rhythmic pulse riding the drone
      const pu = 0.5 + 0.5 * Math.sin(A.ac.currentTime * TAU * 1.1);
      dg *= 0.7 + 0.6 * pu;
    }
    if (S.sanc) { fc = Math.min(fc, 600); dg *= 0.75; } // sanctuary: softened, darker register
    A.filter.frequency.setTargetAtTime(fc, A.ac.currentTime, 0.4);
    A.droneGain.gain.setTargetAtTime(dg, A.ac.currentTime, 0.4);
  }

  // passive coherence drain: continuous gas-tank drain, forgiving; heat adds pressure
  // (paused while a level-up collection is in flight — the atom is in a reward state)
  if (!S.collecting) {
    S.power -= drainOf() * pTarget() * sdt;
    S.lastDamage = 'decay';
    if (S.power <= 0) { S.power = 0; shockFX('decay'); sLose(); gameOver(); return; }
  }

  // power packets ride out of the core (reliable supply, scales up with level)
  S.goldT -= sdt;
  if (!S.collecting && S.goldT <= 0 && S.golds.length < effGoldMax()) { S.goldT = goldSpawnIv(); spawnGold(); }

  // electron motion: auto-orbit + steer
  const r = ringR[S.e.ring];
  let av = 1.7 * Math.pow(ringR[0] / r, 1.3);
  if (keys.l) S.e.angVel -= 4.5 * sdt;
  if (keys.r) S.e.angVel += 4.5 * sdt;
  S.e.angVel *= Math.exp(-1.1 * sdt);
  S.e.angVel = clamp(S.e.angVel, -2.6, 2.6);
  S.e.angle = (S.e.angle + (av + S.e.angVel) * sdt) % TAU;
  S.e.r += (r - S.e.r) * Math.min(1, sdt * 9);
  const p = ePos();
  S.e.trail.push({ x: p.x, y: p.y, life: 1 });
  if (S.e.trail.length > 55) S.e.trail.shift();
  for (const t of S.e.trail) t.life -= sdt * 1.6;

  // photons: caught by a ring, orbit a random number of turns, then shell-hop inward
  S.spawnT -= sdt;
  if (!S.collecting && S.spawnT <= 0) { // D13/D15: readability cap — no new reds while the board is full (it refills the moment a slot opens)
    S.spawnT = C.redSpawnBase - C.redSpawnHeatSlope * clamp(S.heat, 0, 1.3);
    if (S.photons.length < effPhotonMax()) spawnPhoton();
  }
  for (let i = S.photons.length - 1; i >= 0; i--) {
    const q = S.photons[i];
    if (q.collecting && S.collecting.t >= q.colStart) { // level-up sweep: pulled into the core
      q.r += (0 - q.r) * Math.min(1, sdt * C.collectPull);
      q.angle = (q.angle + sdt * 3) % TAU;
      if (q.r <= coreR * 0.3) { // reached the core: emit its score
        S.score += C.collectRed;
        popup(cx, cy - 16, '+' + C.collectRed, '#ff8fa0', 24, 1.6);
        burst(cx, cy, 8, '#ff8fa0', 1.6);
        S.photons.splice(i, 1);
      }
      continue;
    }
    q.angle = (q.angle + q.angVel * sdt) % TAU;
    q.stay -= Math.abs(q.angVel) * sdt;
    if (q.matT > 0) q.matT -= sdt; // "materialize": condense in over a beat
    // "vibrate": shudder toward the next ring as the shell-hop nears — a readable, plannable warning
    const timeToHop = Math.abs(q.angVel) > 0.001 ? q.stay / Math.abs(q.angVel) : Infinity;
    q.vibe = timeToHop <= C.hopWarn ? Math.max(0, 1 - timeToHop / C.hopWarn) : 0; // 0..1 urgency, peaks just before the hop
    if (q.stay <= 0) {
      q.ring--;
      if (q.ring < 0) { // reaches the core: the only auto-removal
        S.photons.splice(i, 1); S.pulses.push({ life: 1 });
        if (Math.random() < 0.16) spawnGold(); // annihilation leaks a little power out
        continue;
      }
      q.stay = stayRad('photon'); // re-rolled for the new (inner) ring
    }
    q.r += (ringR[q.ring] - q.r) * Math.min(1, sdt * 9); // glide between rings (no quantum leap)
    const qp = pPos(q);
    if (!q.trail) q.trail = [];
    q.trail.push({ x: qp.x, y: qp.y, life: 1 }); // motion trail
    if (q.trail.length > 16) q.trail.shift();
    for (const t of q.trail) t.life -= sdt * 3.5;
    if (!S.collecting) { // no damage / sanctuary absorption during a level-up sweep
      if (inSanc(q.angle)) { // the sanctuary absorbs reds that enter it — cleanup, no reward
        S.photons.splice(i, 1); burst(qp.x, qp.y, 7, '#8fa8c8', 0.9); continue;
      }
        if (q.matT <= 0 && Math.hypot(qp.x - p.x, qp.y - p.y) < C.photonHitR) { // not a hazard until fully materialized
          if (S.invuln > 0) continue;
          S.photons.splice(i, 1); S.power -= C.redLossByRing[S.e.ring] * pTarget(); S.lastDamage = 'photon'; // D11: drain is a FRACTION of the gauge (never a one-shot at full power)
        S.invuln = 1; S.slowT = 0.28; S.shake = 9; S.envTone = -1; S.coreRecoil = 1; // the atom is wounded
        S.ringWaves.push({ t: 0, dur: 0.6, r0: ringR[S.e.ring], r1: coreR * 0.5, rgb: '255,110,140', a: 0.55 }); // the wound closes in on the core
        burst(p.x, p.y, 18, '#ff4d6a', 2.4);
        popup(qp.x, qp.y - 14, 'DAMAGE', '#ff4d6a', 24, 1.5);
        sHit(); sLose();
        if (S.power <= 0) { gameOver(); return; }
      }
    }
  }

  // gold: power packets ride out of the core — caught by a ring, orbit, then shell-hop outward
  for (let i = S.golds.length - 1; i >= 0; i--) {
    const g = S.golds[i];
    if (g.collecting && S.collecting.t >= g.colStart) { // level-up sweep: pulled into the core
      g.r += (0 - g.r) * Math.min(1, sdt * C.collectPull);
      g.angle = (g.angle + sdt * 3) % TAU;
      if (g.r <= coreR * 0.3) { // reached the core: emit its ring-scaled score
        S.score += g.scoreVal;
        popup(cx, cy - 16, '+' + g.scoreVal, '#ffd97a', 30, 1.7);
        burst(cx, cy, 10, '#ffd97a', 1.8);
        S.golds.splice(i, 1);
      }
      continue;
    }
    if (g.hold > 0) { // forming inside the core while it compresses
      g.hold -= sdt;
      g.angle = (g.angle + sdt * 4) % TAU;
      g.r = coreR * 0.4 * Math.max(0, 1 - g.hold / C.pumpCompress); // growing toward the surface
      if (g.hold <= 0) { // the core just expanded: the gold is emitted from the core's edge
        g.ring = g.target; // g.r stays at the core; the glide below carries it out to its (weighted) ring
        for (let k = 0; k < 6; k++) { // directional eject of light along the gold's heading
          const a = g.angle + (Math.random() - 0.5) * 0.7;
          const s = 50 + Math.random() * 70;
          S.parts.push({ x: cx, y: cy, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.4 + Math.random() * 0.4, max: 1, col: '#ffd97a', size: 1 + Math.random() * 1.5 });
        }
      }
      continue;
    }
    g.angle = (g.angle + g.angVel * sdt) % TAU;
    g.stay -= Math.abs(g.angVel) * sdt;
    // "vibrate": shudder toward the next ring (outward) as the shell-hop nears
    const gTimeToHop = Math.abs(g.angVel) > 0.001 ? g.stay / Math.abs(g.angVel) : Infinity;
    g.vibe = gTimeToHop <= C.hopWarn ? Math.max(0, 1 - gTimeToHop / C.hopWarn) : 0;
    if (g.stay <= 0) {
      g.ring++;
      if (g.ring >= N) { // rides out past the outer ring: disappears
        const pp = project(g.angle, N - 1, maxR + 16); // just outside the outer ring's own tilt
        S.golds.splice(i, 1); burst(pp.x, pp.y, 6, '#cfe6ff', 0.8); continue;
      }
      g.stay = stayRad('gold'); // re-rolled for the new (outer) ring
    }
    g.r += (ringR[g.ring] - g.r) * Math.min(1, sdt * 9); // glide between rings (no quantum leap)
    const gp = pPos(g);
    if (!g.trail) g.trail = [];
    g.trail.push({ x: gp.x, y: gp.y, life: 1 }); // motion trail
    if (g.trail.length > 16) g.trail.shift();
    for (const t of g.trail) t.life -= sdt * 3.5;
    if (Math.hypot(gp.x - p.x, gp.y - p.y) < C.goldHitR) {
      S.golds.splice(i, 1);
      const gr = g.ring; // the catch's energy = how far out this gold is
      // gold behaves identically inside or outside the sanctuary: power + points, scaled by ring
      S.power = Math.min(pTarget(), S.power + C.goldGainByRing[gr]); S.score += C.goldValByRing[gr]; S.goldGot++;
      S.envTone = 1; S.coreFlare = 1; // the atom surges with the new power
      S.ringWaves.push({ t: 0, dur: 0.6, r0: coreR, r1: ringR[N - 1], rgb: '255,217,122', a: 0.55 }); // the surge radiates outward
      burst(gp.x, gp.y, 14, '#ffd97a', 1.8); sGold();
      popup(gp.x, gp.y - 16, '+' + C.goldValByRing[gr], '#ffd97a', 26, 1.6);
      shockFX('in'); sGain();
    }
  }

  // quasar (rare) — streaks in from the cosmos, settles on the outer ring, shell-hops inward
  if (S.quasar) {
    const q = S.quasar;
    q.angle = (q.angle + q.angVel * sdt) % TAU; q.ph += sdt * 5;
    if (q.fall > 0) { // falling in from the cosmos: streak from off-screen to the outer ring
      q.fall -= sdt;
      const ft = 1 - Math.max(0, q.fall) / C.quasarFallDur;
      q.r = lerp(q.r0, ringR[q.ring], 1 - Math.pow(1 - ft, 3)); // ease-out: fast entry, settle on the ring
    } else {
      q.stay -= Math.abs(q.angVel) * sdt;
      // "vibrate": shudder toward the next ring (inward) as the shell-hop nears
      const qTimeToHop = Math.abs(q.angVel) > 0.001 ? q.stay / Math.abs(q.angVel) : Infinity;
      q.vibe = qTimeToHop <= C.hopWarn ? Math.max(0, 1 - qTimeToHop / C.hopWarn) : 0;
      if (q.stay <= 0) {
        q.ring--;
        if (q.ring < 0) { S.quasar = null; S.pulses.push({ life: 1 }); } // missed: absorbed by the core
        else q.stay = stayRad('quasar');
      }
      if (S.quasar) q.r += (ringR[q.ring] - q.r) * Math.min(1, sdt * 9); // glide between rings
    }
    if (S.quasar) { // comet trail (long while falling, short once settled)
      const qp = pPos(S.quasar);
      S.quasar.trail.push({ x: qp.x, y: qp.y, life: 1 });
      if (S.quasar.trail.length > 24) S.quasar.trail.shift();
      for (const tt of S.quasar.trail) tt.life -= sdt * (q.fall > 0 ? 1.3 : 3);
      S.quasar.trail = S.quasar.trail.filter(tt => tt.life > 0);
      if (Math.hypot(qp.x - p.x, qp.y - p.y) < C.quasarHitR) { // catch: open a sanctuary
        S.quasar = null;
        S.sanc = { angle: S.e.angle, ph: Math.random() * TAU, sp: 0.5 + Math.random() * 0.7, t: 0,
          dur: clamp(C.sancDivisor / S.power, C.sancFloor, C.sancDivisor) }; // duration ∝ 1/power (floored)
        burst(p.x, p.y, 26, '#9fdcff', 3);
      }
    }
  } else {
    S.quasarT -= sdt;
    if (S.quasarT <= 0) {
      const a = Math.random() * TAU, fallFrom = Math.hypot(W, H) * 0.5 + 40; // just past the farthest corner
      S.quasar = { ring: N - 1, angle: a, angVel: angVelOf(S.heat), stay: stayRad('quasar'), ph: Math.random() * TAU,
        r: fallFrom, r0: fallFrom, fall: C.quasarFallDur, trail: [], vibe: 0 };
      S.quasarT = C.quasarMin + Math.random() * C.quasarVar; sQuasar();
    }
  }

  // sanctuary: orbit + slight irregular wobble, decay at the end
  if (S.sanc) {
    S.sanc.t += sdt;
    S.sanc.angle = (S.sanc.angle + (C.sancOrbit + C.sancWobble * Math.sin(S.sanc.ph += sdt * 0.9)) * sdt) % TAU;
    if (S.sanc.t >= S.sanc.dur) S.sanc = null;
  }

  // full charge -> begin the level-up collection (the whole board is sucked into the core)
  if (S.power >= pTarget() && !S.collecting) startCollect();
  if (S.collecting) {
    S.collecting.t += dt; // real-time sweep clock (drives the slow -> fast ramp)
    if ((S.photons.length === 0 && S.golds.length === 0) || S.collecting.t >= C.sweepCap) finalizeLevelUp();
  }

  for (const q of S.parts) { q.x += q.vx * sdt; q.y += q.vy * sdt; q.life -= sdt; q.vx *= 0.96; q.vy *= 0.96; }
  S.parts = S.parts.filter(q => q.life > 0);
  for (const q of S.pulses) q.life -= sdt * 1.6;
  S.pulses = S.pulses.filter(q => q.life > 0);
  for (const q of S.shocks) q.t += sdt;
  S.shocks = S.shocks.filter(q => q.t < q.dur);
  for (const q of S.sucks) q.t += sdt;
  S.sucks = S.sucks.filter(q => q.t < q.dur);
  for (const q of S.popups) { q.t += sdt; q.y -= C.popupRise * sdt; } // float up
  S.popups = S.popups.filter(q => q.t < q.dur);

  // hud
  $('score').textContent = Math.floor(S.score);
  $('time').textContent = Math.floor(S.t) + 's';
  $('lvl').textContent = 'LEVEL ' + S.level;
  {
    const pf = S.power / pTarget(), gc = gaugeColor(pf);
    $('gfill').style.width = clamp(pf * 100, 0, 100) + '%';
    $('gfill').style.background = gc;
    $('gfill').style.boxShadow = '0 0 12px ' + gc;
    $('pw').classList.toggle('low', pf < 0.22);
  }
  $('sanc').style.display = S.sanc ? 'block' : 'none';
  if (dev.on) {
    const drain = drainOf() * pTarget();
    $('dev').innerHTML = 'T ' + Math.floor(S.t) + 's · LVL ' + S.level + ' · UP ' + S.ups +
      '<br>PWR <b>' + S.power.toFixed(2) + '</b> / ' + pTarget().toFixed(2) + ' · HEAT ' + S.heat.toFixed(2) +
      '<br>DRAIN ' + drain.toFixed(3) + '/s · PHOTONS ' + S.photons.length + ' · GOLD ' + S.golds.length +
      '<br>DEATHS ' + S.deaths + (S.deathCause ? ' (' + S.deathCause + ')' : '');
  }
}

// cosmic condensation: fixed random directions/distances so a new red's motes stream in
// from the edges of the screen and coalesce onto it (deliberate, not a jitter)
const matSeeds = () => Array.from({ length: C.matMotes }, () => ({ a: Math.random() * TAU, d: 0.5 + Math.random() * 0.7 }));
export function spawnPhoton() {
  const a = Math.random() * TAU;
  S.photons.push({ ring: N - 1, angle: a, angVel: angVelOf(S.heat), stay: stayRad('photon'), trail: [], r: ringR[N - 1], matT: C.matDur, matSeeds: matSeeds(), vibe: 0 });
  if (S.level >= C.photonCompanionLvl && Math.random() < C.photonCompanionChance && S.photons.length < effPhotonMax()) // later levels: a close companion on the same ring (never past the cap)
    S.photons.push({ ring: N - 1, angle: a + 0.25, angVel: angVelOf(S.heat), stay: stayRad('photon'), trail: [], r: ringR[N - 1], matT: C.matDur, matSeeds: matSeeds(), vibe: 0 });
}
// which ring a gold is "emitted to": a weighted-random (inner-heavy) so the outer orbits
// get their own supply (an incentive to reach out) while most power stays near the core
function goldRing() {
  const w = C.goldRingWeights;
  let x = Math.random() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < w.length; i++) { x -= w[i]; if (x < 0) return Math.min(N - 1, i); }
  return N - 1;
}
export function spawnGold() {
  // the gold forms inside the core while it compresses, then is spit out and glides to its target ring
  const g = { ring: 0, angle: Math.random() * TAU, angVel: angVelOf(S.heat), stay: stayRad('gold'), trail: [], r: 0, hold: C.pumpCompress, target: goldRing(), vibe: 0 };
  S.golds.push(g);
  S.pump = C.pumpDur; // start the core's compress -> expand -> spit cycle
}
