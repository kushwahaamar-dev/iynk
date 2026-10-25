/* Colorfigures core.js, vendored for SimLab from the Colorfigures skill (MIT, see LICENSE in this folder).
   Upstream sha256 a78aab94ab7396b99080bf72673d5d4d689d771764d76cb08f1a0d28033f7fc3. SimLab patches: PATCHES.md. Regenerate with vendor.py, never edit by hand. */
/* ============================================================
   Colorfigures core: projection, shapes, shading, ink, labels, page shell.
   A figure page includes this file (scripts/build.py inlines it), then calls mountFigure({...}).
   See SKILL.md for the drawing contract and conventions.
   One fixed view (front-left-top) and one fixed light (from above, behind the viewer's right shoulder: the front is lit,
   the left side is in shade, and cast shadows fall toward the lower left of the screen).
   ============================================================ */

/* ---------- palettes ---------- */
const PALS = {
  mustard: { l:'#f4b829', m:'#d49c1f', d:'#4e4a18' },
  tomato:  { l:'#ef6a4c', m:'#cf5038', d:'#4a2219' },
  mint:    { l:'#93d3b0', m:'#71b693', d:'#1f4034' },
  cobalt:  { l:'#76a0e2', m:'#5a82c6', d:'#1c2948' },
  blush:   { l:'#f3a6bb', m:'#d8869c', d:'#4b2430' },
};
const METAL   = { l:'#eef0f0', m:'#c6ccce', d:'#8f989b' };
const CLEAR   = { l:'#e4f2f4', m:'#c4dfe4', d:'#97b9c0' };
const CERAMIC = { l:'#fbfaf3', m:'#e3e0d2', d:'#bdb8a6' };
const DARK    = { l:'#55504a', m:'#3d3935', d:'#272421' };
const INK = '#231e16';
const SHADOW = '#41538f';

/* ---------- SimLab patches (see figures/vendor/colorfigures/PATCHES.md) ---------- */
// P3 embedded mode: on inside any iframe or with ?embed=1; ?embed=0 forces it off. ?bare=1 also hides the figure's
// own buttons, stats, switches and keypad. ?theme=dark dims the paper (P4). ?lang=xx is the first language (P2).
const CF_Q = new URLSearchParams(location.search);
const CF_EMBED = CF_Q.get('embed') === '1' || (CF_Q.get('embed') !== '0' && window.parent !== window);
const CF_NOTE = m => { const h = document.documentElement, s = ' ' + m + ';'; if (!(h.dataset.errors || '').includes(s)) h.dataset.errors = (h.dataset.errors || '') + s; };
// P2: every figure string goes through CF_T(english, vars?). Keys are the English text, so a missing entry still
// reads; {name} placeholders are filled from vars after the lookup.
let CF_LANG = /^[a-z]{2}(-[A-Za-z]+)?$/.test(CF_Q.get('lang') || '') ? CF_Q.get('lang') : 'en', CF_STR = {};
const CF_T = (s, vars) => {
  let t = s != null && typeof s === 'string' && Object.prototype.hasOwnProperty.call(CF_STR, s) ? CF_STR[s] : s;
  if (vars && typeof t === 'string') t = t.replace(/\{(\w+)\}/g, (m, k) => Object.prototype.hasOwnProperty.call(vars, k) ? String(vars[k]) : m);
  return t; };
const CF_ESC = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
// a translatable piece of chrome: English, or [template, vars] for one with a live value (['Press {name}', { name }]),
// which keeps its template and values so a new dictionary relabels it
const CF_L = s => { const [k, v] = Array.isArray(s) ? s : [s, null];
  return `<span data-cft="${CF_ESC(k)}"${v ? ` data-cftv="${CF_ESC(JSON.stringify(v))}"` : ''}>${CF_ESC(CF_T(k, v))}</span>`; };
const CF_SLUG = s => String(s).toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'button';
// P1: label pills are sized from the real text width in the pill's font (cached per string at 100 px), not from
// text.length, which overflows CJK and doubles Devanagari (combining marks count as characters)
const CF_TW = (() => { const cache = new Map(); let g = null;
  return (text, fs) => { const s = String(text); let w = cache.get(s);
    if (w == null){
      const n = typeof Intl !== 'undefined' && Intl.Segmenter ? [...new Intl.Segmenter().segment(s)].length : [...s].length;
      try { g = g || document.createElement('canvas').getContext('2d'); g.font = '800 100px ui-monospace,Menlo,monospace';
        w = g.measureText(s).width / 100 + .04 * n; }        // + the pill's letter-spacing of .04em per character
      catch (e) { w = .62 * n; }
      if (!(w > 0)) w = .62 * n;
      cache.set(s, w); }
    return w * fs; }; })();
// P5 (Appendix E): a material given as a colour string ('#rrggbb') is turned into a material; anything else is
// reported on data-errors and drawn dark instead of crashing the whole render
const CF_MAT = m => { if (typeof m === 'string' && /^#[0-9a-f]{6}$/i.test(m)) return matOf(m); CF_NOTE('bad material ' + String(m)); return DARK; };
// P5 (Appendix E): option objects are checked, so a misspelt or invented option is reported instead of ignored
const CF_OPTS = (who, o, known, need = []) => { if (!o || typeof o !== 'object') return CF_NOTE(who + ': options missing');
  for (const k of Object.keys(o)) if (!known.includes(k)) CF_NOTE(`${who}: unknown option "${k}"`);
  for (const k of need) if (o[k] == null) CF_NOTE(`${who}: option "${k}" missing`); };
// P3: the embedded frame follows the iframe's own shape (.7501 keeps the centred framing without the desktop nudge)
const CF_FRAME_A = () => { const w = innerWidth, h = innerHeight; return w > 50 && h > 50 ? Math.min(1.4, Math.max(.7501, h / w)) : .75; };
// P5 (Appendix E): html.cf-moving is set while frames are being drawn (drag, turn, animation) and cleared 220 ms after
// the last one; cfbuild.py drops the hand-drawn filter only then on phones, which is what build.py's docstring promises
let CF_MOVE_T = 0;
const CF_MOVED = () => { const h = document.documentElement; h.classList.add('cf-moving'); clearTimeout(CF_MOVE_T);
  CF_MOVE_T = setTimeout(() => h.classList.remove('cf-moving'), 220); };
const CF_MOUNT_HOOKS = [];       // functions (cfg, ui) run at the end of mountFigure; figures/engine/embed.js uses it
let CF_UI = null, CF_CFG = null;
// P2: swap the dictionary and relabel everything already on the page, then redraw
function CF_SETLOCALE(lang, strings){
  CF_LANG = typeof lang === 'string' && lang ? lang : 'en';
  CF_STR = strings && typeof strings === 'object' && !Array.isArray(strings) ? strings : {};
  document.documentElement.lang = CF_LANG === 'zh' ? 'zh-Hans' : CF_LANG;
  for (const el of document.querySelectorAll('.zchip button[aria-label]:not([data-cft-aria])')) el.dataset.cftAria = el.getAttribute('aria-label');
  for (const el of document.querySelectorAll('[data-cft]')) el.textContent = CF_T(el.dataset.cft, el.dataset.cftv ? JSON.parse(el.dataset.cftv) : null);
  for (const el of document.querySelectorAll('[data-cft-aria]')) el.setAttribute('aria-label', CF_T(el.dataset.cftAria));
  if (CF_CFG) document.title = CF_T(CF_CFG.title);
  if (CF_UI) CF_UI.render();
}
// P4: a dark host keeps the figure a paper plate, only dimmer (the colours, ink and pills are designed for paper)
const CF_THEME = mode => document.documentElement.classList.toggle('cf-dark', mode === 'dark');
const CF_CSS = `
  :root{color-scheme:light}
  html.cf-dark{--paper:#e4ddcf;--rule:#cbc2b1;--muted:#6a6357}
  #fig:focus-visible{outline:2px solid var(--ink);outline-offset:-3px}
  html.cf-embed,html.cf-embed body{height:100%;overflow:hidden}
  html.cf-embed body{padding:0;display:block}
  html.cf-embed body>header,html.cf-embed .controls,html.cf-embed .made-with,html.cf-embed .lgd,html.cf-embed .mcap{display:none!important}
  html.cf-embed .stage{max-width:none;height:100%;display:flex;flex-direction:column}
  html.cf-embed .zwrap{flex:1 1 auto;min-height:0}
  html.cf-embed #fig{max-width:none;width:100%;height:100%!important;max-height:none!important;margin:0;flex:1 1 auto;min-height:0}
  @media (min-width:561px){html.cf-embed .actions{left:12px;top:10px}html.cf-embed .vset{right:12px;top:10px!important}html.cf-embed #stats{right:12px}}
  @media (max-width:560px){html.cf-embed .stage{padding:8px 10px 0}}
  html.cf-bare .actions,html.cf-bare .vset,html.cf-bare .stats,html.cf-bare .kpad{display:none!important}
  html.cf-wait .stage{visibility:hidden}`;
{ const h = document.documentElement;
  if (CF_EMBED) h.classList.add('cf-embed');
  if (CF_EMBED && CF_Q.get('bare') === '1') h.classList.add('cf-bare');
  if (CF_Q.get('theme') === 'dark') h.classList.add('cf-dark');
  h.lang = CF_LANG === 'zh' ? 'zh-Hans' : CF_LANG; }

/* ---------- projection (x = depth toward viewer-right, y = toward viewer-left, z = up) ---------- */
const C = Math.cos(Math.PI/6), S = Math.sin(Math.PI/6);
let OX = 0, OY = 0;
/* Free orthographic camera (internal names start with CAM_ / cam so they never clash with a figure's own names). YAW turns the viewer around the vertical axis (45° = the classic front-left view),
   PITCH is how far it looks down (35.26° = true isometric). At the defaults P() is exactly the old isometric
   projection, so every figure drawn for it still lines up. Drag the figure to orbit; double-click to reset.
   rotV(n) maps a world direction into the default view's frame, so vis / tone / any "sum of rotV > 0" test keep
   working at every angle: the viewer is always (1,1,1) and the light stays put relative to the viewer. */
let VIEW = 0, RC = [0, 0], RCZ = 0;
const VIEW_NAMES = ['front', 'left side', 'back', 'right side'];
const TURNS = [0, 2];
const YAW0 = 45, PITCH0 = Math.atan(1/Math.SQRT2) * 180/Math.PI, CAM_K = Math.sqrt(1.5);
let YAW = YAW0, PITCH = PITCH0, CAM_R, CAM_U, CAM_V, CAM_D;                       // right, up, toward viewer, screen-down
const camBasis = (yaw, pitch) => { const t = yaw*Math.PI/180, p = pitch*Math.PI/180, ct = Math.cos(t), st = Math.sin(t), cp = Math.cos(p), sp2 = Math.sin(p);
  return { R:[st,-ct,0], U:[-sp2*ct,-sp2*st,cp], V:[cp*ct,cp*st,sp2] }; };
const CAM_B0 = camBasis(YAW0, PITCH0);
// CAM_LIM: how far (deg) the camera may turn either side of the front view; null = all the way round (set per figure)
let CAM_LIM = null;
function setCam(yaw, pitch){ YAW = CAM_LIM == null ? yaw : Math.max(YAW0 - CAM_LIM, Math.min(YAW0 + CAM_LIM, yaw));
  PITCH = CAM_LIM == null ? Math.max(6, Math.min(78, pitch)) : Math.max(15, Math.min(62, pitch)); const b = camBasis(YAW, PITCH); CAM_R = b.R; CAM_U = b.U; CAM_V = b.V; CAM_D = CAM_U.map(v => -v); }
setCam(YAW0, PITCH0);
const camDot = (a,b) => a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const rotV = n => { const r = camDot(n,CAM_R), u = camDot(n,CAM_U), v = camDot(n,CAM_V); return [0,1,2].map(i => CAM_B0.R[i]*r + CAM_B0.U[i]*u + CAM_B0.V[i]*v); };
// the light's ground direction turns with the viewer's yaw only (shadows always fall toward the lower left of the screen)
const yawTurn = ([x,y]) => { const t = (YAW - YAW0)*Math.PI/180, c = Math.cos(t), s = Math.sin(t); return [x*c - y*s, x*s + y*c]; };
const rotXY = (x,y) => [x, y];                                                // kept for old callers
const P0 = (x,y,z) => [(x-y)*C + OX, (x+y)*S - z + OY];                       // raw iso
const P  = (x,y,z) => { const q = [x-RC[0], y-RC[1], z-RCZ];
  return [CAM_K*camDot(q,CAM_R) + (RC[0]-RC[1])*C + OX, CAM_K*camDot(q,CAM_D) + (RC[0]+RC[1])*S - RCZ + OY]; };
const Dv = (x,y,z) => [CAM_K*camDot([x,y,z],CAM_R), CAM_K*camDot([x,y,z],CAM_D)];
// distance toward the viewer: draw parts with smaller depth first
const depthOf = p => camDot(p, CAM_V);
// sort [{at:[x,y,z], svg}] back-to-front for the current camera. A part may also give box:[[x0,y0,z0],[x1,y1,z1]]:
// when two boxes are separated along x, y or z, the one on the viewer's side goes last (a centre point alone gets long
// or wrapping parts wrong: a pole beside a row of keys, a spout reaching past a cup).
const boxMid = b => [0,1,2].map(k => (b[0][k] + b[1][k]) / 2);
const sepOrder = (p, q) => { if (!p.box || !q.box) return 0;
  for (let k = 0; k < 3; k++){ if (p.box[1][k] <= q.box[0][k] + 1e-6) return CAM_V[k] >= 0 ? -1 : 1; if (q.box[1][k] <= p.box[0][k] + 1e-6) return CAM_V[k] >= 0 ? 1 : -1; }
  return 0; };
const byDepth = parts => parts.filter(Boolean).sort((p,q) => sepOrder(p,q) || (depthOf(p.at || boxMid(p.box)) - depthOf(q.at || boxMid(q.box)))).map(p => p.svg).join('');
// the half of a vertical ring that faces the viewer / is turned away, as [from, to] angles in degrees (0 = +x, 90 = +y)
const nearHalf = () => [YAW - 90, YAW + 90], farHalf = () => [YAW + 90, YAW + 270];
// an open container (cup, bin, cone, drum) between two rings: far inner wall, then its contents, then the near outer wall
const openShell = (A, B, colour, contents = '') => loft(A, B, colour, true) + contents + loft(A, B, colour);
const f  = v => v.toFixed(1);
const pd = (pts, close=true) => 'M' + pts.map(p => { const q = P(p[0],p[1],p[2]); return f(q[0])+' '+f(q[1]); }).join('L') + (close ? 'Z' : '');
const sp = pts => 'M' + pts.map(q => f(q[0])+' '+f(q[1])).join('L') + 'Z';

/* ---------- 2D shapes in a plane's (u,v) coords (v up), mapped to 3D by a plane ---------- */
const arcUV  = (cu,cv,r,a0,a1,n=7) => { const o=[]; for (let i=0;i<=n;i++){ const a=(a0+(a1-a0)*i/n)*Math.PI/180; o.push([cu+r*Math.cos(a), cv+r*Math.sin(a)]); } return o; };
const rrUV   = (u0,v0,u1,v1,r,n=7) => r <= 0 ? rectUV(u0,v0,u1,v1) : [...arcUV(u1-r,v0+r,r,-90,0,n), ...arcUV(u1-r,v1-r,r,0,90,n), ...arcUV(u0+r,v1-r,r,90,180,n), ...arcUV(u0+r,v0+r,r,180,270,n)];
const rectUV = (u0,v0,u1,v1) => [[u0,v0],[u1,v0],[u1,v1],[u0,v1]];
const ellUV  = (cu,cv,ru,rv,n=24) => Array.from({length:n}, (_,i) => { const a=i/n*2*Math.PI; return [cu+ru*Math.cos(a), cv+rv*Math.sin(a)]; });
const PX = x => ([u,v]) => [x,u,v];      // front-facing plane x = const   (u = y, v = z)
const PY = y => ([u,v]) => [u,y,v];      // side plane y = const           (u = x, v = z)
const PZ = z => ([u,v]) => [u,v,z];      // horizontal plane z = const     (u = x, v = y)
const on = (plane, uv) => uv.map(plane);

/* ---------- vectors + shading ---------- */
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]], dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
const norm=a=>{ const l=Math.hypot(...a)||1; return a.map(v=>v/l); };
const avg=ps=>ps.reduce((s,p)=>[s[0]+p[0]/ps.length,s[1]+p[1]/ps.length,s[2]+p[2]/ps.length],[0,0,0]);
const vis = n => { const r = rotV(n); return r[0]+r[1]+r[2] > 1e-6; };   // viewer looks from (+1,+1,+1) after the turn
const facing = vis;                                                       // readable alias: is this face toward the viewer?
const SHADOW_K = 0.85, AZ_MIN = 20, AZ_MAX = 160;
// cast shadows are drawn shorter than the shading light implies (0.45 × height instead of 0.85 ×): long shadows of tall
// parts on thin supports (a lamp shade, a fan head) land far from the object and read as separate blobs
const SHADOW_LEN = 0.45;
let L = [0,0,1], SH = [0,0];
function setLight(deg){ const a=deg*Math.PI/180; SH=[SHADOW_K*Math.cos(a), SHADOW_K*Math.sin(a)]; L=norm([-SH[0],-SH[1],1]); }
const LIN = norm([.6,.2,1]);                       // fixed light for interiors / small props
// Three flat tones, but blended across a narrow band at each step, so a face that turns past a threshold while the
// figure rotates fades between tones instead of snapping (at rest almost every face still sits on a pure tone).
const SOFT = .18;
const step3 = (d, hi, lo, m) => { if (!m || typeof m !== 'object') m = CF_MAT(m); const ss = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a)/(b - a))); return k*k*(3 - 2*k); };
  const a = ss(hi - SOFT, hi + SOFT, d), b = ss(lo - SOFT, lo + SOFT, d);
  return a >= 1 ? m.l : b <= 0 ? m.d : a > 0 ? mix(m.m, m.l, a) : b < 1 ? mix(m.d, m.m, b) : m.m; };
const tone  = (n,m) => step3(dot(rotV(n),L),   -.15, -.45, m);   // exterior, follows the sun
const toneI = (n,m) => step3(dot(rotV(n),LIN),  .6,   .05, m);   // interior / props
const mix = (a,b,t) => '#' + [1,3,5].map(i => Math.round(parseInt(a.substr(i,2),16)*(1-t) + parseInt(b.substr(i,2),16)*t).toString(16).padStart(2,'0')).join('');
const matOf = hex => ({ l:hex, m:mix(hex,'#000000',.16), d:mix(hex,'#000000',.42) });
const ease = t => t<.5 ? 2*t*t : 1-Math.pow(-2*t+2,2)/2;

/* ---------- drawing primitives (all return SVG strings) ---------- */
const ink   = (d,w=1.0) => `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"/>`;
const fill  = (d,c,extra='') => `<path d="${d}" fill="${c}" ${extra}/>`;
const face  = (d,c) => `<path d="${d}" fill="${c}" stroke="${c}" stroke-width=".7" stroke-linejoin="round"/>`;
const shape = (pts,c,w=.9) => fill(pd(pts),c) + (w ? ink(pd(pts),w) : '');
const line  = (pts,w=.9) => ink(pd(pts,false),w);
// Loft between two rings of equal length (closed). colour(n) picks each strip's fill; flip = seen from inside.
function loft(A, B, colour, flip=false){
  const n=A.length, cen=avg(A.concat(B)); let s='';
  for (let i=0;i<n;i++){
    const a0=A[i], a1=A[(i+1)%n], b1=B[(i+1)%n], b0=B[i];
    let nr = norm(cross(sub(a1,a0), sub(b0,a0)));
    if (!isFinite(nr[0])) continue;
    if (dot(nr, sub(avg([a0,a1,b1,b0]), cen)) < 0) nr = nr.map(v=>-v);
    if (flip) nr = nr.map(v=>-v);
    if (vis(nr)) s += face(pd([a0,a1,b1,b0]), colour(nr));
  }
  return s;
}
function hull(pts){
  pts = pts.slice().sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
  const cr=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]); const lo=[], up=[];
  for (const p of pts){ while(lo.length>=2 && cr(lo[lo.length-2],lo[lo.length-1],p)<=0) lo.pop(); lo.push(p); }
  for (const p of pts.reverse()){ while(up.length>=2 && cr(up[up.length-2],up[up.length-1],p)<=0) up.pop(); up.push(p); }
  lo.pop(); up.pop(); return lo.concat(up);
}
// Silhouette ink, weighted by how thick the part is on screen (like a hand inker): the w you pass is the most it gets.
// Thickness = 2 × area / perimeter of the outline (a rod's diameter, about half a box's width), as a share of the
// frame width. A long thin rod, a handle or a knob stays light (~1–1.5); a grinder, kettle or machine body gets the
// heavy ~2.4–2.8. Thin parts stay thin and parts keep air between them.
const hullInk = (pts3, w=1.4) => { const h = hull(pts3.map(p=>P(...p))); let a = 0, per = 0;
  for (let i = 0; i < h.length; i++){ const p = h[i], q = h[(i+1) % h.length]; a += p[0]*q[1] - q[0]*p[1]; per += Math.hypot(q[0]-p[0], q[1]-p[1]); }
  const thick = per ? Math.abs(a) / per / (INK_K * INK_REF_VB) : 0;
  return ink(sp(h), Math.min(w, .9 + 20*thick)); };
// Axis-aligned box: three visible faces, shaded, each outlined. shade = tone (sunlit) or toneI (interior).
function box(x0,y0,z0,x1,y1,z1,m,shade=toneI,w=.9){
  // all six faces, drawn only when they face the viewer (sides first, then top) — correct in every VIEW
  const F = [
    [[0,1,0],  [[x0,y1,z0],[x1,y1,z0],[x1,y1,z1],[x0,y1,z1]]],
    [[1,0,0],  [[x1,y0,z0],[x1,y1,z0],[x1,y1,z1],[x1,y0,z1]]],
    [[0,-1,0], [[x0,y0,z0],[x1,y0,z0],[x1,y0,z1],[x0,y0,z1]]],
    [[-1,0,0], [[x0,y0,z0],[x0,y1,z0],[x0,y1,z1],[x0,y0,z1]]],
    [[0,0,1],  [[x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1]]] ];
  return F.filter(([n]) => vis(n)).map(([n,q]) => shape(q, shade(n,m), w)).join('');
}
// Rounded-profile extrusion: profile (u=y, v=z) swept along x from x0 to x1. Body of most machines.
function extrude(profileUV, x0, x1, m, shade=tone){ return loft(on(PX(x0),profileUV), on(PX(x1),profileUV), n=>shade(n,m)); }
// Vertical cylinder (axis z) centred (x,y), radius r from z0 to z1, with top cap.
function cyl(x,y,z0,z1,r,m,shade=toneI,w=1.2,n=24){
  const A=on(PZ(z0),ellUV(x,y,r,r,n)), B=on(PZ(z1),ellUV(x,y,r,r,n));
  return loft(A,B,nr=>shade(nr,m)) + fill(pd(B),shade([0,0,1],m)) + hullInk([...A,...B],w) + ink(pd(B),w*.8);
}
// Cylinder lying along x (e.g. a knob or dial sticking out of a front face): centred (y,z), from x0 to x1.
function cylX(x0,x1,y,z,r,m,shade=toneI,w=1.1,n=20){
  const A=on(PX(x0),ellUV(y,z,r,r,n)), B=on(PX(x1),ellUV(y,z,r,r,n));
  // cap on whichever end faces the viewer (the +x end in VIEW 0)
  const capB = vis([1,0,0]), cap = capB ? B : A, cn = capB ? [1,0,0] : [-1,0,0];
  return loft(A,B,nr=>shade(nr,m)) + (vis(cn) ? fill(pd(cap),shade(cn,m)) : '') + hullInk([...A,...B],w) + (vis(cn) ? ink(pd(cap),w*.8) : '');
}
// Cylinder between any two 3D points a and b (a lamp arm, a rod, a pipe at an angle, a handle bar), radius r.
// The end facing the viewer gets a cap. For a tapered part (a cone, a lamp shade) pass r1 for the radius at b.
function rod(a, b, r, m, shade=toneI, w=1, r1=r, n=16){
  const d = norm(sub(b, a)), u = norm(cross(d, Math.abs(d[2]) < .9 ? [0,0,1] : [1,0,0])), v = cross(d, u);
  const ring = (p, rr) => Array.from({length:n}, (_,i) => { const t = i/n*2*Math.PI, c = Math.cos(t)*rr, s2 = Math.sin(t)*rr;
    return [p[0] + u[0]*c + v[0]*s2, p[1] + u[1]*c + v[1]*s2, p[2] + u[2]*c + v[2]*s2]; });
  const A = ring(a, r), B = ring(b, r1), capB = vis(d), cap = capB ? B : A, cn = capB ? d : d.map(x => -x);
  return loft(A, B, nr => shade(nr, m)) + (Math.max(r, r1) > 0 ? fill(pd(cap), shade(cn, m)) + ink(pd(cap), w*.8) : '') + hullInk([...A, ...B], w);
}
// Text lying flat on a front plane x = const, centred at (y,z) baseline; reads left-to-right on screen.
// text sits on a face: if its reading direction comes out mirrored (or edge-on), that face is turned away, so the text is hidden
const txM = (o, U, V) => (U[0]*V[1] - U[1]*V[0]) <= .02 * Math.hypot(...U) * Math.hypot(...V) ? `matrix(0 0 0 0 ${f(o[0])} ${f(o[1])})` : `matrix(${U[0].toFixed(4)} ${U[1].toFixed(4)} ${V[0].toFixed(4)} ${V[1].toFixed(4)} ${f(o[0])} ${f(o[1])})`;
const tx = (x,y,z,str,size,col=INK,weight=700) => { const o=P(x,y,z);
  return `<text transform="${txM(o, Dv(0,-1,0), Dv(0,0,-1))}" font-size="${size}" fill="${col}" text-anchor="middle" font-family="ui-monospace,Menlo,monospace" font-weight="${weight}" letter-spacing=".04em">${str}</text>`; };
// Text on a side plane y = const, centred at (x,z).
const txY = (x,y,z,str,size,col=INK,weight=700) => { const o=P(x,y,z);
  return `<text transform="${txM(o, Dv(1,0,0), Dv(0,0,-1))}" font-size="${size}" fill="${col}" text-anchor="middle" font-family="ui-monospace,Menlo,monospace" font-weight="${weight}" letter-spacing=".04em">${str}</text>`; };
// Cast shadow of a set of 3D points (any outline of the object), pushed along the light onto z = 0.
// the light stays put relative to the viewer, so the shadow is cast in turned coordinates
// z0: the surface it falls on (a board, a counter); clip it to that surface with clipTo(...) if it could spill off.
// clip: the 3D outline of the surface it falls on (e.g. boardTop(...)), so it can't spill over the edge.
const castShadow = (pts3, z0=0, clip=null) => { const k = SHADOW_LEN / SHADOW_K, [sx, sy] = yawTurn(SH);
  const s = fill(sp(hull(pts3.map(([x,y,z]) => P(x+(z-z0)*sx*k, y+(z-z0)*sy*k, z0)))), SHADOW);
  return clip ? clipTo(clip, s) : s; };
// A board for the object to stand on (a tray, a desk top, a counter): a rounded slab from (x0,y0) to (x1,y1), h thick.
// Draw it first; then castShadow(points, h, boardTop(x0,y0,x1,y1,h,r)) so shadows lie on it and stop at its edge.
const BOARD = { l:'#e6e1d4', m:'#cfc8b8', d:'#aaa293' }, WOOD = { l:'#d9a86c', m:'#bf8a4f', d:'#8e6236' };
const boardTop = (x0,y0,x1,y1,h=3,r=5) => on(PZ(h), rrUV(x0,y0,x1,y1,r));
function board(x0,y0,x1,y1,h=3,r=5,m=BOARD){
  const A = on(PZ(0), rrUV(x0,y0,x1,y1,r)), B = boardTop(x0,y0,x1,y1,h,r);
  return loft(A, B, n => toneI(n, m)) + fill(pd(B), m.l) + ink(pd(B), 1) + hullInk([...A, ...B], 1.8);
}
// Group helpers: clickable target, clip to an opening.
const act  = (name, inner, data='') => `<g data-act="${name}" ${data}>${inner}</g>`;
let _clipN = 0;
// Part label (for "how does it work" figures): a cream pill with a leader line to a 3D point on the part.
// dx, dy = where the pill sits, in screen units at the reference zoom (they scale with the figure like stroke widths).
// on = that part is working right now (the pill turns the accent colour). Labels can be hidden with the Labels switch.
function tag(p3, dx, dy, text, on=false){
  const t = CF_T(text), te = CF_ESC(t);
  // on a phone (LBL_U = drawing units per screen px) the pill is a numbered badge and the names go in a legend under the figure
  const u = window.LBL_U ? LBL_U() : 0, n = ((window.__ln || (window.__ln = {}))[text] || (__ln[text] = Object.keys(__ln).length + 1));
  const k = INK_K, [X,Y] = P(...p3), fs = u ? 10*u : 8.6*k, h = u ? 17*u : fs*1.8, w = u ? h*(n > 9 ? 1.3 : 1) : CF_TW(t, fs) + fs*1.5, cx = X + dx*k, cy = Y + dy*k;
  return `<g class="tag${on ? ' on' : ''}" data-n="${n}" data-t="${te}" data-en="${CF_ESC(text)}"><path d="M${f(X)} ${f(Y)}L${f(cx)} ${f(cy)}" fill="none" stroke="${INK}" stroke-width="1"/>`
    + `<circle cx="${f(X)}" cy="${f(Y)}" r="${f(1.3*k)}" fill="${INK}"/>`
    + `<rect x="${f(cx-w/2)}" y="${f(cy-h/2)}" width="${f(w)}" height="${f(h)}" rx="${f(h/2)}" fill="${on ? 'var(--accent,#f4b829)' : '#fff4d6'}" stroke="${INK}" stroke-width="1.2"/>`
    + `<text x="${f(cx)}" y="${f(cy+fs*.36)}" font-size="${f(fs)}" text-anchor="middle" font-family="ui-monospace,Menlo,monospace" font-weight="800" letter-spacing=".04em" fill="${INK}">${u ? n : te}</text></g>`;
}
const clipTo = (pts3, inner) => { const id = 'k' + (++_clipN); return `<clipPath id="${id}"><path d="${pd(pts3)}"/></clipPath><g clip-path="url(#${id})">${inner}</g>`; };

/* ---------- constant on-screen line weight ----------
   Stroke widths are written in model units, and each figure is zoomed to fill the frame, so a small
   object would get fat lines. INK_K rescales every stroke-width (and the wobble/grain filter) so all
   figures match the reference zoom of the booth / vending machine (viewBox ≈ 585 units wide). */
const INK_REF_VB = 585;
let INK_K = 1;
const inkScale = svg => INK_K === 1 ? svg : svg.replace(/stroke-width="([\d.]+)"/g, (_, w) => `stroke-width="${(+w * INK_K).toFixed(2)}"`);

/* ---------- page shell ---------- */
const CORE_CSS = `
  :root{--paper:#f2efe7;--ink:#231e16;--muted:#857d6e;--rule:#ddd6c8}
  *{box-sizing:border-box} html,body{margin:0;height:100%}
  body{background-color:var(--paper);
    background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='320' height='320'><filter id='p'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 .42  0 0 0 0 .39  0 0 0 0 .33  .16 0 0 0 0'/></filter><rect width='100%' height='100%' filter='url(%23p)'/></svg>");
    overflow-x:hidden;color:var(--ink);font:13px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace;display:flex;flex-direction:column;align-items:center;padding:24px 16px 32px}
  header{width:100%;max-width:760px;display:flex;justify-content:space-between;align-items:baseline;gap:12px;flex-wrap:wrap}
  header h1{font-size:13px;font-weight:600;margin:0;letter-spacing:.02em} header span{color:var(--muted)}
  #fig{width:100%;max-width:760px;height:auto;display:block;margin:4px 0 8px;user-select:none;overflow:visible}
  #fig{cursor:grab;touch-action:pan-y} #fig.drag{cursor:grabbing} #fig [data-act]{cursor:pointer}
  #readout, .idea{display:none}   /* status line + big idea are off: the buttons and motion tell the story */
  .idea{width:100%;max-width:760px;margin:-6px 0 16px;font-size:12.5px;line-height:1.5;text-align:center;color:var(--ink)}
  .idea strong{letter-spacing:.12em;text-transform:uppercase;font-size:11px;margin-right:8px}
  #readout{position:relative;min-height:1.4em;letter-spacing:.08em;text-transform:uppercase;margin-bottom:14px;text-align:center;text-shadow:0 0 3px var(--paper),0 0 6px var(--paper),0 0 10px var(--paper)}
  .stage{position:relative;width:100%;max-width:760px}
  .actions{position:absolute;top:4px;left:0;display:flex;flex-direction:column;align-items:flex-start;gap:8px;z-index:2;max-width:220px}
  .actions .cap{color:var(--muted);font-size:11px;letter-spacing:.08em;text-transform:uppercase;margin:0 0 2px}
  html.nolabels #fig .tag{display:none}
  .ctl[hidden]{display:none}
  /* ui.flash(text): a short note under the buttons ("the can is empty — refill it"); the status line itself stays hidden */
  .toast{position:absolute;left:0;z-index:3;font-size:11.5px;letter-spacing:.06em;text-transform:uppercase;background:var(--paper);
    border:1.5px solid var(--ink);border-radius:8px;padding:4px 9px;box-shadow:2px 2px 0 var(--ink);opacity:0;transition:opacity .2s;pointer-events:none;max-width:240px}
  .toast.show{opacity:1}
  .made-with{width:100%;max-width:760px;margin-top:18px;text-align:right;font-size:11px;letter-spacing:.1em;text-transform:uppercase}
  .made-with a{color:var(--muted);text-decoration:none} .made-with a:hover{color:var(--ink)}
  .stats{position:absolute;top:4px;right:0;display:flex;flex-direction:column;align-items:flex-end;gap:10px;z-index:2;text-align:right}
  .stat .k{font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}
  .stat .v{font-size:34px;font-weight:800;line-height:1.05;letter-spacing:-.01em;font-variant-numeric:tabular-nums;color:var(--ink)}
  .stat.small .v{font-size:20px}
  .stat .v.bump{animation:bump .35s ease-out}
  @keyframes bump{0%{transform:scale(1.18)}100%{transform:none}}
  .stepwrap{position:relative;display:flex;align-items:center;gap:8px}
  .act{font:inherit;color:var(--ink);background:var(--paper);border:1.5px solid var(--ink);border-radius:999px;padding:5px 14px;cursor:pointer;white-space:nowrap}
  .act:hover{background:color-mix(in srgb,var(--paper) 92%,var(--ink))}
  .act .car{margin-left:6px;font-size:10px}
  .act:focus-visible{outline:2px solid var(--ink);outline-offset:3px}
  .chips{display:none;flex-wrap:wrap;gap:6px;background:var(--paper);border:2px solid var(--ink);border-radius:12px;box-shadow:3px 3px 0 var(--ink);
    padding:8px;width:max-content;max-width:min(300px,62vw);position:absolute;left:calc(100% + 10px);top:-4px;z-index:3}
  .stepwrap.open .chips{display:flex}
  .chip{white-space:nowrap;font:inherit;font-size:11.5px;font-weight:700;color:var(--ink);background:var(--paper);border:1.5px solid var(--ink);border-radius:8px;padding:4px 8px;cursor:pointer;box-shadow:2px 2px 0 var(--ink)}
  .chip:hover{background:var(--accent,#f4b829);transform:translate(-1px,-1px)}
  .chip.current{background:var(--ink);color:var(--paper)} .chip.current:hover{background:var(--ink);transform:none}
  .chip.off{opacity:.45} .chip.off:hover{transform:none;background:var(--paper)}
  
  @media (max-width:560px){body{padding:14px 12px 24px}header span,.actions .cap{display:none}.actions{flex-direction:row;flex-wrap:wrap;gap:6px}.act{font-size:12px;padding:4px 11px}.stats{position:static;flex-direction:row;justify-content:flex-end;gap:18px;margin-bottom:4px}.actions{position:static;max-width:none;margin:6px 0 4px}.chips{left:0;top:calc(100% + 8px)}}
  .controls{width:100%;max-width:760px;display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px 28px;border-top:1px solid var(--rule);padding-top:16px}
  .ctl{display:flex;flex-direction:column;gap:6px}
  .ctl label{color:var(--muted);font-size:11px;letter-spacing:.08em;text-transform:uppercase}
  input[type=range]{width:100%;accent-color:var(--ink)}
  .row{display:flex;gap:8px;flex-wrap:wrap}
  button{font:inherit;color:var(--ink);background:transparent;border:1.5px solid var(--ink);border-radius:999px;padding:5px 14px;cursor:pointer}
  button:hover{background:#0000000d}
  button[aria-pressed=true]:not(.sw){background:var(--ink);color:var(--paper)}
  .sw{width:26px;height:26px;padding:0;border-radius:50%} .sw[aria-pressed=true]{outline:2px solid var(--ink);outline-offset:2px}`;

const filterFor = k => `<filter id="hand" x="-3%" y="-3%" width="106%" height="106%" color-interpolation-filters="sRGB">
  <feTurbulence type="fractalNoise" baseFrequency="${(0.045/k).toFixed(4)}" numOctaves="2" seed="4" result="warp"/>
  <feDisplacementMap id="wob" in="SourceGraphic" in2="warp" scale="${(2.4*k).toFixed(2)}" xChannelSelector="R" yChannelSelector="G" result="wob"/>
  <feTurbulence type="fractalNoise" baseFrequency="${(0.9/k).toFixed(4)}" numOctaves="3" seed="11" result="n1"/>
  <feColorMatrix in="n1" type="matrix" values=".3 0 0 0 .84  .3 0 0 0 .84  .3 0 0 0 .84  0 0 0 0 1" result="grain"/>
  <feTurbulence type="fractalNoise" baseFrequency="${(0.012/k).toFixed(4)}" numOctaves="2" seed="7" result="n2"/>
  <feColorMatrix in="n2" type="matrix" values=".3 0 0 0 .85  .3 0 0 0 .85  .3 0 0 0 .85  0 0 0 0 1" result="blot"/>
  <feBlend in="wob" in2="grain" mode="multiply" result="g1"/><feBlend in="g1" in2="blot" mode="multiply" result="g2"/>
  <feComposite in="g2" in2="wob" operator="in"/></filter>`;

/* mountFigure({
     fig:'03', title:'Photo booth', hint:'click the curtain…',
     size:[W,D,H],                 // bounding box, used to frame the view (shadow range included)
     palette:'mustard',            // default PALS key
     state:{...},                  // figure state (st.pal is built in)
     scene: (st, m) => svgString,  // m = current palette {l,m,d}
     readout: st => 'text',        // status line under the figure
     buttons: [{label, onClick(st, ui)}      // listed in the order the user should do them
               | {label, choices: st => [{label, onClick(st,ui), current?, disabled?, why?}]}],   // opens a picker
     stats: st => [{label, value, small?}],   // optional: big numbers top-right (credit, change, score)
     credit: false,                // optional: hide the small "Made with Colorfigures" link
     acts: { name(st, el, ui){} },  // clicks on act(name, …) groups; el has dataset
     params(st, q){}               // optional: read URLSearchParams for screenshot states
   })  -> ui = { st, render, animate(stepFn), flash(text,ms) }
   animate(step): calls step(dt seconds) every frame and re-renders until step returns false. */
addEventListener('error', e => { document.documentElement.dataset.errors = (document.documentElement.dataset.errors || '') + ' ' + e.message + ';'; });
/* The hand-drawn filter's noise never changes, but browsers recompute every feTurbulence each time the drawing changes
   (on phones SVG filters run on the CPU, so this is most of the cost of a frame). bakeNoise renders each noise layer once
   into an image and swaps it in: coarse layers as one small image over the whole view (they are smooth, so scaling up
   is invisible), fine grain as a seamless tile. If anything fails (an old browser), the live filter simply stays. */
function bakeNoise(svg){
  const fl = document.getElementById('hand'); if (!fl || typeof Image === 'undefined') return;
  const NS = 'http://www.w3.org/2000/svg', vb = svg.viewBox.baseVal;
  const x0 = vb.x - vb.width*.35, y0 = vb.y - vb.height*.35, w0 = vb.width*1.7, h0 = vb.height*1.7;
  for (const t of [...fl.querySelectorAll('feTurbulence')]){
    const fq = parseFloat(t.getAttribute('baseFrequency')), oct = +(t.getAttribute('numOctaves') || 1);
    if (!(fq > 0)) continue;
    const fine = fq * Math.max(w0, h0) > 80;
    if (fine) continue;   // fine grain stays live: a repeated tile leaves faint seams on some GPUs
    const rx = fine ? 0 : x0, ry = fine ? 0 : y0, rw = fine ? 48 / fq : w0, rh = fine ? 48 / fq : h0;
    const ppu = fq * (fine ? 7 : 5) * Math.pow(2, Math.max(0, oct - 1) * .5), PW = Math.ceil(rw * ppu), PH = Math.ceil(rh * ppu);
    if (PW * PH > 1200 * 1200) continue;
    const tb = t.cloneNode(); tb.removeAttribute('result'); if (fine) tb.setAttribute('stitchTiles', 'stitch');
    const src = `<svg xmlns="${NS}" width="${PW}" height="${PH}" viewBox="${rx} ${ry} ${rw} ${rh}"><filter id="n" filterUnits="userSpaceOnUse" x="${rx}" y="${ry}" width="${rw}" height="${rh}" color-interpolation-filters="sRGB">${tb.outerHTML}</filter><rect x="${rx}" y="${ry}" width="${rw}" height="${rh}" filter="url(#n)"/></svg>`;
    const img = new Image();
    img.onload = () => { try {
      const c = document.createElement('canvas'); c.width = PW; c.height = PH; const g = c.getContext('2d'); g.drawImage(img, 0, 0);
      // store the noise's colour values fully opaque: the filter reads its colour channels, and an image with
      // see-through pixels would be read premultiplied (darker) by some browsers
      const px = g.getImageData(0, 0, PW, PH); for (let i = 3; i < px.data.length; i += 4) px.data[i] = 255; g.putImageData(px, 0, 0);
      const url = c.toDataURL('image/png'), res = t.getAttribute('result');
      const im = document.createElementNS(NS, 'feImage');
      // a tile must sit inside the filter's region (the drawing's box) or it gets clipped: anchor it at the drawing's
      // centre, snapped to whole tiles so the grain keeps the same phase as the live noise would
      let ox = rx, oy = ry;
      if (fine){ const bb = svg.getElementById ? document.getElementById('art').getBBox() : { x: 0, y: 0, width: 0, height: 0 };
        ox = Math.floor((bb.x + bb.width/2) / rw) * rw; oy = Math.floor((bb.y + bb.height/2) / rh) * rh; }
      for (const [k, v] of [['x', ox], ['y', oy], ['width', rw], ['height', rh], ['preserveAspectRatio', 'none']]) im.setAttribute(k, v);
      im.setAttribute('href', url); im.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', url);
      if (!t.isConnected) return;
      if (fine){ im.setAttribute('result', res + '_tile'); const tl = document.createElementNS(NS, 'feTile'); tl.setAttribute('in', res + '_tile'); tl.setAttribute('result', res); t.replaceWith(im, tl); }
      else { im.setAttribute('result', res); t.replaceWith(im); }
    } catch (e) {} };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(src);
  }
}
function mountFigure(cfg){
  document.title = CF_T(cfg.title);
  const style = document.createElement('style'); style.textContent = CORE_CSS + CF_CSS; document.head.appendChild(style);
  document.body.innerHTML = `
    <header><h1>Fig. ${cfg.fig} — ${CF_L(cfg.title)}</h1></header>
    <div class="stage">
      ${cfg.buttons && cfg.buttons.length ? `<div class="actions" id="btns"></div>` : ''}
      ${cfg.stats ? '<div class="stats" id="stats"></div>' : ''}
      <div class="toast" id="toast" role="status"></div>
      <svg id="fig" role="img" aria-label="${CF_ESC(CF_T(cfg.title))}" data-cft-aria="${CF_ESC(cfg.title)}"><defs id="fdefs"></defs><g id="art" filter="url(#hand)"></g></svg>
    </div>
    <div id="readout"></div>
    ${cfg.idea ? `<p class="idea"><strong>The big idea</strong>${cfg.idea}</p>` : ''}
    <div class="controls">
      <div class="ctl"><label for="wb">${CF_L('Hand-drawn wobble')}</label><input id="wb" type="range" min="0" max="7" step="0.1" value="2.4"></div>
      <div class="ctl"><label>${CF_L('Colour')}</label><div class="row" id="pals"></div></div>
      <div class="ctl"><label>${CF_L('View')}</label><div class="row"><button id="vreset">${CF_L('Front view')}</button><button id="vspin" aria-pressed="false">${CF_L('Turntable')}</button></div></div>
      <div class="ctl" id="lblctl" hidden><label>${CF_L('Labels')}</label><div class="row"><button id="lbl" aria-pressed="true" data-cft="On">${CF_ESC(CF_T('On'))}</button></div></div>
    </div>
    ${cfg.credit === false ? '' : '<footer class="made-with"><a href="https://april-zhu.com/colorfigures" target="_blank" rel="noopener">' + CF_L('Made with Colorfigures ↗') + '</a></footer>'}`;
  const st = cfg.state || {};            // kept as the same object, so a figure may hold on to it
  if (!st.pal) st.pal = cfg.palette || 'mustard';
  if (st.az == null) st.az = 105;
  const q = new URLSearchParams(location.search);
  // a figure turns all the way round only once it has been checked from every side (turn:'full'); otherwise it turns
  // +-60 deg around the front, where it was drawn. ?free=1 unlocks it for testing.
  CAM_LIM = cfg.turn === 'full' || q.get('free') === '1' ? null : 60;
  if (PALS[q.get('pal')]) st.pal = q.get('pal');
  if (cfg.params) cfg.params(st, q);

  // frame on the object itself: centred, filling ~60% of the width / ~78% of the height of a 4:3 view.
  // The cast shadow is allowed to spill outside the frame (svg overflow is visible).
  const [W,D,H] = cfg.size, pts = [];
  OX = OY = 0; RC = cfg.center || [W/2, D/2]; RCZ = H/2;
  VIEW = 0; setCam(YAW0, PITCH0);
  for (const x of [0,W]) for (const y of [0,D]) for (const z of [0,H]) pts.push(P(x,y,z));
  const xs=pts.map(p=>p[0]), ys=pts.map(p=>p[1]);
  const bw = Math.max(...xs)-Math.min(...xs), bh = Math.max(...ys)-Math.min(...ys);
  // the object fills ~74% of the width / ~88% of the height, nudged right of centre so the buttons (top left) stay clear
  // on a phone (FIG_A, from the gallery) the frame grows taller than 4:3, as far as the object needs, so tall machines fill it;
  // the spare height goes mostly below; the object stays centred (its shadow may run off the edge, by the owner's call)
  const PA = CF_EMBED ? CF_FRAME_A() : window.FIG_A ? FIG_A() : .75, A = PA === .75 ? .75 : Math.min(PA, Math.max(.75, bh/.88/(bw/.74)*1.08)), vbW = Math.max(bw/.74, bh/.88/A), vbH = vbW*A;
  OX = (vbW-bw)/2 + (PA === .75 ? vbW*.06 : 0) - Math.min(...xs); OY = (PA === .75 ? vbH*.04 : (vbH - bh)*.3) - Math.min(...ys);   // sit a little high: shadows fall downward
  const svg = document.getElementById('fig');
  svg.setAttribute('viewBox', `0 0 ${f(vbW)} ${f(vbH)}`);
  INK_K = vbW / INK_REF_VB;
  document.getElementById('fdefs').innerHTML = filterFor(INK_K);
  bakeNoise(svg);

  const art = document.getElementById('art'), readout = document.getElementById('readout');
  const ui = { st };
  ui.render = () => { _clipN = 0; document.documentElement.style.setProperty('--accent', PALS[st.pal].l); art.innerHTML = inkScale(cfg.scene(st, PALS[st.pal])); if (!ui._flash) readout.textContent = cfg.readout ? cfg.readout(st) : ''; if (ui.drawStats) ui.drawStats(); };
  // big numbers in the top-right corner (credit, change, score…); a value that changes gets a little bump
  const statsEl = document.getElementById('stats'), prevStats = {};
  ui.drawStats = () => { if (!statsEl) return;
    const list = cfg.stats(st).filter(Boolean), html = list.map(x => `<div class="stat${x.small ? ' small' : ''}"><div class="k">${x.label}</div><div class="v" data-k="${x.label}">${x.value}</div></div>`).join('');
    if (statsEl._html !== html){ statsEl._html = html; statsEl.innerHTML = html;
      statsEl.querySelectorAll('.v').forEach(v => { if (prevStats[v.dataset.k] != null && prevStats[v.dataset.k] !== v.textContent) v.classList.add('bump'); prevStats[v.dataset.k] = v.textContent; }); } };
  let flashT = 0;
  const toast = document.getElementById('toast');
  ui.flash = (text, ms=1600) => { ui._flashEn = text; text = CF_T(text); ui._flash = true; readout.textContent = text; toast.textContent = text;
    toast.style.top = ((document.getElementById('btns') ? document.getElementById('btns').offsetTop + document.getElementById('btns').offsetHeight : 0) + 8) + 'px'; toast.classList.add('show');
    clearTimeout(flashT); flashT = setTimeout(() => { ui._flash = false; toast.classList.remove('show'); ui.render(); }, ms); };
  // One frame driver for every running animation: each frame runs all the steps, then draws once (two animations at
  // the same time no longer draw twice). It follows the screen's frames, with a timer fallback for when frames don't
  // come (headless shots, a hidden tab). ui.invalidate() asks for one redraw on the next frame (used while dragging).
  const steps = new Set(); let driving = false, lastT = 0, fbT = 0;
  const frame = () => { if (!driving) return; driving = false; clearTimeout(fbT); CF_MOVED();
    const now = performance.now(), dt = Math.max(0, Math.min(.05, (now - lastT) / 1000)); lastT = now;
    for (const s of [...steps]) if (s(dt) === false) steps.delete(s);
    ui.render(); if (steps.size) drive(); };
  const drive = () => { if (driving) return; driving = true; requestAnimationFrame(frame); fbT = setTimeout(frame, 60); };
  ui.animate = step => { if (!steps.size && !driving) lastT = performance.now(); steps.add(step); drive(); };
  ui.invalidate = () => drive();

  // clickable parts react on press, not on click: while something animates, the scene is redrawn every frame, so the
  // element under the pointer is replaced between press and release and a 'click' would never fire
  svg.addEventListener('pointerdown', e => { if (e.button) return; const a = e.target.closest('[data-act]'); if (!a || !cfg.acts || !cfg.acts[a.dataset.act]) return;
    e.preventDefault(); cfg.acts[a.dataset.act](st, a, ui); ui.render(); });
  // orbit: drag anywhere that is not a clickable part (the machine turns the way the finger moves); arrow keys nudge; double-click eases back to the front view
  let drag = null, spin = false, camAnim = 0;
  const camTo = (y, p, ms=700) => { const y0 = YAW, p0 = PITCH, dy = ((y - y0 + 540) % 360) - 180, id = ++camAnim; let t = 0;
    ui.animate(dt => { if (id !== camAnim) return false; t += dt*1000; const k = Math.min(1, t / ms), e = ease(k); setCam(y0 + dy*e, p0 + (p - p0)*e); return k < 1; }); };
  ui.camTo = camTo;
  svg.addEventListener('pointerdown', e => { if (e.button || e.target.closest('[data-act]')) return;
    camAnim++; drag = { x:e.clientX, y:e.clientY, yaw:YAW, pitch:PITCH }; svg.classList.add("drag"); try { svg.setPointerCapture(e.pointerId); } catch {} });
  svg.addEventListener('pointermove', e => { if (!drag) return; const k = 300 / svg.getBoundingClientRect().width;
    setCam(drag.yaw + (e.clientX - drag.x)*.55*k, drag.pitch + (e.clientY - drag.y)*.35*k); ui.invalidate(); });
  const endDrag = () => { drag = null; svg.classList.remove('drag'); };
  svg.addEventListener('pointerup', endDrag); svg.addEventListener('pointercancel', endDrag);
  svg.addEventListener('dblclick', e => { if (!e.target.closest('[data-act]')) camTo(YAW0, PITCH0); });
  addEventListener('keydown', e => { const k = { ArrowLeft:[-15,0], ArrowRight:[15,0], ArrowUp:[0,8], ArrowDown:[0,-8] }[e.key];
    if (!k || window.GAME_KEYS || /input|textarea/i.test(e.target.tagName)) return; e.preventDefault(); camTo(YAW + k[0], PITCH + k[1], 260); });   // a game figure keeps the arrows for play
  document.getElementById('vreset').onclick = () => { spin = false; vsp.setAttribute('aria-pressed', false); camTo(YAW0, PITCH0); };
  const vsp = document.getElementById('vspin');
  vsp.onclick = () => { spin = !spin; vsp.setAttribute('aria-pressed', spin); camAnim++;
    let dir = 1;   // with a turning limit, the turntable swings back and forth inside it
    if (spin) ui.animate(dt => { if (!spin) return false; if (!drag){ let y = YAW + dir*dt*18;
      if (CAM_LIM != null && Math.abs(y - YAW0) >= CAM_LIM - .5){ dir = -dir; y = YAW + dir*dt*18; } setCam(y, PITCH); } return true; }); };
  if (q.has('yaw') || q.has('pitch')) setCam(+(q.get('yaw') ?? YAW0), +(q.get('pitch') ?? PITCH0));
  const btns = document.getElementById('btns');
  const stepEls = [];
  if (btns) cfg.buttons.forEach((b, i) => {
    const wrap = document.createElement('div'); wrap.className = 'stepwrap';
    const el = document.createElement('button'); el.className = 'act';
    el.dataset.id = b.id || CF_SLUG(Array.isArray(b.label) ? b.label[0] : b.label); el.innerHTML = `${CF_L(b.label)}${b.choices ? '<span class="car" aria-hidden="true">▾</span>' : ''}`;
    wrap.appendChild(el); btns.appendChild(wrap); stepEls.push(el);
    if (!b.choices){ el.onclick = () => { closeChips(); b.onClick(st, ui); ui.render(); }; return; }
    const chips = document.createElement('div'); chips.className = 'chips'; wrap.appendChild(chips);
    el.onclick = e => { e.stopPropagation(); const open = !wrap.classList.contains('open'); closeChips();
      if (!open) return;
      chips.innerHTML = '';
      // every choice stays clickable, so nothing silently ignores a press:
      //   current:true  = the one in use (shown selected); a press just says so
      //   disabled:true = not possible right now (shown faded); a press says why (c.why, or a generic note)
      for (const c of b.choices(st)){ const ch = document.createElement('button'); ch.className = 'chip' + (c.current ? ' current' : c.disabled ? ' off' : ''); ch.dataset.id = c.id || CF_SLUG(c.label); ch.textContent = CF_T(c.label);
        if (c.current) ch.setAttribute('aria-pressed', 'true');
        ch.onclick = ev => { ev.stopPropagation(); closeChips();
          if (c.current) return ui.flash(CF_T('{label} — already set', { label: CF_T(c.label) }));
          if (c.disabled) return ui.flash(c.why ? CF_T(c.why) : CF_T("{label} isn't possible right now", { label: CF_T(c.label) }));
          c.onClick(st, ui); ui.render(); }; chips.appendChild(ch); }
      wrap.classList.add('open'); };
  });
  function closeChips(){ document.querySelectorAll('.stepwrap.open').forEach(w => w.classList.remove('open')); }
  document.addEventListener('click', closeChips);

  document.getElementById('wb').oninput = e => document.getElementById('wob').setAttribute('scale', (e.target.value * INK_K).toFixed(2));
  const pals = document.getElementById('pals');
  for (const [k,p] of Object.entries(PALS)){
    const b = document.createElement('button'); b.className='sw'; b.title=k; b.style.background=p.l; b.setAttribute('aria-pressed', k===st.pal);
    b.onclick = () => { st.pal=k; [...pals.children].forEach(c=>c.setAttribute('aria-pressed', c===b)); ui.render(); };
    pals.appendChild(b);
  }
  // labels: the switch appears when the figure draws any tag(); ?labels=0 starts with them hidden
  const lblctl = document.getElementById('lblctl'), lbl = document.getElementById('lbl');
  const setLabels = on => { document.documentElement.classList.toggle('nolabels', !on); lbl.dataset.cft = on ? 'On' : 'Off'; lbl.textContent = CF_T(lbl.dataset.cft); lbl.setAttribute('aria-pressed', on); };
  lbl.onclick = () => setLabels(document.documentElement.classList.contains('nolabels'));
  if (q.get('labels') === '0') setLabels(false);
  // testing: ?press=Label@ms,Label@ms clicks the buttons whose text starts with Label at those times after load
  // (any order, repeats allowed); Label>Choice picks a choice from a picker button (?press=Speed>3@300).
  // Script errors and unknown labels are recorded on <html data-errors="…">
  window.__st = st;
  const noteErr = m => { document.documentElement.dataset.errors = (document.documentElement.dataset.errors || '') + ' ' + m + ';'; };
  const starts = (el, t) => el.textContent.trim().toLowerCase().startsWith(t.trim().toLowerCase());
  if (q.has('press')) q.get('press').split(',').forEach(item => { const [what, ms] = item.split('@'), [label, choice] = what.split('>');
    setTimeout(() => { const b = [...document.querySelectorAll('.act')].find(b => starts(b, label));
      if (!b) return noteErr(`no button "${label}"`);
      b.click(); if (choice == null) return;
      const c = [...b.parentElement.querySelectorAll('.chip')].find(c => starts(c, choice));
      if (c && !c.disabled) c.click(); else noteErr(`no choice "${choice}" in "${label}"`); }, +ms || 0); });
  setLight(st.az); ui.render();
  if (art.querySelector('.tag')) lblctl.hidden = false;
  CF_UI = ui; CF_CFG = cfg;
  for (const h of CF_MOUNT_HOOKS) try { h(cfg, ui); } catch (e) { CF_NOTE('mount hook: ' + e.message); }
  return ui;
}

/* ---------- see-through + labels kit (shared; the figure supplies its own working parts) ----------
   xrCallouts(items, B): pills in two columns either side of the object, sorted top to bottom so leaders never cross.
     items: [{ at:[x,y,z], text, on }], B: the object's bounds [x0, x1, y0, y1, z0, z1].
   xrGhost(body, mech, k, OUTp, x0, x1, m): far walls faintly, the working parts, then the case as a ghost over them.
   xrMount(getUI, caption): the See-through / Labels switches (top right), the caption under the figure, label hiding. */
function xrCallouts(items, B){
  const pts = []; for (const x of [B[0], B[1]]) for (const y of [B[2], B[3]]) for (const z of [B[4], B[5]]) pts.push(P(x, y, z));
  const xmin = Math.min(...pts.map(p => p[0])), xmax = Math.max(...pts.map(p => p[0])), cx = (xmin + xmax)/2;
  // on a phone (LBL_U = drawing units per screen px) each label is a numbered badge and the names go in a legend under the figure
  const k = INK_K, u = window.LBL_U ? LBL_U() : 0, fs = u ? 10*u : 8.6*k, hgt = u ? 17*u : fs*1.8, gap = hgt + (u ? 3*u : 3*k);
  const L = [], R = [];
  const svgEl = document.getElementById('fig'), vb = svgEl.viewBox.baseVal, btn = document.getElementById('btns');
  const wMax = u ? hgt*1.3 + 12*k : Math.max(0, ...items.map(it => CF_TW(CF_T(it.text), fs))) + fs*1.5 + 12*k;
  const roomL = xmin - vb.x >= wMax, roomR = vb.x + vb.width - xmax >= wMax;
  for (const it of items){ const [X, Y] = P(...it.at); ((X < cx && roomL) || !roomR ? L : R).push({ ...it, X, Y }); }
  let s = '';
  let top = { [-1]: fs, [1]: fs + 30*k }, tight = null, under = null;
  if (btn && svgEl.getScreenCTM()){ const r = btn.getBoundingClientRect(), inv = svgEl.getScreenCTM().inverse(), q = new DOMPoint(r.right, r.bottom + 50).matrixTransform(inv);
    if (q.y > 0){ top[-1] = q.y + hgt; tight = new DOMPoint(r.right, r.bottom + 6).matrixTransform(inv).y + hgt/2; } }
  // the right column starts under the stats panel (status, rails, counters) where that panel sits over the drawing
  const sts = document.getElementById('stats');
  if (sts && svgEl.getScreenCTM()){ const r = sts.getBoundingClientRect(), sr = svgEl.getBoundingClientRect();
    if (r.height && r.bottom > sr.top && r.top < sr.bottom && r.right > sr.left && r.left < sr.right){
      under = new DOMPoint(r.left, r.bottom + 6).matrixTransform(svgEl.getScreenCTM().inverse()).y + hgt/2; top[1] = Math.max(top[1], under); } }
  const stack = (col, side) => {
    col.sort((a, b) => a.Y - b.Y);
    let y = -1e9; for (const c of col){ c.py = Math.max(c.Y, y + gap, top[side]); y = c.py; }
    const shift = col.length ? Math.max(0, col.reduce((a, c) => a + c.py - c.Y, 0) / col.length) : 0;
    const room = col.length ? col[0].py - top[side] : 0; for (const c of col) c.py -= Math.min(shift, room);
  };
  stack(L, -1); stack(R, 1);
  // a tall button column pushes the left labels down: first they close up under the buttons, then the ones that would
  // still leave the frame move to the right column (clamped inside the frame even when the drawing leaves no room there)
  const bottom = vb.y + vb.height - hgt/2 - 2*k;
  if (tight != null && L.some(c => c.py > bottom)){ top[-1] = Math.min(top[-1], tight); stack(L, -1); }
  if (L.some(c => c.py > bottom)){ while (L.length && L[L.length - 1].py > bottom) R.push(L.pop()); stack(L, -1); stack(R, 1); }
  // a right column too long to fit under the stats panel starts at the top after all
  if (under != null && R.some(c => c.py > bottom)){ top[1] = fs + 30*k; stack(R, 1); }
  for (const [col, side] of [[L, -1], [R, 1]]){
    for (const c of col){
      c.n = ((window.__ln || (window.__ln = {}))[c.text] || (__ln[c.text] = Object.keys(__ln).length + 1)); const ct = CF_T(c.text), w = u ? hgt*(c.n > 9 ? 1.3 : 1) : CF_TW(ct, fs) + fs*1.5;
      let px = side < 0 ? xmin - 10*k - w/2 : xmax + 10*k + w/2; px = Math.max(vb.x + w/2 + 2*k, Math.min(vb.x + vb.width - w/2 - 2*k, px));
      const ex = px - side*w/2;
      s += `<g class="tag${c.on ? ' on' : ''}" data-n="${c.n}" data-t="${CF_ESC(ct)}" data-en="${CF_ESC(c.text)}"><path d="M${f(c.X)} ${f(c.Y)}L${f(ex + side*-4*k)} ${f(c.py)}L${f(ex)} ${f(c.py)}" fill="none" stroke="${INK}" stroke-width="1"/>`
        + `<circle cx="${f(c.X)}" cy="${f(c.Y)}" r="${f(1.4*k)}" fill="${INK}"/>`
        + `<rect x="${f(px - w/2)}" y="${f(c.py - hgt/2)}" width="${f(w)}" height="${f(hgt)}" rx="${f(hgt/2)}" fill="${c.on ? 'var(--accent,#f4b829)' : '#fff4d6'}" stroke="${INK}" stroke-width="1.2"/>`
        + `<text x="${f(px)}" y="${f(c.py + fs*.36)}" font-size="${f(fs)}" text-anchor="middle" font-family="ui-monospace,Menlo,monospace" font-weight="800" letter-spacing=".04em" fill="${INK}">${u ? c.n : CF_ESC(ct)}</text></g>`;
    }
  }
  return s;
}
function xrGhost(body, mech, k, OUTp, x0, x1, m){
  const fF = facing([1,0,0]), fB = facing([-1,0,0]);
  const far = `<g opacity="${f(.5*k)}">` + loft(on(PX(x0), OUTp), on(PX(x1), OUTp), n => mix(toneI(n.map(v => -v), m), '#f2efe7', .55), true)
    + (fF ? fill(pd(on(PX(x0), OUTp)), mix(m.d, '#f2efe7', .5)) : '') + (fB ? fill(pd(on(PX(x1), OUTp)), mix(m.d, '#f2efe7', .5)) : '') + `</g>`;
  return far + mech + `<g opacity="${f(1 - .8*k)}">${body}</g>` + `<g opacity="${f(.6*k)}">` + hullInk([...on(PX(x0), OUTp), ...on(PX(x1), OUTp)], 2.8) + `</g>`;
}
function xrMount(getUI, caption, opt = {}){   // opt.labelsOnly: only the Labels switch (the insides are on show already)
  const ui = getUI(), q = new URLSearchParams(location.search), html = document.documentElement;
  if (q.get('labels') !== '1') html.classList.add('nolabels');
  if (ui.st.xr == null){ ui.st.xr = 0; ui.st.xrT = 0; }
  if (q.get('xr') === '1') ui.st.xr = ui.st.xrT = 1;
  const old = document.getElementById('lblctl'); if (old) old.style.display = 'none';
  const vset = document.createElement('div'); vset.className = 'vset';
  vset.innerHTML = '<div class="vrow">' + (opt.labelsOnly ? '' : '<button class="act" id="xrb" data-id="xr" aria-pressed="false">' + CF_L('See-through') + '</button>') + '<button class="act" id="lblb" data-id="labels" aria-pressed="false">' + CF_L('Labels') + '</button></div>';
  document.querySelector('.stage').appendChild(vset);
  // pages with a stats panel in the top right: the switches go just under it
  const place = () => { const sp = document.getElementById('stats'); vset.style.top = sp ? (sp.offsetTop + sp.offsetHeight + 10) + 'px' : ''; };
  place(); new ResizeObserver(place).observe(document.getElementById('stats') || vset);
  const xrb = document.getElementById('xrb'), lblb = document.getElementById('lblb');
  const sync = () => { if (xrb) xrb.setAttribute('aria-pressed', !!getUI().st.xrT); lblb.setAttribute('aria-pressed', !html.classList.contains('nolabels')); };
  if (xrb) xrb.onclick = () => { const u = getUI(), st = u.st; st.xr = st.xr || 0; st.xrT = st.xrT ? 0 : 1; sync();
    u.animate(dt => { const g = Math.sign(st.xrT - st.xr); st.xr = Math.min(1, Math.max(0, st.xr + g*dt/.7)); return st.xr !== st.xrT; }); };
  lblb.onclick = () => { html.classList.toggle('nolabels'); sync(); };
  sync();
  const cap = document.createElement('p'); cap.className = 'mcap'; document.querySelector('.stage').after(cap);
  const css = document.createElement('style');
  css.textContent = '.vset{position:absolute;top:4px;right:0;z-index:2}.vrow{display:flex;gap:6px}.vset .act[aria-pressed=true]{background:var(--ink);color:var(--paper)}'
    + 'html.nolabels #fig .tag{display:none}.mcap{width:100%;max-width:760px;min-height:3em;margin:0 0 14px;font-size:12.5px;line-height:1.5;text-align:center;transition:opacity .3s}'
    + '@media (max-width:560px){.vset{position:static;margin:4px 0}}';
  document.head.appendChild(css);
  const r0 = ui.render; ui.render = () => { r0(); const st = getUI().st; cap.style.opacity = st.xr > .5 ? 1 : 0; cap.textContent = CF_T(caption(st)); };
  ui.render();
}
// same, for a body lofted between two horizontal rings A (bottom) and B (top)
function xrGhostRings(body, mech, k, A, B, m){
  const far = `<g opacity="${f(.5*k)}">` + loft(A, B, n => mix(toneI(n.map(v => -v), m), '#f2efe7', .55), true) + fill(pd(A), mix(m.d, '#f2efe7', .5)) + `</g>`;
  return far + mech + `<g opacity="${f(1 - .8*k)}">${body}</g>` + `<g opacity="${f(.6*k)}">` + hullInk([...A, ...B], 2.8) + `</g>`;
}
// generic see-through for any figure: the whole drawing fades back and the inside parts show over it.
//   opts: { mech(st, k) -> svg, inside(st) -> label items, surface(st) -> label items (optional), B: bounds, getSt() }
// washer-style ghost for an object without a single box case: its inside parts first, then the object pale over them
const xrUnder = (svg, mech, k) => `<g opacity="${f(k)}">${mech}</g><g opacity="${f(1 - .62*k)}">${svg}</g>`;
function xrWrap(sceneFn, opts){
  CF_OPTS('xrWrap', opts, ['mech', 'inside', 'surface', 'B', 'getSt', 'under', 'inline'], ['inside', 'B', 'getSt']);
  if (opts && !opts.inline && typeof opts.mech !== 'function') CF_NOTE('xrWrap: option "mech" missing');
  return function(){
    let s = sceneFn.apply(this, arguments);
    const st = opts.getSt(), k = ease(st.xr || 0);
    if (k > 0 && opts.under) s = xrUnder(s, opts.mech(st, k), k);   // the whole drawing is the object
    else if (k > 0 && !opts.inline) s = `<g opacity="${f(1 - .5*k)}">${s}</g><g opacity="${f(k)}">${opts.mech(st, k)}</g>`;   // inline: the figure ghosts its own case
    const items = k > .6 ? opts.inside(st) : opts.surface ? opts.surface(st) : [];
    return s + (items.length ? xrCallouts(items, opts.B) : '');
  };
}

/* ---------- game keypad: mountKeypad({ rows, hub:[col,row], action:'DROP', keys:[{ key:'ArrowLeft', glyph:'\u25c0', name, at:[col,row] }] })
   An inked pad under the buttons that sends the same keyboard events as the arrows and space (set window.GAME_KEYS = true
   so the arrows play instead of turning the camera). ---------- */
function mountKeypad(spec){
  const host = document.getElementById('btns'); if (!host) return;
  const css = document.createElement('style');
  css.textContent = `.kpad{display:flex;align-items:center;gap:16px;margin-top:6px;padding:10px 12px;border:1.5px solid var(--ink);border-radius:14px;
      background:var(--paper);box-shadow:0 3px 0 var(--ink);touch-action:none;user-select:none;-webkit-user-select:none}
    .kpad .dp{display:grid;grid-template-columns:repeat(3,34px);grid-template-rows:repeat(var(--rows),34px);gap:3px}
    .kpad .k{all:unset;box-sizing:border-box;display:flex;align-items:center;justify-content:center;width:34px;height:34px;cursor:pointer;
      background:#fbf7ea;border:1.5px solid var(--ink);border-radius:7px;box-shadow:0 3px 0 var(--ink);color:var(--ink);font:700 13px ui-monospace,Menlo,monospace;
      transition:transform .05s,box-shadow .05s,background .05s}
    .kpad .hub{width:34px;height:34px;display:flex;align-items:center;justify-content:center}
    .kpad .hub i{width:12px;height:12px;border-radius:50%;border:1.5px solid var(--ink);background:#e6e0d1}
    .kpad .go{all:unset;box-sizing:border-box;width:62px;height:62px;border-radius:50%;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;
      background:#e2483d;border:1.5px solid var(--ink);box-shadow:0 4px 0 var(--ink),inset 0 -5px 0 rgba(0,0,0,.18);color:#fff;font:800 12px ui-monospace,Menlo,monospace;letter-spacing:.06em;
      transition:transform .05s,box-shadow .05s}
    .kpad .go small{font:700 8px ui-monospace,Menlo,monospace;opacity:.85;letter-spacing:.08em;margin-top:2px}
    .kpad .down{transform:translateY(2px);box-shadow:0 1px 0 var(--ink)}
    .kpad .k.down{background:var(--accent,#f4b829)}
    .kpad .go.down{transform:translateY(3px);box-shadow:0 1px 0 var(--ink),inset 0 -3px 0 rgba(0,0,0,.18)}
    @media (max-width:560px){.kpad{gap:22px;padding:10px 16px}.kpad .dp{grid-template-columns:repeat(3,44px);grid-template-rows:repeat(var(--rows),44px)}
      .kpad .k,.kpad .hub{width:44px;height:44px;font-size:15px}.kpad .go{width:74px;height:74px}}`;
  document.head.appendChild(css);
  const pad = document.createElement('div'); pad.className = 'kpad'; pad.setAttribute('role', 'group'); pad.setAttribute('aria-label', CF_T('Keypad')); pad.dataset.cftAria = 'Keypad';
  const dp = document.createElement('div'); dp.className = 'dp'; dp.style.setProperty('--rows', spec.rows);
  const els = {};
  for (const k of spec.keys){
    const b = document.createElement('button'); b.className = 'k'; b.textContent = k.glyph; b.setAttribute('aria-label', CF_T(k.name)); b.dataset.cftAria = k.name;
    b.style.gridColumn = k.at[0] + 1; b.style.gridRow = k.at[1] + 1; dp.appendChild(b); els[k.key] = b; }
  if (spec.hub){ const h = document.createElement('div'); h.className = 'hub'; h.innerHTML = '<i></i>'; h.style.gridColumn = spec.hub[0] + 1; h.style.gridRow = spec.hub[1] + 1; dp.appendChild(h); }
  const go = document.createElement('button'); go.className = 'go'; go.innerHTML = `${CF_L(spec.action)}<small>${CF_L('SPACE')}</small>`; go.setAttribute('aria-label', CF_T(spec.action)); go.dataset.cftAria = spec.action;
  els[' '] = go;
  pad.append(dp, go); host.appendChild(pad);
  const send = (type, key) => dispatchEvent(new KeyboardEvent(type, { key, bubbles: true }));
  for (const [key, el] of Object.entries(els)){
    let held = null;
    el.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); if (held != null) return; held = e.pointerId;
      try { el.setPointerCapture(e.pointerId); } catch (_) {} send('keydown', key); });
    const release = e => { if (held == null || (e && e.pointerId !== held)) return; held = null; send('keyup', key); };
    el.addEventListener('pointerup', release); el.addEventListener('pointercancel', release); el.addEventListener('lostpointercapture', release);
    el.addEventListener('click', e => e.preventDefault());
    el.addEventListener('keydown', e => { if (e.key === 'Enter'){ e.preventDefault(); send('keydown', key); setTimeout(() => send('keyup', key), 120); } });
  }
  // space belongs to the game: a button that still has the focus from a click must not be pressed by it too
  addEventListener('keydown', e => { if (e.key === ' ' && e.target && e.target.closest && e.target.closest('button')) e.preventDefault(); }, true);
  addEventListener('keyup', e => { if (e.key === ' ' && e.target && e.target.closest && e.target.closest('button')) e.preventDefault(); }, true);
  // light the keys for real key presses too (and for the pad's own, which arrive the same way)
  addEventListener('keydown', e => { const el = els[e.key]; if (el) el.classList.add('down'); });
  addEventListener('keyup', e => { const el = els[e.key]; if (el) el.classList.remove('down'); });
  addEventListener('blur', () => Object.values(els).forEach(el => el.classList.remove('down')));
}
