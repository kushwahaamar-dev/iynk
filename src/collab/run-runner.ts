import { RUN_EV_KINDS } from "../protocol/index.ts";
import type { RunCheck, RunEvUp, RunReq, RunTick } from "../protocol/index.ts";
import type { SimTime } from "../sim/core/clock.ts";
import type { MirrorHost } from "./run-mirror.ts";

export const TICK_NS = 100_000_000;
export const CHECK_NS = 1_000_000_000;
export const STAMP_LEAD_NS = 1_000_000;

export interface Runner {
  /**
   * Stamps a member's `input` request strictly after everything published so far and after `ceilingNs`, the furthest
   * instant the run may already have reached. The event must go out before any tick at or beyond its stamp. Null for
   * any other request, which the server turns into a control event itself, and for an input that is not a value.
   */
  stamp(req: RunReq, ceilingNs: SimTime): RunEvUp | null;
  /** Ticks for every boundary up to `nowNs`, and a check when `nowNs` is a check boundary. Slices must end on tick boundaries. */
  afterSlice(nowNs: SimTime): Array<RunTick | RunCheck>;
  /** True for the echo of an event this runner stamped. */
  acknowledge(tNs: number): boolean;
  /** Stamped events the server has not echoed yet; the run must not move past their stamps. */
  inflight(): number;
  lastPublished(): SimTime;
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** `startNs` is the last tick already published, for a runner that takes over a run in progress. */
export function createRunner(h: MirrorHost, startNs = 0): Runner {
  const sent = new Set<number>();
  let published = startNs;
  let lastStamp = 0;

  return {
    stamp(req, ceilingNs) {
      const a = isRecord(req.args) ? req.args : {};
      const kind = RUN_EV_KINDS.find((k) => k === a.kind);
      if (req.req !== "input" || !kind || kind === "control" || typeof a.target !== "string") return null;
      const tNs = Math.max(ceilingNs, published, lastStamp) + STAMP_LEAD_NS;
      lastStamp = tNs;
      sent.add(tNs);
      return { t: "run.ev", kind, tNs, target: a.target, value: a.value ?? null };
    },
    afterSlice(nowNs) {
      const out: Array<RunTick | RunCheck> = [];
      while (published + TICK_NS <= nowNs) {
        published += TICK_NS;
        out.push({ t: "run.tick", tNs: published });
        if (published % CHECK_NS === 0 && published === nowNs) out.push({ t: "run.check", tNs: published, ...h.hashes() });
      }
      return out;
    },
    acknowledge: (tNs) => sent.delete(tNs),
    inflight: () => sent.size,
    lastPublished: () => published,
  };
}
