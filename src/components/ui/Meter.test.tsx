import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Meter } from "./Meter";

describe("Meter", () => {
  it("draws the track with a muted border and grows the bar by transform", () => {
    render(<Meter label="Current" value={40} max={100} valueText="40 mA" />);
    const track = screen.getByRole("meter", { name: "Current" });
    expect(track.className).toContain("border-muted");
    expect(track.getAttribute("aria-valuenow")).toBe("40");
    const bar = track.firstElementChild as HTMLElement;
    expect(bar.style.transform).toBe("scaleX(0.4)");
    expect(bar.style.width).toBe("");
    expect(bar.className).toContain("motion-move");
  });

  it("is empty at the minimum and clamps above the maximum", () => {
    const { rerender } = render(<Meter label="Draw" value={0} max={10} />);
    expect((screen.getByRole("meter").firstElementChild as HTMLElement).style.transform).toBe("scaleX(0)");
    rerender(<Meter label="Draw" value={30} max={10} />);
    expect((screen.getByRole("meter").firstElementChild as HTMLElement).style.transform).toBe("scaleX(1)");
  });

  it("colours the bar accent, green when full, amber at warn and red at danger", () => {
    const fill = () => (screen.getByRole("meter").firstElementChild as HTMLElement).className;
    const { rerender } = render(<Meter label="Draw" value={5} max={10} warn={8} danger={10} />);
    expect(fill()).toContain("bg-accent");
    rerender(<Meter label="Draw" value={8} max={10} warn={8} danger={10} />);
    expect(fill()).toContain("bg-warn");
    rerender(<Meter label="Draw" value={10} max={10} warn={8} danger={10} />);
    expect(fill()).toContain("bg-bad");
    rerender(<Meter label="Draw" value={10} max={10} />);
    expect(fill()).toContain("bg-good");
  });

  it("does not animate width", () => {
    expect(readFileSync(join(process.cwd(), "src/components/ui/Meter.tsx"), "utf8")).not.toMatch(/transition-\[width\]|width:/);
  });
});
