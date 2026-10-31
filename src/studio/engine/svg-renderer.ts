import { GESTURE_SETTLE_MS, ZOOM_MAX, ZOOM_MIN } from "./constants.ts";
import type { ArtElement, DrawItem, DrawItemKind, Hit, HitTarget, RectMm, RectPx, Renderer, Scene, SceneDiff, Viewport } from "./types.ts";

const SVG_NS = "http://www.w3.org/2000/svg";

const LAYERS = ["grid", "surfaces", "parts", "wires", "air", "labels", "overlays", "interaction"] as const;
type Layer = (typeof LAYERS)[number];

const LAYER_OF: Record<DrawItemKind, Layer> = {
  surface: "surfaces",
  hole: "surfaces",
  part: "parts",
  wire: "wires",
  air: "air",
  label: "labels",
  overlay: "overlays",
};

/** The canvas stays a light paper plate in both themes (ADR-0850), so these come from the fixed tokens. */
const STUDIO_CSS = `
[data-iynk-renderer] {
  --studio-paper: var(--color-paper-fixed);
  --studio-ink: var(--color-ink-fixed);
  --studio-body: var(--color-mono-50);
  --studio-pin: var(--color-metal-d);
  --studio-warn: var(--color-tomato-m);
  --studio-wire-red: var(--color-tomato-m);
  --studio-wire-black: var(--color-ink-fixed);
  --studio-wire-orange: var(--color-mustard-m);
  --studio-wire-yellow: var(--color-mustard-l);
  --studio-wire-green: var(--color-mint-m);
  --studio-wire-blue: var(--color-cobalt-m);
  --studio-wire-white: var(--color-metal-l);
  --studio-wire-purple: var(--color-blush-m);
  --studio-wire-brown: var(--color-mono-600);
  --studio-wire-grey: var(--color-mono-500);
  display: block;
  width: 100%;
  height: 100%;
  background: var(--studio-paper);
  touch-action: none;
}
[data-iynk-renderer] * { pointer-events: none; }
[data-iynk-renderer] path, [data-iynk-renderer] circle { stroke-linecap: round; stroke-linejoin: round; }
[data-iynk-renderer] text { fill: var(--studio-ink); font-family: var(--font-mono, monospace); user-select: none; }
`;

type Entry = { node: SVGGElement; item: DrawItem; hidden: boolean };

function svgEl<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number | undefined> = {}): SVGElementTagNameMap[K] {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v !== undefined) el.setAttribute(k, String(v));
  return el;
}

function paint(el: SVGElement, e: { fill?: string; stroke?: string; sw?: number }, wire: boolean): void {
  el.setAttribute("fill", e.fill ?? "none");
  if (e.stroke) el.setAttribute("stroke", e.stroke);
  if (e.sw !== undefined) el.setAttribute("stroke-width", String(e.sw));
  if (wire) el.setAttribute("vector-effect", "non-scaling-stroke");
}

function elementNode(e: ArtElement, wire: boolean): SVGElement {
  switch (e.t) {
    case "path": {
      const el = svgEl("path", { d: e.d });
      paint(el, e, wire);
      return el;
    }
    case "rect": {
      const el = svgEl("rect", { x: e.x, y: e.y, width: e.w, height: e.h, rx: e.rx });
      paint(el, e, wire);
      return el;
    }
    case "circle": {
      const el = svgEl("circle", { cx: e.cx, cy: e.cy, r: e.r });
      paint(el, e, wire);
      return el;
    }
    case "ellipse": {
      const el = svgEl("ellipse", { cx: e.cx, cy: e.cy, rx: e.rx, ry: e.ry });
      paint(el, e, wire);
      return el;
    }
    case "text": {
      const el = svgEl("text", { x: e.x, y: e.y, "font-size": e.size ?? 2, "text-anchor": e.anchor });
      el.textContent = e.s;
      return el;
    }
  }
}

function itemNode(item: DrawItem): SVGGElement {
  const g = svgEl("g", { "data-id": item.id, "data-kind": item.kind, "data-lod": item.lod });
  const transform = [
    item.xMm !== 0 || item.yMm !== 0 ? `translate(${item.xMm} ${item.yMm})` : "",
    item.rotation !== 0 ? `rotate(${-item.rotation})` : "",
  ].filter(Boolean);
  if (transform.length > 0) g.setAttribute("transform", transform.join(" "));
  if (item.title) {
    const title = svgEl("title");
    title.textContent = item.title;
    g.append(title);
  }
  for (const e of item.elements) g.append(elementNode(e, item.kind === "wire"));
  return g;
}

const touches = (a: RectMm, b: RectMm): boolean => a.x0 <= b.x1 && a.x1 >= b.x0 && a.y0 <= b.y1 && a.y1 >= b.y0;
const inside = (inner: RectMm, outer: RectMm): boolean =>
  inner.x0 >= outer.x0 && inner.x1 <= outer.x1 && inner.y0 >= outer.y0 && inner.y1 <= outer.y1;

const SELECTABLE = new Set<Hit["kind"]>(["part", "wire", "label", "junction"]);

export function createSvgRenderer(opts: { onSettled?: () => void } = {}): Renderer {
  let svg: SVGSVGElement | null = null;
  let sceneGroup: SVGGElement | null = null;
  const layers = new Map<Layer, SVGGElement>();
  const entries = new Map<string, Entry>();
  const zOf = new WeakMap<Element, number>();
  let viewport: Viewport | null = null;
  let scene: Scene | null = null;
  let settleTimer: ReturnType<typeof setTimeout> | undefined;

  const mounted = (): SVGSVGElement => {
    if (!svg) throw new Error("renderer is not mounted");
    return svg;
  };

  const viewRect = (v: Viewport): RectMm => ({
    x0: v.cx_mm - v.w / v.k / 2,
    y0: v.cy_mm - v.h / v.k / 2,
    x1: v.cx_mm + v.w / v.k / 2,
    y1: v.cy_mm + v.h / v.k / 2,
  });

  const toMm = (v: Viewport, xPx: number, yPx: number) => ({ x: v.cx_mm + (xPx - v.w / 2) / v.k, y: v.cy_mm + (yPx - v.h / 2) / v.k });

  function place(entry: Entry): void {
    const layer = layers.get(LAYER_OF[entry.item.kind])!;
    zOf.set(entry.node, entry.item.z);
    let before: Element | null = null;
    for (let n = layer.lastElementChild; n && zOf.get(n)! > entry.item.z; n = n.previousElementSibling) before = n;
    layer.insertBefore(entry.node, before);
  }

  function syncVisibility(): void {
    if (!viewport) return;
    const rect = viewRect(viewport);
    for (const entry of entries.values()) {
      const hidden = entry.item.kind !== "overlay" && !touches(entry.item.bbox, rect);
      if (hidden === entry.hidden) continue;
      entry.hidden = hidden;
      if (hidden) entry.node.setAttribute("display", "none");
      else entry.node.removeAttribute("display");
    }
  }

  return {
    mount(el, o) {
      if (svg) throw new Error("renderer is already mounted");
      svg = svgEl("svg", { "data-iynk-renderer": "svg", "data-theme": o.theme, lang: o.locale });
      const style = svgEl("style");
      style.textContent = STUDIO_CSS;
      sceneGroup = svgEl("g", { "data-scene": "" });
      for (const name of LAYERS) {
        const layer = svgEl("g", { "data-layer": name });
        layers.set(name, layer);
        sceneGroup.append(layer);
      }
      svg.append(style, sceneGroup);
      el.append(svg);
    },

    setViewport(v) {
      const root = mounted();
      if (!(v.k >= ZOOM_MIN && v.k <= ZOOM_MAX)) throw new RangeError(`zoom ${v.k} is outside ${ZOOM_MIN}..${ZOOM_MAX}`);
      if (!viewport || viewport.w !== v.w || viewport.h !== v.h) root.setAttribute("viewBox", `0 0 ${v.w} ${v.h}`);
      sceneGroup!.setAttribute("transform", `translate(${v.w / 2 - v.cx_mm * v.k} ${v.h / 2 - v.cy_mm * v.k}) scale(${v.k})`);
      viewport = v;
      syncVisibility();
      clearTimeout(settleTimer);
      if (opts.onSettled) settleTimer = setTimeout(opts.onSettled, GESTURE_SETTLE_MS);
    },

    draw(next, diff: SceneDiff) {
      mounted();
      scene = next;
      const byId = new Map(next.items.map((i) => [i.id, i]));
      for (const id of diff.removed) {
        entries.get(id)?.node.remove();
        entries.delete(id);
      }
      for (const id of [...diff.changed, ...diff.added]) {
        const item = byId.get(id);
        if (!item) continue;
        entries.get(id)?.node.remove();
        const entry: Entry = { node: itemNode(item), item, hidden: false };
        entries.set(id, entry);
        place(entry);
      }
      if (diff.added.length > 0 || diff.changed.length > 0) syncVisibility();
    },

    hitTest(xPx, yPx, slopPx) {
      if (!viewport || !scene) return null;
      return scene.index.pick(toMm(viewport, xPx, yPx), slopPx / viewport.k);
    },

    hitRect(r: RectPx, mode) {
      if (!viewport || !scene) return [];
      const a = toMm(viewport, r.x0, r.y0);
      const b = toMm(viewport, r.x1, r.y1);
      const rect = { x0: Math.min(a.x, b.x), y0: Math.min(a.y, b.y), x1: Math.max(a.x, b.x), y1: Math.max(a.y, b.y) };
      const byItem = new Map<string, HitTarget[]>();
      for (const t of scene.targets) {
        if (!SELECTABLE.has(t.hit.kind)) continue;
        const list = byItem.get(t.item);
        if (list) list.push(t);
        else byItem.set(t.item, [t]);
      }
      const hits: Hit[] = [];
      for (const list of byItem.values()) {
        const ok = mode === "touch" ? list.some((t) => touches(t.bbox, rect)) : list.every((t) => inside(t.bbox, rect));
        if (ok) hits.push(list[0]!.hit);
      }
      return hits;
    },

    dispose() {
      clearTimeout(settleTimer);
      svg?.remove();
      svg = null;
      sceneGroup = null;
      layers.clear();
      entries.clear();
      viewport = null;
      scene = null;
    },
  };
}
