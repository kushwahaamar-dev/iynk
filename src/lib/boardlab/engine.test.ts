// @vitest-environment node
// The sensor inputs that talk through timing, I²C or Wi-Fi (an HC-SR04, an MPU-6050, a QTR-RC array,
// a phone on the network) reach every board lesson that uses them in the Board Lab's live run:
// compile() with the lesson's world, the World panel's control for the input, then setInput().
// The same reference program run twice with the input at its two ends must print or drive
// something different; a phone request must come back from the sketch's web server.
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { BoardContent, Lesson, WorldInput } from '@/content/schema';
import { boardLoaders } from '@/content/index.generated';
import { boardNets, lessonVariant } from '@/lib/interp';
import { compile, type Session } from './engine';
import { controlFor } from './inputs';
import { defaultParams, renderTemplate, resolveText } from './template';

const KINDS = new Set(['hc-sr04', 'mpu6050', 'qtr-rc', 'network']);
const RUN_MS = 4000;

function prose(id: string): (key: string) => string {
  const file = join(process.cwd(), 'src/i18n/content/en/boards', `${id}.json`);
  const json: unknown = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {};
  return (key) => {
    const v = key.split('.').reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined), json);
    return typeof v === 'string' ? v : key;
  };
}

function start(board: BoardContent, lesson: Lesson, source: string): Session {
  const result = compile({
    language: lesson.language,
    source,
    board: board.id,
    variant: lessonVariant(board, lesson),
    nets: boardNets(board),
    ports: lesson.code.ports,
    world: lesson.world,
    logicV: board.logicVolts,
  });
  if (!result.ok) throw new Error(`${result.error.kind}: ${result.error.message}`);
  return result.session;
}

/** Serial and pins after running with `input` held at `value` from the start, the way the live run sets it. */
function runAt(board: BoardContent, lesson: Lesson, source: string, input: WorldInput, value: number): string {
  const s = start(board, lesson, source);
  for (const other of lesson.world.inputs) if (other.device.kind !== 'network') s.setInput(other, other.id === input.id ? value : other.default);
  for (let t = 100; t <= RUN_MS; t += 100) s.advanceTo(t);
  expect(s.error, `${lesson.id}: ${s.error?.message}`).toBeNull();
  const pins = Object.entries(s.pins()).map(([net, p]) => `${net}=${p.value}${p.volts !== undefined ? '/' + p.volts : ''}`);
  return [...s.flushSerial().map((l) => l.text), ...pins].join('\n');
}

const boards = Object.entries(boardLoaders) as [string, () => Promise<{ default: BoardContent }>][];

describe('sensor inputs reach the board lessons in the live run', async () => {
  let seen = 0;
  for (const [id, load] of boards) {
    const board = (await load()).default;
    const text = prose(id);
    for (const lesson of board.lessons) {
      const inputs = lesson.world.inputs.filter((i) => KINDS.has(i.device.kind));
      if (!inputs.length) continue;
      const source = resolveText(renderTemplate(lesson.code.source, lesson.params, defaultParams(lesson.params)).code, text);
      for (const input of inputs) {
        seen++;
        it(`${id} / ${lesson.id} / ${input.id} (${input.device.kind})`, () => {
          const control = controlFor(input);
          const d = input.device;
          if (d.kind !== 'network') {
            expect(control.kind).toBe('slider');
            // three values, since a tilt reads the same at -90 and +90 on an axis that sees cos()
            const outs = [input.min, (input.min + input.max) / 2, input.max].map((v) => runAt(board, lesson, source, input, v));
            if (new Set(outs).size > 1) return;
            // a lesson that only scans the bus (never reads the motion registers 0x3B-0x48) shows the
            // sensor reached it by finding it there
            const readsMotion = /0x3[b-f]|0x4[0-8]|accel|gyro/i.test(source);
            const where = d.kind === 'mpu6050' && !readsMotion ? `0x${d.address.toString(16)}` : null;
            expect(where && outs[0].toLowerCase().includes(where), `${input.id} gave the same output at ${input.min}, the middle and ${input.max}:\n${outs[0].slice(0, 300)}`).toBeTruthy();
            return;
          }
          // a phone on the Wi-Fi: every request the World panel offers is answered by the sketch
          const s = start(board, lesson, source);
          for (let t = 100; t <= RUN_MS; t += 100) s.advanceTo(t);
          expect(s.error, `${lesson.id}: ${s.error?.message}`).toBeNull();
          if (control.kind !== 'requests') return;
          for (const r of control.requests) {
            s.setInput(input, r.value);
            for (let t = s.nowMs + 100, end = s.nowMs + 1500; t <= end; t += 100) s.advanceTo(t);
          }
          const http = s.takeHttp();
          expect(http.map((x) => `${x.method} ${x.path}`)).toEqual(control.requests.map((r) => r.label.split(/\s+/).slice(0, 2).join(' ')));
          for (const x of http) expect(x.status, `${x.method} ${x.path}: ${x.body.slice(0, 80)}`).toBeLessThan(500);
        }, 60_000);
      }
    }
  }
  it('found lessons that use them', () => expect(seen).toBeGreaterThan(0));
});

// No board lesson uses a QTR-RC array yet (wave B's robotics lessons will): the same path with a small sketch.
describe('a QTR-RC line position reaches the sketch', () => {
  const pins = ['D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8', 'D9'];
  const line: WorldInput = {
    id: 'line', quantity: 'line-position', device: { kind: 'qtr-rc', sensors: 8 }, pins, part: 'QTR1',
    min: 0, max: 7000, step: 100, default: 3500, gesture: 'slide', label: 'world.line',
  };
  const source = `#include <QTRSensors.h>
QTRSensors qtr;
const uint8_t sensorPins[] = {2, 3, 4, 5, 6, 7, 8, 9};
uint16_t v[8];
void setup() {
  Serial.begin(9600);
  qtr.setTypeRC();
  qtr.setSensorPins(sensorPins, 8);
}
void loop() {
  qtr.read(v);
  for (int i = 0; i < 8; i++) { Serial.print(v[i]); Serial.print(' '); }
  Serial.println();
  delay(200);
}
`;
  const readAt = (value: number) => {
    const result = compile({ language: 'arduino-cpp', source, board: 'uno-r3', world: { inputs: [line], script: [] }, logicV: 5 });
    if (!result.ok) throw new Error(result.error.message);
    const s = result.session;
    s.setInput(line, value);
    for (let t = 100; t <= 1000; t += 100) s.advanceTo(t);
    expect(s.error).toBeNull();
    return s.takeSerial().at(-1)?.text.trim().split(/\s+/).map(Number) ?? [];
  };

  it('is a slider in the World panel', () => expect(controlFor(line).kind).toBe('slider'));
  it('reads darkest under the sensor the line is under', () => {
    for (const [value, under] of [[0, 0], [3500, 3], [7000, 7]] as const) {
      const raw = readAt(value);
      expect(raw).toHaveLength(8);
      expect(raw.indexOf(Math.max(...raw)), `line at ${value}: ${raw.join(' ')}`).toBe(under);
    }
  });
});

// An FPGA design in the live run: its ports land on the figure's nets through the lesson's port map, and the figure's
// own switches drive it on change only, so the World panel and the drawn switches can both flip the same input.
describe('a Verilog design on the Basys 3 in the live run', () => {
  const source = `module top #(parameter CLK_HZ = 100_000_000) (input clk, input [15:0] sw, input btnC,
  output [15:0] led, output reg [6:0] seg, output [3:0] an, output dp);
  assign led = sw;
  assign an = btnC ? 4'b1110 : 4'b1111;   // digit 0 on while the button is held
  assign dp = 1'b1;
  always @* seg = 7'b1111001;             // "1": segments b and c
endmodule
`;
  const ports = {
    sw: Array.from({ length: 16 }, (_, i) => `SW${i}`),
    led: Array.from({ length: 16 }, (_, i) => `LD${i}`),
    btnC: ['BTNC'],
  };
  const sw3: WorldInput = { id: 'sw3', quantity: 'switch', device: { kind: 'switch' }, pins: ['SW3'], part: 'SW3', min: 0, max: 1, step: 1, default: 0, gesture: 'slide', label: 'world.sw3' };
  const session = () => {
    const result = compile({ language: 'verilog', source, board: 'basys3', ports, world: { inputs: [sw3], script: [] }, logicV: 3.3 });
    if (!result.ok) throw new Error(result.error.message);
    return result.session;
  };

  it('shows LEDs, the switches it reads and the lit segments as nets', () => {
    const s = session();
    s.setInput(sw3, 1);
    s.drive('BTNC', 1);
    s.advanceTo(100);
    const pins = s.pins();
    expect(pins.LD3).toEqual({ mode: 'output', value: 1, pwm: false });
    expect(pins.LD2).toEqual({ mode: 'output', value: 0, pwm: false });
    expect(pins.SW3).toEqual({ mode: 'output', value: 1, pwm: false });
    expect(pins.SW2).toBeUndefined(); // a low switch is left out: the figure reads a net it no longer gets as 0
    expect(pins.DIG0_B?.value).toBe(1);
    expect(pins.DIG0_A).toBeUndefined(); // dark segment
    expect(pins.DIG1_B).toBeUndefined(); // digit 1 is off
  });

  it('applies a figure report only when it changes', () => {
    const s = session();
    s.drive('SW3', 0); // the figure's switch is down
    s.setInput(sw3, 1); // the World panel flips it up
    s.drive('SW3', 0); // the figure reports the same position again
    s.advanceTo(50);
    expect(s.pins().LD3?.value).toBe(1);
    s.drive('SW3', 1);
    s.drive('SW3', 0); // the figure's switch is flipped down
    s.advanceTo(100);
    expect(s.pins().LD3?.value).toBe(0);
  });
});
