// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { LOCALES } from "../../i18n/config";
import { messageAt } from "../../i18n/translate";
import { newId } from "../../core/ids.ts";
import { netlist } from "../../project/netlist.ts";
import { createSession } from "../../project/session.ts";
import { seededRandom, steppingClock } from "../../project/session.testing.ts";
import { buildDrawList } from "../engine/draw-list.ts";
import { stubArt } from "../engine/testing/mini-scene.ts";
import type { Hit, ResolvedPartShape, Viewport } from "../engine/types.ts";
import { REFUSALS } from "../rules/connect.ts";
import { createSessionStore } from "../stores/session.ts";
import { blinkCircuit } from "../testing/blink-circuit.ts";
import { registry } from "../testing/breadboard-fixture.ts";
import { createRecordingDoc } from "../testing/recording-doc.ts";
import { createToolHost } from "./host.ts";
import type { ToolCtx, ToolPointerEvent } from "./types.ts";
import { createWireTool } from "./wire.ts";

const VIEW = "vw_bb";
const viewport: Viewport = { cx_mm: 0, cy_mm: 0, k: 8, w: 800, h: 600, dpr: 1 };

function resolveShape(defRef: string): ResolvedPartShape {
  const d = registry.latest(defRef)!;
  const h = d.dimensions?.body?.h ?? 1;
  return {
    widthMm: d.dimensions?.body?.w ?? 1,
    heightMm: h,
    known: true,
    pins: d.pins.map((p) => ({ id: p.id, xMm: p.position?.x ?? 0, yMm: h - (p.position?.y ?? 0), mechanical: p.type === "mechanical" })),
  };
}

function setup() {
  const circuit = blinkCircuit();
  const doc = createRecordingDoc(createSession({ state: circuit.project, clock: steppingClock(), rnd: seededRandom() }));
  const session = createSessionStore(VIEW);
  const host = createToolHost({ doc, session });
  const tool = createWireTool({ setStatus: session.setStatus, ids: (prefix) => newId(prefix) });
  host.register(tool);
  session.setTool("wire");

  const spots = new Map<number, Hit | null>();
  const pinSpot = (x: number, c: string, p: string) => spots.set(x, { kind: "pin", c, p });
  const hits: ToolPointerEvent[] = [];
  const ctx = (): ToolCtx => {
    const state = doc.getState();
    const scene = buildDrawList({ state: state.state, viewId: VIEW, viewport, art: stubArt, resolve: resolveShape, index: null, prev: null, mode: "illustrated", overlays: [] }).scene;
    return {
      doc: state,
      view: state.state.views.find((v) => v.id === VIEW)!,
      viewport,
      scene,
      selection: [],
      snapMm: 1,
      hit: (ev) => {
        hits.push(ev);
        return spots.get(ev.xPx) ?? null;
      },
      resolve: resolveShape,
    };
  };
  const event = (type: ToolPointerEvent["type"], x: number, pointerType: ToolPointerEvent["pointerType"] = "mouse"): ToolPointerEvent => ({
    type, xPx: x, yPx: 0, xMm: x, yMm: 0, button: 0, shift: false, alt: false, ctrl: false, pointerType, pointerId: 1,
  });
  const send = (type: ToolPointerEvent["type"], x: number, pointerType: ToolPointerEvent["pointerType"] = "mouse") => host.pointer(event(type, x, pointerType), ctx());
  pinSpot(1, "brd_uno", "D8");
  pinSpot(2, "brd_uno", "D9");
  pinSpot(3, "brd_uno", "D13");
  pinSpot(4, "brd_uno", "D99");
  spots.set(5, { kind: "hole", surface: circuit.breadboard, hole: "a20" });
  spots.set(11, { kind: "hole", surface: circuit.breadboard, hole: "e20" });
  pinSpot(8, circuit.r1, "P2");
  pinSpot(9, circuit.led, "A");
  return { circuit, doc, session, host, tool, send, ctx, hits, event, pinSpot, spots };
}

describe("wire tool", () => {
  it("drags from one pin to another and commits one batch that the netlist shows", () => {
    const { doc, tool, send, session } = setup();
    send("down", 1);
    expect(tool.state()).toBe("armed");
    send("move", 2);
    expect(tool.state()).toBe("targeting");
    send("up", 2);
    expect(tool.state()).toBe("committed");
    expect(doc.commits).toHaveLength(1);
    expect(doc.commits[0]!.batch.map((op) => op.k)).toEqual(["net.create", "wire.add"]);
    expect(doc.commits[0]!.label).toBe("Wire U1.D8 to U1.D9");
    const nodes = netlist(doc.getState().state).nodes;
    expect(nodes.some((n) => n.pins.some((p) => p.p === "D8") && n.pins.some((p) => p.p === "D9"))).toBe(true);
    expect(session.getState().status).toEqual({ key: "wire.added", params: { from: "U1.D8", to: "U1.D9" } });
    expect(session.getState().preview).toEqual([]);
  });

  it("goes back to idle on the next event and makes one wire per gesture", () => {
    const { doc, tool, send } = setup();
    send("down", 1);
    send("up", 2);
    send("move", 3);
    expect(tool.state()).toBe("idle");
    expect(doc.commits).toHaveLength(1);
  });

  it("wires with two taps, for a finger", () => {
    const { doc, tool, send } = setup();
    send("down", 1, "touch");
    send("up", 1, "touch");
    expect(tool.state()).toBe("armed");
    expect(doc.commits).toHaveLength(0);
    send("down", 2, "touch");
    send("up", 2, "touch");
    expect(tool.state()).toBe("committed");
    expect(doc.commits).toHaveLength(1);
  });

  it("hands the touch event to the hit test, which gives touch its larger target", () => {
    const { hits, send } = setup();
    send("down", 1, "touch");
    expect(hits[0]!.pointerType).toBe("touch");
  });

  it("connects a pin to a breadboard hole", () => {
    const { doc, send } = setup();
    send("down", 1);
    send("up", 5);
    expect(doc.commits[0]!.batch.map((op) => op.k)).toEqual(["net.create", "wire.add"]);
    expect(doc.commits[0]!.batch[1]).toMatchObject({ wire: { to: { kind: "hole", hole: "a20" } } });
  });

  it("refuses a second tap on the same pin", () => {
    const { doc, tool, send, session } = setup();
    send("down", 1);
    send("up", 1);
    send("down", 1);
    send("up", 1);
    expect(tool.state()).toBe("rejected");
    expect(tool.refusal()?.code).toBe("same-pin");
    expect(session.getState().status?.key).toBe("wire.refuse.same-pin");
    expect(doc.commits).toHaveLength(0);
  });

  it("refuses a release on empty canvas and changes nothing", () => {
    const { doc, tool, send, session } = setup();
    const before = doc.getState().state;
    send("down", 1);
    send("move", 50);
    send("up", 50);
    expect(tool.refusal()).toEqual({ code: "empty-target", args: {} });
    expect(session.getState().status?.key).toBe("wire.refuse.empty-target");
    expect(doc.getState().state).toBe(before);
  });

  it("refuses a pin the part does not have, at the press", () => {
    const { doc, tool, send, session } = setup();
    send("down", 4);
    expect(tool.state()).toBe("rejected");
    expect(session.getState().status).toEqual({ key: "wire.refuse.no-such-pin", params: { end: "U1.D99" } });
    expect(doc.commits).toHaveLength(0);
  });

  it("refuses a duplicate wire", () => {
    const { tool, send, spots, circuit } = setup();
    spots.set(6, { kind: "hole", surface: circuit.breadboard, hole: "c5" });
    send("down", 3);
    send("up", 6);
    expect(tool.refusal()?.code).toBe("duplicate-wire");
  });

  it("refuses everything on a read-only document", () => {
    const { doc, tool, send, session } = setup();
    doc.setSaveChip("read-only");
    send("down", 1);
    expect(tool.refusal()?.code).toBe("read-only");
    expect(session.getState().status?.key).toBe("wire.refuse.read-only");
  });

  it("ignores a press on nothing and the other mouse buttons", () => {
    const { tool, host, event, ctx } = setup();
    host.pointer(event("down", 99), ctx());
    expect(tool.state()).toBe("idle");
    host.pointer({ ...event("down", 1), button: 2 }, ctx());
    expect(tool.state()).toBe("idle");
  });

  it("cancels on Escape in a drag and in a tap, and says so", () => {
    const { host, tool, send, session, doc, ctx } = setup();
    send("down", 1);
    send("move", 2);
    expect(host.key({ key: "Escape", shift: false, alt: false, ctrl: false }, ctx())).toBe(true);
    expect(tool.state()).toBe("idle");
    expect(session.getState().status).toEqual({ key: "wire.cancelled" });
    expect(session.getState().preview).toEqual([]);

    send("down", 1);
    send("up", 1);
    expect(tool.state()).toBe("armed");
    expect(host.key({ key: "Escape", shift: false, alt: false, ctrl: false }, ctx())).toBe(true);
    expect(tool.state()).toBe("idle");
    expect(doc.commits).toHaveLength(0);
  });

  it("cancels when the pointer is lost", () => {
    const { host, tool, send } = setup();
    send("down", 1);
    host.cancel();
    expect(tool.state()).toBe("idle");
  });

  it("previews the band, the first pin and the target, and drops the target when the pointer leaves it", () => {
    const { send, host } = setup();
    send("down", 8);
    send("move", 9);
    expect(host.preview().map((o) => o.id)).toEqual(["wire:band", "wire:from", "wire:target"]);
    expect(host.preview()[2]!.elements.some((e) => e.t === "text" && e.s === "D1.A")).toBe(true);
    send("move", 50);
    expect(host.preview().map((o) => o.id)).toEqual(["wire:band", "wire:from"]);
  });

  it("shows a cross and a second ring on a target that would be refused", () => {
    const { send, host } = setup();
    send("down", 5);
    send("move", 11);
    const target = host.preview().find((o) => o.id === "wire:target");
    expect(target?.elements.filter((e) => e.t === "circle")).toHaveLength(2);
    expect(target?.elements.some((e) => e.t === "text" && e.s.startsWith("\u00d7"))).toBe(true);
  });

  it("does nothing on a tool event it does not use", () => {
    const { host, ctx } = setup();
    expect(host.key({ key: "a", shift: false, alt: false, ctrl: false }, ctx())).toBe(false);
  });

  it("reports a cursor that says no over a refused target", () => {
    const { tool, send, ctx } = setup();
    expect(tool.cursor(ctx())).toBe("crosshair");
    send("down", 5);
    send("move", 11);
    expect(tool.cursor(ctx())).toBe("not-allowed");
  });
});

describe("studioWire strings", () => {
  const read = (locale: string): unknown => JSON.parse(readFileSync(join(process.cwd(), "src/i18n/messages", locale, "studioWire.json"), "utf8"));

  it("has a message for every refusal, the added line and the cancelled line in every language", () => {
    for (const locale of LOCALES) {
      const messages = read(locale);
      for (const code of REFUSALS) expect(typeof messageAt(messages, `wire.refuse.${code}`), `${locale} ${code}`).toBe("string");
      expect(typeof messageAt(messages, "wire.added"), locale).toBe("string");
      expect(typeof messageAt(messages, "wire.cancelled"), locale).toBe("string");
    }
  });
});
