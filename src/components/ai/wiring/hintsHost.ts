import { useMemo, useRef } from "react";
import { Ladder, type Level, type Topic } from "@/ai/hints";
import type { HintPort, LogPort } from "@/ai/proposals/ports";
import type { Project } from "@/project/generated/types";
import type { DiagnoseStore } from "@/studio/stores/diagnose";

export const HOLD_ME_KEY = "iynk:ai-hold-me:v1";

export type GateFlags = { showMe: boolean; fixIt: boolean; applyIt: boolean };

const NO_FLAGS: GateFlags = { showMe: false, fixIt: false, applyIt: false };

export function readHoldMe(): boolean {
  try {
    return localStorage.getItem(HOLD_ME_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeHoldMe(on: boolean): void {
  try {
    localStorage.setItem(HOLD_ME_KEY, on ? "1" : "0");
  } catch {
    // The choice then lasts until the page closes.
  }
}

/** The hint port over the diagnose store: the sealed item is the open session, and its level is the session's `hintLevel`. */
export function createHintPort(d: { diagnose: Pick<DiagnoseStore, "getState" | "dispatch">; redact: (s: Project) => Project }): HintPort {
  const session = () => d.diagnose.getState().session;
  const revealed = () => {
    const s = session();
    return s !== null && (s.causeVisible || s.state === "revealed");
  };
  const idOf = (s: NonNullable<ReturnType<typeof session>>) => s.spec.answer.fault ?? s.spec.answer.cause_id;
  const levelOf = (faultId: string): Level => {
    const s = session();
    if (s === null || idOf(s) !== faultId) return 0;
    return revealed() ? 3 : s.hintLevel;
  };

  return {
    sealedItems() {
      const s = session();
      if (s === null || s.state === "verified") return [];
      return [{ faultId: idOf(s), hintLevel: levelOf(idOf(s)), revealed: revealed() }];
    },
    hintLevel: levelOf,
    requestHint(faultId, level) {
      const s = session();
      if (s === null || idOf(s) !== faultId) return { ok: false, level: 0 };
      d.diagnose.dispatch({ t: "hint", level });
      const now = levelOf(faultId);
      return { ok: now === level, level: now };
    },
    showCause(faultId) {
      const s = session();
      if (s === null || idOf(s) !== faultId) return { ok: false };
      d.diagnose.dispatch({ t: "showCause" });
      return { ok: revealed() };
    },
    redact: d.redact,
  };
}

/** The ladder for one panel, and the three flags the proposal gate reads. A flag lasts for one call. */
export function useLadder(d: { port: HintPort; log: LogPort }) {
  const flags = useRef<GateFlags>(NO_FLAGS);
  return useMemo(() => {
    const ladder = new Ladder({ hint: d.port, log: d.log, holdMe: readHoldMe });
    return {
      ladder,
      level: (topic: Topic): Level => ladder.level(topic),
      flags: (): GateFlags => flags.current,
      raise(flag: keyof GateFlags) {
        flags.current = { ...flags.current, [flag]: true };
      },
      clear() {
        flags.current = NO_FLAGS;
      },
    };
  }, [d.port, d.log]);
}
