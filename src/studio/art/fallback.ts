import type { FallbackSpec } from "../../parts/fallback.ts";
import type { ArtElement, LodLevel } from "../engine/types.ts";

const INK = "var(--studio-ink)";
const PIN = "var(--studio-pin)";
const WARN = "var(--studio-warn)";
const BODY_SW = 0.25;
const PAD_RADIUS_MM = 0.8;
const PAD_SW = 0.15;
const HEADER_MM = 2.54;
const TERMINAL_W_MM = 4.4;
const TERMINAL_H_MM = 4.5;
const DASH_MM = 1;
const GAP_MM = 0.8;

type Pin = FallbackSpec["pins"][number];

const round = (n: number): number => Math.round(n * 1000) / 1000;

/** The spec is bottom-left with +y up; art is top-left with +y down. */
const artY = (spec: FallbackSpec, y: number): number => round(spec.body_mm.h - y);

function bodyRect(spec: FallbackSpec, rx: number): ArtElement {
  const { w, h } = spec.body_mm;
  return { t: "rect", x: 0, y: 0, w, h, rx, fill: spec.bodyColour ?? "var(--studio-body)", stroke: INK, sw: BODY_SW };
}

function dip(spec: FallbackSpec, lod: LodLevel): ArtElement[] {
  const mid = spec.body_mm.w / 2;
  const out = [bodyRect(spec, 0.3)];
  if (lod > 0) out.push({ t: "path", d: `M ${round(mid - 0.8)} 0 A 0.8 0.8 0 0 0 ${round(mid + 0.8)} 0`, stroke: INK, sw: BODY_SW });
  if (lod === 2) out.push({ t: "circle", cx: 0.9, cy: 0.9, r: 0.3, fill: INK });
  return out;
}

function headerModule(spec: FallbackSpec, lod: LodLevel): ArtElement[] {
  const { w, h } = spec.body_mm;
  const out = [bodyRect(spec, 0.5)];
  if (lod > 0) out.push({ t: "rect", x: 0, y: round(h - HEADER_MM), w, h: HEADER_MM, fill: PIN, stroke: INK, sw: BODY_SW });
  return out;
}

function terminalModule(spec: FallbackSpec, lod: LodLevel): ArtElement[] {
  const out = [bodyRect(spec, 0.5)];
  if (lod === 0) return out;
  const y = round(spec.body_mm.h - TERMINAL_H_MM);
  const x = (p: Pin): number => round(p.x_mm - TERMINAL_W_MM / 2);
  if (lod === 2) {
    return [...out, ...spec.pins.map((p): ArtElement => ({ t: "rect", x: x(p), y, w: TERMINAL_W_MM, h: TERMINAL_H_MM, rx: 0.4, fill: PIN, stroke: INK, sw: BODY_SW }))];
  }
  const d = spec.pins.map((p) => `M ${x(p)} ${y} h ${TERMINAL_W_MM} v ${TERMINAL_H_MM} h ${-TERMINAL_W_MM} Z`).join(" ");
  return d ? [...out, { t: "path", d, fill: PIN, stroke: INK, sw: BODY_SW }] : out;
}

function box(spec: FallbackSpec, lod: LodLevel): ArtElement[] {
  const out = [bodyRect(spec, 0.8)];
  if (lod === 2) out.push({ t: "circle", cx: round(spec.body_mm.w / 2), cy: 1, r: 0.4, fill: INK });
  return out;
}

function pinPads(spec: FallbackSpec): ArtElement[] {
  return spec.pins.map((p): ArtElement => ({ t: "circle", cx: round(p.x_mm), cy: artY(spec, p.y_mm), r: PAD_RADIUS_MM, stroke: INK, sw: PAD_SW }));
}

function sideOf(spec: FallbackSpec, p: Pin): NonNullable<Pin["side"]> {
  if (p.side) return p.side;
  const { w, h } = spec.body_mm;
  const y = artY(spec, p.y_mm);
  const horizontal = Math.min(p.x_mm, w - p.x_mm) <= Math.min(y, h - y);
  if (horizontal) return p.x_mm <= w / 2 ? "left" : "right";
  return y <= h / 2 ? "top" : "bottom";
}

/** Pin names sit just inside the body, on the side the pin is on. */
function pinLabel(spec: FallbackSpec, p: Pin): ArtElement {
  const size = 1;
  const x = round(p.x_mm);
  const y = artY(spec, p.y_mm);
  switch (sideOf(spec, p)) {
    case "left":
      return { t: "text", x: round(x + 1.2), y: round(y + size / 3), s: p.id, size, anchor: "start" };
    case "right":
      return { t: "text", x: round(x - 1.2), y: round(y + size / 3), s: p.id, size, anchor: "end" };
    case "top":
      return { t: "text", x, y: round(y + 2), s: p.id, size, anchor: "middle" };
    case "bottom":
      return { t: "text", x, y: round(y - 1.2), s: p.id, size, anchor: "middle" };
  }
}

/** The label is centred in the part of the body the header strip or terminal blocks leave free. */
function caption(spec: FallbackSpec): ArtElement {
  const { w, h } = spec.body_mm;
  const strip = spec.renderer === "generic-header-module" ? HEADER_MM : spec.renderer === "generic-terminal-module" ? TERMINAL_H_MM : 0;
  const size = Math.min(2, Math.max(1, h * 0.3));
  return { t: "text", x: round(w / 2), y: round((h - strip) / 2 + size / 3), s: spec.label, size, anchor: "middle" };
}

/**
 * Top-down art for a part drawn without figure art, in the part frame (origin top-left, mm). Level 0 is the body alone,
 * level 1 adds the renderer's mark in a few elements, level 2 adds pads, the label and, when the spec asks, the pin
 * names. The draw list paints the pin dots itself.
 */
export function fallbackArt(spec: FallbackSpec, lod: LodLevel): readonly ArtElement[] {
  let body: ArtElement[];
  switch (spec.renderer) {
    case "generic-two-lead":
      body = [bodyRect(spec, Math.min(spec.body_mm.h / 2, 1))];
      break;
    case "generic-dip":
      body = dip(spec, lod);
      break;
    case "generic-header-module":
      body = headerModule(spec, lod);
      break;
    case "generic-terminal-module":
      body = terminalModule(spec, lod);
      break;
    case "generic-box":
      body = box(spec, lod);
      break;
  }
  if (lod < 2) return body;
  return [...body, ...pinPads(spec), caption(spec), ...(spec.showPinLabels ? spec.pins.map((p) => pinLabel(spec, p)) : [])];
}

function dashedRect(w: number, h: number): string {
  const edge = (x: number, y: number, dx: number, dy: number, length: number): string => {
    const dashes: string[] = [];
    for (let at = 0; at < length; at += DASH_MM + GAP_MM) {
      const end = Math.min(at + DASH_MM, length);
      dashes.push(`M ${round(x + dx * at)} ${round(y + dy * at)} L ${round(x + dx * end)} ${round(y + dy * end)}`);
    }
    return dashes.join(" ");
  };
  return [edge(0, 0, 1, 0, w), edge(w, 0, 0, 1, h), edge(w, h, -1, 0, w), edge(0, h, 0, -1, h)].join(" ");
}

function questionMark(cx: number, cy: number, q: number): string {
  const at = (dx: number, dy: number): string => `${round(cx + dx * q)} ${round(cy + dy * q)}`;
  return [
    `M ${at(-1, -1.2)}`,
    `C ${at(-1, -2.8)} ${at(1, -2.8)} ${at(1, -1.2)}`,
    `C ${at(1, -0.2)} ${at(0, -0.2)} ${at(0, 0.8)}`,
    `M ${at(0, 1.8)} L ${at(0, 1.8)}`,
  ].join(" ");
}

/** The placeholder for a part whose definition is not known: a dashed box, a question mark drawn as a path, the label and the pads. */
export function unknownPartArt(spec: FallbackSpec, label: string): readonly ArtElement[] {
  const { w, h } = spec.body_mm;
  return [
    { t: "rect", x: 0, y: 0, w, h, rx: 0.8, fill: "var(--studio-paper)" },
    { t: "path", d: dashedRect(w, h), stroke: WARN, sw: BODY_SW },
    { t: "path", d: questionMark(w / 2, h / 2 - 0.6, Math.min(w, h) / 10), stroke: WARN, sw: 0.5 },
    { t: "text", x: round(w / 2), y: round(h - 1.4), s: label, size: Math.min(1.6, Math.max(1, h / 6)), anchor: "middle" },
    ...pinPads(spec),
  ];
}
