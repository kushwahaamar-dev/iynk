import type { Diagnosis, Evidence } from "../../project/diagnosis.ts";
import type { DiagnoseSpec, ItemState } from "./seal.ts";
import type { CauseId } from "./types.ts";

export interface PickRecord {
  cause: CauseId;
  correct: boolean;
  atMs: number;
  confidence?: "guess" | "think" | "sure";
}

export interface DiagnoseSession {
  state: ItemState;
  spec: DiagnoseSpec;
  projectId: string;
  picks: PickRecord[];
  hintLevel: 0 | 1 | 2 | 3;
  notes: Evidence[];
  causeVisible: boolean;
  runs: number;
  /** True once the item has passed through revealed, so a later fix never counts as clean. */
  wasRevealed: boolean;
}

export type DiagnoseAction =
  | { t: "run" }
  | { t: "note"; evidence: Evidence }
  | { t: "diagnose" }
  | {
      t: "pick";
      cause: CauseId;
      atMs: number;
      confidence?: PickRecord["confidence"];
    }
  | { t: "hint"; level: 1 | 2 | 3 }
  | { t: "giveUp" }
  | { t: "showCause" }
  | { t: "cleared"; symptomCleared: boolean }
  | { t: "applyFixAfterReveal" };

export type Outcome = "clean" | "assisted" | "helped" | "revealed";

export type Effect =
  | {
      t: "event";
      kind: "hint.open" | "diagnose.answer" | "reveal";
      payload: Record<string, unknown>;
    }
  | { t: "unlockEdits" }
  | { t: "lockEdits" }
  | { t: "revealCause" }
  | {
      t: "record";
      diagnosis: Diagnosis;
      outcome: Outcome;
      noEvidence: boolean;
    };

const NOTES_MAX = 64;
const HELPED_PICKS = 3;

export function startSession(
  spec: DiagnoseSpec,
  projectId: string,
): DiagnoseSession {
  return {
    state: "presented",
    spec,
    projectId,
    picks: [],
    hintLevel: 0,
    notes: [],
    causeVisible: false,
    runs: 0,
    wasRevealed: false,
  };
}

export function outcomeOf(s: DiagnoseSession): Outcome {
  if (s.wasRevealed) return "revealed";
  if (s.hintLevel === 3 || s.picks.length >= HELPED_PICKS) return "helped";
  if (s.picks[0]?.correct === true && s.hintLevel === 0) return "clean";
  return "assisted";
}

export function toDiagnosis(s: DiagnoseSession): Diagnosis | undefined {
  if (s.state !== "verified" && s.state !== "revealed") return undefined;
  return {
    cause_id: s.spec.answer.cause_id,
    symptom_id: s.spec.symptom.id,
    evidence: s.notes,
    hint_level: s.hintLevel,
  };
}

function recordEffect(s: DiagnoseSession): Effect[] {
  const diagnosis = toDiagnosis(s);
  if (diagnosis === undefined) return [];
  return [
    {
      t: "record",
      diagnosis,
      outcome: outcomeOf(s),
      noEvidence: s.notes.length === 0,
    },
  ];
}

function reveal(
  s: DiagnoseSession,
  via: "giveUp" | "showCause",
): { session: DiagnoseSession; effects: Effect[] } {
  const session: DiagnoseSession = {
    ...s,
    state: "revealed",
    causeVisible: true,
    wasRevealed: true,
  };
  return {
    session,
    effects: [
      {
        t: "event",
        kind: "reveal",
        payload: { cause_id: s.spec.answer.cause_id, via },
      },
      { t: "revealCause" },
      { t: "unlockEdits" },
    ],
  };
}

function pick(s: DiagnoseSession, a: Extract<DiagnoseAction, { t: "pick" }>) {
  if (!s.spec.options.some((o) => o.cause_id === a.cause))
    return { session: s, effects: [] };
  const correct = a.cause === s.spec.answer.cause_id;
  const record: PickRecord = { cause: a.cause, correct, atMs: a.atMs };
  if (a.confidence !== undefined) record.confidence = a.confidence;
  const session: DiagnoseSession = {
    ...s,
    picks: [...s.picks, record],
    state: correct ? "fixing" : "observing",
  };
  const effects: Effect[] = [
    {
      t: "event",
      kind: "diagnose.answer",
      payload: {
        cause_id: a.cause,
        correct,
        ...(a.confidence && { confidence: a.confidence }),
      },
    },
  ];
  if (correct && s.spec.kind === "built-wrong")
    effects.push({ t: "unlockEdits" });
  return { session, effects };
}

export function reduce(
  s: DiagnoseSession,
  a: DiagnoseAction,
): { session: DiagnoseSession; effects: Effect[] } {
  const same = { session: s, effects: [] as Effect[] };
  if (s.state === "verified") return same;

  switch (a.t) {
    case "run":
      return {
        session: {
          ...s,
          runs: s.runs + 1,
          state: s.state === "presented" ? "observing" : s.state,
        },
        effects: [],
      };
    case "note":
      if (s.notes.length >= NOTES_MAX) return same;
      return {
        session: {
          ...s,
          notes: [...s.notes, { ...a.evidence, at: Math.round(a.evidence.at) }],
        },
        effects: [],
      };
    case "diagnose":
      return s.state === "observing"
        ? { session: { ...s, state: "picking" }, effects: [] }
        : same;
    case "pick":
      return s.state === "picking" ? pick(s, a) : same;
    case "hint": {
      if (a.level !== s.hintLevel + 1) return same;
      return {
        session: { ...s, hintLevel: a.level },
        effects: [
          {
            t: "event",
            kind: "hint.open",
            payload: { level: a.level, via: "ladder" },
          },
        ],
      };
    }
    case "giveUp":
    case "showCause":
      return s.state === "revealed" ? same : reveal(s, a.t);
    case "cleared": {
      if (s.state !== "fixing" || !a.symptomCleared) return same;
      const session: DiagnoseSession = { ...s, state: "verified" };
      return { session, effects: recordEffect(session) };
    }
    case "applyFixAfterReveal": {
      if (s.state !== "revealed") return same;
      const session: DiagnoseSession = { ...s, state: "verified" };
      return { session, effects: recordEffect(session) };
    }
  }
}

function hashOf(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++)
    h = Math.imul(h ^ text.charCodeAt(i), 0x01000193);
  return h >>> 0;
}

/** The seed `buildOptions` expects for a project. */
export const optionSeed = hashOf;

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A stable shuffle: the same spec and seed always give the same order. */
export function buildOptions(
  spec: DiagnoseSpec,
  seed: number,
): DiagnoseSpec["options"] {
  const next = mulberry32(seed);
  return spec.options
    .map((option) => ({ option, key: next() }))
    .sort((x, y) => x.key - y.key)
    .map(({ option }) => option);
}
