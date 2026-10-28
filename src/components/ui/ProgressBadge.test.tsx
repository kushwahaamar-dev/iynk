import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProgressBadge } from "./ProgressBadge";

describe("ProgressBadge", () => {
  afterEach(() => vi.useRealTimers());

  it("in a workspace bar, says what it counts on hover and to screen readers", () => {
    vi.useFakeTimers();
    render(<ProgressBadge size="xs" done={0} total={26} label="Progress" countText="0/26" valueText="0 of 26 steps, tasks and quizzes done on this bench" />);
    const bar = screen.getByRole("progressbar", { name: "Progress" });
    expect(bar.getAttribute("aria-valuetext")).toBe("0 of 26 steps, tasks and quizzes done on this bench");
    expect(screen.queryByRole("tooltip")).toBeNull();
    fireEvent.pointerEnter(bar, { pointerType: "mouse" });
    act(() => vi.advanceTimersByTime(1000));
    // The tip repeats the read-out for the eye, so screen readers skip it.
    expect(screen.getByRole("tooltip", { hidden: true }).hidden).toBe(false);
    expect(screen.getByRole("tooltip", { hidden: true }).textContent).toBe("0 of 26 steps, tasks and quizzes done on this bench");
    fireEvent.pointerLeave(bar, { pointerType: "mouse" });
    expect(screen.getByRole("tooltip", { hidden: true }).hidden).toBe(true);
  });

  it("scales its fill instead of animating width and keeps the track border", () => {
    render(<ProgressBadge done={4} total={16} label="Lessons" countText="4/16" valueText="Lessons: 4 of 16 done" />);
    const bar = screen.getByRole("progressbar", { name: "Lessons" });
    expect(bar.getAttribute("aria-valuenow")).toBe("4");
    const track = bar.querySelector("span[aria-hidden]") as HTMLElement;
    expect(track.className).toContain("border-muted");
    const fill = track.firstElementChild as HTMLElement;
    expect(fill.style.transform).toBe("scaleX(0.25)");
    expect(fill.style.width).toBe("");
    expect(fill.className).toContain("bg-accent");
  });

  it("turns green when done", () => {
    render(<ProgressBadge done={16} total={16} label="Lessons" countText="16/16" valueText="Done" />);
    const fill = screen.getByRole("progressbar").querySelector("span[aria-hidden] > span") as HTMLElement;
    expect(fill.className).toContain("bg-good");
  });
});
