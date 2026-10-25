import { render, screen } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { I18nProvider } from "@/i18n/client";
import common from "@/i18n/messages/en/common.json";
import shell from "@/i18n/messages/en/shell.json";
import { HeroActions, LabProgress } from "./DashboardProgress";
import type { DashItem } from "./data";

const items: DashItem[] = [
  {
    lab: "board",
    id: "uno-r3",
    title: "Arduino Uno R3",
    href: "/en/boards/uno-r3",
    entries: [
      { key: "board:uno-r3:lesson:board", kind: "lesson", href: "/en/boards/uno-r3/board", label: "Meet the board" },
      { key: "board:uno-r3:lesson:blink", kind: "lesson", href: "/en/boards/uno-r3/blink", label: "Blink an LED" },
      { key: "board:uno-r3:assembly", kind: "assembly", href: "/en/boards/uno-r3" },
    ],
  },
  {
    lab: "board",
    id: "nano",
    title: "Arduino Nano",
    href: "/en/boards/nano",
    entries: [{ key: "board:nano:lesson:blink", kind: "lesson", href: "/en/boards/nano/blink", label: "Blink" }],
  },
  {
    lab: "drone",
    id: "quad5",
    title: '5" freestyle quad',
    href: "/en/drones/quad5",
    entries: [
      { key: "drone:quad5:build", kind: "build", href: "/en/drones/quad5" },
      { key: "drone:quad5:quiz:props", kind: "quiz", href: "/en/drones/quad5" },
    ],
  },
];

const messages = shell.dashboard.continue;
const labNames = { board: "Board Lab", robotics: "Robotics Lab", drone: "Drone Lab" };

function save(done: string[], quiz: Record<string, { score: number; total: number }> = {}) {
  localStorage.setItem(
    "simlab:v1",
    JSON.stringify({ v: 1, done: Object.fromEntries(done.map((key) => [key, true])), quiz, best: {}, settings: { theme: "system", sound: true, lofi: false, labels: true, reduceMotion: false } }),
  );
}

function renderEn(ui: ReactElement) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <I18nProvider locale="en" messages={common.client}>
      {children}
    </I18nProvider>
  );
  return render(ui, { wrapper });
}

describe("dashboard progress", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  const hero = (startHref = "/en/boards/uno-r3/board") => (
    <HeroActions
      items={items}
      messages={messages}
      progressMessages={{ progress: shell.ui.progress, progressLabel: shell.ui.progressLabel }}
      labNames={labNames}
      start={{ href: startHref, label: shell.dashboard.start }}
      browse={{ href: "/en/boards", label: shell.dashboard.browse }}
      overallLabel={shell.dashboard.overall}
    />
  );

  it("offers the first lesson and the boards when nothing is saved", () => {
    renderEn(hero());
    expect(screen.getByRole("link", { name: shell.dashboard.start }).getAttribute("href")).toBe("/en/boards/uno-r3/board");
    expect(screen.getByRole("link", { name: shell.dashboard.browse }).getAttribute("href")).toBe("/en/boards");
    expect(screen.queryByText(/Carry on/)).toBeNull();
  });

  it("names the latest finished entry and links the next unfinished one", () => {
    save(["drone:quad5:build", "board:uno-r3:lesson:board"]);
    renderEn(hero("/x"));
    expect(screen.getByText(/Lesson: Meet the board/)).toBeTruthy();
    expect(screen.getByText("Arduino Uno R3")).toBeTruthy();
    const resume = screen.getByRole("link", { name: "Carry on: Blink an LED" });
    expect(resume.getAttribute("href")).toBe("/en/boards/uno-r3/blink");
    expect(screen.getByText("Overall progress: 2 of 6 done")).toBeTruthy();
  });

  it("moves on to the next item in the same lab once an item is complete", () => {
    save(["board:uno-r3:lesson:board", "board:uno-r3:lesson:blink", "board:uno-r3:assembly"]);
    renderEn(hero("/x"));
    expect(screen.getByRole("link", { name: /^Carry on/ }).getAttribute("href")).toBe("/en/boards/nano/blink");
  });

  it("counts a recorded quiz attempt as done, and ignores keys it does not know", () => {
    save(["board:retired:lesson:old"], { "drone:quad5:quiz:props": { score: 3, total: 4 } });
    renderEn(<LabProgress keys={["drone:quad5:build", "drone:quad5:quiz:props"]} label="Builds" messages={{ progress: shell.ui.progress, progressLabel: shell.ui.progressLabel }} />);
    const bar = screen.getByRole("progressbar", { name: "Builds" });
    expect(bar.getAttribute("aria-valuenow")).toBe("1");
    expect(bar.getAttribute("aria-valuetext")).toBe("Builds: 1 of 2 done");
    expect(screen.getByText("1/2")).toBeTruthy();
  });
});
