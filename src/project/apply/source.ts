import { utf8Length } from "../../core/canonical.ts";
import { LIMITS } from "../../core/limits.ts";
import type { Firmware, Op } from "../generated/types.ts";
import { allEntityIds, findById, pointer, reject, removeById, upsertById } from "./types.ts";
import type { Handler, Reject } from "./types.ts";

const RESERVED_NAME = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;
const LONE_SURROGATE = /[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/;

/** Largest slice of text one restoring edit carries, so a restoring op stays under the 64 KiB envelope even when escaped. */
const RESTORE_CHUNK = 8192;

const toLf = (text: string): string => text.replace(/\r\n?/g, "\n");

/** The V3-PATH rules the schema pattern cannot state: NFC and no reserved Windows device names. */
export function pathProblem(path: string): Reject | null {
  if (path !== path.normalize("NFC")) return reject("malformed", `V3-PATH: ${path} is not in NFC form`);
  const reserved = path.split("/").find((segment) => RESERVED_NAME.test(segment.split(".")[0]));
  return reserved === undefined ? null : reject("malformed", `V3-PATH: ${reserved} is a reserved name`);
}

/** The id of an entry in `items` whose path equals `path` ignoring case, or undefined. */
export function pathOwner(items: readonly { id: string; path: string }[], path: string): string | undefined {
  const lower = path.toLowerCase();
  return items.find((item) => item.path.toLowerCase() === lower)?.id;
}

const isHigh = (code: number): boolean => code >= 0xd800 && code <= 0xdbff;
const isLow = (code: number): boolean => code >= 0xdc00 && code <= 0xdfff;

/** True when `at` falls between the two halves of a surrogate pair. */
const splitsPair = (text: string, at: number): boolean =>
  at > 0 && at < text.length && isHigh(text.charCodeAt(at - 1)) && isLow(text.charCodeAt(at));

const sourceAdd: Handler<"source.add"> = (state, op) => {
  const source = { ...op.source, content: toLf(op.source.content) };
  if (state.sources.length >= LIMITS.sources) {
    return reject("quota", `a project holds at most ${LIMITS.sources} sources`);
  }
  if (allEntityIds(state).has(source.id)) return reject("duplicate_id", `${source.id} is already used`);
  const bad = pathProblem(source.path);
  if (bad) return bad;
  const owner = pathOwner(state.sources, source.path);
  if (owner !== undefined) return reject("duplicate_id", `V3-PATH: ${source.path} is already the path of ${owner}`);
  if (LONE_SURROGATE.test(source.content)) return reject("malformed", "the content holds a lone surrogate");
  return {
    state: { ...state, sources: upsertById(state.sources, source) },
    inverse: [{ k: "source.remove", id: source.id }],
  };
};

const sourceRemove: Handler<"source.remove"> = (state, op) => {
  const source = findById(state.sources, op.id);
  if (!source) return reject("missing_target", `${op.id} does not exist`);
  const entries = state.boards.flatMap((board, i) =>
    board.firmware?.entry === op.id ? [pointer("boards", i, "firmware", "entry")] : [],
  );
  if (entries.length > 0) return reject("referenced_by", `${op.id} is the entry of a firmware`, entries);

  const inverse: Op[] = [{ k: "source.add", source }];
  const boards = state.boards.map((board) => {
    const firmware = board.firmware;
    if (!firmware?.sources.includes(op.id)) return board;
    inverse.push({ k: "board.set", id: board.id, firmware });
    const sources = firmware.sources.filter((id) => id !== op.id) as Firmware["sources"];
    return { ...board, firmware: { ...firmware, sources } };
  });
  return {
    state: { ...state, sources: removeById(state.sources, op.id), boards: inverse.length > 1 ? boards : state.boards },
    inverse,
  };
};

const sourceRename: Handler<"source.rename"> = (state, op) => {
  const source = findById(state.sources, op.id);
  if (!source) return reject("missing_target", `${op.id} does not exist`);
  const bad = pathProblem(op.path);
  if (bad) return bad;
  return {
    state: { ...state, sources: upsertById(state.sources, { ...source, path: op.path }) },
    inverse: [{ k: "source.rename", id: op.id, path: source.path }],
  };
};

export interface Range {
  pos: number;
  del: number;
}

/** Moves `a` to where it lands after `b` was applied first. The server order wins ties (RS-09 `doc.js` `txText`). */
export function shift(a: Range, b: Range & { ins: string }): Range {
  const bEnd = b.pos + b.del;
  const start = (p: number) => (p < b.pos ? p : p >= bEnd ? p - b.del + b.ins.length : b.pos + b.ins.length);
  const end = (p: number) => (p <= b.pos ? p : p >= bEnd ? p - b.del + b.ins.length : b.pos);
  const pos = start(a.pos);
  return { pos, del: a.del === 0 ? 0 : Math.max(pos, end(a.pos + a.del)) - pos };
}

/** Edits that put `deleted` back over the `inserted` code units at `pos`, cut so none breaks a surrogate pair. */
function restoreEdits(id: string, baseSeq: number, pos: number, inserted: number, deleted: string): Op[] {
  const edits: Op[] = [];
  let at = 0;
  do {
    let to = Math.min(at + RESTORE_CHUNK, deleted.length);
    if (to < deleted.length && isHigh(deleted.charCodeAt(to - 1))) to -= 1;
    edits.push({
      k: "source.edit",
      id,
      baseSeq,
      pos: pos + at,
      del: at === 0 ? inserted : 0,
      ins: deleted.slice(at, to),
    });
    at = to;
  } while (at < deleted.length);
  return edits;
}

const sourceEdit: Handler<"source.edit"> = (state, op) => {
  const source = findById(state.sources, op.id);
  if (!source) return reject("missing_target", `${op.id} does not exist`);
  if (op.baseSeq < state.history.baseRevision) {
    return reject(
      "stale_base",
      `baseSeq ${op.baseSeq} is older than the retained history (${state.history.baseRevision})`,
    );
  }
  const ins = toLf(op.ins);
  if (LONE_SURROGATE.test(ins)) return reject("malformed", "the inserted text holds a lone surrogate");

  const { pos, del } = state.history.ops.reduce<Range>(
    (range, entry) =>
      entry.seq > op.baseSeq && entry.op.k === "source.edit" && entry.op.id === op.id ? shift(range, entry.op) : range,
    { pos: op.pos, del: op.del },
  );
  const text = source.content;
  if (pos + del > text.length) return reject("malformed", `the edit reaches ${pos + del} of ${text.length} code units`);
  if (splitsPair(text, pos) || splitsPair(text, pos + del)) {
    return reject("malformed", "the edit cuts a surrogate pair in two");
  }

  const content = text.slice(0, pos) + ins + text.slice(pos + del);
  const bytes = utf8Length(content);
  if (bytes > LIMITS.sourceBytes) {
    return reject("quota", `the edit makes the source ${bytes} bytes; the limit is ${LIMITS.sourceBytes}`);
  }
  return {
    state: { ...state, sources: upsertById(state.sources, { ...source, content }) },
    inverse: restoreEdits(op.id, state.revision + 1, pos, ins.length, text.slice(pos, pos + del)),
  };
};

export const SOURCE_HANDLERS = {
  "source.add": sourceAdd,
  "source.remove": sourceRemove,
  "source.rename": sourceRename,
  "source.edit": sourceEdit,
};
