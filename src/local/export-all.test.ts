// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { readIynk } from "@/export/iynk";
import { readZip, utf8Decode } from "@/export/zip";
import { stateHash } from "@/project/hash";
import { startProject } from "@/project/testing/generators";
import { exportAll } from "./export-all";
import { createMemoryPartsRepository, partKey } from "./parts-store";
import { createMemoryRepository, emptyRows } from "./memory-repository";
import type { IndexRow, ProjectRecord, Repository } from "./repository";

const NOW = Date.UTC(2026, 9, 28);
const KEY_TEXT = "sk-planted0123456789abcdefghijkl";

function recordOf(seed: number, title: string): ProjectRecord {
  const base = startProject(seed);
  const doc = { ...base, meta: { ...base.meta, title } };
  return { doc, hash: stateHash(doc), writtenAt: seed };
}

const rowOf = (rec: ProjectRecord): IndexRow => ({
  name: rec.doc.meta.title,
  updatedAt: rec.doc.meta.updatedAt,
  hash: rec.hash,
  board: "uno",
  size: 1,
  hasFileCopy: false,
  archived: false,
});

async function seed(repo: Repository, ids: string[]): Promise<Record<string, ProjectRecord>> {
  const recs: Record<string, ProjectRecord> = {};
  for (const [i, id] of ids.entries()) {
    recs[id] = recordOf(i + 1, `Project ${id}`);
    expect((await repo.save(id, recs[id], rowOf(recs[id]), null)).ok).toBe(true);
  }
  return recs;
}

function open(bytes: Uint8Array) {
  const zip = readZip(bytes);
  if (!zip.ok) throw new Error(zip.error.message);
  return new Map(zip.value.map((f) => [f.path, f.data]));
}

const manifestOf = (files: Map<string, Uint8Array>) => JSON.parse(utf8Decode(files.get("manifest.json")!)!);

afterEach(() => vi.unstubAllGlobals());

describe("exportAll library parts", () => {
  it("adds each part's descriptor and files and lists them in the manifest", async () => {
    const parts = createMemoryPartsRepository();
    const descriptor = { id: "led", version: "1.0.0" } as never;
    await parts.putMany(
      [{ key: partKey("led", "1.0.0"), id: "led", version: "1.0.0", descriptor, digest: "sha256:led", trust: "local", addedAt: "t", files: { "art.svg": "aa" } }],
      new Map([["aa", new Blob(["<svg/>"])]]),
    );
    const files = open(await exportAll({ repo: createMemoryRepository(), parts, settingsJson: null, now: () => NOW }));
    expect([...files.keys()].sort()).toEqual(["manifest.json", "parts/led@1.0.0.component.json", "parts/led@1.0.0/art.svg"]);
    expect(utf8Decode(files.get("parts/led@1.0.0/art.svg")!)).toBe("<svg/>");
    expect(manifestOf(files).parts).toEqual([{ key: "led@1.0.0", digest: "sha256:led", file: "parts/led@1.0.0.component.json" }]);
  });
});

describe("exportAll", () => {
  it("holds one .iynk per project whose hash equals the stored one, and the given settings", async () => {
    vi.stubGlobal("localStorage", undefined);
    const repo = createMemoryRepository();
    const recs = await seed(repo, ["prj_a", "prj_b", "prj_c"]);
    const files = open(await exportAll({ repo, settingsJson: '{"theme":"dark"}', now: () => NOW }));
    expect([...files.keys()].sort()).toEqual(["manifest.json", "prj_a.iynk", "prj_b.iynk", "prj_c.iynk", "settings.json"]);
    for (const [id, rec] of Object.entries(recs)) {
      const read = readIynk(files.get(`${id}.iynk`)!, () => NOW);
      expect(read).toMatchObject({ ok: true, hash: rec.hash, hashMatches: true });
    }
    expect(utf8Decode(files.get("settings.json")!)).toBe('{"theme":"dark"}');
    expect(manifestOf(files)).toMatchObject({ exportedAt: "2026-10-28T00:00:00.000Z", skipped: [], warnings: [] });
  });

  it("never reads the keys, server, identity or journal stores", async () => {
    const rows = emptyRows();
    const repo = createMemoryRepository({ rows });
    await seed(repo, ["prj_a", "prj_b", "prj_c"]);
    rows.keys.set("openai", { provider: "openai", secret: KEY_TEXT });
    rows.server.set("https://example.test", { token: "server-token-text" });
    rows.identity.set("https://example.test", { id: "identity-text" });
    rows.journal.set("prj_a", { baseRevision: 0, edits: [{ src: "main", pos: 0, del: 0, ins: "journal-edit-text", t: 1 }], writtenAt: 1 });
    const bytes = await exportAll({ repo, settingsJson: null, now: () => NOW });
    const everything = [...open(bytes).values()].map((d) => utf8Decode(d) ?? "").join("\n");
    for (const text of [KEY_TEXT, "server-token-text", "identity-text", "journal-edit-text"]) expect(everything).not.toContain(text);
    expect(manifestOf(open(bytes)).warnings).toEqual([]);
  });

  it("has only the manifest when there are no projects and no settings", async () => {
    const files = open(await exportAll({ repo: createMemoryRepository(), settingsJson: null, now: () => NOW }));
    expect([...files.keys()]).toEqual(["manifest.json"]);
  });

  it("warns about secret-shaped text in a source and in the settings", async () => {
    const repo = createMemoryRepository();
    const rec = recordOf(1, `Key ${KEY_TEXT}`);
    await repo.save("prj_a", rec, rowOf(rec), null);
    const files = open(await exportAll({ repo, settingsJson: `{"note":"${"a1".repeat(20)}"}`, now: () => NOW }));
    const { warnings } = manifestOf(files);
    expect(warnings).toContain("prj_a.iynk contains an API key starting sk-");
    expect(warnings).toContain("settings.json contains 40 or more hex characters");
  });

  it("skips a project that fails to load and lists it", async () => {
    const repo = createMemoryRepository();
    await seed(repo, ["prj_a", "prj_b"]);
    const load = repo.load.bind(repo);
    repo.load = async (id) => (id === "prj_b" ? { status: "lost" } : load(id));
    const files = open(await exportAll({ repo, settingsJson: null, now: () => NOW }));
    expect(files.has("prj_b.iynk")).toBe(false);
    expect(manifestOf(files).skipped).toEqual([{ id: "prj_b", reason: "lost" }]);
  });

  it("exports a recovered record and names it in the warnings", async () => {
    const repo = createMemoryRepository();
    const recs = await seed(repo, ["prj_a"]);
    repo.load = async () => ({ status: "recovered", rec: recs.prj_a });
    const files = open(await exportAll({ repo, settingsJson: null, now: () => NOW }));
    expect(files.has("prj_a.iynk")).toBe(true);
    expect(manifestOf(files).warnings).toEqual(["prj_a was recovered from its previous copy"]);
  });
});
