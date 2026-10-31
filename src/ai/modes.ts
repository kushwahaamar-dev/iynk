import type { ProjectKind } from "../project/convert/index.ts";
import type { ToolSpec } from "./adapters/types.ts";
import { TOOLS, jsonSchemaOf } from "./tools/registry.ts";
import type { ToolName } from "./tools/registry.ts";

export type Mode = "direct" | "debugging" | "beginner" | "socratic" | "advanced";

type ModeSettings = {
  tier: "fast" | "standard" | "strong";
  outputTokens: number;
  readTools: readonly ToolName[];
  /** End the answer with one short question that checks the person followed. */
  quiz: boolean;
};

const BEGINNER_TOOLS: readonly ToolName[] = [
  "get_project_summary",
  "get_component",
  "get_netlist",
  "get_source",
  "get_sim_state",
  "get_diagnostics",
  "get_objectives",
  "get_part_facts",
  "read_tool_doc",
  "highlight",
  "open_panel",
];

const ALL_TOOLS: readonly ToolName[] = [...BEGINNER_TOOLS, "get_trace", "search_library", "check_rules"];

export const MODE_SETTINGS: Record<Mode, ModeSettings> = {
  direct: { tier: "standard", outputTokens: 500, readTools: ALL_TOOLS, quiz: false },
  debugging: { tier: "strong", outputTokens: 600, readTools: ALL_TOOLS, quiz: false },
  beginner: { tier: "fast", outputTokens: 350, readTools: BEGINNER_TOOLS, quiz: true },
  socratic: { tier: "fast", outputTokens: 180, readTools: BEGINNER_TOOLS, quiz: false },
  advanced: { tier: "standard", outputTokens: 900, readTools: ALL_TOOLS, quiz: false },
};

export function defaultMode(kind: ProjectKind): Mode {
  switch (kind) {
    case "lesson":
    case "task":
      return "socratic";
    case "tour":
      return "beginner";
    case "bench":
    case "craft":
      return "debugging";
  }
}

export function specsFor(mode: Mode): ToolSpec[] {
  return MODE_SETTINGS[mode].readTools.map((name) => ({
    name,
    description: TOOLS.find((t) => t.name === name)!.description,
    parameters: jsonSchemaOf(name) as Record<string, unknown>,
  }));
}
