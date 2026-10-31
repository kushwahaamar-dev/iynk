import { afterEach, describe, expect, it, vi } from "vitest";
import { listCommands, registerCommand, runCommand } from "./commands.ts";
import type { Command, CommandCtx } from "./commands.ts";

const ctx = {} as CommandCtx;
const offs: (() => void)[] = [];
const add = (c: Partial<Command> & { id: string }) => {
  const command: Command = { labelKey: "x", scope: "global", enabled: () => true, run: () => {}, ...c };
  offs.push(registerCommand(command));
  return command;
};

afterEach(() => {
  for (const off of offs.splice(0)) off();
});

describe("commands", () => {
  it("runs an enabled command and reports it", () => {
    const run = vi.fn();
    add({ id: "t.run", run });
    expect(runCommand("t.run", ctx)).toBe(true);
    expect(run).toHaveBeenCalledWith(ctx);
  });

  it("does not run a disabled or unknown command", () => {
    const run = vi.fn();
    add({ id: "t.off", enabled: () => false, run });
    expect(runCommand("t.off", ctx)).toBe(false);
    expect(runCommand("t.nothing", ctx)).toBe(false);
    expect(run).not.toHaveBeenCalled();
  });

  it("throws on a duplicate id and frees the id on unregister", () => {
    add({ id: "t.dup" });
    expect(() => registerCommand({ id: "t.dup", labelKey: "x", scope: "global", enabled: () => true, run: () => {} })).toThrow(/t\.dup/);
    offs.pop()!();
    expect(() => add({ id: "t.dup" })).not.toThrow();
  });

  it("lists registered commands, which a caller can filter by scope", () => {
    add({ id: "t.canvas", scope: "canvas" });
    add({ id: "t.code", scope: "code" });
    const ids = listCommands().filter((c) => c.scope === "canvas").map((c) => c.id);
    expect(ids).toEqual(["t.canvas"]);
  });
});
