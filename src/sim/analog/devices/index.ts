import type { Limiter, Stamper } from '../newton.ts';
import type { Measured } from '../elements.ts';
import type { DeviceState, Element } from '../types.ts';
import { bjtDevice } from './bjt.ts';
import { diodeDevice } from './diode.ts';
import { mosDevice } from './mosfet.ts';

export interface NewtonDevice<E extends Element> {
  readonly kind: E['kind'];
  // why the element's parameters are unusable, or null
  validate(e: E): string | null;
  // x holds a voltage per node number, the ground entry being 0
  stamp(e: E, x: Float64Array, s: Stamper, lim: Limiter): void;
  currents(e: E, x: Float64Array): number[];
  // the element's branch reading at x, with its operating region where it has one
  measure(e: E, x: Float64Array): Measured & { state?: DeviceState };
}

export const NEWTON_DEVICES = new Map<string, NewtonDevice<Element>>([
  [diodeDevice.kind, diodeDevice],
  [bjtDevice.kind, bjtDevice],
  [mosDevice.kind, mosDevice],
]);
