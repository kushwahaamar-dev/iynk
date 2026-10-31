import { prettyPrint, utf8Encode } from "../core/canonical.ts";
import type { Clock } from "../core/ids.ts";
import { LIMITS } from "../core/limits.ts";
import { diag } from "../core/result.ts";
import type { Diagnostic } from "../core/result.ts";
import { sha256Hex } from "../core/sha256.ts";
import { parseStrict } from "../core/strict-json.ts";
import type { Project } from "../project/generated/types.ts";
import { readIynk, writeIynk } from "./iynk.ts";
import type { ImportError, ImportErrorKind, ReadReport } from "./iynk.ts";
import { readZip, utf8Decode, writeZip } from "./zip.ts";
import type { ZipErrorCode, ZipFailure, ZipFile } from "./zip.ts";

export interface ContainerAsset {
  sha256: string;
  bytes: Uint8Array;
}

export type IynkzReport = ReadReport & { assets?: ContainerAsset[] };

const PROJECT_PATH = "project.iynk";
const MANIFEST_PATH = "manifest.json";
const ASSET_PREFIX = "assets/";
const SHA256_HEX = /^[0-9a-f]{64}$/;
const SVG = "image/svg+xml";

const ZIP_KINDS: Record<ZipErrorCode, ImportErrorKind> = {
  not_a_zip: "bad-zip",
  truncated: "bad-zip",
  zip64: "bad-zip",
  encrypted: "bad-zip",
  unsupported_method: "bad-zip",
  bad_deflate: "bad-zip",
  size_mismatch: "bad-zip",
  bad_crc: "bad-zip",
  bad_path: "bad-path",
  duplicate_path: "bad-path",
  case_collision: "bad-path",
  too_many_entries: "too-many-entries",
  entry_too_large: "entry-too-large",
  total_too_large: "too-large",
  ratio: "ratio",
  inflate_overrun: "zip-bomb",
};

const importError = (failure: ZipFailure): ImportError => ({
  kind: ZIP_KINDS[failure.code],
  message: failure.message,
  ...(failure.limit ? { limit: failure.limit } : {}),
  ...(failure.path ? { path: failure.path } : {}),
});

const refuse = (error: ImportError): IynkzReport => ({ ok: false, error });

/**
 * The `.iynkz` container: `project.iynk`, one `assets/<sha256>` per distinct asset and `manifest.json`, store-only
 * and sorted, so equal input gives equal bytes. The project identity is the hash inside `project.iynk`.
 */
export function writeIynkz(doc: Project, assets: readonly ContainerAsset[]): Uint8Array {
  const files: ZipFile[] = [{ path: PROJECT_PATH, data: writeIynk(doc) }];
  const seen = new Set<string>();
  for (const asset of assets) {
    if (seen.has(asset.sha256)) continue;
    seen.add(asset.sha256);
    files.push({ path: ASSET_PREFIX + asset.sha256, data: asset.bytes });
  }
  const entries = files
    .map((f) => ({ path: f.path, bytes: f.data.length, sha256: sha256Hex(f.data) }))
    .sort((a, b) => (a.path < b.path ? -1 : 1));
  files.push({
    path: MANIFEST_PATH,
    data: utf8Encode(prettyPrint({ format: "iynk.container", version: 1, entries })),
  });
  return writeZip(files);
}

interface ManifestEntry {
  path: string;
  bytes: number;
  sha256: string;
}

const isManifestEntry = (v: unknown): v is ManifestEntry =>
  typeof v === "object" && v !== null && "path" in v && "bytes" in v && "sha256" in v;

function manifestEntries(file: ZipFile): ManifestEntry[] | null {
  const text = utf8Decode(file.data);
  const parsed = text === null ? null : parseStrict(text);
  const body = parsed?.ok ? parsed.value : null;
  if (typeof body !== "object" || body === null || !("entries" in body) || !Array.isArray(body.entries)) return null;
  return body.entries.every(isManifestEntry) ? body.entries : null;
}

function manifestWarnings(manifest: ZipFile | undefined, files: readonly ZipFile[]): Diagnostic[] {
  const unreadable = (message: string) => [diag("CONTAINER-MANIFEST", "warning", `/${MANIFEST_PATH}`, message)];
  if (!manifest) return unreadable("The container has no manifest");
  const listed = manifestEntries(manifest);
  if (!listed) return unreadable("The manifest cannot be read");
  const byPath = new Map(files.map((f) => [f.path, f]));
  return listed
    .filter((e) => {
      const file = byPath.get(e.path);
      return !file || file.data.length !== e.bytes || sha256Hex(file.data) !== e.sha256;
    })
    .map((e) => diag("CONTAINER-MANIFEST", "warning", `/${e.path}`, `${e.path} does not match the manifest`));
}

/**
 * Opens `.iynkz` bytes. The zip limits are enforced while reading, `project.iynk` goes through `readIynk`, and an
 * asset the project declares as SVG is refused until a sanitiser exists (PD-14). A manifest that disagrees with an
 * entry is a warning.
 */
export async function readIynkz(bytes: Uint8Array, clock: Clock): Promise<IynkzReport> {
  if (bytes.length > LIMITS.containerBytes) {
    return refuse({
      kind: "too-large",
      message: `The container is ${bytes.length} bytes; the limit is ${LIMITS.containerBytes}`,
      limit: "128 MiB",
    });
  }
  const zip = readZip(bytes);
  if (!zip.ok) return refuse(importError(zip.error));
  const files = zip.value.filter((f) => !f.path.endsWith("/"));

  const projectFile = files.find((f) => f.path === PROJECT_PATH);
  if (!projectFile) return refuse({ kind: "bad-zip", message: "The container has no project.iynk", path: PROJECT_PATH });
  const report = readIynk(projectFile.data, clock);
  if (!report.ok) return report;

  const assets: ContainerAsset[] = [];
  const warnings = [...report.warnings];
  for (const file of files) {
    if (!file.path.startsWith(ASSET_PREFIX)) continue;
    const sha256 = file.path.slice(ASSET_PREFIX.length);
    if (!SHA256_HEX.test(sha256)) {
      return refuse({ kind: "bad-path", message: `${file.path} is not assets/<sha256>`, path: file.path });
    }
    if (report.project.assets.some((a) => a.sha256 === sha256 && a.mediaType === SVG)) {
      return refuse({ kind: "svg-not-supported", message: `${file.path} is an SVG; SVG assets are not supported yet`, path: file.path });
    }
    if (sha256Hex(file.data) !== sha256) {
      warnings.push(diag("CONTAINER-ASSET-HASH", "warning", `/${file.path}`, `${file.path} does not match its name`));
    }
    assets.push({ sha256, bytes: file.data });
  }
  warnings.push(...manifestWarnings(files.find((f) => f.path === MANIFEST_PATH), files));
  return { ...report, warnings, assets };
}
