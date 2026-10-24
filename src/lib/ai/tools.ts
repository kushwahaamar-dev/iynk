// The lab partner's tools (HX-CONTRACT H4). One zod schema per tool is the
// source of truth: the JSON Schema the model sees is derived from it, and the
// same schema validates the model's arguments wherever the tool runs.
// Shared by the server (/api/ai/chat) and the client, so nothing here may
// touch the DOM or server-only modules.

import { z } from "zod";

/** The LabDock tabs (H3), in the order hx:dock shows them. */
export const DOCK_TABS = ["partner", "together", "real", "passport", "hardware"] as const;
export type DockTab = (typeof DOCK_TABS)[number];

const terminal = z
  .string()
  .min(1)
  .max(64)
  .describe('A terminal exactly as the bench description writes it, e.g. "uno.D13" or "led1.anode".');

const wire = z.object({ from: terminal, to: terminal });

const partAdd = z.object({
  part: z.string().min(1).max(64).describe("The part type from the bench's part list, e.g. \"led\" or \"resistor-220\"."),
  id: z.string().min(1).max(32).optional().describe("Optional id for the new part."),
});

const partSet = z.object({
  id: z.string().min(1).max(32).describe("The id of a part on the bench."),
  prop: z.string().min(1).max(32).describe("The property to change, as listed for that part."),
  value: z.union([z.string().max(64), z.number(), z.boolean()]),
});

const searchDatasheetArgs = z.object({
  query: z
    .string()
    .min(2)
    .max(200)
    .describe('A precise search, ideally a part number and what you need, e.g. "SG90 servo pulse width range".'),
});

const findPartsArgs = z.object({
  parts: z
    .array(z.string().min(2).max(120))
    .min(1)
    .max(10)
    .describe("The parts to price, one short product query each."),
});

const highlightPartArgs = z.object({
  partId: z.string().min(1).max(64).describe("A part id from the bench description."),
  note: z.string().max(140).optional().describe("One short line shown next to the part, in the learner's language."),
});

const proposeChangeArgs = z.object({
  kind: z.enum(["code", "wire", "part"]),
  reason: z.string().min(1).max(300).describe("Why this change fixes the problem, in the learner's language."),
  patch: z
    .object({
      find: z
        .string()
        .max(4000)
        .optional()
        .describe("code: exact text from the current code to replace; leave empty to replace the whole program."),
      replace: z.string().max(8000).optional().describe("code: the new text."),
      connect: z.array(wire).max(8).optional().describe("wire: wires to add."),
      disconnect: z.array(wire).max(8).optional().describe("wire: wires to remove."),
      add: z.array(partAdd).max(4).optional().describe("part: parts to place."),
      remove: z.array(z.string().min(1).max(32)).max(4).optional().describe("part: ids of parts to remove."),
      set: z.array(partSet).max(8).optional().describe("part: property changes."),
    })
    .describe("Fill only the fields for the chosen kind."),
});

const askPeerArgs = z.object({
  peerId: z.string().min(1).max(64).describe("The id of a peer from the room list."),
  question: z
    .string()
    .min(4)
    .max(300)
    .describe("A teach-back question for that peer: ask them to explain, not to fix it for the learner."),
});

const openPanelArgs = z.object({
  tab: z.enum(DOCK_TABS).describe("partner, together (the room), real (parts and prices), passport or hardware."),
});

const argSchemas = {
  search_datasheet: searchDatasheetArgs,
  find_parts: findPartsArgs,
  highlight_part: highlightPartArgs,
  propose_change: proposeChangeArgs,
  ask_peer: askPeerArgs,
  open_panel: openPanelArgs,
} as const;

export type PartnerToolName = keyof typeof argSchemas;
export type PartnerToolArgs = { [N in PartnerToolName]: z.infer<(typeof argSchemas)[N]> };

export type ToolParameters = {
  type: "object";
  properties: Record<string, unknown>;
  required?: string[];
};

export type PartnerTool = {
  name: PartnerToolName;
  description: string;
  parameters: ToolParameters;
  runs: "server" | "client";
};

function parameters(schema: z.ZodType): ToolParameters {
  // The model only needs the schema itself; some OpenAI-compatible APIs reject "$schema".
  const { $schema, ...rest } = z.toJSONSchema(schema, { io: "input" }) as Record<string, unknown>;
  void $schema;
  return rest as ToolParameters;
}

const definitions: Array<Omit<PartnerTool, "parameters">> = [
  {
    name: "search_datasheet",
    runs: "server",
    description:
      "Search the web for a datasheet, pinout or reference page and read the best result. Use it before stating a pin, voltage, current or timing you are not sure of, and cite what it returns.",
  },
  {
    name: "find_parts",
    runs: "server",
    description: "Look up live prices and stock for real parts, so the learner can build this for real.",
  },
  {
    name: "highlight_part",
    runs: "client",
    description:
      "Point at one part in the learner's 3D figure and show a short note beside it. Use it whenever you talk about a specific part.",
  },
  {
    name: "propose_change",
    runs: "client",
    description:
      "Offer one concrete change to the code, the wiring or the parts. The learner sees a diff and accepts or rejects it. Only offer it after a hint did not help, or when the learner asks for the fix.",
  },
  {
    name: "ask_peer",
    runs: "client",
    description:
      "Ask a person in the room for help with a teach-back question. Prefer a peer who has done the relevant lesson. People first: try this before giving the answer yourself.",
  },
  {
    name: "open_panel",
    runs: "client",
    description: "Open another tab of the lab dock, e.g. the room or the real-parts list.",
  },
];

export const partnerTools: readonly PartnerTool[] = definitions.map((tool) => ({
  ...tool,
  parameters: parameters(argSchemas[tool.name]),
}));

export const PARTNER_TOOL_NAMES = partnerTools.map((tool) => tool.name);

export function isPartnerTool(name: string): name is PartnerToolName {
  return Object.hasOwn(argSchemas, name);
}

export function toolRuns(name: PartnerToolName): PartnerTool["runs"] {
  return definitions.find((tool) => tool.name === name)!.runs;
}

export type Wire = z.infer<typeof wire>;
export type PartAdd = z.infer<typeof partAdd>;
export type PartSet = z.infer<typeof partSet>;

/** propose_change after validation, one shape per kind. */
export type ProposedChange =
  | { kind: "code"; reason: string; find: string; replace: string }
  | { kind: "wire"; reason: string; connect: Wire[]; disconnect: Wire[] }
  | { kind: "part"; reason: string; add: PartAdd[]; remove: string[]; set: PartSet[] };

export type ToolCall =
  | { [N in Exclude<PartnerToolName, "propose_change">]: { id: string; name: N; args: PartnerToolArgs[N] } }[Exclude<
      PartnerToolName,
      "propose_change"
    >]
  | { id: string; name: "propose_change"; args: ProposedChange };

export type ParsedToolCall = { ok: true; call: ToolCall } | { ok: false; error: string };

function normaliseChange(args: PartnerToolArgs["propose_change"]): ProposedChange | string {
  const { kind, reason, patch } = args;
  if (kind === "code") {
    if (patch.replace === undefined) return "propose_change: a code patch needs replace";
    return { kind, reason, find: patch.find ?? "", replace: patch.replace };
  }
  if (kind === "wire") {
    const connect = patch.connect ?? [];
    const disconnect = patch.disconnect ?? [];
    if (connect.length + disconnect.length === 0) return "propose_change: a wire patch needs connect or disconnect";
    return { kind, reason, connect, disconnect };
  }
  const add = patch.add ?? [];
  const remove = patch.remove ?? [];
  const set = patch.set ?? [];
  if (add.length + remove.length + set.length === 0) return "propose_change: a part patch needs add, remove or set";
  return { kind, reason, add, remove, set };
}

/**
 * Validates a tool call from the model. `args` may be the raw JSON string the
 * API streams or an already parsed object. Errors are short English lines
 * meant for the model, which gets them back as the tool result.
 */
export function parseToolCall(id: string, name: string, args: unknown): ParsedToolCall {
  if (!isPartnerTool(name)) return { ok: false, error: `unknown tool "${name}"` };
  let value = args;
  if (typeof value === "string") {
    try {
      value = value.trim() === "" ? {} : JSON.parse(value);
    } catch {
      return { ok: false, error: `${name}: arguments are not valid JSON` };
    }
  }
  const parsed = argSchemas[name].safeParse(value);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const where = issue?.path.length ? ` at ${issue.path.join(".")}` : "";
    return { ok: false, error: `${name}: ${issue?.message ?? "invalid arguments"}${where}` };
  }
  if (name === "propose_change") {
    const change = normaliseChange(parsed.data as PartnerToolArgs["propose_change"]);
    if (typeof change === "string") return { ok: false, error: change };
    return { ok: true, call: { id, name, args: change } };
  }
  return { ok: true, call: { id, name, args: parsed.data } as ToolCall };
}
