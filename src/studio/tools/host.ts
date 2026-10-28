import type { Overlay } from "../engine/types.ts";
import type { DocStore } from "../stores/doc.ts";
import type { SessionStore } from "../stores/session.ts";
import type { Tool, ToolCtx, ToolId, ToolKeyEvent, ToolPointerEvent, ToolResult } from "./types.ts";

type SessionStoreLike = Pick<SessionStore, "getState" | "setTool" | "setPreview" | "setStatus">;

export type ToolLogEntry = { tool: ToolId; result: ToolResult["kind"] };

const LOG_SIZE = 20;

/**
 * Routes pointer and key events to the active tool and is the one place a tool's `commit` becomes a document
 * change. A tool that throws is cancelled and the document is left alone.
 */
export interface ToolHost {
  register(tool: Tool): void;
  setTool(id: ToolId): void;
  pointer(ev: ToolPointerEvent, ctx: ToolCtx): void;
  /** True when the tool or the host used the key. */
  key(ev: ToolKeyEvent, ctx: ToolCtx): boolean;
  /** Ends a gesture in flight, as a lost pointer or a second finger does. */
  cancel(): void;
  preview(): Overlay[];
  /** The last 20 results, kept only in a build made with `NEXT_PUBLIC_STUDIO_TEST=1`. */
  recent(): readonly ToolLogEntry[];
}

export function createToolHost(deps: { doc: DocStore; session: SessionStoreLike }): ToolHost {
  const { doc, session } = deps;
  const tools = new Map<ToolId, Tool>();
  const failed = new Set<ToolId>();
  const log: ToolLogEntry[] = [];
  let overlays: Overlay[] = [];
  let gesture: { ev: ToolPointerEvent; ctx: ToolCtx } | null = null;

  const active = (): Tool | undefined => tools.get(session.getState().tool);

  function setPreview(next: Overlay[]) {
    overlays = next;
    session.setPreview(next);
  }

  function record(tool: Tool, result: ToolResult) {
    if (process.env.NEXT_PUBLIC_STUDIO_TEST !== "1") return;
    log.push({ tool: tool.id, result: result.kind });
    if (log.length > LOG_SIZE) log.shift();
  }

  function fail(tool: Tool) {
    if (!failed.has(tool.id)) {
      failed.add(tool.id);
      console.warn("[iynk] tool failed", tool.id);
    }
    gesture = null;
    setPreview([]);
  }

  function commit(result: Extract<ToolResult, { kind: "commit" }>) {
    const done = doc.commit(result.batch, { label: result.label });
    if (!done.ok) session.setStatus({ key: `ops.reject.${done.reject}`, params: { message: done.message } });
    setPreview([]);
  }

  function apply(tool: Tool, result: ToolResult, ctx: ToolCtx) {
    record(tool, result);
    switch (result.kind) {
      case "none":
        return;
      case "preview":
        setPreview(tool.preview(ctx));
        return;
      case "commit":
        gesture = null;
        commit(result);
        return;
      case "cancel":
        gesture = null;
        setPreview([]);
        return;
      case "switch":
        gesture = null;
        setPreview([]);
        session.setTool(result.tool);
    }
  }

  function run(tool: Tool, step: () => ToolResult, ctx: ToolCtx): ToolResult | null {
    try {
      const result = step();
      apply(tool, result, ctx);
      return result;
    } catch {
      fail(tool);
      return null;
    }
  }

  const host: ToolHost = {
    register(tool) {
      tools.set(tool.id, tool);
    },

    setTool(id) {
      if (id === session.getState().tool) return;
      host.cancel();
      setPreview([]);
      session.setTool(id);
    },

    pointer(ev, ctx) {
      const tool = active();
      if (!tool) return;
      if (ev.type === "down") gesture = { ev, ctx };
      else if (gesture) gesture = ev.type === "move" ? { ev: gesture.ev, ctx } : null;
      run(tool, () => tool.pointer(ev, ctx), ctx);
    },

    key(ev, ctx) {
      if (ev.key === "Escape" && gesture) {
        host.cancel();
        return true;
      }
      const tool = active();
      if (!tool) return false;
      const result = run(tool, () => tool.key(ev, ctx), ctx);
      return result !== null && result.kind !== "none";
    },

    cancel() {
      const tool = active();
      const current = gesture;
      gesture = null;
      if (!tool || !current) return;
      run(tool, () => tool.pointer({ ...current.ev, type: "cancel" }, current.ctx), current.ctx);
      setPreview([]);
    },

    preview: () => overlays,
    recent: () => log,
  };
  return host;
}
