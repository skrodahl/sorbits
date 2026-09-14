import {
  ctx, W, H, DPR, cx, cy, bg, POSE, RING_POSE, twinkles, dust,
  ringR, N, coreR, gap, maxR, minR, pPos, ringPoseAtR, project,
} from './geometry.js';
import { S, ePos, pTarget } from './state.js';
import { C } from './config.js';
import { TAU, clamp, lerp } from './utils.js';

// radial glow primitive
function glow(x, y, r, inner, outer) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, inner); g.addColorStop(1, outer);
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
}

// "vibrate" (D10): a particle about to shell-hop shudders toward its next ring —
// reds/quasar hop inward (dir -1), gold hops outward (dir +1). Purely visual.
const hopPos = (o, dir, t) => !o.vibe || o.collecting ? pPos(o)
  : project(o.angle, o.ring, o.r + dir * C.hopVibeAmp * o.vibe * (0.5 - 0.5 * Math.cos(t * C.hopVibeFreq * TAU)));
function hopWarnRing(x, y, o, t, rgb) {
  const pulse = 0.5 - 0.5 * Math.cos(t * C.hopVibeFreq * TAU);
  ctx.globalAlpha = 0.4 * o.vibe;
  ctx.strokeStyle = rgb; ctx.lineWidth = 1 + o.vibe * 1.5;
  ctx.beginPath(); ctx.arc(x, y, 9 + 4 * pulse, 0, TAU); ctx.stroke();
  ctx.globalAlpha = 1;
}

export function render(t) {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  // serene cosmos: slow Lissajous drift + scale-breath (clearly alive, but calm)
  const bx = 8 * Math.sin(t * 0.31), by = 6 * Math.sin(t * 0.37 + 1.3), bs = 1 + 0.015 * Math.sin(t * 0.63);
  ctx.save();
  ctx.translate(cx, cy); ctx.scale(bs, bs); ctx.translate(-cx + bx, -cy + by);
  ctx.drawImage(bg, 0, 0, W, H);
  ctx.restore();
  if (S.shake > 0) ctx.translate((Math.random() - 0.5) * S.shake, (Math.random() - 0.5) * S.shake);
  ctx.globalCompositeOperation = 'lighter';
  const mood = 1 + 0.6 * S.envTone; // the cosmos is the room's lights: surge brightens, wound dims
  for (const s of twinkles) { const a = (0.1 + 0.4 * (0.5 + 0.5 * Math.sin(t * s.sp + s.ph))) * mood; ctx.globalAlpha = a; ctx.fillStyle = '#bcd0ff'; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, TAU); ctx.fill(); }
  for (const d of dust) {
    const x = (((d.x0 + d.vx * t) % W) + W) % W, y = (((d.y0 + d.vy * t) % H) + H) % H;
    ctx.globalAlpha = d.al * (0.6 + 0.4 * Math.sin(t * d.sp + d.ph)) * mood;
    ctx.fillStyle = '#9fb4e8';
    ctx.beginPath(); ctx.arc(x, y, d.r, 0, TAU); ctx.fill();
  }
  ctx.globalAlpha = 1;

  // sanctuary wedge (emitted from core, slowly orbiting + wobble, desaturated cyan)
  if (S.sanc) {
    const s = S.sanc, rem = s.dur - s.t, fade = (rem < 3 ? rem / 3 : 1) * (0.6 + 0.4 * Math.sin(t * 9) * (rem < 3 ? 1 : 0.2));
    // wedge tilts with the orbital plane (drawn in the outermost ring's pose; its outer edge
    // aligns with the outer ring — the sanctuary's *logic* stays purely angular)
    const oq = RING_POSE.sq[N - 1], orot = RING_POSE.rot[N - 1];
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(orot);
    ctx.scale(POSE.breath, oq * POSE.breath);
    const grad = ctx.createRadialGradient(0, 0, coreR, 0, 0, maxR);
    grad.addColorStop(0, 'rgba(159,220,255,' + (0.16 * fade) + ')');
    grad.addColorStop(1, 'rgba(159,220,255,0)');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.moveTo(0, 0);
    ctx.arc(0, 0, maxR, s.angle - C.sancHalf, s.angle + C.sancHalf); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(159,220,255,' + (0.35 * fade) + ')'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(0, 0, coreR, s.angle - C.sancHalf, s.angle + C.sancHalf); ctx.stroke();
    ctx.restore();
  }

  for (let i = 0; i < N; i++) {
    const b = POSE.breath, rx = ringR[i] * b, ry = ringR[i] * RING_POSE.sq[i] * b, rot = RING_POSE.rot[i];
    ctx.strokeStyle = i === S.e.ring ? 'rgba(95,230,255,0.4)' : 'rgba(120,150,255,0.18)';
    ctx.lineWidth = i === S.e.ring ? 1.5 : 1; ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, rot, 0, TAU); ctx.stroke();
    // ring warning: reds currently riding YOUR ring glow at their angle
    if (i === S.e.ring) {
      for (const q of S.photons) {
        if (q.ring === i) {
          ctx.strokeStyle = 'rgba(255,90,120,0.5)'; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, rot, q.angle - 0.12, q.angle + 0.12); ctx.stroke();
        }
      }
    }
  }

  // core: glow ∝ power, calm pulse in sanctuary, decays at the end
  let nr = minR * 0.55;
  const pf = clamp(S.power / pTarget(), 0, 1);
  let coreFlick = 1;
  if (S.sanc) {
    const rem = S.sanc.dur - S.sanc.t;
    coreFlick = (rem < 3 ? 0.6 + 0.4 * Math.sin(t * 22) : 1) * (0.9 + 0.1 * Math.sin(t * 1.2));
  }
  let pumpScale = 1; // core "pump": compress -> expand (spit the gold) -> settle
  if (S.pump > 0) {
    const pt = 1 - S.pump / C.pumpDur; // 0 -> 1 across the pump
    const cp = C.pumpCompress / C.pumpDur; // fraction spent compressing
    const exEnd = Math.min(1, cp + 0.3); // end of the expansion (overshoot) phase
    if (pt <= cp) { const tt = pt / cp; pumpScale = 1 - 0.4 * tt * tt; } // compress: 1 -> 0.6 (ease-in)
    else if (pt <= exEnd) { const tt = (pt - cp) / (exEnd - cp), e = 1 - (1 - tt) * (1 - tt); pumpScale = 0.6 + 0.8 * e; } // expand: 0.6 -> 1.4
    else { const tt = (pt - exEnd) / (1 - exEnd), e = 1 - (1 - tt) * (1 - tt); pumpScale = 1.4 - 0.4 * e; } // settle: 1.4 -> 1
  }
  const coreScale = (0.5 + 0.5 * pf) * coreFlick * pumpScale * (1 - 0.2 * S.coreRecoil + 0.2 * S.coreFlare); // mirrored: flinch (shrink) vs flare (swell)
  const cR = nr * coreScale;
  // 3D body: tilt it with the innermost orbital plane it sits on
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(RING_POSE.rot[0]);
  ctx.scale(POSE.breath, RING_POSE.sq[0] * POSE.breath);
  const coreGlowA = 0.14 + 0.2 * pf + 0.22 * S.coreFlare - 0.22 * S.coreRecoil; // mirrored: flare (brighten) vs flinch (dim)
  glow(0, 0, nr * 2.6 * coreScale, 'rgba(255,210,255,' + coreGlowA + ')', 'rgba(120,60,200,0)');
  // sphere lit from above: bright center offset up, dark rim below
  const body = ctx.createRadialGradient(-cR * 0.35, -cR * 0.45, 0, 0, 0, cR * 1.05);
  body.addColorStop(0, pf > 0.4 ? '#ffffff' : '#e8dcff');
  body.addColorStop(0.45, pf > 0.4 ? '#fff' : '#c8b4ff');
  body.addColorStop(0.85, '#8f6fd8');
  body.addColorStop(1, 'rgba(120,60,200,0.25)');
  ctx.fillStyle = body;
  ctx.beginPath(); ctx.arc(0, 0, cR, 0, TAU); ctx.fill();
  for (const q of S.pulses) {
    const pr = coreR + (1 - q.life) * gap * 1.5;
    ctx.strokeStyle = 'rgba(180,160,255,' + q.life * 0.5 + ')'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, pr, 0, TAU); ctx.stroke();
  }
  ctx.restore();

  // photons (position derived from ring + angle) — reds in the sanctuary band are
  // absorbed by update() before this runs, so they always render as live threats here
  for (const q of S.photons) {
    const qp = hopPos(q, -1, t); // inward shudder: reds hop inward
    const matF = q.matT > 0 ? 1 - q.matT / C.matDur : 1; // materialization progress (0->1); 1 when solid
    for (const t of (q.trail || [])) { // motion trail (visible, but quieter than the electron's)
      if (t.life <= 0) continue;
      ctx.globalAlpha = t.life * 0.4 * matF; ctx.fillStyle = '#ff4d6a';
      ctx.beginPath(); ctx.arc(t.x, t.y, 0.8 + t.life * 2.2, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = matF; // the photon body fades in as it materializes
    glow(qp.x, qp.y, 20, 'rgba(255,77,106,0.45)', 'rgba(255,77,106,0)');
    ctx.fillStyle = '#2a0a14'; ctx.beginPath(); ctx.arc(qp.x, qp.y, 5, 0, TAU); ctx.fill();
    // small motion cue showing orbit direction
    ctx.strokeStyle = 'rgba(255,120,150,0.35)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(qp.x, qp.y, 8, q.angle, q.angle + 0.7 * Math.sign(q.angVel)); ctx.stroke();
    // "about to hop" warning: a ring that tightens and brightens as the shudder builds
    if (q.vibe > 0 && !q.collecting) hopWarnRing(qp.x, qp.y, q, t, 'rgba(255,90,120,0.9)');
    // "materialize": a deliberate cosmic condensation — motes stream in from the edges of the
    // screen (the "entire cosmos") and coalesce onto the photon as it forms
    if (q.matT > 0) {
      const reach = Math.max(W, H) * 0.62; // how far out the motes start
      for (const s of q.matSeeds) {
        const dist = s.d * reach * (1 - matF); // far at first, converging onto the photon
        ctx.globalAlpha = matF * 0.7 * (0.4 + 0.6 * s.d); ctx.fillStyle = '#ff9fb0';
        ctx.beginPath(); ctx.arc(qp.x + Math.cos(s.a) * dist, qp.y + Math.sin(s.a) * dist, 0.8 + matF * 1.6, 0, TAU); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
  }

  // gold (position derived from ring + angle) — behaves the same inside or
  // outside the sanctuary, so it always renders as a live gold packet
  for (const g of S.golds) {
    const gp = hopPos(g, +1, t); // outward shudder: gold hops outward
    for (const t of (g.trail || [])) { // motion trail (visible, but quieter than the electron's)
      if (t.life <= 0) continue;
      ctx.globalAlpha = t.life * 0.35; ctx.fillStyle = '#ffd97a';
      ctx.beginPath(); ctx.arc(t.x, t.y, 0.7 + t.life * 2, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
    glow(gp.x, gp.y, 14, 'rgba(255,217,122,0.5)', 'rgba(255,217,122,0)');
    ctx.fillStyle = '#fff6dd'; ctx.beginPath(); ctx.arc(gp.x, gp.y, 3.5, 0, TAU); ctx.fill();
    if (g.vibe > 0 && !g.collecting) hopWarnRing(gp.x, gp.y, g, t, 'rgba(255,217,122,0.9)');
  }

  // quasar (distinct beacon, position derived from ring + angle) — with a comet trail
  if (S.quasar) {
    const q = S.quasar, qp = hopPos(q, -1, t), pr = 6 + 3 * Math.sin(q.ph); // inward shudder: the quasar hops inward
    for (const t of (q.trail || [])) { // comet trail: brighter + longer while falling in
      if (t.life <= 0) continue;
      ctx.globalAlpha = t.life * (q.fall > 0 ? 0.5 : 0.3); ctx.fillStyle = '#cfe8ff';
      ctx.beginPath(); ctx.arc(t.x, t.y, 0.8 + t.life * 2.5, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
    glow(qp.x, qp.y, pr * 4, 'rgba(159,220,255,0.55)', 'rgba(159,220,255,0)');
    ctx.strokeStyle = 'rgba(220,245,255,0.8)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(qp.x, qp.y, pr, 0, TAU); ctx.stroke();
    ctx.fillStyle = '#eafaff'; ctx.beginPath(); ctx.arc(qp.x, qp.y, 2.5, 0, TAU); ctx.fill();
    if (q.vibe > 0) hopWarnRing(qp.x, qp.y, q, t, 'rgba(159,220,255,0.9)');
  }

  // electron
  for (const tr of S.e.trail) {
    if (tr.life <= 0) continue;
    ctx.globalAlpha = tr.life * 0.35; ctx.fillStyle = '#57e6ff';
    ctx.beginPath(); ctx.arc(tr.x, tr.y, 1 + tr.life * 3, 0, TAU); ctx.fill();
  }
  ctx.globalAlpha = 1;
  const p = ePos();
  const blink = S.invuln > 0 && Math.floor(S.invuln * 10) % 2 === 0;
  if (!blink) {
    glow(p.x, p.y, 34, 'rgba(87,230,255,0.5)', 'rgba(87,230,255,0)');
    ctx.fillStyle = '#eaffff'; ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, TAU); ctx.fill();
  }

  for (const q of S.parts) { ctx.globalAlpha = q.life / q.max * 0.8; ctx.fillStyle = q.col; ctx.beginPath(); ctx.arc(q.x, q.y, q.size, 0, TAU); ctx.fill(); }
  ctx.globalAlpha = 1;

  // power-event FX: out = losing, in = gaining
  for (const q of S.shocks) {
    const k = Math.min(1, q.t / q.dur);
    const e = q.inward ? k * k : 1 - Math.pow(1 - k, 3);
    const r = q.inward ? lerp(q.max, q.min, e) : lerp(q.min, q.max, e);
    ctx.strokeStyle = 'rgba(' + q.rgb + ',' + (0.5 * (1 - k)) + ')';
    ctx.lineWidth = (q.inward ? 2 : 3) * (1 - k) + 0.5;
    ctx.beginPath();
    if (q.plane) { const si = q.ring || 0; ctx.ellipse(q.x, q.y, r * POSE.breath, r * RING_POSE.sq[si] * POSE.breath, RING_POSE.rot[si], 0, TAU); }
    else ctx.arc(q.x, q.y, r, 0, TAU);
    ctx.stroke();
  }
  // ring waves: a ripple passing through the orbital membrane (wound closes in on the core,
  // surge radiates outward) — the atom's membrane reacting, not the frame
  for (const w of S.ringWaves) {
    const k = Math.min(1, w.t / w.dur), e = 1 - Math.pow(1 - k, 2);
    const r = lerp(w.r0, w.r1, e), pose = ringPoseAtR(r);
    ctx.strokeStyle = 'rgba(' + w.rgb + ',' + (w.a * (1 - k)) + ')';
    ctx.lineWidth = 2 * (1 - k) + 0.5;
    ctx.beginPath();
    ctx.ellipse(cx, cy, r * POSE.breath, r * pose.sq * POSE.breath, pose.rot, 0, TAU);
    ctx.stroke();
  }
  for (const q of S.sucks) {
    const k = Math.min(1, q.t / q.dur), ee = k * k, a = q.a + ee * 1.2;
    const r = q.r0 * (1 - ee); // cosmic: a circular pull from the background into the core
    const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
    ctx.globalAlpha = (1 - k) * 0.9;
    ctx.fillStyle = '#ffe9a8';
    ctx.beginPath(); ctx.arc(x, y, 1.5, 0, TAU); ctx.fill();
  }
  ctx.globalAlpha = 1;

  // cinematic sweep: the edges fall to dark during the level-up collection (focus on the core)
  if (S.collecting) {
    ctx.globalCompositeOperation = 'source-over';
    const vin = Math.min(1, S.collecting.t / 0.4);
    const vg = ctx.createRadialGradient(cx, cy, Math.min(W, H) * 0.34, cx, cy, Math.max(W, H) * 0.72);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(4,6,16,' + (0.45 * vin) + ')');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  }

  // floating arcade numbers/words: pop in big, rise, linger, then dissolve
  ctx.globalCompositeOperation = 'source-over';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const q of S.popups) {
    const k = q.t / q.dur;
    if (k >= 1) continue;
    const sc = k < 0.15 ? 0.5 + 0.5 * (k / 0.15) : 1 + 0.35 * ((k - 0.15) / 0.85); // pop in, then grow as it rises
    const a = k < 0.15 ? 1 : (k > 0.7 ? Math.max(0, 1 - (k - 0.7) / 0.3) : 1);   // linger, then dissolve
    if (a <= 0) continue;
    ctx.save();
    ctx.translate(q.x, q.y);
    ctx.scale(sc, sc);
    ctx.globalAlpha = a;
    ctx.font = '900 ' + q.size + 'px ui-monospace, monospace';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(0,0,0,0.75)'; ctx.lineWidth = Math.max(3, q.size * 0.16);
    ctx.strokeText(q.txt, 0, 0); // chunky arcade outline
    ctx.shadowColor = q.col; ctx.shadowBlur = 16;
    ctx.fillStyle = q.col;
    ctx.fillText(q.txt, 0, 0);
    ctx.restore();
  }
  ctx.globalAlpha = 1; ctx.textAlign = 'start'; ctx.textBaseline = 'alphabetic';
}
