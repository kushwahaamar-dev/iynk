// @vitest-environment node
import { describe, expect, it } from "vitest";
import { extractRefs, resolveAll } from "./citations.ts";
import { fakeSources } from "./testing/fake-sources.ts";

describe("citations", () => {
  it("extracts each valid reference once, in order", () => {
    const refs = extractRefs("See [[net_d12]], [[cmp_r1.P1]] and again [[net_d12]]; [[not a ref]] and [[bad!]].");
    expect(refs.map((r) => r.raw)).toEqual(["net_d12", "cmp_r1.P1"]);
  });

  it("lists references that are malformed or point at nothing", () => {
    const { resolved, unresolved } = resolveAll("[[net_d12]] [[cmp_ghost]] [[bad!]]", fakeSources());
    expect(resolved.map((r) => r.raw)).toEqual(["net_d12"]);
    expect(unresolved).toEqual(["cmp_ghost", "bad!"]);
  });
});
