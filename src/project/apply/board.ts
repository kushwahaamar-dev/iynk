import { LIMITS } from "../../core/limits.ts";
import type { Board } from "../generated/types.ts";
import { validateBoard } from "../generated/validate.mjs";
import { dependencyOf, patchInstance, removeInstance } from "./component.ts";
import type { Patch } from "./component.ts";
import { allEntityIds, findById, reject, schemaMessage, upsertById } from "./types.ts";
import type { Bag, Handler } from "./types.ts";

const boardAdd: Handler<"board.add"> = (state, op) => {
  const { board } = op;
  if (state.boards.length >= LIMITS.boards) return reject("quota", `a project holds at most ${LIMITS.boards} boards`);
  if (allEntityIds(state).has(board.id)) return reject("duplicate_id", `${board.id} is already used`);
  if (dependencyOf(state, board.definition)?.interface.role !== "board") {
    return reject("unknown_definition", `${board.definition.ref}@${board.definition.version} is not a board`);
  }
  return {
    state: { ...state, boards: upsertById(state.boards, board) },
    inverse: [{ k: "board.remove", id: board.id }],
  };
};

const BOARD_SET_KEYS = ["label", "variant", "powerInput", "refdes"];

const boardSet: Handler<"board.set"> = (state, op) => {
  const board = findById(state.boards, op.id);
  if (!board) return reject("missing_target", `${op.id} does not exist`);

  // Only null may stand in `set.firmware`: it is the one way to take firmware away. A new value goes in `firmware`.
  const { firmware: removal, ...fields } = (op.set ?? {}) as Bag;
  if (removal !== undefined && removal !== null) {
    return reject("malformed", "set.firmware can only be null; send a new firmware in the firmware field");
  }
  const patch: Patch = {};
  if (Object.keys(fields).length > 0) patch.set = fields;
  if (op.params) patch.params = op.params;
  const patched = patchInstance(board, patch, BOARD_SET_KEYS);
  if ("code" in patched) return patched;

  const next: Board = patched.next;
  if (op.firmware !== undefined) next.firmware = op.firmware;
  else if (removal === null) delete next.firmware;
  if (!validateBoard(next)) return reject("malformed", schemaMessage(validateBoard.errors));

  const undo: Patch & { firmware?: Board["firmware"] } = patched.undo;
  if (op.firmware !== undefined || removal === null) {
    if (board.firmware) undo.firmware = board.firmware;
    else undo.set = { ...undo.set, firmware: null };
  }
  return {
    state: { ...state, boards: upsertById(state.boards, next) },
    inverse: [{ k: "board.set", id: op.id, ...undo }],
  };
};

const boardRemove: Handler<"board.remove"> = (state, op) => removeInstance(state, op.id, "board");

export const BOARD_HANDLERS = {
  "board.add": boardAdd,
  "board.set": boardSet,
  "board.remove": boardRemove,
};
