import { C } from './config.js';
import { TAU, clamp, rand, $ } from './utils.js';
import { ringR, N, project, angDiff } from './geometry.js';

// Mutable game state (shared by reference across modules — mutate properties,
// never reassign S itself).
export const S = {
  over: false, paused: false, t: 0, score: 0, goldGot: 0,
  power: C.resetFraction * C.targetBase, level: 1, heat: 0.25,
  ups: 0, deaths: 0, deathCause: null,
  invuln: 0, slowT: 0, shake: 0, lastDamage: null, pump: 0,
  envTone: 0, coreRecoil: 0, coreFlare: 0, // environment reactions: +surge / −wound, core flinch / flare
  collecting: null, // active level-up collection window { t, dur } — board is being sucked into the core
  surge: 0, surgeT: 5,
  e: { ring: 1, angle: -Math.PI / 2, r: 0, angVel: 0, trail: [] },
  photons: [], golds: [], parts: [], pulses: [], shocks: [], sucks: [], ringWaves: [],
  popups: [],
  quasar: null, quasarT: 14,
  sanc: null,
  spawnT: 2.5, goldT: 1.5,
};

export const keys = { l: false, r: false }; // held steer keys
export const dev = { on: false };           // dev stats overlay toggle (F)

export function reset() {
  S.over = false; S.t = 0; S.score = 0; S.goldGot = 0;
  S.level = 1; S.power = C.resetFraction * pTarget(); S.heat = 0.25;
  S.ups = 0;
  S.invuln = 1.2; S.slowT = 0; S.shake = 0; S.lastDamage = null; S.pump = 0;
  S.envTone = 0; S.coreRecoil = 0; S.coreFlare = 0;
  S.collecting = null;
  S.surge = 0; S.surgeT = 6;
  S.e = { ring: 1, angle: -Math.PI / 2, r: ringR[1], angVel: 0, trail: [] };
  S.photons = []; S.golds = []; S.parts = []; S.pulses = []; S.shocks = []; S.sucks = []; S.ringWaves = [];
  S.popups = [];
  S.quasar = null; S.quasarT = C.quasarMin;
  S.sanc = null; S.spawnT = 3; S.goldT = 1.5;
}

// ---- rules helpers (depend on S + C) ----
export function pTarget() { return C.targetBase * Math.pow(C.targetGrowth, S.level - 1); } // "full" mark for the current level
export function drainOf() { return C.drainBase + C.drainHeatSlope * clamp(S.heat, 0, 1.5); } // drain (frac of target/s): gentle early → steep late
export function goldSpawnIv() { return Math.max(1.2, C.goldSpawn * (1 - C.goldSpawnLvlDecay * (S.level - 1))); } // supply scales up with level
export function effGoldMax() { return Math.min(7, C.goldMax + C.goldMaxLvlGrow * (S.level - 1)); }
export function effPhotonMax() { // D15: red cap — base for L1–10, +1 per 10-level block
  return C.photonMaxBase + Math.floor((S.level - 1) / C.photonMaxCycle); }
export function angVelOf(heat) { // D14: 10-tier sawtooth speed cycle + absolute cap
  const dir = Math.random() < 0.5 ? -1 : 1;
  const cyclePos = (S.level - 1) % C.speedCycleLen; // position within the current 10-level block (0..9)
  const tier = C.speedLvlBase + (C.speedPeakFactor - C.speedLvlBase) * (cyclePos / (C.speedCycleLen - 1));
  const heatM = C.heatSpeedFloor + C.heatSpeedSlope * clamp(heat, 0, 1.3); // flattened: surges nudge, no lurch
  return dir * Math.min(C.angVelAbsMax, rand(C.angVelMin, C.angVelMax) * heatM * tier); }
export function stayRad(type) {
  let o;
  if (type === 'gold') o = rand(C.goldOrbitsMin, C.goldOrbitsMax) * Math.max(0.35, 1 - C.goldStayLvlDecay * (S.level - 1));
  else if (type === 'quasar') o = rand(C.quasarOrbitsMin, C.quasarOrbitsMax);
  else o = rand(C.redOrbitsMin, C.redOrbitsMax) * (1 + C.redStayLvlGrow * (S.level - 1));
  return o * TAU;
}
export function inSanc(angle) { return S.sanc && Math.abs(angDiff(angle, S.sanc.angle)) < C.sancHalf; }
export function ePos() { return project(S.e.angle, S.e.ring, S.e.r); }

// game over: the atom's coherence hit zero (decay) or was ionized by a photon
export function gameOver() {
  S.over = true; S.deaths++; S.deathCause = S.lastDamage;
  $('cause').textContent = S.lastDamage === 'photon' ? 'ionized by a photon' : 'coherence decayed';
  $('stats').textContent = 'level ' + S.level + ' · survived ' + Math.floor(S.t) + 's · score ' + Math.floor(S.score);
  $('over').classList.remove('hidden');
}
