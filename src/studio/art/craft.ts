export interface CraftGeometry {
  motors: ReadonlyArray<{ id: string; x_mm: number; y_mm: number; r_mm: number; spin: "cw" | "ccw"; clash: boolean }>;
  bodies: ReadonlyArray<{
    id: string;
    role: "frame" | "battery" | "camera" | "stack" | "other";
    x_mm: number;
    y_mm: number;
    w_mm: number;
    h_mm: number;
    rot_deg: number;
  }>;
  com_mm: readonly [number, number] | null;
}

export interface CraftStyle {
  palette: "tomato" | "mustard" | "mint" | "cobalt" | "blush";
  showThrust: boolean;
  showCom: boolean;
}

const INK = "var(--studio-ink)";
const WARN = "var(--studio-warn)";
const MIN_R_MM = 1;
const MAX_R_MM = 500;
const MARGIN = 0.1;
const MIN_SPAN_MM = 40;

const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));
const num = (n: number): string => (Math.round(n * 10) / 10).toFixed(1);

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/** The document frame is x forward, y left. The page puts forward up and left on the left. */
const pageX = (y_mm: number): number => -y_mm;
const pageY = (x_mm: number): number => -x_mm;

const BODY_FILL: Record<CraftGeometry["bodies"][number]["role"], (p: string) => string> = {
  frame: () => "var(--studio-body)",
  stack: () => "var(--studio-pin)",
  battery: (p) => `var(--color-${p}-m)`,
  camera: (p) => `var(--color-${p}-l)`,
  other: () => "var(--studio-body)",
};

interface Box {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

function extents(g: CraftGeometry): Box {
  const box: Box = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity };
  const grow = (x: number, y: number, hx: number, hy: number): void => {
    box.minX = Math.min(box.minX, pageX(y) - hy);
    box.maxX = Math.max(box.maxX, pageX(y) + hy);
    box.minY = Math.min(box.minY, pageY(x) - hx);
    box.maxY = Math.max(box.maxY, pageY(x) + hx);
  };
  for (const m of g.motors) {
    const r = clamp(m.r_mm, MIN_R_MM, MAX_R_MM);
    grow(m.x_mm, m.y_mm, r, r);
  }
  for (const b of g.bodies) {
    const a = (b.rot_deg * Math.PI) / 180;
    const c = Math.abs(Math.cos(a));
    const s = Math.abs(Math.sin(a));
    grow(b.x_mm, b.y_mm, (b.w_mm * c + b.h_mm * s) / 2, (b.w_mm * s + b.h_mm * c) / 2);
  }
  if (g.com_mm) grow(g.com_mm[0], g.com_mm[1], 0, 0);
  return box;
}

function viewBox(g: CraftGeometry): { x: number; y: number; w: number; h: number } {
  const box = extents(g);
  if (!Number.isFinite(box.minX)) return { x: -MIN_SPAN_MM / 2, y: -MIN_SPAN_MM / 2, w: MIN_SPAN_MM, h: MIN_SPAN_MM };
  const w = Math.max(box.maxX - box.minX, MIN_SPAN_MM);
  const h = Math.max(box.maxY - box.minY, MIN_SPAN_MM);
  const cx = (box.minX + box.maxX) / 2;
  const cy = (box.minY + box.maxY) / 2;
  const mw = w * (1 + 2 * MARGIN);
  const mh = h * (1 + 2 * MARGIN);
  return { x: cx - mw / 2, y: cy - mh / 2, w: mw, h: mh };
}

/**
 * Top-down picture of a build in millimetres, one SVG unit per mm, forward up the page. It emits only its own
 * elements, with no script and no reference outside the string.
 */
export function craftSvg(g: CraftGeometry, s: CraftStyle): string {
  const vb = viewBox(g);
  const sw = Math.max(Math.max(vb.w, vb.h) / 250, 0.3);
  const fs = Math.max(Math.max(vb.w, vb.h) / 28, 2);
  const hub = Math.max(sw * 2, 1.5);
  const out: string[] = [];

  for (const b of g.bodies) {
    const cx = pageX(b.y_mm);
    const cy = pageY(b.x_mm);
    out.push(
      `<rect class="body ${b.role}" data-id="${esc(b.id)}" x="${num(cx - b.h_mm / 2)}" y="${num(cy - b.w_mm / 2)}" width="${num(b.h_mm)}" height="${num(b.w_mm)}" rx="${num(sw * 2)}" transform="rotate(${num(-b.rot_deg)} ${num(cx)} ${num(cy)})" fill="${BODY_FILL[b.role](s.palette)}" stroke="${INK}" stroke-width="${num(sw)}"/>`,
    );
  }

  for (const m of g.motors) {
    out.push(`<line class="arm" x1="0.0" y1="0.0" x2="${num(pageX(m.y_mm))}" y2="${num(pageY(m.x_mm))}" stroke="${INK}" stroke-width="${num(sw * 3)}" stroke-linecap="round"/>`);
  }

  for (const m of g.motors) {
    const cx = num(pageX(m.y_mm));
    const cy = num(pageY(m.x_mm));
    const r = clamp(m.r_mm, MIN_R_MM, MAX_R_MM);
    const id = esc(m.id);
    const look = m.clash
      ? `fill="${WARN}" fill-opacity="0.2" stroke="${WARN}" stroke-width="${num(sw * 1.5)}" stroke-dasharray="${num(sw * 4)} ${num(sw * 3)}"`
      : `fill="var(--color-${s.palette}-l)" fill-opacity="0.35" stroke="${INK}" stroke-width="${num(sw)}"`;
    out.push(`<circle class="prop${m.clash ? " clash" : ""}" data-id="${id}" data-spin="${m.spin}" cx="${cx}" cy="${cy}" r="${num(r)}" ${look}/>`);
    out.push(`<circle class="motor" data-id="${id}" cx="${cx}" cy="${cy}" r="${num(hub)}" fill="${INK}"/>`);
    if (m.clash) {
      out.push(`<text class="clash-label" x="${cx}" y="${num(pageY(m.x_mm) - r - sw * 2)}" text-anchor="middle" font-size="${num(fs)}" fill="${WARN}">clash</text>`);
    }
    if (s.showThrust) {
      out.push(`<circle class="thrust" cx="${cx}" cy="${cy}" r="${num(Math.max(r / 4, hub * 2))}" fill="none" stroke="${INK}" stroke-width="${num(sw)}"/>`);
    }
  }

  if (s.showCom && g.com_mm) {
    const x = pageX(g.com_mm[1]);
    const y = pageY(g.com_mm[0]);
    const d = hub * 2;
    out.push(
      `<g class="com" stroke="${WARN}" stroke-width="${num(sw * 1.5)}" fill="none"><circle cx="${num(x)}" cy="${num(y)}" r="${num(d)}"/><path d="M ${num(x - d * 1.6)} ${num(y)} H ${num(x + d * 1.6)} M ${num(x)} ${num(y - d * 1.6)} V ${num(y + d * 1.6)}"/></g>`,
    );
  }

  if (g.motors.length === 0) {
    out.push(`<text class="empty" x="${num(vb.x + vb.w / 2)}" y="${num(vb.y + vb.h / 2)}" text-anchor="middle" font-size="${num(fs)}" fill="${INK}">no motors</text>`);
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${num(vb.x)} ${num(vb.y)} ${num(vb.w)} ${num(vb.h)}" role="img" font-family="inherit">${out.join("")}</svg>`;
}
