import type { DesignPick } from "@/content/schema";
import type { BenchSummary } from "./store";

// The bench a learner built in this browser tab, handed from the workshop to the fly page. It is a per-tab
// convenience (sessionStorage), never progress: a fresh tab flies the default design, factory-built.

const key = (id: string) => `iynk:dronelab:${id}`;

const isPick = (v: unknown): v is DesignPick =>
  typeof v === "object" &&
  v !== null &&
  ["batt", "motor", "prop"].every((k) => typeof (v as Record<string, unknown>)[k] === "string");

export function readBenchSummary(id: string): BenchSummary | null {
  try {
    const raw = window.sessionStorage.getItem(key(id));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<BenchSummary>;
    if (!isPick(parsed.pick)) return null;
    return {
      pick: parsed.pick,
      built: parsed.built === true,
      flight: parsed.flight && typeof parsed.flight === "object" ? parsed.flight : null,
      cli: parsed.cli && typeof parsed.cli === "object" ? parsed.cli : {},
    };
  } catch {
    return null;
  }
}

export function writeBenchSummary(id: string, summary: BenchSummary): void {
  try {
    window.sessionStorage.setItem(key(id), JSON.stringify(summary));
  } catch {
    // Storage blocked or full: the fly page then flies the default, factory-built craft.
  }
}
