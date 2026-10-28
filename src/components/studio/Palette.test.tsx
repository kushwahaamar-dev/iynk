import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import en from "@/i18n/messages/en/studioEdit.json";
import { builtinRegistry } from "@/parts/builtin";
import { buildPartIndex } from "@/parts/search";
import type { ArtProvider } from "@/studio/engine/types";
import { Palette } from "./Palette";

const index = buildPartIndex(builtinRegistry());
const art: ArtProvider = { get: () => [{ t: "rect", x: 0, y: 0, w: 2, h: 2, fill: "var(--studio-body)" }] };

function setup(extra: Partial<Parameters<typeof Palette>[0]> = {}) {
  const onArm = vi.fn();
  const onPlaceAtCentre = vi.fn();
  render(<Palette index={index} onArm={onArm} onPlaceAtCentre={onPlaceAtCentre} messages={en} lang="en" art={art} {...extra} />);
  return { onArm, onPlaceAtCentre };
}

const items = () => screen.getAllByRole("button");

describe("Palette", () => {
  it("lists every part under its category, each with a name and a model label", () => {
    setup();
    expect(items()).toHaveLength(index.length);
    for (const entry of index) {
      const button = screen.getByRole("button", { name: new RegExp(entry.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")) });
      expect(within(button).getByText(en.palette.model[entry.model])).toBeTruthy();
    }
    expect(screen.getByRole("heading", { name: en.palette.category.passive })).toBeTruthy();
    expect(screen.getByRole("heading", { name: en.palette.category["dev-board"] })).toBeTruthy();
  });

  it("puts the LED first when you search led, and shows its model label", () => {
    setup();
    fireEvent.change(screen.getByRole("searchbox", { name: en.palette.search }), { target: { value: "led" } });
    const [first] = items();
    expect(first!.textContent).toContain("LED");
    expect(within(first!).getByText(en.palette.model["partly-modelled"])).toBeTruthy();
    expect(screen.queryByRole("heading")).toBeNull();
    expect(screen.getByRole("status").textContent).toBe("1 part");
  });

  it("says so when nothing matches and offers a way on", () => {
    setup();
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "quantum" } });
    expect(screen.getByText("No part matches quantum.")).toBeTruthy();
    expect(screen.getByText(en.palette.emptyHelp)).toBeTruthy();
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });

  it("arms the part on a click and marks it", () => {
    const { onArm } = setup({ armed: "core.led-5mm" });
    const led = screen.getByRole("button", { name: /5 mm through-hole LED/ });
    expect(led.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText(/is ready\. Click the breadboard/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Resistor/ }));
    expect(onArm).toHaveBeenCalledWith("core.resistor");
  });

  it("places at the centre on Enter and does not arm", () => {
    const { onArm, onPlaceAtCentre } = setup();
    const led = screen.getByRole("button", { name: /5 mm through-hole LED/ });
    fireEvent.keyDown(led, { key: "Enter" });
    expect(onPlaceAtCentre).toHaveBeenCalledWith("core.led-5mm");
    expect(onArm).not.toHaveBeenCalled();
  });

  it("gives every item a text label and no unnamed button", () => {
    setup();
    for (const button of items()) expect((button.textContent ?? "").trim().length).toBeGreaterThan(0);
  });

  it("draws the art of each part as a decorative thumbnail", () => {
    const { container } = render(<Palette index={index} onArm={vi.fn()} onPlaceAtCentre={vi.fn()} messages={en} lang="en" art={art} />);
    const thumbs = container.querySelectorAll("[aria-hidden='true'] > svg[viewBox]");
    expect(thumbs).toHaveLength(index.length);
    expect(thumbs[0]!.querySelector("rect")).toBeTruthy();
  });

  it("has a label for every category the shipped parts use", () => {
    for (const entry of index) expect(en.palette.category[entry.category as keyof typeof en.palette.category]).toBeTruthy();
  });
});
