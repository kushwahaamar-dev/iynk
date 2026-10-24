import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { SegmentedControl } from "./SegmentedControl";

function Theme() {
  const [value, setValue] = useState<"system" | "light" | "dark">("system");
  return (
    <SegmentedControl
      label="Theme"
      iconOnly
      value={value}
      onChange={setValue}
      options={[
        { value: "system", label: "Match system" },
        { value: "light", label: "Light" },
        { value: "dark", label: "Dark" },
      ]}
    />
  );
}

describe("SegmentedControl", () => {
  it("is a radio group with one tab stop that arrow keys move and select", () => {
    render(<Theme />);
    expect(screen.getByRole("radiogroup", { name: "Theme" })).toBeTruthy();
    const system = screen.getByRole("radio", { name: "Match system" });
    expect(system.getAttribute("aria-checked")).toBe("true");
    expect(screen.getAllByRole("radio").map((radio) => radio.tabIndex)).toEqual([0, -1, -1]);

    system.focus();
    fireEvent.keyDown(system, { key: "ArrowRight" });
    const light = screen.getByRole("radio", { name: "Light" });
    expect(document.activeElement).toBe(light);
    expect(light.getAttribute("aria-checked")).toBe("true");

    fireEvent.keyDown(light, { key: "End" });
    expect(screen.getByRole("radio", { name: "Dark" }).getAttribute("aria-checked")).toBe("true");
    fireEvent.keyDown(document.activeElement as Element, { key: "ArrowRight" });
    expect(system.getAttribute("aria-checked")).toBe("true");
    expect(document.activeElement).toBe(system);
  });

  it("selects on click", () => {
    render(<Theme />);
    fireEvent.click(screen.getByRole("radio", { name: "Dark" }));
    expect(screen.getByRole("radio", { name: "Dark" }).getAttribute("aria-checked")).toBe("true");
    expect(screen.getByRole("radio", { name: "Match system" }).getAttribute("aria-checked")).toBe("false");
  });
});
