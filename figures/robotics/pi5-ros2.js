// @cf title Raspberry Pi 5: the ROS 2 brain
// @cf use engine/bench.list
// @cf use boards/pi4-pi5.js
/* Robotics Bench Fig. 13: a Raspberry Pi 5 built up from the bare PCB, booted, running a ROS 2 node, then starved,
   cooked and over-driven. The board itself (geometry, every part, the power tree, the bi-colour LED, build tasks) is
   figures/boards/pi4-pi5.js, variant pi5; this bench adds:
   - the Active Cooler (heatsink, blower, cable to the FAN connector), the last part on, after the microSD card;
   - its supplies: the 27 W PD supply, a phone charger that sags under load, and the robot's 5 V buck on header
     pins 2 and 4 (no protection there);
   - a heat model: the SoC temperature rises with the program's power and falls through the cooler, the firmware's fan
     curve (off below 50 °C, 30/50/70/100 % at 50/60/67.5/75 °C, 5 °C hysteresis) and its throttling (80-85 °C pulls
     the Arm clock from 2.4 GHz toward 1.5 GHz). Time runs about ten times faster than on a real board so a bare SoC
     reaches 85 °C in seconds, not minutes (docs/facts/pi4-pi5.md §3.9);
   - get_throttled as the firmware keeps it: bit 0 under-voltage now (5 V below 4.63 V), bit 2 throttled now, bits 16
     and 18 the same since boot; a new boot (unplug, or another supply) clears them (§3.10);
   - the three programs of src/content/robotics/pi5-ros2.ts (same mode ids), their console lines read from that state.
   The cooler's size and height are estimated from product photos; Raspberry Pi publishes no drawing of it. */
(() => {
const B = SL.bench;
const base = B.withVariant(B.defs.board['pi4-pi5'], 'pi5');

/* ---------- the heat model's state, kept across mode switches and re-plugs (one SoC, one temperature) ---------- */
const AMBIENT = 25, TAU = 12, UNDER = 4.63;
const FAN_AT = [50, 60, 67.5, 75], FAN_DUTY = [0, .3, .5, .7, 1], HYST = 5;
const heat = { T: AMBIENT, level: 0, duty: 0, ghz: 2.4, sticky: 0, now: 0, src: null, phase: 0 };
const hex = v => '0x' + v.toString(16);
const throttled = () => hex(heat.now | heat.sticky);
// a cold joint on the fan connector: the fan drops out and catches again, its own uneven rhythm
const stutter = t => Math.sin(t * 5.3) + Math.sin(t * 1.7 + 1) > .3;
const WATTS = { boot: 3.5, teleop: 7, health: 3.5 };

function model(st, dt){
  const ev = st.ev, run = ev.status === 'running', v5 = ev.rails['5V'] || 0;
  if (st.power !== heat.src){ heat.src = st.power; heat.sticky = 0; }
  const uv = run && v5 > .5 && v5 < UNDER;
  const cooler = B.isSet('COOLER'), header = B.isSet('FAN'), cold = st.faults.includes('cold:FAN');
  // the firmware's fan curve, stepping up at each threshold and back down 5 °C under it
  if (run){
    while (heat.level < FAN_AT.length && heat.T >= FAN_AT[heat.level]) heat.level++;
    while (heat.level > 0 && heat.T < FAN_AT[heat.level - 1] - HYST) heat.level--;
  } else heat.level = 0;
  const spinning = run && cooler && header && !(cold && stutter(st.t));
  heat.duty = spinning ? FAN_DUTY[heat.level] : 0;
  // 80-85 °C: the Arm clock steps down from 2.4 GHz toward 1.5 GHz; under-voltage throttles it too
  const hot = run && heat.T >= 80;
  heat.ghz = !run ? 0 : uv ? 1.5 : hot ? Math.max(1.5, 2.4 - (heat.T - 80) * .18) : 2.4;
  // the cores' share of the power falls with their clock; from 85 °C the GPU is throttled as well
  const watts = run ? (WATTS[st.mode] || 3.5) * (.45 + .55 * heat.ghz / 2.4) * (heat.T >= 85 ? .7 : 1) : 0;
  // kelvin per watt from the SoC to the room: bare board, cooler with the fan still, cooler with the fan flat out
  const rth = cooler ? 8 - 5 * heat.duty : 15;
  const step = Math.min(dt || 0, .1);
  heat.T += (AMBIENT + watts * rth - heat.T) * step / TAU;
  heat.phase = (heat.phase + step * heat.duty * 40) % (2 * Math.PI);
  heat.now = (uv ? 0x5 : 0) | (hot ? 0x4 : 0);
  heat.sticky |= (uv ? 0x50000 : 0) | (hot ? 0x40000 : 0);
  const c = +heat.T.toFixed(1), status = !run ? null : uv ? 'Under-voltage' : hot ? 'Throttling' : heat.duty > 0 ? 'Fan on' : 'Cool';
  return {
    meas: { U1: { kind: 'soc', c, ghz: +heat.ghz.toFixed(2) }, U4: { kind: 'pmic', throttled: throttled(), v: +v5.toFixed(2) },
      COOLER: { kind: 'fan', duty: heat.duty, state: !cooler ? 'missing' : cold ? 'stutter' : heat.duty ? 'on' : 'off' } },
    stats: run ? [['SoC', c.toFixed(1) + ' °C'], ['Arm clock', heat.ghz.toFixed(1) + ' GHz']] : [],
    status,
    flow: { '5V': v5 > .5, CORE: run, '3V3': run },
    accent: uv ? ['J1'] : hot ? ['U1'] : cold && run ? ['FAN'] : [],
  };
}

/* ---------- the Active Cooler: aluminium heatsink on push pins, a blower in a black shroud, cable to FAN ---------- */
const ALU = matOf('#cfd4d6'), SHROUD = matOf('#2f2d2b'), PAD = matOf('#e7a7b5');
const fade = (ctx, svg) => ctx.k > 0 ? `<g opacity="${f(1 - .7 * ctx.k)}">${svg}</g>` : svg;
B.kind('pi-cooler', { group: 'last', size: () => [30, 37], h: 11,
  draw(ctx){
    const p = ctx.p, [l, w] = p.size, h = p.h, z0 = 2.6, zb = z0 + 1.2, fanW = 13, x1 = l / 2 - fanW;
    for (const [a, b] of [[-l / 2 + 1.5, -w / 2 + 1.5], [l / 2 - 1.5, -w / 2 + 1.5], [-l / 2 + 1.5, w / 2 - 1.5], [l / 2 - 1.5, w / 2 - 1.5]])
      ctx.put(ctx.B(a - .9, b - .9, 0, a + .9, b + .9, z0), ctx.cyl(a, b, 0, z0, .9, B.M.blackPl, toneI, .4));
    ctx.put(ctx.B(-l / 2, -w / 2, z0, l / 2, w / 2, zb), fade(ctx, ctx.slab(-l / 2, -w / 2, l / 2, w / 2, z0, zb, ALU, toneI, .7)));
    for (let x = -l / 2 + .8; x < x1 - .8; x += 2.1)
      ctx.put(ctx.B(x, -w / 2 + .6, zb, x + .7, w / 2 - .6, h), fade(ctx, ctx.slab(x, -w / 2 + .6, x + .7, w / 2 - .6, zb, h, ALU, toneI, .45)));
    // the shroud with its round intake and the impeller turning at the fan's duty
    let s = ctx.slab(x1, -w / 2, l / 2, w / 2, zb, h, SHROUD, toneI, .8);
    const cx = x1 + fanW / 2, cy = w / 2 - fanW / 2 - 1, r = fanW * .4;
    s += ctx.disc(cx, cy, h + .01, r, '#141312', .5);
    for (let i = 0; i < 7; i++){ const a = heat.phase + i * 2 * Math.PI / 7;
      s += ctx.line([[cx + Math.cos(a) * r * .3, cy + Math.sin(a) * r * .3, h + .02], [cx + Math.cos(a + .5) * r * .92, cy + Math.sin(a + .5) * r * .92, h + .02]], .7, '#8d8a85'); }
    s += ctx.disc(cx, cy, h + .03, r * .28, '#3b3936', .4) + ctx.text(cx, -w / 4, h + .01, 'Raspberry Pi', 1.1, '#b9b4ab');
    ctx.put(ctx.B(x1, -w / 2, zb, l / 2, w / 2, h), fade(ctx, s));
    // the fan cable, over the board edge parts to the 4-pin FAN connector
    const [fa, fb] = B.localOf(p, 67.2, 52), hz = 4.6;
    const cable = [[l / 2, w / 2 - 3, zb + 2], [l / 2 + 4, w / 2 - 1, zb + 1.5], [fa - 4, fb - 1, hz + 1.5], [fa - 1.4, fb, hz + .4], [fa, fb, hz]];
    ctx.put(ctx.B(l / 2, w / 2 - 3, hz, fa + .5, fb + .5, zb + 2), ctx.line(cable, 1.3, '#2b2826') + ctx.line(cable, .5, '#d8463b'));
  },
  xrLabel: () => 'HEATSINK',
  xr(ctx){
    // the thermal pad between the SoC lid and the heatsink
    const [a, b] = B.localOf(ctx.p, 33.15, 22.75);
    ctx.put(ctx.B(a - 7, b - 7, 2.36, a + 7, b + 7, 2.6), `<g opacity="${f(ctx.k)}">${ctx.slab(a - 7, b - 7, a + 7, b + 7, 2.36, 2.6, PAD, toneI, .4)}</g>`);
  },
});
const COOLER = { id: 'COOLER', kind: 'pi-cooler', name: 'Active Cooler (heatsink and blower fan)', short: 'COOLER', at: [32, 27.5], size: [30, 37], h: 11 };

/* ---------- the three programs, their console lines read from the model ---------- */
const sdRead = t => t < 5 ? (Math.floor(t * 9) % 3 === 0 ? 1 : 0) : (t % 7 < .06 ? 1 : 0);
const temp = () => `temp=${heat.T.toFixed(1)}'C`;
const freq = () => `frequency(0)=${Math.round(heat.ghz * 1e9)}`;
const under = st => { const v = st.ev.rails['5V'] || 0; return v > .5 && v < UNDER; };
// the kernel's warning every third second while the 5 V input is low, over whatever the program prints
const withSupply = fn => (k, st) => under(st) && k % 3 === 1 ? 'hwmon hwmon1: Undervoltage detected!' : fn(k, st);
const BOOT = [
  '[    0.000000] Booting Linux on physical CPU 0x0000000000 [0x414fd0b1]',
  '[    0.000000] Machine model: Raspberry Pi 5 Model B Rev 1.0',
  '[    0.912482] brcm-pcie 1000120000.pcie: link up, 5.0 GT/s PCIe x4 (!SSC)',
  '[    2.981230] systemd[1]: Reached target multi-user.target - Multi-User System.',
  'robot@pi5:~ $ python3 boot_check.py',
  'Raspberry Pi 5 Model B Rev 1.0',
];
// boot_check.py's three vcgencmd lines, live
const CHECKS = [() => 'throttled=' + throttled(), temp, freq];
const TELEOP = [
  'robot@pi5:~ $ source /opt/ros/lyrical/setup.bash',
  'robot@pi5:~ $ ros2 run my_robot drive &',
  '[INFO] [drive]: publishing /cmd_vel at 10 Hz',
  'robot@pi5:~ $ ros2 topic hz /cmd_vel',
  'average rate: 10.000',
  '\tmin: 0.100s max: 0.100s std dev: 0.00012s window: 12',
  'robot@pi5:~ $ ros2 topic echo /cmd_vel --field linear.x',
];
const FLAGS = [[0, 'under-voltage now'], [1, 'Arm frequency capped now'], [2, 'throttled now'], [3, 'soft temperature limit now'],
  [16, 'under-voltage has happened since boot'], [17, 'Arm frequency capping has happened'], [18, 'throttling has happened'], [19, 'soft temperature limit has happened']];
// health.py once every eight seconds: the prompt, the raw value, then one line a second for each flag that is set
const health = k => {
  const u = k % 8, v = heat.now | heat.sticky, set = FLAGS.filter(([bit]) => v & (1 << bit));
  const lines = ['robot@pi5:~ $ python3 health.py', 'throttled=' + hex(v),
    ...(set.length ? set.map(([bit, m]) => `  bit ${String(bit).padStart(2)}  ${m}`) : ['  no flags: the supply and the temperature are fine'])];
  return lines[u] || null;
};
const MODES = {
  boot: { title: 'Boot and check', instant: true, out: (st, t) => ({ ACT: sdRead(t) }),
    serial: withSupply(k => k < BOOT.length ? BOOT[k] : CHECKS[k - BOOT.length] ? CHECKS[k - BOOT.length]() : null) },
  teleop: { title: 'ROS 2 drive node', instant: true, out: (st, t) => ({ ACT: t % 7 < .06 ? 1 : 0 }),
    // the node checks the temperature every 5 s and warns from 80 °C; the echo prints linear.x and its separator
    serial: withSupply(k => TELEOP[k] || (k % 5 === 0 && heat.T >= 80 ? `[WARN] [drive]: CPU at ${heat.T.toFixed(1)} C: the firmware is throttling the clock` : k % 2 ? '0.2' : '---')) },
  health: { title: 'Supply and heat check', instant: true, out: () => ({}), serial: withSupply(health) },
};

B.bench({
  id: 'pi5-ros2', fig: '13', board: 'pi4-pi5', variant: 'pi5', pal: 'mint', view: 'board',
  name: 'Raspberry Pi 5: the ROS 2 brain',
  sub: 'Bare PCB to a ROS 2 node: SMD parts, connectors, the card and the cooler, then a weak charger, heat and the 5 V pins',
  height: 20,
  parts: [...base.parts, COOLER],
  power: Object.assign({}, base.power, {
    sources: {
      usbc: { label: '27 W USB-C PD supply (5.1 V 5 A)', part: 'J1', plug: 'usb-c', v: 5.1 },
      charger: { label: 'Phone charger (5 V 2 A)', part: 'J1', plug: 'usb-c', v: 5, range: [4.75, 5.25] },
      pin5: { label: "Robot's 5 V buck on GPIO pins 2 and 4", pin: '5V', v: 5.1, range: [4.75, 5.25] },
    },
  }),
  mode: 'boot',
  modes: MODES,
  modesLabel: { button: 'Run a program', stat: 'Program' },
  circuits: {},
  circuit: null,
  tasks: base.tasks,
  faults: [['wrong-voltage:charger:4.6', 'Phone charger sagging to 4.6 V under load'], ['missing:COOLER', 'No Active Cooler'], ['cold:FAN', 'Cold joint on the fan connector']],
  model,
});
})();
