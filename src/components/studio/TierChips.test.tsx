import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import messages from "@/i18n/messages/en/fidelity.json";
import { createTranslator } from "@/i18n/translate";
import type { ProjectFidelity } from "@/sim/registry/project";
import { findBanned } from "@/sim/registry/tiers";
import type { ValidationRecord } from "@/sim/registry/types";
import { pickValidation, TierChips, TierSummaryChip, validationLine } from "./TierChips";

const t = createTranslator("en", messages);

const layer = (name: ProjectFidelity["layers"][number]["layer"], tier: ProjectFidelity["layers"][number]["tier"]) => ({ layer: name, tier, entryIds: [], unmodelled: [] });

const blink: ProjectFidelity = { layers: [layer("execution", "T1"), layer("circuit", "T1")], summary: "T1" };
const firmware: ProjectFidelity = { layers: [layer("execution", "T3"), layer("circuit", "T1")], summary: "T1" };

function record(over: Partial<ValidationRecord>): ValidationRecord {
  return {
    id: "v",
    kind: "oracle",
    oracle: { name: "ngspice", version: "42" },
    dataset: "d",
    result: { n: 12, passed: 12, metric: "volts", worst: 2, unit: "%" },
    date: "2026-10-01",
    engineVersion: "1.0.0",
    status: "pass",
    ...over,
  };
}

describe("TierChips", () => {
  it("renders one chip per layer and a summary equal to the lowest (Uno blink)", () => {
    render(
      <>
        <TierChips fidelity={blink} t={t} onOpenLayer={() => {}} />
        <TierSummaryChip fidelity={blink} t={t} />
      </>,
    );
    expect(screen.getAllByRole("button")).toHaveLength(2);
    expect(screen.getByText("Overall: Teaching model")).toBeTruthy();
  });

  it("names the firmware layer and keeps the summary at the circuit tier", () => {
    render(
      <>
        <TierChips fidelity={firmware} t={t} onOpenLayer={() => {}} />
        <TierSummaryChip fidelity={firmware} t={t} />
      </>,
    );
    expect(screen.getByRole("button", { name: "Execution: Runs your compiled firmware. Open details" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Circuit: Teaching model. Open details" })).toBeTruthy();
    expect(screen.getByText("Overall: Teaching model")).toBeTruthy();
  });

  it("opens the layer on click and shows nothing for an empty project", () => {
    const open = vi.fn();
    const { container, rerender } = render(<TierChips fidelity={blink} t={t} onOpenLayer={open} />);
    fireEvent.click(screen.getByRole("button", { name: /^Circuit/ }));
    expect(open).toHaveBeenCalledWith("circuit");
    rerender(<TierChips fidelity={{ layers: [], summary: "none" }} t={t} onOpenLayer={open} />);
    expect(container.textContent).toBe("");
  });

  it("shows no tier code for a layer without a tier", () => {
    render(<TierChips fidelity={{ layers: [layer("circuit", "none")], summary: "none" }} t={t} onOpenLayer={() => {}} />);
    expect(screen.getByRole("button").textContent).toBe("Circuit: Not modelled yet");
  });
});

describe("validationLine", () => {
  it("says so when there is no record", () => {
    expect(validationLine(undefined, t)).toBe("Not checked against a reference.");
  });

  it("reports the oracle result", () => {
    expect(validationLine(record({}), t)).toBe("Within 2 percent of ngspice on 12 circuits (2026-10-01)");
  });

  it("reports a bench run", () => {
    expect(validationLine(record({ kind: "bench" }), t)).toBe("Measured on hardware: 12 circuits, error table");
  });

  it("picks the newest passing record and skips the rest", () => {
    const older = record({ id: "a", date: "2026-01-01" });
    const newer = record({ id: "b", kind: "analytic", date: "2026-09-01" });
    const failed = record({ id: "c", date: "2026-10-20", status: "fail" });
    const selfCheck = record({ id: "d", kind: "self-consistency", date: "2026-10-25" });
    expect(pickValidation([older, failed, newer, selfCheck])?.id).toBe("b");
    expect(pickValidation([failed, selfCheck])).toBeUndefined();
  });
});

describe("fidelity copy", () => {
  it("has no banned word in the English text", () => {
    expect(findBanned(JSON.stringify(messages))).toEqual([]);
  });
});
