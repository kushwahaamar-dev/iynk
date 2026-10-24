// @cf title Piezo buzzer
// @cf use engine/bench.list
/* 12 mm piezo buzzer, 9.5 mm tall, legs 7.6 mm apart (three columns), + marked on top. Passive (the default): a
   transducer only, a brass disc with a piezo-ceramic layer behind the sound hole and a green PCB visible underneath;
   it needs a square wave, tone(pin, f), and plays any pitch, loudest near its resonance (about 4 kHz); a steady
   digitalWrite(HIGH) only clicks once. Active: an oscillator inside (black sealed underside, a white "remove seal
   after washing" sticker), so a steady HIGH on + makes its own tone, about 2.3 kHz; driven with tone() it sounds
   rough; it is polar (longer leg +) and stays silent backwards. On the Uno tone() takes Timer2, so PWM on pins 3 and
   11 stops while a tone plays, and only one tone plays at a time. A piezo draws a few mA at 5 V, so it goes straight
   on a pin. See-through: the brass disc flexing with the drive, the ceramic layer and its silver electrode, and
   (active) the oscillator board. */
(() => {
const B = SL.bench, T = B.T;
const DEF = { kind: 'passive', freq: 0, on: 0, fault: 'none' };
const F_ACTIVE = 2300, F_RES = 4000;
const CASE = { l: '#4a4642', m: '#33302d', d: '#1f1d1b' }, BRASS = { l: '#f1d58a', m: '#d4b25a', d: '#9a7a2e' };
const PCB = { l: '#5fbf6a', m: '#3f9a4d', d: '#2a6b34' }, PZT = { l: '#f6f3ea', m: '#ddd6c6', d: '#b2a993' };
const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const frame = (legs, i0, i1) => {
  const n = legs.length, o = [0, 1, 2].map(k => legs.reduce((s, q) => s + q[k], 0) / n);
  const dx = legs[i1][0] - legs[i0][0], dy = legs[i1][1] - legs[i0][1], l = Math.hypot(dx, dy) || 1, ux = dx / l, uy = dy / l;
  const W = (a, b, z) => [o[0] + ux * a - uy * b, o[1] + uy * a + ux * b, o[2] + z];
  return { o, W, u: [ux, uy, 0],
    loc: q => { const x = q[0] - o[0], y = q[1] - o[1]; return [x * ux + y * uy, -x * uy + y * ux]; },
    slab: (a0, b0, a1, b1, z0, z1, m, w = .6) => B.slabW(W, a0, b0, a1, b1, z0, z1, m, toneI, w),
    bx: (a0, b0, z0, a1, b1, z1) => B.aabb([W(a0, b0, z0), W(a1, b1, z1), W(a0, b1, z0), W(a1, b0, z1)]) };
};
const xrK = ctx => ctx.k != null ? ctx.k : ease(Math.min(1, Math.max(0, (ctx.st && ctx.st.xr) || 0)));
// a label pill on the side of the part its anchor is on, as seen now, so pills don't cross when it turns
const pill = (F, pt, dx, dy, text, on) => { const X = P(...pt)[0], Xc = P(...F.o)[0]; return tag(pt, (X < Xc - .5 ? -1 : X > Xc + .5 ? 1 : Math.sign(dx) || 1) * Math.abs(dx), dy, text, on); };
const ring = (F, a, b, z, r, n = 28) => B.circ(a, b, r, n).map(([u, v]) => F.W(u, v, z));
const noteOf = hz => { if (!(hz > 0)) return ''; const n = Math.round(12 * Math.log2(hz / 440)) + 57, cents = 1200 * Math.log2(hz / (440 * Math.pow(2, (n - 57) / 12)));
  return Math.abs(cents) <= 20 && n >= 0 ? NOTES[n % 12] + Math.floor(n / 12) : ''; };
// what it does: the drive from the solver (m.f square-wave Hz on +, m.v steady volts across) or, on its own page,
// from its params; returns the pitch it sounds at (0 = silent), how loud (0..1) and how it sounds
const sound = (p, m) => {
  const f0 = m && m.f != null ? +m.f || 0 : Math.max(0, +p.freq || 0), v = m && m.v != null ? +m.v : (+p.on > 0 ? 5 : 0);
  const rev = p.fault === 'backwards' || (m && m.state === 'reverse');
  if (p.kind === 'active'){
    if (rev) return { hz: 0, loud: 0, how: 'reverse' };
    if (f0 > 0) return { hz: f0, loud: .7, how: 'rough' };
    return v >= 3 ? { hz: F_ACTIVE, loud: 1, how: 'tone' } : { hz: 0, loud: 0, how: 'off' };
  }
  if (f0 > 0){ const d = Math.log2(f0 / F_RES); return { hz: f0, loud: Math.max(.15, 1 / (1 + .6 * d * d)), how: 'tone' }; }
  return { hz: 0, loud: 0, how: v >= 3 ? 'click' : 'off' };
};

B.part('piezo-buzzer', {
  name: 'Piezo buzzer',
  legs: ['+', '-'],
  span: [3, 3],
  params: { kind: ['passive', 'active'], freq: [0, 20000], on: [0, 1], fault: ['none', 'backwards'] },
  steps: { freq: [0, 262, 294, 330, 349, 392, 440, 494, 523, 1568, 2300, 4000] },
  paramNames: { kind: 'Type', freq: 'Tone (Hz)', on: 'Steady HIGH', fault: 'Break it' },
  defaults: DEF,
  // passive: a capacitive piezo, open at DC; active: a polar load of about 30 mA with its own oscillator
  elec: p => (p.kind || DEF.kind) === 'active'
    ? { type: 'buzzer', kind: 'active', polar: true, imax: .03, vmin: 3, vmax: 8, fixed: F_ACTIVE }
    : { type: 'buzzer', kind: 'passive', polar: false, farads: 2e-8, fres: F_RES },
  sound,
  // on its own page a press plays A4 (passive) or switches it on (active) while held
  press: (p, down) => (p.kind || DEF.kind) === 'active' ? { on: down ? 1 : 0, freq: 0 } : { freq: down ? 440 : 0, on: 0 },
  tag: (p, m) => { const q = Object.assign({}, DEF, p), snd = sound(q, m);
    if (snd.how === 'reverse') return T('{id} · backwards: silent', { id: q.id });
    if (snd.how === 'click') return T('{id} · one click, then silence: use tone()', { id: q.id });
    if (snd.how === 'rough') return T('{id} · rough buzz: an active buzzer wants a steady HIGH', { id: q.id });
    if (!snd.hz) return T('{id} · silent', { id: q.id });
    const n = noteOf(snd.hz); return n ? T('{id} · {hz} Hz ({note})', { id: q.id, hz: Math.round(snd.hz), note: n }) : T('{id} · {hz} Hz', { id: q.id, hz: Math.round(snd.hz) }); },
  draw(ctx){
    const p = Object.assign({}, DEF, ctx.p), legs = ctx.legs, k = xrK(ctx), snd = sound(p, ctx.m);
    const F = frame(legs, 0, legs.length - 1), zt = 9.5, R = 6, active = p.kind === 'active', t = (ctx.st && ctx.st.t) || 0;
    // the disc's flex, drawn slowed down so it can be seen: a few cycles a second whatever the pitch
    const flex = snd.hz ? Math.sin(t * 2 * Math.PI * (2 + Math.log2(1 + snd.hz / 200))) * .35 * snd.loud : 0;
    let s = '';
    legs.forEach((L, i) => { const [a, b] = F.loc(L); s += rod(F.W(a, b, -.3), F.W(a, b, 1.2), .3, B.M.tin, toneI, .45); void i; });
    // see-through: (active) oscillator board, the brass disc and ceramic, its two wires
    if (k > .02){
      let x = '';
      if (active){ x += F.slab(-4.5, -3, 4.5, 3, 1.6, 2.4, PCB, .35) + F.slab(-1, -.8, 1, .8, 2.4, 3.8, B.M.black, .3)
        + F.slab(2, -1.4, 3.4, -.6, 2.4, 3, matOf('#c9a874'), .25) + F.slab(-3.4, .6, -2, 1.4, 2.4, 3, matOf('#c9a874'), .25); }
      const zd = 6.2, c = F.W(0, 0, zd);
      x += cyl(c[0], c[1], c[2], c[2] + .25, 5.2, BRASS, toneI, .4, 28);
      x += rod(F.W(0, 0, zd + .25), F.W(0, 0, zd + .7 + flex), 3.4, PZT, toneI, .35, 3.0);
      x += fill(pd(ring(F, 0, 0, zd + .72 + flex, 2.6)), '#c9cfd1');
      x += `<path d="${pd([F.W(3.8, 0, 1.2), F.W(3.8, 0, zd)], false)}M${pd([F.W(-3.8, 0, 1.2), F.W(-1.5, 0, zd + .7 + flex)], false).slice(1)}" stroke="#e2483d" stroke-width=".5" fill="none"/>`;
      s += `<g opacity="${f(Math.min(1, k * 1.4))}">${x}</g>`;
    }
    // case: green PCB underneath (passive) or black epoxy (active), the can, the top with its sound hole
    const c0 = F.W(0, 0, 0);
    let body = cyl(c0[0], c0[1], c0[2], c0[2] + .9, R - .15, active ? CASE : PCB, toneI, .6, 28);
    body += cyl(c0[0], c0[1], c0[2] + .9, c0[2] + zt, R, CASE, toneI, 1, 28);
    body += fill(pd(ring(F, 0, 0, zt + .01, 1.0, 16)), '#141210');
    if (active) body += fill(pd(ring(F, 0, 0, zt + .02, 4.3)), '#f6f3ea') + fill(pd(ring(F, 0, 0, zt + .03, 1.0, 16)), '#141210')
      + B.flatText(F.W(0, -2.6, zt + .04), -F.u[1], -F.u[0], 'REMOVE SEAL', .62, '#6b655c', 700) + B.flatText(F.W(0, 2.9, zt + .04), -F.u[1], -F.u[0], 'AFTER WASHING', .62, '#6b655c', 700);
    // the + mark beside the + leg
    const [pa] = F.loc(legs[0]);
    body += B.flatText(F.W(pa * .72, -1.1, zt + .05), -F.u[1], -F.u[0], '+', 2.2, active ? '#3a3632' : '#f6f3ea', 800);
    s += k > .02 ? `<g opacity="${f(1 - .7 * k)}">${body}</g>` : body;
    // sound: rings rising from the hole, closer together for a higher pitch, a jagged one for a rough buzz
    if (snd.hz > 0){
      const n = 3, gap = 1.6 + 2.4 / (1 + snd.hz / 800);
      for (let i = 0; i < n; i++){ const ph = ((t * 1.4) + i / n) % 1, z = zt + 1 + ph * 6, r = 1.6 + ph * gap * 2;
        const pts = ring(F, 0, 0, z, r, 24);
        if (snd.how === 'rough') pts.forEach((q, j) => { q[2] += j % 2 ? .35 : -.35; });
        s += `<path d="${pd(pts)}" fill="none" stroke="#3e86d9" stroke-width="${f(.6 + .6 * snd.loud)}" opacity="${f((1 - ph) * (.35 + .55 * snd.loud))}"/>`; }
    } else if (snd.how === 'click'){
      const [X, Y] = P(...F.W(0, 0, zt + 2.5)); s += `<path d="M${f(X - 3)} ${f(Y)}L${f(X + 3)} ${f(Y)}M${f(X)} ${f(Y - 3)}L${f(X)} ${f(Y + 3)}" stroke="#3e86d9" stroke-width=".9" opacity=".6"/>`;
    }
    if ((ctx.solo || (B.md && B.md.def && B.md.def.partPage)) && k > .5){
      s += pill(F, F.W(4.6, 0, 6.3), 52, -30, T('Brass disc')) + pill(F, F.W(-2.6, 0, 6.9), -56, 10, T('Piezo ceramic')) + pill(F, F.W(0, 0, zt), 20, -66, T('Sound hole'));
      if (active) s += pill(F, F.W(-4, 0, 2), -58, 46, T('Oscillator'));
    }
    ctx.put(F.bx(-R - .3, -R - .3, -.3, R + .3, R + .3, zt + .3), s);
  },
  show: { breadboard: 'mini', holes: ['e7', 'e10'], params: { freq: 440 } },
});
})();
