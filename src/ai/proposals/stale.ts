import { utf8Length } from "../../core/canonical.ts";
import type { Op } from "../../project/generated/types.ts";
import { shift } from "../../project/session.ts";
import type { ProjectPort } from "./ports.ts";
import type { ProposalRecord, SourceSpan } from "./types.ts";

/** Lines of slack around a span: an edit this close still counts as touching it. */
export const SPAN_MARGIN = 3;

const BASE_SOURCES_CAP_BYTES = 524_288;

export type StaleVerdict =
  | { kind: "fresh" }
  | { kind: "moved"; since: number; readSetChanged: string[] }
  | {
      kind: "stale";
      reason: "log_gap" | "id_overlap" | "source_overlap" | "whole_file";
      ids: string[];
      at: number;
    };

type SourceEdit = Extract<Op, { k: "source.edit" }>;

const newlines = (text: string): number => text.split("\n").length - 1;

/** 1-based line of a code-unit offset. */
const lineOf = (text: string, offset: number): number =>
  1 + newlines(text.slice(0, offset));

/** Lines an edit covers in the text just before it: a pure insert is one line, a delete across lines a to b is [a, b]. */
function editLines(text: string, pos: number, del: number): [number, number] {
  return [lineOf(text, pos), lineOf(text, pos + del)];
}

const splice = (text: string, pos: number, del: number, ins: string): string =>
  text.slice(0, pos) + ins + text.slice(pos + del);

/** Where each source.edit of a proposal lands, in the coordinates of the text before the proposal. */
export function sourceSpansOf(
  ops: readonly Op[],
  baseText: (sourceId: string) => string | undefined,
): SourceSpan[] {
  const replay = new Map<string, string>();
  const earlier: { sourceId: string; lastLine: number; delta: number }[] = [];
  const spans: SourceSpan[] = [];
  for (const op of ops) {
    if (op.k !== "source.edit") continue;
    const text = replay.get(op.id) ?? baseText(op.id);
    if (text === undefined) continue;
    const [from, to] = editLines(text, op.pos, op.del);
    const above = earlier
      .filter((e) => e.sourceId === op.id && e.lastLine < from)
      .reduce((sum, e) => sum + e.delta, 0);
    spans.push({ sourceId: op.id, fromLine: from - above, toLine: to - above });
    const delta =
      newlines(op.ins) - newlines(text.slice(op.pos, op.pos + op.del));
    earlier.push({ sourceId: op.id, lastLine: to, delta });
    replay.set(op.id, splice(text, op.pos, op.del, op.ins));
  }
  return spans;
}

/** The base text of every source the ops edit, or null when together they exceed `capBytes`. */
export function captureBaseSources(
  ops: readonly Op[],
  baseText: (id: string) => string | undefined,
  capBytes = BASE_SOURCES_CAP_BYTES,
): Record<string, string> | null {
  const captured: Record<string, string> = {};
  let bytes = 0;
  for (const op of ops) {
    if (op.k !== "source.edit" || op.id in captured) continue;
    const text = baseText(op.id);
    if (text === undefined) continue;
    bytes += utf8Length(text);
    if (bytes > capBytes) return null;
    captured[op.id] = text;
  }
  return captured;
}

interface Replay {
  text: string;
  spans: SourceSpan[];
  /** Later edits already walked, in the coordinates of the text they were applied to. */
  edits: { seq: number; pos: number; del: number; ins: string }[];
}

const margined = (span: SourceSpan, from: number, to: number): boolean =>
  from <= span.toLine + SPAN_MARGIN && to >= span.fromLine - SPAN_MARGIN;

/** Applies one later edit to the replay; true when it touches a span. */
function overlapsSpan(replay: Replay, seq: number, op: SourceEdit): boolean {
  const range = replay.edits.reduce(
    (r, earlier) => (earlier.seq > op.baseSeq ? shift(r, earlier) : r),
    { pos: op.pos, del: op.del },
  );
  const pos = Math.min(range.pos, replay.text.length);
  const del = Math.min(range.del, replay.text.length - pos);
  const [from, to] = editLines(replay.text, pos, del);
  if (replay.spans.some((span) => margined(span, from, to))) return true;
  const delta = newlines(op.ins) - newlines(replay.text.slice(pos, pos + del));
  for (const span of replay.spans) {
    if (to < span.fromLine - SPAN_MARGIN) {
      span.fromLine += delta;
      span.toLine += delta;
    }
  }
  replay.text = splice(replay.text, pos, del, op.ins);
  replay.edits.push({ seq, pos, del, ins: op.ins });
  return false;
}

export function checkStale(
  rec: Pick<
    ProposalRecord,
    "proposal" | "touched" | "sourceSpans" | "baseSources" | "readSet"
  >,
  port: Pick<ProjectPort, "snapshot" | "opsSince">,
  touchedOf: (op: Op) => string[],
): StaleVerdict {
  const { base } = rec.proposal;
  const current = port.snapshot().revision;
  if (current === base) return { kind: "fresh" };
  const { complete, ops } = port.opsSince(base);
  if (!complete)
    return { kind: "stale", reason: "log_gap", ids: [], at: current };

  const touched = new Set(rec.touched);
  const replays = new Map<string, Replay>();
  for (const span of rec.sourceSpans) {
    const text = rec.baseSources?.[span.sourceId];
    const replay = replays.get(span.sourceId) ?? {
      text: text ?? "",
      spans: [],
      edits: [],
    };
    replay.spans.push({ ...span });
    replays.set(span.sourceId, replay);
  }
  const stale = (
    reason: "id_overlap" | "source_overlap" | "whole_file",
    ids: string[],
    at: number,
  ): StaleVerdict => ({
    kind: "stale",
    reason,
    ids,
    at,
  });

  const ordered = [...ops].sort((a, b) => a.seq - b.seq);
  for (const { seq, op } of ordered) {
    const sourceId =
      op.k === "source.edit" ||
      op.k === "source.remove" ||
      op.k === "source.rename"
        ? op.id
        : undefined;
    const replay = sourceId === undefined ? undefined : replays.get(sourceId);
    if (sourceId !== undefined && replay) {
      if (rec.baseSources === null || rec.baseSources[sourceId] === undefined) {
        return stale("whole_file", [sourceId], seq);
      }
      if (op.k === "source.remove") return stale("id_overlap", [sourceId], seq);
      if (op.k === "source.edit" && overlapsSpan(replay, seq, op))
        return stale("source_overlap", [sourceId], seq);
      continue;
    }
    const hit = touchedOf(op).filter((id) => touched.has(id));
    if (hit.length > 0) return stale("id_overlap", hit, seq);
  }

  const readSetChanged = rec.readSet
    .filter(({ id, rev }) =>
      ordered.some(({ seq, op }) => seq > rev && touchedOf(op).includes(id)),
    )
    .map(({ id }) => id);
  return { kind: "moved", since: current, readSetChanged };
}
