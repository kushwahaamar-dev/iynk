import type { FallbackSpec } from "../../parts/fallback.ts";
import type { ArtElement, ArtProvider } from "../engine/types.ts";
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
  pins: [],
};

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
