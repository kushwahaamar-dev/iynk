import type { Descriptor } from "@/parts/descriptor";
import { readBattery, readEsc, readFc, readFrame, readMotor, readProp, roleOf } from "@/parts/mechanics";
import type { FrameSI, Read, Role } from "@/parts/mechanics";

export type PickerFlag =
  | { kind: "cells-over-motor"; max: number }
  | { kind: "prop-over-frame"; maxIn: number }
  | { kind: "esc-volts"; max: number }
  | { kind: "missing"; path: string };

export interface PickerItem {
  id: string;
  label: string;
  role: Role;
  flags: PickerFlag[];
  read: "ok" | "partial";
  price?: { amount: number; currency: string; asOf: string; estimate: boolean };
}

export interface PickerContext {
  cells?: number;
  frame?: FrameSI | null;
  query?: string;
}

const CELL_FULL_V = 4.2;
const MM_PER_IN = 25.4;
const EPSILON = 1e-9;

const READERS: Record<Role, (d: Descriptor) => Read<unknown>> = {
  motor: readMotor,
  prop: readProp,
  esc: readEsc,
  battery: readBattery,
  frame: readFrame,
  fc: readFc,
};

const isNumber = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

export function priceOf(d: Descriptor): PickerItem["price"] {
  const raw = (d as { x_price?: Record<string, unknown> }).x_price;
  if (!raw || !isNumber(raw["amount"]) || typeof raw["currency"] !== "string" || typeof raw["as_of"] !== "string") return undefined;
  return { amount: raw["amount"], currency: raw["currency"], asOf: raw["as_of"], estimate: raw["estimate"] === true };
}

/** The most series cells a rating of `volts` allows, counting 4.2 V per cell. */
const cellsFor = (volts: number): number => Math.floor(volts / CELL_FULL_V + EPSILON);

function flagsFor(role: Role, d: Descriptor, read: Read<unknown>, ctx: PickerContext): PickerFlag[] {
  if (!read.ok) return read.missing.map((need) => ({ kind: "missing", path: need.path }));
  const flags: PickerFlag[] = [];
  const cells = ctx.cells;
  if (role === "motor" && cells !== undefined) {
    const vMax = (read.value as { v_max?: number }).v_max;
    if (vMax !== undefined && cells * CELL_FULL_V > vMax + EPSILON) flags.push({ kind: "cells-over-motor", max: cellsFor(vMax) });
  }
  if (role === "esc" && cells !== undefined) {
    const vMax = (read.value as { v_max?: number }).v_max;
    if (vMax !== undefined && cells * CELL_FULL_V > vMax + EPSILON) flags.push({ kind: "esc-volts", max: vMax });
  }
  if (role === "prop" && ctx.frame?.prop_max_in !== undefined) {
    const inches = (read.value as { d_m: number }).d_m * 1000 / MM_PER_IN;
    if (inches > ctx.frame.prop_max_in + EPSILON) flags.push({ kind: "prop-over-frame", maxIn: ctx.frame.prop_max_in });
  }
  return flags;
}

const wordsOf = (text: string): string[] => text.toLowerCase().split(/\s+/).filter(Boolean);

/** Lower is better; null when a word of the query appears nowhere in the part. */
function rank(d: Descriptor, words: readonly string[]): number | null {
  if (words.length === 0) return 0;
  const label = d.identity.model.toLowerCase();
  const other = [d.id, d.identity.mpn ?? "", ...(d.identity.tags ?? [])].join(" ").toLowerCase();
  let worst = 0;
  for (const word of words) {
    const at = label.indexOf(word);
    let score: number;
    if (at === 0) score = 0;
    else if (at > 0 && label[at - 1] === " ") score = 1;
    else if (at > 0) score = 2;
    else if (other.includes(word)) score = 3;
    else return null;
    worst = Math.max(worst, score);
  }
  return worst;
}

/** Parts of one role, matching and ranked by the search, each with the flags its pairing with the rest of the build raises. */
export function listParts(role: Role, lib: readonly Descriptor[], ctx: PickerContext): PickerItem[] {
  const words = wordsOf(ctx.query ?? "");
  const rows: { item: PickerItem; score: number }[] = [];
  for (const d of lib) {
    if (roleOf(d) !== role) continue;
    const score = rank(d, words);
    if (score === null) continue;
    const read = READERS[role](d);
    const price = priceOf(d);
    rows.push({
      score,
      item: {
        id: d.id,
        label: d.identity.model,
        role,
        flags: flagsFor(role, d, read, ctx),
        read: read.ok ? "ok" : "partial",
        ...(price ? { price } : {}),
      },
    });
  }
  return rows.sort((a, b) => a.score - b.score || a.item.label.localeCompare(b.item.label)).map((r) => r.item);
}
