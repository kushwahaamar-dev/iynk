import type { LocalizedText, Text } from "../generated/types.ts";
import type { ConvertParamChip, Texts } from "./types.ts";

export type ParamValue = number | string | boolean;
export type ParamValues = Record<string, ParamValue>;

/** A text key to the text a project stores. */
export type Translate = (key: string) => Text;

const OTHER_LANGUAGES = ["de", "es", "fr", "hi", "zh"] as const;
const TEXT_TOKEN = /\{\{t:([^}]+)\}\}/g;
const PARAM_TOKEN = /\{\{p:([^}]+)\}\}/g;

/**
 * The six-language text of a key. `en` is always set; another language is set when its file has the key. A key without
 * an English text is passed to `onMissing` and becomes its own English text, so nothing is dropped.
 */
export function toText(texts: Texts, key: string, onMissing?: (key: string) => void): Text {
  const en = texts.en[key];
  if (en === undefined) onMissing?.(key);
  const text: LocalizedText = { en: en ?? key };
  for (const language of OTHER_LANGUAGES) {
    const translated = texts[language][key];
    if (translated !== undefined) text[language] = translated;
  }
  return text;
}

export const translator =
  (texts: Texts, onMissing?: (key: string) => void): Translate =>
  (key) =>
    toText(texts, key, onMissing);

function decimals(step: number): number {
  const s = String(step);
  const dot = s.indexOf(".");
  return dot < 0 ? 0 : s.length - dot - 1;
}

type NumberChip = Extract<ConvertParamChip, { kind: "number" }>;

function clampNumber(chip: NumberChip, v: number): number {
  const stepped = chip.step > 0 ? chip.min + Math.round((v - chip.min) / chip.step) * chip.step : v;
  const clamped = Math.min(chip.max, Math.max(chip.min, stepped));
  return Number(clamped.toFixed(decimals(chip.step)));
}

/** Applies each number chip's `keepApart` rule to the defaults, the way `defaultParams` of the lab does. */
function keepApart(params: readonly ConvertParamChip[], values: ParamValues): ParamValues {
  const out = { ...values };
  for (const chip of params) {
    if (chip.kind !== "number" || !chip.keepApart) continue;
    const other = params.find((p) => p.id === chip.keepApart!.param);
    if (!other || other.kind !== "number") continue;
    const { op, gap } = chip.keepApart;
    const a = out[chip.id] as number;
    const b = out[other.id] as number;
    if (op === "<" ? a <= b - gap : a >= b + gap) continue;
    out[other.id] = clampNumber(other, op === "<" ? a + gap : a - gap);
    const pushed = out[other.id] as number;
    if (op === "<" ? a > pushed - gap : a < pushed + gap) out[chip.id] = clampNumber(chip, op === "<" ? pushed - gap : pushed + gap);
  }
  return out;
}

export function defaultParams(params: readonly ConvertParamChip[]): ParamValues {
  return keepApart(params, Object.fromEntries(params.map((p) => [p.id, p.default])));
}

/** The code text a chip puts into the sketch for a value. */
export function chipCode(chip: ConvertParamChip, value: ParamValue): string {
  switch (chip.kind) {
    case "number":
      return Number(value).toFixed(decimals(chip.step));
    case "choice":
      return chip.options.find((o) => o.value === value)?.code ?? chip.options.find((o) => o.value === chip.default)?.code ?? "";
    case "toggle":
      return value ? chip.code.on : chip.code.off;
  }
}

/** Replaces every `{{t:key}}` with its text. */
export const resolveText = (source: string, text: (key: string) => string): string =>
  source.replace(TEXT_TOKEN, (_, key: string) => text(key.trim()));

/**
 * A lesson's starter code with its `{{t:key}}` comments in English and its `{{p:id}}` slots filled from `values`. A
 * port of `resolveText` and `renderTemplate` in `src/lib/boardlab/template.ts`, which this folder cannot import.
 */
export function renderTemplate(
  source: string,
  params: readonly ConvertParamChip[],
  values: ParamValues,
  text: (key: string) => string,
): string {
  return resolveText(source, text).replace(PARAM_TOKEN, (_, id: string) => {
    const chip = params.find((p) => p.id === id.trim());
    return chip ? chipCode(chip, values[chip.id] ?? chip.default) : "";
  });
}
