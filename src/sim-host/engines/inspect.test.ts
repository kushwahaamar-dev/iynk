import { describe, expect, it, vi } from "vitest";
import { memoryVerdict, openInspect, userClick } from "./inspect";
import { createLoader, type EngineManifestEntry, type LoaderDeps } from "./loader";

const hex = async (bytes: Uint8Array<ArrayBuffer>) =>
  Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), (b) => b.toString(16).padStart(2, "0")).join("");

const bytes = new TextEncoder().encode("tiny engine file");

async function entry(over: Partial<EngineManifestEntry> = {}): Promise<EngineManifestEntry> {
  return {
    id: "yosys",
    version: "1",
    files: [{ path: "yosys@1/yosys.js", sha256: await hex(bytes), bytes: bytes.length, kind: "js" }],
    requires: {},
    license: { spdx: "ISC", reviewed: false },
    budget: { wireBytes: 12_500_000, rawBytes: 79_700_000 },
    ...over,
  };
}

function deps(manifest: EngineManifestEntry, file: Uint8Array<ArrayBuffer> = bytes, wasm = ["exnref"]) {
  const fetchSpy = vi.fn(async (input: RequestInfo | URL) =>
    String(input).endsWith("manifest.json") ? Response.json({ engines: [manifest] }) : new Response(file),
  );
  const loaderDeps: LoaderDeps = {
    fetch: fetchSpy as unknown as typeof fetch,
    features: { wasm: new Set(wasm), deviceMemoryGb: 8, desktop: true },
  };
  return { fetchSpy, loadEngine: createLoader(loaderDeps) };
}

const engineFetches = (spy: ReturnType<typeof vi.fn>) => spy.mock.calls.filter(([url]) => !String(url).endsWith("manifest.json"));

describe("memoryVerdict", () => {
  it.each([0.25, 1, 2, 4])("refuses %s GB", (gb) => {
    expect(memoryVerdict(gb)).toEqual({ kind: "refuse", gb });
  });

  it("asks at 8 GB and when the browser does not report", () => {
    expect(memoryVerdict(8)).toEqual({ kind: "ask", gb: 8 });
    expect(memoryVerdict(undefined)).toEqual({ kind: "ask", gb: null });
  });
});

describe("userClick", () => {
  it("mints a token only for a trusted event", () => {
    expect(userClick({ isTrusted: false })).toBeNull();
    expect(userClick({ isTrusted: true })).not.toBeNull();
  });
});

describe("openInspect", () => {
  it("surfaces an integrity failure from the loader", async () => {
    const click = userClick({ isTrusted: true })!;
    const loadEngine = vi.fn(async () => ({
      ok: true as const,
      entry: await entry(),
      wireBytes: 1,
      rawBytes: 1,
      fetchFiles: async () => ({ ok: false as const, reason: "integrity" as const, detail: "yosys.js" }),
    }));
    expect(await openInspect(click, { loadEngine, now: () => 0 })).toEqual({ ok: false, reason: "integrity", detail: "yosys.js" });
  });
});

describe("engine loader (FA-11)", () => {
  it("rejects a file whose sha256 differs", async () => {
    const { loadEngine } = deps(await entry(), new TextEncoder().encode("tampered engine file"));
    const offer = await loadEngine("yosys");
    if (!offer.ok) throw new Error("expected an offer");
    expect(await offer.fetchFiles()).toEqual({ ok: false, reason: "integrity", detail: "yosys@1/yosys.js" });
  });

  it("accepts a file whose sha256 matches", async () => {
    const { loadEngine } = deps(await entry());
    const offer = await loadEngine("yosys");
    if (!offer.ok) throw new Error("expected an offer");
    const fetched = await offer.fetchFiles();
    expect(fetched.ok && fetched.files.map((f) => f.path)).toEqual(["yosys@1/yosys.js"]);
  });

  it("refuses an engine whose requires is unmet", async () => {
    const { loadEngine, fetchSpy } = deps(await entry({ requires: { wasm: ["exnref"] } }), bytes, []);
    expect(await loadEngine("yosys")).toMatchObject({ ok: false, reason: "unsupported" });
    expect(engineFetches(fetchSpy)).toHaveLength(0);
  });

  it("reports wireBytes before any engine file is fetched", async () => {
    const { loadEngine, fetchSpy } = deps(await entry());
    const offer = await loadEngine("yosys");
    expect(offer).toMatchObject({ ok: true, wireBytes: 12_500_000, rawBytes: 79_700_000 });
    expect(engineFetches(fetchSpy)).toHaveLength(0);
  });
});
