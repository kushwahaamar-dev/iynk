import type { Clock, RandomSource } from "../core/ids.ts";
import { loadExample } from "./apply/fixtures.testing.ts";
import type { Project } from "./generated/types.ts";
import { withHoles } from "./semantic.testing.ts";
import { createSession } from "./session.ts";
import type { ProjectSession, SessionOptions } from "./session.ts";

export const USER = { actor: "usr_amar", kind: "user" } as const;

/** Bytes from a counter, so two runs see the same ids. */
export function seededRandom(): RandomSource {
  let n = 0;
  return {
    bytes(count) {
      return Uint8Array.from({ length: count }, () => (n = (n * 31 + 7) % 251));
    },
  };
}

/** A clock that moves one second per read, from 2026-10-28 10:00:00 UTC. */
export function steppingClock(): Clock {
  let ms = Date.UTC(2026, 9, 28, 10, 0, 0);
  return () => {
    const now = ms;
    ms += 1000;
    return now;
  };
}

export function lessonSession(extra: Partial<SessionOptions> = {}, state: Project = withHoles(loadExample("lesson-uno-r3-button"))): ProjectSession {
  return createSession({ state, clock: steppingClock(), rnd: seededRandom(), ...extra });
}
