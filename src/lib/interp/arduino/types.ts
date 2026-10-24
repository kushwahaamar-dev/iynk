import type { BoardProfile } from '../profiles';

/** Static C++ types the checker assigns to every expression. */
/** A C++ value at run time: number, bigint (64-bit), string (String), array, struct or library object; its static Ty says which. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type CValue = any;

export type Ty =
  | { k: 'int'; bits: 8 | 16 | 32 | 64; signed: boolean; char?: boolean }
  | { k: 'float'; bits: 32 | 64 }
  | { k: 'bool' }
  | { k: 'void' }
  | { k: 'string' }
  | { k: 'cstr' }
  | { k: 'array'; el: Ty; n: number }
  | { k: 'obj'; cls: string }
  | { k: 'struct'; name: string; fields: Map<string, Ty> }
  | { k: 'fn' };

export const T = {
  bool: { k: 'bool' } as Ty,
  void: { k: 'void' } as Ty,
  string: { k: 'string' } as Ty,
  cstr: { k: 'cstr' } as Ty,
  fn: { k: 'fn' } as Ty,
  i8: { k: 'int', bits: 8, signed: true } as Ty,
  u8: { k: 'int', bits: 8, signed: false } as Ty,
  i16: { k: 'int', bits: 16, signed: true } as Ty,
  u16: { k: 'int', bits: 16, signed: false } as Ty,
  i32: { k: 'int', bits: 32, signed: true } as Ty,
  u32: { k: 'int', bits: 32, signed: false } as Ty,
  i64: { k: 'int', bits: 64, signed: true } as Ty,
  u64: { k: 'int', bits: 64, signed: false } as Ty,
  f32: { k: 'float', bits: 32 } as Ty,
  f64: { k: 'float', bits: 64 } as Ty,
};

/** Per-target type environment: int and double widths, char signedness. */
export class TypeEnv {
  readonly int: Ty;
  readonly uint: Ty;
  readonly double: Ty;
  readonly char: Ty;
  readonly sizeT: Ty;

  constructor(readonly profile: BoardProfile) {
    this.int = profile.intBits === 16 ? T.i16 : T.i32;
    this.uint = profile.intBits === 16 ? T.u16 : T.u32;
    this.double = profile.doubleBits === 32 ? T.f32 : T.f64;
    this.char = { k: 'int', bits: 8, signed: profile.charSigned, char: true };
    this.sizeT = this.uint;
  }

  /** Map a canonical type name to a type, or undefined if unknown. */
  named(name: string): Ty | undefined {
    switch (name) {
      case 'int': case 'signed': return this.int;
      case 'unsigned int': case 'size_t': return this.uint;
      case 'short': case 'int16_t': return T.i16;
      case 'unsigned short': case 'uint16_t': return T.u16;
      case 'long': case 'int32_t': return T.i32;
      case 'unsigned long': case 'uint32_t': return T.u32;
      case 'long long': case 'int64_t': return T.i64;
      case 'unsigned long long': case 'uint64_t': return T.u64;
      case 'char': return this.char;
      case 'signed char': case 'int8_t': return T.i8;
      case 'unsigned char': case 'byte': case 'uint8_t': return T.u8;
      case 'bool': return T.bool;
      case 'float': return T.f32;
      case 'double': return this.double;
      case 'void': return T.void;
      case 'String': return T.string;
      case 'cstr': return T.cstr;
      case 'ulong': return T.u32;
    }
    return undefined;
  }

  /** Integer promotion: anything narrower than int becomes int. */
  promote(t: Ty): Ty {
    if (t.k === 'bool') return this.int;
    const intBits = this.profile.intBits;
    if (t.k === 'int' && t.bits < intBits) return this.int;
    if (t.k === 'int' && t.char) return { k: 'int', bits: t.bits, signed: t.signed };
    return t;
  }

  /** The usual arithmetic conversions for a binary operator. */
  common(a: Ty, b: Ty): Ty {
    if (a.k === 'float' || b.k === 'float') {
      const bits = Math.max(a.k === 'float' ? a.bits : 0, b.k === 'float' ? b.bits : 0) as 32 | 64;
      return bits === 64 ? T.f64 : T.f32;
    }
    const pa = this.promote(a);
    const pb = this.promote(b);
    if (pa.k !== 'int' || pb.k !== 'int') return this.int;
    if (pa.bits === pb.bits) return { k: 'int', bits: pa.bits, signed: pa.signed && pb.signed };
    // Different widths: the wider type wins (a wider signed type holds every value of a narrower unsigned one).
    return pa.bits > pb.bits ? pa : pb;
  }

  sizeOf(t: Ty): number {
    switch (t.k) {
      case 'int': return t.bits / 8;
      case 'float': return t.bits / 8;
      case 'bool': return 1;
      case 'array': return t.n * this.sizeOf(t.el);
      case 'cstr': return this.profile.intBits === 16 ? 2 : 4;
      case 'string': return this.profile.intBits === 16 ? 6 : 12;
      case 'struct': {
        let s = 0;
        for (const f of t.fields.values()) s += this.sizeOf(f);
        return s;
      }
      default: return this.profile.intBits === 16 ? 2 : 4;
    }
  }
}

export function isNumeric(t: Ty): boolean {
  return t.k === 'int' || t.k === 'float' || t.k === 'bool';
}

export function tyName(t: Ty): string {
  switch (t.k) {
    case 'int': return t.char ? 'char' : `${t.signed ? '' : 'u'}int${t.bits}_t`;
    case 'float': return t.bits === 32 ? 'float' : 'double';
    case 'array': return `${tyName(t.el)}[${t.n}]`;
    case 'obj': return t.cls;
    case 'struct': return t.name;
    case 'string': return 'String';
    case 'cstr': return 'const char*';
    default: return t.k;
  }
}

/** A converter that stores a JS value into a variable of type `t` (wrapping integers). */
export function wrapper(t: Ty): (v: number) => number {
  if (t.k === 'bool') return (v) => (v ? 1 : 0);
  if (t.k === 'float') return t.bits === 32 ? (v) => Math.fround(v) : (v) => +v;
  if (t.k !== 'int') return (v) => v;
  switch (t.bits) {
    case 8: return t.signed ? (v) => ((toInt(v) << 24) >> 24) : (v) => toInt(v) & 0xff;
    case 16: return t.signed ? (v) => ((toInt(v) << 16) >> 16) : (v) => toInt(v) & 0xffff;
    case 32: return t.signed ? (v) => toInt(v) | 0 : (v) => toInt(v) >>> 0;
    default: return t.signed ? (v) => wrap64(v, true) : (v) => wrap64(v, false);
  }
}

/** Truncate toward zero and keep the low 32 bits exactly, even for big values. */
function toInt(v: number): number {
  if (typeof v !== 'number') v = Number(v);
  if (!Number.isFinite(v)) return 0;
  const t = Math.trunc(v);
  if (t >= -2147483648 && t <= 4294967295) return t;
  // Reduce modulo 2^32 without losing the low bits.
  return Number(BigInt.asUintN(32, BigInt(t)));
}

function wrap64(v: number, signed: boolean): number {
  if (!Number.isFinite(v)) return 0;
  const t = Math.trunc(v);
  if (Number.isSafeInteger(t) && (signed || t >= 0)) return t;
  const b = signed ? BigInt.asIntN(64, BigInt(t)) : BigInt.asUintN(64, BigInt(t));
  return Number(b);
}
