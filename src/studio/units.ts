/** What a value is measured in. `none` is a plain number: a ratio, a position, a count. */
export type Quantity = "ohm" | "farad" | "volt" | "amp" | "hertz" | "second" | "none";

export type ValueLimits = { min: number; max: number };

export type ParsedValue =
  | { ok: true; value: number }
  | ({ ok: false; reason: "empty" | "nan" | "range" | "unit" } & ValueLimits);

const SYMBOL: Record<Quantity, string> = { ohm: "Ω", farad: "F", volt: "V", amp: "A", hertz: "Hz", second: "s", none: "" };

/** Spellings of the unit itself, lower case, so `330R`, `330r`, `330Ω` and `330 ohm` all read the same. */
const WORDS: Record<Quantity, readonly string[]> = {
  ohm: ["r", "ω", "ohm", "ohms"],
  farad: ["f"],
  volt: ["v"],
  amp: ["a"],
  hertz: ["hz"],
  second: ["s"],
  none: [],
};

/** Powers of ten. `m` is milli and `M` is mega, so prefixes are case sensitive; `K` is accepted as kilo. */
const PREFIX: Readonly<Record<string, number>> = { p: -12, n: -9, u: -6, µ: -6, μ: -6, m: -3, k: 3, K: 3, M: 6, G: 9 };

const PREFIX_AT: Readonly<Record<number, string>> = { [-4]: "p", [-3]: "n", [-2]: "µ", [-1]: "m", 0: "", 1: "k", 2: "M", 3: "G" };

const DECIMAL = /^([+-]?)(\d+\.?\d*|\.\d+)(?:[eE]([+-]?\d+))?\s?(\p{L}*)$/u;
/** `4k7` is 4.7 k: the prefix sits where the decimal point would be. */
const POSITIONAL = /^(\d+)([RVpnuµμmkKMG])(\d+)(\p{L}*)$/u;
/** `4R7` is 4.7 ohm and `3V3` is 3.3 volt: the unit letter sits where the decimal point would be. */
const POSITIONAL_UNIT: Readonly<Record<string, Quantity>> = { R: "ohm", V: "volt" };

function powerOf(suffix: string, unit: Quantity): number | null {
  if (suffix === "") return 0;
  if (WORDS[unit].includes(suffix.toLowerCase())) return 0;
  const power = PREFIX[suffix[0]!];
  if (power === undefined || unit === "none") return null;
  const rest = suffix.slice(1);
  return rest === "" || WORDS[unit].includes(rest.toLowerCase()) ? power : null;
}

function read(input: string, unit: Quantity): number | "nan" | "unit" {
  const positional = POSITIONAL.exec(input);
  if (positional) {
    const [, whole, letter, fraction, tail] = positional;
    const own = POSITIONAL_UNIT[letter!];
    const power = own !== undefined ? (own === unit ? 0 : null) : unit === "none" ? null : PREFIX[letter!];
    const tailPower = powerOf(tail!, unit);
    if (power === null || power === undefined || tailPower !== 0) return "unit";
    return Number(`${whole}.${fraction}e${power}`);
  }
  const decimal = DECIMAL.exec(input);
  if (!decimal) return "nan";
  const [, sign, digits, exponent, suffix] = decimal;
  const power = powerOf(suffix!, unit);
  if (power === null) return "unit";
  return Number(`${sign}${digits}e${Number(exponent ?? 0) + power}`);
}

/**
 * Reads what a person typed into a value field: `330`, `330R`, `0.33k`, `4k7`, `4.7k`, `1M`, `10u`, `100n`, `1e3`, with
 * or without the unit. A decimal comma is not a number here. The limits are inclusive.
 */
export function parseValue(input: string, unit: Quantity, limits: ValueLimits): ParsedValue {
  const refused = (reason: "empty" | "nan" | "range" | "unit"): ParsedValue => ({ ok: false, reason, min: limits.min, max: limits.max });
  const text = input.trim();
  if (text === "") return refused("empty");
  const value = read(text, unit);
  if (value === "nan" || value === "unit") return refused(value);
  if (!Number.isFinite(value) || value < limits.min || value > limits.max) return refused("range");
  return { ok: true, value };
}

/** The shortest text `parseValue` reads back to the same number: `4700` ohm is `4.7kΩ`. */
export function formatValue(value: number, unit: Quantity): string {
  if (!Number.isFinite(value)) return "";
  if (unit === "none" || value === 0) return `${Number(value.toPrecision(6))}${SYMBOL[unit]}`;
  const step = Math.min(3, Math.max(-4, Math.floor(Math.log10(Math.abs(value)) / 3)));
  return `${Number((value / 10 ** (step * 3)).toPrecision(6))}${PREFIX_AT[step]}${SYMBOL[unit]}`;
}

const QUANTITY_OF: Readonly<Record<string, Quantity>> = { ohm: "ohm", F: "farad", V: "volt", A: "amp", Hz: "hertz", s: "second" };

/** The quantity of a descriptor parameter unit; anything without a symbol of its own is a plain number. */
export const quantityOf = (unit: string | undefined): Quantity => (unit === undefined ? "none" : (QUANTITY_OF[unit] ?? "none"));
