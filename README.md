# SORBITS

**Keep the atom coherent.** A single-player browser game where you pilot one
electron inside a living atom: dodge red photons, harvest gold power packets
spat out of the core, and keep the atom's coherence (power) gauge from hitting
zero. No framework — plain ES modules, Canvas 2D, and Web Audio.

## Launching

The game lives in `sorbits/`. Requirements: Node.js (dev dependency: Vite only).

```bash
cd sorbits
npm install            # once

# dev server with hot reload (Vite default port)
npm run dev            # -> http://localhost:5173

# the port used by the tuning workflow (binds all interfaces; see NetBird below)
npm run dev -- --port 3333 --strictPort
```

- **Local:** open the printed URL (`http://localhost:3333`) and click to play.
- **Remote (NetBird):** the dev server binds all interfaces with
  `allowedHosts: true` (`sorbits/vite.config.js`), so on the NetBird network it
  is reachable at **`http://ai-skrodahl.netbird.cloud:3333`**.
- **Production build:** `npm run build` writes `sorbits/dist/` with relative
  asset paths (`base: './'`), so it runs from any static host;
  `npm run preview` serves the build locally for a smoke test.

The repo also contains the design history — `mockups/` (the original
single-file prototype) and `docs/` (plans + the decision log; see below).

## How to play

You are the electron (the bright cyan dot with the comet trail). You ride one
of **five orbit rings** around the glowing core.

| key | action |
|---|---|
| `↑` / `↓` (or `W`/`S`) | hop to the outer / inner ring (wraps) |
| `←` / `→` (or `A`/`D`) | steer along the ring (inertial — you keep drifting) |
| `M` | sound on/off |
| `F` | dev stats overlay (live drain, heat, counts, death causes) |
| `Esc` | back to menu · `R` | retry after game over |

**The loop:**

- **Power gauge (bottom):** drains continuously (faster as the atom heats up).
  At zero the signal is lost — that's game over.
- **Gold (amber):** the core periodically *pumps* a gold packet out; it glides
  to its ring and orbits. Catch one to charge the gauge. Farther-out gold is
  worth more score and more power (ring values 1/5/10/15/25).
- **Red photons:** condense in from the cosmos, orbit, and shell-hop inward.
  One touches the electron and it drains a fraction of your gauge — the
  fraction grows with which ring you're on (12 % inner … 45 % outer).
- **Full gauge → level up:** the whole board is sucked into the core in a
  bullet-time sweep that ramps into a rush (every particle scores as it's
  reaped). The level bumps, the gauge target grows, and you restart at ~⅓.
- **Quasar (pale blue falling star):** rare; catch it to open a **Sanctuary**
  wedge that orbits the atom and *absorbs* the reds that enter it — a
  cost-free cleanup window.

**Reading the board:** every particle that is about to change rings
**shudders toward its next ring and grows a pulsing warning ring** in the
last 3 s of its orbit (reds/quasar shudder inward, gold outward). The electron
is the only thing that moves instantly — it's you.

## The difficulty model

Difficulty is a deliberate, readable step function built from two 10-level
blocks that run in lockstep (see `docs/decisions.md` D11–D15):

- **Speed sawtooth:** particle speed ramps gently from a slow start to a cap
  over levels 1–10, then **resets** to the slow tier at L11 and ramps again
  through L20 — and so on. An absolute cap (`angVelAbsMax: 1.0` rad/s) means
  no level is ever unreadable. Within a block: the start is *slow and
  sparse*, the top is *fast and dense*.
- **Red cap blocks:** the board holds at most 3 concurrent reds at L1–10, and
  gains +1 red per subsequent 10-level block (L11–20: 4, L21–30: 5, …).
  Pressure comes from pace and the growing gauge target, never from a
  screen-filling wall of reds.

The feel targets, in the designer's words: L1–10 should be a readable climb
with L10 as the "boss level"; crossing it grants relief (speed reset) plus
one more red on the board.

## Tuning

Every tunable — balance *and* visuals — lives in one file:
`sorbits/src/config.js`. No game-logic file needs to change for a balance
pass. The high-leverage knobs:

| knob(s) | effect |
|---|---|
| `angVelAbsMax`, `speedLvlBase`, `speedPeakFactor`, `speedCycleLen` | speed ceiling + the sawtooth ramp |
| `photonMaxBase`, `photonMaxCycle` | red cap per 10-level block |
| `redLossByRing` | red-hit drain (fraction of gauge, by ring) |
| `goldValByRing`, `goldGainByRing` | gold score / power, by ring |
| `goldRingWeights` | which ring each gold is emitted to (inner-heavy) |
| `redSpawnBase`, `redSpawnHeatSlope` | red spawn tempo (compressed by heat) |
| `hopWarn`, `hopVibeAmp`, `hopVibeFreq` | the pre-hop shudder + warning ring |
| `targetBase`, `targetGrowth`, `drainBase`, `drainHeatSlope` | gauge size / drain curve |
| `matDur`, `matMotes`, `pumpDur`, `quasarFallDur` | the "arrival" theatrics |

The decision log (`docs/decisions.md`, D1–D15) records *why* each system is
shaped the way it is — including emergent behaviors we deliberately kept — so
a future tuning pass doesn't accidentally "fix" an intended behavior.

## Project layout

```
atom/
├── README.md                  ← this file
├── docs/
│   ├── decisions.md           ← design decision log (D1–D15)
│   └── plans/                 ← earlier balance/power/look-feel plans
├── mockups/                   ← the original single-file prototype (artifact of record)
└── sorbits/                   ← the game (Vite + ES modules, Canvas 2D, Web Audio)
    ├── index.html             ← canvas + HUD + menu/overlays (+ headless #timer shim)
    ├── vite.config.js         ← relative base; binds all interfaces (NetBird)
    └── src/
        ├── config.js          ← ALL tunables (the tuning surface)
        ├── utils.js           ← math + DOM helpers
        ├── geometry.js        ← canvas, 3D pose system, ring projection
        ├── state.js           ← mutable state S + rules helpers
        ├── update.js          ← simulation step, spawners, level-up sweep
        ├── render.js          ← the draw pass
        ├── fx.js / audio.js   ← bursts / Web Audio synths
        └── main.js            ← bootstrap: input, flow, loop
```

## Dev notes

- `F` in-game shows the dev stats overlay (drain, heat, photon/gold counts,
  death cause) — the fastest way to sanity-check a balance change.
- Appending `#timer` to the URL drives the game loop on timers instead of
  `requestAnimationFrame`, so the sim keeps running in headless/automated
  tabs (used for automated play-tests). Inert in normal play.
- Config edits hot-reload through Vite; no restart needed.
