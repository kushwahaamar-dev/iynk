// @vitest-environment node
import { describe, expect, it } from "vitest";
import { createInlinePort } from "./rpc.ts";

describe("createInlinePort speed", () => {
  it("costs under 0.1 ms per call", async () => {
    const port = createInlinePort<{ t: "stream" }, { t: "tick"; at: number }>(() => 1);
    const calls = 2000;
    const start = performance.now();
    for (let i = 0; i < calls; i++) await port.call({ t: "stream" });
    const perCall = (performance.now() - start) / calls;
    expect(perCall).toBeLessThan(0.1);
  });
});
