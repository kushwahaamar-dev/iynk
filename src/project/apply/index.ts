import { CanonicalError, canonicalize, utf8Length } from "../../core/canonical.ts";
import { LIMITS } from "../../core/limits.ts";
import type { Op, Project } from "../generated/types.ts";
import type { SchemaError } from "../generated/validate.mjs";
import { validateOp } from "../generated/validate.mjs";
import { BOARD_HANDLERS } from "./board.ts";
import { COMPONENT_HANDLERS } from "./component.ts";
import { DOC_HANDLERS } from "./doc.ts";
import { NET_HANDLERS } from "./net.ts";
import { isReject, reject, schemaMessage } from "./types.ts";
import type { ApplyContext, ApplyOutcome, Handler, Reject } from "./types.ts";
import { VIEW_HANDLERS } from "./view.ts";
import { WIRE_HANDLERS } from "./wire.ts";

/** 12 steps of 40 ops (PDM 7.5). */
const MAX_BATCH_OPS = 480;

export const HANDLERS: Partial<{ [K in Op["k"]]: Handler<K> }> = {
  ...DOC_HANDLERS,
  ...BOARD_HANDLERS,
  ...COMPONENT_HANDLERS,
  ...NET_HANDLERS,
  ...VIEW_HANDLERS,
  ...WIRE_HANDLERS,
};

export const IMPLEMENTED_KINDS: readonly Op["k"][] = Object.keys(HANDLERS) as Op["k"][];

/** The error of the `oneOf` branch whose `k` matches, not the first one: that branch is always `meta.set`. */
function opMessage(errors: SchemaError[] | null): string {
  const branchOf = (error: SchemaError) => /^#\/oneOf\/(\d+)\//.exec(error.schemaPath)?.[1];
  const other = new Set((errors ?? []).filter((e) => e.schemaPath.endsWith("/properties/k/const")).map(branchOf));
  const own = errors?.find((e) => e.keyword !== "oneOf" && !other.has(branchOf(e)));
  return schemaMessage(own ? [own] : errors);
}

/** The size and shape checks every op passes before a handler sees it. */
function screen(op: Op): Reject | null {
  let bytes: number;
  try {
    bytes = utf8Length(canonicalize(op));
  } catch (error) {
    if (error instanceof CanonicalError) return reject("malformed", `${error.message} at ${error.path || "/"}`);
    throw error;
  }
  if (bytes > LIMITS.opEnvelopeBytes) {
    return reject("quota", `an op is ${bytes} bytes; the limit is ${LIMITS.opEnvelopeBytes}`);
  }
  return validateOp(op) ? null : reject("malformed", opMessage(validateOp.errors));
}

/**
 * Applies `ops` in order as one atomic step. Either every op lands and the revision grows by `ops.length`, or the
 * state is untouched. `inverse` undoes the whole batch when run from the front.
 */
export function applyBatch(state: Project, ops: readonly Op[], ctx: ApplyContext): ApplyOutcome {
  if (ops.length === 0) return { ok: false, reject: reject("malformed", "a batch needs at least one op") };
  if (ops.length > MAX_BATCH_OPS) {
    return { ok: false, reject: reject("malformed", `a batch holds at most ${MAX_BATCH_OPS} ops`) };
  }
  for (const op of ops) {
    const refused = screen(op);
    if (refused) return { ok: false, reject: refused };
  }

  let working = state;
  const undone: Op[][] = [];
  for (const op of ops) {
    const handler = HANDLERS[op.k] as Handler<Op["k"]> | undefined;
    if (!handler) return { ok: false, reject: reject("malformed", `op kind not implemented: ${op.k}`) };
    const result = handler(working, op, ctx);
    if (isReject(result)) return { ok: false, reject: result };
    working = result.state;
    undone.push(result.inverse);
  }

  const broken = ctx.invariants?.(working, state).find((diagnostic) => diagnostic.severity === "error");
  if (broken) return { ok: false, reject: reject("invariant", `${broken.code}: ${broken.message}`) };

  return {
    ok: true,
    state: { ...working, revision: state.revision + ops.length, meta: { ...working.meta, updatedAt: ctx.at } },
    inverse: undone.reverse().flat(),
  };
}

export const apply = (state: Project, op: Op, ctx: ApplyContext): ApplyOutcome => applyBatch(state, [op], ctx);

export type { ApplyContext, ApplyOutcome, Author, Handler, Reject, RejectCode } from "./types.ts";
