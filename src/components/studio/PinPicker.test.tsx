import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import messages from "@/i18n/messages/en/studioWire.json";
import type { WireEndRef } from "@/studio/rules/connect";
import { keyboardRig, VIEW } from "@/studio/testing/keyboard-rig";
import { PinPicker } from "./PinPicker";
import type { PinPickerProps } from "./PinPicker";

type Rig = ReturnType<typeof keyboardRig>;

function mount(from: (rig: Rig) => WireEndRef | null = () => null, access?: PinPickerProps["access"]) {
  const rig = keyboardRig();
  const onPick = vi.fn();
  const onCancel = vi.fn();
  render(<PinPicker from={from(rig)} state={rig.doc.getState().state} viewId={VIEW} access={access} onPick={onPick} onCancel={onCancel} messages={messages} lang="en" />);
  return { rig, onPick, onCancel, search: screen.getByRole("combobox") as HTMLInputElement };
}

const type = (input: HTMLInputElement, text: string) => fireEvent.change(input, { target: { value: text } });
const names = () => screen.getAllByRole("option").map((o) => o.textContent ?? "");

describe("PinPicker", () => {
  it("asks for the first end", () => {
    mount();
    expect(screen.getByRole("dialog", { name: "Wire from which pin?" })).toBeTruthy();
  });

  it("asks for the second end once the first is set, and leaves the first out of the list", () => {
    mount((rig) => ({ kind: "pin", c: rig.circuit.uno, p: "D13" }));
    expect(screen.getByRole("dialog", { name: "Wire from U1.D13 to which pin?" })).toBeTruthy();
    expect(names().some((n) => n.startsWith("U1 D13"))).toBe(false);
  });

  it("reads each pin with its part, what it is joined to, and gives it a 44 px target", () => {
    mount();
    const d13 = screen.getAllByRole("option").find((o) => o.textContent?.startsWith("U1 D13"))!;
    expect(d13.textContent).toMatch(/connected to/);
    expect(d13.className).toContain("min-h-11");
    const anode = screen.getAllByRole("option").find((o) => o.textContent?.startsWith("D1 anode"))!;
    expect(anode).toBeTruthy();
  });

  it("filters as you type: every word has to match", () => {
    const { search } = mount();
    const all = names().length;
    type(search, "d13");
    expect(names()).toHaveLength(1);
    expect(names()[0]).toMatch(/^U1 D13/);
    type(search, "d1 cath");
    expect(names().every((n) => /^D1 cathode/.test(n))).toBe(true);
    expect(screen.getByRole("status").textContent).toBe("1 pin");
    type(search, "");
    expect(names()).toHaveLength(all);
  });

  it("says so when nothing matches", () => {
    const { search } = mount();
    type(search, "zzz");
    expect(screen.getByText("No pin matches zzz.")).toBeTruthy();
    expect(screen.queryByRole("option")).toBeNull();
  });

  it("picks the highlighted pin with Enter, and the arrows move the highlight", () => {
    const { search, onPick, rig } = mount();
    type(search, "u1 d");
    const first = search.getAttribute("aria-activedescendant");
    fireEvent.keyDown(search, { key: "ArrowDown" });
    expect(search.getAttribute("aria-activedescendant")).not.toBe(first);
    expect(document.getElementById(search.getAttribute("aria-activedescendant")!)!.getAttribute("aria-selected")).toBe("true");
    fireEvent.keyDown(search, { key: "ArrowUp" });
    expect(search.getAttribute("aria-activedescendant")).toBe(first);
    type(search, "d13");
    fireEvent.keyDown(search, { key: "Enter" });
    expect(onPick).toHaveBeenCalledWith({ kind: "pin", c: rig.circuit.uno, p: "D13" });
  });

  it("picks with a click too", () => {
    const { onPick } = mount();
    fireEvent.click(screen.getAllByRole("option")[0]!);
    expect(onPick).toHaveBeenCalledTimes(1);
  });

  it("lists the pins next to the first end before the rest", () => {
    mount((rig) => ({ kind: "pin", c: rig.circuit.r1, p: "P1" }));
    const groups = screen.getAllByRole("group");
    expect(groups.map((g) => g.getAttribute("aria-label"))).toEqual(["Nearby", "All pins"]);
    expect(groups[0]!.textContent).toContain("R1 2");
    expect(screen.getAllByRole("option").every((o) => !o.textContent?.startsWith("R1 1"))).toBe(true);
  });

  it("shows why a pin cannot be picked, and does not pick it", () => {
    const { onPick, search } = mount((rig) => ({ kind: "pin", c: rig.circuit.uno, p: "D13" }), "viewer");
    const options = screen.getAllByRole("option").filter((o) => o.getAttribute("aria-disabled") === "true");
    expect(options.length).toBeGreaterThan(0);
    expect(options[0]!.textContent).toContain("You are viewing this project.");
    fireEvent.keyDown(search, { key: "Enter" });
    expect(onPick).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toContain("You are viewing this project.");
  });

  it("closes on Escape", () => {
    const { search, onCancel } = mount();
    fireEvent.keyDown(search, { key: "Escape" });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
