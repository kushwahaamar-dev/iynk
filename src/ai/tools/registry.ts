import type { TrustClass } from "../context/fences.ts";
import { cleanField } from "../context/sanitize.ts";
import { makeNonce } from "../context/fences.ts";
import type { Mode, ToolCallRecord } from "../log.ts";
import type { GateResult } from "../proposals/guard.ts";
import type { OpGroup } from "../proposals/types.ts";
import type { PartnerSources } from "../sources.ts";
import { runRead, READ_TAINT } from "./read.ts";
import type { ReadToolName } from "./read.ts";
import { parseRef, resolveRef } from "./refs.ts";
import type { Ref } from "./refs.ts";
import { TOOL_NAMES, jsonSchemaOf, toolSchemas } from "./schemas.ts";
import type { ToolName } from "./schemas.ts";

export { jsonSchemaOf };
export type { ToolName };

export type ToolClass = "read" | "compute" | "ui" | "effect" | "propose";

export type ToolErrorCode =
  | "bad_args"
  | "unknown_ref"
  | "too_large"
  | "not_allowed_in_mode"
  | "rate"
  | "not_modelled"
  | "no_key"
  | "denied"
  | "timeout"
  | "internal";

export type ToolResult =
  | { ok: true; text: string; bytes: number; taint: TrustClass[]; truncated: boolean }
  | { ok: false; code: ToolErrorCode; message: string };

export type ToolDef = {
  name: ToolName;
  cls: ToolClass;
  taint: TrustClass[];
  description: string;
  modes: readonly Mode[];
};

export type UiHost = {
  highlight(ref: Ref, note?: string): void;
  openPanel(tab: string): void;
};

const ALL_MODES: readonly Mode[] = ["socratic", "beginner", "direct", "debugging", "advanced"];
const CALLS_PER_ROUND = 8;
const CALLS_PER_MESSAGE = 20;
const HIGHLIGHTS_PER_MESSAGE = 8;

const def = (name: ToolName, cls: ToolClass, description: string): ToolDef => ({
  name,
  cls,
  taint: cls === "ui" ? [] : READ_TAINT[name as ReadToolName],
  description,
  modes: ALL_MODES,
});

export const TOOLS: readonly ToolDef[] = [
  def("get_project_summary", "read", "A digest of the project at level D0 (counts), D1 (plus the parts) or D2 (plus nets, files and tests)."),
  def("get_component", "read", "One part or board: its part and version, parameters, each pin with its net and what shares that net, ratings and what the model leaves out."),
  def("get_netlist", "read", "Net rows with their member pins, for chosen nets or around one component to a depth of 1 to 3."),
  def("get_source", "read", "Numbered lines of one source file, at most 400 at a time."),
  def("get_sim_state", "read", "The run state, pin levels, solved readings with tier and provenance, the serial tail and whether the solver converged."),
  def("get_trace", "read", "A decimated trace of one target between two times, with the lowest and highest value per bucket."),
  def("get_diagnostics", "read", "Compile and runtime messages, solver state, the symptoms seen and the rule findings. Hidden causes are not shown."),
  def("get_objectives", "read", "The guide steps, the tests and their visible checks, and the number of hidden checks."),
  def("get_part_facts", "read", "Library facts for a part id or for the part behind a component: pins, ratings with their source, sources, tier and what is not modelled."),
  def("search_library", "read", "Search the part library by words, optionally by kind, pin count or domain."),
  def("read_tool_doc", "read", "Short help text on tiers, netlist, files, simulation, faults, ops or shortcuts."),
  def("check_rules", "compute", "Run the electrical rules check, optionally on chosen nets or components."),
  def("highlight", "ui", "Point at something in the project for the person: a part, a pin, a net or lines of a file. The reference must exist."),
  def("open_panel", "ui", "Open a tab of the dock for the person."),
];

export function toolsFor(mode: Mode, flags: { effect: boolean }): readonly ToolDef[] {
  return TOOLS.filter((t) => t.modes.includes(mode) && (flags.effect || t.cls !== "effect"));
}

const PROPOSE_TOOLS: ReadonlySet<string> = new Set(["propose_ops", "try_ops", "request_ops_group"]);
const OP_GROUPS: readonly OpGroup[] = ["core", "board", "mech", "sim", "meta"];

/** The tools one model call may see. B15 tools that are not registered yet are simply absent. */
export function toolsForCall(
  mode: Mode,
  gate: GateResult,
  loaded: ReadonlySet<OpGroup>,
  tainted: boolean,
  flags: { effect: boolean },
): readonly ToolDef[] {
  const withheld = new Set<string>(PROPOSE_TOOLS);
  if (mode === "socratic") withheld.add("get_revision_diff");
  if (tainted) withheld.add("draft_buddy_message");
  const tools = toolsFor(mode, flags).filter((t) => !withheld.has(t.name));
  if (gate.offer) {
    const offered = new Set<string>(PROPOSE_TOOLS);
    if (OP_GROUPS.every((g) => loaded.has(g))) offered.delete("request_ops_group");
    tools.push(...TOOLS.filter((t) => t.modes.includes(mode) && offered.has(t.name)));
  }
  return tools.sort((a, b) => a.name.localeCompare(b.name));
}

const fail = (code: ToolErrorCode, message: string): ToolResult => ({ ok: false, code, message });
const okText = (text: string): ToolResult => ({ ok: true, text, bytes: text.length, taint: [], truncated: false });
const isToolName = (name: string): name is ToolName => (TOOL_NAMES as readonly string[]).includes(name);
const isReadTool = (name: ToolName): name is ReadToolName => name !== "highlight" && name !== "open_panel";

export function createToolRunner(
  s: PartnerSources,
  ui: UiHost,
  o: { random(): number; onRun?(record: ToolCallRecord): void },
): {
  run(call: { id: string; name: string; argsJson: string }, ctx: { mode: Mode; round: number }): Promise<ToolResult>;
  counters(): { perRound: number; perMessage: number };
  resetMessage(): void;
} {
  let perMessage = 0;
  let perRound = 0;
  let highlights = 0;
  let round: { number: number; nonce: string } | null = null;

  function enter(number: number): string {
    if (!round || round.number !== number) {
      round = { number, nonce: makeNonce(o.random) };
      perRound = 0;
    }
    return round.nonce;
  }

  function execute(name: ToolName, args: unknown, nonce: string): ToolResult {
    if (isReadTool(name)) return runRead(name, args, s, { nonce });
    const parsed = toolSchemas[name].safeParse(args);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return fail("bad_args", `${issue.path.join(".") || "arguments"}: ${cleanField(issue.message, 120).text}`);
    }
    if (name === "open_panel") {
      ui.openPanel((parsed.data as { tab: string }).tab);
      return okText("ok");
    }
    const { ref: token, note } = parsed.data as { ref: string; note?: string };
    const ref = parseRef(token);
    const resolved = ref ? resolveRef(ref, s) : null;
    if (!ref || !resolved?.ok) {
      const near = resolved && !resolved.ok && resolved.nearest.length > 0 ? ` Nearest: ${resolved.nearest.join(", ")}.` : "";
      return fail("unknown_ref", `No reference ${cleanField(token, 60).text} in this project.${near}`);
    }
    if (highlights >= HIGHLIGHTS_PER_MESSAGE) return fail("rate", `At most ${HIGHLIGHTS_PER_MESSAGE} highlights per message.`);
    highlights++;
    ui.highlight(ref, note === undefined ? undefined : cleanField(note, 140).text);
    return okText("ok");
  }

  async function run(call: { id: string; name: string; argsJson: string }, ctx: { mode: Mode; round: number }): Promise<ToolResult> {
    const started = Date.now();
    const nonce = enter(ctx.round);
    const result = gate(call, ctx.mode, nonce);
    const bytes = result.ok ? result.bytes : 0;
    o.onRun?.({ name: call.name, ok: result.ok, ...(result.ok ? {} : { code: result.code }), ms: Date.now() - started, bytes });
    return result;
  }

  function gate(call: { name: string; argsJson: string }, mode: Mode, nonce: string): ToolResult {
    let args: unknown;
    try {
      args = call.argsJson.trim() === "" ? {} : JSON.parse(call.argsJson);
    } catch {
      return fail("bad_args", "The arguments are not valid JSON.");
    }
    if (!isToolName(call.name)) return fail("bad_args", `There is no tool named ${cleanField(call.name, 40).text}.`);
    const tool = TOOLS.find((t) => t.name === call.name)!;
    if (!tool.modes.includes(mode)) return fail("not_allowed_in_mode", `${tool.name} is not available in ${mode} mode.`);
    if (perRound >= CALLS_PER_ROUND) return fail("rate", `At most ${CALLS_PER_ROUND} tool calls per round.`);
    if (perMessage >= CALLS_PER_MESSAGE) return fail("rate", `At most ${CALLS_PER_MESSAGE} tool calls per message.`);
    perRound++;
    perMessage++;
    return execute(tool.name, args, nonce);
  }

  return {
    run,
    counters: () => ({ perRound, perMessage }),
    resetMessage() {
      perMessage = 0;
      perRound = 0;
      highlights = 0;
      round = null;
    },
  };
}
