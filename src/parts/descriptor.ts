import { canonicalize, utf8Length } from "../core/canonical.ts";
import { LIMITS } from "../core/limits.ts";
import { diag } from "../core/result.ts";
import type { Diagnostic } from "../core/result.ts";
import { sha256Hex } from "../core/sha256.ts";
import type { Component } from "./generated/types.ts";
import { validateComponent } from "./generated/validate.mjs";
import { semanticChecks } from "./semantic.ts";

export type Descriptor = Component;

export type DescriptorOrigin = "core" | "local-user" | "imported-pack";

export interface DescriptorCheck {
  ok: boolean;
  diagnostics: Diagnostic[];
}

export interface DescriptorOptions {
  /** Where the file came from. Defaults to the origin the descriptor claims. */
  origin?: DescriptorOrigin;
  /** Size of the file as read, when the caller has it. Otherwise the canonical form is measured. */
  bytes?: number;
}

/** Words a part description must not use (D-007). */
export const BANNED_WORDS: readonly string[] = ["validated"];

const MAX_DIAGNOSTICS = 20;
const NEWER_SCHEMA = /^iynk\.component\/([0-9]+)$/;

const pointer = (...segments: (string | number)[]): string =>
  segments.map((s) => "/" + String(s).replace(/~/g, "~0").replace(/\//g, "~1")).join("");

const refused = (diagnostics: Diagnostic[]): DescriptorCheck => ({
  ok: false,
  diagnostics: diagnostics.slice(0, MAX_DIAGNOSTICS),
});

/** `sha256:` plus the hex digest of the canonical form, so key order never changes it. */
export function digestOf(d: Descriptor): string {
  return "sha256:" + sha256Hex(canonicalize(d));
}

/** Orders two `major.minor.patch` versions: negative when a is older, positive when newer, 0 when equal. */
export function versionCompare(a: string, b: string): number {
  const left = a.split(".").map(Number);
  const right = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    const diff = (left[i] ?? 0) - (right[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

function sizeOf(value: unknown, bytes: number | undefined): number | Diagnostic {
  if (bytes !== undefined) return bytes;
  try {
    return utf8Length(canonicalize(value));
  } catch (e) {
    return diag("P-SCHEMA", "error", "", `the descriptor is not plain JSON: ${e instanceof Error ? e.message : String(e)}`);
  }
}

function idChecks(d: Descriptor, origin: DescriptorOrigin): Diagnostic[] {
  const out: Diagnostic[] = [];
  const namespace = d.id.split(".")[0];
  if (d.provenance.origin !== origin) {
    out.push(diag("P-S-15", "error", "/provenance/origin", `the file claims origin ${d.provenance.origin} but was loaded as ${origin}`));
  }
  if (namespace === "core" && origin !== "core") {
    out.push(diag("P-S-15", "error", "/id", "the core. namespace belongs to parts that ship with iynk"));
  }
  if (namespace === "local" && origin !== "local-user") {
    out.push(diag("P-S-15", "error", "/id", "the local. namespace belongs to the person's own parts"));
  }
  if (origin === "local-user" && namespace !== "local") {
    out.push(diag("P-S-15", "error", "/id", "a part you made yourself needs an id that starts with local."));
  }
  return out;
}

function copyChecks(d: Descriptor): Diagnostic[] {
  const out: Diagnostic[] = [];
  const banned = new RegExp(`\\b(${BANNED_WORDS.join("|")})\\b`, "i");
  for (const field of ["what_it_models", "not_modelled"] as const) {
    d.simulation[field].forEach((text, i) => {
      for (const [lang, line] of Object.entries(text)) {
        const word = line?.match(banned)?.[1];
        if (word) {
          out.push(diag("P-COPY", "error", pointer("simulation", field, i, lang), `the word "${word.toLowerCase()}" may not be used about a part`));
        }
      }
    });
  }
  return out;
}

/**
 * Checks a part file: size cap, JSON Schema, the cross-reference rules, the id namespace rules and the copy rules.
 * Returns at most 20 diagnostics. A file that fails the schema is not checked further.
 */
export function validateDescriptor(value: unknown, opts: DescriptorOptions = {}): DescriptorCheck {
  const size = sizeOf(value, opts.bytes);
  if (typeof size !== "number") return refused([size]);
  if (size > LIMITS.descriptorBytes) {
    return refused([diag("P-SIZE", "error", "", `the descriptor is ${size} bytes; the limit is ${LIMITS.descriptorBytes}`)]);
  }

  const schema = (value as { schema?: unknown } | null)?.schema;
  const newer = typeof schema === "string" ? NEWER_SCHEMA.exec(schema) : null;
  if (newer && Number(newer[1]) > 1) {
    return refused([diag("P-NEWER", "error", "/schema", `this part was made by a newer iynk (${schema}); update iynk to use it`)]);
  }

  if (!validateComponent(value)) {
    const errors = validateComponent.errors ?? [];
    const structural = new Set(["oneOf", "anyOf", "if", "not", "allOf"]);
    const leaves = errors.filter((e) => !structural.has(e.keyword));
    return refused(
      (leaves.length > 0 ? leaves : errors).map((e) =>
        diag("P-SCHEMA", "error", e.instancePath, e.message ?? `fails ${e.keyword}`),
      ),
    );
  }

  const origin = opts.origin ?? value.provenance.origin;
  const diagnostics = [...semanticChecks(value), ...idChecks(value, origin), ...copyChecks(value)];
  return { ok: diagnostics.length === 0, diagnostics: diagnostics.slice(0, MAX_DIAGNOSTICS) };
}
