import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { Toggle } from "./Toggle";

function Harness({ disabled }: { disabled?: boolean }) {
  const [on, setOn] = useState(false);
  return <Toggle label="Sound" description="Beeps on events" checked={on} onChange={setOn} disabled={disabled} />;
}

describe("Toggle", () => {
  it("toggles on click and follows aria-checked", () => {
    render(<Harness />);
    const sw = screen.getByRole("switch", { name: "Sound" });
    expect(sw.getAttribute("aria-checked")).toBe("false");
    fireEvent.click(sw);
    expect(sw.getAttribute("aria-checked")).toBe("true");
  });

  it("moves the thumb with a transform and keeps a visible track border", () => {
    render(<Harness />);
    const sw = screen.getByRole("switch");
    const track = sw.firstElementChild as HTMLElement;
    const thumb = track.firstElementChild as HTMLElement;
    expect(track.className).toContain("border-muted");
    expect(track.className).toContain("bg-sunken");
    expect(thumb.className).toContain("translate-x-0");
    fireEvent.click(sw);
    expect(track.className).toContain("bg-accent");
    expect(thumb.className).toContain("translate-x-4");
    expect(thumb.className).not.toContain("inset-inline-start");
  });

  it("describes the switch with its description", () => {
    render(<Harness />);
    const sw = screen.getByRole("switch");
    expect(document.getElementById(sw.getAttribute("aria-describedby") ?? "")?.textContent).toBe("Beeps on events");
  });

  it("does nothing when disabled", () => {
    const onChange = vi.fn();
    render(<Toggle label="Sound" checked={false} onChange={onChange} disabled />);
    fireEvent.click(screen.getByRole("switch"));
    expect(onChange).not.toHaveBeenCalled();
  });
});
