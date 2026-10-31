import type { RunCheck, RunEv } from "../protocol/index.ts";
import type { SimTime } from "../sim/core/clock.ts";
import type { InputEntry } from "../sim/engine.ts";

export type MirrorStatus = "in-sync" | "catching-up" | "diverged" | "detached-own" | "frames" | "engine-mismatch" | "halted";

export type MirrorStop = Exclude<MirrorStatus, "in-sync" | "catching-up">;

export interface MirrorHost {
  now(): SimTime;
  runUntil(t: SimTime, o?: { exclusive?: boolean }): void;
  inject(e: InputEntry): void;
  hashes(): { hb: string; hd: string };
}

export interface CheckVerdict {
  equalB: boolean;
  /** Null when `hb` already differs, so `hd` was not looked at. */
  equalD: boolean | null;
}

export interface Mirror {
  onEv(f: RunEv): void;
  onTick(tNs: number): void;
  /** Compares as soon as the host has simulated up to the check; a verdict for an earlier check may come back from a later call. */
  onCheck(c: RunCheck): CheckVerdict | null;
  pump(): void;
  /** Stops simulating for good; a mirror that has stopped ignores everything it is given. */
  stop(why: MirrorStop): void;
  status(): MirrorStatus;
  horizon(): SimTime;
}

/** A single differing `hd` is not enough to give up: two in a row are (risk R8). */
const HD_MISSES = 2;

const byTime = (a: RunEv, b: RunEv): number => a.tNs - b.tNs || a.rseq - b.rseq;

export function createMirror(h: MirrorHost): Mirror {
  const queue: RunEv[] = [];
  const checks: RunCheck[] = [];
  let horizon = 0;
  let lastRseq = 0;
  let hdMisses = 0;
  let stopped: MirrorStop | null = null;
  let verdict: CheckVerdict | null = null;

  function compare(c: RunCheck): void {
    const mine = h.hashes();
    const equalB = mine.hb === c.hb;
    const equalD = equalB ? mine.hd === c.hd : null;
    hdMisses = equalD === false ? hdMisses + 1 : 0;
    verdict = { equalB, equalD };
    if (!equalB || hdMisses >= HD_MISSES) stopped = "diverged";
  }

  /** Events at an instant go in before the check of that instant, and a check is read before anything later runs. */
  function pump(): void {
    verdict = null;
    while (!stopped) {
      const ev = queue[0];
      const chk = checks[0];
      const evAt = ev && ev.tNs <= horizon ? ev.tNs : Infinity;
      const chkAt = chk && chk.tNs <= horizon ? chk.tNs : Infinity;
      if (evAt === Infinity && chkAt === Infinity) break;
      if (evAt <= chkAt) {
        h.runUntil(evAt, { exclusive: true });
        const ev = queue.shift() as RunEv;
        h.inject({ at: ev.tNs, seq: ev.rseq, kind: ev.kind, target: ev.target, value: ev.value });
        continue;
      }
      h.runUntil(chkAt);
      compare(checks.shift() as RunCheck);
    }
    if (!stopped) h.runUntil(horizon);
  }

  return {
    onEv(f) {
      if (stopped || f.rseq <= lastRseq) return;
      lastRseq = f.rseq;
      if (f.kind === "control") {
        // Run controls never reach the engines; only the server's halt matters to a mirror.
        if (f.target === "halt") stopped = "halted";
        return;
      }
      queue.push(f);
      queue.sort(byTime);
      pump();
    },
    onTick(tNs) {
      if (stopped || tNs <= horizon) return;
      horizon = tNs;
      pump();
    },
    onCheck(c) {
      if (stopped) return null;
      checks.push(c);
      pump();
      return verdict;
    },
    pump,
    stop(why) {
      stopped = why;
    },
    status: () => stopped ?? "in-sync",
    horizon: () => horizon,
  };
}
