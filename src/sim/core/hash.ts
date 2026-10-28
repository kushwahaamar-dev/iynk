import { utf8Encode } from "../../core/canonical.ts";

const TWO_32 = 2 ** 32;
const PRIME_LOW = 0x1b3;

/** FNV-1a 64 on two 32-bit halves; the prime is 2^40 + 0x1b3. */
class Fnv64 {
  private hi = 0xcbf29ce4;
  private lo = 0x84222325;

  update(bytes: Uint8Array): void {
    let { hi, lo } = this;
    for (const byte of bytes) {
      lo = (lo ^ byte) >>> 0;
      const low = lo * PRIME_LOW;
      hi = (hi * PRIME_LOW + Math.floor(low / TWO_32) + ((lo << 8) >>> 0)) % TWO_32;
      lo = low % TWO_32;
    }
    this.hi = hi;
    this.lo = lo;
  }

  hex(): string {
    return this.hi.toString(16).padStart(8, "0") + this.lo.toString(16).padStart(8, "0");
  }
}

/** FNV-1a 64 of raw bytes as 16 hex digits. */
export function fnv1a64(bytes: Uint8Array): string {
  const h = new Fnv64();
  h.update(bytes);
  return h.hex();
}

const Tag = { Null: 0, Bool: 1, Int: 2, Float: 3, Str: 4, Array: 5, Object: 6 } as const;
type Tag = (typeof Tag)[keyof typeof Tag];

/**
 * Canonical byte walk for state hashes (SIMULATION 6.9): integers as 8-byte little-endian,
 * floats as IEEE bits, strings as a 4-byte length then UTF-8, objects in sorted key order.
 */
export class StateHasher {
  private readonly fnv = new Fnv64();
  private readonly scratch = new DataView(new ArrayBuffer(8));

  int(n: number): this {
    if (!Number.isSafeInteger(n)) throw new RangeError(`not a safe integer: ${n}`);
    this.scratch.setBigInt64(0, BigInt(n), true);
    return this.flush();
  }

  f64(x: number): this {
    if (!Number.isFinite(x)) throw new RangeError(`numeric-fault: ${x} cannot be hashed`);
    this.scratch.setFloat64(0, x === 0 ? 0 : x, true);
    return this.flush();
  }

  str(s: string): this {
    return this.bytes(utf8Encode(s));
  }

  bool(b: boolean): this {
    this.fnv.update(Uint8Array.of(b ? 1 : 0));
    return this;
  }

  /** A length-prefixed run of bytes. */
  bytes(b: Uint8Array): this {
    this.scratch.setUint32(0, b.length, true);
    this.fnv.update(new Uint8Array(this.scratch.buffer, 0, 4));
    this.fnv.update(b);
    return this;
  }

  /** Walks plain data: null, booleans, finite numbers, strings, arrays and objects with sorted keys. */
  obj(o: unknown): this {
    if (o === null) return this.tag(Tag.Null);
    switch (typeof o) {
      case "boolean":
        return this.tag(Tag.Bool).bool(o);
      case "number":
        return Number.isInteger(o) ? this.tag(Tag.Int).int(o) : this.tag(Tag.Float).f64(o);
      case "string":
        return this.tag(Tag.Str).str(o);
      case "object": {
        if (Array.isArray(o)) {
          this.tag(Tag.Array).int(o.length);
          for (const item of o) this.obj(item);
          return this;
        }
        const keys = Object.keys(o).sort();
        this.tag(Tag.Object).int(keys.length);
        for (const key of keys) this.str(key).obj((o as Record<string, unknown>)[key]);
        return this;
      }
      default:
        throw new TypeError(`cannot hash a ${typeof o}`);
    }
  }

  /** The hash so far as 16 hex digits. */
  hex(): string {
    return this.fnv.hex();
  }

  private tag(t: Tag): this {
    this.fnv.update(Uint8Array.of(t));
    return this;
  }

  private flush(): this {
    this.fnv.update(new Uint8Array(this.scratch.buffer, 0, 8));
    return this;
  }
}
