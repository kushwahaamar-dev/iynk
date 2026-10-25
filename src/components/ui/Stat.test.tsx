import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Stat } from "./Stat";

describe("Stat", () => {
  // 0.6em of an 18 px telemetry value was 10.8 px, under the 12 px floor (POLISH-SPEC 1.3).
  it("sets its unit in a type step of 12 px or more, never a fraction of the value", () => {
    render(<Stat size="sm" label="Altitude" value="12.4" unit="m" />);
    const unit = screen.getByText("m");
    expect(unit.className).toContain("text-xs");
    expect(unit.className).not.toMatch(/text-\[[\d.]+em\]/);
  });
});
