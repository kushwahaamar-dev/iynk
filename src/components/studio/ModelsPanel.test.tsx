import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import messages from "@/i18n/messages/en/studioModels.json";
import { LOCALES } from "@/i18n/config";
import { blankProject } from "@/project/blank";
import type { Project } from "@/project/generated/types";
import type { PartLookup } from "@/studio/fidelity/static-tier";
import { ModelsPanel, TierChip } from "./ModelsPanel";

function project(): Project {
  return blankProject({ board: "uno", title: "t", locale: "en", actor: "act_a", now: "2026-10-28T00:00:00.000Z", id: "prj_t" });
}

describe("ModelsPanel", () => {
  it("lists the board under its status with the tier chip and the engine line", () => {
    render(<ModelsPanel state={project()} messages={messages} />);
    expect(screen.getByText(messages.engine.value)).toBeTruthy();
    expect(screen.getByRole("heading", { name: messages.status["partly-modelled"] })).toBeTruthy();
    expect(screen.getByText("Arduino UNO Rev3")).toBeTruthy();
    expect(screen.getByLabelText(`${messages.chip}: ${messages.tiers.T1.name}`)).toBeTruthy();
    expect(screen.getByText(/^int is 16 bits/)).toBeTruthy();
    expect(screen.getByText(messages.notModelledHelp)).toBeTruthy();
  });

  it("groups parts by status and names an unknown part", () => {
    const p = project();
    p.components.push({ id: "cmp_1", definition: { ref: "core.mystery", version: "1.0.0" }, refdes: "X1" });
    render(<ModelsPanel state={p} messages={messages} />);
    const heading = screen.getByRole("heading", { name: messages.status["not-modelled-yet"] });
    expect(within(heading.parentElement!).getByText(messages.unknownPart)).toBeTruthy();
  });

  it("says so when the project has no parts", () => {
    const p = project();
    p.boards = [];
    render(<ModelsPanel state={p} messages={messages} />);
    expect(screen.getByText(messages.empty)).toBeTruthy();
  });

  it("collapses a long list after five lines and expands on request", () => {
    const [board] = project().boards;
    const registry = {
      get: () => ({
        identity: { model: "Long part" },
        simulation: { tier: "T1", status: "modelled", what_it_models: Array.from({ length: 7 }, (_, i) => ({ en: `models line ${i}` })), not_modelled: [] },
      }),
    } as unknown as PartLookup;
    render(<ModelsPanel state={{ ...project(), boards: [board] }} messages={messages} registry={registry} />);
    expect(screen.getAllByText(/^models line/)).toHaveLength(5);
    fireEvent.click(screen.getByRole("button", { name: messages.showAll }));
    expect(screen.getAllByText(/^models line/)).toHaveLength(7);
    fireEvent.click(screen.getByRole("button", { name: messages.showLess }));
    expect(screen.getAllByText(/^models line/)).toHaveLength(5);
  });
});

describe("TierChip", () => {
  it("shows the code and the name", () => {
    render(<TierChip tier="T2" messages={messages} />);
    const chip = screen.getByLabelText(`${messages.chip}: ${messages.tiers.T2.name}`);
    expect(chip.textContent).toContain("T2");
    expect(chip.textContent).toContain(messages.tiers.T2.name);
  });

  it("shows a glyph and the name when there is no tier", () => {
    render(<TierChip tier="none" messages={messages} />);
    const chip = screen.getByLabelText(`${messages.chip}: ${messages.tiers.none.name}`);
    expect(chip.querySelector("svg")).toBeTruthy();
  });
});

describe("studioModels copy", () => {
  it.each(LOCALES)("%s avoids claims of proof", (lang) => {
    const text = readFileSync(join(process.cwd(), `src/i18n/messages/${lang}/studioModels.json`), "utf8");
    expect(text).not.toMatch(/validated/i);
    expect(text).not.toMatch(/proven|certified|accurate/i);
  });
});
