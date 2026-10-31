import { canonicalize, utf8Length } from "../core/canonical.ts";
import { LIMITS } from "../core/limits.ts";
import { diag } from "../core/result.ts";
import type { Diagnostic } from "../core/result.ts";
import { sha256Hex } from "../core/sha256.ts";
import type { Component } from "./generated/types.ts";
import { validateComponent } from "./generated/validate.mjs";
import { BANNED_WORDS, copyCheck } from "./copy-check.ts";
import { semanticChecks } from "./semantic.ts";

export { BANNED_WORDS };

export type Descriptor = Component;

export type DescriptorOrigin = "core" | "local-user" | "imported-pack";

export type Trust = "core" | "local" | "imported";

export const ORIGIN_OF_TRUST: Readonly<Record<Trust, DescriptorOrigin>> = {
  core: "core",
  local: "local-user",
  imported: "imported-pack",
};

/** What the caller knows about the app and the library. A check that needs a missing set is skipped. */
export interface ValidateContext {
  trust: Trust;
  /** Digest of the descriptor being added, compared with `installed`. */
  candidateDigest?: string;
  /** Digest of every installed part, keyed by `id@version`. */
  installed?: ReadonlyMap<string, string>;
  /** Element kinds the running solver provides. */
  solverElements?: ReadonlySet<string>;
  /** Builtin behaviour refs the app ships. */
  builtinRefs?: ReadonlySet<string>;
  /** Cause and symptom ids of the core registry. */
  causeIds?: ReadonlySet<string>;
}

export interface DescriptorCheck {
  ok: boolean;
  diagnostics: Diagnostic[];
}

export interface DescriptorOptions {
  /** Where the file came from. Defaults to the origin the descriptor claims. */
  origin?: DescriptorOrigin;
  /** Size of the file as read, when the caller has it. Otherwise the canonical form is measured. */
  bytes?: number;
  /** Who is asking. Sets the origin and switches on the rules that need to know. */
  ctx?: ValidateContext;
}

const MAX_DIAGNOSTICS = 20;
const NEWER_SCHEMA = /^iynk\.component\/([0-9]+)$/;

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

function idChecks(d: Descriptor, origin: DescriptorOrigin, claimChecked: boolean): Diagnostic[] {
  const out: Diagnostic[] = [];
  const namespace = d.id.split(".")[0];
  if (!claimChecked && d.provenance.origin !== origin) {
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

  const { ctx } = opts;
  const origin = ctx ? ORIGIN_OF_TRUST[ctx.trust] : (opts.origin ?? value.provenance.origin);
  const diagnostics = [...semanticChecks(value, ctx), ...idChecks(value, origin, ctx !== undefined), ...copyCheck(value)];
  return { ok: diagnostics.every((x) => x.severity !== "error"), diagnostics: diagnostics.slice(0, MAX_DIAGNOSTICS) };
}

/** Like `validateDescriptor` for a file's text: checks the byte length, parses, and never throws. */
export function validateDescriptorText(text: string, opts: DescriptorOptions = {}): DescriptorCheck {
  const bytes = utf8Length(text);
  if (bytes > LIMITS.descriptorBytes) {
    return refused([diag("P-SIZE", "error", "", `the descriptor is ${bytes} bytes; the limit is ${LIMITS.descriptorBytes}`)]);
  }
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch (e) {
    return refused([diag("P-SCHEMA", "error", "", `the file is not valid JSON: ${e instanceof Error ? e.message : String(e)}`)]);
  }
  return validateDescriptor(value, { ...opts, bytes });
}

/** One line per finding, `code path message`, at most `max` of them. */
export function formatDiagnostics(r: DescriptorCheck, max = MAX_DIAGNOSTICS): string {
  const lines = r.diagnostics.slice(0, max).map((x) => `${x.code} ${x.path || "/"} ${x.message}`);
  const more = r.diagnostics.length - max;
  if (more > 0) lines.push(`and ${more} more`);
  return lines.join("\n");
}
