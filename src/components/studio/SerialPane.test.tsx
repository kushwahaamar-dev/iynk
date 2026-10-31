import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import messages from "@/i18n/messages/en/studioRun.json";
import { createRunStore, SERIAL_RING } from "@/studio/stores/run";
import { ANNOUNCE_MS, SerialPane } from "./SerialPane";
import type { SimLink } from "./wiring/simLink";

function rig(running = true) {
  const run = createRunStore();
  const link: SimLink = { run: vi.fn(async () => {}), stop: vi.fn(), reset: vi.fn(), pause: vi.fn(), resume: vi.fn(), step: vi.fn(), setSpeed: vi.fn(), restart: vi.fn(async () => {}), sendSerial: vi.fn(), press: vi.fn(), dispose: vi.fn() };
  if (running) {
    run.apply({ t: "phase", phase: "starting" });
    run.apply({ t: "phase", phase: "running" });
  }
  render(<SerialPane run={run} link={link} messages={messages} lang="en" />);
  return { run, link };
}

const print = (run: ReturnType<typeof createRunStore>, tNs: number, text: string) => act(() => run.apply({ t: "serial", tNs, kind: "out", text }));

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("SerialPane", () => {
  it("shows an empty note first", () => {
    rig(false);
    expect(screen.getByText(messages.serial.empty)).toBeTruthy();
  });

  it("shows lines with virtual time stamps", () => {
    const { run } = rig();
    print(run, 1_000_000_000, "on\n");
    print(run, 2_000_000_000, "off\n");
    const lines = screen.getByRole("log").children;
    expect(lines).toHaveLength(2);
    expect(lines[0]!.textContent).toBe("[t=1.000 s]on");
    expect(lines[1]!.textContent).toBe("[t=2.000 s]off");
  });

  it("shows text as text", () => {
    const { run } = rig();
    print(run, 0, "<img src=x onerror=alert(1)>\n");
    expect(screen.getByRole("log").querySelector("img")).toBeNull();
    expect(screen.getByRole("log").textContent).toContain("<img src=x");
  });

  it("says how many older lines were dropped", () => {
    const { run } = rig();
    print(run, 0, "x\n".repeat(SERIAL_RING + 3));
    expect(screen.getByText("3 older lines dropped")).toBeTruthy();
  });

  it("announces a summary at most once per two seconds", () => {
    const { run } = rig();
    const live = () => screen.getAllByRole("status").map((el) => el.textContent).join("");
    for (let i = 0; i < 5; i++) {
      print(run, i, `l${i}\n`);
      act(() => void vi.advanceTimersByTime(100));
    }
    expect(live()).toBe("");
    act(() => void vi.advanceTimersByTime(ANNOUNCE_MS));
    expect(live()).toBe("5 new lines");
    print(run, 9, "more\n");
    act(() => void vi.advanceTimersByTime(ANNOUNCE_MS - 1));
    expect(live()).toBe("5 new lines");
    act(() => void vi.advanceTimersByTime(1));
    expect(live()).toBe("1 new line");
  });

  it("keeps the log itself out of the live region", () => {
    rig();
    expect(screen.getByRole("log").getAttribute("aria-live")).toBe("off");
  });

  it("clears the lines", () => {
    const { run } = rig();
    print(run, 0, "a\n");
    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(run.getState().serial).toEqual([]);
    expect(screen.getByText(messages.serial.empty)).toBeTruthy();
  });

  it("copies the lines with their stamps", async () => {
    const writeText = vi.fn(async () => {});
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    const { run } = rig();
    print(run, 1_500_000_000, "hello\n");
    await act(async () => void fireEvent.click(screen.getByRole("button", { name: "Copy" })));
    expect(writeText).toHaveBeenCalledWith("[t=1.500 s] hello");
    expect(screen.getByText(messages.serial.copied)).toBeTruthy();
  });

  it("sends a typed line with a line break", () => {
    const { link } = rig();
    fireEvent.change(screen.getByLabelText(messages.serial.input), { target: { value: "hi" } });
    fireEvent.submit(screen.getByRole("button", { name: "Send" }).closest("form")!);
    expect(link.sendSerial).toHaveBeenCalledWith("hi\n");
    expect((screen.getByLabelText(messages.serial.input) as HTMLInputElement).value).toBe("");
  });

  it("does not take input when nothing runs", () => {
    rig(false);
    expect((screen.getByLabelText(messages.serial.input) as HTMLInputElement).disabled).toBe(true);
  });
});
