import { z } from "zod";

/** The dock tabs the partner may open (D-016: no passport tab). */
export const DOCK_TABS = ["partner", "real", "hardware"] as const;

export const PART_FIELDS = ["identity", "pins", "ratings", "sources", "simulation"] as const;

export const TOOL_DOC_TOPICS = ["tiers", "netlist", "files", "simulation", "faults", "ops", "shortcuts"] as const;

const id = (what: string) => z.string().min(1).max(80).describe(what);

const lineRange = { from: z.number().int().min(1).max(1_000_000).optional(), to: z.number().int().min(1).max(1_000_000).optional() };

export const toolSchemas = {
  get_project_summary: z.strictObject({
    level: z.enum(["D0", "D1", "D2"]).default("D1").describe("D0 counts only, D1 adds the parts, D2 adds nets, files and tests."),
  }),
  get_component: z.strictObject({ id: id("A component or board id as the context lists it, e.g. cmp_r1 or brd_uno.") }),
  get_netlist: z.strictObject({
    nets: z.array(id("A net id.")).max(40).optional(),
    around: id("A component id: the nets of its pins and what they reach.").optional(),
    depth: z.number().int().min(1).max(3).optional(),
    max: z.number().int().min(1).max(200).optional(),
  }),
  get_source: z.strictObject({ id: id("A source id, e.g. src_main."), ...lineRange }),
  get_sim_state: z.strictObject({}),
  get_trace: z.strictObject({
    target: z.string().min(1).max(120).describe("A pin address, a net id or a reading target."),
    from_ms: z.number().min(0).max(86_400_000),
    to_ms: z.number().min(0).max(86_400_000),
    maxPoints: z.number().int().min(1).max(200).default(100),
  }),
  get_diagnostics: z.strictObject({ kind: z.enum(["compile", "runtime", "solver", "faults", "rules"]).optional() }),
  get_objectives: z.strictObject({}),
  get_part_facts: z
    .strictObject({
      ref: id("A part id, e.g. core.led-5mm.").optional(),
      component: id("A component id whose part to describe.").optional(),
      fields: z.array(z.enum(PART_FIELDS)).max(PART_FIELDS.length).optional(),
    })
    .refine((a) => (a.ref === undefined) !== (a.component === undefined), { message: "give exactly one of ref and component" }),
  search_library: z.strictObject({
    query: z.string().min(1).max(120),
    filters: z
      .strictObject({
        kind: z.string().min(1).max(40).optional(),
        pins: z.number().int().min(1).max(1024).optional(),
        domain: z.string().min(1).max(40).optional(),
      })
      .optional(),
    limit: z.number().int().min(1).max(10).optional(),
  }),
  read_tool_doc: z.strictObject({ topic: z.enum(TOOL_DOC_TOPICS) }),
  check_rules: z.strictObject({ scope: z.array(id("A net or component id.")).max(40).optional() }),
  highlight: z.strictObject({
    ref: z.string().min(1).max(160).describe("Any reference the context uses, e.g. cmp_r1, cmp_r1.P1, net_d12, src_main:3-4."),
    note: z.string().max(140).optional(),
  }),
  open_panel: z.strictObject({ tab: z.enum(DOCK_TABS) }),
} as const;

export type ToolName = keyof typeof toolSchemas;
export type ToolArgs<N extends ToolName> = z.output<(typeof toolSchemas)[N]>;

export const TOOL_NAMES = Object.keys(toolSchemas) as ToolName[];

export function jsonSchemaOf(name: ToolName): object {
  return z.toJSONSchema(toolSchemas[name], { io: "input" });
}
