import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { TaglineReveal } from "./TaglineReveal";

let instances: StubObserver[] = [];

class StubObserver {
  disconnect = vi.fn();
  observe = vi.fn();
  unobserve = vi.fn();
  constructor(private callback: (entries: unknown[]) => void) {
    instances.push(this);
  }
  cross(targets: Element[]) {
    this.callback(targets.map((target) => ({ target, isIntersecting: true, boundingClientRect: { top: 0 } })));
  }
}

function stubMotion(reduce: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: reduce && query.includes("reduce"), media: query }));
}

beforeEach(() => {
  instances = [];
  stubMotion(false);
  vi.stubGlobal("IntersectionObserver", StubObserver);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const lit = (container: HTMLElement) => Array.from(container.querySelectorAll('[data-lit="true"]')).map((el) => el.textContent);

test("reads as one sentence and starts unlit", () => {
  const { container } = render(<TaglineReveal text="One two three four." locale="en" />);
  expect(container.querySelector("p")?.textContent).toBe("One two three four.");
  expect(container.querySelectorAll("[data-word]")).toHaveLength(4);
  expect(lit(container)).toEqual([]);
});

test("lights words as they cross the line, keeps them lit and disconnects at the end", () => {
  const { container } = render(<TaglineReveal text="One two three four." locale="en" />);
  const spans = Array.from(container.querySelectorAll("[data-word]"));
  const observer = instances[0];
  expect(observer.observe).toHaveBeenCalledTimes(4);

  act(() => observer.cross(spans.slice(0, 3)));
  expect(lit(container)).toEqual(["One", "two", "three"]);
  expect(observer.disconnect).not.toHaveBeenCalled();

  act(() => observer.cross(spans.slice(3)));
  expect(lit(container)).toEqual(["One", "two", "three", "four."]);
  expect(observer.disconnect).toHaveBeenCalled();
});

test("reduced motion renders every word lit", async () => {
  stubMotion(true);
  const { container } = render(<TaglineReveal text="One two three." locale="en" />);
  await vi.waitFor(() => expect(lit(container)).toHaveLength(3));
  expect(instances).toHaveLength(0);
});
