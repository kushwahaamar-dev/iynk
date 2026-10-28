// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { PinEdge } from "../orchestrator.ts";
import { pinTraceHash, serialHash } from "./trace.ts";

const edges = (): PinEdge[] => [
  { at: 0, net: "D13", level: 1 },
  { at: 500_000_000, net: "D13", level: 0 },
  { at: 500_000_000, net: "D12", level: "Z" },
];

describe("pinTraceHash", () => {
  it("is the same for the same edges", () => {
    expect(pinTraceHash(edges())).toBe(pinTraceHash(edges()));
  });

  it("changes when one edge moves by 1 ns", () => {
    const moved = edges();
    moved[1].at += 1;
    expect(pinTraceHash(moved)).not.toBe(pinTraceHash(edges()));
  });

  it("changes with the net, the level and the order", () => {
    const net = edges();
    net[0].net = "D12";
    const level = edges();
    level[0].level = 0;
    const swapped = edges().reverse();
    const hashes = new Set([pinTraceHash(edges()), pinTraceHash(net), pinTraceHash(level), pinTraceHash(swapped)]);
    expect(hashes.size).toBe(4);
  });

  it("hashes 20,000 edges in under 20 ms", () => {
    const many: PinEdge[] = Array.from({ length: 20_000 }, (_, i) => ({ at: i * 1000, net: "D13", level: (i % 2) as 0 | 1 }));
    pinTraceHash(many);
    const times = Array.from({ length: 5 }, () => {
      const started = performance.now();
      pinTraceHash(many);
      return performance.now() - started;
    });
    expect(Math.min(...times)).toBeLessThan(20);
  });
});

describe("serialHash", () => {
  const lines = [
    { at: 0, text: "on\n" },
    { at: 500, text: "off\n" },
  ];

  it("is order sensitive and sees a text change", () => {
    expect(serialHash(lines)).toBe(serialHash([...lines]));
    expect(serialHash([...lines].reverse())).not.toBe(serialHash(lines));
    expect(serialHash([lines[0], { at: 500, text: "of\n" }])).not.toBe(serialHash(lines));
  });

  it("does not confuse where one write ends and the next starts", () => {
    expect(serialHash([{ at: 0, text: "ab" }, { at: 0, text: "c" }])).not.toBe(serialHash([{ at: 0, text: "a" }, { at: 0, text: "bc" }]));
  });
});
