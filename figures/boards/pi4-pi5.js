// @cf title Raspberry Pi 5 / Raspberry Pi 4
// @cf use engine/bench.list
// @cf use parts/push-button.js
// @cf use parts/hc-sr04.js
/* Raspberry Pi 5 and Raspberry Pi 4 Model B, one variant each (?variant=pi5|pi4, default pi5). Facts and sources:
   docs/facts/pi4-pi5.md. Board frame for both: component side up, the 40-pin header along the top edge, USB and
   Ethernet on the right edge, USB-C power and the micro-HDMI ports on the bottom edge, origin bottom-left, mm.
   Pi 4 centres and sizes come from Raspberry Pi's DXF (its heights are not published: they follow the matching Pi 5
   parts); Pi 5 centres, sizes and heights from Raspberry Pi's STEP model. Neither board has a published designator
   list for most parts, so the ids work by function and are the same on both boards: U1 SoC, U2 RAM, U3 the USB/IO
   chip (VL805 on the Pi 4, RP1 on the Pi 5), U4 PMIC, U5 Wi-Fi, U6 Ethernet PHY. Connectors keep the Pi 4's real
   designators (J1 USB-C, J3/J4 camera and display, J6/J13 micro-HDMI, J7 A/V, J8 GPIO, J10 Ethernet, J11 USB 2,
   J12 USB 3, J14 PoE); on the Pi 5 J5 (RTC battery) is its own, J20 is the PCIe connector as Raspberry Pi's PCIe
   guide labels it, and the UART and fan connectors are named by their silkscreen.
   How it works: 5 V comes in on USB-C (or on header pins 2 and 4, which sit straight on the 5 V input rail with no
   protection at all) and the PMIC makes every other rail: the SoC core, the memory, 1.8 V and the 3.3 V for the
   GPIO bank. Below 4.63 V the firmware flags under-voltage (the Pi 4's red PWR LED, driven by the PMIC's power-good
   signal, goes out). The Pi has no flash to upload to: programs run on Linux from the microSD card, so every mode
   here is a program you run, and the card itself is the last part to go in. Pi 5: one bi-colour LED (red = power,
   no firmware yet; green = running, blinking off for SD reads; boot errors as long/short green flash codes), a power
   button, and the RP1 behind PCIe owns every port and the header GPIO. */
(() => {
const B = SL.bench;

/* ---------- part drawings this board needs beyond the library ---------- */
const BEIGE = '#f2e08a', LATCH = '#3a3633', HOLLOW = '#2b2825';
const faceVisible = ctx => vis(norm(sub(ctx.W(-1, 0, 0), ctx.W(0, 0, 0))));
// a polygon on the part's -x face (the side a plug goes in), points [b, z] across and up that face
const onFace = (ctx, x, pts, col, w = .4) => { const d = pd(pts.map(([b, z]) => ctx.W(x, b, z))); return fill(d, col) + (w ? ink(d, w) : ''); };

// vertical FFC/FPC connector: beige housing, the cable slot on top, the dark actuator bar along one side
B.kind('pi-ffc', { group: 'smd', size: () => [16.7, 3.55], h: 3.95,
  draw(ctx){
    const p = ctx.p, [l, w] = p.size, h = p.h, top = h * .78;
    let s = ctx.slab(-l / 2 - .5, -w / 2, -l / 2, w / 2 - .6, 0, .3, B.M.tin, toneI, .3) + ctx.slab(l / 2, -w / 2, l / 2 + .5, w / 2 - .6, 0, .3, B.M.tin, toneI, .3);
    s += ctx.slab(-l / 2, -w / 2, l / 2, w / 2, 0, top, matOf(BEIGE), toneI, .6);
    s += ctx.poly([[-l / 2 + .5, -w * .2], [l / 2 - .5, -w * .2], [l / 2 - .5, w * .05], [-l / 2 + .5, w * .05]], top + .01, HOLLOW, 0);
    s += ctx.slab(-l / 2 + .2, w * .12, l / 2 - .2, w / 2, top, h, matOf(LATCH), toneI, .5);
    ctx.put(ctx.B(-l / 2 - .5, -w / 2, 0, l / 2 + .5, w / 2, h), s);
  },
});
// vertical JST-SH (1 mm pitch): beige housing, the opening on top with n gold contacts, two tin anchor tabs
B.kind('pi-jst', { group: 'smd', size: p => [(p.n || 2) + 2, 3.8], h: 4.3,
  draw(ctx){
    const p = ctx.p, [l, w] = p.size, h = p.h, n = p.n || 2, half = n / 2 + .25;
    let s = ctx.slab(-l / 2 - .5, -w / 2, -l / 2, -w / 2 + 1.2, 0, .25, B.M.tin, toneI, .3) + ctx.slab(l / 2, -w / 2, l / 2 + .5, -w / 2 + 1.2, 0, .25, B.M.tin, toneI, .3);
    s += ctx.slab(-l / 2, -w / 2, l / 2, w / 2, 0, h, matOf('#efe5c8'), toneI, .6);
    s += ctx.poly([[-half, -w * .28], [half, -w * .28], [half, w * .3], [-half, w * .3]], h + .01, '#4a4234', 0);
    for (let i = 0; i < n; i++) s += ctx.disc(i - (n - 1) / 2, 0, h + .02, .17, '#d9b04e', 0);
    ctx.put(ctx.B(-l / 2 - .5, -w / 2, 0, l / 2 + .5, w / 2, h), s);
  },
});
// micro-HDMI (type D) receptacle: a steel shell with the chamfered opening on its -x face
B.kind('pi-hdmi', { group: 'low', size: () => [10, 7.5], h: 3.5,
  draw(ctx){
    const p = ctx.p, [l, w] = p.size, h = p.h;
    let s = ctx.slab(-l / 2, -w / 2, l / 2, w / 2, 0, h, B.M.steel, toneI, .7);
    if (faceVisible(ctx)) s += onFace(ctx, -l / 2 - .01, [[-w * .4, h * .22], [w * .4, h * .22], [w * .4, h * .58], [w * .3, h * .8], [-w * .3, h * .8], [-w * .4, h * .58]], HOLLOW)
      + onFace(ctx, -l / 2 - .02, [[-w * .25, h * .42], [w * .25, h * .42], [w * .25, h * .56], [-w * .25, h * .56]], '#d6b45a', 0);
    ctx.put(ctx.B(-l / 2, -w / 2, 0, l / 2, w / 2, h), s);
  },
});
// RJ45 magjack: steel shield, the latch opening on the -x face and the link (green) and activity (amber) LEDs,
// lit while Linux runs
B.kind('pi-rj45', { group: 'tall', size: () => [21.6, 17.5], h: 13.3,
  draw(ctx){
    const p = ctx.p, [l, w] = p.size, h = p.h, x = -l / 2 - .01, ev = ctx.st.ev || {}, up = ev.status === 'running';
    let s = ctx.slab(-l / 2, -w / 2, l / 2, w / 2, 0, h, B.M.steel, toneI, .9);
    if (faceVisible(ctx)){
      s += onFace(ctx, x, [[-w * .3, h * .12], [w * .3, h * .12], [w * .3, h * .72], [w * .1, h * .72], [w * .1, h * .82], [-w * .1, h * .82], [-w * .1, h * .72], [-w * .3, h * .72]], HOLLOW, .5);
      const blink = up && Math.sin((ctx.st.t || 0) * 23) > .2;
      s += onFace(ctx, x - .01, [[-w * .44, h * .78], [-w * .34, h * .78], [-w * .34, h * .9], [-w * .44, h * .9]], up ? '#62d36b' : '#2f5a35', .3)
        + onFace(ctx, x - .01, [[w * .34, h * .78], [w * .44, h * .78], [w * .44, h * .9], [w * .34, h * .9]], blink ? '#ffb43a' : '#6a5426', .3);
      if (up) s += ctx.glow(-l / 2 - .3, -w * .39, h * .84, 2.4, '#62d36b', .35);
      if (blink) s += ctx.glow(-l / 2 - .3, w * .39, h * .84, 2.4, '#ffb43a', .35);
    }
    ctx.put(ctx.B(-l / 2 - .3, -w / 2, 0, l / 2, w / 2, h), s);
  },
  xrLabel: () => 'MAGNETICS',
  xr(ctx){
    const [l, w] = ctx.p.size, h = ctx.p.h; let s = '';
    for (const b of [-w * .22, w * .22]) s += ctx.cyl(l * .2, b, h * .25, h * .45, 1.6, matOf('#4b4b4b'), toneI, .4);
    ctx.put(ctx.B(-l / 2, -w / 2, h + .01, l / 2, w / 2, h + .02), `<g opacity="${f(ctx.k)}">${s}</g>`);
  },
});
// Pi 4 A/V jack: a black body with the 3.5 mm barrel sticking out of its -x end
B.kind('pi-av', { group: 'low', size: () => [12.5, 7], h: 6,
  draw(ctx){
    const p = ctx.p, [l, w] = p.size, h = p.h, zc = h * .5, r = 3;
    let s = ctx.slab(-l / 2, -w / 2, l / 2, w / 2, 0, h, B.M.blackPl, toneI, .8);
    s += ctx.rod([-l / 2, 0, zc], [-l / 2 - 2.5, 0, zc], r, B.M.blackPl, toneI, .8);
    if (faceVisible(ctx)){ const ring = B.circ(0, zc, 1.75, 14).map(([b, z]) => ctx.W(-l / 2 - 2.52, b, z)); s += fill(pd(ring), '#141210') + ink(pd(ring), .4); }
    ctx.put(ctx.B(-l / 2 - 2.5, -w / 2, 0, l / 2, w / 2, h), s);
  },
});
// a row of n grey moulded power inductors (the Pi 5's four beside the PMIC)
B.kind('pi-inductors', { group: 'smd', size: p => [(p.n || 4) * 2.8, 2.5], h: 1.2,
  draw(ctx){
    const p = ctx.p, [l, w] = p.size, h = p.h, xs = p.xs || [], grey = matOf('#7d7a74');
    for (const x of xs){ const [a] = B.localOf(p, x, p.at[1]);
      ctx.put(ctx.B(a - 1, -w / 2, 0, a + 1, w / 2, h), ctx.slab(a - 1, -w / 2, a + 1, w / 2, 0, h, grey, toneI, .45)); }
  },
});
// the small 0402/0201 resistors and capacitors, one selectable part: spots [x, y, 'r'|'c', rot]
B.kind('pi-passives', { group: 'smd', size: p => p.size || [8, 8], h: .35,
  draw(ctx){
    const p = ctx.p, body = { r: { l: '#3c3935', m: '#2c2a27', d: '#1c1b19' }, c: B.M.tan };
    for (const [x, y, k, r = 0] of p.spots || []){
      const [a, b] = B.localOf(p, x, y), [hx, hy] = (r - (p.rot || 0)) % 180 ? [.22, .45] : [.45, .22];
      ctx.put(ctx.B(a - hx, b - hy, 0, a + hx, b + hy, .35), ctx.slab(a - hx, b - hy, a + hx, b + hy, 0, .35, body[k] || body.r, toneI, .25));
    }
  },
});
// the push-pull microSD socket on the underside: a steel lid with the card slot at its -x end
B.kind('pi-sdsocket', { group: 'smd', size: () => [11.75, 11.95], h: 1.4,
  draw(ctx){
    const p = ctx.p, [l, w] = p.size, h = p.h;
    let s = ctx.slab(-l / 2, -w / 2, l / 2, w / 2, 0, h, B.M.steel, toneI, .6);
    s += ctx.line([[-l / 2 + 2, -w / 2 + 1, h + .01], [l / 2 - 1, -w / 2 + 1, h + .01]], .4) + ctx.line([[-l / 2 + 2, w / 2 - 1, h + .01], [l / 2 - 1, w / 2 - 1, h + .01]], .4);
    ctx.put(ctx.B(-l / 2, -w / 2, 0, l / 2, w / 2, h), s);
  },
});
// the microSD card with the operating system, pushed into the socket; a third of it sticks out past the edge
B.kind('pi-sdcard', { group: 'last', size: () => [15, 11], h: .8,
  draw(ctx){
    const p = ctx.p, [l, w] = p.size, z0 = .3, h = z0 + p.h;
    let s = ctx.slab(-l / 2, -w / 2, l / 2, w / 2, z0, h, matOf('#2e3440'), toneI, .6);
    s += ctx.poly([[-l / 2 + .6, -w / 2 + .8], [-l / 2 + 4, -w / 2 + .8], [-l / 2 + 4, w / 2 - .8], [-l / 2 + .6, w / 2 - .8]], h + .01, '#d8463b', 0)
      + ctx.text(-l / 2 + 2.3, 0, h + .02, 'SD', .9, '#ffffff');
    ctx.put(ctx.B(-l / 2, -w / 2, z0, l / 2, w / 2, h), s);
  },
});
/* the Pi 5's bi-colour LED behind its light pipe at the left edge. The engine lights it from the 3V3 rail; the
   colour says what the firmware is doing: red = power but no firmware yet (or a dead SoC), green = running (off
   while the SD card is read: the ACT net), or a green long/short flash code when the bootloader stops */
const FLASH = { U2: [0, 8], U3: [4, 3] };
const flashOn = ([long, short], t) => {
  const seq = []; for (let i = 0; i < long; i++) seq.push(.8, .4); for (let i = 0; i < short; i++) seq.push(.2, .3); seq.push(0, 1.6);
  const total = seq.reduce((a, b) => a + b, 0); let u = ((t % total) + total) % total;
  for (let i = 0; i < seq.length; i++){ if (u < seq[i]) return i % 2 === 0; u -= seq[i]; }
  return false;
};
B.kind('pi-led5', { group: 'smd', size: () => [4.2, 1.6], h: 2.3,
  draw(ctx){
    const p = ctx.p, [l, w] = p.size, h = p.h, ev = ctx.st.ev || {}, pins = (ctx.o.o && ctx.o.o.pins) || {}, t = ctx.st.t || 0;
    let col = null;
    if (ctx.lit > .05 && ev.status !== 'fault'){
      if (ev.status === 'running') col = pins.ACT ? null : '#5fd66a';
      else { const stuck = Object.keys(FLASH).find(id => B.md.byId[id] && !B.isSet(id));
        col = stuck && B.isSet('U1') ? (flashOn(FLASH[stuck], t) ? '#5fd66a' : null) : '#ff4d3d'; }
    }
    let s = ctx.slab(-l / 2, -w / 2, l / 2, w / 2, 0, h, matOf(col ? mix(col, '#ffffff', .35) : '#f2da79'), toneI, .5);
    if (col) s += ctx.glow(0, -w / 2, h * .6, 2.6 * ctx.lit + 1, col, .45) + ctx.glow(0, -w / 2, h * .6, 1, '#fffbe8', .7);
    ctx.put(ctx.B(-l / 2, -w / 2, 0, l / 2, w / 2, h), s);
  },
  xrLabel: () => 'LED',
});

/* ---------- the 40-pin header (physical pin n = J8.n) ---------- */
const J8_NETS = [
  '3V3', '5V', 'GPIO2', '5V', 'GPIO3', 'GND', 'GPIO4', 'GPIO14', 'GND', 'GPIO15',
  'GPIO17', 'GPIO18', 'GPIO27', 'GND', 'GPIO22', 'GPIO23', '3V3', 'GPIO24', 'GPIO10', 'GND',
  'GPIO9', 'GPIO25', 'GPIO11', 'GPIO8', 'GND', 'GPIO7', 'GPIO0', 'GPIO1', 'GPIO5', 'GND',
  'GPIO6', 'GPIO12', 'GPIO13', 'GND', 'GPIO19', 'GPIO16', 'GPIO26', 'GPIO20', 'GND', 'GPIO21',
];
// odd pins on the inner row (y 51.23), even pins on the outer row (y 53.77), pin 1 at x 8.37: rot 180 + mirror
// puts the engine's IDC order (pin 1, 2 across, then 3, 4...) exactly there
const J8 = { id: 'J8', kind: 'male', name: '40-pin GPIO header (3.3 V logic)', short: 'GPIO', at: [32.5, 52.5], rows: 2, rot: 180, mirror: true,
  h: 8.54, group: 'tall', pins: J8_NETS };

/* ---------- programs the "Run a program" picker offers (both boards run them; the bench brings its own) ---------- */
const sq = (t, on, off) => (t % (on + off)) < on ? 1 : 0;
// SD-card reads: bursts while Linux boots, a blip every few seconds after
const sdRead = t => t < 5 ? (Math.floor(t * 9) % 3 === 0 ? 1 : 0) : (t % 7 < .06 ? 1 : 0);
const tri = (t, period) => { const u = (t % period) / period; return u < .5 ? u * 2 : 2 - u * 2; };
// the kernel's own warning while the 5 V input is below 4.63 V, every third second over the program's lines
const UNDER = 4.63, under = st => st.ev && st.ev.rails && st.ev.rails['5V'] > .5 && st.ev.rails['5V'] < UNDER;
const withSupply = fn => (k, st) => under(st) && k % 3 === 1 ? 'hwmon hwmon1: Undervoltage detected!' : fn(k, st);
const SCRIPTS = {
  blink: 'from gpiozero import LED\nfrom time import sleep\n\nled = LED(17)\n\nwhile True:\n    led.on()\n    sleep(1)\n    led.off()\n    sleep(1)\n',
  button: 'from gpiozero import LED, Button\nfrom signal import pause\n\nled = LED(17)\nbutton = Button(27)\nbutton.when_pressed = led.on\nbutton.when_released = led.off\npause()\n',
  fade: 'from gpiozero import PWMLED\nfrom signal import pause\n\nled = PWMLED(18)\nled.pulse(fade_in_time=1, fade_out_time=1)\npause()\n',
};
function modes(v){
  const boot = v.pi5
    ? ['[    0.000000] Booting Linux on physical CPU 0x0000000000 [0x414fd0b1]', '[    0.000000] Machine model: Raspberry Pi 5 Model B Rev 1.0']
    : ['[    0.000000] Booting Linux on physical CPU 0x0000000000 [0x410fd083]', '[    0.000000] Machine model: Raspberry Pi 4 Model B Rev 1.5'];
  boot.push('[    2.981230] systemd[1]: Reached target multi-user.target - Multi-User System.', 'Debian GNU/Linux 13 raspberrypi ttyAMA' + (v.pi5 ? '10' : '0'), 'maker@raspberrypi:~ $');
  const pressed = st => !!(st.cparams && st.cparams.BTN1 && st.cparams.BTN1.pressed);
  return {
    boot: { title: 'Boot to a shell', instant: true, out: (st, t) => ({ ACT: sdRead(t) }), serial: withSupply(k => boot[k] || null) },
    blink: { title: 'blink.py', bytes: SCRIPTS.blink.length, instant: true,
      out: (st, t) => ({ GPIO17: sq(t, 1, 1), ACT: t % 7 < .06 ? 1 : 0 }), serial: withSupply(k => k === 0 ? 'maker@raspberrypi:~ $ python3 blink.py' : null) },
    button: { title: 'button.py', bytes: SCRIPTS.button.length, instant: true,
      out: st => ({ GPIO17: pressed(st) ? 1 : 0 }), serial: withSupply(k => k === 0 ? 'maker@raspberrypi:~ $ python3 button.py' : null) },
    fade: { title: 'fade.py', bytes: SCRIPTS.fade.length, instant: true,
      out: (st, t) => ({ GPIO18: tri(t, 2) }), serial: withSupply(k => k === 0 ? 'maker@raspberrypi:~ $ python3 fade.py' : null) },
    health: { title: 'vcgencmd health', instant: true, out: () => ({}),
      serial: (k, st) => {
        const uv = under(st), lines = [uv ? 'throttled=0x50005' : 'throttled=0x0', `temp=${(47.2 + (k % 6) * .5).toFixed(1)}'C`,
          `frequency(0)=${v.pi5 ? (uv ? 1500000000 : 2400000000) : (uv ? 600000000 : 1800000000)}`, uv ? 'hwmon hwmon1: Undervoltage detected!'
            : v.pi5 ? `EXT5V_V volt(24)=${(st.ev.rails['5V'] || 0).toFixed(4)}V` : `volt=${(st.ev.rails.CORE || 0).toFixed(4)}V`];
        return lines[k % lines.length];
      } },
  };
}

/* ---------- lesson circuits: a half breadboard behind the board, next to the header (docs/facts/pi4-pi5.md §7) ---------- */
const LED = (col, color = 'red') => [
  { id: 'R1', part: 'resistor', ohms: 330, holes: ['b' + col, 'b' + (col + 4)] },
  { id: 'D1', part: 'led', color, holes: ['c' + (col + 4), 'c' + (col + 5)] },
];
const ledWires = (net, col, wire) => [{ from: net, to: 'a' + col, color: wire }, { from: 'J8.9', to: 'a' + (col + 5), color: 'black' }];
const BUTTON = { id: 'BTN1', part: 'push-button', holes: ['e14', 'f14', 'e16', 'f16'] };
const buttonCircuit = title => ({ title, breadboard: 'half', board: 'back',
  // the button straddles the trench at columns 14 and 16: pressing joins GPIO27 (pin 13) to GND (pin 14)
  parts: [...LED(4), BUTTON],
  wires: [...ledWires('GPIO17', 4, 'orange'), { from: 'GPIO27', to: 'j14', color: 'yellow' }, { from: 'J8.14', to: 'j16', color: 'black' }] });
const circuits = () => ({
  blink: { title: 'An LED on GPIO17 (pin 11) through 330 Ω', breadboard: 'half', board: 'back', parts: LED(4), wires: ledWires('GPIO17', 4, 'orange') },
  button: buttonCircuit('A button on GPIO27 (pin 13), the LED on GPIO17'),
  fade: { title: 'An LED on GPIO18 (pin 12), the PWM pin', breadboard: 'half', board: 'back', parts: LED(4, 'yellow'), wires: ledWires('GPIO18', 4, 'green') },
  distance: { title: 'HC-SR04 on GPIO23/24, the 5 V echo through a 1 kΩ / 2 kΩ divider', breadboard: 'half', board: 'back',
    // US1 legs VCC TRIG ECHO GND in a20-a23; ECHO -> 1 kΩ -> column 26 (to GPIO24) -> 2 kΩ -> column 30 (GND)
    parts: [{ id: 'US1', part: 'hc-sr04', holes: ['a20', 'a21', 'a22', 'a23'] },
      { id: 'R2', part: 'resistor', ohms: 1000, holes: ['d22', 'd26'] }, { id: 'R3', part: 'resistor', ohms: 2000, holes: ['c26', 'c30'] },
      ...LED(4)],
    wires: [{ from: 'J8.2', to: 'e20', color: 'red' }, { from: 'GPIO23', to: 'e21', color: 'yellow' }, { from: 'J8.6', to: 'e23', color: 'black' },
      { from: 'b23', to: 'b30', color: 'black' }, { from: 'GPIO24', to: 'e26', color: 'green' }, ...ledWires('GPIO17', 4, 'orange')] },
  estop: buttonCircuit('E-stop button on GPIO27, status LED on GPIO17'),
});

/* ---------- build-step conditions the hosts check (state.tasks.<id>): a group is in when every part of it is placed
   (or deliberately left out) and at least one really is ---------- */
const partsOf = g => ((B.md && B.md.parts) || []).filter(p => p.group === g && !p.fixed);
const groupIn = (st, g) => { const ps = partsOf(g); return ps.some(p => st.placed[p.id]) && ps.every(p => st.placed[p.id] || st.left[p.id]); };
const TASKS = [
  { id: 'low-in', check: st => groupIn(st, 'low') },
  { id: 'tall-in', check: st => groupIn(st, 'tall') },
  { id: 'card-in', check: st => !!(st.placed.CARD && st.placed.CARD.sold) },
];

/* ---------- the two boards ---------- */
const VAR = {
  pi5: { pi5: true, name: 'Raspberry Pi 5', sub: 'BCM2712, four Cortex-A76 cores at 2.4 GHz, RP1 for every port, 5 V 5 A over USB-C PD, 3.3 V GPIO' },
  pi4: { pi5: false, name: 'Raspberry Pi 4 Model B', sub: 'BCM2711, four Cortex-A72 cores at 1.8 GHz, VL805 USB 3 controller, 5 V 3 A over USB-C, 3.3 V GPIO' },
};
// passives: positions are illustrative (neither design file lists them): around the SoC, the PMIC and the I/O chip
const ring = (cx, cy, rx, ry, n, kinds = 'rc') => Array.from({ length: n }, (_, i) => {
  const a = i / n * 2 * Math.PI; return [+(cx + rx * Math.cos(a)).toFixed(2), +(cy + ry * Math.sin(a)).toFixed(2), kinds[i % kinds.length], Math.abs(Math.cos(a)) > .7 ? 90 : 0];
});
const scatter = spots => {
  const xs = spots.map(s => s[0]), ys = spots.map(s => s[1]), x0 = Math.min(...xs) - .6, x1 = Math.max(...xs) + .6, y0 = Math.min(...ys) - .6, y1 = Math.max(...ys) + .6;
  return { id: 'RC', kind: 'pi-passives', name: 'Decoupling capacitors and resistors', short: 'PASSIVES', at: [(x0 + x1) / 2, (y0 + y1) / 2], size: [x1 - x0, y1 - y0], spots };
};

function pi5Parts(){
  return [
    { id: 'U1', kind: 'bga', lid: true, name: 'BCM2712 SoC (four Cortex-A76 at 2.4 GHz, VideoCore VII)', short: 'SOC', at: [33.15, 22.75], size: [17, 17], h: 2.36, label: 'BROADCOM|BCM2712' },
    { id: 'U2', kind: 'bga', name: 'LPDDR4X SDRAM', short: 'RAM', at: [33.15, 39.2], size: [14.5, 10], h: 1, label: 'LPDDR4X' },
    { id: 'U3', kind: 'bga', name: 'RP1 I/O controller (USB, Ethernet, MIPI, GPIO)', short: 'RP1', at: [58.5, 35.1], size: [12, 12], h: 1.2, label: 'RP1-C0' },
    { id: 'U4', kind: 'qfn', name: 'DA9091 power management IC', short: 'PMIC', at: [11.2, 15.2], size: [5, 5], h: .55, n: 8, label: 'DA9091' },
    { id: 'L1', kind: 'pi-inductors', name: 'PMIC power inductors (four)', short: 'INDUCTORS', at: [11.2, 21.95], size: [11.2, 2.5], h: 1.2, xs: [6.6, 9.1, 13.3, 15.8] },
    { id: 'U5', kind: 'can', name: 'Wi-Fi and Bluetooth module under its RF can', short: 'WI-FI', at: [12.3, 42.7], size: [10.8, 13], h: 1.7 },
    { id: 'U6', kind: 'qfn', name: 'Gigabit Ethernet PHY', short: 'ETH PHY', at: [64, 23.5], size: [6, 6], rot: 45, h: .85, n: 10 },
    scatter([...ring(33.15, 22.75, 10.6, 10.6, 18), ...ring(11.2, 15.2, 4.2, 3.4, 8, 'c'), ...ring(58.5, 35.1, 7.6, 7.6, 10)]),
    { id: 'LED1', kind: 'pi-led5', name: 'Power and status LED (red/green) behind its light pipe', short: 'LED', at: [.96, 13.3], size: [4.2, 1.6], rot: 90, h: 2.3, led: { color: '#5fd66a', rail: '3V3' } },
    { id: 'SW1', kind: 'button-smd', name: 'Power button', short: 'POWER', at: [1.3, 18.4], size: [4.5, 3.5], rot: -90, h: 3.3, control: { type: 'button', action: 'reset', net: 'PWR_BUT' } },
    { id: 'J20', kind: 'pi-ffc', name: 'PCIe 2.0 x1 connector (16-pin 0.5 mm FFC)', short: 'PCIE', at: [2.88, 29.99], size: [13.7, 3.55], rot: 90, h: 3.95 },
    { id: 'J3', kind: 'pi-ffc', name: 'Camera/display connector 0 (22-pin, 4-lane MIPI)', short: 'CAM/DISP 0', at: [48.88, 8.49], size: [16.7, 3.55], rot: 90, h: 3.95 },
    { id: 'J4', kind: 'pi-ffc', name: 'Camera/display connector 1 (22-pin, 4-lane MIPI)', short: 'CAM/DISP 1', at: [55.08, 8.49], size: [16.7, 3.55], rot: 90, h: 3.95 },
    { id: 'J5', kind: 'pi-jst', n: 2, name: 'RTC battery connector (2-pin JST-SH)', short: 'BAT', at: [19, 5.2], size: [4, 3.8], h: 4.3 },
    { id: 'UART', kind: 'pi-jst', n: 3, name: 'UART debug connector (3-pin JST-SH)', short: 'UART', at: [32.5, 4.4], size: [5, 3.8], h: 4.3 },
    { id: 'FAN', kind: 'pi-jst', n: 4, name: 'PWM fan connector (4-pin JST-SH)', short: 'FAN', at: [67.2, 52], size: [6, 3.8], rot: 90, h: 4.3 },
    { id: 'J1', kind: 'usb-c', name: 'USB-C power input (5 V, 5 A with USB PD)', short: 'USB-C', at: [11.2, 2.69], size: [7.78, 8.94], rot: 90, h: 3.26 },
    { id: 'MICROSD', kind: 'pi-sdsocket', name: 'microSD card socket (underside)', short: 'MICROSD', at: [8.12, 28.09], size: [11.75, 11.95], side: 'bottom', h: 1.4 },
    { id: 'J6', kind: 'pi-hdmi', name: 'Micro-HDMI 0', short: 'HDMI0', at: [25.8, 2.19], size: [10, 7.5], rot: 90, h: 3.5 },
    { id: 'J13', kind: 'pi-hdmi', name: 'Micro-HDMI 1', short: 'HDMI1', at: [39.2, 2.19], size: [10, 7.5], rot: 90, h: 3.5 },
    J8,
    { id: 'J14', kind: 'male', name: 'PoE+ header (Ethernet centre taps)', short: 'POE+', at: [61.5, 9.5], rows: 2, h: 8.54, group: 'tall', pins: ['TR0_TAP', 'TR1_TAP', 'TR2_TAP', 'TR3_TAP'] },
    { id: 'J10', kind: 'pi-rj45', name: 'Gigabit Ethernet jack', short: 'ETHERNET', at: [77.25, 10.25], size: [21.6, 17.5], rot: 180, h: 13.3 },
    { id: 'J12', kind: 'usb-a', name: 'USB 3.0 ports (two, blue)', short: 'USB 3', at: [79.23, 29], size: [17.53, 14.5], rot: 180, h: 16.2, tongue: '#3e86d9' },
    { id: 'J11', kind: 'usb-a', name: 'USB 2.0 ports (two, black)', short: 'USB 2', at: [79.06, 47], size: [17.45, 14.5], rot: 180, h: 16, tongue: '#2a2826' },
    { id: 'CARD', kind: 'pi-sdcard', name: 'microSD card with the operating system', short: 'SD CARD', at: [5.23, 28.09], size: [15, 11], side: 'bottom', h: .8 },
  ];
}
function pi4Parts(){
  return [
    { id: 'U1', kind: 'bga', lid: true, name: 'BCM2711 SoC (four Cortex-A72 at 1.8 GHz, VideoCore VI)', short: 'SOC', at: [29.25, 32.5], size: [15, 15], h: 2.4, label: 'BROADCOM|BCM2711' },
    { id: 'U2', kind: 'bga', name: 'LPDDR4 SDRAM', short: 'RAM', at: [44.8, 32.5], size: [11.5, 15], h: 1, label: 'LPDDR4' },
    { id: 'U3', kind: 'qfn', name: 'VL805 USB 3.0 host controller (on PCIe)', short: 'VL805', at: [59.5, 24], size: [8, 8], h: .9, n: 10, label: 'VIA|VL805' },
    { id: 'U4', kind: 'qfn', name: 'MxL7704 power management IC', short: 'PMIC', at: [9.9, 12.2], size: [5, 5], h: .9, n: 8, label: 'MXL7704' },
    { id: 'L1', kind: 'inductor', name: 'PMIC power inductor', short: 'INDUCTOR', at: [14.9, 16.1], size: [4, 4], h: 1.8 },
    { id: 'U5', kind: 'can', name: 'Wi-Fi and Bluetooth module (CYW43455) under its RF can', short: 'WI-FI', at: [12, 42.6], size: [10.8, 13], h: 1.7 },
    { id: 'ANT', kind: 'antenna', chip: true, name: 'Wi-Fi antenna', short: 'ANTENNA', at: [1.4, 48.55], size: [2.6, 2.6] },
    { id: 'U6', kind: 'qfn', name: 'Gigabit Ethernet PHY (BCM54213PE)', short: 'ETH PHY', at: [58.5, 38], size: [6, 6], h: .9, n: 10 },
    scatter([...ring(29.25, 32.5, 9.4, 9.4, 18), ...ring(9.9, 12.2, 4, 3.2, 8, 'c'), ...ring(59.5, 24, 5.8, 5.8, 8)]),
    { id: 'D3', kind: 'led', name: 'PWR LED (red, on while the supply is good)', short: 'PWR', at: [1.1, 7.9], size: [1.6, .7], rot: 90, h: .6, led: { color: '#e2483d', rail: 'POWER_OK' } },
    { id: 'D5', kind: 'led', name: 'ACT LED (green, SD-card activity)', short: 'ACT', at: [1.1, 11.5], size: [1.6, .7], rot: 90, h: .6, led: { color: '#57c46b', net: 'ACT' } },
    { id: 'J2', kind: 'pads', name: 'RUN / GLOBAL_EN pads (not fitted)', short: 'RUN', at: [12, 20.5], fixed: true, d: 1.5, mirror: true, pins: ['RUN', 'GND', 'GLOBAL_EN'] },
    { id: 'J3', kind: 'pi-ffc', name: 'Camera connector (15-pin 1 mm, 2-lane CSI-2)', short: 'CAMERA', at: [47.025, 11.5], size: [22.4, 3.95], rot: 90, h: 5.5 },
    { id: 'J4', kind: 'pi-ffc', name: 'Display connector (15-pin 1 mm, 2-lane DSI)', short: 'DISPLAY', at: [3.475, 28], size: [22.4, 3.95], rot: 90, h: 5.5 },
    { id: 'J1', kind: 'usb-c', name: 'USB-C power input (5 V 3 A)', short: 'USB-C', at: [11.2, 2.45], size: [7.4, 8.65], rot: 90, h: 3.2 },
    { id: 'MICROSD', kind: 'pi-sdsocket', name: 'microSD card socket (underside)', short: 'MICROSD', at: [7.41, 28.1], size: [11.45, 12], side: 'bottom', h: 1.4 },
    { id: 'J6', kind: 'pi-hdmi', name: 'Micro-HDMI 0', short: 'HDMI0', at: [26, 2.55], size: [7.95, 7.2], rot: 90, h: 3.5 },
    { id: 'J13', kind: 'pi-hdmi', name: 'Micro-HDMI 1', short: 'HDMI1', at: [39.5, 2.55], size: [7.95, 7.2], rot: 90, h: 3.5 },
    { id: 'J7', kind: 'pi-av', name: '3.5 mm A/V jack (stereo audio and composite video)', short: 'A/V', at: [54, 6.25], size: [12.5, 7], rot: 90, h: 6 },
    J8,
    { id: 'J14', kind: 'male', name: 'PoE header (Ethernet centre taps)', short: 'POE', at: [61.5, 46.36], rows: 2, h: 8.5, group: 'tall', pins: ['TR0_TAP', 'TR1_TAP', 'TR2_TAP', 'TR3_TAP'] },
    { id: 'J10', kind: 'pi-rj45', name: 'Gigabit Ethernet jack', short: 'ETHERNET', at: [77.3, 45.75], size: [21.35, 15.5], rot: 180, h: 13.5 },
    { id: 'J12', kind: 'usb-a', name: 'USB 3.0 ports (two, blue)', short: 'USB 3', at: [79.25, 27.34], size: [17.5, 13.8], rot: 180, h: 16, tongue: '#3e86d9' },
    { id: 'J11', kind: 'usb-a', name: 'USB 2.0 ports (two, black)', short: 'USB 2', at: [79.15, 8.61], size: [17.7, 13.9], rot: 180, h: 16, tongue: '#2a2826' },
    { id: 'CARD', kind: 'pi-sdcard', name: 'microSD card with the operating system', short: 'SD CARD', at: [5.23, 28.1], size: [15, 11], side: 'bottom', h: .8 },
  ];
}
// DXF text insertion points are the left baseline; the engine centres text, so each one moves half its length on
const dxf = (x, y, t, h, rot = 0) => { const half = t.length * .6 * h * 1.3 / 2; return rot ? [x - h * .5, y + half, t, h, 90] : [x + half, y + h * .5, t, h]; };
const SILK4 = [
  dxf(29.9, 47.3, 'Raspberry Pi 4 Model B', 1.15), dxf(31.2, 44.67, '© Raspberry Pi 2018', 1.15), dxf(21, 47.5, 'GPIO', .96), dxf(5.6, 49.7, 'J8', .8),
  dxf(58.5, 45.5, 'PoE', .96, 90), dxf(63.5, 49.35, 'J14', .8), dxf(75.5, 54, 'ETHERNET', .96), dxf(70.8, 54.2, 'J10', .8),
  dxf(80.5, 19, 'USB3', .96), dxf(74.5, 19, 'J12', .8), dxf(80.5, 1, 'USB2', .96), dxf(73.8, 1, 'J11', .8),
  dxf(50, .6, 'A/V', .96, 90), dxf(57.9, 5.9, 'J7', .8), dxf(42.9, 9.6, 'CAMERA', .96, 90), dxf(43, 21.7, 'J3', .8),
  dxf(35.3, .5, 'HDMI1', .96, 90), dxf(35.9, 7.6, 'J13', .8), dxf(21.8, .5, 'HDMI0', .96, 90), dxf(22.9, 7.6, 'J6', .8),
  dxf(17.6, .5, 'POWER IN', .96, 90), dxf(7, 3.1, 'J1', .8), dxf(4.3, 6.6, 'PWR', .96), dxf(1.4, 13.4, 'ACT', .96, 90),
  dxf(8.6, 24.8, 'DISPLAY', .96, 90), dxf(.9, 36.6, 'J4', .8), dxf(8.5, 22.5, 'RUN', .8), dxf(11.7, 22.5, 'GLOBAL_EN', .8), dxf(16.3, 20, 'J2', .8),
  dxf(29.5, 14, 'Made in the UK', .96), dxf(20.5, 19.6, 'FCC ID: 2ABCB-RPI4B', .8), dxf(20.5, 17.9, 'IC: 20953-RPI4B', .8),
];
// Pi 5 silkscreen: the strings read from Raspberry Pi's product photo, positions estimated from it
const SILK5 = [
  [22.6, 37.2, 'Raspberry Pi 5', 1.2, 90], [32.5, 10.4, 'HDMI', 1.8], [32.5, 7.2, 'UART', .9], [32.5, 48.6, 'HAT+ GPIO INTERFACE', .9],
  [67.2, 48.2, 'FAN', .9], [19, 8, 'BAT', .9], [5.4, 29.99, 'PCIE', .9, 90], [46.2, 8.49, 'CAM/DISP 0', .8, 90], [52.2, 8.49, 'CAM/DISP 1', .8, 90],
];

function power(v){
  const pmic = ['U4', 'L1'];
  return {
    sources: {
      usb: v.pi5 ? { label: '27 W USB-C PD supply (5.1 V 5 A)', part: 'J1', plug: 'usb-c', v: 5.1 } : { label: 'USB-C supply (5.1 V 3 A)', part: 'J1', plug: 'usb-c', v: 5.1 },
      charger: { label: 'Phone charger (5 V 2 A)', part: 'J1', plug: 'usb-c', v: 5, range: [4.75, 5.25] },
      pin5: { label: '5 V into GPIO pins 2 and 4', pin: '5V', v: 5.1, range: [4.75, 5.25] },
      // a wiring mistake as a supply: the official supply, plus an HC-SR04's 5 V echo straight into GPIO24
      echo5: { label: 'USB-C, with a 5 V sensor output straight into GPIO24', part: 'J1', plug: 'usb-c', v: 5.1, range: [0, 3.3], scenario: true },
    },
    default: 'usb',
    rails: {
      // the header's 5 V pins sit on the input rail itself: no fuse, no diode, so a reversed or 12 V supply there
      // reaches the PMIC unopposed (docs/facts/pi4-pi5.md §3.3, §6)
      '5V': { from: [{ src: 'usb', via: ['J1'] }, { src: 'charger', via: ['J1'] }, { src: 'echo5', via: ['J1'] }, { src: 'pin5', burns: 'U4' }], max: 6, victim: 'U4' },
      '3V3': { from: [{ rail: '5V', via: pmic, reg: 3.3, dropout: .4, ilim: 1.5 },
        // the echo pin's protection diode conducts into the 3.3 V GPIO rail
        { src: 'echo5', via: [v.pi5 ? 'U3' : 'U1'], drop: .6 }], max: 3.6, victim: v.pi5 ? 'U3' : 'U1' },
      '1V8': { from: [{ rail: '5V', via: pmic, reg: 1.8, dropout: .4 }] },
      DDR: { from: [{ rail: '5V', via: pmic, reg: 1.1, dropout: .4 }] },
      CORE: { from: [{ rail: '5V', via: pmic, reg: .8, dropout: .4 }] },
      // the PMIC's power-good line (3.3 V logic): low while the 5 V input is under 4.63 V; it lights the Pi 4's PWR LED
      POWER_OK: { from: [{ rail: '3V3', via: ['U4'], drop: 0, offIf: ['5V', '<', UNDER] }] },
    },
    mcu: { part: 'U1', rail: '3V3', min: 3, needs: v.pi5 ? ['U1', 'U2', 'U3', 'CARD'] : ['U1', 'U2', 'CARD'] },
    upload: { source: 'usb', needs: [], tool: 'none' },
  };
}

function make(key){
  const v = VAR[key], parts = v.pi5 ? pi5Parts() : pi4Parts(), at = id => parts.find(p => p.id === id).at;
  const soc = at('U1'), pmicAt = at('U4'), io = at('U3');
  return {
    id: 'pi4-pi5', fig: '10', name: v.name, sub: v.sub, logic: 3.3, pal: 'mint', height: 18,
    pcb: { w: 85, h: 56, thick: v.pi5 ? 1.3 : 1.4, r: 3, color: v.pi5 ? '#008c49' : '#1d8a4a', silk: '#f4f6ef', standoff: 4 },
    mat: { front: 24, back: 12, left: 12, right: 14 },
    holes: [[3.5, 3.5, 2.7], [61.5, 3.5, 2.7], [3.5, 52.5, 2.7], [61.5, 52.5, 2.7]],
    silk: v.pi5 ? SILK5 : SILK4,
    traces: [
      [[11.2, 5.5], [pmicAt[0], pmicAt[1] - 3]], [[pmicAt[0] + 2.5, pmicAt[1] + 1], [soc[0] - 6, soc[1] - 4]],
      [[soc[0] + 6, soc[1] + 3], [io[0] - 5, io[1] - 2]], [[io[0], io[1] + 5], [io[0] - 8, 49.5], [21.07, 50.4]],
      [[6, 7], [4.6, 12], [4.6, 47], [8.37, 53]], [[soc[0], soc[1] + 7], [soc[0], 36]],
    ],
    parts,
    power: power(v),
    mode: 'blink',
    modes: modes(v),
    modesLabel: { button: 'Run a program', stat: 'Program' },
    faults: [
      ['cold:J8.11', 'Cold joint on header pin 11 (GPIO17)'], ['cold:J8.13', 'Cold joint on header pin 13 (GPIO27)'],
      ['missing:CARD', 'No microSD card'], ['short:3V3:GND', 'Solder bridge from 3V3 to GND'], ['short:5V:GND', 'Solder bridge from 5V to GND'],
      'missing:U2', ...(v.pi5 ? ['missing:U3'] : []),
    ],
    xr: {
      flow: [
        ['5V', [[11.2, 4.5], [pmicAt[0], pmicAt[1] - 2.6]]],
        ['5V', [[6, 7], [4.6, 12], [4.6, 47], [8.37, 53.77]]],
        ['CORE', [[pmicAt[0] + 2.6, pmicAt[1] + 1], [soc[0] - 6, soc[1] - 4]]],
        ['3V3', [[pmicAt[0] + 1, pmicAt[1] + 2.6], [6.5, 40], [8.37, 51.23]]],
        ['GPIO17', [[io[0], io[1] + 5], [io[0] - 8, 49.5], [21.07, 51.23]]],
      ],
      notes: [['U1', 'SILICON DIE'], ['U2', 'DRAM DIES'], ['U3', v.pi5 ? 'RP1 I/O CHIP' : 'USB 3 CHIP'], ['U4', 'POWER CHIP'], ['U5', 'WI-FI RADIO'], ['U6', 'ETHERNET PHY'], ['J10', 'MAGNETICS']],
    },
    tags: [['U1', 34, 30], ['U3', 40, -22], ['U4', -42, 18], ['J1', -40, -20], ['J8', -24, -34], ['J12', 40, 12], ['J10', 42, -12],
      v.pi5 ? ['LED1', -44, -6] : ['D3', -44, -6], ['CARD', -40, 36]],
    circuit: 'blink',
    circuits: circuits(),
    tasks: TASKS,
    variant: key,
    variants: Object.fromEntries(Object.entries(VAR).map(([k, x]) => [k, { name: x.name, patch: () => make(k) }])),
  };
}

B.board(make('pi5'));
})();
