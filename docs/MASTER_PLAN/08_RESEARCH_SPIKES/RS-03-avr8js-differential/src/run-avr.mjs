// Run each compiled hex in avr8js (Node), write traces/<id>.avr.json, report simulated speed.
import { readFileSync, writeFileSync } from 'node:fs';
import { createUno } from './avr-core.mjs';

const ROOT = process.env.RS03_DIR ?? process.cwd();
const sketches = {
  blink: { runMs: 8500, adc: [] },
  motor: { runMs: 4500, adc: [] },
  // same world script as the lesson: pot 620, then 1023 at 1000 ms, 0 at 2000 ms, 300 at 3000 ms
  knob: { runMs: 4000, adc: [{ ms: 0, value: 620 }, { ms: 1000, value: 1023 }, { ms: 2000, value: 0 }, { ms: 3000, value: 300 }] },
};
for (const [id, cfg] of Object.entries(sketches)) {
  const hex = readFileSync(`${ROOT}/out/${id}/${id}.ino.hex`, 'utf8');
  const sim = createUno(hex, { adcScript: cfg.adc });
  const wall = sim.runTo(cfg.runMs);
  writeFileSync(`${ROOT}/traces/${id}.avr.json`, JSON.stringify({ id, runMs: cfg.runMs, wallMs: wall, cycles: sim.cpu.cycles, pinEvents: sim.pinEvents, lines: sim.lines }));
  console.log(id, 'pinEvents', sim.pinEvents.length, 'serial lines', sim.lines.length, 'wall ms', wall.toFixed(1));
}
