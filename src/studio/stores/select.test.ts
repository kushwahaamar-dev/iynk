import { describe, expect, it, vi } from "vitest";
import { createStore, shallowEqual } from "./select.ts";

describe("createStore", () => {
  it("notifies subscribers and stops after unsubscribe", () => {
    const store = createStore(1);
    const listener = vi.fn();
    const off = store.subscribe(listener);
    store.setState(2);
    off();
    store.setState(3);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.getState()).toBe(3);
  });

  it("keeps identity and stays quiet when the next state is the same value", () => {
    const initial = { n: 1 };
    const store = createStore(initial);
    const listener = vi.fn();
    store.subscribe(listener);
    store.setState(initial);
    store.setState((s) => s);
    expect(listener).not.toHaveBeenCalled();
    expect(store.getState()).toBe(initial);
  });

  it("does not call a listener that unsubscribed during the same notify", () => {
    const store = createStore(0);
    const second = vi.fn();
    let offSecond = () => {};
    store.subscribe(() => offSecond());
    offSecond = store.subscribe(second);
    store.setState(1);
    expect(second).not.toHaveBeenCalled();
  });
});

describe("shallowEqual", () => {
  it("compares own keys one level deep", () => {
    expect(shallowEqual({ a: 1, b: "x" }, { a: 1, b: "x" })).toBe(true);
    expect(shallowEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
    expect(shallowEqual({ a: [1] }, { a: [1] })).toBe(false);
    expect(shallowEqual(null, null)).toBe(true);
    expect(shallowEqual(null, { a: 1 })).toBe(false);
    expect(shallowEqual(NaN, NaN)).toBe(true);
  });
});
