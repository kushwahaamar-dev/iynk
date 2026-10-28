import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { listCommands, registerCommand } from "../commands.ts";
import { keyboardRig, VIEW } from "../testing/keyboard-rig.ts";
import { createAnnouncer } from "../tools/keyboard.ts";
import { registerHistoryCommands } from "./history.ts";
import { defFor, FULL_BLINK_PRESS_BUDGET, installKeymap, STUDIO_KEYS } from "./keymap.ts";
import type { KeymapDeps } from "./keymap.ts";

type Rig = ReturnType<typeof keyboardRig>;

let root: HTMLElement;
let offs: (() => void)[];

beforeEach(() => {
  vi.useFakeTimers();
  root = document.createElement("div");
  document.body.append(root);
  offs = [];
});

afterEach(() => {
  offs.forEach((off) => off());
  root.remove();
  vi.useRealTimers();
});

function setup(rig: Rig = keyboardRig()) {
  const announcer = createAnnouncer();
  const calls = {
    fit: vi.fn(),
    fitSelection: vi.fn(),
    zoom: vi.fn(),
    pan: vi.fn(),
    focusPartSearch: vi.fn(),
    focusInspector: vi.fn(),
    openPinPicker: vi.fn(),
    jumpProblem: vi.fn(),
    focusRegion: vi.fn(),
    showKeys: vi.fn(),
    run: vi.fn(),
  };
  const deps: KeymapDeps = {
    doc: rig.doc,
    session: rig.session,
    ui: rig.ui,
    host: rig.host,
    announcer,
    toolCtx: rig.ctx,
    view: { fit: calls.fit, fitSelection: calls.fitSelection, zoom: calls.zoom, pan: calls.pan },
    focusPartSearch: calls.focusPartSearch,
    focusInspector: calls.focusInspector,
    openPinPicker: calls.openPinPicker,
    jumpProblem: calls.jumpProblem,
    focusRegion: calls.focusRegion,
    showKeys: calls.showKeys,
  };
  offs.push(
    registerHistoryCommands({ doc: rig.doc, focus: () => "canvas" }),
    registerCommand({ id: "sim.run", labelKey: "x", scope: "sim", enabled: () => true, run: calls.run }),
    registerCommand({ id: "sim.stop", labelKey: "x", scope: "sim", enabled: () => true, run: calls.run }),
    registerCommand({ id: "sim.reset", labelKey: "x", scope: "sim", enabled: () => true, run: calls.run }),
    installKeymap(root, deps),
  );
  return { rig, announcer, calls, deps };
}

type Mods = { ctrl?: boolean; meta?: boolean; shift?: boolean; alt?: boolean };

function press(key: string, mods: Mods = {}, target: Element = root): KeyboardEvent {
  const ev = new KeyboardEvent("keydown", { key, ctrlKey: mods.ctrl, metaKey: mods.meta, shiftKey: mods.shift, altKey: mods.alt, bubbles: true, cancelable: true });
  target.dispatchEvent(ev);
  return ev;
}

const lines = (a: ReturnType<typeof createAnnouncer>) => a.lines.getState().map((l) => l.key.replace("studioWire.", ""));

describe("STUDIO_KEYS", () => {
  it("has no two defs answering the same chord in one scope", () => {
    const seen = new Set<string>();
    for (const def of STUDIO_KEYS) {
      for (const spec of def.keys) {
        const id = `${def.scope} ${spec.toLowerCase()}`;
        expect(seen.has(id), id).toBe(false);
        seen.add(id);
      }
    }
  });

  it("gives every def a command once the keymap, the history and the run bar have registered theirs", () => {
    setup();
    const ids = new Set(listCommands().map((c) => c.id));
    for (const def of STUDIO_KEYS) expect(ids.has(def.id), def.id).toBe(true);
  });

  it("names every def with a studioWire key", async () => {
    const { default: en } = await import("@/i18n/messages/en/studioWire.json");
    const at = (path: string) => path.split(".").reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], en);
    for (const def of STUDIO_KEYS) expect(typeof at(def.labelKey.replace("studioWire.", "")), def.labelKey).toBe("string");
  });

  it("matches chords the way the table reads", () => {
    const base = { ctrlKey: false, metaKey: false, altKey: false, shiftKey: false };
    expect(defFor({ ...base, key: "z", ctrlKey: true })?.def.id).toBe("undo");
    expect(defFor({ ...base, key: "z", metaKey: true })?.def.id).toBe("undo");
    expect(defFor({ ...base, key: "Z", metaKey: true, shiftKey: true })?.def.id).toBe("redo");
    expect(defFor({ ...base, key: "y", ctrlKey: true })?.def.id).toBe("redo");
    expect(defFor({ ...base, key: "y", metaKey: true })).toBeNull();
    expect(defFor({ ...base, key: "r" })?.def.id).toBe("place.rotate");
    expect(defFor({ ...base, key: "R", shiftKey: true })?.def.id).toBe("place.rotateBack");
    expect(defFor({ ...base, key: "?", shiftKey: true })?.def.id).toBe("help.keys");
    expect(defFor({ ...base, key: "+", shiftKey: true })?.def.id).toBe("view.zoomIn");
    expect(defFor({ ...base, key: "-" })?.def.id).toBe("view.zoomOut");
    expect(defFor({ ...base, key: " " })?.def.id).toBe("view.pan");
    expect(defFor({ ...base, key: "ArrowLeft", altKey: true })?.def.id).toBe("move.left");
    expect(defFor({ ...base, key: "F8", shiftKey: true })?.def.id).toBe("problems.prev");
    expect(defFor({ ...base, key: "Delete", shiftKey: true })?.def.id).toBe("edit.deleteDrawing");
    expect(defFor({ ...base, key: "Enter", ctrlKey: true, shiftKey: true })?.def.id).toBe("sim.reset");
    expect(defFor({ ...base, key: "q" })).toBeNull();
  });

  it("carries the press budget T-B4-20 asserts against", () => {
    expect(FULL_BLINK_PRESS_BUDGET).toBeGreaterThan(0);
  });
});

describe("installKeymap", () => {
  it("leaves single keys to a text field, a dialog, a focused button and a list that types ahead", () => {
    const { rig, announcer } = setup();
    const input = document.createElement("input");
    const dialog = document.createElement("div");
    dialog.setAttribute("role", "dialog");
    const inDialog = document.createElement("span");
    inDialog.tabIndex = 0;
    dialog.append(inDialog);
    const button = document.createElement("button");
    const tree = document.createElement("div");
    tree.setAttribute("role", "tree");
    const item = document.createElement("div");
    item.setAttribute("role", "treeitem");
    item.tabIndex = 0;
    tree.append(item);
    root.append(input, dialog, button, tree);

    press("g", {}, input);
    press("g", {}, inDialog);
    press("Enter", {}, button);
    press("g", {}, item);
    expect(rig.ui.getState().gridOn).toBe(true);
    expect(lines(announcer)).toEqual([]);

    expect(press("g", {}, root).defaultPrevented).toBe(true);
    expect(rig.ui.getState().gridOn).toBe(false);
  });

  it("keeps chords working inside a text field", () => {
    const { calls } = setup();
    const input = document.createElement("input");
    root.append(input);
    expect(press("Enter", { ctrl: true }, input).defaultPrevented).toBe(true);
    expect(calls.run).toHaveBeenCalledTimes(1);
  });

  it("switches the bare character keys off with the setting and keeps the rest", () => {
    const { rig, announcer } = setup();
    rig.ui.set("singleKeyShortcuts", false);
    press("g");
    expect(rig.ui.getState().gridOn).toBe(true);
    rig.session.setSelection([]);
    press("ArrowRight");
    expect(rig.session.getState().selection).toHaveLength(1);
    press("Escape");
    expect(lines(announcer)).toContain("announce.selected");
  });

  it("does not take a key the browser already handled, or a key it does not know", () => {
    const { rig } = setup();
    const ev = new KeyboardEvent("keydown", { key: "g", bubbles: true, cancelable: true });
    ev.preventDefault();
    root.dispatchEvent(ev);
    expect(press("q").defaultPrevented).toBe(false);
    expect(rig.ui.getState().gridOn).toBe(true);
  });

  it("runs undo and redo, and lets the browser have Ctrl+Z when there is nothing to undo", () => {
    const { rig } = setup();
    expect(press("z", { ctrl: true }).defaultPrevented).toBe(false);
    rig.doc.commit([{ k: "view.place", view: VIEW, placement: { ...rig.ctx().view.placements[1]!, x_mm: 1 } }], { label: "Move" });
    expect(press("z", { ctrl: true }).defaultPrevented).toBe(true);
    expect(rig.doc.getState().canRedo).toBe(true);
    expect(press("z", { meta: true, shift: true }).defaultPrevented).toBe(true);
    expect(rig.doc.getState().canRedo).toBe(false);
  });

  it("picks the first part with the arrows when nothing is selected, the last the other way, and says which", () => {
    const { rig, announcer } = setup();
    press("ArrowRight");
    expect(rig.session.getState().selection).toEqual([{ kind: "part", view: VIEW, id: rig.circuit.led }]);
    press("Escape");
    expect(rig.session.getState().selection).toEqual([]);
    press("ArrowUp");
    expect(rig.session.getState().selection[0]!.id).toBe(rig.circuit.uno);
    expect(lines(announcer)).toEqual(["announce.selected", "announce.selected"]);
  });

  it("nudges the selection and commits one batch when the hold ends", () => {
    const { rig, announcer } = setup();
    rig.session.setSelection([{ kind: "part", view: VIEW, id: rig.circuit.r1 }]);
    const start = rig.ctx().view.placements.find((p) => p.c === rig.circuit.r1)!;
    press("ArrowRight");
    press("ArrowRight");
    press("ArrowRight", { shift: true });
    expect(rig.doc.commits).toHaveLength(0);
    expect(rig.session.getState().preview).toHaveLength(1);
    vi.advanceTimersByTime(500);
    expect(rig.doc.commits).toHaveLength(1);
    expect(rig.doc.commits[0]!.batch).toHaveLength(1);
    expect(rig.ctx().view.placements.find((p) => p.c === rig.circuit.r1)!.x_mm).toBeCloseTo(start.x_mm + 12 * 2.54, 5);
    expect(rig.session.getState().preview).toEqual([]);
    expect(lines(announcer)).toEqual(["announce.moved"]);
  });

  it("drops a nudge at once with Enter and throws it away with Escape", () => {
    const { rig, calls } = setup();
    rig.session.setSelection([{ kind: "part", view: VIEW, id: rig.circuit.r1 }]);
    press("ArrowDown", { alt: true });
    press("Enter");
    expect(rig.doc.commits).toHaveLength(1);
    expect(calls.focusInspector).not.toHaveBeenCalled();
    press("ArrowDown");
    press("Escape");
    vi.advanceTimersByTime(1000);
    expect(rig.doc.commits).toHaveLength(1);
    expect(rig.session.getState().selection).toHaveLength(1);
    press("Enter");
    expect(calls.focusInspector).toHaveBeenCalledTimes(1);
  });

  it("deletes through the select tool and says what went, with the net that is left", () => {
    const { rig, announcer } = setup();
    const wire = rig.ctx().view.wires.find((w) => w.id === rig.circuit.wires[0])!;
    rig.session.setSelection([{ kind: "wire", view: VIEW, id: wire.id }]);
    press("Delete");
    expect(rig.ctx().view.wires.some((w) => w.id === wire.id)).toBe(false);
    expect(lines(announcer)).toHaveLength(1);
    expect(lines(announcer)[0]).toMatch(/^announce\.removedWire/);
  });

  it("names the part it deletes", () => {
    const { rig, announcer } = setup();
    rig.session.setSelection([{ kind: "part", view: VIEW, id: rig.circuit.r1 }]);
    press("Backspace");
    expect(rig.doc.getState().state.components.some((c) => c.id === rig.circuit.r1)).toBe(false);
    expect(announcer.lines.getState()[0]).toMatchObject({ key: "studioWire.announce.removedPart", args: { what: "R1" } });
  });

  it("says the project is read only instead of changing it", () => {
    const { rig, announcer } = setup();
    rig.doc.setSaveChip("read-only");
    rig.session.setSelection([{ kind: "part", view: VIEW, id: rig.circuit.r1 }]);
    press("Delete");
    press("r");
    press("ArrowRight");
    expect(rig.doc.commits).toHaveLength(0);
    expect(lines(announcer)).toEqual(["announce.readOnly", "announce.readOnly", "announce.readOnly"]);
  });

  it("copies and pastes through the select tool", () => {
    const { rig } = setup();
    rig.session.setSelection([{ kind: "part", view: VIEW, id: rig.circuit.r1 }]);
    const before = rig.doc.getState().state.components.length;
    press("c", { ctrl: true });
    press("v", { meta: true });
    expect(rig.doc.getState().state.components.length).toBe(before + 1);
  });

  it("rotates a free part and explains why a seated one stays", () => {
    const { rig, announcer } = setup();
    rig.session.setSelection([{ kind: "part", view: VIEW, id: rig.circuit.uno }]);
    press("r");
    expect(rig.ctx().view.placements.find((p) => p.c === rig.circuit.uno)!.rotation_deg).toBe(270);
    rig.session.setSelection([{ kind: "part", view: VIEW, id: rig.circuit.r1 }]);
    press("R", { shift: true });
    expect(lines(announcer)).toEqual(["announce.rotated", "announce.rotateBlocked"]);
  });

  it("opens the PinPicker from the selected part, or from the pin that has focus", () => {
    const { rig, calls, announcer } = setup();
    press("w");
    expect(lines(announcer)).toEqual(["announce.nothingToWire"]);
    rig.session.setSelection([{ kind: "part", view: VIEW, id: rig.circuit.uno }]);
    press("w");
    expect(calls.openPinPicker).toHaveBeenLastCalledWith({ kind: "pin", c: rig.circuit.uno, p: expect.any(String) });

    const tree = document.createElement("div");
    tree.setAttribute("role", "tree");
    const pin = document.createElement("div");
    pin.setAttribute("role", "treeitem");
    pin.dataset.pinC = "cmp_x";
    pin.dataset.pinP = "D7";
    pin.tabIndex = 0;
    tree.append(pin);
    root.append(tree);
    press("w", {}, pin);
    expect(calls.openPinPicker).toHaveBeenLastCalledWith({ kind: "pin", c: "cmp_x", p: "D7" });
  });

  it("does not delete the part when Delete is pressed on one of its pins in the Outline", () => {
    const { rig } = setup();
    rig.session.setSelection([{ kind: "part", view: VIEW, id: rig.circuit.r1 }]);
    const tree = document.createElement("div");
    tree.setAttribute("role", "tree");
    const pin = document.createElement("div");
    pin.setAttribute("role", "treeitem");
    pin.dataset.kind = "pin";
    pin.tabIndex = 0;
    tree.append(pin);
    root.append(tree);
    press("Delete", {}, pin);
    expect(rig.doc.commits).toHaveLength(0);
  });

  it("runs the view, problem, region and help commands", () => {
    const { rig, calls } = setup();
    press("0");
    press("f");
    press("+");
    press("-");
    press("F8");
    press("F8", { shift: true });
    press("F6");
    press("F6", { shift: true });
    press("?", { shift: true });
    press("a");
    press("o");
    expect(calls.fit).toHaveBeenCalledTimes(1);
    expect(calls.fitSelection).toHaveBeenCalledTimes(1);
    expect(calls.zoom.mock.calls.map(([f]) => f > 1)).toEqual([true, false]);
    expect(calls.jumpProblem.mock.calls).toEqual([[1], [-1]]);
    expect(calls.focusRegion.mock.calls).toEqual([[1], [-1]]);
    expect(calls.showKeys).toHaveBeenCalledTimes(1);
    expect(calls.focusPartSearch).toHaveBeenCalledTimes(1);
    expect(rig.ui.getState().leftRail).toBe("outline");
    press("o");
    expect(rig.ui.getState().leftRail).toBe("palette");
  });

  it("switches to the breadboard view with 1", () => {
    const { rig } = setup();
    rig.session.setView("elsewhere");
    press("1");
    expect(rig.session.getState().viewId).toBe(VIEW);
  });

  it("pans while Space is held", () => {
    const { calls } = setup();
    press(" ");
    root.dispatchEvent(new KeyboardEvent("keyup", { key: " ", bubbles: true }));
    expect(calls.pan.mock.calls).toEqual([[true], [false]]);
  });

  it("highlights the net of the selection and clears it", () => {
    const { rig, announcer } = setup();
    press("n");
    rig.session.setSelection([{ kind: "wire", view: VIEW, id: rig.circuit.wires[0]! }]);
    press("n");
    expect(rig.session.getState().focusNet).not.toBeNull();
    press("n");
    expect(rig.session.getState().focusNet).toBeNull();
    expect(lines(announcer)).toEqual(["announce.noNet", "announce.netHighlighted", "announce.netCleared"]);
  });

  it("lets go of every listener and command when it is removed", () => {
    const { rig } = setup();
    offs.pop()!();
    press("g");
    expect(rig.ui.getState().gridOn).toBe(true);
    expect(listCommands().some((c) => c.id === "view.grid")).toBe(false);
  });
});
