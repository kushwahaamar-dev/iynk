import type { PartnerSources } from "../sources.ts";
import { cleanField } from "../context/sanitize.ts";

export type RefKind = "component" | "pin" | "net" | "source" | "event" | "part" | "sim";

export type Ref = {
  kind: RefKind;
  raw: string;
  id: string;
  pin?: string;
  from?: number;
  to?: number;
  field?: string;
};

const COMPONENT_ID = /^(?:cmp|brd)_[a-z0-9][a-z0-9_-]{0,63}$/;
const NET_ID = /^net_[a-z0-9][a-z0-9_-]{0,63}$/;
const SOURCE_ID = /^src_[a-z0-9][a-z0-9_-]{0,63}$/;
const PIN_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,47}$/;
const PART_REF = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*\.[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const FIELD = /^[A-Za-z0-9_.[\]-]{1,80}$/;
const EVENT = /^serial\/\d{1,9}$/;
const MAX_TOKEN = 160;
const MAX_NEAREST = 5;

function parseLines(text: string): { from: number; to: number } | null {
  const m = /^(\d{1,6})(?:-(\d{1,6}))?$/.exec(text);
  if (!m) return null;
  const from = Number(m[1]);
  const to = m[2] === undefined ? from : Number(m[2]);
  return from >= 1 && to >= from ? { from, to } : null;
}

/** Reads one reference token: `cmp_r1`, `cmp_r1.P1`, `net_d12`, `src_main:3-4`, `ev:serial/2`, `part:core.led-5mm#ratings.if_max`, `sim:cmp_led1.I`. */
export function parseRef(token: string): Ref | null {
  if (token.length === 0 || token.length > MAX_TOKEN) return null;
  const raw = token;

  if (token.startsWith("ev:")) {
    return EVENT.test(token.slice(3)) ? { kind: "event", raw, id: token.slice(3) } : null;
  }
  if (token.startsWith("part:")) {
    const [ref, field, ...rest] = token.slice(5).split("#");
    if (rest.length > 0 || !PART_REF.test(ref) || (field !== undefined && !FIELD.test(field))) return null;
    return field === undefined ? { kind: "part", raw, id: ref } : { kind: "part", raw, id: ref, field };
  }
  if (token.startsWith("sim:")) {
    const target = token.slice(4);
    const dot = target.indexOf(".");
    const owner = dot < 0 ? target : target.slice(0, dot);
    const rest = dot < 0 ? "" : target.slice(dot + 1);
    if (!COMPONENT_ID.test(owner) && !NET_ID.test(owner)) return null;
    if (dot >= 0 && !FIELD.test(rest)) return null;
    return { kind: "sim", raw, id: target };
  }

  const colon = token.indexOf(":");
  if (colon >= 0) {
    const id = token.slice(0, colon);
    const lines = parseLines(token.slice(colon + 1));
    return SOURCE_ID.test(id) && lines ? { kind: "source", raw, id, from: lines.from, to: lines.to } : null;
  }

  const dot = token.indexOf(".");
  if (dot >= 0) {
    const id = token.slice(0, dot);
    const pin = token.slice(dot + 1);
    return COMPONENT_ID.test(id) && PIN_ID.test(pin) ? { kind: "pin", raw, id, pin } : null;
  }
  if (COMPONENT_ID.test(token)) return { kind: "component", raw, id: token };
  if (NET_ID.test(token)) return { kind: "net", raw, id: token };
  if (SOURCE_ID.test(token)) return { kind: "source", raw, id: token };
  return null;
}

function distance(a: string, b: string): number {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = row;
  }
  return prev[b.length];
}

const prefixOf = (id: string): string => id.slice(0, id.indexOf("_") + 1);

/** The ids closest to `wanted`: those with the same prefix (`cmp_`) first, then by edit distance, at most `k` (5). */
export function nearestIds(wanted: string, ids: readonly string[], k: number): string[] {
  const prefix = prefixOf(wanted);
  return ids
    .map((id) => ({ id, same: prefix !== "" && prefixOf(id) === prefix ? 0 : 1, d: distance(wanted, id) }))
    .sort((a, b) => a.same - b.same || a.d - b.d || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    .slice(0, Math.min(k, MAX_NEAREST))
    .map((c) => c.id);
}

function idsOf(kind: RefKind, s: PartnerSources): string[] {
  const doc = s.project().doc;
  switch (kind) {
    case "component":
    case "pin":
      return [...doc.boards.map((b) => b.id), ...doc.components.map((c) => c.id)];
    case "net":
      return doc.nets.map((n) => n.id);
    case "source":
      return doc.sources.map((f) => f.id);
    case "part":
      return [...new Set(s.registry().list().map((p) => p.ref))];
    case "sim":
      return (s.run()?.readings ?? []).map((r) => r.target);
    case "event":
      return (s.run()?.serial ?? []).map((_, i) => `serial/${i}`);
  }
}

/**
 * The ids a wrong token could have meant. A refdes such as `R1` is not an id; the `cmp_` or `brd_` id that carries it
 * is listed first.
 */
export function suggestIds(wanted: string, kinds: readonly RefKind[], s: PartnerSources): string[] {
  const doc = s.project().doc;
  const lower = wanted.toLowerCase();
  const byRefdes = [...doc.boards, ...doc.components].filter((c) => c.refdes.toLowerCase() === lower).map((c) => c.id);
  const pool = [...new Set(kinds.flatMap((k) => idsOf(k, s)))];
  const rest = nearestIds(wanted, pool, MAX_NEAREST).filter((id) => !byRefdes.includes(id));
  return [...byRefdes, ...rest].slice(0, MAX_NEAREST);
}

const lineCount = (text: string): number => (text === "" ? 0 : text.split("\n").length);

function hasPin(r: Ref, s: PartnerSources): boolean {
  const doc = s.project().doc;
  const owner = [...doc.boards, ...doc.components].find((c) => c.id === r.id);
  if (!owner || r.pin === undefined) return false;
  const { ref, version } = owner.definition;
  const snapshot = doc.dependencies.components.find((d) => d.ref === ref && d.version === version);
  if (snapshot) return snapshot.interface.pins.some((p) => p.id === r.pin);
  const descriptor = s.registry().get(ref, version);
  return descriptor ? descriptor.pins.some((p) => p.id === r.pin) : false;
}

/** Checks a parsed reference against the live document. A miss lists the nearest valid ids. */
export function resolveRef(r: Ref, s: PartnerSources): { ok: true; label: string; target: string } | { ok: false; nearest: string[] } {
  const doc = s.project().doc;
  const miss = () => ({ ok: false as const, nearest: nearestIds(r.id, idsOf(r.kind, s), MAX_NEAREST) });
  const label = (text: string | undefined, fallback: string) => cleanField(text ?? fallback, 60).text;

  switch (r.kind) {
    case "component": {
      const c = [...doc.boards, ...doc.components].find((x) => x.id === r.id);
      return c ? { ok: true, label: label(c.label, c.refdes), target: r.id } : miss();
    }
    case "pin": {
      const c = [...doc.boards, ...doc.components].find((x) => x.id === r.id);
      if (!c) return miss();
      return hasPin(r, s) ? { ok: true, label: `${label(c.label, c.refdes)}.${r.pin}`, target: `${r.id}.${r.pin}` } : miss();
    }
    case "net": {
      const n = doc.nets.find((x) => x.id === r.id);
      return n ? { ok: true, label: label(n.name, n.id), target: r.id } : miss();
    }
    case "source": {
      const f = doc.sources.find((x) => x.id === r.id);
      if (!f) return miss();
      const outside = r.to !== undefined && r.to > lineCount(f.content);
      return outside ? miss() : { ok: true, label: label(f.path, f.id), target: r.raw };
    }
    case "part": {
      const has = s.registry().latest(r.id) !== undefined;
      return has ? { ok: true, label: r.id, target: r.raw } : miss();
    }
    case "event": {
      const index = Number(r.id.slice(r.id.indexOf("/") + 1));
      const count = s.run()?.serial.length ?? 0;
      return index < count ? { ok: true, label: r.id, target: r.raw } : miss();
    }
    case "sim": {
      const has = (s.run()?.readings ?? []).some((x) => x.target === r.id);
      return has ? { ok: true, label: r.id, target: r.raw } : miss();
    }
  }
}
