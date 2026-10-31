import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import messages from "@/i18n/messages/en/studio.json";
import type { InputSpec } from "@/studio/run/inputs";
import { InputsDock } from "./InputsDock";

afterEach(cleanup);

beforeAll(() => {
  HTMLElement.prototype.setPointerCapture = () => {};
});

const button: InputSpec = { id: "in_b", component: "c", quantity: "button", control: { kind: "hold" }, min: 0, max: 1, step: 1, value: 0, label: "Button" };
const knob: InputSpec = { id: "in_k", component: "c", quantity: "level", control: { kind: "slider" }, min: 0, max: 100, step: 1, value: 10, label: "Knob" };

const dock = (specs: InputSpec[], onSet = vi.fn(), disabled = false) => {
  render(<InputsDock specs={specs} onSet={onSet} messages={messages} lang="en" disabled={disabled} />);
  return onSet;
};

describe("InputsDock", () => {
  it("sends max on pointer down and min on up", () => {
    const onSet = dock([button]);
    const b = screen.getByRole("button", { name: /Button/ });
    fireEvent.pointerDown(b, { pointerId: 1 });
    fireEvent.pointerUp(b);
    expect(onSet.mock.calls).toEqual([["in_b", 1], ["in_b", 0]]);
  });

  it("holds with Space", () => {
    const onSet = dock([button]);
    const b = screen.getByRole("button", { name: /Button/ });
    fireEvent.keyDown(b, { key: " " });
    fireEvent.keyUp(b, { key: " " });
    expect(onSet.mock.calls).toEqual([["in_b", 1], ["in_b", 0]]);
  });

  it("sends a slider change on the next frame", () => {
    vi.useFakeTimers();
    const onSet = dock([knob]);
    fireEvent.change(screen.getByRole("slider"), { target: { value: "40" } });
    fireEvent.change(screen.getByRole("slider"), { target: { value: "41" } });
    vi.advanceTimersByTime(40);
    vi.useRealTimers();
    expect(onSet.mock.calls).toEqual([["in_k", 41]]);
  });

  it("disables the controls before a run", () => {
    dock([button], vi.fn(), true);
    expect(screen.getByRole("button", { name: /Button/ }).hasAttribute("disabled")).toBe(true);
  });

  it("says when a lesson has no inputs", () => {
    dock([]);
    expect(screen.getByText(messages.lesson.inputs.empty)).toBeTruthy();
  });
});
