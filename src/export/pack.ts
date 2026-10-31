import { prettyPrint, utf8Encode } from "../core/canonical.ts";
import { sha256Hex } from "../core/sha256.ts";
import { parseStrict } from "../core/strict-json.ts";
import type { Diagnostic } from "../core/result.ts";
import { digestOf, validateDescriptor } from "../parts/descriptor.ts";
import type { Descriptor as ComponentDescriptor } from "../parts/descriptor.ts";
import { validateComponent } from "../parts/generated/validate.mjs";
import { checkPng, sanitizeSvg } from "../parts/art-sanitize.ts";
import { codeGate, qualityLabels } from "../parts/trust.ts";
import type { CodeGate, QualityLabels } from "../parts/trust.ts";
import { ZIP_LIMITS, readZip, utf8Decode, writeZip } from "./zip.ts";
import type { ZipErrorCode, ZipFile, ZipLimits } from "./zip.ts";

export const PACK_LIMITS = Object.freeze({
  compressedBytes: 8_388_608,
  uncompressedBytes: 33_554_432,
  ratio: 20,
  files: 200,
  descriptorBytes: 262_144,
  artBytes: 524_288,
});

const PACK_ZIP_LIMITS: ZipLimits = {
  entries: PACK_LIMITS.files,
  entryBytes: PACK_LIMITS.uncompressedBytes,
  totalBytes: PACK_LIMITS.uncompressedBytes,
  ratio: PACK_LIMITS.ratio,
  ratioFloorBytes: ZIP_LIMITS.ratioFloorBytes,
};

const MANIFEST_PATH = "pack.json";
const COMPONENT_FILE = "component.json";
const PACK_FORMAT = "iynk.pack/1";
const PACK_VERSION = /^iynk\.pack\/([0-9]+)$/;
const SHA256_HEX = /^[0-9a-f]{64}$/;
const MIB = 1_048_576;

export interface PackManifest {
  pack: "iynk.pack/1";
  id: string;
  version: string;
  components: { id: string; version: string; sha256: string }[];
  files: { path: string; bytes: number; sha256: string }[];
  license: string;
  authors: string[];
  created: string;
}

export type PackErrorCode =
  | "not-a-pack"
  | "newer-pack"
  | "too-big-compressed"
  | "too-big-uncompressed"
  | "ratio"
  | "too-many-files"
  | "path"
  | "duplicate"
  | "symlink"
  | "hash"
  | "manifest"
  | "schema"
  | "core-id";

export interface PackError {
  code: PackErrorCode;
  limit?: string;
  path?: string;
  detail: string;
}

export interface PackItem {
  id: string;
  version: string;
  descriptor: ComponentDescriptor;
  digest: string;
  issues: Diagnostic[];
  labels: QualityLabels;
  code: CodeGate | null;
  artWarnings: string[];
  /** Descriptor-relative path to bytes, without `component.json`. */
  files: ReadonlyMap<string, Uint8Array>;
  collision?: { installedDigest: string };
}

export type PackPlan =
  | { ok: true; manifest: PackManifest; packSha256: string; sender: string; items: PackItem[] }
  | { ok: false; error: PackError };

export interface ReadContext {
  sender: string;
  /** Digest of every installed part, keyed by `id@version`. */
  installed: ReadonlyMap<string, string>;
  builtinRefs: ReadonlySet<string>;
  causeIds: ReadonlySet<string>;
}

const ZIP_CODES: Record<ZipErrorCode, PackErrorCode> = {
  not_a_zip: "not-a-pack",
  truncated: "not-a-pack",
  zip64: "not-a-pack",
  encrypted: "not-a-pack",
  unsupported_method: "not-a-pack",
  bad_deflate: "not-a-pack",
  bad_crc: "not-a-pack",
  size_mismatch: "manifest",
  inflate_overrun: "manifest",
  bad_path: "path",
  duplicate_path: "duplicate",
  case_collision: "duplicate",
  too_many_entries: "too-many-files",
  entry_too_large: "too-big-uncompressed",
  total_too_large: "too-big-uncompressed",
  ratio: "ratio",
};

const refuse = (code: PackErrorCode, detail: string, extra: { limit?: string; path?: string } = {}): PackPlan => ({
  ok: false,
  error: { code, detail, ...extra },
});

const packKey = (id: string, version: string): string => `${id}@${version}`;
const componentDir = (id: string, version: string): string => `components/${id}/${version}/`;
const foldedPath = (path: string): string => path.normalize("NFC").toLowerCase();

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const isStrings = (value: unknown): value is string[] => Array.isArray(value) && value.every((v) => typeof v === "string");

function readManifest(value: unknown): PackManifest | null {
  if (!isRecord(value) || value.pack !== PACK_FORMAT) return null;
  const { id, version, components, files, license, authors, created } = value;
  if (typeof id !== "string" || typeof version !== "string" || typeof license !== "string" || typeof created !== "string") return null;
  if (!isStrings(authors) || !Array.isArray(components) || !Array.isArray(files)) return null;
  const goodComponents = components.every(
    (c) => isRecord(c) && typeof c.id === "string" && typeof c.version === "string" && typeof c.sha256 === "string" && SHA256_HEX.test(c.sha256),
  );
  const goodFiles = files.every(
    (f) => isRecord(f) && typeof f.path === "string" && Number.isSafeInteger(f.bytes) && typeof f.sha256 === "string" && SHA256_HEX.test(f.sha256),
  );
  return goodComponents && goodFiles ? (value as unknown as PackManifest) : null;
}

type Entries = ReadonlyMap<string, Uint8Array>;

function checkListing(manifest: PackManifest, entries: Entries): PackError | null {
  const listed = new Set<string>([MANIFEST_PATH]);
  const dirs: string[] = [];
  for (const c of manifest.components) {
    const path = componentDir(c.id, c.version) + COMPONENT_FILE;
    const data = entries.get(path);
    if (listed.has(path)) return { code: "manifest", path, detail: `${path} is listed twice` };
    if (!data) return { code: "manifest", path, detail: `the manifest lists ${path}, which the pack does not hold` };
    if (sha256Hex(data) !== c.sha256) return { code: "hash", path, detail: `${path} does not match its hash in the manifest` };
    listed.add(path);
    dirs.push(componentDir(c.id, c.version));
  }
  for (const f of manifest.files) {
    const data = entries.get(f.path);
    if (listed.has(f.path)) return { code: "manifest", path: f.path, detail: `${f.path} is listed twice` };
    if (!data) return { code: "manifest", path: f.path, detail: `the manifest lists ${f.path}, which the pack does not hold` };
    if (data.length !== f.bytes || sha256Hex(data) !== f.sha256) {
      return { code: "hash", path: f.path, detail: `${f.path} does not match its size or hash in the manifest` };
    }
    if (!dirs.some((dir) => f.path.startsWith(dir))) {
      return { code: "manifest", path: f.path, detail: `${f.path} does not belong to a listed part` };
    }
    listed.add(f.path);
  }
  for (const path of entries.keys()) {
    if (!listed.has(path)) return { code: "manifest", path, detail: `${path} is in the pack but not in the manifest` };
  }
  return null;
}

function checkAssets(def: ComponentDescriptor, entries: Entries): PackError | null {
  const dir = componentDir(def.id, def.version);
  for (const asset of def.visual.assets ?? []) {
    const data = entries.get(dir + asset.path);
    if (!data || sha256Hex(data) !== asset.sha256) {
      return { code: "hash", path: dir + asset.path, detail: `${asset.path} of ${def.id} is missing or does not match its hash` };
    }
  }
  return null;
}

function artWarningsOf(def: ComponentDescriptor, entries: Entries): string[] {
  const dir = componentDir(def.id, def.version);
  const warnings: string[] = [];
  for (const asset of def.visual.assets ?? []) {
    const data = entries.get(dir + asset.path);
    if (!data) {
      warnings.push(`${asset.path}: missing`);
    } else if (data.length > PACK_LIMITS.artBytes) {
      warnings.push(`${asset.path}: too-big`);
    } else if (asset.media_type === "image/png") {
      const png = checkPng(data);
      if (!png.ok) warnings.push(`${asset.path}: ${png.error}`);
    } else if (asset.media_type === "image/svg+xml") {
      const text = utf8Decode(data);
      if (text === null) {
        warnings.push(`${asset.path}: not-xml`);
        continue;
      }
      const svg = sanitizeSvg(text);
      if (!svg.ok) {
        warnings.push(`${asset.path}: ${svg.error}`);
      } else {
        const removed = [...svg.removed.elements, ...svg.removed.attributes];
        if (removed.length > 0) warnings.push(`${asset.path}: removed ${removed.join(", ")}`);
      }
    }
  }
  return warnings;
}

/**
 * Describes each part for the dialog: the checks an imported part must pass, its quality labels, whether it holds
 * code, art that did not survive and whether it collides with an installed part. `files` is keyed by pack path
 * (`components/<id>/<version>/art/x.svg`). Nothing is written.
 */
export async function planImportedParts(defs: readonly ComponentDescriptor[], files: Entries, ctx: ReadContext): Promise<PackItem[]> {
  return defs.map((descriptor) => {
    const { id, version } = descriptor;
    const digest = digestOf(descriptor);
    const dir = componentDir(id, version);
    const issues = validateDescriptor(descriptor, {
      ctx: { trust: "imported", builtinRefs: ctx.builtinRefs, causeIds: ctx.causeIds, candidateDigest: digest },
    }).diagnostics;
    const own = new Map<string, Uint8Array>();
    for (const [path, data] of files) {
      if (path.startsWith(dir) && path !== dir + COMPONENT_FILE) own.set(path.slice(dir.length), data);
    }
    const installedDigest = ctx.installed.get(packKey(id, version));
    return {
      id,
      version,
      descriptor,
      digest,
      issues,
      labels: qualityLabels(descriptor, issues),
      code: codeGate(descriptor),
      artWarnings: artWarningsOf(descriptor, files),
      files: own,
      ...(installedDigest !== undefined && installedDigest !== digest ? { collision: { installedDigest } } : {}),
    };
  });
}

function checkEntries(files: readonly ZipFile[], compressed: number): PackError | null {
  const seen = new Map<string, string>();
  let total = 0;
  for (const file of files) {
    if (file.symlink) return { code: "symlink", path: file.path, detail: `${file.path} is a symbolic link` };
    const key = foldedPath(file.path);
    const earlier = seen.get(key);
    if (earlier !== undefined) return { code: "duplicate", path: file.path, detail: `${earlier} and ${file.path} are the same name` };
    seen.set(key, file.path);
    total += file.data.length;
  }
  if (total > ZIP_LIMITS.ratioFloorBytes && total > PACK_LIMITS.ratio * compressed) {
    return { code: "ratio", limit: `${PACK_LIMITS.ratio} to 1`, detail: `the pack unpacks to ${total} bytes from ${compressed}; the limit is ${PACK_LIMITS.ratio} to 1` };
  }
  return null;
}

function parseJsonEntry(data: Uint8Array, maxBytes: number): unknown {
  const text = utf8Decode(data);
  if (text === null) return undefined;
  const parsed = parseStrict(text, { maxBytes });
  return parsed.ok ? parsed.value : undefined;
}

/**
 * Reads a `.iynkpack`. Everything is checked before the plan is returned and nothing is written, so a refusal
 * changes nothing. The checks run in a fixed order, so each hostile input has exactly one code.
 */
export async function readPack(bytes: Uint8Array, ctx: ReadContext): Promise<PackPlan> {
  if (bytes.length > PACK_LIMITS.compressedBytes) {
    return refuse("too-big-compressed", `the pack is over ${PACK_LIMITS.compressedBytes / MIB} MiB`, { limit: `${PACK_LIMITS.compressedBytes / MIB} MiB` });
  }
  const zip = readZip(bytes, PACK_ZIP_LIMITS);
  if (!zip.ok) {
    const { code, message, path, limit } = zip.error;
    return refuse(ZIP_CODES[code], message, { ...(path ? { path } : {}), ...(limit ? { limit } : {}) });
  }
  const wrong = checkEntries(zip.value, bytes.length);
  if (wrong) return { ok: false, error: wrong };

  const entries: Entries = new Map(zip.value.map((f) => [f.path, f.data]));
  const manifestBytes = entries.get(MANIFEST_PATH);
  if (!manifestBytes) return refuse("not-a-pack", "there is no pack.json in this file");
  const raw = parseJsonEntry(manifestBytes, PACK_LIMITS.descriptorBytes);
  const format = isRecord(raw) && typeof raw.pack === "string" ? PACK_VERSION.exec(raw.pack) : null;
  if (format && Number(format[1]) > 1) return refuse("newer-pack", `this pack is ${(raw as { pack: string }).pack}; update iynk to open it`);
  const manifest = readManifest(raw);
  if (!manifest) {
    return refuse(isRecord(raw) && raw.pack === PACK_FORMAT ? "manifest" : "not-a-pack", "pack.json is not a pack manifest", { path: MANIFEST_PATH });
  }
  if (manifest.components.length === 0) return refuse("manifest", "the pack holds no parts", { path: MANIFEST_PATH });

  const listing = checkListing(manifest, entries);
  if (listing) return { ok: false, error: listing };

  const defs: ComponentDescriptor[] = [];
  for (const c of manifest.components) {
    const path = componentDir(c.id, c.version) + COMPONENT_FILE;
    const value = parseJsonEntry(entries.get(path) as Uint8Array, PACK_LIMITS.descriptorBytes);
    if (!isRecord(value)) {
      return refuse("schema", `${path} is not a readable part file; the limit is ${PACK_LIMITS.descriptorBytes / 1024} KiB`, {
        path,
        limit: `${PACK_LIMITS.descriptorBytes / 1024} KiB`,
      });
    }
    if (typeof value.id === "string" && value.id.split(".")[0] === "core") {
      return refuse("core-id", `${value.id} is in the core namespace, which only ships with iynk`, { path });
    }
    if (!validateComponent(value)) {
      const first = validateDescriptor(value).diagnostics[0];
      return refuse("schema", first ? `${first.code} ${first.path || "/"} ${first.message}` : "the part file does not fit the schema", { path });
    }
    const def = value as unknown as ComponentDescriptor;
    if (def.id !== c.id || def.version !== c.version) {
      return refuse("manifest", `${path} holds ${packKey(def.id, def.version)}, not ${packKey(c.id, c.version)}`, { path });
    }
    const art = checkAssets(def, entries);
    if (art) return { ok: false, error: art };
    defs.push(def);
  }
  if (new Set(defs.map((d) => packKey(d.id, d.version))).size !== defs.length) {
    return refuse("manifest", "the manifest lists one part version twice", { path: MANIFEST_PATH });
  }

  const items = await planImportedParts(defs, entries, ctx);
  for (const item of items) {
    const error = item.issues.find((issue) => issue.severity === "error");
    if (error) {
      return refuse("schema", `${error.code} ${error.path || "/"} ${error.message}`, { path: componentDir(item.id, item.version) + COMPONENT_FILE });
    }
  }
  return { ok: true, manifest, packSha256: sha256Hex(bytes), sender: ctx.sender, items };
}

const licenseRank = (license: string): number => {
  if (license === "LicenseRef-local-private") return 0;
  if (license === "LicenseRef-iynk-pending") return 1;
  return license.startsWith("LicenseRef-") ? 2 : 3;
};

/** The most restrictive licence among the parts: a private one first, then a pending one, then any custom one. */
export function strictestLicense(defs: readonly ComponentDescriptor[]): string {
  const licenses = defs.map((d) => d.provenance.license).sort();
  return licenses.reduce((a, b) => (licenseRank(b) < licenseRank(a) ? b : a));
}

export interface PackMeta {
  id: string;
  version: string;
  /** Defaults to the strictest licence among the parts. */
  license?: string;
  authors: string[];
  createdIso: string;
}

/** Deterministic: sorted entries, fixed timestamps, no extra fields. The same parts always give the same bytes. */
export async function buildPack(parts: readonly { def: ComponentDescriptor; files: Entries }[], meta: PackMeta): Promise<Uint8Array> {
  const core = parts.find(({ def }) => def.id.split(".")[0] === "core");
  if (core) throw new Error(`${core.def.id} ships with iynk and is not exported`);

  const zipFiles: ZipFile[] = [];
  const components: PackManifest["components"] = [];
  const listed: PackManifest["files"] = [];
  for (const { def, files } of parts) {
    const dir = componentDir(def.id, def.version);
    const descriptor = utf8Encode(prettyPrint(def));
    zipFiles.push({ path: dir + COMPONENT_FILE, data: descriptor });
    components.push({ id: def.id, version: def.version, sha256: sha256Hex(descriptor) });
    for (const [path, data] of files) {
      zipFiles.push({ path: dir + path, data });
      listed.push({ path: dir + path, bytes: data.length, sha256: sha256Hex(data) });
    }
  }
  const order = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
  const manifest: PackManifest = {
    pack: PACK_FORMAT,
    id: meta.id,
    version: meta.version,
    components: components.sort((a, b) => order(a.id + "@" + a.version, b.id + "@" + b.version)),
    files: listed.sort((a, b) => order(a.path, b.path)),
    license: meta.license ?? strictestLicense(parts.map((p) => p.def)),
    authors: [...new Set(meta.authors)].sort(),
    created: meta.createdIso,
  };
  zipFiles.push({ path: MANIFEST_PATH, data: utf8Encode(prettyPrint(manifest)) });
  return writeZip(zipFiles);
}
