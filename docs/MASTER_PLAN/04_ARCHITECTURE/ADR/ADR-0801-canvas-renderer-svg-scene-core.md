# ADR-0801: The canvas is an SVG scene core behind a Renderer interface, with level of detail and culling from the first commit

Status: proposed, 2026-10-27; the renderer implementation stays open until the RS-01 device run (INCONCLUSIVE). Author: Studio editor design seat.
Upstream: D-011; audit P1; RS-01 report; R-053, BUD-01 to BUD-03. Downstream: F-076, F-080; STU-01, STU-02, STU-28. Spec: `03_PRODUCT/STUDIO_EDITOR.md`, STUDIO_EDITOR sections 5.1 and 5.4.

## Problem

A 500-part, 1,000-wire scene with illustrated art has about 47,000 SVG elements. Pan and zoom must stay under the frame budget on low-end devices (D-011).

## Constraints

1. p95 under 20 ms at 1x CPU for pan, drag, hover and zoom (BUD-01), 33 ms at 4x throttle or the miss is recorded.
2. React is for panes, not for the scene.
3. The renderer must be swappable (Canvas or WebGL) without touching tools.
4. Hit testing must give pins priority at 12 CSS px.

## Considered options

| Option | Summary | Verdict |
|---|---|---|
| `@xyflow/react` | Node-and-edge library | Rejected: 61.6 KB gzip beyond React, node-and-edge model, loose handles needed for pins on parts |
| React-reconciled SVG scene | Parts as React components | Rejected: frame time equal at 1x in RS-01, but every pan and zoom would pass through reconciliation |
| Naive full-redraw Canvas 2D | One canvas, redraw each frame | Rejected: worse in fit and zoom in RS-01 |
| Thin TypeScript scene core drawing SVG DOM behind `Renderer`, LOD and culling from the start | `mount`, `setViewport`, `draw`, `hitTest`, `hitRect`, `dispose` | **Chosen** (implementation open) |

## Decision

Build a thin scene core in TypeScript that draws SVG DOM behind a `Renderer` interface. Counting drawn art elements per frame is the budget, not parts. Three LOD levels (under 35 px outline only, 35 to 120 px generic fallback art, over 120 px full art) with 15 percent hysteresis, a uniform 50 mm grid index for culling and hit tests, and gesture mode that changes only one transform during a gesture. No displacement filter on the canvas.

## Technical justification

- The scene model and the renderer are separated, so Canvas or WebGL can replace SVG if the device run says so.
- LOD is the only variant in RS-01 that was a plausible candidate on weaker hardware.

## Performance data

VERIFIED, RS-01 (Apple M4 Pro, 500 parts, 1,000 wires, 47,097 elements). Headed Chromium 1x p95 pan-fit / zoom: plain SVG 25.8 / 25.0 ms, SVG with culling 25.2 / 25.0 ms, SVG with culling and LOD 10.6 / 10.7 ms, Canvas 2D full redraw 33.6 / 25.0 ms. 4x CPU throttle zoom p95: 42.4, 49.9, 34.1, 49.3 ms. DPR 2 zoom p95: 66.4, not run, 9.2, 25.1 ms. The RS-01 independent check says the full-art configuration is unlikely to pass on a real phone or Chromebook. No phone or Chromebook was measured: UNKNOWN. The 10,000-element starting budget and the 35 and 120 px thresholds are PROPOSAL, to be replaced by the harness sweep in section 14.2.

## Cost implications

Engineering: scene core, LOD, spatial index, test harness. No recurring cost. ESTIMATED part of the ST-1 slice.

## Licensing

No new runtime dependency for the scene core. `@xyflow/react` (MIT, EXTERNAL) is not used.

## Security implications

Part art is flat SVG without script, extracted at build time and referenced by `sha256`; the figure iframe (audit X3) is not an editor layer. Text in the scene is drawn as SVG text, never as markup from the document.

## Reversibility

High for the renderer (swap behind the interface, STU-01 test renderer runs every tool test); Medium for the LOD thresholds (measured numbers replace them).

## Migration plan

1. Land `Renderer`, a test renderer, and the SVG implementation. 2. Run the section 14.2 harness on Amar's devices. 3. Replace the proposed thresholds and element budget with the measured knee. 4. If gesture mode fails at 4x, apply the R-053 rule: fewer elements per part, then wires on one canvas layer.

## Known limitations

- Device results are missing (INCONCLUSIVE).
- Isometric extracted art may look wrong top-down; a few core parts may need redraws (Q-S1).
- Gesture mode is a HYPOTHESIS.
