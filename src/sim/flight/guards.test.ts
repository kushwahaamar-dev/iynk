import { describe, expect, it } from 'vitest';
import { checkAll, checkField, firstNonFinite, isOutOfRange } from './guards';

const range = { min: 0, max: 10 };

describe('checkField', () => {
  it('keeps both ends of an inclusive range', () => {
    expect(checkField('x', 0, range)).toBeNull();
    expect(checkField('x', 10, range)).toBeNull();
    expect(checkField('x', -0, range)).toBeNull();
    expect(checkField('x', 10.1, range)).toEqual({ error: 'out-of-range', field: 'x', value: 10.1, min: 0, max: 10 });
    expect(checkField('x', -0.1, range)?.value).toBe(-0.1);
  });

  it('drops the lower end when it is exclusive', () => {
    expect(checkField('x', 0, { ...range, minExclusive: true })?.field).toBe('x');
    expect(checkField('x', 1e-300, { ...range, minExclusive: true })).toBeNull();
    expect(checkField('x', 10, { ...range, minExclusive: true })).toBeNull();
  });

  it('requires a whole number when asked', () => {
    expect(checkField('x', 3, { ...range, integer: true })).toBeNull();
    expect(checkField('x', 3.5, { ...range, integer: true })?.value).toBe(3.5);
  });

  it('reports NaN, infinities and non-numbers', () => {
    expect(checkField('x', NaN, range)?.value).toBeNaN();
    expect(checkField('x', Infinity, range)?.value).toBe(Infinity);
    expect(checkField('x', -Infinity, range)?.value).toBe(-Infinity);
    expect(checkField('x', '5', range)?.value).toBeNaN();
    expect(checkField('x', undefined, range)?.value).toBeNaN();
  });
});

describe('checkAll', () => {
  it('returns the first failure in order', () => {
    expect(checkAll([['a', 1, range], ['b', 11, range], ['c', -1, range]])?.field).toBe('b');
    expect(checkAll([['a', 1, range]])).toBeNull();
    expect(checkAll([])).toBeNull();
  });
});

describe('firstNonFinite', () => {
  it('finds a bad number at its dotted path', () => {
    expect(firstNonFinite('result', { a: 1, cost: { total: 2 }, list: [1, NaN] })).toMatchObject({
      field: 'result.list.1',
      min: -Number.MAX_VALUE,
      max: Number.MAX_VALUE,
    });
    expect(firstNonFinite('result', { a: 1, cruise: undefined, ok: true })).toBeNull();
    expect(firstNonFinite('result', { a: -Infinity })?.value).toBe(-Infinity);
  });
});

describe('isOutOfRange', () => {
  it('tells the error from a result', () => {
    expect(isOutOfRange(checkField('x', NaN, range))).toBe(true);
    expect(isOutOfRange({ n: 4 })).toBe(false);
    expect(isOutOfRange(null)).toBe(false);
  });
});
