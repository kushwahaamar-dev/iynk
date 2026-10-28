import { prettyPrint, utf8Encode } from "../core/canonical.ts";
import type { Clock } from "../core/ids.ts";
import { LIMITS } from "../core/limits.ts";
import { diag } from "../core/result.ts";
import type { Diagnostic } from "../core/result.ts";
import { parseStrict } from "../core/strict-json.ts";
import type { Project } from "../project/generated/types.ts";
import { stateHash } from "../project/hash.ts";
import { migrate } from "../project/migrate.ts";
import { normalizeForWrite } from "../project/normalize.ts";
import { validateValue } from "../project/validate.ts";
import { utf8Decode } from "./zip.ts";

export type ImportErrorKind =
  | "too-large"
  | "bad-json"
  | "duplicate-key"
  | "too-deep"
  | "bad-envelope"
  | "newer-schema"
  | "invalid"
  | "bad-zip"
  | "zip-bomb"
  | "bad-path"
  | "too-many-entries"
  | "entry-too-large"
  | "ratio"
  | "svg-not-supported";

/** Every error carries the limit it hit (`limit`) or the entry it names (`path`) so the UI can say which. */
export interface ImportError {
  kind: ImportErrorKind;
  message: string;
  limit?: string;
  path?: string;
}

export type ReadReport =
  | { ok: true; project: Project; hash: string; hashMatches: boolean; warnings: Diagnostic[] }
  | { ok: false; error: ImportError };

const SHA256_HEX = /^[0-9a-f]{64}$/;
const FILE_KEYS = ["format", "version", "hash", "project"];
const MAX_IYNK_LIMIT = "5 MiB";

const SECRET_SHAPES: ReadonlyArray<{ name: string; pattern: RegExp }> = [
  { name: "an API key starting sk-", pattern: /sk-[A-Za-z0-9_-]{20,}/ },
  { name: "a Google key starting AIza", pattern: /AIza[0-9A-Za-z_-]{35}/ },
  { name: "a PEM private key", pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
];

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

const refuse = (kind: ImportErrorKind, message: string, extra: { limit?: string; path?: string } = {}): ReadReport => ({
  ok: false,
  error: { kind, message, ...extra },
});

const PARSE_KINDS: Record<string, ImportErrorKind> = {
  too_large: "too-large",
  duplicate_key: "duplicate-key",
  depth: "too-deep",
};

/** The `.iynk` bytes: the envelope in pretty form, UTF-8, LF, one trailing newline. Equal documents give equal bytes. */
export function writeIynk(doc: Project): Uint8Array {
  const project = normalizeForWrite(doc);
  return utf8Encode(prettyPrint({ format: "iynk.file", version: 1, hash: stateHash(project), project }));
}

/** Warnings for text in the document that has the shape of a secret, so the save UI can ask before a file leaves. */
export function secretWarnings(doc: Project): Diagnostic[] {
  const text = prettyPrint(normalizeForWrite(doc));
  return SECRET_SHAPES.filter((s) => s.pattern.test(text)).map((s) =>
    diag("SECRET-SHAPE", "warning", "", `The project holds ${s.name}`, "Remove it before sharing the file"),
  );
}

/**
 * Opens `.iynk` bytes. The size is checked first, then the text is parsed strictly, the envelope is checked, the
 * project is migrated (a newer version comes back as `newer-schema`, unopened), validated, and hashed again.
 * A stored hash that differs from the recomputed one is a warning with `hashMatches: false`, not a refusal.
 */
export function readIynk(bytes: Uint8Array, clock: Clock): ReadReport {
  if (bytes.length > LIMITS.canonicalBytes) {
    return refuse("too-large", `The file is ${bytes.length} bytes; the limit is ${LIMITS.canonicalBytes}`, {
      limit: MAX_IYNK_LIMIT,
    });
  }
  const text = utf8Decode(bytes);
  if (text === null) return refuse("bad-json", "The file is not valid UTF-8");
  const parsed = parseStrict(text, { maxBytes: LIMITS.canonicalBytes, maxDepth: LIMITS.jsonDepth });
  if (!parsed.ok) {
    const { code, message, path } = parsed.error;
    const kind = PARSE_KINDS[code] ?? "bad-json";
    return refuse(kind, message, {
      ...(path ? { path } : {}),
      ...(kind === "too-large" ? { limit: MAX_IYNK_LIMIT } : {}),
      ...(kind === "too-deep" ? { limit: `${LIMITS.jsonDepth} levels` } : {}),
    });
  }

  const envelope = parsed.value;
  if (!isRecord(envelope) || envelope.format !== "iynk.file") return refuse("bad-envelope", "This is not an iynk file");
  if (Object.keys(envelope).some((k) => !FILE_KEYS.includes(k)) || FILE_KEYS.some((k) => !(k in envelope))) {
    return refuse("bad-envelope", "The file envelope has missing or unknown fields");
  }
  if (envelope.version !== 1) return refuse("bad-envelope", "This file envelope has an unknown version");
  const storedHash = envelope.hash;
  if (typeof storedHash !== "string" || !SHA256_HEX.test(storedHash)) {
    return refuse("bad-envelope", "The file hash is not 64 hex digits", { path: "/hash" });
  }

  const migrated = migrate(envelope.project, { at: new Date(clock()).toISOString(), app: "iynk" });
  if (migrated.kind === "newer") return refuse("newer-schema", migrated.message, { path: "/project/schemaVersion" });
  if (migrated.kind === "invalid") return refuse("bad-envelope", migrated.failure.message, { path: "/project" });

  const report = validateValue(migrated.doc);
  if (!report.ok || !report.doc) {
    const first = report.first20[0];
    return refuse("invalid", first ? first.message : "The project is not valid", first?.path ? { path: first.path } : {});
  }

  const hash = stateHash(report.doc);
  const hashMatches = hash === storedHash;
  const warnings = report.diagnostics.filter((d) => d.severity === "warning");
  if (!hashMatches) {
    warnings.push(
      diag("FILE-HASH-MISMATCH", "warning", "/hash", "The stored hash does not match the project", "The file may have been edited"),
    );
  }
  return { ok: true, project: report.doc, hash, hashMatches, warnings };
}
