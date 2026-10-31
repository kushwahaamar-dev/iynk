// Compare avr8js traces with iynk interpreter traces. Writes results.json and prints tables.
import { readFileSync, writeFileSync } from 'node:fs';
const ROOT = process.env.RS03_DIR ?? process.cwd();
const load = (id) => ({
  avr: JSON.parse(readFileSync(`${ROOT}/traces/${id}.avr.json`, 'utf8')),
  it: JSON.parse(readFileSync(`${ROOT}/traces/${id}.interp.json`, 'utf8')),
});
const out = {};
const r3 = (x) => Math.round(x * 1000) / 1000;

// High-time fraction of a pin over [t0, t1] (ms) from avr8js edge events (us)
function avrDuty(events, pin, t0ms, t1ms) {
  const ev = events.filter((e) => e.pin === pin);
  let level = 0;
  for (const e of ev) if (e.us / 1000 <= t0ms) level = e.v;
  let high = 0, t = t0ms;
  for (const e of ev) {
    const te = e.us / 1000;
    if (te <= t0ms) continue;
    if (te >= t1ms) break;
    if (level) high += te - t;
    t = te; level = e.v;
  }
  if (level) high += t1ms - t;
  return high / (t1ms - t0ms);
}
// Interp pin value at time t: pwm duty, or 0/1 for out
function interpAt(series, t) {
  let cur = null;
  for (const p of series) { if (p.t <= t) cur = p; else break; }
  if (!cur) return null;
  return cur.mode === 'pwm' ? cur.v : cur.v;
}

// ---- Blink
{
  const { avr, it } = load('blink');
  const a = avr.pinEvents.filter((e) => e.pin === 13).map((e) => ({ ms: e.us / 1000, v: e.v }));
  const b = it.trace.pins.D13.map((p) => ({ ms: p.t, v: p.v }));
  const n = Math.min(a.length, b.length);
  const rows = [];
  for (let i = 0; i < n; i++) rows.push({ i, avrMs: r3(a[i].ms), interpMs: b[i].ms, deltaMs: r3(a[i].ms - b[i].ms), avrV: a[i].v, interpV: b[i].v });
  const periodsA = [], periodsB = [];
  for (let i = 2; i < n; i += 2) { periodsA.push(a[i].ms - a[i - 2].ms); periodsB.push(b[i].ms - b[i - 2].ms); }
  out.blink = {
    avrEdges: a.length, interpEdges: b.length,
    avrPeriodMs: { min: r3(Math.min(...periodsA)), max: r3(Math.max(...periodsA)) },
    interpPeriodMs: { min: r3(Math.min(...periodsB)), max: r3(Math.max(...periodsB)) },
    maxAbsDeltaMs: r3(Math.max(...rows.map((r) => Math.abs(r.deltaMs)))),
    firstRows: rows.slice(0, 6), lastRow: rows[n - 1],
    levelsEqual: rows.every((r) => r.avrV === r.interpV),
  };
}

// ---- Motor (PWM ramp on D6, timer0 fast PWM ~976 Hz). Sample each 40 ms step 20 ms after it starts, window 8 PWM periods.
{
  const { avr, it } = load('motor');
  const W = 8 * 1.024; // ms
  const rows = [];
  const series = it.trace.pins.D6;
  // step starts: interp series entries
  for (let i = 0; i < series.length; i++) {
    const s = series[i];
    const next = series[i + 1]?.t ?? it.runMs;
    const mid = s.t + 0.5 * (next - s.t);
    if (next - s.t < 15) continue;
    const t1 = Math.min(mid + W / 2, next - 0.5), t0 = t1 - W;
    const a = avrDuty(avr.pinEvents, 6, t0, t1);
    const b = interpAt(series, mid);
    rows.push({ tMs: r3(mid), interp: b, avr: r3(a), absDiff: r3(Math.abs(a - b)) });
  }
  const worst = rows.reduce((m, r) => (r.absDiff > m.absDiff ? r : m), rows[0]);
  out.motor = { samples: rows.length, maxAbsDutyDiff: worst.absDiff, worst, meanAbsDiff: r3(rows.reduce((s, r) => s + r.absDiff, 0) / rows.length), rows };
  // ramp step timing: when does avr8js's duty first change vs interp's (first step at 1 ms vs. real ~start)
  const edges = avr.pinEvents.filter((e) => e.pin === 6);
  out.motor.avrPwmPeriodMs = (() => { const rises = edges.filter((e) => e.v === 1).map((e) => e.us / 1000).filter((t) => t > 100 && t < 140); return rises.length > 2 ? r3((rises[rises.length - 1] - rises[0]) / (rises.length - 1)) : null; })();
}

// ---- Knob
{
  const { avr, it } = load('knob');
  const a = avr.lines, b = it.trace.serial;
  const textsEqual = a.length === b.length && a.every((l, i) => l.text === b[i].text);
  // align by text sequence; compare counts and first mismatch
  let firstMismatch = null;
  for (let i = 0; i < Math.max(a.length, b.length); i++) if (a[i]?.text !== b[i]?.text) { firstMismatch = { i, avr: a[i], interp: b[i] }; break; }
  const dt = [];
  for (let i = 0; i < Math.min(a.length, b.length); i++) dt.push(a[i].us / 1000 - b[i].t);
  out.knobSerial = {
    avrLines: a.length, interpLines: b.length, identicalTextSequence: textsEqual, firstMismatch,
    avrFirst: a.slice(0, 3).map((l) => ({ ms: r3(l.us / 1000), text: l.text })),
    avrLast: a.slice(-2).map((l) => ({ ms: r3(l.us / 1000), text: l.text })),
    interpFirst: b.slice(0, 3), interpLast: b.slice(-2),
    lineTimeLagMs: { first: r3(dt[0]), last: r3(dt[dt.length - 1]), max: r3(Math.max(...dt)) },
    distinctValues: { avr: [...new Set(a.map((l) => l.text))], interp: [...new Set(b.map((l) => l.text))] },
  };
  // D9 duty at the lesson check times
  const series = it.trace.pins.D9;
  const rows = [];
  for (const t of [600, 1500, 2500, 3500]) {
    const W = 8 * 2.04; // timer1 phase-correct 8-bit: ~490 Hz, period 2.04 ms
    const ar = avrDuty(avr.pinEvents, 9, t - W, t);
    const iv = interpAt(series, t);
    rows.push({ tMs: t, interp: iv, avr: r3(ar), absDiff: r3(Math.abs(ar - iv)) });
  }
  out.knobPwm = rows;
  // PWM at every steady segment
  const edges = avr.pinEvents.filter((e) => e.pin === 9 && e.us > 300_000 && e.us < 400_000);
  const rises = edges.filter((e) => e.v === 1).map((e) => e.us / 1000);
  out.knobPwmPeriodMs = r3((rises[rises.length - 1] - rises[0]) / (rises.length - 1));
}
writeFileSync(`${ROOT}/results.json`, JSON.stringify(out, null, 1));
console.log(JSON.stringify({ ...out, motor: { ...out.motor, rows: out.motor.rows.length + ' rows (see results.json)' } }, null, 1));
