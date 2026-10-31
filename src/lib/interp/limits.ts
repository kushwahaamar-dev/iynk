import { InterpError, type SourcePos } from './errors';

export const MAX_ELEMENTS = 1_000_000;
export const MAX_STRING = 1_048_576;
export const MAX_HEAP_BYTES = 64 * 1024 * 1024;

const BYTES_PER_ELEMENT = 8;
const BYTES_PER_CHAR = 2;
/** Objects at or under this many elements are not metered, to keep small programs free. */
const METER_FLOOR = 1024;

/** Counts the large allocations of one run against a logical budget. */
export class HeapMeter {
  used = 0;

  charge(bytes: number, what: string, pos?: SourcePos): void {
    if (this.used + bytes > MAX_HEAP_BYTES) {
      throw new InterpError('limit', `${what} would take the program past ${MAX_HEAP_BYTES / 1024 / 1024} MiB of memory`, pos, 'keep fewer or smaller lists, arrays and strings');
    }
    this.used += bytes;
  }

  release(bytes: number): void {
    this.used = Math.max(0, this.used - bytes);
  }

  chargeItems(n: number, what: string, pos?: SourcePos): void {
    if (n > METER_FLOOR) this.charge(n * BYTES_PER_ELEMENT, what, pos);
  }

  chargeText(len: number, what: string, pos?: SourcePos): void {
    if (len > METER_FLOOR) this.charge(len * BYTES_PER_CHAR, what, pos);
  }
}

export function checkElements(n: number, what: string, pos?: SourcePos): void {
  if (n > MAX_ELEMENTS) {
    throw new InterpError('limit', `${what} ${n} is over the limit of 1,000,000 elements`, pos, 'use a smaller size');
  }
}

export function checkString(len: number, pos?: SourcePos): void {
  if (len > MAX_STRING) {
    throw new InterpError('limit', `a string of ${len} characters is over the limit of 1,048,576`, pos, 'build shorter text');
  }
}
