import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Callout, type CalloutTone } from "./Callout";
import { Chip, type ChipTone } from "./Chip";

const fills: [CalloutTone, string, string][] = [
  ["note", "bg-info-bg", "text-info"],
  ["tip", "bg-good-bg", "text-good"],
  ["success", "bg-good-bg", "text-good"],
  ["warn", "bg-warn-bg", "text-warn"],
  ["danger", "bg-bad-bg", "text-bad"],
];

describe("Callout", () => {
  it.each(fills)("%s draws the tinted fill and a coloured icon, with no border or side bar", (tone, fill, ink) => {
    render(<Callout tone={tone} title="Heads up">Body</Callout>);
    const box = screen.getByRole("note");
    expect(box.className).toContain(fill);
    expect(box.className).not.toMatch(/border|shadow/);
    expect(box.querySelector("svg")?.getAttribute("class")).toContain(ink);
    expect(screen.getByText("Heads up")).toBeTruthy();
  });

  it("announces politely when live", () => {
    render(<Callout live>Saved</Callout>);
    expect(screen.getByRole("status")).toBeTruthy();
    expect(screen.queryByRole("note")).toBeNull();
  });

  it("quiet is a muted line with no box", () => {
    render(<Callout variant="quiet" tone="warn">Not set up</Callout>);
    const line = screen.getByRole("note");
    expect(line.className).toContain("text-muted");
    expect(line.className).not.toMatch(/bg-|rounded/);
  });
});

describe("Chip", () => {
  const current: [ChipTone, string][] = [
    ["neutral", "bg-sunken"],
    ["ink", "bg-ink"],
    ["good", "bg-good-bg"],
    ["bad", "bg-bad-bg"],
    ["warn", "bg-warn-bg"],
    ["info", "bg-info-bg"],
  ];
  const legacy: [ChipTone, string][] = [
    ["plain", "bg-sunken"],
    ["ink", "bg-ink"],
    ["tomato", "bg-bad-bg"],
    ["mustard", "bg-warn-bg"],
    ["mint", "bg-good-bg"],
    ["cobalt", "bg-info-bg"],
    ["blush", "bg-sunken"],
  ];

  it.each([...current, ...legacy])("%s renders the %s fill without a border", (tone, fill) => {
    render(<Chip tone={tone}>tag</Chip>);
    const chip = screen.getByText("tag");
    expect(chip.className).toContain(fill);
    expect(chip.className).not.toContain("border");
  });

  it("defaults to neutral and uses the mono face only when asked", () => {
    render(<><Chip>plain</Chip><Chip mono>GPIO4</Chip></>);
    expect(screen.getByText("plain").className).toContain("bg-sunken");
    expect(screen.getByText("plain").className).not.toContain("font-ui");
    expect(screen.getByText("GPIO4").className).toContain("font-ui");
  });
});
