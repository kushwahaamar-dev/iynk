export const ENTITY_PREFIXES = [
  "ast", "bdy", "brd", "cmp", "flt", "frm", "grp", "ins", "jct", "jnt", "lbl",
  "mnt", "net", "op", "par", "prj", "prp", "rtm", "src", "usr", "vw", "wir",
] as const;

export type EntityPrefix = (typeof ENTITY_PREFIXES)[number];
export type EntityId<P extends EntityPrefix = EntityPrefix> = `${P}_${string}`;

/** Milliseconds since the epoch, injected so portable code never reads the system clock. */
export type Clock = () => number;

/** Random bytes, injected so portable code never reaches for a global generator. */
export interface RandomSource {
  bytes(n: number): Uint8Array;
}

export const ENTITY_ID_PATTERN = new RegExp(`^(${ENTITY_PREFIXES.join("|")})_[a-z0-9][a-z0-9_-]{0,63}$`);
export const LOCAL_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,47}$/;
export const PIN_ID_PATTERN = /^[A-Za-z][A-Za-z0-9_]{0,31}$/;
export const REFDES_PATTERN = /^[A-Za-z][A-Za-z0-9_]{0,15}$/;
export const DEF_REF_PATTERN = /^[a-z][a-z0-9]*(-[a-z0-9]+)*\.[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

const BASE32 = "abcdefghijklmnopqrstuvwxyz234567";
const CROCKFORD = "0123456789abcdefghjkmnpqrstvwxyz";
const RANDOM_CHARS = 16;
const MAX_ULID_MS = 2 ** 48 - 1;
const UNIQUE_TRIES = 8;

type CryptoLike = { getRandomValues<T extends ArrayBufferView>(a: T): T };

/** Random source backed by the platform `crypto.getRandomValues`. */
export const cryptoRandom: RandomSource = {
  bytes(n) {
    const crypto = (globalThis as { crypto?: CryptoLike }).crypto;
    if (!crypto) throw new Error("no crypto.getRandomValues; pass a RandomSource");
    return crypto.getRandomValues(new Uint8Array(n));
  },
};

function encode5(bytes: Uint8Array, chars: number, alphabet: string): string {
  let out = "";
  let acc = 0;
  let bits = 0;
  let i = 0;
  while (out.length < chars) {
    if (bits < 5) {
      acc = ((acc << 8) | bytes[i++]!) & 0xffff;
      bits += 8;
    }
    bits -= 5;
    out += alphabet[(acc >> bits) & 31];
  }
  return out;
}

const randomChars = (n: number, alphabet: string, rnd: RandomSource): string =>
  encode5(rnd.bytes(Math.ceil((n * 5) / 8)), n, alphabet);

/** A new id: the prefix, an underscore and 16 random base32 characters. Never derived from a name. */
export function newId<P extends EntityPrefix>(prefix: P, rnd: RandomSource = cryptoRandom): EntityId<P> {
  if (!ENTITY_PREFIXES.includes(prefix)) throw new Error(`unknown id prefix: ${prefix}`);
  return `${prefix}_${randomChars(RANDOM_CHARS, BASE32, rnd)}`;
}

/** A project id: `prj_` and a 26-character lowercase ULID, so ids sort by creation time. */
export function newProjectId(nowMs: number, rnd: RandomSource = cryptoRandom): EntityId<"prj"> {
  if (!Number.isInteger(nowMs) || nowMs < 0 || nowMs > MAX_ULID_MS) throw new RangeError(`not a ULID time: ${nowMs}`);
  let time = "";
  let rest = nowMs;
  for (let i = 0; i < 10; i++) {
    time = CROCKFORD[rest % 32]! + time;
    rest = Math.floor(rest / 32);
  }
  return `prj_${time}${randomChars(16, CROCKFORD, rnd)}`;
}

/** A new id that is not in `taken`; throws `id_space_exhausted` after 8 collisions. */
export function uniqueId<P extends EntityPrefix>(
  prefix: P,
  taken: ReadonlySet<string>,
  rnd: RandomSource = cryptoRandom,
): EntityId<P> {
  for (let i = 0; i < UNIQUE_TRIES; i++) {
    const id = newId(prefix, rnd);
    if (!taken.has(id)) return id;
  }
  throw new Error("id_space_exhausted");
}

/** True for a well-formed entity id, optionally of one prefix. */
export function isEntityId(s: unknown, prefix?: EntityPrefix): s is EntityId {
  if (typeof s !== "string") return false;
  const match = ENTITY_ID_PATTERN.exec(s);
  return match !== null && (prefix === undefined || match[1] === prefix);
}

/** The prefix of a well-formed entity id, else null. */
export function prefixOf(id: string): EntityPrefix | null {
  const match = ENTITY_ID_PATTERN.exec(id);
  return match ? (match[1] as EntityPrefix) : null;
}

export const isLocalId = (s: unknown): s is string => typeof s === "string" && LOCAL_ID_PATTERN.test(s);
export const isPinId = (s: unknown): s is string => typeof s === "string" && PIN_ID_PATTERN.test(s);
export const isRefdes = (s: unknown): s is string => typeof s === "string" && REFDES_PATTERN.test(s);
export const isDefRefName = (s: unknown): s is string =>
  typeof s === "string" && s.length <= 80 && DEF_REF_PATTERN.test(s);
