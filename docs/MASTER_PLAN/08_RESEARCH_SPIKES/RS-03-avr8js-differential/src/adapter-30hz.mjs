// What a pin-change-callback adapter would produce at the app's 30 snapshots per simulated second.
// Duty = high-time over the last 8 PWM periods of avr8js edge events; compared with the interpreter's pin value at the same time.
import { readFileSync, writeFileSync } from 'node:fs';
const ROOT = process.env.RS03_DIR ?? process.cwd();
function duty(ev, pin, t1, W) {
  const e = ev.filter((x) => x.pin === pin);
  const t0 = t1 - W; let level = 0;
  for (const x of e) if (x.us / 1000 <= t0) level = x.v;
  let high = 0, t = t0;
  for (const x of e) { const te = x.us / 1000; if (te <= t0) continue; if (te >= t1) break; if (level) high += te - t; t = te; level = x.v; }
  if (level) high += t1 - t;
  return high / W;
}
const at = (s, t) => { let c = null; for (const p of s) { if (p.t <= t) c = p; else break; } return c?.v ?? 0; };
const res = {};
for (const [id, pin, net, W] of [['motor', 6, 'D6', 8.192], ['knob', 9, 'D9', 16.32]]) {
  const a = JSON.parse(readFileSync(`${ROOT}/traces/${id}.avr.json`, 'utf8'));
  const i = JSON.parse(readFileSync(`${ROOT}/traces/${id}.interp.json`, 'utf8'));
  let n = 0, within = 0, worst = 0, worstT = 0;
  for (let t = 100; t < i.runMs; t += 1000 / 30) {
    const d = Math.abs(duty(a.pinEvents, pin, t, W) - at(i.trace.pins[net], t));
    n++; if (d <= 0.02) within++; if (d > worst) { worst = d; worstT = t; }
  }
  res[id] = { samples: n, withinTwoPercent: within, fraction: +(within / n).toFixed(3), worstAbsDiff: +worst.toFixed(3), worstAtMs: Math.round(worstT) };
}
console.log(JSON.stringify(res, null, 1));
writeFileSync(`${ROOT}/results-adapter.json`, JSON.stringify(res, null, 1));
