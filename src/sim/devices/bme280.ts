import type { BehaviourFn, DeviceRuntime } from "./register-map.ts";

export interface Bme280Cal {
  digT: [number, number, number];
  /** dig_P1 to dig_P9. */
  digP: number[];
  /** dig_H1 to dig_H6. */
  digH: number[];
}

const NS_PER_MS = 1e6;
const ADC_MAX = (1 << 20) - 1;
const ADC_H_MAX = 0xffff;
const SKIPPED_ADC = 0x80000;
const SKIPPED_ADC_H = 0x8000;
const CAL_LOW = 0x88;
const CAL_LOW_BYTES = 26;
const CAL_HIGH = 0xe1;
const CAL_HIGH_BYTES = 7;

const REG = { RESET: 0xe0, CTRL_HUM: 0xf2, CTRL_MEAS: 0xf4, CONFIG: 0xf5, PRESS: 0xf7, TEMP: 0xfa, HUM: 0xfd } as const;
const SOFT_RESET = 0xb6;
const SLEEP = 0;
const FORCED = 1;
const NORMAL = 3;
const OVERSAMPLING = [0, 1, 2, 4, 8, 16, 16, 16];
const STANDBY_MS = [0.5, 62.5, 125, 250, 500, 1000, 10, 20];

const s16 = (b: Uint8Array, i: number): number => ((b[i] | (b[i + 1] << 8)) << 16) >> 16;
const u16 = (b: Uint8Array, i: number): number => b[i] | (b[i + 1] << 8);
const s8 = (v: number): number => (v << 24) >> 24;

/** `bytes` are registers 0x88 to 0xA1 (26) followed by 0xE1 to 0xE7 (7), DS 4.2.2 table 16. */
export function parseCalibration(bytes: Uint8Array): Bme280Cal {
  return {
    digT: [u16(bytes, 0), s16(bytes, 2), s16(bytes, 4)],
    digP: [u16(bytes, 6), ...Array.from({ length: 8 }, (_, i) => s16(bytes, 8 + 2 * i))],
    digH: [bytes[25], s16(bytes, 26), bytes[28], (s8(bytes[29]) << 4) | (bytes[30] & 0xf), (s8(bytes[31]) << 4) | (bytes[30] >> 4), s8(bytes[32])],
  };
}

/** DS 4.2.3 BME280_compensate_T_int32: `t100` is 0.01 degC, `tFine` feeds the other two. */
export function compensateT(cal: Bme280Cal, adcT: number): { t100: number; tFine: number } {
  const [t1, t2, t3] = cal.digT;
  const var1 = Math.imul((adcT >> 3) - (t1 << 1), t2) >> 11;
  const d = (adcT >> 4) - t1;
  const var2 = Math.imul(Math.imul(d, d) >> 12, t3) >> 14;
  const tFine = (var1 + var2) | 0;
  return { t100: (Math.imul(tFine, 5) + 128) >> 8, tFine };
}

/** DS 4.2.3 BME280_compensate_P_int64: Pa in Q24.8. */
export function compensateP(cal: Bme280Cal, adcP: number, tFine: number): number {
  const [p1, p2, p3, p4, p5, p6, p7, p8, p9] = cal.digP.map(BigInt);
  let var1 = BigInt(tFine) - 128000n;
  let var2 = var1 * var1 * p6;
  var2 += (var1 * p5) << 17n;
  var2 += p4 << 35n;
  var1 = ((var1 * var1 * p3) >> 8n) + ((var1 * p2) << 12n);
  var1 = (((1n << 47n) + var1) * p1) >> 33n;
  if (var1 === 0n) return 0;
  let p = 1048576n - BigInt(adcP);
  p = (((p << 31n) - var2) * 3125n) / var1;
  var1 = (p9 * (p >> 13n) * (p >> 13n)) >> 25n;
  var2 = (p8 * p) >> 19n;
  p = ((p + var1 + var2) >> 8n) + (p7 << 4n);
  return Number(BigInt.asUintN(32, p));
}

/** DS 4.2.3 bme280_compensate_H_int32: %RH in Q22.10. */
export function compensateH(cal: Bme280Cal, adcH: number, tFine: number): number {
  const [h1, h2, h3, h4, h5, h6] = cal.digH;
  let v = (tFine - 76800) | 0;
  const a = (((adcH << 14) - (h4 << 20) - Math.imul(h5, v)) + 16384) >> 15;
  const b = (((Math.imul(v, h6) >> 10) * ((Math.imul(v, h3) >> 11) + 32768)) >> 10) + 2097152;
  const c = (Math.imul(b, h2) + 8192) >> 14;
  v = Math.imul(a, c);
  v -= Math.imul(((((v >> 15) * (v >> 15)) >> 7)), h1) >> 4;
  v = Math.min(Math.max(v, 0), 419430400);
  return v >> 12;
}

/** The smallest `x` in `[lo, hi]` whose `f` has reached `target`, or its neighbour when that is closer. */
function nearest(lo: number, hi: number, f: (x: number) => number, target: number, rising: boolean): number {
  let a = lo;
  let b = hi;
  while (a < b) {
    const mid = (a + b) >> 1;
    if (rising ? f(mid) >= target : f(mid) <= target) b = mid;
    else a = mid + 1;
  }
  return a > lo && Math.abs(f(a - 1) - target) < Math.abs(f(a) - target) ? a - 1 : a;
}

/** The raw words a chip with calibration `cal` would show for `t100` (0.01 degC), `pPa` and `hPct`. */
export function invertCompensation(cal: Bme280Cal, t100: number, pPa: number, hPct: number): { adcT: number; adcP: number; adcH: number } {
  const adcT = nearest(0, ADC_MAX, (x) => compensateT(cal, x).t100, t100, true);
  const { tFine } = compensateT(cal, adcT);
  const adcH = nearest(0, ADC_H_MAX, (x) => compensateH(cal, x, tFine), Math.round(hPct * 1024), true);
  const adcP = nearest(0, ADC_MAX, (x) => compensateP(cal, x, tFine), Math.round(pPa * 256), false);
  return { adcT, adcP, adcH };
}

function calibrationOf(d: DeviceRuntime): Bme280Cal {
  const bytes = new Uint8Array(CAL_LOW_BYTES + CAL_HIGH_BYTES);
  bytes.set(d.regs.subarray(CAL_LOW, CAL_LOW + CAL_LOW_BYTES));
  bytes.set(d.regs.subarray(CAL_HIGH, CAL_HIGH + CAL_HIGH_BYTES), CAL_LOW_BYTES);
  return parseCalibration(bytes);
}

/** DS 9.1 maximum conversion time in ns for the oversampling codes of the three channels. */
function conversionNs(osrsT: number, osrsP: number, osrsH: number): number {
  const [t, p, h] = [osrsT, osrsP, osrsH].map((code) => OVERSAMPLING[code]);
  const ms = 1.25 + 2.3 * t + (p > 0 ? 2.3 * p + 0.575 : 0) + (h > 0 ? 2.3 * h + 0.575 : 0);
  return Math.round(ms * NS_PER_MS);
}

function putWord(d: DeviceRuntime, addr: number, word: number, bytes: number): void {
  for (let i = 0; i < bytes; i++) d.regs[addr + i] = (word >> (8 * (bytes - 1 - i))) & 0xff;
}

const putSkipped = (d: DeviceRuntime): void => {
  putWord(d, REG.PRESS, SKIPPED_ADC << 4, 3);
  putWord(d, REG.TEMP, SKIPPED_ADC << 4, 3);
  putWord(d, REG.HUM, SKIPPED_ADC_H, 2);
};

function holdInputs(d: DeviceRuntime): void {
  d.state.heldT = Math.round(d.inputs.temperatureC * 100);
  d.state.heldP = Math.round(d.inputs.pressurePa);
  d.state.heldH = Math.round(d.inputs.humidityPct * 100) / 100;
}

function startConversion(d: DeviceRuntime, atNs: number): void {
  const s = d.state;
  const raw = invertCompensation(calibrationOf(d), s.heldT, s.heldP, s.heldH);
  s.rawT = s.osrsT === 0 ? SKIPPED_ADC : raw.adcT;
  s.rawP = s.osrsP === 0 ? SKIPPED_ADC : raw.adcP;
  s.rawH = s.osrsH === 0 ? SKIPPED_ADC_H : raw.adcH;
  s.convEndNs = atNs + conversionNs(s.osrsT, s.osrsP, s.osrsH);
  s.measuring = 1;
  s.nextNs = -1;
}

function finishConversion(d: DeviceRuntime): void {
  const s = d.state;
  putWord(d, REG.TEMP, s.rawT << 4, 3);
  putWord(d, REG.PRESS, s.rawP << 4, 3);
  putWord(d, REG.HUM, s.rawH, 2);
  s.measuring = 0;
  if (s.mode === NORMAL) {
    s.nextNs = s.convEndNs + Math.round(STANDBY_MS[s.tSb] * NS_PER_MS);
  } else {
    s.mode = SLEEP;
    d.regs[REG.CTRL_MEAS] &= ~NORMAL;
  }
}

/** Runs the conversions that completed or began since the last access; a read sees the sample as it stands at `nowNs`. */
function advance(d: DeviceRuntime, nowNs: number): void {
  const s = d.state;
  if (!s.ready) {
    holdInputs(d);
    s.ready = 1;
  }
  for (;;) {
    if (s.measuring) {
      if (nowNs < s.convEndNs) break;
      finishConversion(d);
    } else if (s.mode === NORMAL && s.nextNs >= 0 && nowNs >= s.nextNs) {
      const cycle = conversionNs(s.osrsT, s.osrsP, s.osrsH) + Math.round(STANDBY_MS[s.tSb] * NS_PER_MS);
      s.nextNs += Math.max(0, Math.floor((nowNs - s.nextNs) / cycle) - 1) * cycle;
      startConversion(d, s.nextNs);
    } else break;
  }
  s.lastNs = nowNs;
}

function measure(d: DeviceRuntime, ev: Parameters<BehaviourFn>[1]): void {
  if (ev.kind === "tick") advance(d, ev.nowNs);
  else if (ev.kind === "input") {
    advance(d, ev.nowNs);
    holdInputs(d);
  }
}

function config(d: DeviceRuntime, ev: Parameters<BehaviourFn>[1]): void {
  if (ev.kind !== "write") return;
  const s = d.state;
  if (ev.addr === REG.CTRL_HUM) s.humPending = ev.value & 7;
  else if (ev.addr === REG.CONFIG) s.tSb = ev.value >> 5;
  else if (ev.addr === REG.CTRL_MEAS) {
    const bits = ev.value & NORMAL;
    s.osrsT = ev.value >> 5;
    s.osrsP = (ev.value >> 2) & 7;
    s.osrsH = s.humPending;
    s.mode = bits === 0 ? SLEEP : bits === NORMAL ? NORMAL : FORCED;
    if (s.mode === SLEEP) s.nextNs = -1;
    else if (!s.measuring) startConversion(d, s.lastNs);
  }
}

function reset(d: DeviceRuntime, ev: Parameters<BehaviourFn>[1]): void {
  if (ev.kind !== "write" || ev.value !== SOFT_RESET) return;
  const s = d.state;
  for (const name of ["measuring", "mode", "osrsT", "osrsP", "osrsH", "humPending", "tSb", "convEndNs"]) s[name] = 0;
  s.nextNs = -1;
  for (const addr of [REG.CTRL_HUM, REG.CTRL_MEAS, REG.CONFIG]) d.regs[addr] = 0;
  putSkipped(d);
}

export function registerBme280(registerBehaviour: (ref: string, fn: BehaviourFn) => void): void {
  registerBehaviour("bme280.measure", measure);
  registerBehaviour("bme280.reset", reset);
  registerBehaviour("bme280.config", config);
}
