import { describe, expect, it } from 'vitest';
import { createRun, check } from '../run';
import type { BoardId } from '../profiles';

function boot(source: string, board: BoardId = 'uno-r3', extra: Partial<Parameters<typeof createRun>[0]> = {}) {
  const run = createRun({ board, source, ...extra });
  let serial = '';
  const errors: string[] = [];
  const warns: string[] = [];
  run.on('serial', (t) => (serial += t));
  run.on('error', (e) => errors.push(e.format()));
  run.on('warn', (w) => warns.push(w));
  run.start();
  return { run, out: () => serial.replace(/\r\n/g, '\n'), errors, warns };
}

/** Step in 16 ms frames like the UI does. */
function advance(run: ReturnType<typeof createRun>, ms: number) {
  for (let t = 0; t < ms; t += 16) run.step(Math.min(16, ms - t));
}

const BLINK = `void setup() { pinMode(LED_BUILTIN, OUTPUT); }
void loop() {
  digitalWrite(LED_BUILTIN, HIGH);
  delay(1000);
  digitalWrite(LED_BUILTIN, LOW);
  delay(1000);
}`;

describe('Arduino C++ golden programs', () => {
  it('Blink toggles pin 13 every second', () => {
    const { run } = boot(BLINK);
    advance(run, 4100);
    const edges = run.world.trace.filter((e) => e[1] === 13);
    expect(edges.map((e) => [Math.round(e[0] / 1000), e[2]])).toEqual([[0, 1], [1000, 0], [2000, 1], [3000, 0], [4000, 1]]);
    expect(run.snapshot().leds.L).toBe(1);
  });

  it('button toggle with debounce', () => {
    const src = `const int BUTTON = 2;
const int LED = 13;
int last = LOW;
bool lit = false;
void setup() { pinMode(BUTTON, INPUT); pinMode(LED, OUTPUT); }
void loop() {
  int now = digitalRead(BUTTON);
  if (now == HIGH && last == LOW) {
    lit = !lit;
    digitalWrite(LED, lit);
    delay(30);  // debounce
  }
  last = now;
}`;
    const { run } = boot(src);
    run.input(2, 0);
    advance(run, 50);
    expect(run.snapshot().pins[13].level).toBe(0);
    run.input(2, 1);
    advance(run, 100);
    expect(run.snapshot().pins[13].level).toBe(1);
    run.input(2, 0);
    advance(run, 100);
    expect(run.snapshot().pins[13].level).toBe(1);
    run.input(2, 1);
    advance(run, 100);
    expect(run.snapshot().pins[13].level).toBe(0);
  });

  it('knob: analogRead to analogWrite with map()', () => {
    const src = `void setup() { Serial.begin(9600); pinMode(9, OUTPUT); }
void loop() {
  int raw = analogRead(A0);
  int level = map(raw, 0, 1023, 0, 255);
  analogWrite(9, level);
  Serial.println(raw);
  delay(300);
}`;
    const { run, out } = boot(src);
    run.analog('A0', 2.5);
    advance(run, 350);
    expect(out().split('\n')[0]).toBe('512');
    expect(run.snapshot().pins[9].duty).toBeCloseTo(127 / 255, 3);
  });

  it('TMP36 float math prints like a real Uno', () => {
    const src = `const int SENSOR = A0;
void setup() { Serial.begin(9600); }
void loop() {
  int raw = analogRead(SENSOR);
  float volts = raw * 5.0 / 1023.0;
  float celsius = (volts - 0.5) * 100.0;
  Serial.print(celsius);
  Serial.println(" C");
  delay(1000);
}`;
    const { run, out } = boot(src);
    run.analog('A0', 0.75); // 25 °C
    advance(run, 100);
    // 0.75 V -> raw 153 -> 0.7478 V -> 24.78 C
    expect(out().trim()).toBe('24.78 C');
  });

  it('servo sweep with Servo.h', () => {
    const src = `#include <Servo.h>
Servo horn;
void setup() { horn.attach(9); }
void loop() {
  for (int a = 0; a <= 180; a += 10) { horn.write(a); delay(15); }
  for (int a = 180; a >= 0; a -= 10) { horn.write(a); delay(15); }
}`;
    const { run } = boot(src);
    advance(run, 15 * 19 - 5);
    expect(run.snapshot().pins[9].servoUs).toBe(2400);
    advance(run, 15 * 19);
    expect(run.snapshot().pins[9].servoUs).toBe(544);
  });

  it('reaction timer: attachInterrupt preempts loop and millis() measures', () => {
    const src = `const int BUTTON = 2;
volatile unsigned long pressedAt = 0;
volatile bool pressed = false;
unsigned long litAt = 0;
void onPress() {
  if (!pressed) { pressedAt = millis(); pressed = true; }
}
void setup() {
  Serial.begin(9600);
  pinMode(13, OUTPUT);
  pinMode(BUTTON, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(BUTTON), onPress, FALLING);
  delay(500);
  digitalWrite(13, HIGH);
  litAt = millis();
}
void loop() {
  if (pressed) {
    Serial.print("reaction: ");
    Serial.print(pressedAt - litAt);
    Serial.println(" ms");
    pressed = false;
    while (true) {}
  }
}`;
    const { run, out } = boot(src);
    advance(run, 500 + 237);
    run.input(2, 0);
    advance(run, 50);
    expect(out()).toMatch(/reaction: 23[67] ms/);
    // The endless while(true) keeps virtual time moving instead of freezing.
    const before = run.status.t;
    advance(run, 1000);
    expect(run.status.t - before).toBeGreaterThan(990);
  });

  it('16-bit int overflow on AVR, 32-bit on ESP32', () => {
    const src = `void setup() { Serial.begin(9600); int a = 300; int b = 200; long c = a * b; Serial.println(c); int x = 32767; x++; Serial.println(x); Serial.println(-1, HEX); }
void loop() {}`;
    const avr = boot(src);
    avr.run.step(10);
    expect(avr.out()).toBe('-5536\n-32768\nFFFFFFFF\n');
    const esp = boot(src.replace('Serial.begin(9600)', 'Serial.begin(115200)'), 'esp32-devkitc');
    esp.run.step(10);
    expect(esp.out()).toBe('60000\n32768\nFFFFFFFF\n');
  });

  it('HC-SR04: pulseIn measures 1458 µs at 25 cm', () => {
    const src = `const int TRIG = 9, ECHO = 10;
void setup() { Serial.begin(9600); pinMode(TRIG, OUTPUT); pinMode(ECHO, INPUT); }
void loop() {
  digitalWrite(TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG, LOW);
  long us = pulseIn(ECHO, HIGH, 30000);
  float cm = us * 0.0343 / 2;
  Serial.println(us);
  Serial.println(cm);
  delay(60);
}`;
    const run = createRun({ board: 'uno-r3', source: src });
    const sonar = run.attachUltrasonic(9, 10);
    sonar.distanceCm = 25;
    let out = '';
    run.on('serial', (t) => (out += t));
    run.start();
    advance(run, 50);
    expect(out.split('\r\n').slice(0, 2)).toEqual(['1458', '25.00']);
  });

  it('analogWrite on pin 13 (no PWM) thresholds at 128 and warns', () => {
    const { run, warns } = boot(`void setup() { pinMode(13, OUTPUT); analogWrite(13, 127); delay(5); analogWrite(13, 128); }
void loop() {}`);
    run.step(2);
    expect(run.snapshot().pins[13].level).toBe(0);
    run.step(10);
    expect(run.snapshot().pins[13].level).toBe(1);
    expect(warns.join()).toMatch(/no PWM/);
  });

  it('friendly compile errors with line and column', () => {
    const d1 = check({ board: 'uno-r3', source: 'void setup() {\n  int x = 3\n  pinMode(13, OUTPUT);\n}\nvoid loop() {}' });
    expect(d1[0]).toMatchObject({ kind: 'syntax', line: 2, col: 12 });
    expect(d1[0].message).toMatch(/expected ';'/);
    const d2 = check({ board: 'uno-r3', source: 'void setup() { pinMode(ledPin, OUTPUT); }\nvoid loop() {}' });
    expect(d2[0]).toMatchObject({ kind: 'compile', line: 1, col: 24 });
    expect(d2[0].message).toBe("'ledPin' was not declared");
    const d3 = check({ board: 'uno-r3', source: 'void setup() { pinmode(13, OUTPUT); }\nvoid loop() {}' });
    expect(d3[0].hint).toBe('did you mean pinMode()?');
    const d4 = check({ board: 'esp32-devkitc', source: 'void setup() { pinMode(LED_BUILTIN, OUTPUT); }\nvoid loop() {}' });
    expect(d4[0].message).toMatch(/no user LED/);
    const d5 = check({ board: 'uno-r3', source: 'Servo s;\nvoid setup() {}\nvoid loop() {}' });
    expect(d5[0].message).toMatch(/Servo/);
  });

  it('runtime error: array index out of range', () => {
    const { run, errors } = boot(`int pins[3] = {9, 10, 11};
void setup() { for (int i = 0; i <= 3; i++) pinMode(pins[i], OUTPUT); }
void loop() {}`);
    run.step(5);
    expect(errors[0]).toMatch(/2:\d+ runtime error: index 3 is outside pins/);
    expect(run.status.state).toBe('error');
  });

  it('ESP32-S3 rgbLedWrite drives the WS2812 on GPIO38', () => {
    const { run } = boot(`void setup() { rgbLedWrite(RGB_BUILTIN, 255, 0, 64); }
void loop() {}`, 'esp32-s3-devkitc-1');
    run.step(5);
    expect(run.snapshot().pixels[38]).toEqual([[255, 0, 64]]);
    expect(run.snapshot().leds.RGB).toBe(1);
  });

  it('NeoPixel ColorHSV and millis-based blink without delay', () => {
    const { run } = boot(`#include <Adafruit_NeoPixel.h>
Adafruit_NeoPixel px(1, 38, NEO_GRB);
unsigned long last = 0;
bool on = false;
void setup() { px.begin(); pinMode(4, OUTPUT); px.setPixelColor(0, px.ColorHSV(21845)); px.show(); }
void loop() {
  if (millis() - last >= 200) { last = millis(); on = !on; digitalWrite(4, on); }
}`, 'esp32-s3-devkitc-1');
    advance(run, 1010);
    expect(run.snapshot().pixels[38][0]).toEqual([0, 255, 0]);
    // The first entry can be the floating input settling LOW when pinMode() makes it an output.
    const edges = run.world.trace.filter((e) => e[1] === 4 && e[0] > 1000).map((e) => Math.round(e[0] / 1000));
    expect(edges).toEqual([200, 400, 600, 800, 1000]);
  });

  it('AccelStepper runToPosition, random() and String concatenation', () => {
    const { run, out } = boot(`#include <AccelStepper.h>
AccelStepper wheel(AccelStepper::FULL4WIRE, 8, 10, 9, 11);
void setup() {
  Serial.begin(9600);
  wheel.setMaxSpeed(800);
  wheel.setAcceleration(1200);
  wheel.move(256);
  wheel.runToPosition();
  Serial.println(String("at ") + wheel.currentPosition() + " after " + (millis() > 400 ? "ramp" : "jump"));
  Serial.println(random(100));
}
void loop() {}`);
    advance(run, 2000);
    expect(out().split('\n')[0]).toBe('at 256 after ramp');
    expect(out().split('\n')[1]).toBe('7');
  });

  it('ESP32 Wi-Fi web server answers a request', async () => {
    const { run, out } = boot(`#include <WiFi.h>
#include <WebServer.h>
WebServer server(80);
void setup() {
  Serial.begin(115200);
  WiFi.begin("bench-lab", "robotics");
  while (WiFi.status() != WL_CONNECTED) delay(250);
  Serial.println(WiFi.localIP());
  server.on("/", [] { server.send(200, "text/html", "<h1>Hello robot</h1>"); });
  server.begin();
}
void loop() { server.handleClient(); }`, 'esp32-devkitc');
    advance(run, 1600);
    expect(out()).toMatch(/^192\.168\.4\.\d+\n$/);
    const res = run.request('GET', '/');
    advance(run, 20);
    await expect(res).resolves.toEqual({ status: 200, type: 'text/html', body: '<h1>Hello robot</h1>' });
  });

  it('MPU-6050 over raw Wire reads 1 g on Z after waking it', () => {
    const { run, out } = boot(`#include <Wire.h>
void setup() {
  Serial.begin(9600);
  Wire.begin();
  Wire.beginTransmission(0x68); Wire.write(0x6B); Wire.write(0); Wire.endTransmission(true);
  Wire.beginTransmission(0x68); Wire.write(0x3F); Wire.endTransmission(false);
  Wire.requestFrom(0x68, 2, true);
  int16_t az = Wire.read() << 8 | Wire.read();
  Serial.println(az);
  Wire.beginTransmission(0x3C);
  Serial.println(Wire.endTransmission());
}
void loop() {}`, 'uno-r3', { devices: ['mpu6050'] });
    run.step(5);
    expect(out()).toBe('16384\n2\n');
  });

  it('a busy loop hits the per-frame budget instead of freezing the tab', () => {
    const run = createRun({ board: 'esp32-devkitc', source: 'unsigned long n = 0;\nvoid setup() {}\nvoid loop() { n++; }', budget: 10_000 });
    run.start();
    run.step(16);
    expect(run.status.throttled).toBe(true);
    expect(run.status.t).toBeLessThan(16);
  });

  it('pin snapshots reach the figure at most 30 times a second', () => {
    const run = createRun({ board: 'uno-r3', source: BLINK.replace(/1000/g, '10') });
    let snaps = 0;
    run.on('pins', () => snaps++);
    run.start();
    snaps = 0;
    advance(run, 1000);
    expect(snaps).toBeGreaterThan(20);
    expect(snaps).toBeLessThanOrEqual(30);
  });

  it('brown-out resets the board and setup() runs again', () => {
    const { run, out } = boot(`void setup() { Serial.begin(9600); Serial.println("boot"); }
void loop() {}`);
    run.step(10);
    run.setSupply(2.0);
    expect(run.status.state).toBe('brownout');
    run.setSupply(5);
    run.step(10);
    expect(out()).toBe('boot\nboot\n');
  });

  it("the UNO R4's DAC follows analogWriteResolution() and reads back on A0", () => {
    const { run, out, errors } = boot(`void setup() {
  Serial.begin(9600);
  analogWrite(DAC, 128);
  Serial.println(analogRead(A0));
  analogWriteResolution(12);
  analogWrite(DAC, 1040);
  Serial.println(analogRead(A0));
}
void loop() {}`, 'uno-r4');
    run.step(10);
    expect(errors).toEqual([]);
    // 128 of 255 is 2.51 V, read by the 10-bit ADC as 514; 1040 of 4095 is 1.27 V, read as 260.
    expect(out()).toBe('514\n260\n');
    expect(run.snapshot().pins[14].volts).toBeCloseTo(1.27, 2);
  });
});

describe('array size cap', () => {
  it('rejects an array over a million elements with the line number', () => {
    const { errors } = boot('int big[200000000];\nvoid setup() {}\nvoid loop() {}');
    expect(errors.join('\n')).toMatch(/^1:\d+ .*array size 200000000 is over the limit of 1,000,000 elements/);
  });

  it('rejects a 2-D array whose dimensions multiply past the cap', () => {
    const { errors } = boot('int grid[2000][1000];\nvoid setup() {}\nvoid loop() {}');
    expect(errors.join('\n')).toMatch(/array size 2000000 is over the limit/);
  });

  it('compiles an array of exactly a million elements', () => {
    const { errors } = boot('char ok[1000000];\nvoid setup() {}\nvoid loop() {}');
    expect(errors).toEqual([]);
  });
});

describe('unknown includes', () => {
  const body = 'void setup() {}\nvoid loop() {}';

  it('names the header, its line and a code, and the run does not start', () => {
    const source = `#include <Servo.h>\n#include <Foo.h>\n${body}`;
    const [d, ...rest] = check({ board: 'uno-r3', source });
    expect(rest).toEqual([]);
    expect(d).toMatchObject({ kind: 'unsupported', line: 2, col: 1, code: 'include.unknown', args: { name: 'Foo.h' } });
    expect(d.hint).toContain('Servo.h');
    const { errors, run } = boot(source);
    expect(errors).toHaveLength(1);
    expect(run.status.state).not.toBe('running');
  });

  it('treats angle brackets and quotes alike', () => {
    expect(check({ board: 'uno-r3', source: `#include "local.h"\n${body}` })[0]).toMatchObject({ code: 'include.unknown', args: { name: 'local.h' } });
    expect(check({ board: 'uno-r3', source: `#include "Servo.h"\n${body}` })).toEqual([]);
  });

  it('is case sensitive and refuses paths that climb out', () => {
    for (const name of ['servo.h', '../Servo.h', '/usr/Servo.h']) {
      expect(check({ board: 'uno-r3', source: `#include <${name}>\n${body}` })[0]).toMatchObject({ code: 'include.unknown', args: { name } });
    }
  });

  it('lets core and library headers through, quoted or not', () => {
    const source = `#include <Arduino.h>\n#include <avr/pgmspace.h>\n#include "WiFiS3.h"\n#include "Arduino_LED_Matrix.h"\n#include <Wire.h>\n${body}`;
    expect(check({ board: 'uno-r4', source })).toEqual([]);
  });

  it('ignores an include in a comment', () => {
    expect(check({ board: 'uno-r3', source: `// #include <Foo.h>\n${body}` })).toEqual([]);
  });
});
