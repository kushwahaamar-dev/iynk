/* SimLab drone figure engine (engine:drone): registry, state, build flow, safety tests, scene and the bridge.
   Data format: docs/FIGURES-DRONE.md. Helpers live in drone-geo.js, layouts in drone-frames.js, piece drawings in
   drone-pieces.js and the wiring sheet in drone-sheet.js. Built on the Colorfigures core (MIT). */
window.SL = window.SL || {};
(() => {
  const SD = SL.drone = SL.drone || {};
  SD.kinds = SD.kinds || {};
  SD.layouts = SD.layouts || {};
  const T = (s, v) => CF_T(s, v);

  // every message the engine says or logs (English keys for src/i18n/figures/<lang>.json)
  const MSG = SD.MSG = {
    live: 'Unplug the battery first: never work on a live quad',
    exploded: 'Close the exploded view first',
    busy: 'Wait for the test to finish',
    already: '{short} is already on',
    after: '{short} goes on after {need}',
    propsLast: 'Props go on LAST: run the smoke stopper test and the motor direction check first',
    notOn: '{short} is not on',
    takeOff: 'Take the {dep} off first',
    off: '{short} is off',
    built: 'Already built',
    box: 'Already a box of parts',
    buildDone: 'Built: every part on, smoke test, motor check and calibration done',
    plugNeeds: 'Mount the battery and its power lead first',
    pop: 'POP: the capacitor was in backwards and vented. A smoke stopper would have caught it. Unplug, replace it',
    powered: 'Beep beep beep: ESCs armed-ready, FC and VTX on',
    unplugged: 'Battery unplugged',
    faultFix: 'Fix the fault first (unplug, replace the capacitor)',
    smokeNeeds: 'Solder the power lead and the ESC first',
    smokeShort: 'The smoke stopper lamp lit up: something is shorted. The cap is in backwards: flip it before you plug in for real',
    smokeOk: 'No short: the lamp only blinked. Safe to plug in',
    noMotors: 'Nothing to spin on this craft',
    motorNeeds: 'Wire the motors and mount the flight controller first',
    propsOff: 'PROPS OFF! Never spin motors on the bench with props on',
    needBatt: 'Plug in a battery (USB alone can’t spin motors)',
    motorWrong: '{m} spun the wrong way: reversed it in the ESC configurator. They all spin right now',
    motorsOk: 'Every motor spins the right way',
    calNeeds: 'Mount the flight controller first',
    calBack: 'Calibrated level. Note: the arrow on the FC points backwards, so it will flip on take-off',
    calOk: 'Accelerometer calibrated on a flat surface',
    explodeOn: 'Exploded view: every part lifted on its own layer',
  };
  const LOG = SD.LOG = {
    head: '-- {log} --',
    plugged: 'battery plugged: {v} V',
    unplugged: 'battery unplugged',
    pop: 'POP: input capacitor vented (fitted backwards)',
    smoke: '$ smoke stopper between battery and quad...',
    smokeShort: 'smoke stopper: SHORT detected',
    smokeOk: 'smoke stopper: no short, current ok',
    motors: '$ motors tab: spin {list} one at a time',
    reversed: '{m} direction reversed in ESC config',
    calBack: 'acc calibrated (but board_align is wrong!)',
    calOk: '$ calibrate accelerometer: done, level = 0.0 / 0.0',
    auto: '$ build it for me: smoke stopper, motor check and calibration done',
    capNew: 'new capacitor fitted',
  };
  const ENGINE_IDS = ['FRAME', 'MOTORS', 'ESC', 'WIRES', 'FC', 'XT60', 'CAM', 'RX', 'VTX', 'TOP', 'BATT', 'PROPS'];
  SD.ENGINE_IDS = ENGINE_IDS;

  const note = m => CF_NOTE('drone: ' + m);
  let craft = null, ui = null, looping = false;
  SD.craft = () => craft;
  SD.ui = () => ui;

  /* ---------- validation ---------- */
  const isHex = c => typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c);
  function validate(c){
    for (const k of ['id', 'fig', 'title', 'palette', 'frame', 'design', 'parts', 'tests', 'wiring']) if (c[k] == null) note(`field "${k}" missing`);
    if (c.palette && !PALS[c.palette]) note(`palette "${c.palette}" is not a PALS key`);
    if (c.frame){
      const F = c.frame, layouts = ['quad-x', 'stretch-x', 'whoop', 'hex-x', 'octo-x', 'tri-y', 'vtol-tri', 'cf2', 'wing', 'vtol'];
      const winged = F.layout === 'wing' || F.layout === 'vtol', listed = Array.isArray(F.motors) && F.motors.length > 0;
      if (!layouts.includes(F.layout)) note(`frame.layout "${F.layout}" is not one of ${layouts.join(', ')}`);
      if (winged && !F.wing) note(`frame.wing missing for layout ${F.layout}`);
      if (winged && !listed) note(`frame.motors needed for layout ${F.layout}`);
      if (!winged && !(F.wheelbase > 0) && !listed) note('frame.wheelbase missing');
      if (!winged && (!F.arm || !F.plate)) note('frame.arm and frame.plate needed');
    }
    const ids = new Set();
    for (const p of c.parts || []){
      if (!/^[A-Z][A-Z0-9_]*$/.test(p.id || '')) note(`part id "${p.id}" must be upper case`);
      if (ids.has(p.id)) note(`part "${p.id}" listed twice`);
      ids.add(p.id);
      if (!p.short) note(`part ${p.id}: short missing`);
      if (p.polar && !(Array.isArray(p.polar) && p.polar.length === 2)) note(`part ${p.id}: polar must be [ok, mistake]`);
      for (const pc of [].concat(p.piece || [])) if (!SD.kinds[pc.kind]) note(`part ${p.id}: unknown piece kind "${pc.kind}"`);
      if (!p.piece) note(`part ${p.id}: piece missing`);
    }
    for (const p of c.parts || []) for (const a of p.after || []) if (!ids.has(a)) note(`part ${p.id}: after "${a}" is not a part`);
    const d = c.design || {};
    for (const t of ['batts', 'motors', 'props']) if (!d[t] || !Object.keys(d[t]).length) note(`design.${t} missing`);
    if (d.default) for (const [t, k] of [['batts', 'batt'], ['motors', 'motor'], ['props', 'prop']]) if (d[t] && !d[t][d.default[k]]) note(`design.default.${k} "${d.default[k]}" not in design.${t}`);
    for (const [k, b] of Object.entries(d.batts || {})) { if (!(b.cells > 0) || !Array.isArray(b.size)) note(`batt ${k}: cells and size needed`); if (b.color && !isHex(b.color)) note(`batt ${k}: color must be #rrggbb`); }
    for (const [k, m] of Object.entries(d.motors || {})) if (!Array.isArray(m.stator) || !Array.isArray(m.bell)) note(`motor ${k}: stator and bell needed`);
    for (const [k, pr] of Object.entries(d.props || {})) if (!(pr.d > 0) || !(pr.blades >= 2)) note(`prop ${k}: d and blades needed`);
    for (const id of Object.keys((c.wiring || {}).nodes || {})) if (!ids.has(id)) note(`wiring node "${id}" is not a part`);
    for (const e of (c.wiring || {}).edges || []) for (const end of [e.from, e.to]) if (!((c.wiring.nodes || {})[end])) note(`wiring edge end "${end}" is not a node`);
  }

  /* ---------- state helpers ---------- */
  const byId = id => craft.byId[id];
  const isOn = (st, id) => { const p = st.placed[id]; return !!p && !p.leave && p.t >= 1; };
  const inPl = (st, id) => { const p = st.placed[id]; return !!p && !p.leave; };
  const orient = (st, id) => inPl(st, id) ? st.placed[id].orient : 0;
  const has = id => !!craft.byId[id];
  const motorsList = () => craft.motors;
  const shortOf = id => T(byId(id).short);
  const low = s => s.toLocaleLowerCase(CF_LANG === 'zh' ? 'zh-Hans' : CF_LANG);
  SD.isOn = isOn; SD.inPl = inPl; SD.orient = orient;

  function resolved(st){
    const d = craft.design;
    return { batt: d.batts[st.design.batt], motor: d.motors[st.design.motor], prop: d.props[st.design.prop], keys: st.design };
  }
  SD.resolved = resolved;
  const powered = st => !!st.plugged && !st.fault && (!has('FC') || isOn(st, 'FC'));
  SD.powered = powered;

  function sfx(st, name){ st.sfx = { n: (st.sfx ? st.sfx.n : 0) + 1, name }; }
  function log(st, key, vars){
    const text = T(key, vars);
    st.log.lines.push(text); if (st.log.lines.length > 10) st.log.lines.shift();
    st.log.n++;
  }
  function say(st, key, vars, ms, sound){
    if (sound) sfx(st, sound);
    const text = T(key, vars);
    st.msg = text;
    if (ui) ui.flash(text, ms || 2200);
  }

  /* ---------- actions (the only way the build state changes) ---------- */
  function busy(st){ return !!st.test || st.queue.length > 0; }
  function kick(){
    if (looping || !ui) return;
    looping = true;
    ui.animate(dt => { const more = step(ui.st, dt); if (!more) looping = false; return more; });
  }
  SD.kick = kick;

  function wrongIndex(st){ const n = motorsList().length; return n ? (2 + 3 * st.wireJobs) % n : null; }

  function place(st, id, o, auto){
    st.placed[id] = { t: 0, orient: o, leave: false, delay: 0 };
    st.sel = id;
    if (!auto) sfx(st, 'whoosh');
    if (id === 'XT60'){ if (st.fault) { st.fault = null; st.smoke = []; log(st, LOG.capNew); } if (!auto) st.smokeOk = false; }
    if (id === 'WIRES'){ if (!auto) { st.motorOk = false; st.wrong = wrongIndex(st); } st.wireJobs++; }
    if (id === 'FC' && !auto) st.accOk = false;
  }

  const A = SD.actions = {
    add(st, id, o = 0){
      const part = byId(id);
      if (!part) return 'unknown part ' + id;
      o = part.polar && o === 1 ? 1 : 0;
      if (st.plugged && id !== 'BATT') return say(st, MSG.live, null, 2400, 'buzz');
      if (st.exT || st.ex > 0.01) return say(st, MSG.exploded, null, 2000, 'buzz');
      if (busy(st)) return say(st, MSG.busy, null, 1600, 'tick');
      const p = st.placed[id];
      if (p && !p.leave){
        if (!part.polar || p.orient === o) return say(st, MSG.already, { short: shortOf(id) }, 1600, 'tick');
        p.orient = o; p.t = 0; st.sel = id; sfx(st, 'whoosh');
        if (id === 'XT60'){ st.smokeOk = false; if (st.fault) { st.fault = null; st.smoke = []; log(st, LOG.capNew); } }
        if (id === 'FC') st.accOk = false;
        return kick();
      }
      const miss = (part.after || []).find(a => !inPl(st, a));
      if (miss) return say(st, MSG.after, { short: shortOf(id), need: low(shortOf(miss)) }, 2400, 'buzz');
      if (id === 'PROPS' && ((craft.tests.smoke && !st.smokeOk) || (craft.tests.motors && motorsList().length && !st.motorOk)))
        return say(st, MSG.propsLast, null, 3200, 'buzz');
      place(st, id, o);
      kick();
    },
    remove(st, id){
      const part = byId(id);
      if (!part) return 'unknown part ' + id;
      if (st.plugged) return say(st, MSG.live, null, 2400, 'buzz');
      if (st.exT || st.ex > 0.01) return say(st, MSG.exploded, null, 2000, 'buzz');
      if (busy(st)) return say(st, MSG.busy, null, 1600, 'tick');
      if (!inPl(st, id)) return say(st, MSG.notOn, { short: shortOf(id) }, 1600, 'tick');
      const dep = craft.parts.find(q => inPl(st, q.id) && (q.after || []).includes(id));
      if (dep) return say(st, MSG.takeOff, { dep: low(shortOf(dep.id)) }, 2400, 'buzz');
      st.placed[id].leave = true; st.placed[id].t = Math.min(1, st.placed[id].t);
      if (st.sel === id) st.sel = null;
      if (id === 'XT60') { st.smokeOk = false; st.fault = null; st.smoke = []; }
      if (id === 'WIRES') st.motorOk = false;
      if (id === 'FC') st.accOk = false;
      sfx(st, 'whoosh');
      say(st, MSG.off, { short: shortOf(id) }, 1400);
      kick();
    },
    build(st){
      if (busy(st)) return say(st, MSG.busy, null, 1600, 'tick');
      A.unplug(st, true); st.exT = 0;
      let changed = false;
      for (const p of craft.parts){ const pl = st.placed[p.id]; if (pl && !pl.leave && pl.orient === 1){ pl.orient = 0; pl.t = 0; changed = true; } }
      if (st.fault) { st.fault = null; st.smoke = []; log(st, LOG.capNew); changed = true; }
      const missing = craft.parts.filter(p => !inPl(st, p.id)).map(p => p.id);
      const props = missing.indexOf('PROPS');
      if (props >= 0) { missing.splice(props, 1); missing.push('PROPS'); }
      const checks = (!craft.tests.smoke || st.smokeOk) && (!craft.tests.motors || !motorsList().length || st.motorOk) && (!craft.tests.calibrate || !has('FC') || st.accOk);
      if (!missing.length && !changed && checks) return say(st, MSG.built, null, 1600, 'tick');
      st.queue = missing; st.queueT = 0;
      st.smokeOk = true; st.motorOk = true; st.accOk = true; st.wrong = null;
      log(st, LOG.auto);
      sfx(st, 'whoosh');
      if (!missing.length) say(st, MSG.buildDone, null, 2600, 'ding');
      kick();
    },
    strip(st){
      if (busy(st) && !st.queue.length) return say(st, MSG.busy, null, 1600, 'tick');
      const fitted = craft.parts.filter(p => inPl(st, p.id));
      if (!fitted.length) return say(st, MSG.box, null, 1600, 'tick');
      A.unplug(st, true); st.exT = 0; st.queue = []; st.sel = null; st.fault = null; st.smoke = [];
      fitted.sort((a, b) => (b.z || 0) - (a.z || 0)).forEach((p, i) => { const pl = st.placed[p.id]; pl.leave = true; pl.t = Math.min(1, pl.t); pl.delay = i * 0.05; });
      st.smokeOk = st.motorOk = st.accOk = false;
      sfx(st, 'whoosh');
      kick();
    },
    explode(st, on){
      if (busy(st)) return say(st, MSG.busy, null, 1600, 'tick');
      A.unplug(st, true);
      st.exT = on == null ? (st.exT ? 0 : 1) : (on ? 1 : 0);
      st.exploded = !!st.exT;
      sfx(st, 'click');
      kick();
    },
    plug(st){ return st.plugged ? A.unplug(st) : A.plugIn(st); },
    plugIn(st){
      if (st.plugged) return;
      if (busy(st) && !(st.test && st.test.kind === 'motors')) return say(st, MSG.busy, null, 1600, 'tick');
      const needs = (craft.tests.plug && craft.tests.plug.needs) || ['BATT', 'XT60'];
      if (!needs.every(id => !has(id) || isOn(st, id))) return say(st, MSG.plugNeeds, null, 2400, 'buzz');
      if (st.fault) return say(st, MSG.faultFix, null, 2600, 'buzz');
      st.exT = 0; st.exploded = false;
      st.plugged = true;
      const b = resolved(st).batt, full = b.chem === 'lihv' ? 4.35 : 4.2;
      log(st, LOG.plugged, { v: +(b.cells * full).toFixed(2) });
      if (has('XT60') && orient(st, 'XT60') === 1 && !st.smokeOk){
        st.fault = 'XT60'; st.popT = 0; st.later.push({ t: 0.12, sfx: 'sizzle' });
        log(st, LOG.pop);
        say(st, MSG.pop, null, 4200, 'pop');
      } else {
        say(st, craft.messages && craft.messages.powered || MSG.powered, null, 2200, 'power');
      }
      kick();
    },
    unplug(st, silent){
      if (!st.plugged) return;
      st.plugged = false;
      if (!silent) { sfx(st, 'unplug'); log(st, LOG.unplugged); say(st, MSG.unplugged, null, 1400); }
      kick();
    },
    smoke(st){
      if (!craft.tests.smoke) return say(st, MSG.noMotors, null, 1600, 'tick');
      if (busy(st)) return say(st, MSG.busy, null, 1600, 'tick');
      if (!craft.tests.smoke.needs.every(id => isOn(st, id))) return say(st, MSG.smokeNeeds, null, 2400, 'buzz');
      if (st.fault) return say(st, MSG.faultFix, null, 2600, 'buzz');
      A.unplug(st, true); st.exT = 0; st.exploded = false;
      sfx(st, 'click'); log(st, LOG.smoke);
      st.test = { kind: 'smoke', t: 0, dur: 2.2, short: has('XT60') && orient(st, 'XT60') === 1 };
      kick();
    },
    motors(st){
      const ms = motorsList();
      if (!craft.tests.motors || !ms.length) return say(st, MSG.noMotors, null, 1600, 'tick');
      if (busy(st)) return say(st, MSG.busy, null, 1600, 'tick');
      if (!craft.tests.motors.needs.every(id => isOn(st, id))) return say(st, MSG.motorNeeds, null, 2400, 'buzz');
      if (has('PROPS') && inPl(st, 'PROPS')) return say(st, MSG.propsOff, null, 2800, 'buzz');
      st.exT = 0; st.exploded = false;
      if (!st.plugged){
        if (has('BATT') && !isOn(st, 'BATT')) return say(st, MSG.needBatt, null, 2400, 'buzz');
        A.plugIn(st);
        if (!st.plugged || st.fault) return;
      }
      log(st, LOG.motors, { list: ms.map(m => m.id).join(', ') });
      st.test = { kind: 'motors', t: 0, dur: 1.2 * ms.length, wrong: st.motorOk ? null : st.wrong, cur: -1 };
      sfx(st, 'spin');
      kick();
    },
    calibrate(st){
      if (busy(st)) return say(st, MSG.busy, null, 1600, 'tick');
      const needs = (craft.tests.calibrate && craft.tests.calibrate.needs) || ['FC'];
      if (!needs.every(id => isOn(st, id))) return say(st, MSG.calNeeds, null, 2200, 'buzz');
      st.exT = 0; st.exploded = false;
      st.test = { kind: 'calibrate', t: 0, dur: 0.9 };
      sfx(st, 'click');
      kick();
    },
    select(st, id){
      if (id != null && !byId(id)) return 'unknown part ' + id;
      st.sel = st.sel === id ? null : id;
      sfx(st, 'tick');
    },
    step(st, n){
      if (busy(st)) return say(st, MSG.busy, null, 1600, 'tick');
      A.unplug(st, true); st.exT = 0; st.exploded = false;
      craft.parts.forEach((p, i) => {
        const pl = st.placed[p.id], want = i < n;
        if (want && (!pl || pl.leave)) place(st, p.id, 0);
        else if (want && pl.orient === 1) { pl.orient = 0; pl.t = 0; if (p.id === 'XT60') st.smokeOk = false; if (p.id === 'FC') st.accOk = false; }
        else if (!want && pl && !pl.leave) { pl.leave = true; if (p.id === 'XT60') st.smokeOk = false; if (p.id === 'WIRES') st.motorOk = false; if (p.id === 'FC') st.accOk = false; }
      });
      if (n === 0) { st.fault = null; st.smoke = []; }
      st.sel = n > 0 ? craft.parts[n - 1].id : null;
      kick();
    },
  };

  /* ---------- the loop ---------- */
  function finishTest(st, t){
    if (t.kind === 'smoke'){
      if (t.short) { log(st, LOG.smokeShort); say(st, MSG.smokeShort, null, 3800, 'buzz'); }
      else { st.smokeOk = true; log(st, LOG.smokeOk); say(st, MSG.smokeOk, null, 2400, 'ding'); }
    } else if (t.kind === 'motors'){
      if (t.wrong != null) {
        const m = motorsList()[t.wrong].id;
        st.motorOk = true; st.wrongMotor = m; st.wrong = null;
        log(st, LOG.reversed, { m }); say(st, MSG.motorWrong, { m }, 3200, 'ding');
      } else { st.motorOk = true; say(st, MSG.motorsOk, null, 2200, 'ding'); }
      st.rpm = st.rpm.map(() => 0);
    } else if (t.kind === 'calibrate'){
      st.accOk = true;
      if (orient(st, 'FC') === 1) { log(st, LOG.calBack); say(st, MSG.calBack, null, 3000, 'tick'); }
      else { log(st, LOG.calOk); say(st, MSG.calOk, null, 2200, 'ding'); }
    }
  }

  function step(st, dt){
    let more = false;
    st.t += dt;
    for (const p of craft.parts){
      const pl = st.placed[p.id];
      if (!pl) continue;
      if (pl.leave){
        if (pl.delay > 0) { pl.delay -= dt; more = true; continue; }
        pl.t -= 2.6 * dt;
        if (pl.t <= 0) delete st.placed[p.id]; else more = true;
      } else if (pl.t < 1){
        pl.t = Math.min(1, pl.t + 2.2 * dt);
        if (pl.t >= 1) sfx(st, 'place'); else more = true;
      }
    }
    if (Math.abs(st.ex - st.exT) > 1e-3){ st.ex += Math.sign(st.exT - st.ex) * Math.min(Math.abs(st.exT - st.ex), 1.5 * dt); more = true; }
    else st.ex = st.exT;
    if (st.queue.length){
      st.queueT -= dt; more = true;
      if (st.queueT <= 0){ const id = st.queue.shift(); place(st, id, 0, true); sfx(st, 'whoosh'); st.queueT = 0.35;
        if (!st.queue.length) st.later.push({ t: 0.5, say: MSG.buildDone, sfx: 'ding' }); }
    }
    if (st.later.length){
      more = true;
      for (const l of st.later) l.t -= dt;
      for (const l of st.later.filter(l => l.t <= 0)) { if (l.say) say(st, l.say, null, 2600, l.sfx); else if (l.sfx) sfx(st, l.sfx); }
      st.later = st.later.filter(l => l.t > 0);
    }
    const t = st.test;
    if (t){
      more = true;
      t.t += dt;
      if (t.kind === 'motors'){
        const ms = motorsList(), i = Math.min(ms.length - 1, Math.floor(t.t / 1.2));
        if (i !== t.cur) { t.cur = i; sfx(st, 'spin'); }
        st.rpm = ms.map((m, j) => j === i ? Math.min(1, (t.t - 1.2 * i) * 4) : Math.max(0, st.rpm[j] - dt * 3));
        const wrong = t.wrong === i, dir = (ms[i].dir === 'CW' ? -1 : 1) * (wrong ? -1 : 1);
        st.spin[i] += dir * 20 * dt * st.rpm[i];
      }
      if (t.t >= t.dur) { st.test = null; finishTest(st, t); }
    }
    if (st.fault){
      st.popT += dt;
      if (st.popT < 5){ more = true; st.smokeAcc = (st.smokeAcc || 0) + dt * 8;
        while (st.smokeAcc >= 1){ st.smokeAcc -= 1; st.smoke.push({ age: 0, dx: (Math.sin(st.t * 37) * 3), dy: (Math.cos(st.t * 23) * 3) }); } }
    }
    if (st.smoke.length){ more = true; for (const s of st.smoke) s.age += dt; st.smoke = st.smoke.filter(s => s.age < 1.1); }
    if ((st.xr || 0) > 0.05 && (powered(st) || (st.test && st.test.kind === 'motors'))) more = true;
    if (st.test && st.test.kind === 'smoke') more = true;
    return more;
  }

  /* ---------- report and accept (the bridge contract, docs/FIGURES-DRONE.md §10) ---------- */
  function report(st){
    const placed = {};
    for (const p of craft.parts) if (isOn(st, p.id)) placed[p.id] = st.placed[p.id].orient;
    const fitted = Object.keys(placed).length, total = craft.parts.length;
    const next = (craft.parts.find(p => !inPl(st, p.id)) || {}).id || null;
    const mistakes = craft.parts.filter(p => p.polar && placed[p.id] === 1).map(p => p.mistake || ({ FC: 'fc-reversed', XT60: 'cap-reversed', PROPS: 'props-swapped' })[p.id] || (p.id.toLowerCase() + '-reversed'));
    const smokeTested = !craft.tests.smoke || st.smokeOk;
    const motorChecked = !craft.tests.motors || !motorsList().length || st.motorOk;
    const accCal = !has('FC') || st.accOk;
    const built = fitted === total;
    return {
      craft: craft.id, fitted, total, placed, next, built,
      plugged: !!st.plugged, powered: !!powered(st), fault: st.fault || null,
      smokeOk: !!st.smokeOk, motorOk: !!st.motorOk, accOk: !!st.accOk,
      test: st.test ? st.test.kind : null, wrongMotor: st.wrongMotor || null,
      exploded: !!st.exT, sheet: st.sheet || null, sel: st.sel || null,
      design: { batt: st.design.batt, motor: st.design.motor, prop: st.design.prop },
      flight: { ready: built && !st.fault && smokeTested && motorChecked && accCal, fcReversed: placed.FC === 1,
        propsSwapped: placed.PROPS === 1, motorChecked, accCal, capFault: st.fault === 'XT60', smokeTested, mistakes },
      log: { n: st.log.n, lines: st.log.lines.slice() },
      sfx: st.sfx ? { n: st.sfx.n, name: st.sfx.name } : { n: 0, name: null },
    };
  }

  function accept(st, patch){
    if (!patch || typeof patch !== 'object' || Array.isArray(patch)) return 'patch must be an object';
    const known = ['design', 'calc', 'sel', 'step', 'add', 'remove', 'run', 'exploded', 'sheet'];
    const bad = Object.keys(patch).filter(k => !known.includes(k));
    if (bad.length) return 'unknown field ' + bad.join(', ');
    let ok = true;
    if (patch.design != null){
      const d = patch.design;
      if (typeof d !== 'object') return 'design must be an object';
      for (const [k, t] of [['batt', 'batts'], ['motor', 'motors'], ['prop', 'props']]) {
        if (d[k] == null) continue;
        if (typeof d[k] !== 'string' || !craft.design[t][d[k]]) { ok = `unknown ${k} "${d[k]}"`; continue; }
        st.design[k] = d[k];
      }
    }
    if (patch.calc != null){
      const c = patch.calc, out = {};
      for (const k of ['V', 'maxA', 'hoverA']) if (typeof c[k] === 'number' && isFinite(c[k]) && c[k] >= 0 && c[k] < 1e5) out[k] = c[k];
      st.calc = out;
    }
    if ('sel' in patch){ if (patch.sel === null || byId(patch.sel)) st.sel = patch.sel; else ok = 'unknown part ' + patch.sel; }
    if (patch.sheet !== undefined){ if (patch.sheet === null || patch.sheet === 'wiring') st.sheet = patch.sheet; else ok = 'sheet must be "wiring" or null'; }
    if (patch.exploded != null){ if (typeof patch.exploded === 'boolean') A.explode(st, patch.exploded); else ok = 'exploded must be boolean'; }
    if (patch.step != null){ const n = patch.step; if (Number.isInteger(n) && n >= 0 && n <= craft.parts.length) A.step(st, n); else ok = 'step out of range'; }
    if (patch.add != null){ const a = patch.add; if (a && typeof a === 'object' && byId(a.id)) { const r = A.add(st, a.id, a.orient === 1 ? 1 : 0); if (typeof r === 'string') ok = r; } else ok = 'add needs a part id'; }
    if (patch.remove != null){ if (byId(patch.remove)) A.remove(st, patch.remove); else ok = 'unknown part ' + patch.remove; }
    if (patch.run != null){
      const runs = { build: A.build, strip: A.strip, explode: s => A.explode(s), plug: A.plugIn, unplug: s => A.unplug(s), smoke: A.smoke, motors: A.motors, calibrate: A.calibrate };
      if (runs[patch.run]) runs[patch.run](st); else ok = 'unknown run ' + patch.run;
    }
    kick();
    return ok;
  }

  /* ---------- drawing order ----------
     core byDepth sorts with a pairwise comparator that is not transitive, which scrambles a few hundred overlapping
     items. Here every pair whose screen boxes overlap gets an edge from the separating axis (z first: the camera
     always looks down), or from centre depth when the boxes interpenetrate, then a topological sort draws far to near. */
  SD.sortDraw = items => {
    const n = items.length, V = CAM_V, info = new Array(n);
    for (let i = 0; i < n; i++){
      const b = items[i].box, xs = [], ys = [];
      for (const x of [b[0][0], b[1][0]]) for (const y of [b[0][1], b[1][1]]) for (const z of [b[0][2], b[1][2]]) { const q = P(x, y, z); xs.push(q[0]); ys.push(q[1]); }
      const c = items[i].at || [(b[0][0] + b[1][0]) / 2, (b[0][1] + b[1][1]) / 2, (b[0][2] + b[1][2]) / 2];
      info[i] = { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys), d: c[0] * V[0] + c[1] * V[1] + c[2] * V[2] };
    }
    const succ = Array.from({ length: n }, () => []), indeg = new Array(n).fill(0);
    for (let i = 0; i < n; i++){
      const a = info[i], bi = items[i].box;
      for (let j = i + 1; j < n; j++){
        const c = info[j];
        if (a.x1 <= c.x0 || c.x1 <= a.x0 || a.y1 <= c.y0 || c.y1 <= a.y0) continue;
        const bj = items[j].box;
        let ord = 0;
        for (const k of [2, 0, 1]){
          if (bi[1][k] <= bj[0][k] + 1e-6) { ord = V[k] >= 0 ? -1 : 1; break; }
          if (bj[1][k] <= bi[0][k] + 1e-6) { ord = V[k] >= 0 ? 1 : -1; break; }
        }
        if (!ord) ord = a.d <= c.d ? -1 : 1;
        if (ord < 0) { succ[i].push(j); indeg[j]++; } else { succ[j].push(i); indeg[i]++; }
      }
    }
    const done = new Uint8Array(n), out = [];
    let ready = [];
    for (let i = 0; i < n; i++) if (!indeg[i]) ready.push(i);
    for (let left = n; left > 0; left--){
      let pick = -1;
      if (ready.length){ let bi = 0; for (let r = 1; r < ready.length; r++) if (info[ready[r]].d < info[ready[bi]].d) bi = r; pick = ready[bi]; ready.splice(bi, 1); }
      else { for (let i = 0; i < n; i++) if (!done[i] && (pick < 0 || info[i].d < info[pick].d)) pick = i; }
      done[pick] = 1; out.push(items[pick].svg);
      for (const j of succ[pick]) if (!done[j] && --indeg[j] === 0) ready.push(j);
    }
    return out.join('');
  };

  /* ---------- scene ---------- */
  SD.dims = () => ({ M: craft.mat, MT: 4 });
  function lift(st, part){
    const pl = st.placed[part.id], u = craft.mat / 280;
    const drop = (1 - ease(Math.max(0, Math.min(1, pl.t)))) * 70 * u;
    return drop + ease(st.ex) * (part.z || 0) * craft.explode;
  }

  function scene(st){
    if (st.sheet && SD.sheet) return SD.sheet(st);
    const M = craft.mat, MT = 4, G = SD.G, k = ease(st.xr || 0);
    G.ox = M / 2; G.oy = M / 2; G.oz = MT; G.dz = 0;
    const ctx = { st, craft, design: resolved(st), t: st.t, k, powered: powered(st), spin: st.spin, rpm: st.rpm, mat: M,
      flows: [], shadows: [], tags: [], callouts: [], testing: st.test ? st.test.kind : null };
    const items = [];
    for (const part of craft.parts){
      const pl = st.placed[part.id];
      if (!pl) continue;
      G.dz = lift(st, part);
      ctx.part = part; ctx.orient = pl.orient; ctx.lift = G.dz;
      const before = ctx.shadows.length;
      let its = [];
      for (const pc of [].concat(part.piece)) { const fn = SD.kinds[pc.kind]; if (fn) its = its.concat(fn(pc, ctx) || []); }
      its = its.filter(Boolean);
      if (G.dz > 0.5) ctx.shadows.length = before;       // lifted parts drop their shadow
      let op = pl.leave ? Math.max(0, pl.t) : 1;
      if (part.cover && k > 0) op *= 1 - 0.72 * k;
      const lbl = CF_ESC(T(part.name || part.short));
      its.forEach((it, j) => {
        // one tab stop per part, on its first item; Enter or Space presses it (see define)
        const a11y = j === 0 ? ` tabindex="0" role="button" aria-label="${lbl}" aria-pressed="${st.sel === part.id}"` : '';
        let svg = act('part', it.svg, `data-id="${part.id}" data-label="${lbl}"${a11y}`);
        if (op < 0.999) svg = `<g opacity="${op.toFixed(3)}">${svg}</g>`;
        items.push({ box: it.box, at: it.at, svg });
      });
      if (pl.t >= 1 && !pl.leave){
        const anchor = part.tag && part.tag.at ? SD.W(...part.tag.at) : its.length ? topOf(its[0].box) : null;
        if (anchor) ctx.tags.push({ id: part.id, at: anchor, dx: part.tag ? part.tag.dx || 0 : 0, dy: part.tag ? part.tag.dy || -26 : -26, text: part.short });
        for (const c of part.xr || []) ctx.callouts.push({ at: SD.W(...c.at), text: c.text, on: st.sel === part.id });
      }
    }
    G.dz = 0;
    for (const c of craft.inside || []) if (!c.part || isOn(st, c.part)) ctx.callouts.push({ at: SD.W(...c.at), text: c.text, on: c.part && st.sel === c.part });
    if (st.test && st.test.kind === 'smoke' && SD.kinds._stopper) items.push(...SD.kinds._stopper(ctx));
    let out = SD.matSvg ? SD.matSvg(ctx) : '';
    for (const pts of ctx.shadows) out += castShadow(pts, MT, boardTop(0, 0, M, M, MT, 8));
    out += SD.sortDraw(items);
    if (SD.overlays) out += SD.overlays(ctx);
    // labels: surface pills, or see-through callouts
    const B = craft.bounds;
    if (k > 0.6 && ctx.callouts.length) out += xrCallouts(ctx.callouts.map(c => ({ at: c.at, text: c.text, on: c.on })), [B[0] + M / 2, B[1] + M / 2, B[2] + M / 2, B[3] + M / 2, B[4] + MT, B[5] + MT]);
    else if (!st.test || st.test.kind !== 'motors') for (const tg of ctx.tags) out += selTag(tg, st.sel === tg.id);
    return out;
  }
  const topOf = b => [(b[0][0] + b[1][0]) / 2, (b[0][1] + b[1][1]) / 2, b[1][2]];
  function selTag(tg, on){
    const s = tag(tg.at, tg.dx, tg.dy, tg.text, on);
    return on ? s.replace('class="tag on"', 'class="tag on dsel"') : s;
  }

  /* ---------- buttons ---------- */
  function buttons(){
    const bs = [];
    bs.push({ id: 'add', label: 'Add next part', choices: st => {
      const out = [];
      for (const p of craft.parts){
        const miss = (p.after || []).find(a => !inPl(st, a));
        const why = miss ? T(MSG.after, { short: shortOf(p.id), need: low(shortOf(miss)) }) : undefined;
        const opts = p.polar ? [0, 1] : [0];
        for (const o of opts){
          const pl = st.placed[p.id], cur = !!pl && !pl.leave && pl.orient === o;
          out.push({ id: o ? p.id + '-wrong' : p.id, label: p.polar ? `${T(p.short)}: ${T(p.polar[o])}` : T(p.short),
            current: cur, disabled: !cur && !!miss, why, onClick: s => A.add(s, p.id, o) });
        }
      }
      return out;
    } });
    bs.push({ id: 'remove', label: 'Remove a part', choices: st => {
      const fittedParts = craft.parts.filter(p => inPl(st, p.id));
      if (!fittedParts.length) return [{ id: 'none', label: T('Nothing is fitted'), disabled: true, why: T('Nothing is fitted') }];
      return fittedParts.map(p => {
        const dep = craft.parts.find(q => inPl(st, q.id) && (q.after || []).includes(p.id));
        return { id: p.id, label: T(p.short), disabled: !!dep, why: dep ? T(MSG.takeOff, { dep: low(shortOf(dep.id)) }) : undefined,
          onClick: s => A.remove(s, p.id) };
      });
    } });
    bs.push({ id: 'build', label: 'Build it for me', onClick: st => A.build(st) });
    bs.push({ id: 'strip', label: 'Take it apart', onClick: st => A.strip(st) });
    bs.push({ id: 'explode', label: 'Exploded view', onClick: st => A.explode(st) });
    bs.push({ id: 'plug', label: 'Plug / unplug battery', onClick: st => A.plug(st) });
    if (craft.tests.smoke) bs.push({ id: 'smoke', label: 'Smoke stopper test', onClick: st => A.smoke(st) });
    if (craft.tests.motors && craft.motors.length) bs.push({ id: 'motors', label: 'Check motor direction', onClick: st => A.motors(st) });
    if (has('FC')) bs.push({ id: 'calibrate', label: craft.calLabel || 'Calibrate accelerometer', onClick: st => A.calibrate(st) });
    bs.push({ id: 'wiring', label: 'Wiring sheet', onClick: st => { st.sheet = st.sheet ? null : 'wiring'; sfx(st, 'click'); } });
    for (const b of craft.buttons || []) bs.push({ id: b.id, label: b.label, onClick: () => { b.onClick(SD.api); kick(); } });
    return bs;
  }

  SD.api = {
    say: (text, ms, sound) => ui && say(ui.st, text, null, ms, sound),
    log: line => ui && log(ui.st, line),
    sfx: name => ui && sfx(ui.st, name),
    isOn: id => ui ? isOn(ui.st, id) : false,
    orient: id => ui ? orient(ui.st, id) : 0,
    get st(){ return ui ? ui.st : null; },
    render: () => ui && ui.render(),
  };

  /* ---------- define + mount ---------- */
  SD.define = function define(def){
    if (craft) return note('one craft per page: ' + def.id + ' ignored');
    validate(def);
    craft = Object.assign({ mat: 280, height: 120, log: 'betaflight', inside: [], buttons: [] }, def);
    craft.explode = def.explode || 16 * craft.mat / 280;
    craft.byId = {};
    for (const p of craft.parts) craft.byId[p.id] = p;
    craft.motors = SD.motorsOf ? SD.motorsOf(craft.frame) : [];
    const R = craft.mat / 2;
    craft.bounds = def.bounds || [-R * 0.8, R * 0.8, -R * 0.8, R * 0.8, 0, craft.height * 0.7];
    const d = craft.design, def0 = d.default || {};
    const first = t => Object.keys(d[t] || {})[0];
    const st = {
      design: { batt: def0.batt || first('batts'), motor: def0.motor || first('motors'), prop: def0.prop || first('props') },
      placed: {}, ex: 0, exT: 0, exploded: false, sel: null, smokeOk: true, motorOk: true, accOk: true,
      plugged: false, fault: null, popT: 0, smoke: [], wireJobs: 0, wrong: null, wrongMotor: null,
      test: null, queue: [], queueT: 0, later: [], t: 0, sheet: null, calc: {},
      spin: craft.motors.map((m, i) => i * 0.7), rpm: craft.motors.map(() => 0),
      log: { n: 0, lines: [] }, sfx: { n: 0, name: null }, msg: '',
    };
    for (const p of craft.parts) st.placed[p.id] = { t: 1, orient: 0, leave: false, delay: 0 };
    log(st, LOG.head, { log: craft.log });
    const style = document.createElement('style');
    style.textContent = 'html.nolabels #fig .tag.dsel{display:inline} #fig [data-act=part]:focus{outline:none}'
      + ' #fig [data-act=part]:focus-visible{outline:2px dashed var(--accent,#f4b829);outline-offset:2px}';
    document.head.appendChild(style);
    ui = mountFigure({
      fig: craft.fig, title: craft.title, turn: 'full', palette: craft.palette,
      size: [craft.mat, craft.mat, craft.height], state: st, credit: true,
      scene: s => scene(s),
      buttons: buttons(),
      stats: s => {
        const r = report(s), checks = [craft.tests.smoke && s.smokeOk, craft.tests.motors && craft.motors.length && s.motorOk, has('FC') && s.accOk].filter(Boolean).length;
        const nChecks = [craft.tests.smoke, craft.tests.motors && craft.motors.length, has('FC')].filter(Boolean).length;
        return [{ label: T('Parts'), value: `${r.fitted}/${r.total}` }, { label: T('Checks'), value: `${checks}/${nChecks}` },
          { label: T('Battery'), value: s.fault ? T('FAULT') : s.plugged ? T('ON') : T('OFF'), small: true }];
      },
      acts: { part: (s, el) => { const id = el.dataset.id; if (id && byId(id)) A.select(s, id); } },
      params: (s, q) => {
        const n = q.get('step');
        if (n != null && /^\d+$/.test(n)) {
          const k = Math.min(+n, craft.parts.length);
          craft.parts.forEach((p, i) => { if (i >= k) delete s.placed[p.id]; });
          if (!s.placed.XT60) s.smokeOk = false;
          if (!s.placed.WIRES) { s.motorOk = false; s.wrong = 2 % Math.max(1, craft.motors.length); }
          if (!s.placed.FC) s.accOk = false;
        }
        for (const id of (q.get('flip') || '').split(',').filter(Boolean)) if (s.placed[id] && byId(id).polar) { s.placed[id].orient = 1; if (id === 'XT60') s.smokeOk = false; if (id === 'FC') s.accOk = false; }
        if (q.get('fresh') === '1') { s.smokeOk = s.motorOk = s.accOk = false; s.wrong = 2 % Math.max(1, craft.motors.length); }
        for (const [k, t] of [['batt', 'batts'], ['motor', 'motors'], ['prop', 'props']]) if (d[t][q.get(k)]) s.design[k] = q.get(k);
        if (q.get('exploded') === '1') { s.ex = s.exT = 1; s.exploded = true; }
        if (q.get('sheet') === 'wiring') s.sheet = 'wiring';
        if (byId(q.get('sel'))) s.sel = q.get('sel');
        if (q.get('plug') === '1' && s.placed.BATT && s.placed.XT60){
          s.plugged = true;
          if (s.placed.XT60.orient === 1 && !s.smokeOk) s.fault = 'XT60';
        }
      },
      embed: { accept: (s, patch) => accept(s, patch), report: s => report(s) },
    });
    xrMount(() => ui, () => T(craft.xrCaption || 'See-through: the covers fade so the insides, the power path and the signals show.'));
    const fig = document.getElementById('fig');
    if (fig) fig.addEventListener('keydown', e => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const el = e.target.closest && e.target.closest('[data-act="part"][tabindex]');
      if (!el) return;
      e.preventDefault();
      // the same path as a click, so the bridge reports the part too
      const id = el.dataset.id;
      el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, pointerType: 'keyboard' }));
      const again = fig.querySelector(`[data-act="part"][tabindex][data-id="${id}"]`);
      if (again) again.focus();
    });
    kick();
    return ui;
  };
})();
