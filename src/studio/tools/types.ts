import type { Op, View } from "../../project/generated/types.ts";
import type { Hit, Overlay, ResolvedPartShape, Scene, Viewport } from "../engine/types.ts";
import type { DocView } from "../stores/doc.ts";
import type { Selectable, ToolId } from "../stores/session.ts";

export type { ToolId } from "../stores/session.ts";

export type ToolPointerEvent = {
  type: "down" | "move" | "up" | "cancel";
  xPx: number;
  yPx: number;
  xMm: number;
  yMm: number;
  button: 0 | 1 | 2;
  shift: boolean;
  alt: boolean;
  ctrl: boolean;
  pointerType: "mouse" | "touch" | "pen";
  pointerId: number;
};

export type ToolKeyEvent = { key: string; shift: boolean; alt: boolean; ctrl: boolean };

export type ToolCtx = {
  doc: DocView;
  view: View;
  viewport: Viewport;
  scene: Scene;
  selection: Selectable[];
  snapMm: number;
  hit(ev: ToolPointerEvent): Hit | null;
  resolve(defRef: string): ResolvedPartShape;
};

/** What a tool wants done. Only the tool host turns `commit` into a document change. */
export type ToolResult =
  | { kind: "none" }
  | { kind: "preview" }
  | { kind: "commit"; batch: Op[]; label: string }
  | { kind: "cancel" }
  | { kind: "switch"; tool: ToolId };

/** A state machine over pointer and key events. It never writes the document: it returns ops. */
export interface Tool {
  id: ToolId;
  cursor(ctx: ToolCtx): string;
  pointer(ev: ToolPointerEvent, ctx: ToolCtx): ToolResult;
  key(ev: ToolKeyEvent, ctx: ToolCtx): ToolResult;
  /** A ghost, a rubber band, valid and invalid rings. */
  preview(ctx: ToolCtx): Overlay[];
}
