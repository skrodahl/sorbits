# SorBits — Design Decisions Log

Running log of deliberate design decisions — including **emergent behaviors we
decided to keep**. Anything recorded here is *intended*; don't "fix" it away in
a later pass.

## D1 — Clockwise is faster than counter-clockwise (KEEP)

The electron's auto-orbit — "the current" — always runs **clockwise**. Steering
clockwise goes *with* the flow (fast); steering counter-clockwise fights it
(slow). So the dot moves noticeably faster clockwise than counter-clockwise.

- **Origin:** emergent from the auto-orbit + steering model. The base angular
  velocity (`av = 1.7 * Math.pow(ringR[0]/r, 1.3)`) is always positive
  (clockwise in canvas space); left-steer subtracts from it, right-steer adds.
  Measured net max speeds (ring 0→4): CW **4.30 / 3.45 / 3.14 / 2.98 / 2.90**
  vs CCW **−0.90 / −1.75 / −2.06 / −2.22 / −2.30** rad/s. The asymmetry is
  strongest on the inner ring, where counter-clockwise barely moves at all.
- **Decision:** keep it as a desired behavior (designer, 2026-09). It reads as a
  natural drift direction and makes the atom feel like a living, flowing
  system — the inner ring becomes a "fast-clockwise / nearly-still-CCW" zone.
- **Tuning notes:** adjust the auto-orbit speed (`av`), the steer accel (`4.5`),
  or the `angVel` clamp (`2.6`) to change the *amount* of asymmetry — but do
  **not** symmetrize it.

## D2 — The Sanctuary *absorbs* reds that enter it (KEEP)

When a red photon's angle is inside the active Sanctuary band, it is **removed
with a small desaturated poof — no power, no points.** It is not merely
"harmless on collision"; the wedge actively *cleans up* the reds it sweeps.

- **Origin:** designer call (2026-09). The Sanctuary previously only made reds
  *harmless while you were on top of them*; the reds kept orbiting, which read
  as "the wedge does nothing to them." Now the wedge is a real safe-cleanup zone.
- **Decision:** absorb, **no reward**. The Sanctuary's value is *safety +
  cleanup* — a window where the reds are cleared. *(Originally the "cost" was
  that gold caught inside was lost; that was later removed — see **D3** — so the
  Sanctuary is now a pure benefit: it cleans up reds and gold works normally in
  it.)*
- **Notes:** a red that enters the band is gone for good (it won't re-appear).
  The band is a slowly-orbiting ~70° sweep, so it cleans up reds over the
  Sanctuary's duration. No per-absorption SFX (avoids noise spam); visual poof
  only. The "fall into the core" auto-removal still applies to reds *outside*
  the band.

## D3 — Gold behaves the same inside and outside the Sanctuary (KEEP)

A gold packet caught inside the Sanctuary gives **the same power + points** as
one caught outside — no special "lost" case. The greyed-out "dead" gold visual
was removed with it.

- **Origin:** designer call (2026-09). The Sanctuary's original "cost" (gold
  caught in the band is destroyed, no power/points) was dropped.
- **Decision:** gold is **one unified rule** everywhere — catch it, you charge.
  The user's stated reason: it's the *easier mental model* (no "does this gold
  count?" exception to track). The Sanctuary's value is therefore the **red
  cleanup** (D2), not a gold trade-off.
- **Notes:** the Sanctuary is now a **pure benefit** window (cleans up reds,
  gold still charges). If balance ever needs the Sanctuary to have a downside,
   reintroduce a *different* cost (e.g. shorter god window, heat spike) rather
   than re-coupling it to gold.

## D4 — Sanctuary *intent*: an intuitive, cost-free escape/bonus (KEEP)

The Sanctuary is meant to read as an **escape** — a bonus window of safety. It
is deliberately **intuitive and cost-free**: reds are cleared, gold still
charges, and there are no "does this count?" exceptions. The user's words: it
"*behaves very intuitively*" as an escape.

- **Decision:** keep it that way. Don't add a downside or a special rule that
  makes the Sanctuary feel like a trap. Any future cost must be a *separate,
  obvious* mechanic (see D3 notes) so the "safe zone = good" intuition survives.
- **Why it matters:** this is the emotional core of the quasar mechanic — the
  player should *want* to catch the quasar because the result feels like
  relief, not a puzzle.

## D5 — Promote the validated mockup to a real Vite build (2026-09)

The single-file mockup (`mockups/orbit-feel/index.html`) was the design
prototype; the game now lives as a modular Vite project at **`sorbits/`**.

- **Decision:** port the validated mockup into `sorbits/` (Vite + ES modules),
  keeping the behavior **identical** and externalizing every tunable into
  `sorbits/src/config.js` (balance *and* visual levers, with plan-derived
  comments) so future tuning never touches the simulation/render code.
- **Module split:** `utils` (math + DOM), `config` (`C` + `gaugeColor`),
  `geometry` (canvas, layout, pose system, projection), `state` (`S` + rules
  helpers + `gameOver`), `audio`, `fx` (bursts + power-event FX), `update`
  (simulation step + spawners + `hop`), `render` (draw pass), `main`
  (bootstrap: input, flow, loop).
- **Why:** a real build is where the balance pass and further tuning happen;
  externalized config makes the dials from the plans editable in one place.
- **Note:** the mockup is kept as the design artifact of record; `sorbits/`
  is the active build. Behavior parity was verified in-browser (all systems:
  gauge, level-up sweep, ring-capture + glide, sanctuary + trails, audio,
  dev overlay) with zero frame errors.

## D6 — Arcade pass: gratifying level-up collect, time-ticker score, collision popups (2026-09)

The "god mode" window was **removed** and replaced with an arcade loop.

- **Level-up (was god mode):** filling the power gauge triggers a **cinematic
  "collection"** — not an instant clear. The whole board is **sucked into the
  core one particle at a time**, each emitting its score as a big arcade popup.
  It **starts in slow-motion (bullet-time) and ramps to a fast rush**, so the
  finish is a satisfying convergence. It runs **until the board is empty** —
  *every* particle visibly reaches the core — then the level bumps and power
  resets to ~⅓ of the new (larger) target. Drain and spawns pause for the
  collection's duration (the atom is in a reward state); a soft edge-vignette
  focuses the eye on the core. Tuned via:
  - start speed `slowMo` 0.3 → finish speed `sweepBoost` 2.2, ramped over
    `sweepRamp` 1.6s; `collectStagger` 0.4s drip between pulls; `collectPull` 5
    approach constant (multiplied by the live sweep speed); `sweepCap` 10s safety.
- **Easy early, steep late:** `targetBase` 0.25 keeps early level-ups quick and
  flowy (designer: early leveling should be this easy); `targetGrowth` 1.25
  makes each level's target larger so the game ramps up naturally.
- **Score tied to time:** score accrues on a **time ticker scaled by level**
  (`survivalVal × level` pts/s); catches still add on top. The timer is a
  hero HUD number alongside a big score and a big level indicator.
- **Collision popups:** gold catches emit a floating score = the **ring value**
  (`+1/5/10/15/25`, see **D7**); red hits emit a floating `DAMAGE` (word, no
  score penalty — damage only drains power); the level-up sweep emits each gold's
  ring value and a flat `+10` per red (see **D7**).
- **Why:** the designer wanted it "more arcade" — readable at a glance, with
  numbers flying on every collision and a *satisfying, savorable* board-collect
  payoff at each level (first pass was too quick to enjoy; slowed the pull so
   you can watch the board get reaped). Sweep values live in `config.js`
   (`collectRed/collectStagger/collectPull/slowMo/sweepBoost/sweepRamp/
   sweepCap`); scoring values in **D7**.

## D7 — Ring-energy scoring: farther out = more value, more risk (2026-09)

Particles have **more energy the further out they are from the core**, so both
their reward and their threat scale with ring (index 0 = inner … 4 = outer).

- **Gold value by ring:** a gold catch scores `goldValByRing`
  `[1, 5, 10, 15, 25]` and charges the gauge by `goldGainByRing`
  `[0.02, 0.05, 0.09, 0.14, 0.22]` (both inner→outer). The power ramp is
  deliberately steep: the inner ring charges slowly (so staying in is a slow
  grind), while the outer ring charges fast — going out is a real risk/reward.
- **Red damage by ring:** a red hit drains `redLossByRing`
  (keyed to the electron's ring). Inner hits are a mild nudge; outer hits are a
  heavier drain. *(**D11** superseded the absolute values: the drain is now a
  FRACTION of the current gauge — see **D11**.)*
- **Level-up sweep scoring:** each swept gold scores **its own ring value**
  (frozen at sweep start), each swept red scores a flat `+10` (`collectRed`).
  Replaces the old flat `+125` per gold — the payoff now ties to where the gold
  actually is.
- **Why:** the designer wanted ring position to be a *choice* — push out for
  high-energy gold, accept the higher risk of outer-ring reds. All values live
  in `config.js` (`goldValByRing`, `goldGainByRing`, `redLossByRing`,
  `collectRed`).

## D8 — Arcade spawn/entry effects (2026-09)

Presentational polish: each particle now has a distinct "arrival" so the board
reads as alive and the cosmos feels active.

- **Reds "materialize" from the cosmos:** a new red takes its time — a dozen
  motes stream in from the edges of the screen (the "entire cosmos") and
  coalesce onto the photon over a deliberate `matDur` (1.2s); the photon body
  fades in as it forms and is *not a hazard until fully materialized*.
- **Gold is "spat" out of the core:** when a gold spawns, the core physically
  **compresses** (shrinks) for `pumpCompress` (0.3s) — the gold forms inside
  it — then **expands** past full size and settles (`pumpDur` 0.7s), launching
  the gold out with a directional eject of light. The core visibly squishes and
  blows up to spit the power, not just emit a ring.
- **Quasars are falling stars:** a quasar streaks in from off-screen (just past
  the farthest corner) onto the outer ring over `quasarFallDur` (0.9s), trailing
  a comet tail (long while falling, short once settled) — an incoming shooting
  star, not a pop-in.
- **Why:** the designer wanted "more arcade-y" visuals — arrivals should be
  events you notice, not silent spawns. Values: `matDur`, `matMotes`, `pumpDur`,
  `pumpCompress`, `quasarFallDur` in `config.js`; effects in `update.js`
  (spawn + motion) and `render.js` (draw).

## D9 — The environment reacts, not the frame (2026-09)

Feedback should read as the *place* responding, not a UI overlay blinking.
The full-screen red/gold washes (`S.flash`, `S.gflash`) are gone; instead the
cosmos and the atom itself respond:

The two reactions are **symmetric but opposite** — mirror images, equal
magnitude, opposite direction — and none of them cover the play area:

- **The cosmos = the room's lights** (`S.envTone`, signed, drives a subtle
  star/dust `mood`): a surge (gold caught / power-up) flares the stars up; a
  wound dims them. Just a nudge on the star field — never a full-frame wash.
- **The core reacts, mirrored** (`S.coreRecoil`, `S.coreFlare`, same short
  decay): a wound makes it flinch (shrink + dim, −0.2 / −0.22); a surge makes
  it flare (swell + brighten, +0.2 / +0.22) — equal and opposite.
- **The membrane ripples, mirrored** (`S.ringWaves[]`): a wound's red ripple
  closes *in* on the core; a surge's gold pulse radiates *out* from the core.
  Drawn on the interpolated ring pose (`ringPoseAtR`) so it follows the ring
  stack.
- **Why:** the designer found whole-frame overlays (and the first pass's
  additive warm glow) cheap, and too strong to see the atom through. Reactions
   live in the atom + star field, not the frame. State in `state.js`; triggers
   in `update.js` (red hit, gold catch, level-up); reactions in `render.js`.
   Screen shake is kept (an impact cue, not a wash).

## D10 — Fair-warning hops + gold emitted to every ring, inner-weighted (2026-09)

Two fairness/pressure changes, both aimed at the "you can camp the inner ring"
problem:

- **Every particle telegraphs its hop** (the electron is the only thing that
  hops instantly — it's you): in the last `hopWarn` (3.0s) before any particle
  shell-hops, it **shudders toward its next ring** (radial jitter,
  `hopVibeAmp` 5px at full urgency, `hopVibeFreq` 8Hz) and a pulsing warning
  ring in its own color grows around it. Reds and the quasar hop *inward*
  (shudder inward; red / cyan ring); gold hops *outward* (shudder outward;
  gold ring). Urgency ramps linearly as the hop moment approaches (`vibe` is
  derived from `timeToHop = stay / |angVel|` each frame, per particle).
  Purely visual — collision checks still use each particle's real position.
  A particle that looks angry is a particle about to change orbit.
- **Gold is emitted to *any* ring, weighted to the inner three**
  (`goldRingWeights` `[0.40, 0.30, 0.20, 0.07, 0.03]`): the core still spits
  out every gold (the pump beat from **D8** is unchanged), but the packet
  glides outward to its weighted target ring instead of always settling on
  ring 0. So the outer rings get their own gold supply — a reason to venture
  out — while ~90% of power still lands close to the core. Outer-ring golds
  are *rare on purpose* (they also drift off the orbits fastest; the weight
  keeps them from starving the inner game).
- **Why:** the designer's read — gold always arriving on the innermost ring
  means you can survive forever on ring 0 and the outer rings never see any
  gold   ("they get starved"). Weighted emission plus the hop warning
  makes staying in a *choice*, not a free lunch. Values in `config.js`
  (`goldRingWeights`, `hopWarn`, `hopVibeAmp`, `hopVibeFreq`); weighted pick
  in `update.js` (`goldRing()`), vibration state on every particle (per-frame
  `timeToHop`), shared `hopPos`/`hopWarnRing` draws in `render.js`.

## D11 — Early-curve relief: red hits drain a FRACTION of the gauge (2026-09)

With **D10** pushing the electron outward, level 1 became "hope I survive":
red damage was an **absolute** value, so an outer-ring hit at L1
(0.31 / 0.50) exceeded the whole L1 gauge (0.25) — **one-shot on rings 3–4 at
any power** — while ~6 fast reds orbited at once and inner golds trickled
(8% of the gauge each).

- **Red hits drain a *fraction* of the current gauge** (D7's absolutes
  retired): `redLossByRing` is now `[0.12, 0.18, 0.26, 0.34, 0.45]`, applied
  as `× pTarget()`. The outer ring stays the scariest (45% of whatever gauge
  you have — never a one-shot at full power), the ring-risk gradient is
  preserved, and the feel is identical at every level (late-game hits stop
  scaling into trivial nudges).
- **Calm the early swarm:** red spawn interval `4.5 − 3×heat` →
  `redSpawnBase` 5.5 `− redSpawnHeatSlope` 3×heat — L1 goes ~3.75 s between
  reds (~6 concurrent) to ~4.75 s (~4 concurrent); late-game surges stop
  being a red storm (heat 1.3 → 1.6 s instead of 0.6 s).
- **Slow the board:** `angVel` range 0.9–1.6 → 0.8–1.25 — calmer orbits for
  reds *and* golds (slightly slower power supply), and it gives D10's 3 s
  hop-warning room to actually be read.
- **Why:** the designer's read — L1 must not be "hope I survive"; the outward
  incentive (D10) must not be punished with one-shots. Values in `config.js`
  (`redLossByRing`, `redSpawnBase`, `redSpawnHeatSlope`, `angVelMin/Max`);
  fraction application in `update.js` (photon hit).

## D12 — Gentle speed start with a per-level ramp (2026-09)

Even after D11's slower board, the earliest levels still felt frantic — and
the speed model had no "slow start" in it at all: heat (the only speed
driver) already begins at 0.25 at L1.

- **Explicit level speed factor** (`speedLvlBase` 0.35, `speedLvlGrow` 0.11,
  capped at 1.0, applied in `angVelOf` to reds, golds, and the quasar):
  L1 particles run at 35% speed (inner-ring lap ~20 s), ramping ~+11% per
  level to full speed by ~L7. New spawns pick up the current level's factor
  (existing particles keep their spawn-time speed).
- **Shortened red orbits** (`redOrbitsMin/Max` 0.35/0.9 → 0.25/0.55): slower
  reds would otherwise linger ~2× longer per ring and crowd the early board;
  the shorter dwell keeps L1 at a few concurrent reds, and the 3 s hop-warning
  (D10) stays a meaningful slice of each ring's stay.
- **Why:** the designer's read — "a lot slower to start with, ramping gently
  up over the levels." Early levels are now a slow, readable drift; pace
  builds with the level, matching the target-growth ramp. Values in
  `config.js` (`speedLvlBase`, `speedLvlGrow`, `redOrbitsMin/Max`); factor
  in `state.js` (`angVelOf`). *(**D14** superseded the monotonic `speedLvlGrow`
  ramp with a 10-tier sawtooth cycle + absolute cap — see **D14**.)*

## D13 — Readability cap: late game = faster, not thicker (2026-09)

At L5 the board measured **~9 concurrent reds** and still climbing: heat
1.3 compressed the spawn interval to ~1.6 s, `redStayLvlGrow` 0.34 made reds
linger 2.36× longer, and 30 % of spawns added a companion. A wall of reds
reads as *luck* — no situation is readable, so no skill applies.

- **Hard readability cap** (was `photonMax: 6`): the board never holds more
  reds than the cap; spawns skip while full and refill the moment a slot
  opens. Worst-case density is bounded by design. *(**D15** made the cap
  level-dependent: 3 for L1–10, +1 per 10-level block.)*
- **`redStayLvlGrow` 0.34 → 0.10**: late reds no longer linger 2.36× — the
  late-game board *churns* instead of clogging.
- **Companion spawn 0.3 → 0.15** (`photonCompanionLvl`/`photonCompanionChance`
  externalized): fewer double-red surprises.
- **`redSpawnHeatSlope` 3.0 → 2.0**: surges stop being red-storms (L5
  interval 1.6 s → 2.9 s).
- **Resulting design intent:** late-game intensity comes from **pace** —
  L5 reds move ~2.3× faster than L1's within the same ≤6 cap — a *tempo*
  wall, not a *number* wall. Measured before: ~9 concurrent at L5; target
  after: ~5, bounded at 6. Values in `config.js` (`photonMax`,
  `photonCompanionLvl/Chance`, `redStayLvlGrow`, `redSpawnHeatSlope`); cap
  gate in `update.js` (spawner).

## D14 — Sawtooth speed cycle: gentle start, 10-tier ramp, absolute cap (2026-09)

At L6 the compounding ramps (level factor × heat multiplier) pushed particles
to ~1.8 rad/s — "light speed," uncatchable, pure reflex. The fix: stop
speed from compounding, and make pace a *cycle*, not a one-way ratchet.

- **Absolute cap** (`angVelAbsMax: 1.0`): no particle ever exceeds 1.0 rad/s
  (min ~6.3 s lap). A one-line raise to 1.2 if the game proves too easy.
- **10-tier sawtooth** (`speedCycleLen: 10`, `speedLvlBase` 0.35 →
  `speedPeakFactor` 1.0): the speed factor ramps gently across a 10-level
  block (L1→L10), then **resets** to the slow tier at L11, L21, … Late-game
  tension comes from the gauge, red density (D13), and spawn tempo — not from
  ever-increasing, unreadable speed.
- **Flattened heat→speed coupling** (`heatSpeedFloor` 0.9 +
  `heatSpeedSlope` 0.1, replacing `0.8 + 0.5×heat`): a heat surge now moves
  board speed ~3 % instead of ~18 % — surges press *density/drain*, no
  longer lurch the whole board faster (the "what just happened" confusion).
- **Resulting pace:** L1 a gentle ~14–22 s lap → L10 hits the 1.0 cap
  (~6.3 s lap) → L11 snaps back to the slow tier → L20 hits the cap again.
   The old L6 "light speed" (≈1.8 rad/s) becomes a capped ~0.89 — catchable.
   Values in `config.js` (`angVelAbsMax`, `speedCycleLen`, `speedLvlBase`,
   `speedPeakFactor`, `heatSpeedFloor`, `heatSpeedSlope`); model in
   `state.js` (`angVelOf`).

## D15 — Red cap follows the 10-level blocks: 3 early, +1 per block (2026-09)

The flat D13 cap (6 reds at every level) left the early game too busy. The cap
now scales with the D14 speed cycle — each 10-level block opens *slow and
sparse* and closes *fast and denser*, so difficulty rises as a readable step
function instead of a constant wall.

- **`effPhotonMax()` = `photonMaxBase` (3) + `floor((level−1) /
  photonMaxCycle (10))`** → L1–10: **3** reds, L11–20: **4**, L21–30: **5**,
  L31–40: **6**, and so on.
- **Why:** the designer's read — level 1–10 should be a *readable* board (3
  reds against D14's slow tiers, plenty of planning room), and pressure should
   then grow **+1 red every 10 levels**, in lockstep with the speed sawtooth
   (a block's slow tier is sparse *and* slow; its peak tier is dense *and*
   fast). The helper is in `state.js`; the cap gate (spawner + companion) is in
   `update.js`. Values in `config.js` (`photonMaxBase`, `photonMaxCycle`).

## D16 — The 10-level block is the difficulty cycle: everything resets, only the red cap steps (2026-09)

D14/D15 reset the *speed* tier and step the *red cap* every 10 levels, but the
power economy still ran on **absolute level**: the gauge target compounded
(`1.25^(L−1)` → L11's gauge was 9.3× L1's), base heat clamped at 1.0 from L4,
gold supply and particle dwell scaled with absolute level. So block 2 (L11–20)
was strictly harder than block 1 — the L12 gauge net-fill rate even went
negative (catch-everything supply < drain), making the meter near-unfillable.

- **Decision:** ALL difficulty ramps run on `cyclePos() = (level−1) %
  speedCycleLen`, not absolute level: `pTarget()`, base heat, gold spawn
  interval, gold on-board cap, gold/red dwell, and the companion-spawn gate.
  Each 10-level block now **mirrors the previous one exactly** — same gauge
  sizes, heat curve, supply, and speeds — with the **only** block-to-block step
  being the red cap (+1, D15).
- **In-block shape unchanged:** L1–10 play is identical to pre-D16 (within a
  block `cyclePos == level−1`): the gauge grows ×1.25/level, heat ramps up and
  clamps, gold supply accelerates, and the speed tier climbs to the cap — a
  gentle-start, steep-close block, repeated.
- **Why:** the designer's read — "level 11–20 should have exactly the same
  difficulty as 1–10, the only difference being that a 4th red can be on
  board." Difficulty rises as a readable step function (the red cap), not a
  one-way ratchet in the economy.
- **Superseded:** the economy levers' "per level" comments now mean "per level
  *within the block*"; `photonCompanionLvl` is a 1-based block-position gate.
  Values: `config.js` (`speedCycleLen` is the block length); helpers in
  `state.js` (`cyclePos`, `pTarget`, `goldSpawnIv`, `effGoldMax`, `stayRad`,
  `angVelOf`); base heat + companion gate in `update.js`.
