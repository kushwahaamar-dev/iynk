import { act, fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { I18nProvider } from "@/i18n/client";
import common from "@/i18n/messages/en/common.json";
import robotics from "@/i18n/messages/en/robotics.json";
import { STORAGE_KEY } from "@/lib/progress/storage";
import { fixtureBench as bench } from "@/lib/robotics/__fixtures__/bench";
import { benchTextKeys } from "@/lib/robotics/text";
import { BenchWorkspace } from "./BenchWorkspace";
import type { BenchMessages } from "./messages";

const texts = Object.fromEntries(benchTextKeys(bench).map((key) => [key, `T:${key}`]));
const messages: BenchMessages = {
  bench: robotics.bench,
  steps: robotics.steps,
  faults: robotics.faults,
  status: robotics.status,
  current: robotics.current,
  serial: robotics.serial,
  modes: robotics.modes,
  tasks: robotics.tasks,
  quiz: robotics.quiz,
  keys: robotics.keys,
};

function Providers({ children }: { children: ReactNode }) {
  return (
    <I18nProvider locale="en" messages={common.client}>
      {children}
    </I18nProvider>
  );
}

type Posted = Record<string, unknown>;
let posted: Posted[] = [];

function frameWindow() {
  const frame = document.querySelector("iframe");
  if (!frame?.contentWindow) throw new Error("no iframe window");
  return frame.contentWindow;
}

function mount() {
  render(
    <BenchWorkspace
      setup={{ bench, texts, starters: { "blink-led": "void setup() {}\nvoid loop() {}" }, solutions: { "blink-led": bench.tasks[0].solution } }}
      messages={messages}
    />,
    { wrapper: Providers },
  );
  posted = [];
  vi.spyOn(frameWindow(), "postMessage").mockImplementation(((message: Posted) => {
    posted.push(message);
  }) as Window["postMessage"]);
}

function fromFigure(type: string, payload: Record<string, unknown> = {}) {
  act(() => {
    window.dispatchEvent(
      new MessageEvent("message", {
        data: { source: "simlab-figure", v: 1, type, ...payload },
        origin: window.location.origin,
        source: frameWindow(),
      }),
    );
  });
}

const ready = { fig: "led-resistor", title: "LED", lang: "en", buttons: [], switches: [], acts: [], parts: [], pals: [] };
const report = (state: Record<string, unknown>) => fromFigure("state", { state, changed: Object.keys(state) });
const notice = () => document.querySelector("[data-notice]")?.textContent ?? "";

beforeEach(() => localStorage.clear());

describe("BenchWorkspace", () => {
  test("renders every panel from the bench data", () => {
    mount();
    expect(screen.getByRole("heading", { name: "Build and break" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Live status" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Bench notes" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Practice tasks" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Check yourself" })).toBeTruthy();
    expect(screen.getByText("0/5 steps")).toBeTruthy();
    expect(screen.getByRole("meter")).toBeTruthy();
  });

  test("a step out of order is refused with its refusal, in order it is sent to the figure", () => {
    mount();
    fromFigure("ready", ready);
    const place = document.querySelector('[data-step="place"]') as HTMLElement;
    fireEvent.click(within(place).getByRole("button"));
    expect(notice()).toContain("T:steps.place.refusal");
    expect(posted.some((m) => m.type === "flash" && m.text === "T:steps.place.refusal")).toBe(true);

    const strip = document.querySelector('[data-step="strip"]') as HTMLElement;
    fireEvent.click(within(strip).getByRole("button"));
    expect(posted.some((m) => m.type === "set" && (m.state as Record<string, unknown>).build === "bare")).toBe(true);
  });

  test("figure reports finish steps, save progress and unlock the quiz, which records a score", () => {
    mount();
    fromFigure("ready", ready);
    report({ build: "bare", status: "off" });
    report({ build: "tht", status: "off" });
    report({ build: "assembled", status: "off", serial: { n: 1, line: "-- power on --" } });
    expect(screen.getByText("3/5 steps")).toBeTruthy();
    expect(screen.getByText("-- power on --")).toBeTruthy();
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as { done: Record<string, true> };
    expect(saved.done["robotics:led-resistor:step:solder"]).toBe(true);

    expect(notice()).toContain("A quiz is ready");
    fireEvent.click(within(document.querySelector("[data-notice]") as HTMLElement).getByRole("button", { name: "Take the quiz" }));
    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByLabelText("T:quizzes.after-solder.q1.options.2"));
    fireEvent.click(within(dialog).getByRole("button", { name: "Check answer" }));
    expect(within(dialog).getByText("Right.")).toBeTruthy();
    fireEvent.click(within(dialog).getByRole("button", { name: "Next question" }));
    fireEvent.click(within(screen.getByRole("dialog")).getByLabelText("T:quizzes.after-solder.q2.options.2"));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Check answer" }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "See my score" }));
    expect(within(screen.getByRole("dialog")).getByText("1/2 correct")).toBeTruthy();
    const after = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as { quiz: Record<string, unknown> };
    expect(after.quiz["robotics:led-resistor:quiz:after-solder"]).toEqual({ score: 1, total: 2 });
  });

  test("keyboard: ? opens the shortcut list, N does the next step", () => {
    mount();
    fromFigure("ready", ready);
    fireEvent.keyDown(document.body, { key: "?" });
    expect(screen.getByRole("dialog", { name: "Keyboard shortcuts" })).toBeTruthy();
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.keyDown(document.body, { key: "n" });
    expect(posted.some((m) => m.type === "set" && (m.state as Record<string, unknown>).build === "bare")).toBe(true);
  });

  test("the current meter follows the figure state", () => {
    mount();
    fromFigure("ready", ready);
    report({ status: "running", mode: "r220" });
    expect(screen.getByRole("meter").getAttribute("aria-valuenow")).toBe("13.6");
    expect(screen.getByText("13.6 of 500 mA")).toBeTruthy();
  });

  test("a practice task runs on the interpreter and is saved when every check passes", async () => {
    mount();
    const task = document.querySelector('[data-task="blink-led"]') as HTMLElement;
    fireEvent.click(within(task).getByRole("button", { name: "Run checks" }));
    expect(await within(task).findByText("0 of 1 checks pass")).toBeTruthy();

    fireEvent.click(within(task).getByRole("button", { name: "Load the reference solution" }));
    expect((within(task).getByRole("textbox") as HTMLTextAreaElement).value).toBe(bench.tasks[0].solution);
    fireEvent.click(within(task).getByRole("button", { name: "Run checks" }));
    expect(await within(task).findByText("All 1 checks pass. Task done.")).toBeTruthy();
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as { done: Record<string, true> };
    expect(saved.done["robotics:led-resistor:task:blink-led"]).toBe(true);
  });
});
