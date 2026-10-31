import type { DocStore } from "./stores/doc.ts";
import type { SessionStore } from "./stores/session.ts";
import type { UiStore } from "./stores/ui.ts";

export type CommandCtx = { doc: DocStore; session: SessionStore; ui: UiStore };

export interface Command {
  id: string;
  labelKey: string;
  keys?: string[];
  scope: "global" | "canvas" | "code" | "sim" | "lists";
  enabled(ctx: CommandCtx): boolean;
  run(ctx: CommandCtx): void;
}

const registry = new Map<string, Command>();

export function registerCommand(command: Command): () => void {
  if (registry.has(command.id)) throw new Error(`Command already registered: ${command.id}`);
  registry.set(command.id, command);
  return () => void (registry.get(command.id) === command && registry.delete(command.id));
}

/** Runs the command if it exists and is enabled. Keys and buttons call this and nothing else. */
export function runCommand(id: string, ctx: CommandCtx): boolean {
  const command = registry.get(id);
  if (!command || !command.enabled(ctx)) return false;
  command.run(ctx);
  return true;
}

export function listCommands(): readonly Command[] {
  return [...registry.values()];
}

export const FAULT_ACTIONS = ["break", "check", "explain", "restore", "hint"] as const;
export type FaultAction = (typeof FAULT_ACTIONS)[number];

const FAULT_LABELS: Record<FaultAction, string> = {
  break: "faults.breakIt.title",
  check: "faults.check.run",
  explain: "faults.breakIt.explain",
  restore: "faults.breakIt.restore",
  hint: "faults.hint.open",
};

/** The commands of the fault dock. They hand the action to `open`, which shows the dock and does it. */
export function registerFaultCommands(open: (action: FaultAction) => void, enabled: () => boolean): () => void {
  const offs = FAULT_ACTIONS.map((action) =>
    registerCommand({ id: `faults.${action}`, labelKey: FAULT_LABELS[action], scope: "global", enabled, run: () => open(action) }),
  );
  return () => offs.forEach((off) => off());
}
