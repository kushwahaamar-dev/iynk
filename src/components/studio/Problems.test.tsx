import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import messages from "@/i18n/messages/en/studioCode.json";
import type { Problem } from "@/studio/problems";
import { Problems } from "./Problems";

const include: Problem = {
  id: "code:0",
  severity: "error",
  source: "code",
  titleKey: "problem.include.unknown",
  args: { name: "Foo.h" },
  line: 2,
  col: 1,
  hint: "supported libraries: Servo.h",
};
const plain: Problem = { id: "code:1", severity: "warning", source: "code", titleKey: "problem.interp", args: {}, fallbackText: "pin 40 does not exist", line: 7 };
const flag: Problem = { id: "static:short-circuit:net_a", severity: "error", source: "static", titleKey: "problem.static.short-circuit", args: { net: "net_a", count: 2 } };

const view = (problems: Problem[], onJump = vi.fn()) => {
  render(<Problems problems={problems} onJump={onJump} messages={messages} lang="en" />);
  return onJump;
};

describe("Problems", () => {
  it("says so when there is nothing wrong", () => {
    view([]);
    expect(screen.getByText(messages.problems.empty)).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("shows each problem as a button named by its severity, line and text", () => {
    view([include, plain, flag]);
    const rows = screen.getAllByRole("button");
    expect(rows).toHaveLength(3);
    expect(rows[0]!.textContent).toContain("Error");
    expect(rows[0]!.textContent).toContain("Line 2");
    expect(rows[0]!.textContent).toContain("Foo.h is not a library iynk can simulate.");
    expect(rows[0]!.textContent).toContain("supported libraries: Servo.h");
    expect(rows[1]!.textContent).toContain("Warning");
    expect(rows[1]!.textContent).toContain("pin 40 does not exist");
    expect(rows[2]!.textContent).not.toContain("Line");
    expect(screen.getByRole("button", { name: /Error.*Line 2.*Foo\.h/ })).toBe(rows[0]);
  });

  it("counts the problems", () => {
    view([include, plain]);
    expect(screen.getByRole("status").textContent).toBe("2 problems");
  });

  it("jumps to the problem that was pressed", () => {
    const onJump = view([include, plain]);
    fireEvent.click(screen.getAllByRole("button")[1]!);
    expect(onJump).toHaveBeenCalledWith(plain);
  });
});
