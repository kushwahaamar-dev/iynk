import { act, render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import boardlab from "@/i18n/messages/en/boardlab.json";
import { createBoardLabStore, initialState } from "@/lib/boardlab/store";
import { FigureReadout } from "./FigureReadout";
import { BoardLabText } from "./text";

test("lists the solver's LEDs and leaves its motors, transistors and diodes out", () => {
  const store = createBoardLabStore(initialState({ board: "uno-r3", lesson: null, language: "arduino-cpp" }));
  render(
    <BoardLabText locale="en" messages={boardlab} text={{}}>
      <FigureReadout store={store} leds={[]} />
    </BoardLabText>,
  );
  act(() =>
    store.dispatch({
      type: "figure/state",
      state: {
        meas: {
          LED1: { kind: "led", state: "ok", i_mA: 9.84 },
          MOT1: { kind: "motor", state: "ok", i_mA: 194 },
          Q1: { kind: "npn", state: "ok" },
          DIO1: { kind: "diode", state: "off" },
        },
      },
    }),
  );
  const items = screen.getAllByRole("listitem");
  expect(items.map((li) => li.getAttribute("data-part"))).toEqual(["LED1"]);
  expect(items[0].textContent).toBe("LED1: lit, 9.8 mA");
});
