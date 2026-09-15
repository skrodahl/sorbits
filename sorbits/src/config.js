import { clamp } from './utils.js';

// Sorbits — tunable values.
// Everything the designers tweak lives here; game logic reads from this object
// so balance changes never require touching the simulation/render code.
//
// Values are the mockup's tuned starting points (see docs/plans/*). Treat them
// as first guesses to be re-validated in the real build's tuning loop.

export const C = {
  // ---- power gauge (gas tank): continuous, forgiving; target grows per level (easy early, steep late)
  drainBase: 0.0015,             // floor drain (fraction of target/s) — very forgiving early
  drainHeatSlope: 0.017,         // extra drain per unit of heat — steepens into surges / late levels
  resetFraction: 0.34,           // gauge resets to ~⅓ on level-up
   targetBase: 0.25, targetGrowth: 1.25, // "full" mark grows each level WITHIN the 10-level block, then resets (D16)
  // particles have more energy the further out they are: value (and damage) scale by ring.
  // ring index 0 = inner (low energy) .. 4 = outer (high energy).
  goldGainByRing: [0.02, 0.05, 0.09, 0.14, 0.22], // power a gold catch charges, by ring (inner slow, outer fast)
  redLossByRing:  [0.12, 0.18, 0.26, 0.34, 0.45], // FRACTION of the current gauge a red hit drains, by ring (D11: outer = scary, never a one-shot)
  goldSpawn: 2.2, goldMax: 4,
   goldSpawnLvlDecay: 0.15,       // per level within the block, gold spawns faster (supply keeps up with target)
   goldMaxLvlGrow: 1,             // per level within the block, one more gold may be on screen
  goldRingWeights: [0.40, 0.30, 0.20, 0.07, 0.03], // which ring each gold is "emitted to" (inner-heavy); the outer incentive
  goldValByRing: [1, 5, 10, 15, 25], // score for a gold catch, by ring (inner->outer)
  collectRed: 10,                 // score for a red swept at level-up (always flat; golds use their ring value)
  collectStagger: 0.4,       // real-s delay between each particle starting to be pulled into the core
  collectPull: 5,            // approach constant into the core; the live sweep speed multiplies it
  slowMo: 0.3,               // sweep START speed (bullet-time); also the damage hit-stop factor
  sweepBoost: 2.2,          // sweep FINISH speed (a rush) — late particles fly into the core
  sweepRamp: 1.6,           // real-s over which the sweep speed ramps from slowMo -> sweepBoost
  sweepCap: 10,            // safety cap (real-s): if the board isn't empty by then, finalize anyway
  survivalVal: 10,              // time-ticker base (pts/s), scaled by level in the loop
  popupRise: 55,                // popup rise speed (px/s) — how far the numbers float up
  photonTrail: 0.5,

  // ---- lives (hearts): losing power drops a heart and revives with base power; +1 heart every 10 levels
  livesStart: 3, livesMax: 5, livesLevelStep: 10,

  // ---- sanctuary (quasar-triggered): an intuitive, cost-free escape window (see decisions D4)
  sancFloor: 6, sancDivisor: 24, sancHalf: 0.62, sancOrbit: 0.22, sancWobble: 0.14,

  // ---- quasar (rare beacon that opens the sanctuary) — falls in from the cosmos
  quasarMin: 22, quasarVar: 13,
  quasarFallDur: 0.9,        // real-s the quasar takes to streak in from off-screen to the outer ring
  matDur: 1.2,               // real-s a red photon takes to "materialize" — a deliberate condense-in from the cosmos
  matMotes: 14,              // cosmic motes that stream in from the edges and coalesce into a new red
  pumpDur: 0.7,             // total time of the core "pump": compress -> expand -> spit the gold out
  pumpCompress: 0.3,        // how long the core compresses before it expands to spit the gold

  // ---- collision radii
  photonHitR: 14, goldHitR: 17, quasarHitR: 18,

  // ---- red spawn: base interval at calm heat, compressed by heat (calmer early, denser in surges)
  redSpawnBase: 5.5,        // real-s between reds at calm heat
  redSpawnHeatSlope: 2.0,   // seconds shaved off the interval per unit of heat (D13: gentler surge compression)
  photonMaxBase: 3,         // D15: red cap for levels 1–10 — a readable board
  photonMaxCycle: 10,       // D15: +1 red allowed per 10-level block (L11–20: 4, L21–30: 5, ...)
   photonCompanionLvl: 3,    // block-position gate (1-based) for the "close companion" double-spawn
  photonCompanionChance: 0.15, // D13: was 0.3 — less double-red surprise
  // ---- ring-capture motion: particles orbit a ring a random number of turns, then shell-hop
  angVelMin: 0.8, angVelMax: 1.25, // D11: slower board (affects reds AND golds)
  // D14: sawtooth speed cycle — a gentle start that ramps over 10 levels, then resets
  angVelAbsMax: 1.0,               // absolute cap on particle angular speed (raise to 1.2 if too easy)
   speedCycleLen: 10,              // length of the difficulty block (D16): the speed tier, gauge, heat, and supply all reset at L11, L21, ...
  speedLvlBase: 0.35,             // slow-start factor (tier 1 of each cycle): very gentle orbits
  speedPeakFactor: 1.0,           // peak factor (tier 10 of each cycle): reaches the cap
  heatSpeedFloor: 0.9,            // D14: flattened heat→speed coupling — surges nudge, no longer lurch
  heatSpeedSlope: 0.1,
  goldOrbitsMin: 1.4, goldOrbitsMax: 2.6,      // gold lingers (long)
  redOrbitsMin: 0.25, redOrbitsMax: 0.55,      // reds are quick (short) — D12: shortened so slow early reds don't crowd the board
  quasarOrbitsMin: 0.6, quasarOrbitsMax: 1.4,
   goldStayLvlDecay: 0.16,                     // per level within the block, gold stays shorter
   redStayLvlGrow: 0.10,                        // per level within the block, reds stay longer (D13: gentle — late game = faster, not thicker)
  // any particle about to shell-hop (reds/quasar inward, gold outward) "vibrates"
  // (shudders toward its next ring) as a warning — the electron hops instantly, so only particles do
  hopWarn: 3.0,         // real-s of shudder before the hop
  hopVibeAmp: 5,         // px of inward shudder at full urgency
  hopVibeFreq: 8,        // Hz of the shudder
};

// The one "how am I doing" indicator: 0=red, 0.5=amber, 1=cyan.
export function gaugeColor(f) {
  f = clamp(f, 0, 1);
  const stops = [[255, 93, 122], [255, 180, 84], [75, 232, 255]];
  const seg = f < 0.5 ? 0 : 1, t = f < 0.5 ? f / 0.5 : (f - 0.5) / 0.5, a = stops[seg], b = stops[seg + 1];
  return 'rgb(' + Math.round(a[0] + (b[0] - a[0]) * t) + ',' +
         Math.round(a[1] + (b[1] - a[1]) * t) + ',' +
         Math.round(a[2] + (b[2] - a[2]) * t) + ')';
}
