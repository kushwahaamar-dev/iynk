// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { BUILTIN_DESCRIPTORS } from "../builtin.ts";
import { createRegistry } from "../registry.ts";
import { builtinSource, fetchSource, loadInto } from "./load.ts";

const example = (name: string): Record<string, any> => // eslint-disable-line @typescript-eslint/no-explicit-any
  JSON.parse(
    readFileSync(
      new URL(`../../../docs/MASTER_PLAN/04_ARCHITECTURE/schemas/examples/components/${name}.component.json`, import.meta.url),
      "utf8",
    ),
  );

const fakeFetch = (files: Record<string, unknown>): typeof fetch =>
  (async (url: string) => {
    const name = url.split("/").pop() ?? "";
    return name in files
      ? new Response(typeof files[name] === "string" ? files[name] : JSON.stringify(files[name]))
      : new Response("", { status: 404 });
  }) as typeof fetch;

describe("loadInto", () => {
  it("installs the built-in parts", async () => {
    const reg = createRegistry();
    const result = await loadInto(reg, builtinSource(), "core");
    expect(result).toEqual({ added: BUILTIN_DESCRIPTORS.length, failed: [] });
    expect(reg.has("core.uno-r3", "1.0.0")).toBe(true);
  });

  it("installs a good file and reports a file that fails the schema", async () => {
    const broken = example("resistor");
    delete broken.simulation.status;
    const src = fetchSource(
      "https://parts.test/parts/",
      fakeFetch({ "index.json": ["led.json", "resistor.json"], "led.json": example("led-5mm"), "resistor.json": broken }),
    );
    const reg = createRegistry();
    const result = await loadInto(reg, src, "core");
    expect(result.added).toBe(1);
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0]!.ref).toBe("core.resistor@1.0.0");
    expect(result.failed[0]!.diagnostics.length).toBeGreaterThan(0);
    expect(reg.has("core.led-5mm", "1.0.0")).toBe(true);
    expect(reg.has("core.resistor", "1.0.0")).toBe(false);
  });

  it("refuses a second file with the same id and version but other bytes", async () => {
    const changed = example("led-5mm");
    changed.identity.model = "Another LED";
    const src = fetchSource(
      "https://parts.test",
      fakeFetch({ "index.json": ["a.json", "b.json"], "a.json": example("led-5mm"), "b.json": changed }),
    );
    const reg = createRegistry();
    const result = await loadInto(reg, src, "core");
    expect(result.added).toBe(1);
    expect(result.failed[0]!.diagnostics[0]!.code).toBe("P-DUP-BYTES");
  });

  it("names a part without an id by its position", async () => {
    const result = await loadInto(createRegistry(), { list: async () => [{ value: 7, bytes: 1 }] }, "core");
    expect(result.failed.map((f) => f.ref)).toEqual(["#0"]);
  });
});

describe("fetchSource", () => {
  it("throws with the file name when a file is missing", async () => {
    const src = fetchSource("https://parts.test", fakeFetch({ "index.json": ["gone.json"] }));
    await expect(src.list()).rejects.toThrow("gone.json: the server answered 404");
  });

  it("throws when the index is not a list of names", async () => {
    const src = fetchSource("https://parts.test", fakeFetch({ "index.json": { a: 1 } }));
    await expect(src.list()).rejects.toThrow("index.json");
  });
});
