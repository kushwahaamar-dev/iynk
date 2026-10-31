import { exp, pow } from "../core/dmath.ts";

export interface SensorModel {
  id: string;
  quantity: string;
  unit: string;
  range: [number, number];
  /** Standard deviation of the noise added to the measured quantity, in its own unit. */
  noiseSigma: number;
  quantiseTo?: number;
  transfer(x: number): number;
  /** One line for the Models panel. */
  text: string;
}

const HALL_SUPPLY_V = 5;
const HALL_SENSITIVITY_V_PER_GAUSS = 0.0014;
const US_PER_CM = 2 / 0.0343;
const ECHO_TIMEOUT_US = 38_000;

export const SENSORS: Record<string, SensorModel> = {
  ntc: {
    id: "ntc",
    quantity: "temperature",
    unit: "degC",
    range: [-40, 125],
    noiseSigma: 0.5,
    transfer: (c) => 10_000 * exp(3950 * (1 / (c + 273.15) - 1 / 298.15)),
    text: "temperature (degC) to NTC resistance (ohm): R = 10000 exp(3950 (1/T - 1/298.15)), range -40 to 125, noise 0.5",
  },
  ldr: {
    id: "ldr",
    quantity: "light",
    unit: "lux",
    range: [0, 100_000],
    noiseSigma: 0,
    transfer: (lux) => (lux <= 0.1 ? 1_000_000 : Math.min(1_000_000, 10_000 * pow(lux / 10, -0.7))),
    text: "light (lux) to LDR resistance (ohm): R = min(1e6, 10000 (lux/10)^-0.7), range 0 to 100000, no noise",
  },
  fsr: {
    id: "fsr",
    quantity: "force",
    unit: "N",
    range: [0, 100],
    noiseSigma: 0,
    transfer: (n) => (n <= 0.05 ? 10_000_000 : Math.max(200, 10_000 / n)),
    text: "force (N) to FSR resistance (ohm): R = max(200, 10000 / F), open above 10 Mohm below 0.05 N, range 0 to 100, no noise",
  },
  hcsr04: {
    id: "hcsr04",
    quantity: "distance",
    unit: "cm",
    range: [0, 500],
    noiseSigma: 0.3,
    transfer: (cm) => (cm >= 2 && cm <= 400 ? cm * US_PER_CM : ECHO_TIMEOUT_US),
    text: "distance (cm) to echo pulse (us): t = 2 d / 0.0343 for 2 to 400 cm, else the 38 ms timeout, noise 0.3",
  },
  accelerometer: {
    id: "accelerometer",
    quantity: "acceleration",
    unit: "g",
    range: [-2, 2],
    noiseSigma: 0.01,
    transfer: (g) => g,
    text: "acceleration (g) to reading (g): clamped to the device range -2 to 2, noise 0.01",
  },
  hall: {
    id: "hall",
    quantity: "magnetic",
    unit: "gauss",
    range: [-640, 640],
    noiseSigma: 1,
    transfer: (gauss) => HALL_SUPPLY_V / 2 + HALL_SENSITIVITY_V_PER_GAUSS * gauss,
    text: "magnetic flux (gauss) to output (V): V = Vcc/2 + S B with Vcc 5 V and S 1.4 mV/gauss, range -640 to 640, noise 1",
  },
};

/** Sum of 12 uniform draws minus 6: mean 0, variance 1, and only additions, so every engine gets the same bits. */
export function irwinHall(rng: () => number): number {
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += rng();
  return sum - 6;
}

/** What the part outputs for the true quantity `x`: noise, then the range clamp, then the quantisation, then the transfer function. */
export function sample(m: SensorModel, x: number, rng: () => number): number {
  const noisy = m.noiseSigma === 0 ? x : x + irwinHall(rng) * m.noiseSigma;
  let q = Math.min(m.range[1], Math.max(m.range[0], noisy));
  if (m.quantiseTo) q = Math.round(q / m.quantiseTo) * m.quantiseTo;
  return m.transfer(q);
}
