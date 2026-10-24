// Reads bench facts off a lab state whose exact shape this module does not
// know, by the field names lab stores use for the same things (code, wires,
// faults, tests, ...). Lab adapters start from it and override what they know.

import type { ProposedChange, Wire } from "../tools";
import type { ApplyResult, BenchFacts, BenchTest } from "./types";

type Obj = Record<string, unknown>;

export const isObj = (value: unknown): value is Obj =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

/** First field among `names` on the state or one level down. */
export function pick(state: unknown, names: readonly string[]): unknown {
  if (!isObj(state)) return undefined;
  for (const name of names) if (state[name] !== undefined) return state[name];
  for (const value of Object.values(state)) {
    if (!isObj(value)) continue;
    for (const name of names) if (value[name] !== undefined) return value[name];
  }
  return undefined;
}

function text(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return null;
}

/** A short label for one item of a list: its id plus the fields that name it. */
export function label(item: unknown, max = 120): string {
  const plain = text(item);
  if (plain !== null) return clip(plain, max);
  if (!isObj(item)) return clip(JSON.stringify(item) ?? "", max);
  const id = text(item.id) ?? text(item.key) ?? "";
  const name = text(item.label) ?? text(item.name) ?? text(item.title) ?? text(item.type) ?? text(item.kind) ?? "";
  const message = text(item.message) ?? text(item.text) ?? text(item.detail) ?? "";
  const head = [id, name && name !== id ? name : ""].filter(Boolean).join(": ");
  return clip([head, message].filter(Boolean).join(" - ") || summarise(item, 2, max), max);
}

function list(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (isObj(value)) return Object.entries(value).map(([key, item]) => (isObj(item) ? { id: key, ...item } : { id: key, label: text(item) ?? "" }));
  return [];
}

function wireLine(item: unknown): string {
  if (isObj(item)) {
    const from = text(item.from) ?? text(item.a) ?? text(item.source);
    const to = text(item.to) ?? text(item.b) ?? text(item.target);
    if (from && to) return `${from} - ${to}${text(item.color) ? ` (${text(item.color)})` : ""}`;
    const pins = item.pins ?? item.terminals ?? item.nodes;
    if (Array.isArray(pins)) return `${text(item.id) ?? text(item.name) ?? "net"}: ${pins.map((pin) => label(pin, 40)).join(", ")}`;
  }
  return label(item);
}

function testOf(item: unknown): BenchTest {
  if (!isObj(item)) return { name: label(item), pass: null };
  const status = text(item.status)?.toLowerCase();
  const flag = item.pass ?? item.passed ?? item.ok ?? item.done;
  const pass =
    typeof flag === "boolean" ? flag : status === "pass" || status === "passed" ? true : status === "fail" || status === "failed" ? false : null;
  const detail = text(item.detail) ?? text(item.message) ?? text(item.reason) ?? undefined;
  return { name: text(item.name) ?? text(item.label) ?? text(item.id) ?? "test", pass, ...(detail ? { detail: clip(detail, 160) } : {}) };
}

function lines(value: unknown, keep: number): string[] {
  const all = typeof value === "string" ? value.split(/\r?\n/) : Array.isArray(value) ? value.map((line) => label(line, 200)) : [];
  return all.filter((line) => line.trim() !== "").slice(-keep);
}

function numbers(value: unknown): string[] {
  if (!isObj(value)) return [];
  return Object.entries(value).flatMap(([key, item]) => {
    if (typeof item === "number" && Number.isFinite(item)) return [`${key}: ${Number(item.toPrecision(4))}`];
    if (typeof item === "string" && item.length <= 40) return [`${key}: ${item}`];
    return [];
  });
}

/** Compact JSON for anything else: limited depth, list length and string size. */
export function summarise(value: unknown, depth = 3, max = 2000): string {
  const walk = (node: unknown, level: number): unknown => {
    if (typeof node === "string") return clip(node, 120);
    if (typeof node !== "object" || node === null) return typeof node === "function" ? undefined : node;
    if (level >= depth) return Array.isArray(node) ? `[${node.length} items]` : "{…}";
    if (Array.isArray(node)) {
      const head = node.slice(0, 8).map((item) => walk(item, level + 1));
      return node.length > 8 ? [...head, `…${node.length - 8} more`] : head;
    }
    return Object.fromEntries(
      Object.entries(node)
        .slice(0, 24)
        .map(([key, item]) => [key, walk(item, level + 1)]),
    );
  };
  return clip(JSON.stringify(walk(value, 0)) ?? "", max);
}

export const CODE_KEYS = ["code", "source", "sketch", "program"] as const;
const LANG_KEYS = ["lang", "language", "codeLang"] as const;
const PART_KEYS = ["parts", "components", "modules", "placed"] as const;
const NET_KEYS = ["wires", "nets", "connections", "wiring"] as const;
const ERROR_KEYS = ["errors", "compileErrors", "diagnostics"] as const;
const SERIAL_KEYS = ["serial", "serialLog", "console", "output"] as const;
const FAULT_KEYS = ["faults", "activeFaults"] as const;
const TEST_KEYS = ["tests", "results", "checks"] as const;
const NUMBER_KEYS = ["calc", "readout", "metrics", "numbers"] as const;
const CONTEXT_KEYS = ["lesson", "lessonId", "step", "stepId", "task", "taskId", "mode", "course"] as const;

const KNOWN = new Set<string>([
  ...CODE_KEYS,
  ...LANG_KEYS,
  ...PART_KEYS,
  ...NET_KEYS,
  ...ERROR_KEYS,
  ...SERIAL_KEYS,
  ...FAULT_KEYS,
  ...TEST_KEYS,
  ...NUMBER_KEYS,
  ...CONTEXT_KEYS,
]);

export function codeOf(state: unknown): { lang: string; text: string } | null {
  const code = pick(state, CODE_KEYS);
  const body = typeof code === "string" ? code : isObj(code) ? (text(code.text) ?? text(code.source)) : null;
  if (body === null) return null;
  const lang = text(pick(state, LANG_KEYS)) ?? (isObj(code) ? text(code.lang) : null) ?? "";
  return { lang, text: body };
}

export function genericFacts(state: unknown, title: string): BenchFacts {
  const context = CONTEXT_KEYS.flatMap((key) => {
    const value = text(pick(state, [key]));
    return value ? [`${key}: ${clip(value, 80)}`] : [];
  });
  const rest = isObj(state) ? Object.fromEntries(Object.entries(state).filter(([key]) => !KNOWN.has(key))) : state;
  return {
    title,
    context,
    parts: list(pick(state, PART_KEYS)).map((item) => label(item)),
    nets: list(pick(state, NET_KEYS)).map(wireLine),
    code: codeOf(state),
    errors: list(pick(state, ERROR_KEYS)).map((item) => {
      const line = isObj(item) ? (text(item.line) ?? null) : null;
      return line ? `line ${line}: ${label(item, 200)}` : label(item, 200);
    }),
    serial: lines(pick(state, SERIAL_KEYS), 20),
    faults: list(pick(state, FAULT_KEYS)).map((item) => label(item)),
    tests: list(pick(state, TEST_KEYS)).map(testOf),
    numbers: numbers(pick(state, NUMBER_KEYS)),
    other: rest == null || (isObj(rest) && Object.keys(rest).length === 0) ? "" : summarise(rest),
  };
}

const wireText = (w: Wire) => `${w.from} - ${w.to}`;

/**
 * The before/after text of a change, without store actions: enough for the
 * change card to show the diff and offer to copy it when the lab's adapter
 * cannot dispatch the change itself.
 */
export function previewChange(facts: BenchFacts, change: ProposedChange): ApplyResult {
  if (change.kind === "code") {
    const before = facts.code?.text ?? "";
    if (change.find === "") return { ok: true, change: { actions: [], before, after: change.replace } };
    const at = before.indexOf(change.find);
    if (at === -1) return { ok: false, error: "propose_change: find text is not in the current code" };
    if (before.indexOf(change.find, at + 1) !== -1) return { ok: false, error: "propose_change: find text occurs more than once; quote more of it" };
    return { ok: true, change: { actions: [], before, after: before.slice(0, at) + change.replace + before.slice(at + change.find.length) } };
  }
  if (change.kind === "wire") {
    const removed = new Set(change.disconnect.map(wireText));
    const kept = facts.nets.filter((line) => !removed.has(line.replace(/ \(.*\)$/, "")));
    const after = [...kept, ...change.connect.map(wireText)];
    return { ok: true, change: { actions: [], before: facts.nets.join("\n"), after: after.join("\n") } };
  }
  const removed = new Set(change.remove);
  const kept = facts.parts.filter((line) => !removed.has(line.split(":")[0]));
  const set = change.set.map((s) => `${s.id}: ${s.prop} = ${String(s.value)}`);
  const added = change.add.map((a) => `${a.id ?? "new"}: ${a.part}`);
  return { ok: true, change: { actions: [], before: facts.parts.join("\n"), after: [...kept, ...set, ...added].join("\n") } };
}
