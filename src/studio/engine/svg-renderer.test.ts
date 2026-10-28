import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildDrawList } from "./draw-list.ts";
import { miniProject, resolveShape, stubArt, VIEW_ID } from "./testing/mini-scene.ts";
import { createSvgRenderer } from "./svg-renderer.ts";
import { createNullRenderer } from "./types.ts";
import type { Renderer, Scene, Viewport } from "./types.ts";

const VIEW: Viewport = { cx_mm: 90, cy_mm: 10, k: 4, w: 1000, h: 400, dpr: 1 };
const MOUNT = { locale: "en", theme: "light", reduceMotion: false } as const;

function scene(viewport = VIEW, state = miniProject(), prev: Scene | null = null) {
  return buildDrawList({
    state,
    viewId: VIEW_ID,
    viewport,
    art: stubArt,
    resolve: resolveShape,
    index: null,
    prev,
    mode: "illustrated",
    overlays: [],
  });
}

describe("createSvgRenderer", () => {
  let host: HTMLElement;
  let renderer: Renderer;

  beforeEach(() => {
    host = document.createElement("div");
    document.body.append(host);
    renderer = createSvgRenderer();
  });
  afterEach(() => {
    renderer.dispose();
    host.remove();
  });

  it("mounts one svg with the renderer marker and a group per layer", () => {
    renderer.mount(host, MOUNT);
    const svg = host.querySelector("svg")!;
    expect(svg.getAttribute("data-iynk-renderer")).toBe("svg");
    expect([...svg.querySelectorAll("[data-layer]")].map((g) => g.getAttribute("data-layer"))).toEqual([
      "grid",
      "surfaces",
      "parts",
      "wires",
      "air",
      "labels",
      "overlays",
      "interaction",
    ]);
  });

  it("draws the scene and sets one transform on the scene group", () => {
    renderer.mount(host, MOUNT);
    renderer.setViewport(VIEW);
    const { scene: s, diff } = scene();
    renderer.draw(s, diff);
    expect(host.querySelectorAll('[data-layer="parts"] > g')).toHaveLength(20);
    expect(host.querySelectorAll('[data-layer="wires"] > g')).toHaveLength(30);
    expect(host.querySelector("[data-scene]")!.getAttribute("transform")).toBe("translate(140 160) scale(4)");
    expect(host.querySelector("title")!.textContent).toBe("R1");
  });

  it("makes no DOM mutation for a second draw with an empty diff", () => {
    renderer.mount(host, MOUNT);
    renderer.setViewport(VIEW);
    const first = scene();
    renderer.draw(first.scene, first.diff);
    const second = scene(VIEW, miniProject(), first.scene);
    const seen: MutationRecord[] = [];
    const observer = new MutationObserver((r) => seen.push(...r));
    observer.observe(host, { subtree: true, childList: true, attributes: true, characterData: true });
    renderer.draw(second.scene, second.diff);
    expect(seen.concat(observer.takeRecords())).toHaveLength(0);
    observer.disconnect();
  });

  it("redraws only the changed node", () => {
    renderer.mount(host, MOUNT);
    renderer.setViewport(VIEW);
    const first = scene();
    renderer.draw(first.scene, first.diff);
    const untouched = host.querySelector('[data-id="cmp_5"]');
    const moved = miniProject();
    moved.views[0]!.placements[0]!.x_mm += 5;
    const next = scene(VIEW, moved, first.scene);
    renderer.draw(next.scene, next.diff);
    expect(host.querySelector('[data-id="cmp_5"]')).toBe(untouched);
    expect(host.querySelector('[data-id="cmp_0"]')!.getAttribute("transform")).toBe("translate(5 0)");
  });

  it("removes nodes for removed ids", () => {
    renderer.mount(host, MOUNT);
    renderer.setViewport(VIEW);
    const first = scene();
    renderer.draw(first.scene, first.diff);
    const fewer = scene(VIEW, miniProject(19, 30), first.scene);
    renderer.draw(fewer.scene, fewer.diff);
    expect(host.querySelector('[data-id="cmp_19"]')).toBeNull();
  });

  it("hides nodes outside the viewport with display none and shows them again", () => {
    renderer.mount(host, MOUNT);
    renderer.setViewport(VIEW);
    const { scene: s, diff } = scene();
    renderer.draw(s, diff);
    const node = host.querySelector('[data-id="cmp_9"]')!;
    expect(node.hasAttribute("display")).toBe(false);
    renderer.setViewport({ ...VIEW, cx_mm: -500 });
    expect(node.getAttribute("display")).toBe("none");
    renderer.setViewport(VIEW);
    expect(node.hasAttribute("display")).toBe(false);
  });

  it("never sets a filter and keeps wire strokes non-scaling", () => {
    renderer.mount(host, MOUNT);
    renderer.setViewport(VIEW);
    const { scene: s, diff } = scene();
    renderer.draw(s, diff);
    expect(host.querySelector("[filter]")).toBeNull();
    expect(host.innerHTML).not.toMatch(/filter/i);
    expect(host.querySelector('[data-kind="wire"] path')!.getAttribute("vector-effect")).toBe("non-scaling-stroke");
  });

  it("sets text with textContent", () => {
    renderer.mount(host, MOUNT);
    renderer.setViewport({ ...VIEW, k: 6 });
    const p = miniProject(1, 0);
    p.components[0]!.refdes = "<b>R1</b>";
    const { scene: s, diff } = scene({ ...VIEW, k: 6 }, p);
    renderer.draw(s, diff);
    expect(host.querySelector("b")).toBeNull();
    expect(host.querySelector("text")!.textContent).toBe("<b>R1</b>");
  });

  it("asserts the zoom range", () => {
    renderer.mount(host, MOUNT);
    expect(() => renderer.setViewport({ ...VIEW, k: 0.01 })).toThrow(RangeError);
    expect(() => renderer.setViewport({ ...VIEW, k: 100 })).toThrow(RangeError);
  });

  it("hit tests in pixels and selects by rectangle", () => {
    renderer.mount(host, MOUNT);
    renderer.setViewport(VIEW);
    const { scene: s, diff } = scene();
    renderer.draw(s, diff);
    const px = (mm: number) => 500 + (mm - 90) * 4;
    const py = (mm: number) => 200 + (mm - 10) * 4;
    expect(renderer.hitTest(px(0), py(1.5), 8)).toEqual({ kind: "pin", c: "cmp_0", p: "1" });
    expect(renderer.hitTest(px(5), py(0.5), 2)).toEqual({ kind: "part", c: "cmp_0" });
    expect(renderer.hitTest(0, 0, 2)).toBeNull();
    const touch = renderer.hitRect({ x0: px(-1), y0: py(-1), x1: px(5), y1: py(4) }, "touch");
    expect(touch).toContainEqual({ kind: "part", c: "cmp_0" });
    expect(touch.some((h) => h.kind === "pin")).toBe(false);
    expect(renderer.hitRect({ x0: px(-1), y0: py(-1), x1: px(5), y1: py(4) }, "inside")).toEqual([]);
    expect(renderer.hitRect({ x0: px(-1), y0: py(-1), x1: px(11), y1: py(4) }, "inside")).toEqual([{ kind: "part", c: "cmp_0" }]);
  });

  it("asks for a rebuild once the viewport has been quiet", () => {
    vi.useFakeTimers();
    try {
      const onSettled = vi.fn();
      const r = createSvgRenderer({ onSettled });
      r.mount(host, MOUNT);
      r.setViewport(VIEW);
      vi.advanceTimersByTime(60);
      r.setViewport({ ...VIEW, cx_mm: 91 });
      vi.advanceTimersByTime(60);
      expect(onSettled).not.toHaveBeenCalled();
      vi.advanceTimersByTime(60);
      expect(onSettled).toHaveBeenCalledTimes(1);
      r.dispose();
    } finally {
      vi.useRealTimers();
    }
  });

  it("removes all nodes on dispose", () => {
    renderer.mount(host, MOUNT);
    renderer.setViewport(VIEW);
    const { scene: s, diff } = scene();
    renderer.draw(s, diff);
    renderer.dispose();
    expect(host.childNodes).toHaveLength(0);
  });

  it("refuses to draw before mount", () => {
    const { scene: s, diff } = scene();
    expect(() => renderer.draw(s, diff)).toThrow(/not mounted/);
  });
});

describe("createNullRenderer", () => {
  it("has the six renderer methods and records every call", () => {
    const r = createNullRenderer();
    const el = document.createElement("div");
    const { scene: s, diff } = scene();
    r.mount(el, MOUNT);
    r.setViewport(VIEW);
    r.draw(s, diff);
    expect(r.hitTest(1, 2, 3)).toBeNull();
    expect(r.hitRect({ x0: 0, y0: 0, x1: 1, y1: 1 }, "touch")).toEqual([]);
    r.dispose();
    expect(r.calls.map((c) => c.method)).toEqual(["mount", "setViewport", "draw", "hitTest", "hitRect", "dispose"]);
  });
});
