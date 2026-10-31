import { pow } from '../../../sim/core/dmath.ts';
import { compensateH, compensateP, compensateT, parseCalibration, type Bme280Cal } from '../../../sim/devices/bme280.ts';
import type { Gen } from '../exec';
import type { ArduinoRt } from './interp';
import type { LibClass } from './libs';

const CHIP_ID = 0x60;
const SOFT_RESET = 0xb6;
const REG = { ID: 0xd0, RESET: 0xe0, CTRL_HUM: 0xf2, STATUS: 0xf3, CTRL_MEAS: 0xf4, CONFIG: 0xf5, PRESS: 0xf7, TEMP: 0xfa, HUM: 0xfd } as const;
const SKIPPED_ADC = 0x80000;
const SKIPPED_ADC_H = 0x8000;

/** Where each calibration read lands in the 33-byte table `parseCalibration` takes; the library reads field by field. */
const CAL_READS: readonly (readonly [reg: number, n: number, at: number])[] = [
  ...Array.from({ length: 12 }, (_, i) => [0x88 + 2 * i, 2, 2 * i] as const),
  [0xa1, 1, 25], [0xe1, 2, 26], [0xe3, 1, 28], [0xe4, 1, 29], [0xe5, 1, 30], [0xe6, 1, 31], [0xe5, 1, 30], [0xe7, 1, 32],
];

interface Bme {
  addr: number;
  sensorId: number;
  cal: Bme280Cal | null;
  tFine: number;
}

function transfer(rt: ArduinoRt, addr: number, write: number[], readN: number): number[] | null {
  const r = rt.world.i2cTransfer(addr, write, readN);
  rt.advance(rt.world.now + r.costUs);
  return r.ack ? r.bytes : null;
}

const read = (rt: ArduinoRt, b: Bme, reg: number, n: number) => transfer(rt, b.addr, [reg], n);
const write = (rt: ArduinoRt, b: Bme, reg: number, value: number) => transfer(rt, b.addr, [reg, value], 0);
const wait = (rt: ArduinoRt, ms: number): Gen<void> => rt.sleepUntil(rt.world.now + ms * 1000);

/** The library's constructor-time defaults: normal mode, x16 on all three, filter off, 0.5 ms standby. */
function setSampling(rt: ArduinoRt, b: Bme): void {
  write(rt, b, REG.CTRL_MEAS, 0x00);
  write(rt, b, REG.CTRL_HUM, 0x05);
  write(rt, b, REG.CONFIG, 0x00);
  write(rt, b, REG.CTRL_MEAS, 0xb7);
}

function readCalibration(rt: ArduinoRt, b: Bme): Bme280Cal | null {
  const table = new Uint8Array(33);
  for (const [reg, n, at] of CAL_READS) {
    const bytes = read(rt, b, reg, n);
    if (bytes === null) return null;
    table.set(bytes, at);
  }
  return parseCalibration(table);
}

function* begin(rt: ArduinoRt, b: Bme, [addr = 0x77]: number[]): Gen<number> {
  b.addr = addr;
  b.cal = null;
  if (transfer(rt, addr, [], 0) === null) return 0;
  const id = read(rt, b, REG.ID, 1);
  if (id === null || id[0] !== CHIP_ID) return 0;
  b.sensorId = id[0];
  write(rt, b, REG.RESET, SOFT_RESET);
  yield* wait(rt, 10);
  while ((read(rt, b, REG.STATUS, 1)?.[0] ?? 0) & 1) yield* wait(rt, 10);
  b.cal = readCalibration(rt, b);
  if (b.cal === null) return 0;
  setSampling(rt, b);
  yield* wait(rt, 100);
  return 1;
}

/** The 20-bit word at `reg`, or null when the bus failed or the channel was skipped. */
function adc20(rt: ArduinoRt, b: Bme, reg: number): number | null {
  const bytes = read(rt, b, reg, 3);
  if (bytes === null) return null;
  const word = ((bytes[0] << 16) | (bytes[1] << 8) | bytes[2]) >> 4;
  return word === SKIPPED_ADC ? null : word;
}

function readTemperature(rt: ArduinoRt, b: Bme): number {
  const adc = adc20(rt, b, REG.TEMP);
  if (b.cal === null || adc === null) return NaN;
  const { t100, tFine } = compensateT(b.cal, adc);
  b.tFine = tFine;
  return t100 / 100;
}

function readPressure(rt: ArduinoRt, b: Bme): number {
  if (Number.isNaN(readTemperature(rt, b))) return NaN;
  const adc = adc20(rt, b, REG.PRESS);
  return b.cal === null || adc === null ? NaN : compensateP(b.cal, adc, b.tFine) / 256;
}

function readHumidity(rt: ArduinoRt, b: Bme): number {
  if (Number.isNaN(readTemperature(rt, b))) return NaN;
  const bytes = read(rt, b, REG.HUM, 2);
  if (bytes === null || b.cal === null) return NaN;
  const adc = (bytes[0] << 8) | bytes[1];
  return adc === SKIPPED_ADC_H ? NaN : compensateH(b.cal, adc, b.tFine) / 1024;
}

export const Bme280Class: LibClass = {
  headers: ['Adafruit_BME280.h'],
  create: () => ({ addr: 0x77, sensorId: 0, cal: null, tFine: 0 }),
  unmodelledMethods: ['setSampling', 'takeForcedMeasurement', 'getTemperatureSensor', 'getPressureSensor', 'getHumiditySensor', 'seaLevelForAltitude', 'setTemperatureCompensation'],
  methods: {
    begin: { ret: 'bool', gen: (rt, b: Bme, a) => begin(rt, b, a) },
    readTemperature: { ret: 'float', fn: (rt, b: Bme) => readTemperature(rt, b) },
    readHumidity: { ret: 'float', fn: (rt, b: Bme) => readHumidity(rt, b) },
    readPressure: { ret: 'float', fn: (rt, b: Bme) => readPressure(rt, b) },
    readAltitude: { ret: 'float', min: 1, fn: (rt, b: Bme, [seaLevelHpa]) => 44330 * (1 - pow(readPressure(rt, b) / 100 / seaLevelHpa, 0.1903)) },
    sensorID: { ret: 'int32_t', pure: true, fn: (_rt, b: Bme) => b.sensorId },
  },
};

export const SensorClass: LibClass = {
  headers: ['Adafruit_Sensor.h'],
  create: () => ({}),
  unmodelledMethods: ['getEvent', 'getSensor'],
  methods: {},
};
