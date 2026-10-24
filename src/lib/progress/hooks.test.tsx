import { act, render, screen } from "@testing-library/react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { beforeEach, expect, test } from "vitest";
import { useCount, useDone } from "./hooks";
import { markDone } from "./progress";
import { STORAGE_KEY } from "./storage";

function Badge() {
  const { done, total } = useCount("board:uno-r3:lesson:", 16);
  const blink = useDone("board:uno-r3:lesson:blink");
  return (
    <p data-testid="badge">
      {done}/{total} {blink ? "blink done" : "blink open"}
    </p>
  );
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ v: 1, done: { "board:uno-r3:lesson:blink": true } }));
});

test("reads saved progress and follows markDone", () => {
  render(<Badge />);
  expect(screen.getByTestId("badge").textContent).toBe("1/16 blink done");
  act(() => markDone("board:uno-r3:lesson:button"));
  expect(screen.getByTestId("badge").textContent).toBe("2/16 blink done");
});

test("the server renders nothing saved and hydration adopts the saved state without a mismatch", async () => {
  const container = document.createElement("div");
  container.innerHTML = renderToString(<Badge />);
  expect(container.textContent).toBe("0/16 blink open");

  const errors: unknown[] = [];
  await act(async () => {
    hydrateRoot(container, <Badge />, { onRecoverableError: (error) => errors.push(error) });
  });
  expect(container.textContent).toBe("1/16 blink done");
  expect(errors).toEqual([]);
});
