import { checkPng, sanitizeSvg, svgToDataUrl } from "../../parts/art-sanitize.ts";
import type { ArtError } from "../../parts/art-sanitize.ts";
import type { ArtChoice, FallbackSpec } from "../../parts/fallback.ts";
import type { ArtElement, ArtProvider, ResolvedPartShape } from "../engine/types.ts";
import { ART_DATA } from "./data/art-data.ts";
import { fallbackArt, unknownPartArt } from "./fallback.ts";

/** The figure art of each definition that has some, by its key in `ART_DATA`. */
const FIGURE_OF: Readonly<Record<string, string>> = {
  "core.led-5mm": "led",
  "core.resistor": "resistor",
  "core.push-button-6mm": "push-button",
  "core.buzzer-piezo": "piezo-buzzer",
  "core.potentiometer-10k": "potentiometer",
  "core.uno-r3": "uno-r3",
};

const UNKNOWN_BOX_MM = 10.16;
const UNKNOWN_LABEL = "Unknown part";

const UNKNOWN_SPEC: FallbackSpec = {
  renderer: "generic-box",
  label: UNKNOWN_LABEL,
  showPinLabels: false,
  body_mm: { w: UNKNOWN_BOX_MM, h: UNKNOWN_BOX_MM },
  bounds_mm: { w: UNKNOWN_BOX_MM, h: UNKNOWN_BOX_MM },
  pins: [],
};

const round2 = (n: number): number => Math.round(n * 100) / 100;

/** The spec is bottom-left with +y up; the shape is top-left with +y down. */
export function shapeOfSpec(spec: FallbackSpec, known: boolean, mechanical: (pinId: string) => boolean): ResolvedPartShape {
  return {
    widthMm: spec.body_mm.w,
    heightMm: spec.body_mm.h,
    known,
    pins: spec.pins.map((p) => ({ id: p.id, xMm: p.x_mm, yMm: round2(spec.body_mm.h - p.y_mm), mechanical: mechanical(p.id) })),
  };
}

type AssetChoice = Extract<ArtChoice, { kind: "asset" }>;

const dataUrls = new Map<string, string>();

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

/** Checks the stored bytes again on every first read: an SVG is rebuilt by the sanitiser, a PNG must pass its header check. */
function assetSrc(choice: AssetChoice, bytes: Uint8Array): { ok: true; src: string } | { ok: false; error: ArtError } {
  const cached = dataUrls.get(choice.sha256);
  if (cached) return { ok: true, src: cached };
  let src: string;
  if (choice.mediaType === "image/svg+xml") {
    const clean = sanitizeSvg(new TextDecoder().decode(bytes));
    if (!clean.ok) return clean;
    src = svgToDataUrl(clean.svg);
  } else {
    const png = checkPng(bytes);
    if (!png.ok) return png;
    src = `data:image/png;base64,${toBase64(bytes)}`;
  }
  dataUrls.set(choice.sha256, src);
  return { ok: true, src };
}

/** Custom art reaches the page only as an `<img>` with a `data:` source, never as markup. */
export function assetImage(choice: AssetChoice, bytes: Uint8Array): { ok: true; img: HTMLImageElement } | { ok: false; error: ArtError } {
  const made = assetSrc(choice, bytes);
  if (!made.ok) return made;
  const img = document.createElement("img");
  img.alt = "";
  img.src = made.src;
  return { ok: true, img };
}

export function loadFigureArt(id: string): readonly ArtElement[] | null {
  return ART_DATA[id]?.elements ?? null;
}

/**
 * Figure art at the closest zoom in Illustrated mode, generated fallback art everywhere else. `deps.spec` gives the
 * fallback layout of a definition, or null when the definition is not known.
 */
export function createArtProvider(deps: { spec: (defRef: string) => FallbackSpec | null }): ArtProvider {
  return {
    get(defRef, lod, mode) {
      if (lod === 2 && mode === "illustrated") {
        const figure = FIGURE_OF[defRef];
        const art = figure === undefined ? null : loadFigureArt(figure);
        if (art) return art;
      }
      const spec = deps.spec(defRef);
      return spec ? fallbackArt(spec, lod) : unknownPartArt(UNKNOWN_SPEC, UNKNOWN_LABEL);
    },
  };
}
