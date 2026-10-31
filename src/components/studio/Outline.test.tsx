import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import messages from "@/i18n/messages/en/studioWire.json";
import { blankProject } from "@/project/blank";
import { createSession } from "@/project/session";
import { seededRandom, steppingClock } from "@/project/session.testing";
import { miniProject } from "@/studio/engine/testing/mini-scene";
import { createDocStore } from "@/studio/stores/doc";
import { createSessionStore } from "@/studio/stores/session";
import { keyboardRig, VIEW } from "@/studio/testing/keyboard-rig";
import { Outline } from "./Outline";

function mount() {
  const rig = keyboardRig();
  render(<Outline doc={rig.doc} session={rig.session} messages={messages} lang="en" />);
  return rig;
}

const items = () => screen.getAllByRole("treeitem");
const named = (name: RegExp | string) => items().find((el) => (typeof name === "string" ? el.textContent?.startsWith(name) : name.test(el.textContent ?? "")))!;

afterEach(() => vi.useRealTimers());

describe("Outline", () => {
  it("is a tree of groups, parts and wires with their levels and sizes", () => {
    mount();
    expect(screen.getByRole("tree", { name: "Outline" })).toBeTruthy();
    const groups = items().filter((el) => el.getAttribute("aria-level") === "1");
    expect(groups.map((g) => g.textContent)).toEqual(["Boards (1)", "Parts (3)", "Wires (6)"]);
    expect(groups.every((g) => g.getAttribute("aria-expanded") === "true")).toBe(true);
    const r1 = named("R1");
    expect(r1.getAttribute("aria-level")).toBe("2");
    expect(r1.getAttribute("aria-expanded")).toBe("false");
    expect(r1.getAttribute("aria-setsize")).toBe("3");
    expect(named("Wire from").getAttribute("aria-setsize")).toBe("6");
  });

  it("keeps one tab stop that follows the arrow keys, and selects the part it lands on", () => {
    const rig = mount();
    const tabStops = () => items().filter((el) => el.tabIndex === 0);
    expect(tabStops()).toHaveLength(1);
    expect(tabStops()[0]!.textContent).toBe("Boards (1)");
    fireEvent.keyDown(tabStops()[0]!, { key: "ArrowDown" });
    expect(tabStops()[0]!.textContent).toMatch(/^U1/);
    expect(document.activeElement).toBe(tabStops()[0]);
    expect(rig.session.getState().selection).toEqual([{ kind: "part", view: VIEW, id: rig.circuit.uno }]);
    fireEvent.keyDown(tabStops()[0]!, { key: "ArrowUp" });
    expect(rig.session.getState().selection).toHaveLength(1);
    fireEvent.keyDown(tabStops()[0]!, { key: "End" });
    expect(tabStops()[0]!.textContent).toMatch(/^Wire from/);
    expect(rig.session.getState().selection[0]).toMatchObject({ kind: "wire" });
    fireEvent.keyDown(tabStops()[0]!, { key: "Home" });
    expect(tabStops()[0]!.textContent).toBe("Boards (1)");
  });

  it("opens a part to its pins with the right arrow and goes back to the part with the left", () => {
    mount();
    const r1 = named("R1");
    r1.focus();
    fireEvent.keyDown(r1, { key: "ArrowRight" });
    expect(named("R1").getAttribute("aria-expanded")).toBe("true");
    const pin = items().find((el) => el.dataset.kind === "pin")!;
    expect(pin.getAttribute("aria-level")).toBe("3");
    expect(pin.dataset.pinC).toBeTruthy();
    fireEvent.keyDown(named("R1"), { key: "ArrowRight" });
    expect(document.activeElement).toBe(pin);
    fireEvent.keyDown(pin, { key: "ArrowLeft" });
    expect(document.activeElement).toBe(named("R1"));
    fireEvent.keyDown(named("R1"), { key: "ArrowLeft" });
    expect(named("R1").getAttribute("aria-expanded")).toBe("false");
    expect(items().some((el) => el.dataset.kind === "pin")).toBe(false);
  });

  it("does not change the selection when focus lands on a pin", () => {
    const rig = mount();
    fireEvent.click(named("R1"));
    fireEvent.keyDown(named("R1"), { key: "ArrowRight" });
    const before = rig.session.getState().selection;
    fireEvent.keyDown(named("R1"), { key: "ArrowDown" });
    expect(document.activeElement).toHaveProperty("dataset.kind", "pin");
    expect(rig.session.getState().selection).toBe(before);
  });

  it("collapses and opens a group with Enter or a click", () => {
    mount();
    fireEvent.keyDown(named("Wires"), { key: "Enter" });
    expect(items().some((el) => el.textContent?.startsWith("Wire from"))).toBe(false);
    fireEvent.click(named("Wires"));
    expect(items().some((el) => el.textContent?.startsWith("Wire from"))).toBe(true);
  });

  it("types ahead to the item that starts with what was typed, and starts over after a pause", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const rig = mount();
    fireEvent.keyDown(named("Boards"), { key: "s" });
    expect(rig.session.getState().selection).toEqual([{ kind: "part", view: VIEW, id: rig.circuit.button }]);
    vi.advanceTimersByTime(1000);
    fireEvent.keyDown(named("SW1"), { key: "d" });
    expect(rig.session.getState().selection).toEqual([{ kind: "part", view: VIEW, id: rig.circuit.led }]);
  });

  it("leaves W alone so it can start a wire", () => {
    mount();
    const keep = fireEvent.keyDown(named("R1"), { key: "w" });
    expect(keep).toBe(true);
  });

  it("follows a selection made somewhere else", () => {
    const rig = mount();
    act(() => rig.session.setSelection([{ kind: "wire", view: VIEW, id: rig.circuit.wires[2]! }]));
    const picked = items().filter((el) => el.getAttribute("aria-selected") === "true");
    expect(picked).toHaveLength(1);
    expect(picked[0]!.dataset.key).toBe(`wire:${rig.circuit.wires[2]}`);
    expect(picked[0]!.tabIndex).toBe(0);
  });

  it("selects an item with a click", () => {
    const rig = mount();
    fireEvent.click(named("D1"));
    expect(rig.session.getState().selection).toEqual([{ kind: "part", view: VIEW, id: rig.circuit.led }]);
    expect(named("D1").getAttribute("aria-selected")).toBe("true");
  });

  it("says so when the view is empty", () => {
    const doc = createDocStore(createSession({ state: blankProject({ board: "uno", title: "t", locale: "en", actor: "act_a", now: "2026-10-28T00:00:00.000Z", id: "prj_e" }), clock: steppingClock(), rnd: seededRandom() }));
    render(<Outline doc={doc} session={createSessionStore("nowhere")} messages={messages} lang="en" />);
    expect(screen.getByText("Nothing on this view yet")).toBeTruthy();
    expect(screen.queryByRole("tree")).toBeNull();
  });

  it("draws only the rows in view at 500 parts", () => {
    const project = miniProject(500, 30);
    const doc = createDocStore(createSession({ state: project, clock: steppingClock(), rnd: seededRandom() }));
    const viewId = project.views[0]!.id;
    render(<Outline doc={doc} session={createSessionStore(viewId)} messages={messages} lang="en" />);
    const rows = screen.getAllByRole("treeitem");
    expect(rows.length).toBeLessThan(60);
    const first = within(screen.getByRole("tree")).getByText("R1");
    expect(first.closest("[role=treeitem]")!.getAttribute("aria-setsize")).toBe("500");
    expect(screen.getByText("Parts (500)")).toBeTruthy();
  });
});
