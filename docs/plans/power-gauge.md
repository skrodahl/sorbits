# SorBits — Power Gauge (revised design)

Status: **implemented in the mockup (v4).** Replaces the old 5-dot discrete
power meter with a continuous "gas-tank" gauge: continuous drain, growing
target, HUD bar with a low-state tint. Levers live in the mockup's `C`
object; first-guess values in §"First-guess values" below, pending the
playtest (dev overlay on **F**). Supersedes the "power economy" target and the
`decayCold`/`decayHot` + `godResetPower` levers in `balance-plan.md` (that doc
now points here for the power model).

## Model

- **Analogue gauge, not dots.** The power meter is a continuous gas-tank gauge —
  it drains and fills **smoothly**, with **no discrete steps** (a car's fuel
  gauge, not a 5-segment bar). Exact internal scale is a tuning detail, not a
  player-facing unit.
- **Starts around ⅓** of the current target.
- **Continuous decay:** power drains as a smooth *rate* over time, not a tick.
  Tuned **forgiving** — slow enough that active play lasts a long time; the
  clock should rarely be the thing that kills you.
- **Gold** adds a fractional gain. **A red strike** subtracts a fractional loss.
- **"Full" = crossing the current target.** Reaching the target triggers the
  god-mode burst; when it ends, you **level up**.
- **On level-up:** the gauge resets to ~⅓ and the **target grows** — it takes
  more to fill each level.

## Difficulty shape (confirmed)

**Easier at first, then progressively harder.** Early levels fill quickly (a
fast reward beat); later levels take real effort. Achieved by the **growing
target** and/or a **relative gain that scales down** with level, so the *net
fill rate* falls behind the *growing target*.

## Levers (tunable)

| Lever | Meaning |
|---|---|
| `drainBase` | floor drain (fraction of target / s) — very forgiving early |
| `drainHeatSlope` | extra drain per unit of heat — steepens into surges / late levels |
| `resetFraction` | fraction the gauge resets to on level-up (~⅓) |
| `targetBase` | level-1 target (the "full" mark) |
| `targetGrowth` | how the target scales per level (geometric) — the difficulty ramp |
| `goldGain` | fractional power per gold caught |
| `redLoss` | fractional power lost per photon strike |
| `goldSpawnLvlDecay` | per level, gold spawns faster — supply keeps up with the growing target |
| `goldMaxLvlGrow` | per level, one more gold may be on screen |
| *(optional)* `gainLvlScale` | if gold gain also scales down with level, to steepen the ramp |

Note: the ramp is carried by **target growth + heat drain**, while **supply
scales up** with level so the late game stays playable — difficulty comes from
reds/surges, not gold starvation.

## First-guess values (in mockup v4, pending playtest)

`drainBase 0.0015 · drainHeatSlope 0.017 · resetFraction 0.34 · targetBase 1.0 ·
targetGrowth 1.25 · goldGain 0.15 · redLoss 0.22 · goldSpawnLvlDecay 0.15 ·
goldMaxLvlGrow 1`

Drain shape (idle time-to-empty, verified in-browser): **L1 ≈ 59s · L2 ≈ 36s ·
L3 ≈ 26s · L4 ≈ 20s · L5 ≈ 18s**, with surges spiking the drain on top. Early
levels are forgiving; the hard pace only shows up late.

**Tuning direction** (via the F-key dev overlay + human playtest):
- **Fills too fast** (gods come too often) → raise `targetGrowth` or
  `drainHeatSlope`, or lower `goldGain` / `goldSpawnLvlDecay`.
- **Fills too slow** (stuck a level) → lower `targetGrowth`, raise `goldGain` or
  supply levers.
- **Dying to the clock early** → lower `drainBase` / `drainHeatSlope` (the
  floor should stay gentle; keep the steepness for late levels).
- **Dying constantly to photons** → lower `redLoss` or `redStayLvlGrow`.
- **Too easy overall** → raise `targetGrowth` + `redStayLvlGrow` together.

God-mode trigger fires at target-cross; `godTime` (8s) unchanged for now.
