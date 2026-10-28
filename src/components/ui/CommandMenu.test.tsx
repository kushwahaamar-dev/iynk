import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { CommandMenu, type CommandGroup } from "./CommandMenu";

function Harness({ groups }: { groups: CommandGroup[] }) {
  const [open, setOpen] = useState(true);
  return <CommandMenu open={open} onClose={() => setOpen(false)} label="Command menu" placeholder="Search" emptyLabel="Nothing matches." groups={groups} />;
}

function groupsWith(onDark = vi.fn(), onLight = vi.fn()): CommandGroup[] {
  return [
    { id: "pages", label: "Pages", items: [{ id: "boards", label: "Board Lab", onSelect: vi.fn() }, { id: "drones", label: "Drone Lab", onSelect: vi.fn() }] },
    { id: "theme", label: "Theme", items: [{ id: "light", label: "Light", onSelect: onLight }, { id: "dark", label: "Dark", onSelect: onDark }] },
  ];
}

describe("CommandMenu", () => {
  it("is a combobox over a listbox of grouped options", () => {
    render(<Harness groups={groupsWith()} />);
    const input = screen.getByRole("combobox", { name: "Command menu" });
    const list = screen.getByRole("listbox");
    expect(input.getAttribute("aria-expanded")).toBe("true");
    expect(input.getAttribute("aria-controls")).toBe(list.id);
    expect(screen.getAllByRole("option")).toHaveLength(4);
    expect(screen.getByRole("group", { name: "Pages" })).toBeTruthy();
    expect(screen.getByRole("group", { name: "Theme" })).toBeTruthy();
    expect(document.activeElement).toBe(input);
  });

  it("moves the active option with the arrow keys", () => {
    render(<Harness groups={groupsWith()} />);
    const input = screen.getByRole("combobox");
    const options = screen.getAllByRole("option");
    expect(input.getAttribute("aria-activedescendant")).toBe(options[0].id);
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(input.getAttribute("aria-activedescendant")).toBe(options[1].id);
    expect(options[1].getAttribute("aria-selected")).toBe("true");
    fireEvent.keyDown(input, { key: "ArrowUp" });
    fireEvent.keyDown(input, { key: "ArrowUp" });
    expect(input.getAttribute("aria-activedescendant")).toBe(options[3].id);
  });

  it("filters as you type and runs the active option on Enter, then closes", () => {
    const onDark = vi.fn();
    render(<Harness groups={groupsWith(onDark)} />);
    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "dar" } });
    expect(screen.getAllByRole("option")).toHaveLength(1);
    expect(screen.queryByRole("group", { name: "Pages" })).toBeNull();
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onDark).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("runs an option that is clicked", () => {
    const onLight = vi.fn();
    render(<Harness groups={groupsWith(vi.fn(), onLight)} />);
    fireEvent.click(screen.getByRole("option", { name: "Light" }));
    expect(onLight).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("says so when nothing matches", () => {
    render(<Harness groups={groupsWith()} />);
    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "zzz" } });
    expect(screen.queryByRole("option")).toBeNull();
    expect(screen.getByText("Nothing matches.")).toBeTruthy();
    expect(input.hasAttribute("aria-activedescendant")).toBe(false);
    fireEvent.keyDown(input, { key: "Enter" });
    expect(screen.getByRole("dialog")).toBeTruthy();
  });

  it("closes on Escape", () => {
    render(<Harness groups={groupsWith()} />);
    fireEvent.keyDown(screen.getByRole("combobox"), { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
