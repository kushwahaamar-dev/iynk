// The range page: draws what the host's flight sim sends (src/lib/flight), forwards the flight keys,
// and speaks the SimLab figure bridge (colorfigures-guide 2.3, D6). Standalone it flies a demo lap.
const EMBED = window.parent !== window || /[?&]embed=1\b/.test(location.search);
const ORIGIN = location.protocol === 'file:' || location.origin === 'null' ? '*' : location.origin;
const FLIGHT_KEYS = new Set(['KeyW', 'KeyS', 'KeyA', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'KeyR', 'KeyV']);
let STRINGS = {};
/** Figure strings: the host sends its translations; English is the fallback. */
function T(key, fallback) {
  const v = STRINGS[key];
  return typeof v === 'string' && v ? v : fallback !== undefined ? fallback : key;
}

const S = {
  course: null,
  solids: [],
  craft: { fov: 105, camTilt: 25, fpvProps: false, fpvLevel: false, look: { arms: 4, armLen: 0.11, propR: 0.06, body: [0.1, 0.05, 0.04], palette: 'tomato', isoScale: 2 } },
  frame: null,
  followers: [],
  ghosts: [],
  fpv: false,
  paused: false,
  offscreen: false,
  demo: false,
  last: 0,
};

const stage = document.getElementById('stage');
const isoSvg = document.getElementById('iso');
const overlay = document.getElementById('overlay');
const fpvSvg = document.getElementById('fpv');
const toastEl = document.getElementById('toast');
const badgeEl = document.getElementById('badge');
const iso = createIso(isoSvg, overlay);
const fpv = createFpv(fpvSvg);

function post(type, payload) {
  if (!EMBED || window.parent === window) return;
  window.parent.postMessage(Object.assign({ source: 'simlab-figure', v: 1, type }, payload || {}), ORIGIN);
}
// the host drives these with `act {name}`; the protocol carries act names only
const ACTS = ['fpv', 'chase', 'turn-left', 'turn-right', 'zoom-in', 'zoom-out', 'view-reset'];
function sendReady() {
  post('ready', { fig: 'flight/range', title: T('figureTitle', 'Flying range'), lang: document.documentElement.lang, buttons: [], acts: ACTS });
}
function report() {
  return { fpv: S.fpv, view: Math.round(iso.st.az), zoom: Math.round(iso.st.width * 10) / 10, course: S.course ? S.course.id : null };
}
let lastReport = '';
function reportState() {
  const r = report();
  const j = JSON.stringify(r);
  if (j === lastReport) return;
  const old = lastReport ? JSON.parse(lastReport) : {};
  lastReport = j;
  post('state', { state: r, changed: Object.keys(r).filter((k) => old[k] !== r[k]) });
}

function setFpv(on) {
  S.fpv = !!on;
  stage.classList.toggle('fpv', S.fpv);
  fpvSvg.setAttribute('aria-hidden', String(!S.fpv));
  isoSvg.setAttribute('aria-hidden', String(S.fpv));
  reportState();
  schedule();
}

function rebuild() {
  if (!S.course) return;
  iso.build(S.course, S.solids);
  fpv.build(S.course, S.solids);
  schedule();
}

const num = (v) => typeof v === 'number' && Number.isFinite(v);
const okCraft = (c) => c && typeof c === 'object' && c.look && typeof c.look === 'object' && num(c.look.armLen) && num(c.look.propR);
const okFrame = (f) => f && typeof f === 'object' && ['x', 'y', 'z', 'yaw', 'pitch', 'roll', 't'].every((k) => num(f[k]));

/** Every state write goes through here: types are checked, nothing else is written. */
function accept(patch) {
  if (!patch || typeof patch !== 'object') return;
  if (patch.course && typeof patch.course === 'object' && Array.isArray(patch.course.prims) && num(patch.course.field) && Array.isArray(patch.course.pad)) {
    S.course = patch.course;
    S.solids = Array.isArray(patch.solids) ? patch.solids.filter((o) => o && (o.k === 'box' || o.k === 'cyl') && num(o.x) && num(o.z1)) : [];
    S.demo = false;
    rebuild();
  }
  if (okCraft(patch.craft)) S.craft = patch.craft;
  if (okFrame(patch.frame)) {
    S.frame = patch.frame;
    // a crash replay in slow motion carries `replay`: the badge says so on both views
    const replay = patch.frame.replay === true;
    if (replay !== stage.classList.contains('replay')) {
      badgeEl.textContent = T('replay', 'REPLAY');
      stage.classList.toggle('replay', replay);
    }
    S.followers = Array.isArray(patch.frame.followers) ? patch.frame.followers : [];
    // ghosts: your best lap, the autopilot's line, friends in the room ({ x, y, z, yaw, pitch, roll, label, col })
    S.ghosts = Array.isArray(patch.frame.ghosts)
      ? patch.frame.ghosts
          .filter((g) => g && ['x', 'y', 'z', 'yaw', 'pitch', 'roll'].every((k) => num(g[k])))
          .slice(0, 12)
          .map((g) => ({ ...g, col: /^#[0-9a-f]{3,8}$/i.test(g.col) ? g.col : '#231e16', label: typeof g.label === 'string' ? g.label.slice(0, 28) : '' }))
      : [];
    S.demo = false;
    schedule();
  }
  if (typeof patch.fpv === 'boolean' && patch.fpv !== S.fpv) setFpv(patch.fpv);
  if (patch.strings && typeof patch.strings === 'object') {
    for (const [k, v] of Object.entries(patch.strings)) if (typeof v === 'string') STRINGS[k] = v;
    rebuild();
  }
}

function toast(text, ms) {
  toastEl.textContent = text;
  toastEl.classList.add('on');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => toastEl.classList.remove('on'), ms || 3200);
  if (S.frame) fpv.flash(text, S.frame.t, ms);
}

function act(name) {
  switch (name) {
    case 'fpv':
      return setFpv(true);
    case 'chase':
      return setFpv(false);
    case 'turn-left':
      iso.turn(-15);
      break;
    case 'turn-right':
      iso.turn(15);
      break;
    case 'zoom-in':
      iso.zoom(1 / 1.25);
      break;
    case 'zoom-out':
      iso.zoom(1.25);
      break;
    case 'view-reset':
      iso.st.az = 45;
      iso.st.width = S.craft.look.span ? 40 : 14;
      break;
    default:
      return post('error', { message: 'unknown act: ' + name });
  }
  reportState();
  schedule();
}

window.addEventListener('message', (e) => {
  if (window.parent === window || e.source !== window.parent) return;
  if (ORIGIN !== '*' && e.origin !== location.origin) return;
  const m = e.data;
  if (!m || typeof m !== 'object' || m.source !== 'simlab' || m.v !== 1) return;
  switch (m.type) {
    case 'hello':
      sendReady();
      reportState();
      break;
    case 'set':
      accept(m.state);
      break;
    case 'locale':
      if (typeof m.lang === 'string') document.documentElement.lang = m.lang;
      if (m.strings && typeof m.strings === 'object') {
        STRINGS = {};
        for (const [k, v] of Object.entries(m.strings)) if (typeof v === 'string') STRINGS[k] = v;
      }
      rebuild();
      break;
    case 'theme':
      document.documentElement.classList.toggle('cf-dark', m.mode === 'dark');
      break;
    case 'flash':
      if (typeof m.text === 'string') toast(m.text, num(m.ms) ? m.ms : 3200);
      break;
    case 'pause':
      S.paused = true;
      break;
    case 'resume':
      S.paused = false;
      schedule();
      break;
    case 'view':
      if (num(m.yaw)) {
        iso.st.az = ((m.yaw % 360) + 360) % 360;
        reportState();
        schedule();
      }
      break;
    case 'act':
      act(m.name);
      break;
    case 'press':
      act(m.id);
      break;
    case 'query':
      post('state', { state: report(), changed: [] });
      break;
    default:
      break;
  }
});

// keys: the host owns the flight keys; forward them when the range has focus
const held = new Set();
function keyMsg(code, down, repeat) {
  post('part', { act: 'key', id: code, data: { down: down ? '1' : '0', repeat: repeat ? '1' : '0' } });
}
window.addEventListener('keydown', (e) => {
  if (FLIGHT_KEYS.has(e.code)) {
    e.preventDefault();
    held.add(e.code);
    if (!EMBED && e.code === 'KeyV' && !e.repeat) setFpv(!S.fpv);
    keyMsg(e.code, true, e.repeat);
    return;
  }
  const view = { BracketLeft: 'turn-left', BracketRight: 'turn-right', Equal: 'zoom-in', Minus: 'zoom-out', Digit0: 'view-reset' }[e.code];
  if (view) {
    e.preventDefault();
    act(view);
  }
});
window.addEventListener('keyup', (e) => {
  if (!FLIGHT_KEYS.has(e.code)) return;
  e.preventDefault();
  held.delete(e.code);
  keyMsg(e.code, false, false);
});
function releaseAll() {
  for (const c of held) keyMsg(c, false, false);
  held.clear();
}
window.addEventListener('blur', () => {
  releaseAll();
  post('focus', { on: false });
});
window.addEventListener('focus', () => post('focus', { on: true }));
window.addEventListener('error', (e) => post('error', { message: String(e.message || e) }));

// drag turns the chase view, wheel and pinch zoom it
const pointers = new Map();
let pinch0 = 0;
stage.addEventListener('pointerdown', (e) => {
  pointers.set(e.pointerId, [e.clientX, e.clientY]);
  stage.setPointerCapture(e.pointerId);
  if (pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    pinch0 = Math.hypot(a[0] - b[0], a[1] - b[1]);
  }
});
stage.addEventListener('pointermove', (e) => {
  const p = pointers.get(e.pointerId);
  if (!p || S.fpv) return;
  if (pointers.size === 2) {
    pointers.set(e.pointerId, [e.clientX, e.clientY]);
    const [a, b] = [...pointers.values()];
    const d = Math.hypot(a[0] - b[0], a[1] - b[1]);
    if (pinch0 > 0 && d > 0) iso.zoom(pinch0 / d);
    pinch0 = d;
  } else {
    iso.turn(-(e.clientX - p[0]) * 0.4);
    pointers.set(e.pointerId, [e.clientX, e.clientY]);
  }
  schedule();
});
const endPointer = (e) => {
  pointers.delete(e.pointerId);
  pinch0 = 0;
  reportState();
};
stage.addEventListener('pointerup', endPointer);
stage.addEventListener('pointercancel', endPointer);
stage.addEventListener('wheel', (e) => {
  if (S.fpv) return;
  e.preventDefault();
  iso.zoom(e.deltaY > 0 ? 1.1 : 1 / 1.1);
  reportState();
  schedule();
}, { passive: false });
stage.addEventListener('dblclick', () => act('view-reset'));

// the page pauses itself when it is scrolled out of view
if ('IntersectionObserver' in window) {
  new IntersectionObserver((es) => {
    S.offscreen = !es[0].isIntersecting;
    if (!S.offscreen) schedule();
  }).observe(stage);
}

let raf = 0;
function schedule() {
  if (!raf) raf = requestAnimationFrame(loop);
}
function loop(ts) {
  raf = 0;
  if (S.paused || S.offscreen) return;
  const dt = S.last ? Math.min(0.1, (ts - S.last) / 1000) : 0.016;
  S.last = ts;
  if (S.demo) demoStep(dt);
  const f = S.frame;
  if (f && S.course) {
    const vw = stage.clientWidth || 800, vh = stage.clientHeight || 600;
    const camTilt = num(S.course.camTilt) ? S.course.camTilt : S.craft.camTilt;
    if (S.fpv) fpv.draw(f, S.craft, camTilt, S.followers, S.ghosts);
    else iso.draw(f, S.craft.look, S.followers, dt, vw, vh, S.ghosts);
  }
  if (S.demo || (f && f.armed) || pointers.size) schedule();
}

// standalone: fly the built-in course's gates on a smooth path
let demoT = 0;
function demoStep(dt) {
  demoT += dt;
  const gates = S.course.gates && S.course.gates.length ? S.course.gates : [{ x: S.course.pad[0], y: S.course.pad[1] + 4 }];
  const pts = gates.map((g) => [g.x, g.y]);
  const n = pts.length;
  const lapS = n * 2.6;
  const u = ((demoT % lapS) / lapS) * n;
  const i = Math.floor(u), k = u - i;
  const P = (j) => pts[((j % n) + n) % n];
  const cr = (a, b, c, d, t, ax) => 0.5 * (2 * b[ax] + (-a[ax] + c[ax]) * t + (2 * a[ax] - 5 * b[ax] + 4 * c[ax] - d[ax]) * t * t + (-a[ax] + 3 * b[ax] - 3 * c[ax] + d[ax]) * t * t * t);
  const at = (t) => {
    const j = Math.floor(t), kk = t - j;
    return [cr(P(j - 1), P(j), P(j + 1), P(j + 2), kk, 0), cr(P(j - 1), P(j), P(j + 1), P(j + 2), kk, 1)];
  };
  const p = at(i + k), q = at(i + k + 0.02), r = at(i + k + 0.04);
  const h1 = Math.atan2(q[1] - p[1], q[0] - p[0]), h2 = Math.atan2(r[1] - q[1], r[0] - q[0]);
  const turn = ((h2 - h1 + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
  const speed = Math.hypot(q[0] - p[0], q[1] - p[1]) / ((0.02 * lapS) / n);
  S.frame = {
    t: demoT, x: p[0], y: p[1], z: 0.85 + 0.15 * Math.sin(demoT), yaw: h1 / DEG, pitch: 14, roll: Math.max(-40, Math.min(40, turn * 900)),
    speed, vz: 0, thr: 0.45, spin: demoT * 40, armed: true, crashed: false, launched: true, volt: 23.1, amps: 18.5, mah: Math.round(demoT * 9), cells: 6,
    low: false, timer: demoT, mode: 'race', wind: [0, 0], windOn: false,
    next: { x: gates[(i + 1) % n].x, y: gates[(i + 1) % n].y, z: 0.8, kind: 'gate', n: ((i + 1) % n) + 1, total: n, label: '' },
    gate: (i + 1) % n, checkpoint: 0, servo: 0, motorsOut: [], followers: [], spray: false,
  };
}

/* global DEMO */
if (!EMBED && typeof DEMO !== 'undefined') {
  S.course = DEMO.course;
  S.solids = DEMO.solids;
  S.craft = DEMO.craft;
  S.demo = !/[?&]demo=0\b/.test(location.search);
  rebuild();
  if (/[?&]fpv=1\b/.test(location.search)) setFpv(true);
  window.__range = {
    set: accept,
    act,
    setFpv,
    state: () => ({ ...report(), demo: S.demo, frame: S.frame }),
  };
}
if (EMBED) {
  document.documentElement.classList.add('cf-embed');
  sendReady();
}
schedule();
