import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import messages from "@/i18n/messages/en/faults.json";
import { ladderFor } from "@/sim/faults/hints";
import { HintLadder } from "./HintLadder";

const levels = ladderFor({
  descriptorHints: [{ level: 1, text: "Look at the bus." }, { level: 2, text: "Measure the lines." }],
  cause: "swapped-pins",
  finding: { ruleId: "r", causeId: "swapped-pins", symptomId: "i2c-no-ack", severity: "error", targets: [{ kind: "pin", id: "bme", pin: "SDA" }], evidence: [], messageKey: "check.found", args: {} },
});

const view = (opened: 0 | 1 | 2 | 3 = 0, onOpen = vi.fn(), disabled = false) => {
  const utils = render(<HintLadder levels={levels} opened={opened} onOpen={onOpen} disabled={disabled} messages={messages} lang="en" />);
  return { onOpen, ...utils };
};

const open = () => screen.queryAllByRole("button", { name: messages.hint.open }) as HTMLButtonElement[];

describe("HintLadder", () => {
  it("enables only level 1 at the start and says why the others wait, in text", () => {
    view();
    expect(open().map((b) => b.disabled)).toEqual([false, true, true]);
    expect(screen.getAllByText(messages.hint.locked)).toHaveLength(2);
  });

  it("reports the level that was pressed", () => {
    const { onOpen } = view();
    fireEvent.click(open()[0]!);
    expect(onOpen).toHaveBeenCalledWith(1);
  });

  it("opens level 2 only after level 1, and keeps level 1 visible", () => {
    view(1);
    expect(within(screen.getByRole("list")).getByText("Look at the bus.")).toBeTruthy();
    expect(open().map((b) => b.disabled)).toEqual([false, true]);
  });

  it("does nothing when level 3 is pressed first", () => {
    const { onOpen } = view();
    fireEvent.click(open()[2]!);
    expect(onOpen).not.toHaveBeenCalled();
  });

  it("marks only the generated levels", () => {
    view(3);
    expect(screen.getAllByText(messages.hint.generated)).toHaveLength(1);
    expect(within(screen.getByRole("list")).getByText("Check what pin SDA of bme is connected to.")).toBeTruthy();
    expect(open()).toHaveLength(0);
  });

  it("announces the newest opened level once, in a polite region", () => {
    view(2);
    const region = screen.getByRole("status");
    expect(region.getAttribute("aria-live")).toBe("polite");
    expect(region.textContent).toBe("Measure the lines.");
  });

  it("is empty of announcements before anything is opened", () => {
    view();
    expect(screen.getByRole("status").textContent).toBe("");
  });

  it("uses native buttons in reading order, so Tab, Enter and Space work", () => {
    view();
    const buttons = open();
    expect(buttons.map((b) => b.tagName)).toEqual(["BUTTON", "BUTTON", "BUTTON"]);
    expect(buttons.map((b) => b.tabIndex)).toEqual([0, 0, 0]);
    buttons[0]!.focus();
    expect(document.activeElement).toBe(buttons[0]);
  });

  it("disables every button when the parent says so", () => {
    view(0, vi.fn(), true);
    expect(open().every((b) => b.disabled)).toBe(true);
  });

  it("labels the section and lists the three levels", () => {
    view();
    const list = within(screen.getByRole("region", { name: messages.hint.title })).getByRole("list");
    expect(within(list).getAllByRole("listitem")).toHaveLength(3);
  });
});
