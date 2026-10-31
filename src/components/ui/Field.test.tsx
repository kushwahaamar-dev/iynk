import { render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Icon } from "./icons";
import { FieldMessage, Select, TextArea, TextInput } from "./Field";

describe("Field", () => {
  it("wires the label to the control", () => {
    render(<TextInput label="Name" />);
    expect(screen.getByLabelText("Name").tagName).toBe("INPUT");
  });

  it("marks an invalid control and reads the message with it", () => {
    render(<TextInput label="Name" error="Enter a name" />);
    const input = screen.getByLabelText("Name");
    const message = screen.getByRole("alert");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(input.getAttribute("aria-describedby")).toBe(message.id);
    expect(message.textContent).toBe("Enter a name");
    expect(message.className).toContain("text-bad");
    expect(message.querySelector("svg")).toBeTruthy();
  });

  it("uses the circle warning glyph, not the triangle", () => {
    const { container } = render(<FieldMessage id="a" error="x" />);
    const glyph = (name: "warn-circle" | "warn") => renderToStaticMarkup(<Icon name={name} size={16} />);
    expect(container.querySelector("svg path")?.getAttribute("d")).toBe(
      new DOMParser().parseFromString(glyph("warn-circle"), "text/html").querySelector("svg path")?.getAttribute("d"),
    );
    expect(container.querySelector("svg path")?.getAttribute("d")).not.toBe(
      new DOMParser().parseFromString(glyph("warn"), "text/html").querySelector("svg path")?.getAttribute("d"),
    );
  });

  it("shows a hint without a role or an invalid mark", () => {
    render(<TextInput label="Name" hint="As on your badge" />);
    const input = screen.getByLabelText("Name");
    const hint = screen.getByText("As on your badge");
    expect(hint.getAttribute("role")).toBeNull();
    expect(input.getAttribute("aria-describedby")).toBe(hint.id);
    expect(input.getAttribute("aria-invalid")).toBeNull();
  });

  it("prefers the error over the hint", () => {
    render(<TextInput label="Name" hint="As on your badge" error="Enter a name" />);
    expect(screen.queryByText("As on your badge")).toBeNull();
  });

  it("draws the select caret itself", () => {
    render(
      <Select label="Language">
        <option>English</option>
      </Select>,
    );
    const select = screen.getByLabelText("Language");
    expect(select.parentElement?.querySelector("svg")).toBeTruthy();
    expect(select.className).not.toContain("bg-[url");
    expect(select.getAttribute("style")).toBeNull();
  });

  it("forwards rows on a text area", () => {
    render(<TextArea label="Notes" rows={7} />);
    expect(screen.getByLabelText("Notes").getAttribute("rows")).toBe("7");
  });

  it("keeps the label for screen readers when hidden", () => {
    render(<TextInput label="Search" hideLabel />);
    expect(screen.getByText("Search").className).toContain("sr-only");
  });
});
