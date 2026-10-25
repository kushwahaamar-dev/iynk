// @cf title Crazyflie swarm drone
// @cf use engine/drone.js
// @cf use engine/drone-geo.js
// @cf use engine/drone-frames.js
// @cf use engine/drone-pieces.js
// @cf use engine/drone-sheet.js
/* Fig. 11, one drone of a Crazyflie 2.1 / 2.1+ swarm, flown from Python (cflib) over a Crazyradio. Facts:
   docs/facts/swarm.md. The 92 mm X-shaped PCB is the frame and the flight controller (motors at +-32.5 mm, ARM_LENGTH
   46 mm), four 7 x 16 mm coreless motors in plastic mounts that are also the legs, switched by MOSFETs on the board
   (no ESC), long pin headers carrying a Flow deck v2 underneath and a Lighthouse deck on top, a 1S 250 mAh cell between
   the header rows, and the Crazyradio 2.0 on the mat. Craft-local mm: x forward (the antenna bump), y left, z up,
   z = 0 on the mat. The motors are listed M1-M4 as the firmware numbers them, clockwise from the front right. */
(() => {
  const SD = SL.drone, gg = SD.g, Wp = SD.W;
  const TAU = Math.PI * 2;
  const PCB_Z = 12, TOP = PCB_Z + 1;          // 1 mm board on the motor mounts
  const HOLDER = { r: 4.6, z0: 4, z1: TOP + 3 }; // the mount's tube round the motor can, clipped over the arm tip
  const CAN_TOP = 21;                         // 16 mm can, its top 21 mm above the mat
  const HDR_Y = 11.5, HDR_X = 9;              // two 10-pin rows, 2 mm pitch, either side of the battery
  const PIN_UP = TOP + 2 + 19, PIN_DOWN = PCB_Z - 4;   // long pins: 19 mm above the 2 mm spacer, 4 mm below
  const DECK_Z = TOP + 11;                    // Lighthouse deck underside, over the battery
  const FLOW_Z = PCB_Z - 5;                   // Flow deck v2 underneath, on the pins' bottom 4 mm
  const RADIO = { x: -8, y: -64 };            // the Crazyradio 2.0 on the mat (on the laptop's USB in real life)
  const RIGHT = 'radio://0/80/2M/E7E7E7E701';

  const flow = (ctx, kind, pts) => ctx.flows.push({ kind, pts: pts.map(p => Wp(...p)) });
  const dirOf = mo => [Math.cos(mo.ang), Math.sin(mo.ang)];
  const along = (mo, r, side, z) => { const [ux, uy] = dirOf(mo); return [ux * r - uy * side, uy * r + ux * side, z]; };

  /* ---------- the craft's own bench checks: Crazyradio link, decks and positioning, link loss ---------- */
  // A check is passed when its run has finished and the parts it ran on are still the same fitted parts the same
  // way round (taking a part off, re-seating it or turning it makes a fresh part object or orientation).
  const fresh = (() => { try { return /[?&]fresh=1(&|$)/.test(location.search); } catch { return false; } })();
  const NEEDS = { link: ['FC', 'RADIO'], position: ['FC', 'HDR', 'FLOW', 'DECKL', 'RADIO'], failsafe: ['FC', 'MOTORS', 'WIRES', 'RADIO'], lights: ['FC', 'RADIO'] };
  const CHECKS = ['link', 'position', 'failsafe'];
  const stamp = (st, ids) => ids.map(id => [id, st.placed[id] || null, st.placed[id] ? st.placed[id].orient : -1]);
  const still = (st, s) => !!s && s.every(([id, p, o]) => p && st.placed[id] === p && !p.leave && p.orient === o);
  const xs = st => {
    if (!st.cf) {
      st.cf = { run: null, ok: {} };
      if (!fresh) for (const k of CHECKS) st.cf.ok[k] = { end: 0, parts: stamp(st, NEEDS[k]), good: true };
    }
    return st.cf;
  };
  // `good` is false for a run that finished with a fault (a link with no antenna), so it never counts as passed
  const passed = (st, k) => { const r = xs(st).ok[k]; return !!r && r.good && st.t >= r.end && still(st, r.parts); };
  const running = st => { const r = xs(st).run; return r && st.t < r.end ? r : null; };
  const since = (st, r) => r ? st.t - r.t0 : 0;
  const noAntenna = st => !!st.placed.RADIO && !st.placed.RADIO.leave && st.placed.RADIO.orient === 1;
  const linkUp = st => SD.powered(st) && passed(st, 'link') && !(running(st) && running(st).kind === 'failsafe' && since(st, running(st)) > .5);

  function begin(api, kind, dur, endText, good = true, sound = 'ding'){
    const st = api.st, x = xs(st);
    x.run = { kind, t0: st.t, end: st.t + dur };
    if (CHECKS.includes(kind)) x.ok[kind] = { end: st.t + dur, parts: stamp(st, NEEDS[kind]), good };
    st.later.push({ t: dur, say: endText, sfx: sound });
  }
  function blocked(api){
    const st = api.st;
    if (st.test || st.queue.length || running(st)) { api.say('Wait for the test to finish', 1600, 'tick'); return true; }
    if (st.exT || st.ex > 0.01) { api.say('Close the exploded view first', 2000, 'buzz'); return true; }
    return false;
  }
  const need = (api, ids, text) => { if (ids.every(id => api.isOn(id))) return false; api.say(text, 2600, 'buzz'); return true; };
  const live = (api, text) => { if (SD.powered(api.st)) return false; api.say(text, 2600, 'buzz'); return true; };
  const linked = (api, text) => { if (passed(api.st, 'link')) return false; api.say(text, 2600, 'buzz'); return true; };

  const buttons = [
    { id: 'link', label: 'Crazyradio link', onClick: api => {
      if (blocked(api) || need(api, NEEDS.link, 'Fit the board and the Crazyradio first')) return;
      if (live(api, 'Plug in the battery: the radio chip on the board runs from it')) return;
      const bad = noAntenna(api.st);
      api.log('$ cfclient: Connect, Configure 2.x: channel 80, 2M, address E7E7E7E701');
      api.log(bad ? 'link quality 23 %: packets lost' : 'connected: crazyflie-firmware 2026.08, link quality 100 %');
      begin(api, 'link', 2, bad
        ? 'Link quality 23 %: the Crazyradio’s antenna is not screwed on. Fit it and connect again'
        : `Connected to ${RIGHT}: link quality 100 %. Every drone in the swarm gets its own address on the same channel`,
      !bad, bad ? 'buzz' : 'ding');
      api.sfx('click');
    } },
    { id: 'position', label: 'Decks + positioning', onClick: api => {
      if (blocked(api) || need(api, ['FC', 'HDR', 'RADIO'], 'Fit the long pins and the Crazyradio first')) return;
      if (live(api, 'Plug in the battery first')) return;
      if (linked(api, 'Connect over the Crazyradio first: cflib reads the decks and the position over the link')) return;
      const st = api.st;
      const fail = !api.isOn('DECKL') ? 'deck.bcLighthouse4 = 0: no Lighthouse deck, so no shared position for the swarm'
        : api.orient('DECKL') === 1 ? 'deck.bcLighthouse4 = 0: the Lighthouse deck is on backwards and its ID chip was not found. Turn it round'
        : !api.isOn('FLOW') ? 'deck.bcFlow2 = 0: no Flow deck under the board. The hover script stops without it'
        : !st.accOk ? 'LED1 still blinks slowly: the sensors are not calibrated. Keep it still and level first'
        : null;
      api.log('$ print(cf.param.get_value(\'deck.bcLighthouse4\'))');
      if (fail) { api.log(fail.split(':')[0]); return api.say(fail, 3200, 'buzz'); }
      api.log('deck.bcFlow2 = 1, deck.bcLighthouse4 = 1');
      api.log('$ swarm.reset_estimators(): waiting for kalman.varPX/PY/PZ to settle');
      begin(api, 'position', 4, 'Both decks found and the Kalman filter settled at x 0.00, y 0.00, z 0.03 m. reset_estimators() returns: ready to arm');
      api.sfx('click');
    } },
    { id: 'failsafe', label: 'Link-loss (props off)', onClick: api => {
      if (blocked(api) || need(api, NEEDS.failsafe, 'Fit the motors, their plugs, the board and the Crazyradio first')) return;
      if (api.st.placed.PROPS && !api.st.placed.PROPS.leave) return api.say('PROPS OFF! Never spin motors on the bench with props on', 2800, 'buzz');
      if (live(api, 'Plug in the battery first')) return;
      if (linked(api, 'Connect over the Crazyradio first: there has to be a link to lose')) return;
      api.log('$ streaming setpoints at 10 Hz, then the Crazyradio pulled out');
      api.log('supervisor: no setpoint for 500 ms, level and hold thrust');
      api.log('supervisor: no setpoint for 2000 ms, motors off');
      begin(api, 'failsafe', 2.6, 'Link lost: after 0.5 s it levelled and held its thrust, after 2 s the motors stopped. A go_to from the high-level commander would have flown on to its setpoint instead');
      api.sfx('spin');
    } },
    { id: 'lights', label: 'Light-show LEDs', onClick: api => {
      if (blocked(api) || need(api, NEEDS.lights, 'Fit the board and the Crazyradio first')) return;
      if (live(api, 'Plug in the battery first')) return;
      if (linked(api, 'Connect over the Crazyradio first: the LEDs are set over the link')) return;
      api.log('$ cf.param.set_value(\'led.bitmask\', 138): both green');
      api.log('$ ... 148: both red, 129: the left blue, then 0');
      begin(api, 'lights', 3, 'led.bitmask set back to 0: the status blinks are back. In the show every drone does this on its own cue');
      api.sfx('click');
    } },
  ];

  // what the board's LEDs show: the light-show override first, then the firmware's own status pattern
  function leds(st){
    const r = running(st), t = st.t, on = SD.powered(st);
    const out = { redR: false, greenR: false, redL: false, greenL: false, blueL: false, blueR: false };
    if (!on) return out;
    if (r && r.kind === 'lights'){
      const phase = Math.min(2, Math.floor(since(st, r)));
      if (phase === 0) out.greenL = out.greenR = true;
      else if (phase === 1) out.redL = out.redR = true;
      else out.blueL = true;
      out.blueR = true;
      return out;
    }
    out.blueL = out.blueR = true;
    // LED1 (M1 arm): a slow blink every 2 s until the sensors are calibrated, then the 2 Hz system blink
    out.redR = st.accOk ? (t * 2) % 1 < .5 : t % 2 < .25;
    if (r && r.kind === 'failsafe' && since(st, r) > .5) out.redL = true;
    else if (linkUp(st) || (r && r.kind === 'link')) out.greenL = Math.sin(t * 37) > 0;
    return out;
  }

  function report(st){
    const r = running(st), l = xs(st).ok.link, lt = r && r.kind === 'lights' ? ['green', 'red', 'blue'][Math.min(2, Math.floor(since(st, r)))] : null;
    return {
      linkOk: passed(st, 'link'),
      linkQ: l && st.t >= l.end && still(st, l.parts) ? (l.good ? 100 : 23) : null,
      positionOk: passed(st, 'position'), failsafeOk: passed(st, 'failsafe'),
      lights: lt, run: r ? r.kind : null,
    };
  }

  /* ---------- drawings ---------- */
  // the plastic motor mounts: a foot on the mat, a tube round the can and a clip over the arm tip; the cans of the
  // coreless motors show above them, and the shaft turns while a test spins them
  function mounts(ctx){
    const out = [], st = ctx.st, r = running(st), k = ctx.k, mt = ctx.design.motor, R = mt.bell[0] / 2, top = CAN_TOP + (mt.bell[1] - 16);
    const propsOn = !!st.placed.PROPS && !st.placed.PROPS.leave;
    const fsSpin = r && r.kind === 'failsafe' && since(st, r) < 2;
    ctx.craft.motors.forEach((mo, i) => {
      out.push(gg.cyl(mo.x, mo.y, 0, 1.2, 3.2, 'pal', 12, .7));
      out.push(gg.cyl(mo.x, mo.y, 1.2, HOLDER.z0, 2.2, 'pal', 10, .7));
      const tube = gg.cyl(mo.x, mo.y, HOLDER.z0, HOLDER.z1, HOLDER.r, 'pal', 16, .9);
      if (k > 0) tube.svg = `<g opacity="${(1 - .6 * k).toFixed(3)}">${tube.svg}</g>`;
      out.push(tube);
      const [ux, uy] = SD.normd([mo.x, mo.y, 0]);
      out.push(gg.oblock([mo.x - ux * 7, mo.y - uy * 7, PCB_Z + .5], [ux, uy, 0], [-uy, ux, 0], [0, 0, 1], 3.2, 4.6, 2.2, 'pal', .7));
      if (k > 0) out.push(gg.cyl(mo.x, mo.y, HOLDER.z0 + 1, top - 1, R - .9, 'copper', 12, .5));
      const can = gg.cyl(mo.x, mo.y, HOLDER.z1, top, R, 'metal', 16, .9);
      const a0 = fsSpin ? st.t * 40 + i : (ctx.spin[i] || 0);
      const p0 = Wp(mo.x, mo.y, top + .02), p1 = Wp(mo.x + (R - .6) * Math.cos(a0), mo.y + (R - .6) * Math.sin(a0), top + .02);
      can.svg += `<path d="${pd([p0, p1], false)}" stroke="${INK}" stroke-width=".9" stroke-linecap="round" fill="none"/>`;
      if (fsSpin) can.svg += gg.disc(mo.x, mo.y, top + .05, R + 1.2, '#cfe3d9', 14, .4);
      out.push(can);
      if (!propsOn) out.push(gg.cyl(mo.x, mo.y, top, top + 3.2, .45, 'metal', 8, .4));
      ctx.shadows.push(SD.circ(mo.x, mo.y, HOLDER.r, 10).map(([x, y]) => Wp(x, y, HOLDER.z1)));
    });
    return out;
  }

  // the board's own parts: chips, the antenna bump, the header holes, the battery socket, USB and the four LEDs
  function board(ctx){
    const out = [], L = leds(ctx.st);
    const chip = (x, y, l, w, h, c, label) => { const it = gg.box(x - l / 2, y - w / 2, TOP, x + l / 2, y + w / 2, TOP + h, c, .6); if (label) it.svg += gg.text(x, y, TOP + h + .02, label, Math.min(l, w) * .26, '#d9d3c6'); return it; };
    out.push(gg.plate(SD.rrect(5, 9, 1.5).map(([x, y]) => [x + 17.5, y]), PCB_Z, 1, 'pcbBlack'));   // the antenna bump
    out.push(chip(18, 0, 2, 5.4, .9, 'ceramic'));
    out.push(chip(2, 2, 9, 9, 1.2, 'black', 'F405'));
    out.push(chip(-7.5, -7, 5.5, 5.5, 1, 'black', 'nRF51'));
    out.push(chip(8.5, -7.5, 3, 4.5, .9, 'black'));
    out.push(chip(9, 7, 2.2, 2.2, .8, 'black'));
    const pads = gg.box(-HDR_X - 1, -HDR_Y - 1, TOP, HDR_X + 1, -HDR_Y + 1, TOP + .05, 'pcbBlack', .2);
    pads.svg = '';
    for (const sy of [-1, 1]) for (let j = 0; j < 10; j++) pads.svg += gg.disc(-HDR_X + j * 2, sy * HDR_Y, TOP + .03, .55, '#d8c27a', 8, .2);
    out.push(pads);
    out.push(chip(-14, -5, 4, 7.5, 2.6, 'metal'));                      // micro-USB at the back
    const sock = chip(-13.5, 5.5, 3.2, 5, 2.8, 'white');                // the battery socket
    out.push(sock, chip(-12.5, -13.2, 2.6, 2.6, 1.4, 'dark'));          // and the power button
    const ledAt = { M1: ['redR', 'greenR'], M2: ['blueR'], M3: ['blueL'], M4: ['redL', 'greenL'] };
    for (const mo of ctx.craft.motors){
      const [x, y] = along(mo, 25, 0, 0), keys = ledAt[mo.id] || [];
      const lit = keys.find(key => L[key]);
      const col = lit ? { redR: '#e2483d', redL: '#e2483d', greenR: '#43c25c', greenL: '#43c25c', blueL: '#4aa3ff', blueR: '#4aa3ff' }[lit] : keys[0] && keys[0].startsWith('blue') ? '#4aa3ff' : '#e2483d';
      const it = gg.box(x - 1, y - 1, TOP, x + 1, y + 1, TOP + .5, 'white', .4);
      it.svg += gg.led(x, y, TOP + .55, col, !!lit, 1.3);
      out.push(it);
    }
    ctx.fcAt = Wp(2, 2, TOP + 2);
    return out;
  }

  // the PicoBlade plugs: each motor's two leads along the top of its arm into a socket near the middle
  function plugs(ctx){
    const out = [];
    ctx.craft.motors.forEach((mo, i) => {
      for (const [col, o] of [['#d8473a', -.7], ['#2c2926', .7]]){
        const pts = [along(mo, 41, o, PCB_Z - .5), along(mo, 38, o, TOP + .6), along(mo, 22, o, TOP + .6), along(mo, 19.5, o, TOP + 1.4)];
        out.push(...gg.wire(pts, col, .6, 5));
        if (o < 0) ctx.flows.push({ kind: 'phase', motor: i, pts: pts.slice().reverse().map(p => Wp(...p)) });
      }
      const [x, y] = along(mo, 18.5, 0, 0), [ux, uy] = dirOf(mo);
      out.push(gg.oblock([x, y, TOP + 1.2], [ux, uy, 0], [-uy, ux, 0], [0, 0, 1], 1.6, 2.4, 1.2, '#e9e2d0', .5));
    });
    return out;
  }

  // ten gold pins at 2 mm pitch from z0 to z1, drawn as one item so a row sorts as a whole
  function pinRow(y, z0, z1){
    const ends = [], lines = [];
    for (let j = 0; j < 10; j++){
      const x = -HDR_X + j * 2, a = Wp(x, y, z0), b = Wp(x, y, z1);
      ends.push(a, b);
      lines.push(pd([a, b], false));
    }
    const d = lines.join('');
    return { box: SD.bbox(ends, .4), svg: `<path d="${d}" stroke="${INK}" stroke-width="1.15" fill="none"/><path d="${d}" stroke="#e2c45a" stroke-width=".55" fill="none"/>` };
  }

  // two long pin strips: a 2 mm plastic spacer on the board, 19 mm of pin above it and 4 mm below; with the
  // Lighthouse deck on, the pins pass through it and stand out above it
  function pins(ctx){
    const out = [], deck = SD.inPl(ctx.st, 'DECKL');
    for (const sy of [-1, 1]){
      const y = sy * HDR_Y;
      out.push(gg.box(-HDR_X - 1, y - 1, TOP, HDR_X + 1, y + 1, TOP + 2, 'black', .6));
      if (deck) out.push(pinRow(y, TOP + 2, DECK_Z), pinRow(y, DECK_Z + 1.6, PIN_UP));
      else out.push(pinRow(y, TOP + 2, PIN_UP));
      out.push(pinRow(y, PIN_DOWN, PCB_Z));
    }
    return out;
  }

  // the Flow deck v2 under the board: its optical-flow camera and range sensor look straight down
  function flowDeck(ctx){
    const out = [], z = FLOW_Z;
    const pcb = gg.box(-10.5, -14, z, 10.5, 14, z + 1, 'pcbBlack', .8);
    pcb.svg += gg.text(0, 0, z + 1.02, 'FLOW v2', 3, '#d9d3c6', 'y');
    out.push(pcb);
    out.push(gg.box(-3.5, -3, z - 1.6, 1.5, 3, z, 'black', .6), gg.box(4, -2, z - 1, 7, 2, z, 'black', .6));
    for (const sy of [-1, 1]) out.push(gg.box(-HDR_X - 1, sy * HDR_Y - 1, z + 1, HDR_X + 1, sy * HDR_Y + 1, PIN_DOWN, 'black', .5));
    if (ctx.powered) flow(ctx, 'signal', [[0, HDR_Y, z + 1], [0, HDR_Y, TOP], [2, 2, TOP + 1]]);
    return out;
  }

  // the Lighthouse deck on the long pins: four infrared receivers at the corners, the FPGA in the middle and the ID
  // chip at the front; turned round, the chip and the print end up at the back
  function lhDeck(ctx){
    const out = [], z = DECK_Z, s = ctx.orient === 1 ? -1 : 1;
    const pcb = gg.box(-19.5, -13.5, z, 19.5, 13.5, z + 1.6, 'pcbBlack', .9);
    pcb.svg += gg.text(-s * 4, 0, z + 1.62, s > 0 ? 'LIGHTHOUSE' : 'ESUOHTHGIL', 3.4, '#d9d3c6', 'y');
    out.push(pcb);
    for (const sx of [-1, 1]) for (const sy of [-1, 1]){
      const it = gg.box(sx * 16.5 - 1.8, sy * 10.5 - 1.8, z + 1.6, sx * 16.5 + 1.8, sy * 10.5 + 1.8, z + 2.6, 'dark', .5);
      it.svg += gg.disc(sx * 16.5, sy * 10.5, z + 2.62, 1, '#9fd0e6', 10, .3);
      out.push(it);
    }
    out.push(gg.box(4, -3, z + 1.6, 10, 3, z + 2.5, 'black', .5));
    out.push(gg.box(s * 15 - 1, -1.2, z + 1.6, s * 15 + 1, 1.2, z + 2.3, 'black', .4));
    for (const sy of [-1, 1]) out.push(gg.box(-HDR_X - 1, sy * HDR_Y - 1, TOP + 2, HDR_X + 1, sy * HDR_Y + 1, z, 'black', .6));
    if (ctx.powered) flow(ctx, 'signal', [[7, 0, z + 1.6], [7, HDR_Y, z], [7, HDR_Y, TOP + 2], [2, 2, TOP + 1.2]]);
    return out;
  }

  // the 1S cell on its foam pad between the header rows, its short lead into the battery socket
  function cell(ctx){
    const b = ctx.design.batt, [l, w, h] = b.size, z0 = TOP + 1, out = [];
    out.push(gg.box(-l * .4, -w * .4, TOP, l * .4, w * .4, z0, '#8a8580', .5));
    const it = gg.box(-l / 2, -w / 2, z0, l / 2, w / 2, z0 + h, b.color || '#9aa3ab', .9);
    it.svg += gg.text(1, 0, z0 + h + .03, b.label || '', 2.6, '#2c2926', 'y');
    out.push(it);
    const end = -l / 2, plugged = ctx.st.plugged;
    for (const [col, y] of [['#d8473a', 4.8], ['#2c2926', 6.2]]){
      const pts = plugged ? [[end, y - 2, z0 + h * .5], [end - 1.5, y, z0 + 1], [-12.6, y, TOP + 2.2]] : [[end, y - 2, z0 + h * .5], [end - 4, y + 1, z0 + 3], [end - 6, y + 3, z0 + 5]];
      out.push(...gg.wire(pts, col, .6, 4));
      if (plugged && col === '#d8473a') flow(ctx, 'power', pts.concat([[-6, 2, TOP + 1.2]]));
    }
    if (!plugged) out.push(gg.box(end - 7.5, 3.5, z0 + 4, end - 4.5, 8.5, z0 + 6.6, 'white', .5));
    ctx.shadows.push([[-l / 2, -w / 2], [l / 2, -w / 2], [l / 2, w / 2], [-l / 2, w / 2]].map(([x, y]) => Wp(x, y, z0 + h)));
    return out;
  }

  // the Crazyradio 2.0 on the mat, with its USB cable off to the laptop and its duck antenna (or not)
  function radio(ctx){
    const out = [], { x, y } = RADIO, st = ctx.st, bare = ctx.orient === 1;
    const body = gg.box(x - 31.5, y - 9, 0, x + 31.5, y + 9, 8, 'pal', .9);
    body.svg += gg.text(x - 4, y, 8.03, 'CRAZYRADIO 2.0', 3.4, '#2c2926');
    const up = SD.powered(st) && (passed(st, 'link') || (running(st) && running(st).kind === 'link'));
    body.svg += gg.led(x + 22, y + 5, 8.1, '#43c25c', up && Math.sin(st.t * 31) > -.3, .8);
    out.push(body);
    out.push(gg.box(x - 43.5, y - 6, 1.5, x - 31.5, y + 6, 6.5, 'metal', .7));
    out.push(...gg.wire([[x - 43.5, y, 4], [x - 50, y + 3, 2], [x - 58, y + 12, 1.5], [x - 64, y + 26, 1.5]], '#2c2926', 2.6, 8));
    out.push(...gg.rod([x + 31.5, y, 4], [x + 36, y, 4], 2.6, '#d8b84a', 10, 10));
    if (!bare){
      out.push(...gg.rod([x + 36, y, 4], [x + 40, y, 4], 3.4, 'black', 10, 10));
      out.push(...gg.rod([x + 40, y, 4], [x + 52, y, 48], 2.9, 'black', 12, 10));
    } else {
      out.push(...gg.rod([x + 14, y + 16, 3], [x + 58, y + 16, 3], 2.9, 'black', 12, 10));
    }
    if (up) flow(ctx, 'signal', [[x + 46, y, 30], [12, -24, TOP + 6], [-7.5, -7, TOP + 1]]);
    return out;
  }

  // two-blade props on the motor shafts: CCW props on M1 and M3, CW on M2 and M4; swapped, every blade is mirrored
  function propsDraw(ctx){
    const out = [], pr = ctx.design.prop, R = pr.d * 25.4 / 2, col = SD.colOf(pr.color), swapped = ctx.orient === 1;
    const top = CAN_TOP + (ctx.design.motor.bell[1] - 16), zh = top + .2, zb = zh + 1.2;
    ctx.craft.motors.forEach((mo, i) => {
      const rpm = ctx.rpm[i] || 0, a0 = ctx.spin[i] || 0;
      if (rpm > .12){
        const ring = Array.from({ length: 24 }, (_, j) => { const a = j / 24 * TAU; return Wp(mo.x + R * Math.cos(a), mo.y + R * Math.sin(a), zb); });
        out.push({ box: SD.bbox(ring, .5), svg: `<path d="${pd(ring)}" fill="${col}" opacity="${(.2 + .22 * rpm).toFixed(3)}" stroke="${INK}" stroke-width=".5"/>` });
      } else {
        const lead = (mo.dir === 'CW' ? -1 : 1) * (swapped ? -1 : 1), r0 = 1.6, n = 6;
        for (let b = 0; b < pr.blades; b++){
          const th = a0 + .6 + b * TAU / pr.blades, ux = Math.cos(th), uy = Math.sin(th), tx = -uy, ty = ux;
          const edge = side => Array.from({ length: n + 1 }, (_, j) => {
            const u = j / n, r = r0 + (R - r0) * u;
            const ch = R * .16 * (.55 + .6 * Math.sin(Math.PI * Math.min(1, u * 1.2))) * (1 - .45 * u) + .6;
            const off = side * ch * (side * lead > 0 ? .62 : .38), z = zb + side * lead * (.8 - .5 * u);
            return [mo.x + ux * r + tx * off, mo.y + uy * r + ty * off, z];
          });
          const pts = [...edge(1), ...edge(-1).reverse()].map(p => Wp(...p));
          out.push({ box: SD.bbox(pts, .2), svg: `<path d="${pd(pts)}" fill="${col}" stroke="${INK}" stroke-width=".7" stroke-linejoin="round"/>`
            + `<path d="${pd(edge(lead > 0 ? 1 : -1).map(p => Wp(...p)), false)}" fill="none" stroke="${mix(col, '#ffffff', .55)}" stroke-width=".45"/>` });
        }
      }
      out.push(gg.cyl(mo.x, mo.y, zh, zh + 2.4, 1.8, col, 12, .6));
    });
    return out;
  }

  SD.define({
    id: 'swarm', fig: '11', title: 'Crazyflie swarm drone', palette: 'mint',
    mat: 150, height: 72, explode: 14, log: 'crazyflie 2026.08', arrowZ: 5,
    bounds: [-58, 58, -75, 58, 0, 50],
    calLabel: 'Calibrate sensors',
    xrCaption: 'See-through: the deck and the battery fade so the board, the motor leads and the signals show.',
    messages: {
      live: 'Unplug the battery first: never work on a powered Crazyflie',
      propsLast: 'Props go on LAST: run the motor direction check first',
      buildDone: 'Built: every part on, motor check and sensor calibration done',
      plugNeeds: 'Fit the battery first',
      powered: 'Self-test: each motor ticks in turn and the rear blue LEDs light. Keep it still and level while LED1 blinks slowly',
      motorNeeds: 'Plug the motors into the board first',
      motorWrong: '{m} spun the wrong way: each socket’s polarity sets the spin, so this motor’s leads are crimped the wrong way round in its plug. Swapped in a good motor: they all spin right now',
      calNeeds: 'Fit the board first',
      calOk: 'Sensors calibrated at rest: LED1 now blinks twice a second',
    },
    logs: {
      motors: '$ motorPowerSet.enable = 1, then {list} one at a time, props off',
      reversed: '{m}: leads crimped the wrong way round',
      calOk: 'gyro bias found: sensors calibrated',
      auto: '$ build it for me: motor check and sensor calibration done',
    },
    frame: {
      layout: 'cf2', wheelbase: 92, numbering: 'crazyflie',
      arm: { w: 6.8, t: 1, pad: 4.2 }, plate: { l: 32, w: 32, z: PCB_Z, r: 5 }, motorZ: 2,
    },
    design: {
      default: { batt: '1s250', motor: '7x16', prop: '45mm' },
      batts: {
        '1s250': { cells: 1, mah: 250, size: [30, 20, 7], color: '#a9b3bb', label: '1S 250' },
        '1s350': { cells: 1, mah: 350, size: [33, 20, 8], color: '#7fa6cf', label: '1S 350' },
        '1s450': { cells: 1, mah: 450, size: [37, 20, 9.5], color: '#e0b64a', label: '1S 450' },
      },
      motors: {
        '7x16': { stator: [5, 12], bell: [7, 16], kv: 14000, label: '7x16 14000KV' },
        '7x16hp': { stator: [5, 12], bell: [7, 16], kv: 15500, label: '7x16 15500KV' },
        '8x20': { stator: [6, 15], bell: [8.5, 20], kv: 12500, label: '8x20 12500KV' },
      },
      props: {
        '45mm': { d: 1.77, pitch: .6, blades: 2, color: '#3a3734', label: '45 mm' },
        '47mm': { d: 1.85, pitch: .67, blades: 2, color: '#5a554f', label: '47-17' },
      },
    },
    parts: [
      { id: 'MOTORS', short: 'MOTORS + MOUNTS', name: '4 × 7 x 16 mm coreless motors in plastic mounts that are also the legs', z: .6,
        piece: { kind: 'custom', draw: mounts }, tag: { at: [-32.5, 32.5, 4], dx: -56, dy: 26 },
        xr: [{ at: [32.5, 32.5, 12], text: 'CORELESS BRUSHED: NO ESC' }] },
      { id: 'FC', short: 'CF2.1 BOARD', name: 'Crazyflie 2.1+ board: the PCB is the frame (STM32F405, nRF51822, BMI088, BMP388)', after: ['MOTORS'], z: 1.8,
        piece: [{ kind: 'frame', color: 'pcbBlack' }, { kind: 'custom', draw: board }],
        tag: { at: [16, -16, TOP], dx: 70, dy: 34 },
        xr: [{ at: [2, 2, TOP + 1.2], text: 'STM32F405: ESTIMATOR + CONTROL' }, { at: [-7.5, -7, TOP + 1], text: 'NRF51822: RADIO + POWER' },
          { at: [8.5, -7.5, TOP + 1], text: 'BMI088 IMU' }] },
      { id: 'WIRES', short: 'MOTOR PLUGS', name: 'PicoBlade motor plugs in the board’s sockets', after: ['MOTORS', 'FC'], z: 2.2,
        piece: { kind: 'custom', draw: plugs }, tag: { at: [-18.5 * .707, -18.5 * .707, TOP + 2.4], dx: -74, dy: 34 },
        xr: [{ at: [18.5 * .707, 18.5 * .707, TOP + 2.4], text: 'MOSFET PWM, 328 KHZ' }] },
      { id: 'HDR', short: 'LONG PINS', name: 'Two long 10-pin headers (19 mm up, 4 mm down) for a deck on each side', after: ['FC'], z: 2.6,
        piece: { kind: 'custom', draw: pins }, tag: { at: [HDR_X, HDR_Y, PIN_UP], dx: 50, dy: -30 } },
      { id: 'FLOW', short: 'FLOW DECK', name: 'Flow deck v2 under the board (optical flow + range to the floor)', after: ['HDR'], z: 0,
        piece: { kind: 'custom', draw: flowDeck }, tag: { at: [10.5, -14, FLOW_Z], dx: 56, dy: 40 },
        xr: [{ at: [-1, 0, FLOW_Z - 1.6], text: 'FLOW + RANGE, LOOKING DOWN' }] },
      { id: 'BATT', short: 'BATTERY', name: '1S LiPo on a foam pad between the header rows', after: ['FC'], z: 3.6, cover: true,
        piece: { kind: 'custom', draw: cell }, tag: { at: [-15, -10, TOP + 5], dx: -60, dy: -40 } },
      { id: 'DECKL', short: 'LIGHTHOUSE DECK', name: 'Lighthouse positioning deck on the long pins', after: ['HDR'], z: 5, cover: true,
        polar: ['the right way round', 'turned round'], mistake: 'deck-reversed',
        piece: { kind: 'custom', draw: lhDeck }, tag: { at: [19.5, 13.5, DECK_Z + 1.6], dx: 40, dy: -46 },
        xr: [{ at: [16.5, -10.5, DECK_Z + 2.6], text: '4 IR RECEIVERS TIME THE SWEEPS' }] },
      { id: 'RADIO', short: 'CRAZYRADIO', name: 'Crazyradio 2.0 USB dongle (stays on the laptop)', after: ['FC'], z: 0,
        polar: ['antenna screwed on', 'antenna left off'], mistake: 'radio-no-antenna',
        piece: { kind: 'custom', draw: radio }, tag: { at: [RADIO.x - 24, RADIO.y - 9, 8], dx: -40, dy: 40 },
        xr: [{ at: [RADIO.x + 10, RADIO.y, 8], text: 'NRF52840, 20 DBM' }] },
      { id: 'PROPS', short: 'PROPS', name: 'Two-blade props: CCW on M1 and M3, CW on M2 and M4', after: ['MOTORS', 'FC'], z: 3.2,
        polar: ['props matched to motor spin', 'swapped CW/CCW'],
        piece: { kind: 'custom', draw: propsDraw }, tag: { at: [55, -32.5, 24], dx: 40, dy: -16 } },
    ],
    tests: {
      smoke: false, // factory-built: no soldering in the power path, and the cell has its own protection board
      motors: { needs: ['WIRES', 'FC'] },
      calibrate: { needs: ['FC'] },
      plug: { needs: ['BATT'] },
    },
    buttons, report,
    wiring: {
      nodes: {
        DECKL: { at: [200, 8], title: 'LIGHTHOUSE DECK', sub: '4 × TS4231, ICE40', color: '#43a35a' },
        FLOW: { at: [410, 8], title: 'FLOW DECK v2', sub: 'PMW3901 + VL53L1x', color: '#43a35a' },
        RADIO: { at: [0, 142], title: 'CRAZYRADIO 2.0', sub: 'USB, nRF52840', color: '#5a82c6', led: '#43c25c' },
        FC: { at: [300, 142], title: 'CF2.1 BOARD', sub: 'STM32F405 + nRF51822', color: '#3e86d9', led: '#4aa3ff' },
        WIRES: { at: [610, 142], title: 'MOTOR PLUGS', sub: 'PicoBlade 2-pin ×4', color: '#f08a2b' },
        BATT: { at: [300, 276], title: 'BATTERY', sub: 'batt', color: 'tomato' },
        MOTORS: { at: [610, 276], title: 'MOTORS ×4', sub: 'motor', color: '#f08a2b' },
      },
      edges: [
        { from: 'BATT', to: 'FC', kind: 'power', n: 2, label: 'V' },
        { from: 'FC', to: 'WIRES', kind: 'power', n: 2, label: 'MOSFET PWM' },
        { from: 'WIRES', to: 'MOTORS', kind: 'power', n: 2, label: 'brushed, 2 wires' },
        { from: 'DECKL', to: 'FC', kind: 'signal', label: 'UART + I²C', a: [275, 64], b: [340, 142] },
        { from: 'FLOW', to: 'FC', kind: 'signal', label: 'SPI + I²C', a: [485, 64], b: [410, 142] },
        { from: 'RADIO', to: 'FC', kind: 'rf', label: '2.4 GHz, ch 80' },
      ],
      legend: ['power', 'signal', 'rf'],
    },
  });
})();
