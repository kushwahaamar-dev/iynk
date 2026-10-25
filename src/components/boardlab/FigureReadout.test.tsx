import { act, render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import boardlab from "@/i18n/messages/en/boardlab.json";
import { createBoardLabStore, initialState, type BoardView } from "@/lib/boardlab/store";
import { FigureReadout } from "./FigureReadout";
import { BoardLabText } from "./text";

const LEDS = [{ id: "L", label: "L" }];

function setup(view: BoardView, state: Record<string, unknown>) {
  const store = createBoardLabStore(initialState({ board: "uno-r3", lesson: null, language: "arduino-cpp", view }));
  render(
    <BoardLabText locale="en" messages={boardlab} text={{}}>
      <FigureReadout store={store} leds={LEDS} />
    </BoardLabText>,
  );
  act(() => store.dispatch({ type: "figure/state", state }));
  return store;
}

const items = () => screen.queryAllByRole("listitem").map((li) => li.getAttribute("data-part") ?? li.getAttribute("data-led"));

test("lists the solver's LEDs and leaves its motors, transistors and diodes out", () => {
  setup("breadboard", {
    circuit: "blink",
    meas: {
      LED1: { kind: "led", state: "ok", i_mA: 9.84 },
      MOT1: { kind: "motor", state: "ok", i_mA: 194 },
      Q1: { kind: "npn", state: "ok" },
      DIO1: { kind: "diode", state: "off" },
    },
  });
  expect(items()).toEqual(["LED1"]);
  expect(screen.getByRole("listitem").textContent).toBe("LED1: lit, 9.8 mA");
});

// The solver reports 0 mA for a part once it is burnt; the figure's toast gives the current that burnt it.
test("a burnt LED reads burnt out, without a current", () => {
  setup("breadboard", { circuit: "blink", meas: { LED1: { kind: "led", state: "burnt", i_mA: 0 } } });
  expect(screen.getByRole("listitem").textContent).toBe("LED1: burnt out");
});

test("shows only the parts the current view draws", () => {
  const state = { circuit: "blink", leds: { L: 1 }, meas: { LED1: { kind: "led", state: "ok", i_mA: 9.8 } } };
  const store = setup("board", state);
  // The Board view draws the board without the breadboard.
  expect(items()).toEqual(["L"]);
  act(() => store.dispatch({ type: "view/set", view: "breadboard" }));
  expect(items()).toEqual(["L", "LED1"]);
  act(() => store.dispatch({ type: "view/set", view: "schematic" }));
  expect(items()).toEqual(["LED1"]);
  act(() => store.dispatch({ type: "view/set", view: "power" }));
  expect(items()).toEqual([]);
});

test("a figure with no circuit has no circuit parts to read, whatever its solver last measured", () => {
  setup("breadboard", { circuit: null, leds: { L: 0 }, meas: { LED1: { kind: "led", state: "ok", i_mA: 12.2 } } });
  expect(items()).toEqual(["L"]);
});
