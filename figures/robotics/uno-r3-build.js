// @cf title Build an Arduino Uno R3
// @cf use engine/bench.list
// @cf use parts/push-button.js
// @cf use boards/uno-r3.js
/* Robotics Bench Fig. 01: build an Arduino Uno R3 from the bare PCB. The board itself (geometry, parts, power tree,
   RESET, the Optiboot flashes) is figures/boards/uno-r3.js; this bench adds what the build lesson needs on top of it:
   - the four sketches the "Upload sketch" picker runs, timed exactly like the code the host shows
     (src/content/robotics/uno-r3-build.ts, same mode ids), defects of the original fixed: the fade sketch has its
     setup(), Blink without delay() reads millis() once, Serial hello prints a banner so RESET and brown-out show;
   - the two practice-task circuits on a half breadboard (reaction timer: LED on D13, push button D2 to GND;
     real fade: LED on the ~9 PWM pin);
   - the build-step conditions the host checks, reported as state.tasks: every SMD part placed, reflowed, every low
     and tall through-hole part in, every joint soldered, the ATmega328P in its socket the right way round.
   Breadboard ids avoid the board's own designators (the Uno has R1/R2, so the series resistor is R3). */
(() => {
const B = SL.bench;
const sq = (t, hi, lo) => (t % (hi + lo)) < hi ? 1 : 0;
const partsOf = g => ((B.md && B.md.parts) || []).filter(p => p.group === g && !p.fixed);
const isIn = (st, p) => !!st.placed[p.id];
const isSold = (st, p) => !!(st.placed[p.id] && st.placed[p.id].sold);
const done = (st, p, test) => test(st, p) || !!st.left[p.id];
// a group is "in" when every part of it is placed (or deliberately left out) and at least one really is
const groupIs = (st, g, test) => { const ps = partsOf(g); return ps.some(p => test(st, p)) && ps.every(p => done(st, p, test)); };

const LED_D13 = [
  { id: 'R3', part: 'resistor', ohms: 220, holes: ['b10', 'b14'] },
  { id: 'LED1', part: 'led', color: 'red', holes: ['c14', 'c15'] },
];

B.bench({
  id: 'uno-r3-build', fig: '01', board: 'uno-r3', pal: 'cobalt', view: 'board',
  name: 'Build an Arduino Uno R3',
  sub: 'Bare PCB to Blink: SMD parts and the reflow oven, through-hole parts low to tall, the iron, then the chip',
  mode: 'blink',
  modes: {
    // digitalWrite HIGH, delay(1000), LOW, delay(1000)
    blink: { title: 'Blink', bytes: 924, out: (st, t) => ({ D13: sq(t, 1, 1) }) },
    // the first toggle comes when millis() reaches 200, so D13 is LOW for the first 200 ms
    fast: { title: 'Blink without delay()', bytes: 1006, out: (st, t) => ({ D13: Math.floor(t / .2) % 2 }) },
    // 256 steps of 8 ms; pin 13 has no PWM timer, so analogWrite gives LOW for 0-127 and HIGH for 128-255
    fade13: { title: 'analogWrite on pin 13 (no PWM there)', bytes: 1132, out: (st, t) => ({ D13: Math.floor((t % 2.048) / .008) >= 128 ? 1 : 0 }) },
    // banner from setup(), then one line a second; pin 13 stays an input
    hello: { title: 'Serial hello', bytes: 1490, banner: 'Uno ready', out: () => ({}), serial: k => 'hello, robot #' + k },
  },
  circuits: Object.assign({}, (B.defs.board['uno-r3'] || {}).circuits || {}, {
    'reaction-timer': {
      title: 'Reaction timer: LED on D13, button from D2 to GND', breadboard: 'half',
      parts: [...LED_D13, { id: 'SW1', part: 'push-button', color: 'black', holes: ['e20', 'f20', 'e22', 'f22'] }],
      wires: [
        { from: 'D13', to: 'a10', color: 'orange' },
        { from: 'GND', to: 'a15', color: 'black' },
        { from: 'D2', to: 'a20', color: 'yellow' },
        { from: 'GND', to: 'a22', color: 'black' },
      ],
    },
    'fade-pwm': {
      title: 'A real fade: LED on the ~9 PWM pin', breadboard: 'half',
      parts: LED_D13,
      wires: [
        { from: 'D9', to: 'a10', color: 'green' },
        { from: 'GND', to: 'a15', color: 'black' },
      ],
    },
  }),
  circuit: 'reaction-timer',
  // build-step conditions (state.tasks.<id>), checked by the host; practice-task checks run on the host, not here
  tasks: [
    { id: 'smd-placed', check: st => groupIs(st, 'smd', isIn) },
    { id: 'smd-soldered', check: st => st.reflowT == null && groupIs(st, 'smd', isSold) },
    { id: 'low-in', check: st => groupIs(st, 'low', isIn) },
    { id: 'tall-in', check: st => groupIs(st, 'tall', isIn) },
    { id: 'tht-soldered', check: st => !st.solderQ && groupIs(st, 'low', isSold) && groupIs(st, 'tall', isSold) },
    { id: 'chip-in', check: st => !!(st.placed.ZU4 && st.placed.ZU4.orient === 0 && st.placed.SK1 && st.placed.SK1.sold) },
  ],
});
})();
