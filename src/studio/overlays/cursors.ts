import type { ArtElement, Overlay, Viewport } from "../engine/types.ts";

export type CursorSource = {
  getSnapshot(): {
    me: { m: number } | null;
    members: readonly { m: number; name: string; color: string }[];
    cursors: ReadonlyMap<number, { m: number; view: string; x_mm: number; y_mm: number; at: number }>;
  };
  subscribe(fn: () => void): () => void;
};

const STALE_MS = 3000;
const PAPER = "var(--studio-paper)";
const ARROW_PX = 14;
const TEXT_PX = 11;
const LABEL_X_PX = 12;
const LABEL_Y_PX = 18;
const LABEL_PAD_PX = 3;
const GLYPH_WIDTH = 0.6;

/** Arrow with its tip at the origin, `px` high, in the units of `scale` (mm per screen pixel). */
function arrow(px: number, scale: number, color: string): ArtElement {
  const h = px * scale;
  const w = h * 0.7;
  return { t: "path", d: `M0 0L0 ${h}L${w * 0.3} ${h * 0.75}L${w * 0.55} ${h * 1.05}L${w * 0.75} ${h * 0.95}L${w * 0.5} ${h * 0.65}L${w} ${h * 0.6}Z`, fill: color, stroke: PAPER, sw: scale };
}

/**
 * The other members' pointers on the active view. A pointer is stored in millimetres, so it stays on its part
 * through any pan and zoom; the glyph and the name keep one size on screen (`1 / viewport.k` mm per pixel). A pointer
 * that has not moved for three seconds is not drawn.
 */
export function cursorsProvider(source: CursorSource, now: () => number): (ctx: { viewport: Viewport; viewId: string }) => Overlay[] {
  return ({ viewport, viewId }) => {
    const { me, members, cursors } = source.getSnapshot();
    const t = now();
    const scale = 1 / viewport.k;
    const out: Overlay[] = [];
    for (const c of cursors.values()) {
      if (c.m === me?.m || c.view !== viewId || t - c.at > STALE_MS) continue;
      const member = members.find((m) => m.m === c.m);
      if (!member) continue;
      const size = TEXT_PX * scale;
      const pad = LABEL_PAD_PX * scale;
      const x = LABEL_X_PX * scale;
      const y = LABEL_Y_PX * scale;
      out.push({
        id: `cursor:${c.m}`,
        xMm: c.x_mm,
        yMm: c.y_mm,
        elements: [
          arrow(ARROW_PX, scale, member.color),
          { t: "rect", x: x - pad, y: y - size - pad / 2, w: member.name.length * size * GLYPH_WIDTH + 2 * pad, h: size + pad, rx: pad, fill: PAPER, stroke: member.color, sw: scale },
          { t: "text", x, y, s: member.name, size, anchor: "start" },
        ],
      });
    }
    return out;
  };
}
