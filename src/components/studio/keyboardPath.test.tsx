import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { useEffect, useRef, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import messages from "@/i18n/messages/en/studioWire.json";
import { registerCommand } from "@/studio/commands";
import { registerHistoryCommands } from "@/studio/commands/history";
import { FULL_BLINK_PRESS_BUDGET, installKeymap } from "@/studio/commands/keymap";
import type { WireEndRef } from "@/studio/rules/connect";
import { projectWithBreadboard, registry } from "@/studio/testing/breadboard-fixture";
import { rigOver, VIEW } from "@/studio/testing/keyboard-rig";
import { BREADBOARD_REF, surfaceGeom } from "@/studio/views/breadboard";
import { commitWirePick, createAnnouncer, placeAtCentre } from "@/studio/tools/keyboard";
import { PinPicker } from "./PinPicker";

const SURFACE_AT = { x: 10, y: 20 };
const geom = surfaceGeom(registry.latest(BREADBOARD_REF)!);

const cleanups: (() => void)[] = [];

afterEach(() => {
  cleanup();
  cleanups.splice(0).forEach((off) => off());
});

/**
 * FA-12 on the whole blink circuit: the keymap, the tool host and the PinPicker are the real ones. The palette search
 * and the inspector field are stand-ins that take the keys the real components take (a search box, Tab to the first
 * result, Enter to place; Enter on a part to reach the value field).
 */
function setup() {
  const { project } = projectWithBreadboard((): never[] => []);
  const withUno = { ...project, views: project.views.map((v) => (v.id === VIEW ? { ...v, placements: [...v.placements, { c: "brd_uno", x_mm: -80, y_mm: 0 }] } : v)) };
  const rig = rigOver(withUno);
  const announcer = createAnnouncer();
  const run = vi.fn();
  let presses = 0;
  const count = () => void presses++;
  window.addEventListener("keydown", count, true);
  cleanups.push(() => window.removeEventListener("keydown", count, true));

  function Harness() {
    const root = useRef<HTMLDivElement>(null);
    const canvas = useRef<HTMLDivElement>(null);
    const search = useRef<HTMLInputElement>(null);
    const result = useRef<HTMLButtonElement>(null);
    const field = useRef<HTMLInputElement>(null);
    const [from, setFrom] = useState<WireEndRef | null>(null);
    const [query, setQuery] = useState("");

    useEffect(() => {
      const offs = [
        registerHistoryCommands({ doc: rig.doc, focus: () => "canvas" }),
        registerCommand({ id: "sim.run", labelKey: "x", scope: "sim", enabled: () => true, run }),
        registerCommand({ id: "sim.stop", labelKey: "x", scope: "sim", enabled: () => true, run }),
        registerCommand({ id: "sim.reset", labelKey: "x", scope: "sim", enabled: () => true, run }),
        installKeymap(root.current!, {
          doc: rig.doc,
          session: rig.session,
          ui: rig.ui,
          host: rig.host,
          announcer,
          toolCtx: rig.ctx,
          view: { fit() {}, fitSelection() {}, zoom() {}, pan() {} },
          focusPartSearch: () => search.current?.focus(),
          focusInspector: () => field.current?.focus(),
          focusPartner() {},
          openPinPicker: setFrom,
          jumpProblem() {},
          focusRegion() {},
          showKeys() {},
        }),
      ];
      canvas.current?.focus();
      return () => offs.forEach((off) => off());
    }, []);

    return (
      <div ref={root}>
        <div ref={canvas} tabIndex={0} data-testid="canvas" />
        <input ref={search} data-testid="search" value={query} onChange={(e) => setQuery(e.target.value)} />
        <button
          ref={result}
          data-testid="result"
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            const ref = query.startsWith("res") ? "core.resistor" : "core.led-5mm";
            const hole = geom.byName.get(ref === "core.resistor" ? "a5" : "b11")!;
            rig.setViewport({ cx_mm: SURFACE_AT.x + hole.xMm, cy_mm: SURFACE_AT.y + hole.yMm, k: 8, w: 800, h: 600, dpr: 1 });
            const placed = placeAtCentre(rig.ctx(), rig.placeDeps, ref);
            if ("refused" in placed) throw new Error(placed.refused);
            rig.doc.commit(placed.batch, { label: placed.label });
            rig.session.setSelection([{ kind: "part", view: VIEW, id: placed.id }]);
            setQuery("");
            canvas.current?.focus();
          }}
        />
        <input ref={field} data-testid="field" />
        {from ? (
          <PinPicker
            from={from}
            state={rig.doc.getState().state}
            viewId={VIEW}
            messages={messages}
            lang="en"
            onCancel={() => setFrom(null)}
            onPick={(to) => {
              commitWirePick({ doc: rig.doc, session: rig.session, announcer }, rig.ctx(), from, to);
              setFrom(null);
              canvas.current?.focus();
            }}
          />
        ) : null}
      </div>
    );
  }

  const view = render(<Harness />);
  const active = () => document.activeElement as HTMLElement;
  const press = (key: string, mods: { ctrl?: boolean; shift?: boolean } = {}) => void act(() => void fireEvent.keyDown(active(), { key, ctrlKey: mods.ctrl, shiftKey: mods.shift }));
  const type = (text: string) => {
    for (const char of text) {
      press(char);
      fireEvent.change(active(), { target: { value: (active() as HTMLInputElement).value + char } });
    }
  };
  const place = (text: string) => {
    press("/");
    type(text);
    act(() => view.getByTestId("result").focus());
    press("Tab");
    press("Enter");
  };
  const wire = (query: string) => {
    press("w");
    const picker = view.getByRole("combobox");
    act(() => picker.focus());
    for (const char of query) {
      fireEvent.keyDown(picker, { key: char });
      fireEvent.change(picker, { target: { value: (picker as HTMLInputElement).value + char } });
    }
    fireEvent.keyDown(picker, { key: "Enter" });
  };
  return { rig, announcer, run, presses: () => presses, press, type, place, wire, view };
}

describe("FA-12: place and wire the blink circuit with a keyboard", () => {
  it("takes the budget's number of key presses, and makes the three wires", () => {
    const t = setup();
    t.place("res");
    t.press("Enter");
    act(() => t.view.getByTestId("field").focus());
    t.type("330");
    t.press("Enter");
    act(() => t.view.getByTestId("canvas").focus());
    t.wire("d13");
    t.place("led");
    t.wire("r1 p2");
    t.press("Escape");
    t.press("ArrowRight");
    t.wire("gnd");
    t.press("Control");
    t.press("Enter", { ctrl: true });

    const wires = t.rig.ctx().view.wires;
    expect(wires).toHaveLength(3);
    expect(t.run).toHaveBeenCalledTimes(1);
    expect(t.announcer.lines.getState().filter((l) => l.key === "studioWire.announce.wireMade").map((l) => l.args)).toEqual([
      { from: "R1.P1", to: "U1.D13" },
      { from: "D1.A", to: "R1.P2" },
      { from: "D1.K", to: expect.stringMatching(/^U1\.GND/) },
    ]);
    expect(t.presses()).toBe(FULL_BLINK_PRESS_BUDGET);
  });
});
