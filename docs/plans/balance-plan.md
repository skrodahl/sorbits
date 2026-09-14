# SorBits — Balance & Tuning Plan

Status: **plan, not yet executed.** Captures the approach for turning the working
full-loop mockup into "sensible gameplay" by tuning, not by adding new systems.
All systems (power, god-mode, levels/heat, ring-capture particles, Sanctuary,
four-arrow control) are already built and verified in
`mockups/orbit-feel/index.html`. This pass tunes their *feel*.

Values below are **proposed targets** to confirm with the designer before
turning knobs. Nothing here is locked yet.

## 1. What "sensible gameplay" must hit (recommended targets)

- **Session length:** a good run ≈ **3–4 minutes, ending at level 3**
  (skilled players reach 4). A casual/first run ≈ 60–120s.
- **God-mode cadence:** first one ~40s in, then **every ~30–35s** — a
  recurring reward beat, not a rare event.
- **Power economy:** the meter is now a **continuous gas-tank gauge** (see
  `power-gauge.md`), not 5 dots. Calm, engaged play holds you in the **mid band**;
  the clock should rarely be the thing that kills you. Death should mostly read as
  "I got hit / I was in the wrong place," not "the clock beat me."
- **Difficulty shape:** **forgiving early; surges are the real threat.** Lulls
  let you recharge; surges test your reserves. Level 3+ is where it turns.
- **Control feel:** steering snappy (~1.5s to full turn), ring-hops
  near-instant.

## 2. Tuning levers (all in one `config` object)

| Lever | Config key(s) | Role |
|---|---|---|
| Passive decay pacing | `decayCold` / `decayHot` | how fast coherence drains (cold→hot) |
| Gold supply | `goldSpawn` / `goldMax` | how often power packets appear, on-screen cap |
| Lingering + level-scaling | `goldOrbits` / `redOrbits` + `goldStayLvlDecay` / `redStayLvlGrow` | gold lingers long (shorter each level), reds quick (longer each level) |
| Red density | spawn interval `4.5 − 3·heat` | how many photons per second as heat rises |
| Surge pacing | `surge` / `surgeT` | wave shape and spacing of the real threats |
| Heat-per-level | `0.25 + (level−1)·0.22` | difficulty curve |
| God-mode | `godTime` / `godResetPower` | reward length, post-god power |
| Quasar frequency | `quasarMin` / `quasarVar` | how often the Sanctuary chance appears |
| Sanctuary duration | `sancDivisor` / `sancFloor` | duration ∝ 1/power, floored |
| Orbit speed | `angVelMin` / `angVelMax` | how fast everything orbits a ring |
| Steer / hop feel | `angVel` clamp, hop lerp `dt·9` | responsiveness of the four-arrow control |

> **Power gauge:** the power model is redesigned as a continuous gas-tank gauge
> with a level-scaling target — see `power-gauge.md` (levers `drainBase`,
> `drainHeatSlope`, `resetFraction`, `targetBase`, `targetGrowth`, `goldGain`,
> `redLoss`, `goldSpawnLvlDecay`, `goldMaxLvlGrow`). This supersedes the
> `decayCold`/`decayHot` and `godResetPower` rows above.

## 3. Tuning loop

1. **Set targets** (section 1) — locked with the designer.
2. **Dev stats overlay** — *built* in mockup v4 (press **F**): run time, level,
   god-count, live power/target, heat, live drain/s, photon/gold counts, deaths
   + last death cause. Tune against numbers, not vibes.
3. **Simulate first, then playtest.** A headless "superhuman" bot (catches
   every gold, dodges perfectly) confirmed the *shape*: god-intervals widen as
   the target grows (13s→35s→82s in the first run), no deaths at high skill,
   level-4 reached ~96s for a perfect player. A human (catches ~50% of gold,
   takes some hits) should land god #1 ~40s in and level 3 ~3 min in.
4. **Iterate the config → playtest (human) → read stats → adjust** until the
   curves match §1 targets (god-count ~6–8 in a 4-min run; death-cause skews
   toward "photon" over "decay").
5. **Lock the winning values** and carry them into the spec + the real build's
   `config`.

## 4. Open questions — answered (designer, 2026-09)

1. **Session length / level target** — *answered:* **3–4 min to level 3**
   (skilled reach 4); casual/first run 60–120s. (Plan default.)
2. **Difficulty feel** — *answered:* **forgiving early, then progressively
   harder** (easier at first, increasingly difficult). See `power-gauge.md`.
3. **Power tension** — *answered:* **forgiving early; surges are the real
   threat** (plan default). Lulls let you recharge; death should read as
   "I got hit / I was in the wrong place," not "the clock beat me."
4. **Measurement** — *answered:* **dev stats overlay** (add one, tune against
   numbers, then remove it for the shipping build).

With all four answered, the pass is unblocked: build the overlay, sanity-check
the first-guess config against §1 targets via simulation, then hand off for
human playtest.

## 5. Out of scope (tonight)

No new systems, no look/feel work, no build of the real project. This doc is
the record of the plan; execution happens after the designer answers §4 and the
look/feel direction is settled.
