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
