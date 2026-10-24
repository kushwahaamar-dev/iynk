import type { BenchMode, Check, FigurePart, PracticeTask, Quiz, RoboticsContent } from '@/content/schema';

// Robotics Bench Fig. 04: build an ESP32-S3-DevKitC-1 v1.1 (Espressif), bring up its RGB LED and Wi-Fi.
// The board figure is figures/boards/esp32-s3-devkitc-1.js (part ids, power sources uart/usb/pin5/pin3, rails
// VBUS/VBUSB/5V/VCC_3V3/3V3); this bench's modes, faults and state flags live in figures/robotics/esp32-s3-build.js.
// Facts: docs/facts/esp32-s3-devkitc-1.md. Fixed from the original Fig. 04 (docs/research/robotics-bench-a.md §6, §10):
// RGB LED on GPIO38 (v1.1), Micro-USB ports, SGM2212 LDO, BOOT = SW1 / RESET = SW2, the colour-wheel serial bug
// (always "hue 0 deg"), sketch timing that disagreed with the animation, esptool (not avrdude) uploads, a deep-sleep
// sketch that slept before its line left the UART, and every fault reachable from the UI.

const RGB = 38;

const BLINK = `// {{t:modes.blink.code.what}}
const uint8_t RGB_PIN = ${RGB};   // {{t:modes.blink.code.pin}}
uint32_t count = 0;

void setup() {
  Serial.begin(115200);
}

void loop() {
  rgbLedWrite(RGB_PIN, 64, 0, 0);   // {{t:modes.blink.code.red}}
  Serial.printf("blink #%lu\\n", (unsigned long)count);
  count++;
  delay(500);
  rgbLedWrite(RGB_PIN, 0, 0, 0);    // {{t:modes.blink.code.off}}
  delay(500);
}
`;

const RAINBOW = `// {{t:modes.rainbow.code.what}}
const uint8_t RGB_PIN = ${RGB};   // {{t:modes.rainbow.code.pin}}
const uint8_t LEVEL = 64;     // {{t:modes.rainbow.code.level}}
uint32_t nextPrint = 0;

// {{t:modes.rainbow.code.wheel}}
void hueToRgb(uint16_t hue, uint8_t &r, uint8_t &g, uint8_t &b) {
  uint8_t up = (hue % 60) * LEVEL / 60;
  uint8_t down = LEVEL - up;
  switch (hue / 60) {
    case 0: r = LEVEL; g = up; b = 0; break;
    case 1: r = down; g = LEVEL; b = 0; break;
    case 2: r = 0; g = LEVEL; b = up; break;
    case 3: r = 0; g = down; b = LEVEL; break;
    case 4: r = up; g = 0; b = LEVEL; break;
    default: r = LEVEL; g = 0; b = down; break;
  }
}

void setup() {
  Serial.begin(115200);
}

void loop() {
  uint32_t now = millis();
  uint16_t hue = (now % 4000) * 360 / 4000;   // {{t:modes.rainbow.code.turn}}
  uint8_t r, g, b;
  hueToRgb(hue, r, g, b);
  rgbLedWrite(RGB_PIN, r, g, b);
  if (now >= nextPrint) {                    // {{t:modes.rainbow.code.print}}
    nextPrint += 1000;
    Serial.printf("hue %u deg\\n", hue);
  }
  delay(10);
}
`;

const WIFI = `// {{t:modes.wifi.code.what}}
#include <WiFi.h>
#include <WebServer.h>

const char* SSID = "bench-lab";
const char* PASS = "robotics";   // {{t:modes.wifi.code.pass}}
const uint8_t RGB_PIN = ${RGB};

WebServer server(80);

void handleRoot() {
  server.send(200, "text/html",
    "<h1>Hello robot</h1><p><a href=\\"/on\\">LED ON</a> <a href=\\"/off\\">LED OFF</a></p>");
  Serial.println("GET / -> page sent");
}

void handleOn() {
  rgbLedWrite(RGB_PIN, 0, 64, 0);   // {{t:modes.wifi.code.green}}
  server.send(200, "text/plain", "LED on");
  Serial.println("GET /on -> LED on");
}

void handleOff() {
  rgbLedWrite(RGB_PIN, 0, 0, 0);
  server.send(200, "text/plain", "LED off");
  Serial.println("GET /off -> LED off");
}

void setup() {
  Serial.begin(115200);
  WiFi.mode(WIFI_STA);                      // {{t:modes.wifi.code.sta}}
  WiFi.begin(SSID, PASS);
  Serial.print("Connecting to bench-lab");
  while (WiFi.status() != WL_CONNECTED) {   // {{t:modes.wifi.code.wait}}
    rgbLedWrite(RGB_PIN, 0, 0, 64);
    delay(250);
    rgbLedWrite(RGB_PIN, 0, 0, 0);
    delay(250);
    Serial.print('.');
  }
  Serial.println();
  Serial.print("WiFi connected, IP ");
  Serial.println(WiFi.localIP());
  server.on("/", handleRoot);
  server.on("/on", handleOn);
  server.on("/off", handleOff);
  server.begin();
}

// {{t:modes.wifi.code.cores}}
void loop() {
  server.handleClient();
}
`;

const SLEEP = `// {{t:modes.deep-sleep.code.what}}
const uint8_t RGB_PIN = ${RGB};
RTC_DATA_ATTR uint32_t boots = 0;   // {{t:modes.deep-sleep.code.rtc}}

void setup() {
  Serial.begin(115200);
  boots++;
  rgbLedWrite(RGB_PIN, 0, 0, 32);   // {{t:modes.deep-sleep.code.awake}}
  delay(1000);
  rgbLedWrite(RGB_PIN, 0, 0, 0);    // {{t:modes.deep-sleep.code.dark}}
  Serial.printf("boot #%lu, sleeping 10 s\\n", (unsigned long)boots);
  Serial.flush();                   // {{t:modes.deep-sleep.code.flush}}
  esp_sleep_enable_timer_wakeup(10ULL * 1000000ULL);
  esp_deep_sleep_start();           // {{t:modes.deep-sleep.code.sleep}}
}

void loop() {}                      // {{t:modes.deep-sleep.code.never}}
`;

/** The ROM bootloader prints this on UART0 at every reset; the figure shows it, the interpreter does not. */
export const ROM_BANNER = 'ESP-ROM:esp32s3-20210327';

/** The address the interpreter's DHCP hands out on the bench-lab network (src/lib/interp/world.ts, default seed). */
export const BENCH_IP = '192.168.4.42';

const modes: BenchMode[] = [
  { id: 'blink', instant: false, language: 'arduino-cpp', code: { source: BLINK, libraries: [] }, bytes: 289680,
    serial: [ROM_BANNER, 'blink #0', 'blink #1', 'blink #2'], title: 'modes.blink.title' },
  { id: 'rainbow', instant: false, language: 'arduino-cpp', code: { source: RAINBOW, libraries: [] }, bytes: 290400,
    serial: [ROM_BANNER, 'hue 0 deg', 'hue 90 deg', 'hue 180 deg', 'hue 270 deg', 'hue 0 deg'], title: 'modes.rainbow.title' },
  { id: 'wifi', instant: false, language: 'arduino-cpp', code: { source: WIFI, libraries: ['WiFi', 'WebServer'] }, bytes: 852112,
    serial: [ROM_BANNER, 'Connecting to bench-lab...', `WiFi connected, IP ${BENCH_IP}`, 'GET / -> page sent', 'GET /on -> LED on', 'GET /off -> LED off'],
    title: 'modes.wifi.title' },
  { id: 'deep-sleep', instant: false, language: 'arduino-cpp', code: { source: SLEEP, libraries: [] }, bytes: 272240,
    serial: [ROM_BANNER, 'boot #1, sleeping 10 s', ROM_BANNER, 'boot #2, sleeping 10 s'], title: 'modes.deep-sleep.title' },
];

/* ---------- part texts: every part the board figure draws (ids = silkscreen designators) ---------- */
const part = (id: string, short: string, role: FigurePart['role']): FigurePart =>
  ({ id, short, role, name: `parts.${id}.name`, what: `parts.${id}.what` });

const parts: FigurePart[] = [
  part('U4', 'ESP32-S3 MODULE', 'mcu'), part('U3', 'USB-UART', 'usb-bridge'), part('U2', '3V3 LDO', 'regulator'),
  part('D6', 'RGB LED', 'led'), part('D5', 'POWER LED', 'led'), part('SW1', 'BOOT', 'button'), part('SW2', 'RESET', 'button'),
  part('J2', 'UART PORT', 'connector'), part('J4', 'USB PORT', 'connector'), part('J1', 'J1', 'header'), part('J3', 'J3', 'header'),
  part('Q1', 'Q1', 'other'), part('Q2', 'Q2', 'other'), part('D1', 'D1', 'protection'), part('D7', 'D7', 'protection'),
  part('D2', 'D2', 'protection'), part('D3', 'D3', 'protection'), part('D4', 'D4', 'protection'),
  part('D8', 'D8', 'protection'), part('D9', 'D9', 'protection'), part('D10', 'D10', 'protection'),
  ...['C1', 'C2', 'C3', 'C6', 'C7', 'C8', 'C9', 'C10', 'C11', 'C12', 'R5', 'R7', 'R8', 'R9', 'R10', 'R11', 'R12', 'R13', 'R16',
    'R17', 'R18', 'R19', 'R24'].map((id) => part(id, id, 'passive')),
];

/* ---------- practice tasks ---------- */
// Omit over a union keeps only the shared keys; distribute it so each check kind keeps its own fields
type OmitEach<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
const checks = (task: string, list: OmitEach<Check, 'label'>[]): Check[] =>
  list.map((c, i) => ({ ...c, label: `tasks.${task}.checks.${i + 1}` }) as Check);

const RGB_PIN_STARTER = `// {{t:tasks.rgb-pin.code.head}}
void setup() {
  Serial.begin(115200);
}

void loop() {
  rgbLedWrite(RGB_BUILTIN, 0, 64, 0);   // {{t:tasks.rgb-pin.code.builtin}}
  delay(500);
  rgbLedWrite(RGB_BUILTIN, 0, 0, 0);
  delay(500);
}
`;

const RGB_PIN_SOLUTION = `const uint8_t RGB_PIN = 38;   // v1.1: the RGB LED's data line is GPIO38 (v1.0: GPIO48)

void setup() {
  Serial.begin(115200);
}

void loop() {
  rgbLedWrite(RGB_PIN, 0, 64, 0);
  Serial.println("green");
  delay(500);
  rgbLedWrite(RGB_PIN, 0, 0, 0);
  Serial.println("off");
  delay(500);
}
`;

const WEB_STARTER = `// {{t:tasks.web-led.code.head}}
#include <WiFi.h>
#include <WebServer.h>

const uint8_t RGB_PIN = 38;
WebServer server(80);

void handleRoot() {
  server.send(200, "text/html", "<h1>Bench robot</h1>");
  Serial.println("GET / -> page sent");
}

// {{t:tasks.web-led.code.todo}}

void setup() {
  Serial.begin(115200);
  WiFi.mode(WIFI_STA);
  WiFi.begin("bench-lab", "robotics");
  while (WiFi.status() != WL_CONNECTED) delay(250);
  Serial.print("WiFi connected, IP ");
  Serial.println(WiFi.localIP());
  server.on("/", handleRoot);
  server.begin();
}

void loop() {
  server.handleClient();
}
`;

const WEB_SOLUTION = `#include <WiFi.h>
#include <WebServer.h>

const uint8_t RGB_PIN = 38;
WebServer server(80);
bool ledOn = false;

void handleRoot() {
  server.send(200, "text/html",
    "<h1>Bench robot</h1>"
    "<p><a href=\\"/on\\">LED ON</a> <a href=\\"/off\\">LED OFF</a> <a href=\\"/data\\">Readings</a></p>");
  Serial.println("GET / -> page sent");
}

void handleOn() {
  ledOn = true;
  rgbLedWrite(RGB_PIN, 0, 64, 0);
  server.send(200, "text/plain", "LED on");
  Serial.println("GET /on -> LED on");
}

void handleOff() {
  ledOn = false;
  rgbLedWrite(RGB_PIN, 0, 0, 0);
  server.send(200, "text/plain", "LED off");
  Serial.println("GET /off -> LED off");
}

void handleData() {
  long rssi = WiFi.RSSI();
  unsigned long up = millis() / 1000;
  char json[80];
  snprintf(json, 80, "{\\"rssi\\":%ld,\\"uptime_s\\":%lu,\\"led\\":%d}", rssi, up, ledOn ? 1 : 0);
  server.send(200, "application/json", json);
  Serial.printf("GET /data -> rssi %ld dBm, up %lu s\\n", rssi, up);
}

void setup() {
  Serial.begin(115200);
  WiFi.mode(WIFI_STA);
  WiFi.begin("bench-lab", "robotics");
  while (WiFi.status() != WL_CONNECTED) delay(250);
  Serial.print("WiFi connected, IP ");
  Serial.println(WiFi.localIP());
  server.on("/", handleRoot);
  server.on("/on", handleOn);
  server.on("/off", handleOff);
  server.on("/data", handleData);
  server.begin();
}

void loop() {
  server.handleClient();
}
`;

const SLEEP_STARTER = `// {{t:tasks.boot-counter.code.head}}
const uint8_t RGB_PIN = 38;
uint32_t boots = 0;   // {{t:tasks.boot-counter.code.ram}}

void setup() {
  Serial.begin(115200);
  boots++;
  rgbLedWrite(RGB_PIN, 0, 0, 32);
  Serial.printf("boot #%lu\\n", (unsigned long)boots);
  esp_sleep_enable_timer_wakeup(5ULL * 1000000ULL);
  esp_deep_sleep_start();
}

void loop() {}
`;

const SLEEP_SOLUTION = `const uint8_t RGB_PIN = 38;
RTC_DATA_ATTR uint32_t boots = 0;   // RTC memory keeps its value through deep sleep

void setup() {
  Serial.begin(115200);
  boots++;
  rgbLedWrite(RGB_PIN, 0, 0, 0);    // the LED latches its colour: switch it off before sleeping
  Serial.printf("boot #%lu\\n", (unsigned long)boots);
  Serial.flush();                   // let the line leave the UART before the chip sleeps
  esp_sleep_enable_timer_wakeup(5ULL * 1000000ULL);
  esp_deep_sleep_start();
}

void loop() {}
`;

const REACTION_STARTER = `// {{t:tasks.reaction.code.head}}
const uint8_t BTN = 0;        // {{t:tasks.reaction.code.btn}}
const uint8_t RGB_PIN = 38;

void setup() {
  Serial.begin(115200);
  pinMode(BTN, INPUT_PULLUP);
}

void loop() {
  // {{t:tasks.reaction.code.todo}}
}
`;

const REACTION_SOLUTION = `const uint8_t BTN = 0;        // BOOT button: GPIO0, reads LOW while pressed
const uint8_t RGB_PIN = 38;

volatile uint32_t pressedAt = 0;
volatile bool pressed = false;
uint32_t roundStart = 0;
uint32_t waitMs = 0;
uint32_t litAt = 0;
bool lit = false;

void IRAM_ATTR onPress() {
  uint32_t now = millis();
  if (now - pressedAt < 50) return;   // debounce: a press bounces for a few ms
  pressedAt = now;
  pressed = true;
}

void startRound() {
  rgbLedWrite(RGB_PIN, 0, 0, 0);
  roundStart = millis();
  waitMs = random(1000, 3000);
  lit = false;
  pressed = false;
}

void setup() {
  Serial.begin(115200);
  pinMode(BTN, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(BTN), onPress, FALLING);
  randomSeed(esp_random());
  startRound();
}

void loop() {
  uint32_t now = millis();
  if (!lit && now - roundStart >= waitMs) {
    rgbLedWrite(RGB_PIN, 0, 64, 0);
    litAt = now;
    lit = true;
  }
  if (pressed) {
    pressed = false;
    if (lit) Serial.printf("reaction %lu ms\\n", (unsigned long)(pressedAt - litAt));
    else Serial.println("too early");
    startRound();
  }
}
`;

const tasks: PracticeTask[] = [
  {
    id: 'rgb-pin', board: 'esp32-s3-devkitc-1', language: 'arduino-cpp',
    starter: { source: RGB_PIN_STARTER, libraries: [] }, solution: RGB_PIN_SOLUTION, circuit: null,
    world: { inputs: [], script: [] }, runMs: 3000,
    checks: checks('rgb-pin', [
      { kind: 'runs', minMs: 3000 },
      { kind: 'code', must: ['rgbLedWrite', '38'], mustNot: ['RGB_BUILTIN', 'LED_BUILTIN', 'neopixelWrite'] },
      { kind: 'serial', match: 'green', regex: false, minCount: 3, byMs: 3000 },
      { kind: 'serial', match: 'off', regex: false, minCount: 3, byMs: 3000 },
    ]),
    title: 'tasks.rgb-pin.title', brief: 'tasks.rgb-pin.brief', hints: ['tasks.rgb-pin.hints.1', 'tasks.rgb-pin.hints.2'],
  },
  {
    id: 'web-led', board: 'esp32-s3-devkitc-1', language: 'arduino-cpp',
    starter: { source: WEB_STARTER, libraries: ['WiFi', 'WebServer'] }, solution: WEB_SOLUTION, circuit: null,
    world: {
      inputs: [{
        id: 'phone', quantity: 'request',
        device: { kind: 'network', ssid: 'bench-lab', ip: '192.168.4.17', requests: ['GET /', 'GET /on', 'GET /data', 'GET /off'] },
        pins: [], part: 'U4', min: 0, max: 3, step: 1, default: 0, gesture: 'tap', label: 'tasks.web-led.world.phone',
      }],
      script: [
        { t: 3000, input: 'phone', value: 0 },
        { t: 4000, input: 'phone', value: 1 },
        { t: 5000, input: 'phone', value: 2 },
        { t: 6000, input: 'phone', value: 3 },
      ],
    },
    runMs: 7000,
    checks: checks('web-led', [
      { kind: 'serial', match: 'WiFi connected, IP', regex: false, minCount: 1, byMs: 3000 },
      { kind: 'serial', match: 'GET /on -> LED on', regex: false, minCount: 1, byMs: 4500 },
      { kind: 'serial', match: 'GET /data -> rssi -\\d+ dBm, up \\d+ s', regex: true, minCount: 1, byMs: 5500 },
      { kind: 'serial', match: 'GET /off -> LED off', regex: false, minCount: 1, byMs: 6500 },
      { kind: 'code', must: ['server.on("/on"', 'server.on("/off"', 'server.on("/data"', 'rgbLedWrite'], mustNot: [] },
    ]),
    title: 'tasks.web-led.title', brief: 'tasks.web-led.brief',
    hints: ['tasks.web-led.hints.1', 'tasks.web-led.hints.2', 'tasks.web-led.hints.3'],
  },
  {
    id: 'boot-counter', board: 'esp32-s3-devkitc-1', language: 'arduino-cpp',
    starter: { source: SLEEP_STARTER, libraries: [] }, solution: SLEEP_SOLUTION, circuit: null,
    world: { inputs: [], script: [] }, runMs: 12000,
    checks: checks('boot-counter', [
      { kind: 'serial', match: 'boot #1', regex: false, minCount: 1, byMs: 1000 },
      { kind: 'serial', match: 'boot #2', regex: false, minCount: 1, byMs: 6000 },
      { kind: 'serial', match: 'boot #3', regex: false, minCount: 1, byMs: 11000 },
      { kind: 'code', must: ['RTC_DATA_ATTR', 'Serial.flush()', 'esp_deep_sleep_start()'], mustNot: [] },
    ]),
    title: 'tasks.boot-counter.title', brief: 'tasks.boot-counter.brief',
    hints: ['tasks.boot-counter.hints.1', 'tasks.boot-counter.hints.2'],
  },
  {
    id: 'reaction', board: 'esp32-s3-devkitc-1', language: 'arduino-cpp',
    starter: { source: REACTION_STARTER, libraries: [] }, solution: REACTION_SOLUTION, circuit: null,
    world: {
      inputs: [{
        id: 'boot', quantity: 'button', device: { kind: 'button', pull: 'internal-up', bounceMs: 8 },
        pins: ['GPIO0'], part: 'SW1', min: 0, max: 1, step: 1, default: 0, gesture: 'press', label: 'tasks.reaction.world.boot',
      }],
      script: [
        { t: 4000, input: 'boot', value: 1 },
        { t: 4200, input: 'boot', value: 0 },
        { t: 9500, input: 'boot', value: 1 },
        { t: 9650, input: 'boot', value: 0 },
      ],
    },
    runMs: 10000,
    checks: checks('reaction', [
      { kind: 'serial', match: '^reaction \\d+ ms', regex: true, minCount: 1, byMs: 4500 },
      { kind: 'serial', match: '^reaction \\d+ ms', regex: true, minCount: 2, byMs: 10000 },
      { kind: 'code', must: ['attachInterrupt', 'millis()'], mustNot: ['delay('] },
    ]),
    title: 'tasks.reaction.title', brief: 'tasks.reaction.brief',
    hints: ['tasks.reaction.hints.1', 'tasks.reaction.hints.2', 'tasks.reaction.hints.3'],
  },
];

/* ---------- quizzes: one after each major step, then the end quiz ---------- */
const quiz = (id: string, afterStep: string | null, answers: number[]): Quiz => ({
  id, afterStep,
  questions: answers.map((answer, i) => {
    const q = `quizzes.${id}.q${i + 1}`;
    return { id: `q${i + 1}`, q: `${q}.q`, options: [1, 2, 3].map((n) => `${q}.options.${n}`), answer, why: `${q}.why` };
  }),
});

const quizzes: Quiz[] = [
  quiz('smd', 'reflow', [1, 0]),
  quiz('headers', 'solder', [2, 1]),
  quiz('upload', 'upload-rainbow', [0, 2]),
  quiz('wifi', 'upload-wifi', [1, 0]),
  quiz('sleep', 'upload-sleep', [1, 2]),
  quiz('final', null, [0, 1, 2]),
];

const step = (id: string) => ({ title: `steps.${id}.title`, body: `steps.${id}.body` });

const bench = {
  lab: 'robotics',
  id: 'esp32-s3-build',
  fig: 4,
  board: 'esp32-s3-devkitc-1',
  modules: [],
  parts: [],
  figure: { page: '/figures/robotics/esp32-s3-build.html', parts, sheets: ['board', 'power'] },
  power: { source: 'uart', label: 'power.label', ok: 'power.ok' },
  modes,
  defaultMode: 'blink',
  steps: [
    // the figure mounts powered: every action that works on the board unplugs first (the bridge applies power before build)
    { id: 'strip', kind: 'build', action: { type: 'set', state: { power: null, build: 'bare' } }, done: { build: 'bare' }, major: false,
      ...step('strip'), refusal: 'steps.strip.refusal' },
    { id: 'pick-place', kind: 'build', action: { type: 'press', id: 'pnp' }, done: { build: 'smd' }, major: false,
      ...step('pick-place'), refusal: 'steps.pick-place.refusal' },
    { id: 'reflow', kind: 'build', action: null, done: { build: 'reflowed' }, major: true, ...step('reflow') },
    { id: 'headers', kind: 'build', action: { type: 'press', id: 'place', choice: 'j1' }, done: { build: 'tht' }, major: false,
      ...step('headers'), refusal: 'steps.headers.refusal' },
    { id: 'solder', kind: 'build', action: { type: 'press', id: 'solder' }, done: { build: 'assembled' }, major: true,
      ...step('solder'), refusal: 'steps.solder.refusal' },
    { id: 'plug', kind: 'test', action: { type: 'set', state: { power: 'uart' } }, done: { power: 'uart', status: 'running' }, major: false,
      ...step('plug') },
    { id: 'upload-rainbow', kind: 'build', action: { type: 'press', id: 'upload', choice: 'rainbow' },
      done: { mode: 'rainbow', status: 'running' }, major: true, ...step('upload-rainbow'), refusal: 'steps.upload-rainbow.refusal' },
    { id: 'break-r17', kind: 'break', action: { type: 'set', state: { fault: 'missing:R17' } }, fault: 'no-r17',
      done: { status: 'running', 'leds.D6': 1 }, major: false, ...step('break-r17') },
    { id: 'break-cold', kind: 'break', action: { type: 'set', state: { fault: 'cold:J2' } }, fault: 'cold-j2',
      done: { status: 'running' }, major: false, ...step('break-cold') },
    { id: 'break-reverse', kind: 'break', action: { type: 'set', state: { power: 'pin5', fault: 'reverse-polarity:pin5' } },
      fault: 'reverse-5v', done: { power: 'uart', status: 'running' }, major: false, ...step('break-reverse') },
    { id: 'break-3v3', kind: 'break', action: { type: 'set', state: { power: 'pin3', fault: 'wrong-voltage:pin3:5' } },
      fault: 'five-volts-3v3', done: { power: 'uart', status: 'running' }, major: false, ...step('break-3v3') },
    { id: 'upload-wifi', kind: 'build', action: { type: 'press', id: 'upload', choice: 'wifi' },
      done: { mode: 'wifi', 'tasks.wifi': true }, major: true, ...step('upload-wifi'), refusal: 'steps.upload-wifi.refusal' },
    { id: 'break-brownout', kind: 'break', action: { type: 'set', state: { fault: 'brownout' } }, fault: 'brownout',
      done: { status: 'running' }, major: false, ...step('break-brownout') },
    { id: 'upload-sleep', kind: 'build', action: { type: 'press', id: 'upload', choice: 'deep-sleep' },
      done: { mode: 'deep-sleep', 'tasks.asleep': true }, major: true, ...step('upload-sleep'), refusal: 'steps.upload-sleep.refusal' },
    { id: 'break-strap', kind: 'break', action: { type: 'set', state: { fault: 'strap:GPIO0' } }, fault: 'strap-gpio0',
      done: { status: 'running' }, major: false, ...step('break-strap') },
    { id: 'download-mode', kind: 'test', action: null, done: { boot: 'download' }, major: false, ...step('download-mode') },
    { id: 'exploded', kind: 'test', action: { type: 'set', state: { power: null, exploded: true } }, done: { exploded: true }, major: false,
      ...step('exploded'), refusal: 'steps.exploded.refusal' },
  ],
  faults: [
    { id: 'no-r17', kind: 'missing-part', trigger: { by: 'remove-part', part: 'R17' },
      figure: { type: 'set', state: { fault: 'missing:R17' } },
      effect: { power: 'on', halts: false, serial: ['hue 0 deg', 'hue 90 deg'] },
      title: 'faults.no-r17.title', symptom: 'faults.no-r17.symptom', explanation: 'faults.no-r17.explanation', fix: 'faults.no-r17.fix' },
    { id: 'cold-j2', kind: 'cold-solder', trigger: { by: 'cold-joint', part: 'J2' },
      figure: { type: 'set', state: { fault: 'cold:J2' } },
      effect: { power: 'resetting', halts: true, serial: [ROM_BANNER, 'hue 0 deg', ROM_BANNER] },
      title: 'faults.cold-j2.title', symptom: 'faults.cold-j2.symptom', explanation: 'faults.cold-j2.explanation', fix: 'faults.cold-j2.fix' },
    { id: 'reverse-5v', kind: 'reverse-polarity', trigger: { by: 'reverse', input: 'pin5' },
      figure: { type: 'set', state: { power: 'pin5', fault: 'reverse-polarity:pin5' } },
      effect: { power: 'off', halts: true, damages: ['U2'] },
      title: 'faults.reverse-5v.title', symptom: 'faults.reverse-5v.symptom', explanation: 'faults.reverse-5v.explanation', fix: 'faults.reverse-5v.fix' },
    { id: 'five-volts-3v3', kind: 'wrong-voltage', trigger: { by: 'power-input', input: 'pin3', volts: 5 },
      figure: { type: 'set', state: { power: 'pin3', fault: 'wrong-voltage:pin3:5' } },
      effect: { power: 'off', halts: true, damages: ['U4'] },
      title: 'faults.five-volts-3v3.title', symptom: 'faults.five-volts-3v3.symptom', explanation: 'faults.five-volts-3v3.explanation',
      fix: 'faults.five-volts-3v3.fix' },
    { id: 'brownout', kind: 'brownout', trigger: { by: 'load', rail: '3V3', ma: 355 },
      figure: { type: 'set', state: { fault: 'brownout' } },
      effect: { power: 'resetting', halts: true, serial: ['Brownout detector was triggered', ROM_BANNER, 'Connecting to bench-lab...'] },
      title: 'faults.brownout.title', symptom: 'faults.brownout.symptom', explanation: 'faults.brownout.explanation', fix: 'faults.brownout.fix' },
    { id: 'strap-gpio0', kind: 'boot-strap', trigger: { by: 'wiring', part: 'push-button', from: 'GPIO0', to: 'GND' },
      figure: { type: 'set', state: { fault: 'strap:GPIO0' } },
      effect: { power: 'on', halts: true, serial: ['rst:0x1 (POWERON),boot:0x0 (DOWNLOAD(USB/UART0))', 'waiting for download'] },
      title: 'faults.strap-gpio0.title', symptom: 'faults.strap-gpio0.symptom', explanation: 'faults.strap-gpio0.explanation',
      fix: 'faults.strap-gpio0.fix' },
  ],
  status: [
    { id: 'status', key: 'status', format: 'running', label: 'status.status' },
    { id: 'power', key: 'power', format: 'on-off', label: 'status.power' },
    { id: 'rail-5v', key: 'rails.5V', format: 'volts', label: 'status.rail-5v' },
    { id: 'rail-3v3', key: 'rails.3V3', format: 'volts', label: 'status.rail-3v3' },
    // the label key equals the state path on purpose: both name the same LED
    { id: 'power-led', key: 'leds.D5', format: 'on-off', label: 'leds.D5' },
    { id: 'rgb', key: 'leds.D6', format: 'on-off', label: 'leds.D6' },
    { id: 'wifi', key: 'tasks.wifi', format: 'on-off', label: 'tasks.wifi' },
    { id: 'boot', key: 'boot', format: 'text', label: 'status.boot' },
    { id: 'mode', key: 'mode', format: 'text', label: 'status.mode' },
    { id: 'current', key: 'currentMa', format: 'ma', label: 'status.current' },
  ],
  current: {
    supplies: [{ id: 'usb', volts: 5, limitMa: 500, label: 'current.usb' }],
    loads: [
      { id: 'board', supply: 'usb', ma: 10, when: { power: 'uart' }, label: 'current.board' },
      { id: 'cpu', supply: 'usb', ma: 60, when: { 'tasks.awake': true }, label: 'current.cpu' },
      { id: 'joining', supply: 'usb', ma: 60, when: { 'tasks.joining': true }, label: 'current.joining' },
      { id: 'wifi', supply: 'usb', ma: 30, when: { 'tasks.wifi': true }, label: 'current.wifi' },
      { id: 'rgb', supply: 'usb', ma: 5, when: { 'leds.D6': 1 }, label: 'current.rgb' },
      { id: 'flash', supply: 'usb', ma: 40, when: { status: 'uploading' }, label: 'current.flash' },
      { id: 'sleep', supply: 'usb', ma: 0.008, when: { 'tasks.asleep': true }, label: 'current.sleep' },
    ],
  },
  tasks,
  quizzes,
  sources: [
    { title: 'Espressif: ESP32-S3-DevKitC-1 v1.1 user guide', url: 'https://docs.espressif.com/projects/esp-dev-kits/en/latest/esp32s3/esp32-s3-devkitc-1/user_guide_v1.1.html' },
    { title: 'Espressif: ESP32-S3-DevKitC-1 v1.1 schematic (SCH_ESP32-S3-DevKitC-1_V1.1_20221130)', url: 'https://dl.espressif.com/dl/schematics/SCH_ESP32-S3-DevKitC-1_V1.1_20221130.pdf' },
    { title: 'Espressif: ESP32-S3-DevKitC-1 reference design (PCB, BOM)', url: 'https://dl.espressif.com/dl/schematics/ESP32-S3-DevKitC-1_Reference_Design.zip' },
    { title: 'Espressif: ESP32-S3 Series Datasheet v2.2 (current consumption, strapping pins)', url: 'https://documentation.espressif.com/esp32-s3_datasheet_en.pdf' },
    { title: 'Espressif: ESP32-S3-WROOM-1 / WROOM-1U datasheet', url: 'https://www.espressif.com/sites/default/files/documentation/esp32-s3-wroom-1_wroom-1u_datasheet_en.pdf' },
    { title: 'SG Micro: SGM2212 800 mA LDO datasheet (ground current, dropout, current limit)', url: 'https://www.sg-micro.com/product/SGM2212' },
    { title: 'Silicon Labs: CP2102N datasheet', url: 'https://www.silabs.com/documents/public/data-sheets/cp2102n-datasheet.pdf' },
    { title: 'espressif/arduino-esp32 3.3: RGB LED, LEDC, deep sleep and WebServer APIs', url: 'https://docs.espressif.com/projects/arduino-esp32/en/latest/' },
    { title: 'esptool documentation: boot mode selection and troubleshooting', url: 'https://docs.espressif.com/projects/esptool/en/latest/esp32s3/' },
  ],
  title: 'title',
  sub: 'sub',
  hint: 'hint',
  overview: 'overview',
} satisfies RoboticsContent;

export default bench;
