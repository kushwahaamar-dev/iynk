// @cf title Build an ESP32-S3-DevKitC-1
// @cf use engine/bench.list
// @cf use boards/esp32-s3-devkitc-1.js
/* Robotics Bench Fig. 04: build an Espressif ESP32-S3-DevKitC-1 v1.1 and bring up its RGB LED and Wi-Fi.
   The board (parts, power tree, controls, see-through) is figures/boards/esp32-s3-devkitc-1.js; this file adds the
   bench's own programs, which match the sketches in src/content/robotics/esp32-s3-build.ts line for line:
   - blink:      rgbLedWrite(38, 64, 0, 0) for 500 ms, off for 500 ms, "blink #n" once a second (the program in flash)
   - rainbow:    hue = (millis() % 4000) * 360 / 4000, printed once a second: hue 0, 90, 180, 270 deg (the original
                 printed "hue 0 deg" every time, and its sketch took 2.56 s per turn while the animation took 4 s)
   - wifi:       joins bench-lab (blue blink, the interpreter's DHCP answers after 1.2 s, the 500 ms poll sees it at
                 1.5 s), then a phone on the network loads / and alternates /on and /off every 3 s
   - deep-sleep: awake 1 s (dim blue), "boot #n, sleeping 10 s", Serial.flush(), 10 s asleep: an 11 s cycle
   Every program sits dark in ROM download mode (BOOT held at reset, or GPIO0 strapped low), as the real chip does.
   State flags for the host's status panel and current model come back in state.tasks: awake, joining, wifi, asleep. */
(() => {
const B = SL.bench;
const NET = 'GPIO38';
const ROM = 'ESP-ROM:esp32s3-20210327';
const IP = '192.168.4.42';

const hexOf = (r, g, b) => '#' + [r, g, b].map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
// the sketch's six-sector wheel at full scale (the LED draws its colour at full saturation; brightness is the level)
const wheel = hue => {
  const up = (hue % 60) / 60 * 255, down = 255 - up;
  return [[255, up, 0], [down, 255, 0], [0, 255, up], [0, down, 255], [up, 0, 255], [255, 0, down]][Math.floor(hue / 60) % 6];
};
const rgb = col => col ? { [NET]: .6, [NET + '.rgb']: col } : { [NET]: 0 };
const download = st => st.boot === 'download' || st.faults.includes('strap:GPIO0');
// in download mode the ROM reports the boot mode and waits; the sketch never starts
const romLine = k => k === 0 ? 'rst:0x1 (POWERON),boot:0x0 (DOWNLOAD(USB/UART0))' : k === 1 ? 'waiting for download' : null;
const running = st => st.ev.status === 'running' && !st.up && !st.ext && !download(st);

const JOINED = 1.5, FIRST_TAP = 6, TAP_EVERY = 3, WAKE = 11;
const phoneOn = t => t >= FIRST_TAP && Math.floor((t - FIRST_TAP) / TAP_EVERY) % 2 === 0;

const modes = {
  blink: { title: 'Blink RGB', bytes: 289680, uploadS: 4, banner: ROM,
    powerMsg: '3.3 V is up: the red power LED lights and Blink RGB starts',
    out: (st, t) => download(st) ? {} : rgb(t % 1 < .5 ? '#ff2a1f' : null),
    serial: (k, st) => download(st) ? romLine(k) : 'blink #' + k },
  rainbow: { title: 'RGB colour wheel', bytes: 290400, uploadS: 4, banner: ROM,
    powerMsg: '3.3 V is up: the RGB LED turns round the colour wheel',
    out: (st, t) => download(st) ? {} : rgb(hexOf(...wheel(Math.floor((t % 4) / 4 * 360)))),
    serial: (k, st) => download(st) ? romLine(k) : 'hue ' + (k * 90) % 360 + ' deg' },
  wifi: { title: 'Wi-Fi web server', bytes: 852112, uploadS: 7, banner: ROM,
    powerMsg: '3.3 V is up: the board joins bench-lab',
    out: (st, t) => download(st) ? {} : rgb(t < JOINED ? (t % .5 < .25 ? '#2f6dff' : null) : phoneOn(t) ? '#2fd34f' : null),
    serial: (k, st) => {
      if (download(st)) return romLine(k);
      if (k === 1) return 'Connecting to bench-lab...';
      if (k === 2) return 'WiFi connected, IP ' + IP;
      if (k === 3) return 'GET / -> page sent';
      if (k >= FIRST_TAP && (k - FIRST_TAP) % TAP_EVERY === 0) return phoneOn(k) ? 'GET /on -> LED on' : 'GET /off -> LED off';
      return null;
    } },
  'deep-sleep': { title: 'Deep sleep', bytes: 272240, uploadS: 4, banner: ROM,
    powerMsg: '3.3 V is up: the chip wakes, counts the boot and sleeps',
    out: (st, t) => download(st) ? {} : rgb(t % WAKE < 1 ? '#3b5bff' : null),
    serial: (k, st) => {
      if (download(st)) return romLine(k);
      if (k % WAKE === 1) return 'boot #' + (Math.floor(k / WAKE) + 1) + ', sleeping 10 s';
      return k > 0 && k % WAKE === 0 ? ROM : null;
    } },
};

B.bench({
  id: 'esp32-s3-build', fig: '04', name: 'Build an ESP32-S3-DevKitC-1',
  sub: 'Reflow the SMD parts, fit the headers, upload over the UART port, then Wi-Fi',
  board: 'esp32-s3-devkitc-1', pal: 'blush',
  // the bench builds the board itself: no breadboard circuit, the board view first
  view: 'board', circuits: {}, circuit: null,
  modes, mode: 'blink',
  faults: ['missing:R17', 'cold:J2', 'reverse-polarity:pin5', 'wrong-voltage:pin3:5', 'brownout', 'strap:GPIO0'],
  tasks: [
    { id: 'awake', title: 'ESP32-S3 awake', check: st => running(st) && !(st.mode === 'deep-sleep' && st.t % WAKE >= 1) },
    { id: 'joining', title: 'Wi-Fi joining', check: st => running(st) && st.mode === 'wifi' && st.t < JOINED },
    { id: 'wifi', title: 'Wi-Fi connected', check: st => running(st) && st.mode === 'wifi' && st.t >= JOINED },
    { id: 'asleep', title: 'ESP32-S3 in deep sleep', check: st => running(st) && st.mode === 'deep-sleep' && st.t % WAKE >= 1 },
  ],
});
})();
