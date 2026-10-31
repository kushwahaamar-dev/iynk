import { typingTarget } from "../../components/boardlab/shortcuts.ts";
import { registerCommand, runCommand } from "../commands.ts";
import type { Command, CommandCtx } from "../commands.ts";
import type { Op } from "../../project/generated/types.ts";
import type { WireEndRef } from "../rules/connect.ts";
import type { DocStore } from "../stores/doc.ts";
import type { SessionStore } from "../stores/session.ts";
import type { UiStore } from "../stores/ui.ts";
import { alignOps, distributeOps } from "../tools/align.ts";
import type { AlignKind, Box, DistributeAxis } from "../tools/align.ts";
import { expandSelection, groupOps, ungroupOps } from "../tools/groups.ts";
import { createNudger, firstFreePin, focusNextPart, netOfSelection, NUDGE_COALESCE_MS, partName, rotateBatch } from "../tools/keyboard.ts";
import type { Announcer } from "../tools/keyboard.ts";
import type { ToolHost } from "../tools/host.ts";
import type { ToolCtx, ToolKeyEvent } from "../tools/types.ts";
import { VIEW_DEFS, viewIdFor } from "../views/registry.ts";
import type { ViewKind } from "../views/registry.ts";

export type KeyScope = "global" | "canvas";

/**
 * One row of STUDIO 6.11. `id` is the id of the command the key runs, `keys` are the chords that run it (`Mod` is
 * Ctrl or Cmd), and `labelKey` names the row in the shortcuts dialog.
 */
export type KeyDef = {
  id: string;
  keys: readonly string[];
  scope: KeyScope;
  labelKey: string;
};

const row = (id: string, keys: readonly string[], scope: KeyScope = "canvas"): KeyDef => ({ id, keys, scope, labelKey: `studioWire.keys.${id}` });

const arrow = (name: string) => [`Arrow${name}`, `Shift+Arrow${name}`, `Alt+Arrow${name}`];

export const STUDIO_KEYS: readonly KeyDef[] = [
  row("undo", ["Mod+Z"], "global"),
  row("redo", ["Mod+Shift+Z", "Ctrl+Y"], "global"),
  row("edit.copy", ["Mod+C"]),
  row("edit.cut", ["Mod+X"]),
  row("edit.paste", ["Mod+V"]),
  row("edit.duplicate", ["Mod+D"]),
  row("edit.selectAll", ["Mod+A"]),
  row("edit.delete", ["Delete", "Backspace"]),
  row("edit.deleteDrawing", ["Shift+Delete"]),
  row("edit.cancel", ["Escape"]),
  row("edit.enter", ["Enter"]),
  row("place.quickAdd", ["A", "/"]),
  row("place.rotate", ["R"]),
  row("place.rotateBack", ["Shift+R"]),
  row("wire.fromSelection", ["W"]),
  row("align.left", ["Alt+Shift+ArrowLeft"]),
  row("align.right", ["Alt+Shift+ArrowRight"]),
  row("align.top", ["Alt+Shift+ArrowUp"]),
  row("align.bottom", ["Alt+Shift+ArrowDown"]),
  row("align.centerH", ["Alt+Shift+C"]),
  row("align.centerV", ["Alt+Shift+V"]),
  row("group.make", ["Mod+G"]),
  row("group.remove", ["Mod+Shift+G"]),
  row("move.left", arrow("Left")),
  row("move.right", arrow("Right")),
  row("move.up", arrow("Up")),
  row("move.down", arrow("Down")),
  row("view.breadboard", ["1"]),
  row("view.schematic", ["2"]),
  row("view.board", ["3"]),
  row("view.fit", ["0"]),
  row("view.fitSelection", ["F"]),
  row("view.zoomIn", ["Plus", "="]),
  row("view.zoomOut", ["Minus"]),
  row("view.pan", ["Space"]),
  row("view.grid", ["G"]),
  row("view.netHighlight", ["N"]),
  row("view.outline", ["O"]),
  row("sim.run", ["Mod+Enter"], "global"),
  row("sim.stop", ["Mod+."], "global"),
  row("sim.reset", ["Mod+Shift+Enter"], "global"),
  row("problems.next", ["F8"], "global"),
  row("problems.prev", ["Shift+F8"], "global"),
  row("region.next", ["F6"], "global"),
  row("region.prev", ["Shift+F6"], "global"),
  row("partner.focus", ["Mod+/"], "global"),
  row("guide.stepPrev", ["["]),
  row("guide.stepNext", ["]"]),
  row("help.keys", ["?"]),
];

/** Commands other modules own: the history commands and the run bar register these. */
const REGISTERED_ELSEWHERE: ReadonlySet<string> = new Set(["undo", "redo", "sim.run", "sim.stop", "sim.reset"]);

/**
 * Key presses for the whole blink circuit on the Uno (place the resistor and the LED, three wires through the
 * PinPicker, edit the value, run), counted as T-B4-20 counts: every `keydown`. Measured by `keyboardPath.test.tsx`.
 */
export const FULL_BLINK_PRESS_BUDGET = 38;

type Chord = { key: string; mod: boolean; ctrl: boolean; shift: boolean; alt: boolean; character: boolean };

const NAMED: Record<string, string> = { Space: " ", Plus: "+", Minus: "-", Left: "ArrowLeft", Right: "ArrowRight", Up: "ArrowUp", Down: "ArrowDown" };

function parseChord(spec: string): Chord {
  const parts = spec.split("+");
  const name = parts.pop()!;
  const key = NAMED[name] ?? (name.length === 1 ? name.toLowerCase() : name);
  const mod = parts.includes("Mod");
  const ctrl = parts.includes("Ctrl");
  const alt = parts.includes("Alt");
  return { key, mod, ctrl, shift: parts.includes("Shift"), alt, character: key.length === 1 && !mod && !ctrl && !alt };
}

const isLetter = (key: string): boolean => key.length === 1 && key.toLowerCase() !== key.toUpperCase();

type KeyLike = Pick<KeyboardEvent, "key" | "ctrlKey" | "metaKey" | "altKey" | "shiftKey"> & { code?: string };

function matches(chord: Chord, e: KeyLike): boolean {
  const accel = e.ctrlKey || e.metaKey;
  if (chord.mod ? !accel : chord.ctrl ? !e.ctrlKey : accel) return false;
  if (chord.alt !== e.altKey) return false;
  // Alt turns a letter into another character on a Mac, so an Alt chord reads the physical key.
  const key = chord.alt && isLetter(chord.key) && e.code?.startsWith("Key") ? e.code.slice(3).toLowerCase() : e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (key !== chord.key) return false;
  return isLetter(key) || key.length > 1 ? chord.shift === e.shiftKey : true;
}

const PARSED = STUDIO_KEYS.map((def) => ({ def, chords: def.keys.map(parseChord) }));

/** The def a key press runs, and whether it did so as a bare character key (one the person can switch off). */
export function defFor(e: KeyLike): { def: KeyDef; character: boolean } | null {
  for (const { def, chords } of PARSED) {
    const chord = chords.find((c) => matches(c, e));
    if (chord) return { def, character: chord.character };
  }
  return null;
}

const TREE_KEYS = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Home", "End", " "]);

/**
 * True when the focused element keeps the key for itself: a text field, the code editor, a dialog, a button asked to
 * act on Enter or Space, or a list (the Outline) that moves with the arrows and types ahead. W stays a shortcut in a
 * list, because wiring from the focused pin is the point of the Outline. Delete on a pin row does nothing: the pin is
 * not what is selected, its part is.
 */
function focusKeeps(el: Element | null, e: KeyLike): boolean {
  if (typingTarget(el, e.key)) return true;
  if (!(el instanceof HTMLElement)) return false;
  if (el.closest('[role="dialog"], [aria-modal="true"]')) return true;
  if ((e.key === "Enter" || e.key === " ") && el.closest('button, a[href], [role="button"], [role="tab"], [role="menuitem"], [role="option"]')) return true;
  if (!el.closest('[role="tree"]') || e.ctrlKey || e.metaKey || e.altKey) return false;
  if (e.key === "Enter") return el.closest('[data-kind="group"]') !== null;
  if (e.key === "Delete" || e.key === "Backspace") return el.closest('[data-kind="pin"]') !== null;
  return TREE_KEYS.has(e.key) || (e.key.length === 1 && e.key.toLowerCase() !== "w");
}

export type ViewControls = {
  fit(): void;
  fitSelection(): void;
  /** `factor` above 1 zooms in. */
  zoom(factor: number): void;
  /** Pan with the mouse while Space is held. */
  pan(on: boolean): void;
};

export type KeymapDeps = {
  doc: DocStore;
  session: SessionStore;
  ui: UiStore;
  host: ToolHost;
  announcer: Announcer;
  /** The tool context for the view as it is now. */
  toolCtx(): ToolCtx;
  view: ViewControls;
  focusPartSearch(): void;
  focusInspector(): void;
  focusPartner(): void;
  openPinPicker(from: WireEndRef): void;
  jumpProblem(dir: 1 | -1): void;
  focusRegion(dir: 1 | -1): void;
  showKeys(): void;
  /** Moves the viewed guide step. Left out where the open project has no guide. */
  stepGuide?(dir: 1 | -1): void;
};

const ZOOM_STEP = 1.25;

const ALIGN_KIND: Record<string, AlignKind> = {
  "align.left": "left",
  "align.right": "right",
  "align.top": "top",
  "align.bottom": "bottom",
  "align.centerH": "centerH",
  "align.centerV": "centerV",
};

const DISTRIBUTE_AXIS: Record<string, DistributeAxis> = { "align.distributeH": "horizontal", "align.distributeV": "vertical" };

/** Distribute has no chord (STUDIO 6.11): the Inspector and the command menu reach it. */
const KEYLESS: readonly KeyDef[] = Object.keys(DISTRIBUTE_AXIS).map((id) => ({ id, keys: [], scope: "canvas", labelKey: `studio.${id}` }));

const MUTATING: ReadonlySet<string> = new Set([
  ...Object.keys(ALIGN_KIND),
  ...Object.keys(DISTRIBUTE_AXIS),
  "group.make",
  "group.remove",
  "edit.cut",
  "edit.paste",
  "edit.duplicate",
  "edit.delete",
  "edit.deleteDrawing",
  "place.rotate",
  "place.rotateBack",
  "wire.fromSelection",
  "move.left",
  "move.right",
  "move.up",
  "move.down",
]);

const FORWARDED: Record<string, ToolKeyEvent> = {
  "edit.copy": { key: "c", shift: false, alt: false, ctrl: true },
  "edit.cut": { key: "x", shift: false, alt: false, ctrl: true },
  "edit.paste": { key: "v", shift: false, alt: false, ctrl: true },
  "edit.duplicate": { key: "d", shift: false, alt: false, ctrl: true },
  "edit.selectAll": { key: "a", shift: false, alt: false, ctrl: true },
  "edit.delete": { key: "Delete", shift: false, alt: false, ctrl: false },
  "edit.deleteDrawing": { key: "Delete", shift: true, alt: false, ctrl: false },
  "edit.cancel": { key: "Escape", shift: false, alt: false, ctrl: false },
};

const STEP_OF: Record<string, [number, number]> = { "move.left": [-1, 0], "move.right": [1, 0], "move.up": [0, -1], "move.down": [0, 1] };

/**
 * Listens on `root` and runs the command of the def a key press matches. Single character keys leave text fields, the
 * code editor, dialogs and focused buttons alone and can be switched off with `ui.singleKeyShortcuts` (WCAG 2.1.4).
 * Returns what undoes it all.
 */
export function installKeymap(root: HTMLElement, deps: KeymapDeps): () => void {
  const { doc, session, ui, host, announcer } = deps;
  const cmdCtx: CommandCtx = { doc, session, ui };
  const nudger = createNudger();
  let pressed: KeyboardEvent | null = null;
  let flushTimer: ReturnType<typeof setTimeout> | undefined;
  let panning = false;

  const say = (key: string, args?: Record<string, string | number>) => announcer.say(`studioWire.${key}`, args);
  const partsOf = (ctx: ToolCtx) => ctx.selection.filter((s) => s.kind === "part" && s.view === ctx.view.id).map((s) => s.id);

  function flushNudge() {
    clearTimeout(flushTimer);
    const ctx = deps.toolCtx();
    const result = nudger.flush(ctx);
    session.setPreview([]);
    if (result.kind !== "commit") return;
    const done = doc.commit(result.batch, { label: result.label });
    if (!done.ok) {
      say("announce.rejected", { message: done.message });
      return;
    }
    const after = deps.toolCtx();
    const first = after.view.placements.find((p) => p.c === partsOf(after)[0]);
    if (result.batch.length === 1 && first) say("announce.moved", { what: partName(after.doc.state, first.c), x: first.x_mm, y: first.y_mm });
    else say("announce.movedMany", { count: result.batch.length });
  }

  function announceRemoval(before: ToolCtx) {
    const after = deps.toolCtx();
    if (after.doc.revision === before.doc.revision) return;
    const items = before.selection.filter((s) => s.view === before.view.id);
    const only = items.length === 1 ? items[0]! : null;
    if (only?.kind === "wire") {
      const wire = before.view.wires.find((w) => w.id === only.id);
      const net = wire && after.doc.state.nets.find((n) => n.id === wire.net);
      const left = net?.connections.slice(0, 2).map((x) => `${partName(after.doc.state, x.c)}.${x.p}`);
      if (left?.length === 2) say("announce.removedWireNet", { net: net!.name ?? net!.id, a: left[0]!, b: left[1]! });
      else say("announce.removedWire");
    } else if (only?.kind === "part") {
      say("announce.removedPart", { what: partName(before.doc.state, only.id) });
    } else {
      say("announce.removedMany", { count: items.length });
    }
  }

  function wireFromHere(ctx: ToolCtx) {
    const target = pressed?.target instanceof Element ? pressed.target.closest<HTMLElement>("[data-pin-c]") : null;
    if (target) {
      deps.openPinPicker({ kind: "pin", c: target.dataset.pinC!, p: target.dataset.pinP! });
      return;
    }
    const part = partsOf(ctx)[0];
    if (part === undefined) {
      say("announce.nothingToWire");
      return;
    }
    const from = firstFreePin(ctx.doc.state, ctx.view.id, part);
    if (from) deps.openPinPicker(from);
    else say("announce.noFreePin", { part: partName(ctx.doc.state, part) });
  }

  function move(id: string, e: KeyboardEvent | null) {
    const ctx = deps.toolCtx();
    const [dx, dy] = STEP_OF[id]!;
    const ids = partsOf(ctx);
    if (ids.length === 0) {
      flushNudge();
      const next = focusNextPart(ctx, dx + dy > 0 ? 1 : -1);
      if (!next) return;
      session.setSelection([next]);
      say("announce.selected", { what: partName(ctx.doc.state, next.id) });
      return;
    }
    if (nudger.ids().length > 0 && nudger.ids().join() !== ids.join()) flushNudge();
    nudger.nudge(deps.toolCtx(), ids, dx, dy, { fine: e?.altKey ?? false, coarse: e?.shiftKey ?? false });
    session.setPreview(nudger.preview(ctx));
    clearTimeout(flushTimer);
    flushTimer = setTimeout(flushNudge, NUDGE_COALESCE_MS);
  }

  function rotate(dir: 1 | -1) {
    const ctx = deps.toolCtx();
    const result = rotateBatch(ctx, dir);
    if (!result) {
      say("announce.rotateBlocked");
      return;
    }
    const done = doc.commit(result.batch, { label: result.label });
    if (done.ok) say("announce.rotated", { count: result.batch.length });
    else say("announce.rejected", { message: done.message });
  }

  function refuse(key: "align.needThree" | "align.groupNeedTwo" | "align.groupNesting") {
    session.setStatus({ key });
    announcer.say(`studio.${key}`);
  }

  function commitArrange(batch: Op[], label: string) {
    if (batch.length === 0) return false;
    const done = doc.commit(batch, { label });
    if (!done.ok) say("announce.rejected", { message: done.message });
    return done.ok;
  }

  /** The boxes of the selected parts and of the members of any group they touch. Locked parts and the surface stay out. */
  function selectedBoxes(ctx: ToolCtx): Box[] {
    const picked = ctx.selection.filter((s) => s.view === ctx.view.id).map((s) => s.id);
    const ids = new Set(expandSelection(ctx.doc.state, ctx.view.id, picked));
    const locked = new Set(ctx.doc.state.components.filter((c) => c.locked).map((c) => c.id));
    return ctx.scene.targets.flatMap(({ hit, bbox }) =>
      hit.kind === "part" && ids.has(hit.c) && !locked.has(hit.c) && hit.c !== ctx.view.surface
        ? [{ c: hit.c, x_mm: bbox.x0, y_mm: bbox.y0, w_mm: bbox.x1 - bbox.x0, h_mm: bbox.y1 - bbox.y0 }]
        : [],
    );
  }

  function align(kind: AlignKind) {
    const ctx = deps.toolCtx();
    commitArrange(alignOps(ctx.view.id, selectedBoxes(ctx), ctx.view.placements, kind), `Align ${kind}`);
  }

  function distribute(axis: DistributeAxis) {
    const ctx = deps.toolCtx();
    const ops = distributeOps(ctx.view.id, selectedBoxes(ctx), ctx.view.placements, axis);
    if ("error" in ops) refuse("align.needThree");
    else commitArrange(ops, `Distribute ${axis}`);
  }

  function makeGroup() {
    const ctx = deps.toolCtx();
    const members = [...new Set(ctx.selection.filter((s) => s.view === ctx.view.id).map((s) => s.id))];
    const ops = groupOps(ctx.doc.state, ctx.view.id, members);
    if ("error" in ops) refuse(ops.error === "need-two" ? "align.groupNeedTwo" : "align.groupNesting");
    else if (commitArrange(ops, "Group")) announcer.say("studio.a11y.groupMade", { count: members.length });
  }

  function removeGroups() {
    const ctx = deps.toolCtx();
    const picked = new Set(ctx.selection.filter((s) => s.view === ctx.view.id).map((s) => s.id));
    const groups = (ctx.view.groups ?? []).filter((g) => g.members.some((m) => picked.has(m)));
    commitArrange(groups.flatMap((g) => ungroupOps(ctx.view.id, g.id)), "Ungroup");
  }

  function highlightNet() {
    if (session.getState().focusNet !== null) {
      session.setFocusNet(null);
      say("announce.netCleared");
      return;
    }
    const ctx = deps.toolCtx();
    const net = netOfSelection(ctx.doc.state, ctx.selection);
    if (net === null) {
      say("announce.noNet");
      return;
    }
    session.setFocusNet(net);
    say("announce.netHighlighted", { net: ctx.doc.state.nets.find((n) => n.id === net)?.name ?? net });
  }

  /** A project without that view gets it the first time the tab opens (STUDIO 6.4). */
  function showView(kind: ViewKind) {
    const ensure = VIEW_DEFS.find((def) => def.kind === kind)!.ensure(doc.getState().state);
    if (ensure.length > 0) {
      if (doc.getState().readOnly) {
        say("announce.readOnly");
        return;
      }
      const done = doc.commit(ensure, { label: "Add view" });
      if (!done.ok) {
        say("announce.rejected", { message: done.message });
        return;
      }
    }
    const id = viewIdFor(doc.getState().state, kind);
    if (id) session.setView(id);
    ui.set("activeView", kind);
  }

  const forward = (id: string) => {
    const before = deps.toolCtx();
    host.key(FORWARDED[id]!, before);
    if (id === "edit.delete" || id === "edit.deleteDrawing" || id === "edit.cut") announceRemoval(before);
  };

  const actions: Record<string, (e: KeyboardEvent | null) => void> = {
    "edit.enter": () => {
      if (nudger.ids().length > 0) return flushNudge();
      if (session.getState().armedPart !== null) {
        host.key({ key: "Enter", shift: false, alt: false, ctrl: false }, deps.toolCtx());
        return;
      }
      if (partsOf(deps.toolCtx()).length > 0) deps.focusInspector();
    },
    "edit.cancel": () => {
      if (nudger.ids().length > 0) {
        nudger.discard();
        clearTimeout(flushTimer);
        session.setPreview([]);
        return;
      }
      forward("edit.cancel");
    },
    "place.quickAdd": () => deps.focusPartSearch(),
    "place.rotate": () => rotate(-1),
    "place.rotateBack": () => rotate(1),
    "wire.fromSelection": () => wireFromHere(deps.toolCtx()),
    "group.make": makeGroup,
    "group.remove": removeGroups,
    "view.breadboard": () => showView("breadboard"),
    "view.schematic": () => showView("schematic"),
    "view.board": () => showView("board"),
    "view.fit": () => deps.view.fit(),
    "view.fitSelection": () => deps.view.fitSelection(),
    "view.zoomIn": () => deps.view.zoom(ZOOM_STEP),
    "view.zoomOut": () => deps.view.zoom(1 / ZOOM_STEP),
    "view.pan": () => {
      panning = true;
      deps.view.pan(true);
    },
    "view.grid": () => {
      const on = !ui.getState().gridOn;
      ui.set("gridOn", on);
      say(on ? "announce.gridOn" : "announce.gridOff");
    },
    "view.netHighlight": highlightNet,
    "view.outline": () => ui.set("leftRail", ui.getState().leftRail === "outline" ? "palette" : "outline"),
    "problems.next": () => deps.jumpProblem(1),
    "problems.prev": () => deps.jumpProblem(-1),
    "region.next": () => deps.focusRegion(1),
    "region.prev": () => deps.focusRegion(-1),
    "partner.focus": () => deps.focusPartner(),
    "guide.stepPrev": () => deps.stepGuide?.(-1),
    "guide.stepNext": () => deps.stepGuide?.(1),
    "help.keys": () => deps.showKeys(),
  };
  for (const id of Object.keys(FORWARDED)) actions[id] ??= () => forward(id);
  for (const id of Object.keys(STEP_OF)) actions[id] = (e) => move(id, e);
  for (const [id, kind] of Object.entries(ALIGN_KIND)) actions[id] = () => align(kind);
  for (const [id, axis] of Object.entries(DISTRIBUTE_AXIS)) actions[id] = () => distribute(axis);

  const commands: Command[] = [...STUDIO_KEYS.filter((def) => !REGISTERED_ELSEWHERE.has(def.id)), ...KEYLESS].map((def) => ({
    id: def.id,
    labelKey: def.labelKey,
    keys: [...def.keys],
    scope: def.scope,
    enabled: () => true,
    run: () => {
      if (MUTATING.has(def.id) && doc.getState().readOnly) {
        say("announce.readOnly");
        return;
      }
      if (!STEP_OF[def.id] && def.id !== "edit.enter" && def.id !== "edit.cancel") flushNudge();
      actions[def.id]!(pressed);
    },
  }));
  const offs = commands.map((command) => registerCommand(command));

  function onKeyDown(e: KeyboardEvent) {
    if (e.defaultPrevented || e.isComposing) return;
    const found = defFor(e);
    if (!found) return;
    if (found.def.scope === "canvas") {
      if (found.character && !ui.getState().singleKeyShortcuts) return;
      if (focusKeeps(e.target instanceof Element ? e.target : null, e)) return;
    }
    pressed = e;
    const ran = runCommand(found.def.id, cmdCtx);
    pressed = null;
    if (ran) e.preventDefault();
  }

  function onKeyUp(e: KeyboardEvent) {
    if (e.key !== " " || !panning) return;
    panning = false;
    deps.view.pan(false);
  }

  root.addEventListener("keydown", onKeyDown);
  root.addEventListener("keyup", onKeyUp);
  return () => {
    root.removeEventListener("keydown", onKeyDown);
    root.removeEventListener("keyup", onKeyUp);
    clearTimeout(flushTimer);
    nudger.discard();
    offs.forEach((off) => off());
  };
}
