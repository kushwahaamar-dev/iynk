// @vitest-environment node
import { deflateRawSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { sha256Hex } from "../core/sha256.ts";
import { loadExample } from "../project/apply/fixtures.testing.ts";
import type { Project } from "../project/generated/types.ts";
import { stateHash } from "../project/hash.ts";
import { readIynkz, writeIynkz } from "./iynkz.ts";
import { writeIynk } from "./iynk.ts";
import { crc32, readZip, writeZip } from "./zip.ts";

const clock = () => Date.UTC(2026, 9, 28);
const MIB = 1024 * 1024;
const encode = (s: string) => new TextEncoder().encode(s);
const doc = loadExample("env-monitor-esp32");
const project = writeIynk(doc);

interface RawEntry {
  name: string;
  data: Uint8Array;
  csize?: number;
  usize?: number;
  crc?: number;
  method?: number;
}

/** A zip with sizes and checksums the test can lie about; `data` is written as given. */
function rawZip(entries: RawEntry[]): Uint8Array {
  const chunks: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  const u16 = (n: number) => [n & 255, (n >> 8) & 255];
  const u32 = (n: number) => [...u16(n & 0xffff), ...u16(n >>> 16)];
  for (const e of entries) {
    const name = encode(e.name);
    const method = e.method ?? 8;
    const fields = [...u32(e.crc ?? 0), ...u32(e.csize ?? e.data.length), ...u32(e.usize ?? e.data.length)];
    const head = Uint8Array.from([
      ...u32(0x04034b50), ...u16(20), ...u16(0x0800), ...u16(method), ...u16(0), ...u16(0x21), ...fields,
      ...u16(name.length), ...u16(0), ...name,
    ]);
    central.push(
      Uint8Array.from([
        ...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0x0800), ...u16(method), ...u16(0), ...u16(0x21), ...fields,
        ...u16(name.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(offset), ...name,
      ]),
    );
    chunks.push(head, e.data);
    offset += head.length + e.data.length;
  }
  const dirSize = central.reduce((n, c) => n + c.length, 0);
  const end = Uint8Array.from([
    ...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(entries.length), ...u16(entries.length), ...u32(dirSize), ...u32(offset), ...u16(0),
  ]);
  const all = [...chunks, ...central, end];
  const out = new Uint8Array(all.reduce((n, c) => n + c.length, 0));
  let pos = 0;
  for (const c of all) {
    out.set(c, pos);
    pos += c.length;
  }
  return out;
}

const deflated = (name: string, raw: Uint8Array, declared = raw.length): RawEntry => {
  const data = deflateRawSync(raw);
  return { name, data, csize: data.length, usize: declared, crc: crc32(raw) };
};

async function refusal(bytes: Uint8Array) {
  const start = performance.now();
  const report = await readIynkz(bytes, clock);
  expect(performance.now() - start).toBeLessThan(2000);
  if (report.ok) throw new Error("the archive was accepted");
  return report.error;
}

describe("round trip", () => {
  const asset = encode("a datasheet");
  const assets = [{ sha256: sha256Hex(asset), bytes: asset }];

  it("keeps the project hash and the assets", async () => {
    const report = await readIynkz(writeIynkz(doc, assets), clock);
    expect(report.ok).toBe(true);
    if (!report.ok) return;
    expect(report.hash).toBe(stateHash(doc));
    expect(report.hashMatches).toBe(true);
    expect(report.warnings).toEqual([]);
    expect(report.assets).toEqual(assets);
  });

  it("writes the same bytes twice, whatever the asset order, with one entry per asset", () => {
    const other = encode("another");
    const both = [...assets, { sha256: sha256Hex(other), bytes: other }];
    const first = writeIynkz(doc, both);
    expect(writeIynkz(doc, [...both].reverse().concat(both))).toEqual(first);
    const zip = readZip(first);
    expect(zip.ok && zip.value.map((f) => f.path)).toEqual([
      `assets/${[assets[0].sha256, sha256Hex(other)].sort()[0]}`,
      `assets/${[assets[0].sha256, sha256Hex(other)].sort()[1]}`,
      "manifest.json",
      "project.iynk",
    ]);
  });

  it("warns when the manifest disagrees with an entry", async () => {
    const zip = readZip(writeIynkz(doc, assets));
    if (!zip.ok) throw new Error("unreadable");
    const files = zip.value;
    const withoutManifest = writeZip(files.filter((f) => f.path !== "manifest.json"));
    const report = await readIynkz(withoutManifest, clock);
    expect(report.ok && report.warnings.map((w) => w.code)).toEqual(["CONTAINER-MANIFEST"]);
    const wrongName = writeZip(files.map((f) => (f.path.startsWith("assets/") ? { ...f, data: encode("changed") } : f)));
    const changed = await readIynkz(wrongName, clock);
    expect(changed.ok && changed.warnings.map((w) => w.code).sort()).toEqual(["CONTAINER-ASSET-HASH", "CONTAINER-MANIFEST"]);
  });

  it("opens a project made by a newer iynk as newer-schema", async () => {
    const newer = JSON.parse(new TextDecoder().decode(project)) as { project: { schemaVersion: string } };
    newer.project.schemaVersion = "2.0";
    const error = await refusal(writeZip([{ path: "project.iynk", data: encode(JSON.stringify(newer)) }]));
    expect(error.kind).toBe("newer-schema");
  });
});

describe("hostile archives", () => {
  const zeros = (n: number) => new Uint8Array(n);
  const withProject = (extra: RawEntry[]) => rawZip([{ name: "project.iynk", data: project, method: 0, crc: crc32(project) }, ...extra]);

  it("a 10 MiB deflate bomb is refused by the ratio before anything is inflated", async () => {
    const error = await refusal(rawZip([deflated("assets/bomb", zeros(10 * MIB))]));
    expect(error).toMatchObject({ kind: "ratio", limit: "100 to 1" });
  });

  it("a bomb with a lying header stops at the declared size", async () => {
    const error = await refusal(rawZip([deflated("assets/bomb", zeros(64 * MIB), 4096)]));
    expect(error.kind).toBe("zip-bomb");
  });

  it.each(["../evil", "a/../../evil", "/etc/passwd", "C:/evil", "a\\b", "a//b"])("bad-path: %s", async (name) => {
    const error = await refusal(writeZip([{ path: name, data: encode("x") }]));
    expect(error.kind).toBe("bad-path");
  });

  it("1,001 entries", async () => {
    const files = Array.from({ length: 1001 }, (_, i) => ({ path: `definitions/d${i}.json`, data: encode("{}") }));
    expect(await refusal(writeZip(files))).toMatchObject({ kind: "too-many-entries", limit: "1000 entries" });
  });

  it("a 17 MiB entry", async () => {
    const error = await refusal(writeZip([{ path: "assets/big", data: zeros(17 * MIB) }]));
    expect(error).toMatchObject({ kind: "entry-too-large", limit: "16 MiB per entry" });
  });

  it("entries that add up to more than 128 MiB", async () => {
    const claims = Array.from({ length: 9 }, (_, i) => ({
      name: `assets/${i}`,
      data: new Uint8Array(0),
      method: 0,
      csize: 16 * MIB,
      usize: 16 * MIB,
    }));
    expect(await refusal(rawZip(claims))).toMatchObject({ kind: "too-large", limit: "128 MiB in total" });
  });

  it("a container over 128 MiB", async () => {
    expect(await refusal(new Uint8Array(128 * MIB + 1))).toMatchObject({ kind: "too-large", limit: "128 MiB" });
  });

  it("a duplicate name", async () => {
    const error = await refusal(writeZip([{ path: "a", data: encode("1") }, { path: "a", data: encode("2") }]));
    expect(error.kind).toBe("bad-path");
    expect(error.message).toContain("twice");
  });

  it("names that differ only in case", async () => {
    const error = await refusal(writeZip([{ path: "a", data: encode("1") }, { path: "A", data: encode("2") }]));
    expect(error.kind).toBe("bad-path");
    expect(error.message).toContain("case");
  });

  it("a truncated archive", async () => {
    const whole = writeIynkz(doc, []);
    expect((await refusal(whole.subarray(0, whole.length - 30))).kind).toBe("bad-zip");
    expect((await refusal(whole.subarray(0, 100))).kind).toBe("bad-zip");
  });

  it("a bad CRC", async () => {
    const asset = encode("zzzz-unique-asset-bytes");
    const bytes = writeIynkz(doc, [{ sha256: sha256Hex(asset), bytes: asset }]).slice();
    const at = bytes.findIndex((_, i) => asset.every((b, k) => bytes[i + k] === b));
    bytes[at] ^= 1;
    const error = await refusal(bytes);
    expect(error).toMatchObject({ kind: "bad-zip", path: `assets/${sha256Hex(asset)}` });
  });

  it("no project.iynk", async () => {
    expect(await refusal(writeZip([{ path: "manifest.json", data: encode("{}") }]))).toMatchObject({
      kind: "bad-zip",
      path: "project.iynk",
    });
  });

  it("an asset that is not named by its hash", async () => {
    const error = await refusal(withProject([{ name: "assets/readme", data: encode("x"), method: 0, crc: crc32(encode("x")) }]));
    expect(error).toMatchObject({ kind: "bad-path", path: "assets/readme" });
  });

  it("an SVG asset", async () => {
    const svg = encode('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
    const sha256 = sha256Hex(svg);
    const withSvg: Project = {
      ...doc,
      assets: [{ id: "ast_logo", path: "logo.svg", mediaType: "image/svg+xml", bytes: svg.length, sha256, role: "image" }],
    };
    const error = await refusal(writeIynkz(withSvg, [{ sha256, bytes: svg }]));
    expect(error).toMatchObject({ kind: "svg-not-supported", path: `assets/${sha256}` });
  });
});

describe("zip reader", () => {
  it("reads deflate, which the writer never makes", () => {
    const text = encode("hello hello hello hello ".repeat(200));
    const zip = readZip(rawZip([deflated("a.txt", text)]));
    expect(zip.ok && zip.value[0].data).toEqual(text);
  });

  it("skips directory entries", () => {
    const zip = readZip(rawZip([{ name: "assets/", data: new Uint8Array(0), method: 0 }, { name: "a", data: encode("x"), method: 0, crc: crc32(encode("x")) }]));
    expect(zip.ok && zip.value.map((f) => f.path)).toEqual(["a"]);
  });
});
