// Lesson code templates and their parameter chips. A template is literal code
// with {{p:<paramId>}} slots (filled from the chips) and {{t:<textKey>}} slots
// (translated comments, resolved on the server before the template reaches the
// client). Everything here is pure, so the store and the tests share it.

import type { ParamChip } from '@/content/schema';

export type ParamValue = number | string | boolean;
export type ParamValues = Record<string, ParamValue>;

/** Where a chip's text sits in the code, as [from, to) character offsets. */
export interface ChipRange {
  id: string;
  from: number;
  to: number;
}

const TEXT_TOKEN = /\{\{t:([^}]+)\}\}/g;
const PARAM_TOKEN = /\{\{p:([^}]+)\}\}/g;

/** Replace every {{t:key}} with its translation. Unknown keys throw (via `text`). */
export function resolveText(source: string, text: (key: string) => string): string {
  return source.replace(TEXT_TOKEN, (_, key: string) => text(key.trim()));
}

/** The text keys a template uses, so the server can check them up front. */
export function textKeys(source: string): string[] {
  return [...source.matchAll(TEXT_TOKEN)].map((m) => m[1].trim());
}

function decimals(step: number): number {
  const s = String(step);
  const dot = s.indexOf('.');
  return dot < 0 ? 0 : s.length - dot - 1;
}

function clampNumber(chip: Extract<ParamChip, { kind: 'number' }>, v: number): number {
  const stepped = chip.step > 0 ? chip.min + Math.round((v - chip.min) / chip.step) * chip.step : v;
  const clamped = Math.min(chip.max, Math.max(chip.min, stepped));
  return Number(clamped.toFixed(decimals(chip.step)));
}

/** Coerce one value to what the chip accepts, or return its default. */
export function coerceParam(chip: ParamChip, value: unknown): ParamValue {
  switch (chip.kind) {
    case 'number': {
      const n = typeof value === 'number' ? value : typeof value === 'string' && value.trim() !== '' ? Number(value) : NaN;
      return Number.isFinite(n) ? clampNumber(chip, n) : chip.default;
    }
    case 'choice':
      return typeof value === 'string' && chip.options.some((o) => o.value === value) ? value : chip.default;
    case 'toggle':
      return typeof value === 'boolean' ? value : chip.default;
  }
}

/**
 * Apply each number chip's `keepApart` rule after `changed` moved: the other
 * value is pushed so that `a op b` holds with at least `gap` between them, and
 * when the other cannot move far enough the changed value gives way.
 */
function keepApart(params: ParamChip[], values: ParamValues, changed?: string): ParamValues {
  const out = { ...values };
  for (const chip of params) {
    if (chip.kind !== 'number' || !chip.keepApart) continue;
    const other = params.find((p) => p.id === chip.keepApart!.param);
    if (!other || other.kind !== 'number') continue;
    const { op, gap } = chip.keepApart;
    const a = out[chip.id] as number;
    const b = out[other.id] as number;
    const ok = op === '<' ? a <= b - gap : a >= b + gap;
    if (ok) continue;
    if (changed === other.id) {
      out[chip.id] = clampNumber(chip, op === '<' ? b - gap : b + gap);
      const fixed = out[chip.id] as number;
      if (op === '<' ? fixed > b - gap : fixed < b + gap) out[other.id] = clampNumber(other, op === '<' ? fixed + gap : fixed - gap);
    } else {
      out[other.id] = clampNumber(other, op === '<' ? a + gap : a - gap);
      const pushed = out[other.id] as number;
      if (op === '<' ? a > pushed - gap : a < pushed + gap) out[chip.id] = clampNumber(chip, op === '<' ? pushed - gap : pushed + gap);
    }
  }
  return out;
}

export function defaultParams(params: ParamChip[]): ParamValues {
  return keepApart(params, Object.fromEntries(params.map((p) => [p.id, p.default])));
}

/** Saved values re-validated on load: ranges clamped, toggles boolean, options existing, then the rules. */
export function normalizeParams(params: ParamChip[], saved: unknown): ParamValues {
  const raw = saved && typeof saved === 'object' ? (saved as Record<string, unknown>) : {};
  const values = Object.fromEntries(params.map((p) => [p.id, p.id in raw ? coerceParam(p, raw[p.id]) : p.default]));
  return keepApart(params, values);
}

/** Set one value and apply the rules; returns the new values (unchanged ids keep their value). */
export function setParam(params: ParamChip[], values: ParamValues, id: string, value: unknown): ParamValues {
  const chip = params.find((p) => p.id === id);
  if (!chip) return values;
  return keepApart(params, { ...values, [id]: coerceParam(chip, value) }, id);
}

/** The code text a chip puts into the sketch for a value. */
export function chipCode(chip: ParamChip, value: ParamValue): string {
  switch (chip.kind) {
    case 'number':
      return Number(value).toFixed(decimals(chip.step));
    case 'choice':
      return chip.options.find((o) => o.value === value)?.code ?? chip.options.find((o) => o.value === chip.default)?.code ?? '';
    case 'toggle':
      return value ? chip.code.on : chip.code.off;
  }
}

/** Fill the {{p:id}} slots and record where each chip landed. */
export function renderTemplate(source: string, params: ParamChip[], values: ParamValues): { code: string; chips: ChipRange[] } {
  const chips: ChipRange[] = [];
  let code = '';
  let last = 0;
  for (const m of source.matchAll(PARAM_TOKEN)) {
    const id = m[1].trim();
    const chip = params.find((p) => p.id === id);
    code += source.slice(last, m.index);
    const text = chip ? chipCode(chip, values[id] ?? chip.default) : '';
    if (chip) chips.push({ id, from: code.length, to: code.length + text.length });
    code += text;
    last = m.index + m[0].length;
  }
  code += source.slice(last);
  return { code, chips };
}

/**
 * Carry chip positions across a free edit. The edit is found as the one
 * changed region between the common prefix and suffix; chips before it stay,
 * chips after it shift, and chips the edit touched are dropped (their text is
 * the learner's now).
 */
export function mapChips(chips: ChipRange[], before: string, after: string): ChipRange[] {
  if (before === after) return chips;
  let start = 0;
  const max = Math.min(before.length, after.length);
  while (start < max && before[start] === after[start]) start++;
  let endBefore = before.length;
  let endAfter = after.length;
  while (endBefore > start && endAfter > start && before[endBefore - 1] === after[endAfter - 1]) {
    endBefore--;
    endAfter--;
  }
  const delta = endAfter - endBefore;
  const out: ChipRange[] = [];
  for (const c of chips) {
    if (c.to <= start) out.push(c);
    else if (c.from >= endBefore) out.push({ id: c.id, from: c.from + delta, to: c.to + delta });
  }
  return out;
}

/** Replace a chip's text in edited code with its new value; other chips shift. */
export function applyChip(code: string, chips: ChipRange[], chip: ParamChip, value: ParamValue): { code: string; chips: ChipRange[] } {
  const text = chipCode(chip, value);
  const hits = chips.filter((c) => c.id === chip.id).sort((a, b) => b.from - a.from);
  let next = code;
  let ranges = chips;
  for (const hit of hits) {
    next = next.slice(0, hit.from) + text + next.slice(hit.to);
    const delta = text.length - (hit.to - hit.from);
    ranges = ranges.map((c) => {
      if (c === hit || (c.id === hit.id && c.from === hit.from)) return { id: c.id, from: c.from, to: c.from + text.length };
      if (c.from >= hit.to) return { id: c.id, from: c.from + delta, to: c.to + delta };
      return c;
    });
  }
  return { code: next, chips: ranges };
}

/** Text safe to copy: real blank lines, no bidi control marks. */
export function copyText(code: string): string {
  return code.replace(/[‎‏‪-‮⁦-⁩]/g, '').replace(/\r\n?/g, '\n');
}
