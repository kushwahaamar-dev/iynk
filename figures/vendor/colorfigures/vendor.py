#!/usr/bin/env python3
"""Re-vendor the Colorfigures core for iynk.

    python3 -I figures/vendor/colorfigures/vendor.py [path/to/skill]

Reads the skill's assets/core.js (default ~/.claude/skills/colorfigures), checks it is the version recorded in
VERSION, applies the iynk patches listed in PATCHES.md and writes core.js next to this file. Every patch must
match exactly once, so a new upstream core fails here instead of silently losing a fix.
"""
import hashlib
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SKILL = sys.argv[1] if len(sys.argv) > 1 else os.path.expanduser('~/.claude/skills/colorfigures')
UPSTREAM_SHA = 'a78aab94ab7396b99080bf72673d5d4d689d771764d76cb08f1a0d28033f7fc3'

# P2/P3/P4/P5 support: the iynk block, inserted after the colour constants (core.js:21-22)
IYNK_BLOCK = r"""
/* ---------- iynk patches (see figures/vendor/colorfigures/PATCHES.md) ---------- */
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
"""

PATCHES = [
    # (id, old, new)
    ('P0 iynk block', "const SHADOW = '#41538f';\n", "const SHADOW = '#41538f';\n" + IYNK_BLOCK),
    ('P5 material strings', "const step3 = (d, hi, lo, m) => { const ss = ",
     "const step3 = (d, hi, lo, m) => { if (!m || typeof m !== 'object') m = CF_MAT(m); const ss = "),
    # tag(): translated, escaped, measured
    ('P2 tag text', "function tag(p3, dx, dy, text, on=false){\n",
     "function tag(p3, dx, dy, text, on=false){\n  const t = CF_T(text), te = CF_ESC(t);\n"),
    ('P1 tag width', "text.length*fs*.62 + fs*1.5, cx = X + dx*k", "CF_TW(t, fs) + fs*1.5, cx = X + dx*k"),
    ('P2 tag data-t', 'data-n="${n}" data-t="${text}">', 'data-n="${n}" data-t="${te}" data-en="${CF_ESC(text)}">'),
    ('P2 tag body', 'fill="${INK}">${u ? n : text}</text></g>`;', 'fill="${INK}">${u ? n : te}</text></g>`;'),
    # xrCallouts(): the same, in its two width computations
    ('P1 callout max width', "Math.max(...items.map(it => it.text.length))*fs*.62 + fs*1.5 + 12*k;",
     "Math.max(0, ...items.map(it => CF_TW(CF_T(it.text), fs))) + fs*1.5 + 12*k;"),
    ('P1 callout width', "const w = u ? hgt*(c.n > 9 ? 1.3 : 1) : c.text.length*fs*.62 + fs*1.5;",
     "const ct = CF_T(c.text), w = u ? hgt*(c.n > 9 ? 1.3 : 1) : CF_TW(ct, fs) + fs*1.5;"),
    ('P2 callout data-t', 'data-n="${c.n}" data-t="${c.text}">', 'data-n="${c.n}" data-t="${CF_ESC(ct)}" data-en="${CF_ESC(c.text)}">'),
    ('P2 callout body', '${u ? c.n : c.text}</text></g>`;', '${u ? c.n : CF_ESC(ct)}</text></g>`;'),
    # mountFigure(): page shell
    ('P2 title', "  document.title = cfg.title;\n", "  document.title = CF_T(cfg.title);\n"),
    ('P3 css', "style.textContent = CORE_CSS;", "style.textContent = CORE_CSS + CF_CSS;"),
    ('P2 header', "<header><h1>Fig. ${cfg.fig} — ${cfg.title}</h1></header>",
     "<header><h1>Fig. ${cfg.fig} — ${CF_L(cfg.title)}</h1></header>"),
    ('P2 svg label', '<svg id="fig" role="img" aria-label="${cfg.title}">',
     '<svg id="fig" role="img" aria-label="${CF_ESC(CF_T(cfg.title))}" data-cft-aria="${CF_ESC(cfg.title)}">'),
    ('P2 wobble', '<label for="wb">Hand-drawn wobble</label>', '<label for="wb">${CF_L(\'Hand-drawn wobble\')}</label>'),
    ('P2 colour', '<div class="ctl"><label>Colour</label>', '<div class="ctl"><label>${CF_L(\'Colour\')}</label>'),
    ('P2 view', '<div class="ctl"><label>View</label><div class="row"><button id="vreset">Front view</button><button id="vspin" aria-pressed="false">Turntable</button>',
     '<div class="ctl"><label>${CF_L(\'View\')}</label><div class="row"><button id="vreset">${CF_L(\'Front view\')}</button><button id="vspin" aria-pressed="false">${CF_L(\'Turntable\')}</button>'),
    ('P2 labels ctl', '<label>Labels</label><div class="row"><button id="lbl" aria-pressed="true">On</button>',
     '<label>${CF_L(\'Labels\')}</label><div class="row"><button id="lbl" aria-pressed="true" data-cft="On">${CF_ESC(CF_T(\'On\'))}</button>'),
    ('P2 credit', 'rel="noopener">Made with Colorfigures ↗</a>', 'rel="noopener">\' + CF_L(\'Made with Colorfigures ↗\') + \'</a>'),
    ('P3 frame shape', "const PA = window.FIG_A ? FIG_A() : .75,", "const PA = CF_EMBED ? CF_FRAME_A() : window.FIG_A ? FIG_A() : .75,"),
    ('P2 flash', "ui.flash = (text, ms=1600) => { ui._flash = true;", "ui.flash = (text, ms=1600) => { ui._flashEn = text; text = CF_T(text); ui._flash = true;"),
    ('P2 button label', "el.innerHTML = `${b.label}${b.choices ? '<span class=\"car\">▾</span>' : ''}`;",
     "el.dataset.id = b.id || CF_SLUG(Array.isArray(b.label) ? b.label[0] : b.label); el.innerHTML = `${CF_L(b.label)}${b.choices ? '<span class=\"car\" aria-hidden=\"true\">▾</span>' : ''}`;"),
    ('P2 chip label', "ch.textContent = c.label;", "ch.dataset.id = c.id || CF_SLUG(c.label); ch.textContent = CF_T(c.label);"),
    ('P2 chip current', "return ui.flash(`${c.label} — already set`);",
     "return ui.flash(CF_T('{label} — already set', { label: CF_T(c.label) }));"),
    ('P2 chip disabled', "return ui.flash(c.why || `${c.label} isn't possible right now`);",
     "return ui.flash(c.why ? CF_T(c.why) : CF_T(\"{label} isn't possible right now\", { label: CF_T(c.label) }));"),
    ('P2 on/off', "lbl.textContent = on ? 'On' : 'Off';", "lbl.dataset.cft = on ? 'On' : 'Off'; lbl.textContent = CF_T(lbl.dataset.cft);"),
    ('P3 mount hooks', "  if (art.querySelector('.tag')) lblctl.hidden = false;\n  return ui;\n}",
     "  if (art.querySelector('.tag')) lblctl.hidden = false;\n  CF_UI = ui; CF_CFG = cfg;\n"
     "  for (const h of CF_MOUNT_HOOKS) try { h(cfg, ui); } catch (e) { CF_NOTE('mount hook: ' + e.message); }\n  return ui;\n}"),
    # xrMount(): switches with stable ids, translated
    ('P2 xr switch', '<button class="act" id="xrb" aria-pressed="false">See-through</button>',
     '<button class="act" id="xrb" data-id="xr" aria-pressed="false">\' + CF_L(\'See-through\') + \'</button>'),
    ('P2 labels switch', '<button class="act" id="lblb" aria-pressed="false">Labels</button>',
     '<button class="act" id="lblb" data-id="labels" aria-pressed="false">\' + CF_L(\'Labels\') + \'</button>'),
    ('P2 caption', "cap.textContent = caption(st);", "cap.textContent = CF_T(caption(st));"),
    ('P5 xrWrap options', "function xrWrap(sceneFn, opts){\n",
     "function xrWrap(sceneFn, opts){\n  CF_OPTS('xrWrap', opts, ['mech', 'inside', 'surface', 'B', 'getSt', 'under', 'inline'], ['inside', 'B', 'getSt']);\n"
     "  if (opts && !opts.inline && typeof opts.mech !== 'function') CF_NOTE('xrWrap: option \"mech\" missing');\n"),
    ('P5 moving flag', "const frame = () => { if (!driving) return; driving = false; clearTimeout(fbT);",
     "const frame = () => { if (!driving) return; driving = false; clearTimeout(fbT); CF_MOVED();"),
    # mountKeypad(): translatable names
    ('P2 keypad group', "pad.setAttribute('aria-label', 'Keypad');", "pad.setAttribute('aria-label', CF_T('Keypad')); pad.dataset.cftAria = 'Keypad';"),
    ('P2 keypad keys', "b.textContent = k.glyph; b.setAttribute('aria-label', k.name);",
     "b.textContent = k.glyph; b.setAttribute('aria-label', CF_T(k.name)); b.dataset.cftAria = k.name;"),
    ('P2 keypad go', "go.innerHTML = `${spec.action}<small>SPACE</small>`; go.setAttribute('aria-label', spec.action);",
     "go.innerHTML = `${CF_L(spec.action)}<small>${CF_L('SPACE')}</small>`; go.setAttribute('aria-label', CF_T(spec.action)); go.dataset.cftAria = spec.action;"),
    # xrCallouts(): left labels pushed below the frame by a tall button column close up under the buttons, then move to
    # the right column (clamped inside the frame)
    ('P6 callout columns',
     '  let top = { [-1]: fs, [1]: fs + 30*k };\n  if (btn && svgEl.getScreenCTM()){ const r = btn.getBoundingClientRect(), q = new DOMPoint(r.right, r.bottom + 50).matrixTransform(svgEl.getScreenCTM().inverse());\n    if (q.y > 0) top[-1] = q.y + hgt; }\n  for (const [col, side] of [[L, -1], [R, 1]]){\n    col.sort((a, b) => a.Y - b.Y);\n    let y = -1e9; for (const c of col){ c.py = Math.max(c.Y, y + gap, top[side]); y = c.py; }\n    const shift = col.length ? Math.max(0, col.reduce((a, c) => a + c.py - c.Y, 0) / col.length) : 0;\n    const room = col.length ? col[0].py - top[side] : 0; for (const c of col) c.py -= Math.min(shift, room);\n',
     "  let top = { [-1]: fs, [1]: fs + 30*k }, tight = null, under = null;\n  if (btn && svgEl.getScreenCTM()){ const r = btn.getBoundingClientRect(), inv = svgEl.getScreenCTM().inverse(), q = new DOMPoint(r.right, r.bottom + 50).matrixTransform(inv);\n    if (q.y > 0){ top[-1] = q.y + hgt; tight = new DOMPoint(r.right, r.bottom + 6).matrixTransform(inv).y + hgt/2; } }\n  // the right column starts under the stats panel (status, rails, counters) where that panel sits over the drawing\n  const sts = document.getElementById('stats');\n  if (sts && svgEl.getScreenCTM()){ const r = sts.getBoundingClientRect(), sr = svgEl.getBoundingClientRect();\n    if (r.height && r.bottom > sr.top && r.top < sr.bottom && r.right > sr.left && r.left < sr.right){\n      under = new DOMPoint(r.left, r.bottom + 6).matrixTransform(svgEl.getScreenCTM().inverse()).y + hgt/2; top[1] = Math.max(top[1], under); } }\n  const stack = (col, side) => {\n    col.sort((a, b) => a.Y - b.Y);\n    let y = -1e9; for (const c of col){ c.py = Math.max(c.Y, y + gap, top[side]); y = c.py; }\n    const shift = col.length ? Math.max(0, col.reduce((a, c) => a + c.py - c.Y, 0) / col.length) : 0;\n    const room = col.length ? col[0].py - top[side] : 0; for (const c of col) c.py -= Math.min(shift, room);\n  };\n  stack(L, -1); stack(R, 1);\n  // a tall button column pushes the left labels down: first they close up under the buttons, then the ones that would\n  // still leave the frame move to the right column (clamped inside the frame even when the drawing leaves no room there)\n  const bottom = vb.y + vb.height - hgt/2 - 2*k;\n  if (tight != null && L.some(c => c.py > bottom)){ top[-1] = Math.min(top[-1], tight); stack(L, -1); }\n  if (L.some(c => c.py > bottom)){ while (L.length && L[L.length - 1].py > bottom) R.push(L.pop()); stack(L, -1); stack(R, 1); }\n  // a right column too long to fit under the stats panel starts at the top after all\n  if (under != null && R.some(c => c.py > bottom)){ top[1] = fs + 30*k; stack(R, 1); }\n  for (const [col, side] of [[L, -1], [R, 1]]){\n"),
]


def main():
    src = os.path.join(SKILL, 'assets', 'core.js')
    raw = open(src, 'rb').read()
    sha = hashlib.sha256(raw).hexdigest()
    if sha != UPSTREAM_SHA:
        sys.exit(f'upstream core.js changed (sha256 {sha}); review the patches against it and update UPSTREAM_SHA')
    js = raw.decode('utf-8')
    for name, old, new in PATCHES:
        n = js.count(old)
        if n != 1:
            sys.exit(f'patch {name!r}: expected 1 match, found {n}')
        js = js.replace(old, new)
    header = ('/* Colorfigures core.js, vendored for iynk from the Colorfigures skill (MIT, see LICENSE in this folder).\n'
              f'   Upstream sha256 {UPSTREAM_SHA}. iynk patches: PATCHES.md. Regenerate with vendor.py, never edit by hand. */\n')
    out = os.path.join(HERE, 'core.js')
    with open(out, 'w', encoding='utf-8') as fh:
        fh.write(header + js)
    print(f'wrote {out} ({len(PATCHES)} patches)')


if __name__ == '__main__':
    main()
