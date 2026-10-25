// Building blocks for the native modules: functions, modules and classes written in TypeScript.

import type { Gen } from '../exec';
import { PyClass, PyInstance, PyModule, PyNative, PyProp, PyRt, type NativeFn, type PyValue } from './runtime';

export const nat = (name: string, fn: NativeFn) => new PyNative(name, fn);
export const natGen = (name: string, fn: (a: PyValue[], kw: Record<string, PyValue>) => Gen<PyValue>) => new PyNative(name, fn as NativeFn, true);

export function mod(name: string, entries: Record<string, PyValue>): PyModule {
  const m = new PyModule(name);
  for (const [k, v] of Object.entries(entries)) m.dict.set(k, v);
  return m;
}

/** A class whose methods are native; `init` fills `self.native`. */
export function nclass(name: string, methods: Record<string, (self: PyInstance, a: PyValue[], kw: Record<string, PyValue>) => PyValue>, props: Record<string, PyProp> = {}, consts: Record<string, PyValue> = {}, bases: PyClass[] = []): PyClass {
  const dict = new Map<string, PyValue>();
  for (const [k, fn] of Object.entries(methods)) dict.set(k, new PyNative(k, (a, kw) => fn(a[0], a.slice(1), kw)));
  for (const [k, p] of Object.entries(props)) dict.set(k, p);
  for (const [k, v] of Object.entries(consts)) dict.set(k, v);
  return new PyClass(name, bases, dict);
}

export function sleepGen(rt: PyRt, us: number): Gen<null> {
  return (function* () {
    if (us > 0) yield* rt.sleepUntil(rt.world.now + us);
    return null;
  })();
}
