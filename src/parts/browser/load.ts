import { canonicalize, utf8Length } from "../../core/canonical.ts";
import type { Diagnostic } from "../../core/result.ts";
import { parseStrict } from "../../core/strict-json.ts";
import { BUILTIN_DESCRIPTORS } from "../builtin.ts";
import type { DescriptorOrigin } from "../descriptor.ts";
import type { PartRegistry } from "../registry.ts";

const MAX_DIAGNOSTICS = 20;

export interface PartSource {
  list(): Promise<{ value: unknown; bytes: number }[]>;
}

export interface LoadResult {
  added: number;
  failed: { ref: string; diagnostics: Diagnostic[] }[];
}

/** The parts that ship inside the app. */
export function builtinSource(): PartSource {
  return {
    list: async () => BUILTIN_DESCRIPTORS.map((value) => ({ value, bytes: utf8Length(canonicalize(value)) })),
  };
}

/**
 * Parts served as files: `<baseUrl>/index.json` is a list of file names, each read relative to `baseUrl`. A file that
 * cannot be fetched or parsed makes `list` throw with the file name.
 */
export function fetchSource(baseUrl: string, fetchImpl: typeof fetch): PartSource {
  const base = baseUrl.replace(/\/+$/, "");

  async function read(name: string): Promise<{ value: unknown; text: string }> {
    const response = await fetchImpl(`${base}/${name}`);
    if (!response.ok) throw new Error(`${name}: the server answered ${response.status}`);
    const text = await response.text();
    const parsed = parseStrict(text);
    if (!parsed.ok) throw new Error(`${name}: ${parsed.error.message}`);
    return { value: parsed.value, text };
  }

  return {
    async list() {
      const index = (await read("index.json")).value;
      if (!Array.isArray(index) || !index.every((n) => typeof n === "string")) {
        throw new Error("index.json: expected a list of file names");
      }
      return Promise.all(
        index.map(async (name) => {
          const { value, text } = await read(name);
          return { value, bytes: utf8Length(text) };
        }),
      );
    },
  };
}

const refOf = (value: unknown, position: number): string => {
  const { id, version } = (value ?? {}) as { id?: unknown; version?: unknown };
  return typeof id === "string" && typeof version === "string" ? `${id}@${version}` : `#${position}`;
};

/** Installs every part the source lists. A part that fails is left out and reported with its first 20 diagnostics. */
export async function loadInto(reg: PartRegistry, src: PartSource, origin: DescriptorOrigin): Promise<LoadResult> {
  const result: LoadResult = { added: 0, failed: [] };
  (await src.list()).forEach(({ value, bytes }, position) => {
    const added = reg.add(value, { origin, bytes });
    if (added.ok) result.added += 1;
    else result.failed.push({ ref: refOf(value, position), diagnostics: added.error.slice(0, MAX_DIAGNOSTICS) });
  });
  return result;
}
