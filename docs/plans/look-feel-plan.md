# SorBits — Look & Feel Plan

*Project name: **SorBits** (working title was "Orbit"). Full circle: "Orbit" is the
name the Norwegian gum "Sorbit" rebranded to — so we name the game after the
gum's original name. And "Orbit" is literally "Sorbits" with the first and last
"s" removed — we're adding it back, in bits.*

Status: **executed in the mockup (v4), now promoted to a real build.** All §5
items were implemented in `mockups/orbit-feel/index.html` (pose system,
animated cosmos, power-event FX + SFX, audio pass) using the confirmed §6
dials, then ported to the active Vite build at **`sorbits/`** (see
`decisions.md` **D5**). The mockup is the design artifact of record; `sorbits/`
is the live build with all tunables externalized to `sorbits/src/config.js`.
Zero frame errors across multi-level runs; visuals verified in-browser. Values
remain first guesses — final tuning happens in the balance pass.

## 0. Agreed direction

**North star: a *hectic atom* against a *serene cosmos*** — the play is alive
and urgent; the backdrop is calm and grand.

**Mood: a blend of *Alive/Organic* and *Cosmic/Sublime*.** The atom is a small
living sun in a vast, breathing void — intimate *and* grand. The cosmos is not a
static backdrop; it softly but *noticeably* moves. The atom itself reads as
**3D**, not flat. Power changes are made **physical** (outward shockwave on loss,
inward suction on gain) with matching SFX.

## 1. Cosmos — softly, but noticeably animated

- **Drift/parallax:** the nebula + starfield slowly drift on a gentle Lissajous
  path (never leaves frame) with a subtle scale "breath." Starting values:
  offset amplitude ~6–10px, period ~15–25s; scale pulse ±1.5%, period ~10s.
- **Twinkle:** keep the existing star twinkle; slightly widen the amplitude.
- **Dust motes:** a few (~10–14) faint slow-moving motes for a sense of life
  (parallax drift, very low alpha).
- **Goal:** the background is alive when you watch it, but never competes with
  the gameplay glows. Tune until it reads as "softly animated," not "busy."

## 2. The atom — more 3D, tilted, breathing/wobbling

- **Tilted orbits:** draw the ring circles as **ellipses** (squashed vertically)
  so the orbital plane reads as a tilted 3D disc. Starting squash ~0.78–0.86.
- **Breathing / wobbling:** the squash and a global scale oscillate slowly, so
  the atom *breathes* and the tilt gently *wobbles*. Starting: squash ±0.04 over
  ~8–12s; scale ±2% over ~5–6s.
- **Shared shape, different planes:** every ring shares **one squash** (same
  aspect ratio, ~0.82 breathing ±0.035) so the atom reads as a *coherent family
  of the same orbit*; the planes differ only in **orientation** — a smooth twist
  through the stack (~−11°→+8°) plus a slow per-ring drift. This is what makes it
  read as "the same ring in slightly different planes" rather than "different
  shapes." Implemented via a per-ring `project(angle, ring, radius)` (shared
   `sq`, per-ring `rot`). *(Earlier per-ring squash varied the aspect ratio and
   read as mismatched shapes — removed.)*
  - **Known limitation (2026-09):** the "different planes" illusion still reads
    *subtle/weak* at the current twist (~−11°→+8°). It's an accepted soft spot,
    not a bug. Candidate ways to strengthen it later: widen the twist spread
    (`0.3` coefficient in `poseOf`), give the rings a one-directional *spiral*
    twist, or add a small per-ring **inclination** (a gentle per-ring squash
    offset) so the planes also differ in tilt — each reintroduces a little
    shape variety, so tune carefully against the "different shapes" regression.
- **Ring strength (dial: *softer*):** the orbit rings are the atom's skeleton
  but the cosmos stays serene — they read as structure without dominating.
  Implemented at **inactive ~18% / active-ring ~40% alpha, width 1 / 1.5** (the
  player's ring glows cyan). The red "you're on a photon's ring" warning arc
  stays stronger still (50%, width 3). *(An earlier *prominent* pass at
  35%/60% read as too heavy against the calm cosmos — dialed back.)*
- **Consistent projection:** the electron, photons, gold, and quasar all
  position on *their ring's* tilted/breathing projection, so collisions and
  rendering stay coherent. The **Sanctuary** and **ring-glow** remain *angular*
  (they track `angle`, not the tilt); the Sanctuary wedge is drawn in the
  outermost ring's pose so its outer edge aligns with the outer ring.
- **Nucleus as a 3D body:** layered radial gradients + a soft offset top
  highlight + a faint under-shadow, so the core reads as a glowing sphere, not a
  flat disc.
- Rings, the Sanctuary wedge, and ring-glow arcs all render in the same tilted
  space (ellipse / scaled-sector), so the 3D read is consistent.

## 3. Power events made physical (with SFX)

- **Power lost → outward shockwave.** When power drops (a red photon strike, or
  a passive decay tick), emit an **expanding shockwave ring** from the loss point
  (electron for a strike; core for passive decay) — fast, red/white, fading —
  plus a brief red flash and a touch of shake. **SFX:** a low "deflation" whoosh
  (descending tone + soft noise).
- **Power gained → inward suction.** When power is gained (catching gold —
  inside *or* outside the Sanctuary; gold now behaves uniformly, see
  `decisions.md` **D3**), emit the **opposite**: motes drawn **from the cosmos
  into the core** (converging inward) plus a contracting ring at the core — a
  visible "inhale." **SFX:** a rising "inhale" shimmer (ascending tone +
  filtered-noise suck).
- Both read at a glance: **out = losing, in = gaining.** This is the core
  readability win for the power meter.

## 4. Audio — music/SFX match what happens

**Register (decided): warm, expressive ambient** — a low evolving drone
(a *soundscape*, not a soundtrack), kept generative (oscillators + filtered
noise, no samples), with brighter event blips on top.

- **Reactive drone:** brightness/cutoff tracks the atom's **heat** (already
  prototyped); deepens on **surges** with a rhythmic pulse.
- **Event SFX** stay tightly tied to state: gold pluck, hit thud, god-mode swell,
  quasar chime — plus the two new power-event sounds (§3).
- **State cues:** a distinct shimmer on god-mode; a softened, slowed register
  while a Sanctuary is active.
- **Goal:** the audio *tells you* the state (calm → heated → god → sanctuary)
  without you looking at the HUD.

## 5. Implementation breakdown (execution pass)

1. **Pose system** — a per-frame `pose` (breath, squash) computed once and used
   by both the collision projection and the renderer (rings → ellipses; wedge →
   scaled sector; nucleus → 3D body).
2. **Animated cosmos** — drift/parallax + scale breath on the pre-rendered
   background, richer twinkle, a few drifting dust motes.
3. **Power-event FX** — `shockwave` (outward) + `suction` (inward motes) effect
   systems, wired to the existing power loss/gain code paths.
4. **Audio pass** — heat-tracking drone with a surge pulse, the two new
   power-event SFX, and a check that every state (heat/surge/god/sanctuary) has
   an audible cue.
5. **Tune** all starting values in §1–§4 until the feel is right; lock them into
   the real build's config alongside the balance values.

## 6. Dials (confirmed)

1. **3D tilt** — subtle: squash ~0.85 ("just 3D").
2. **Cosmos motion** — clearly alive but calm (slow parallax + scale-breath, a
   few dust motes).
3. **Power-FX intensity** — moderate: a real shockwave/suction + light shake, no
   screen-wide blowout.
4. **Sanctuary 3D** — tilts with the orbital plane (consistent).

*(Also decided: audio register = warm, expressive ambient — not colder/darker.)*

## 7. HUD + Sanctuary follow-ups (2026-09)

Two "it must read at a glance" calls, executed in the mockup:

- **The power gauge is THE "how am I doing" indicator** — it has to be
  prominent, not a sliver. Implemented as a **large centered bottom bar**
  (340×14) with a **target tick** at full. The fill color tracks the fraction
  via `gaugeColor` — **red (0) → amber (0.5) → cyan (1)** — so a glance tells
  you the register. A **low-pulse** glow kicks in under ~22%.
  - *(A diegetic "coherence ring" arc around the core was tried and **removed**
    — it read as noise on top of the nucleus; the bottom bar carries the
    indicator on its own.)*
- **The Sanctuary absorbs reds** that enter its band (small poof, **no
  reward**) — it is a real safe-cleanup zone, not just "harmless on
  collision." Gold behaves uniformly in it (still charges, see **D3**), so the
  Sanctuary is now a **pure-benefit** window. See `decisions.md` **D2/D3**.
