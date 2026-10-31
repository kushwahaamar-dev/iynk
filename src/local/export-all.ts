import { prettyPrint, utf8Encode } from "@/core/canonical";
import { writeIynk } from "@/export/iynk";
import { utf8Decode, writeZip } from "@/export/zip";
import type { ZipFile } from "@/export/zip";
import type { PartsRepository } from "./parts-store";
import type { Repository } from "./repository";

const SECRET_SHAPES: ReadonlyArray<{ name: string; pattern: RegExp }> = [
  { name: "an API key starting sk-", pattern: /sk-[A-Za-z0-9_-]{20,}/ },
  { name: "a Google key starting AIza", pattern: /AIza[0-9A-Za-z_-]{35}/ },
  { name: "a PEM private key", pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  { name: "40 or more hex characters", pattern: /[0-9a-f]{40,}/i },
];

const SETTINGS_PATH = "settings.json";
const MANIFEST_PATH = "manifest.json";

/** A project file holds sha256 values on purpose (its own hash, assets, parents). A value that is only a hash is not a secret. */
const withoutHashValues = (text: string) => text.replace(/"[0-9a-f]{64}"/g, '""');

function secretWarnings(path: string, text: string): string[] {
  return SECRET_SHAPES.filter((s) => s.pattern.test(text)).map((s) => `${path} contains ${s.name}`);
}

/**
 * One `.iynkz`-style archive of everything in the repository: every live project as `<id>.iynk`, the settings text
 * the main thread read, the library parts as `parts/<id@version>.component.json` with their files beside them, and
 * `manifest.json`. The `keys`, `server`, `identity` and `journal` stores are never read.
 */
export async function exportAll(deps: {
  repo: Repository;
  parts?: PartsRepository;
  settingsJson: string | null;
  now: () => number;
}): Promise<Uint8Array> {
  const { repo, parts, settingsJson, now } = deps;
  const files: ZipFile[] = [];
  const projects: Array<{ id: string; name: string; file: string; hash: string }> = [];
  const skipped: Array<{ id: string; reason: "lost" | "missing" | "failed" }> = [];
  const library: Array<{ key: string; digest: string; file: string }> = [];
  const warnings: string[] = [];

  for (const row of await repo.list()) {
    let loaded;
    try {
      loaded = await repo.load(row.id);
    } catch {
      skipped.push({ id: row.id, reason: "failed" });
      continue;
    }
    if (loaded.status === "lost" || loaded.status === "missing") {
      skipped.push({ id: row.id, reason: loaded.status });
      continue;
    }
    if (loaded.status === "recovered") warnings.push(`${row.id} was recovered from its previous copy`);
    const { doc, hash } = loaded.rec;
    const path = `${row.id}.iynk`;
    const data = writeIynk(doc);
    const text = utf8Decode(data);
    if (text !== null) {
      warnings.push(...secretWarnings(path, withoutHashValues(text)));
    }
    files.push({ path, data });
    projects.push({ id: row.id, name: row.name, file: path, hash });
  }

  for (const rec of (await parts?.list()) ?? []) {
    const file = `parts/${rec.key}.component.json`;
    files.push({ path: file, data: utf8Encode(prettyPrint(rec.descriptor)) });
    for (const [path, sha256] of Object.entries(rec.files)) {
      const blob = await parts?.getFile(sha256);
      if (blob) files.push({ path: `parts/${rec.key}/${path}`, data: new Uint8Array(await blob.arrayBuffer()) });
      else warnings.push(`${rec.key} lacks its file ${path}`);
    }
    library.push({ key: rec.key, digest: rec.digest, file });
  }

  if (settingsJson !== null) {
    warnings.push(...secretWarnings(SETTINGS_PATH, settingsJson));
    files.push({ path: SETTINGS_PATH, data: utf8Encode(settingsJson) });
  }

  files.push({
    path: MANIFEST_PATH,
    data: utf8Encode(
      prettyPrint({
        format: "iynk.export",
        version: 1,
        exportedAt: new Date(now()).toISOString(),
        projects,
        parts: library,
        skipped,
        warnings,
      }),
    ),
  });
  return writeZip(files);
}
