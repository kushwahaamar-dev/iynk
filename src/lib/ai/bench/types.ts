// What a lab adapter reads off its store's state for the partner: the facts a
// tutor needs, in plain strings, so describeBench() can render and size-cap
// them the same way for every lab.

import type { ProposedChange } from "../tools";

export type BenchTest = { name: string; pass: boolean | null; detail?: string };

export type BenchFacts = {
  /** "board uno-r3", "drone quad5", ... */
  title: string;
  /** Lesson, step or mode the learner is on. */
  context: string[];
  /** One line per part: "led1: LED red (anode, cathode)". */
  parts: string[];
  /** One line per wire or net: "uno.D13 - r1.a". */
  nets: string[];
  code: { lang: string; text: string } | null;
  errors: string[];
  serial: string[];
  faults: string[];
  tests: BenchTest[];
  /** Calculator readouts and other numbers: "thrust-to-weight: 4.2". */
  numbers: string[];
  /** Whatever the adapter does not understand, as a size-capped JSON summary. */
  other: string;
};

/** A store action plus the before/after text the change card diffs. */
export type AppliedChange = { actions: Array<{ type: string }>; before: string; after: string };

export type ApplyResult = { ok: true; change: AppliedChange } | { ok: false; error: string };

export type BenchAdapter = {
  facts(state: unknown, itemId: string): BenchFacts;
  /** Turns a proposed change into store actions against the current state. */
  apply(state: unknown, change: ProposedChange): ApplyResult;
};
