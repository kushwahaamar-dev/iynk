import type { Messages } from "../../i18n/namespaces.ts";
import { PIN_RADIUS_MM } from "../engine/constants.ts";
import type { PartVisualState, PinLevel } from "../engine/part-state.ts";
import type { ArtElement, Overlay, RectMm, Scene } from "../engine/types.ts";

export type StateLabels = Messages["studioRun"]["overlay"];

const GLOW = "var(--studio-wire-yellow)";
const INK = "var(--studio-ink)";
const PAPER = "var(--studio-paper)";
const WARN = "var(--studio-warn)";
const TAG_SIZE_MM = 2;
const TAG_GAP_MM = 1.2;
const GLOW_GAP_MM = 1.5;
const GLOW_MIN_SW = 0.4;
const GLOW_SPAN_SW = 1.2;
const HALO_GAP_MM = 1.5;
const HALO_SW = 0.3;
const MARK_PAD_MM = 0.8;
const MARK_SW = 0.4;
const BADGE_MM = 2.4;
const BADGE_TEXT_MM = 1.8;
const BADGE_OFFSET_MM = PIN_RADIUS_MM + 0.6;

const fill = (template: string, values: Record<string, string>): string =>
  template.replace(/\{(\w+)\}/g, (whole, key: string) => values[key] ?? whole);

const percent = (n: number): string => String(Math.round(n * 100));

function tagOf(state: PartVisualState, labels: StateLabels): string {
  switch (state.kind) {
    case "led":
      if (!state.on) return labels.off;
      return state.duty < 1 ? fill(labels.duty, { percent: percent(state.duty) }) : labels.on;
    case "button":
      return state.pressed ? labels.pressed : labels.released;
    case "pot":
      return fill(labels.position, { percent: percent(state.position) });
    case "buzzer":
      return state.tone === null ? labels.silent : fill(labels.tone, { hz: String(Math.round(state.tone)) });
    case "none":
      return labels.notModelled;
  }
}

function glowOf(box: RectMm, duty: number, reduceMotion: boolean): ArtElement[] {
  const r = Math.max(box.x1 - box.x0, box.y1 - box.y0) / 2 + GLOW_GAP_MM;
  const ring: ArtElement = { t: "circle", cx: 0, cy: 0, r, fill: "none", stroke: GLOW, sw: GLOW_MIN_SW + GLOW_SPAN_SW * duty };
  if (reduceMotion) return [ring];
  return [{ t: "circle", cx: 0, cy: 0, r: r + HALO_GAP_MM, fill: "none", stroke: GLOW, sw: HALO_SW }, ring];
}

/**
 * The live layer of a run: a glow and a text tag for each lit LED, a text tag for every other modelled part, the
 * "not modelled yet" mark on a part with no model, and a 0 or 1 badge on each pin that has a level. Every item
 * carries text, so no state is shown by colour alone. With `reduceMotion` the glow loses its outer halo and keeps
 * the tag. Parts and pins that are not in `scene` (off screen, or in another view) get nothing.
 */
export function stateOverlays(
  scene: Scene,
  states: Map<string, PartVisualState>,
  pinLevels: Map<string, PinLevel>,
  opts: { reduceMotion: boolean; labels: StateLabels },
): Overlay[] {
  const overlays: Overlay[] = [];
  for (const { hit, bbox } of scene.targets) {
    if (hit.kind === "part") {
      const state = states.get(hit.c);
      if (!state) continue;
      const cx = (bbox.x0 + bbox.x1) / 2;
      const elements: ArtElement[] = [];
      if (state.kind === "led" && state.on) elements.push(...glowOf(bbox, state.duty, opts.reduceMotion));
      if (state.kind === "none") {
        elements.push({
          t: "rect",
          x: bbox.x0 - cx - MARK_PAD_MM,
          y: -(bbox.y1 - bbox.y0) / 2 - MARK_PAD_MM,
          w: bbox.x1 - bbox.x0 + 2 * MARK_PAD_MM,
          h: bbox.y1 - bbox.y0 + 2 * MARK_PAD_MM,
          rx: MARK_PAD_MM,
          fill: "none",
          stroke: WARN,
          sw: MARK_SW,
        });
      }
      const below = (bbox.y1 - bbox.y0) / 2 + TAG_GAP_MM + (state.kind === "led" && state.on ? GLOW_GAP_MM : 0) + TAG_SIZE_MM;
      elements.push({ t: "text", x: 0, y: below, s: tagOf(state, opts.labels), size: TAG_SIZE_MM, anchor: "middle" });
      overlays.push({ id: `state:${hit.c}`, xMm: cx, yMm: (bbox.y0 + bbox.y1) / 2, elements });
    } else if (hit.kind === "pin") {
      const level = pinLevels.get(`${hit.c}/${hit.p}`);
      if (level === undefined || level === null) continue;
      overlays.push({
        id: `level:${hit.c}/${hit.p}`,
        xMm: (bbox.x0 + bbox.x1) / 2,
        yMm: (bbox.y0 + bbox.y1) / 2,
        elements: [
          { t: "rect", x: BADGE_OFFSET_MM, y: -BADGE_OFFSET_MM - BADGE_MM, w: BADGE_MM, h: BADGE_MM, rx: 0.5, fill: PAPER, stroke: INK, sw: 0.2 },
          { t: "text", x: BADGE_OFFSET_MM + BADGE_MM / 2, y: -BADGE_OFFSET_MM - (BADGE_MM - BADGE_TEXT_MM) / 2 - 0.2, s: String(level), size: BADGE_TEXT_MM, anchor: "middle" },
        ],
      });
    }
  }
  return overlays;
}
