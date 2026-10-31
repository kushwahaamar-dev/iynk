import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Reveal } from "./Reveal";

let instances: StubObserver[] = [];

class StubObserver {
  disconnect = vi.fn();
  observe = vi.fn();
  unobserve = vi.fn();
  constructor(private callback: (entries: { isIntersecting: boolean }[]) => void) {
    instances.push(this);
  }
  fire(isIntersecting: boolean) {
    this.callback([{ isIntersecting }]);
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

describe("Reveal", () => {
  it("starts hidden, shows on intersect, disconnects and never hides again", () => {
    render(<Reveal>Section</Reveal>);
    const el = screen.getByText("Section");
    expect(el.className).toContain("opacity-0");

    act(() => instances[0].fire(false));
    expect(el.className).toContain("opacity-0");
    expect(instances[0].disconnect).not.toHaveBeenCalled();

    act(() => instances[0].fire(true));
    expect(el.className).toContain("opacity-100");
    expect(instances[0].disconnect).toHaveBeenCalled();

    act(() => instances[0].fire(false));
    expect(el.className).toContain("opacity-100");
  });

  it("renders visible at once when there is no IntersectionObserver", async () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    render(<Reveal>Section</Reveal>);
    await waitFor(() => expect(screen.getByText("Section").className).toContain("opacity-100"));
  });

  it("renders visible at once under reduced motion without observing", async () => {
    stubMotion(true);
    render(<Reveal>Section</Reveal>);
    await waitFor(() => expect(screen.getByText("Section").className).toContain("opacity-100"));
    expect(instances).toHaveLength(0);
  });

  it("renders the requested element and delay", () => {
    render(
      <Reveal as="li" delay={120}>
        Item
      </Reveal>,
    );
    const el = screen.getByText("Item");
    expect(el.tagName).toBe("LI");
    expect(el.style.transitionDelay).toBe("120ms");
  });
});
