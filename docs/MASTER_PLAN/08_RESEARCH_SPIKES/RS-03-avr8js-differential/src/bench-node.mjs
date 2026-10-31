// Simulated speed in Node: simulated seconds per wall second, 3 runs per sketch, with and without pin/serial listeners.
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { createUno } from './avr-core.mjs';
const ROOT = process.env.RS03_DIR ?? process.cwd();
const SIM_S = 30;
const adc = [{ ms: 0, value: 620 }];
const rows = [];
for (const id of ['blink', 'motor', 'knob']) {
  const hex = readFileSync(`${ROOT}/out/${id}/${id}.ino.hex`, 'utf8');
  for (const listeners of [true, false]) {
    for (let rep = 0; rep < 3; rep++) {
      const load = execSync('uptime').toString().match(/load averages?: ([\d.]+)/)[1];
      const sim = createUno(hex, { adcScript: adc, pinEvents: listeners });
      const wall = sim.runTo(SIM_S * 1000);
      rows.push({ id, listeners, rep, wallMs: Math.round(wall), simPerWall: +(SIM_S / (wall / 1000)).toFixed(2), load1m: load, events: sim.pinEvents.length });
    }
  }
}
console.log(JSON.stringify(rows));
console.table(rows);
