/* SimLab figure bridge, figure side. The protocol is in docs/FIGURES.md (after colorfigures-guide 2.3).
   It is inlined right after the vendored core.js and hooks mountFigure through CF_MOUNT_HOOKS, so any figure that
   calls mountFigure(cfg) speaks it. A figure opts in to state with
     cfg.embed = { accept(st, patch, ui) -> true | false | 'why not', report(st) -> small object of discrete values }
   Nothing else in the state can be written from outside. */
(() => {
  const IN = 'simlab', OUT = 'simlab-figure', V = 1;
  const html = document.documentElement;
  const host = CF_EMBED && window.parent !== window ? window.parent : null;
  const fileMode = location.protocol === 'file:';
  // same-origin hosting by default; ?origin= names the host when the figure is served from elsewhere
  const hostOrigin = (() => { const o = CF_Q.get('origin'); if (!o) return location.origin;
    try { const u = new URL(o); return /^https?:$/.test(u.protocol) ? u.origin : location.origin; } catch (e) { return location.origin; } })();
  // under file:// the real origin is opaque and a message aimed at "file://" is dropped, so tests post to '*'
  const target = fileMode ? '*' : hostOrigin;
  const send = (type, data) => { if (!host) return; try { host.postMessage({ source: OUT, v: V, type, ...(data || {}) }, target); } catch (e) {} };
  const err = message => { CF_NOTE(message); send('error', { message: String(message) }); };
  const own = (o, k) => o != null && Object.prototype.hasOwnProperty.call(o, k);

  addEventListener('error', e => send('error', { message: String(e.message || e) }));
  addEventListener('unhandledrejection', e => send('error', { message: String((e.reason && e.reason.message) || e.reason) }));

  // a non-English first paint waits (briefly) for the host's dictionary instead of flashing English
  let waitT = 0;
  const unwait = () => { clearTimeout(waitT); html.classList.remove('cf-wait'); };
  if (host && CF_LANG !== 'en'){ html.classList.add('cf-wait'); waitT = setTimeout(unwait, 1500); }

  let cfg = null, ui = null, live = false, byHost = false, plain = null;
  const queue = [], custom = {};
  addEventListener('message', ev => {
    if (!host || ev.source !== host) return;
    if (fileMode ? !(ev.origin === 'null' || ev.origin === 'file://') : ev.origin !== hostOrigin) return;
    const m = ev.data;
    if (!m || typeof m !== 'object' || m.source !== IN || m.v !== V || typeof m.type !== 'string') return;
    if (!live){ if (queue.length < 200) queue.push(m); return; }
    handle(m);
  });

  const labelOf = el => { const s = el.querySelector('[data-cft]'); return (s ? s.textContent : el.textContent).replace('▾', '').trim(); };
  const enOf = el => { const s = el.querySelector('[data-cft]'); return s ? s.dataset.cft : labelOf(el); };
  const readout = () => { if (typeof cfg.readout !== 'function') return '';
    try { return String(CF_T(cfg.readout(ui.st)) ?? ''); } catch (e) { return ''; } };
  const report = () => { if (!cfg.embed || typeof cfg.embed.report !== 'function') return null;
    try { return cfg.embed.report(ui.st); } catch (e) { CF_NOTE('report: ' + e.message); return null; } };
  // pressable parts in the drawing right now (for the host's accessible list); a part may carry data-id and data-label
  const parts = () => { const seen = new Set(), out = [];
    for (const el of document.querySelectorAll('#art [data-act]')){
      const act = el.dataset.act; if (!own(cfg.acts, act)) continue;
      const id = el.dataset.id ?? null, key = act + '|' + (id ?? ''); if (seen.has(key)) continue; seen.add(key);
      const en = el.dataset.label || act; out.push({ act, id, label: CF_T(en), en }); }
    return out; };
  const labels = () => { if (html.classList.contains('nolabels')) return [];
    const m = new Map();
    for (const g of document.querySelectorAll('#fig .tag[data-t]')){ const n = +g.dataset.n;
      if (!m.has(n)) m.set(n, { n, text: g.dataset.t, en: g.dataset.en ?? g.dataset.t, on: g.classList.contains('on') }); }
    return [...m.values()].sort((a, b) => a.n - b.n); };
  const buttons = () => [...document.querySelectorAll('#btns .act[data-id]')]
    .map(b => ({ id: b.dataset.id, label: labelOf(b), en: enOf(b), picker: !!b.querySelector('.car') }));
  const switches = () => [...document.querySelectorAll('.vset .act[data-id]')]
    .map(b => ({ id: b.dataset.id, label: labelOf(b), on: b.getAttribute('aria-pressed') === 'true' }));

  const sendReady = () => plain ? send('ready', { ...plain(), lang: CF_LANG, embedded: true }) : send('ready', {
    fig: cfg.fig ?? null, title: CF_T(cfg.title), en: cfg.title, lang: CF_LANG,
    buttons: buttons(), switches: switches(), acts: Object.keys(cfg.acts || {}), parts: parts(),
    pals: Object.keys(PALS), pal: ui.st.pal, view: { yaw: YAW, pitch: PITCH },
    state: report(), readout: readout(), embedded: true });

  // after renders: state, readout and parts at most ~30 times a second, labels whenever they change
  let last = { state: undefined, readout: undefined, parts: undefined, labels: undefined }, flushT = 0, sentAt = 0;
  const flush = () => { flushT = 0; sentAt = performance.now();
    const st = report(), sj = JSON.stringify(st), ro = readout(), pj = JSON.stringify(parts()), lb = labels(), lj = JSON.stringify(lb);
    if (sj !== last.state || ro !== last.readout || pj !== last.parts){
      const prev = last.state ? JSON.parse(last.state) : null, changed = [];
      if (st && typeof st === 'object') for (const k of Object.keys(st)) if (!prev || JSON.stringify(prev[k]) !== JSON.stringify(st[k])) changed.push(k);
      last.state = sj; last.readout = ro; last.parts = pj;
      send('state', { state: st, changed, readout: ro, parts: JSON.parse(pj) }); }
    if (lj !== last.labels){ last.labels = lj; send('labels', { items: lb }); } };
  const schedule = () => { if (!flushT) flushT = setTimeout(flush, Math.max(0, 33 - (performance.now() - sentAt))); };

  const click = el => { byHost = true; try { el.click(); } finally { byHost = false; } };
  const press = (id, choice) => {
    const b = [...document.querySelectorAll('.act[data-id]')].find(e => e.dataset.id === String(id));
    if (!b) return err(`no button "${id}"`);
    const wrap = b.closest('.stepwrap');
    if (choice == null || !(wrap && wrap.classList.contains('open'))) click(b);
    if (choice == null) return;
    const c = wrap && [...wrap.querySelectorAll('.chip')].find(e => e.dataset.id === String(choice));
    if (!c) return err(`no choice "${choice}" in "${id}"`);
    click(c);
  };
  const runAct = (name, data) => {
    if (typeof name !== 'string' || !own(cfg.acts, name)) return err(`no act "${name}"`);
    const d = {}; if (data && typeof data === 'object') for (const [k, v] of Object.entries(data)) d[k] = String(v);
    const el = [...document.querySelectorAll('#art [data-act]')].find(e => e.dataset.act === name && Object.entries(d).every(([k, v]) => e.dataset[k] === v))
      || { dataset: { act: name, ...d }, getAttribute: k => (k.startsWith('data-') ? d[k.slice(5)] : null) ?? null, closest: () => null };
    send('part', { act: name, id: el.dataset.id ?? null, data: { ...el.dataset }, by: 'host' });
    cfg.acts[name](ui.st, el, ui); ui.render();
  };
  const setState = patch => {
    const accept = cfg.embed && cfg.embed.accept;
    if (typeof accept !== 'function') return err('set: this figure takes no state');
    if (!patch || typeof patch !== 'object' || Array.isArray(patch)) return err('set: state must be an object');
    let r; try { r = accept(ui.st, patch, ui); } catch (e) { return err('set: ' + e.message); }
    if (r === false || typeof r === 'string') err('set rejected' + (typeof r === 'string' ? ': ' + r : ''));
    ui.render();
  };
  const num = (v, lo, hi, dflt) => { const x = +v; return v != null && Number.isFinite(x) ? Math.min(hi, Math.max(lo, x)) : dflt; };

  // pause: the host hid the figure (or the tab is hidden). Every animation step is held instead of run, so the figure's
  // clock stops where it is; resume hands the held steps back to the core's frame driver
  let hostPaused = false, held = new Set(), animate0 = null;
  const paused = () => hostPaused || document.hidden;
  const wake = () => { if (paused() || !animate0) return; const steps = [...held]; held = new Set(); for (const s of steps) animate0(s); };
  const holdable = step => function held1(dt){ if (paused()){ held.add(held1); return false; } return step(dt); };
  document.addEventListener('visibilitychange', wake);

  const H = {
    hello: () => sendReady(),
    pause: () => { hostPaused = true; },
    resume: () => { hostPaused = false; wake(); },
    press: m => press(m.id, m.choice),
    act: m => runAct(m.name, m.data),
    set: m => setState(m.state),
    view: m => { const y = num(m.yaw, -720, 720, null); if (y == null) return err('view: yaw must be a number');
      ui.camTo(y, num(m.pitch, -90, 90, PITCH), num(m.ms, 1, 5000, 700)); },
    xr: m => { const b = document.getElementById('xrb'); if (!b) return err('xr: this figure has no see-through');
      if (!!ui.st.xrT !== !!m.on) click(b); },
    labels: m => { const b = document.getElementById('lblb') || document.getElementById('lbl');
      if (!html.classList.contains('nolabels') !== !!m.on && b) click(b); schedule(); },
    pal: m => { if (typeof m.key !== 'string' || !own(PALS, m.key)) return err(`pal: no palette "${m.key}"`);
      ui.st.pal = m.key; for (const s of document.querySelectorAll('#pals .sw')) s.setAttribute('aria-pressed', s.title === m.key); ui.render(); },
    locale: m => { CF_SETLOCALE(typeof m.lang === 'string' ? m.lang : 'en', m.strings); unwait(); if (cfg) schedule(); },
    theme: m => CF_THEME(m.mode),
    flash: m => { if (m.text == null) return err('flash: text missing'); ui.flash(String(m.text), num(m.ms, 300, 15000, 1600)); },
    query: () => { const st = report(), ro = readout(), ps = parts();
      send('state', { state: st, changed: [], readout: ro, parts: ps }); send('labels', { items: labels() }); },
  };
  const handle = m => { const h = own(H, m.type) && (cfg || m.type === 'hello' || m.type === 'locale' || m.type === 'theme') ? H[m.type]
      : own(custom, m.type) ? custom[m.type] : null;
    if (!h) return err(`unknown message "${m.type}"`);
    try { h(m); } catch (e) { err(`${m.type}: ${e.message}`); } };

  // for engines and pages: extra events (e.g. sfx), extra commands, and pages that never call mountFigure
  window.CF_BRIDGE = Object.freeze({
    embedded: !!host,
    send: (type, data) => { if (typeof type !== 'string' || !type || type === 'ready') return err(`CF_BRIDGE.send: "${type}" is reserved or invalid`); send(type, data); },
    on: (type, fn) => { if (typeof type !== 'string' || own(H, type) || typeof fn !== 'function') return err(`CF_BRIDGE.on: "${type}" is reserved or invalid`); custom[type] = fn; },
    // a page without mountFigure (the flight range): info() returns its ready payload; queued commands then run
    plain: info => { if (cfg || plain || typeof info !== 'function') return; plain = info; live = true; unwait(); sendReady();
      for (const m of queue.splice(0)) if (m.type !== 'hello') handle(m); },
  });

  CF_MOUNT_HOOKS.push((c, u) => {
    cfg = c; ui = u;
    const fig = document.getElementById('fig');
    fig.setAttribute('tabindex', '0');
    // parts: report the press before the figure acts on it, so 'part' arrives ahead of the 'state' it causes
    fig.addEventListener('pointerdown', e => { if (e.button) return; const a = e.target.closest && e.target.closest('[data-act]');
      if (a && own(cfg.acts, a.dataset.act)) send('part', { act: a.dataset.act, id: a.dataset.id ?? null, data: { ...a.dataset }, by: 'user' }); }, true);
    // buttons, chips and switches, whoever pressed them, reported before their handlers run (so ahead of the
    // flash and state they cause); a switch reports the position it is turning to
    document.addEventListener('click', e => { const el = e.target.closest && e.target.closest('.act[data-id], .chip[data-id]'); if (!el) return;
      const by = byHost ? 'host' : 'user';
      if (el.classList.contains('chip')){ const p = el.closest('.stepwrap'), b = p && p.querySelector('.act[data-id]');
        send('button', { id: b ? b.dataset.id : null, choice: el.dataset.id, by }); }
      else send('button', { id: el.dataset.id, by, ...(el.closest('.vset') ? { on: el.getAttribute('aria-pressed') !== 'true' } : {}) }); }, true);
    addEventListener('focus', () => send('focus', { on: true }));
    addEventListener('blur', () => send('focus', { on: false }));
    const f0 = ui.flash; ui.flash = (text, ms) => { f0(text, ms); send('flash', { text: CF_T(text), en: String(text) }); };
    const r0 = ui.render; ui.render = () => { r0(); schedule(); };
    animate0 = ui.animate; ui.animate = step => animate0(holdable(step));
    const go = () => { if (live) return; live = true; sendReady(); flush();
      for (const m of queue.splice(0)) if (m.type !== 'hello') handle(m); };
    if (document.readyState === 'loading') addEventListener('DOMContentLoaded', go, { once: true }); else queueMicrotask(go);
  });
})();
