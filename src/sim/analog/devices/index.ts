import type { Limiter, Stamper } from '../newton.ts';
import type { Element } from '../types.ts';
import { diodeDevice } from './diode.ts';

export interface NewtonDevice<E extends Element> {
  readonly kind: E['kind'];
  // why the element's parameters are unusable, or null
  validate(e: E): string | null;
  // x holds a voltage per node number, the ground entry being 0
  stamp(e: E, x: Float64Array, s: Stamper, lim: Limiter): void;
  currents(e: E, x: Float64Array): number[];
}

export const NEWTON_DEVICES = new Map<string, NewtonDevice<Element>>([[diodeDevice.kind, diodeDevice]]);
