import { act, render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import uno from "@/content/boards/uno-r3";
import prose from "@/i18n/content/en/boards/uno-r3.json";
import boardlab from "@/i18n/messages/en/boardlab.json";
import { createBoardLabStore, initialState } from "@/lib/boardlab/store";
import { ChecksPanel } from "./ChecksPanel";
import { BoardLabText } from "./text";

const blink = uno.lessons.find((l) => l.id === "blink")!;

function setup() {
  const store = createBoardLabStore(initialState({ board: "uno-r3", lesson: "blink", language: "arduino-cpp" }));
  render(
    <BoardLabText locale="en" messages={boardlab} text={prose}>
      <ChecksPanel store={store} checks={blink.checks} onCheck={() => {}} done={false} />
    </BoardLabText>,
  );
  return store;
}

const passing = blink.checks.map(() => ({ ok: true }));

test("a run whose checks all pass on a working board passes the lesson", () => {
  const store = setup();
  act(() => store.dispatch({ type: "checks/result", results: passing }));
  expect(screen.getByRole("status").textContent).toBe(boardlab.checks.allPass);
});

// Break it → "LED with no resistor" burns LED1 out; the code still passes, the board doesn't.
test("with a Break it fault on, passing code doesn't pass the lesson and the panel says what to do", () => {
  const store = setup();
  act(() => store.dispatch({ type: "fault/trigger", id: "led-no-resistor" }));
  act(() => store.dispatch({ type: "checks/result", results: passing }));
  expect(screen.getByRole("status").textContent).toBe(boardlab.checks.faultOn);
});
