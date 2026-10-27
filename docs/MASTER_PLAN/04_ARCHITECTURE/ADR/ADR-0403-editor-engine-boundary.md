# ADR-0403: An imperative editor engine behind an interface, fed by a pure DrawList

Status: proposed, 2026-10-27, revised after review the same day. Author: frontend and backend architecture seat.
Upstream: RS-01 (INCONCLUSIVE), BUD-01 to BUD-04, P1, ADR-0101. Downstream: F-079 to F-082, R-053, R-074. Spec: FRONTEND_ARCHITECTURE section 7.

## Problem

A full-detail 500-part scene is 47,097 SVG elements; plain SVG and React SVG miss p95 20 ms in fit and zoom on the best machine tested, and fail at 4x throttle. Canvas 2D as built was worse. No phone or Chromebook was tested.

## Constraints

1. Views store millimetres and ids only (ADR-0101); no renderer detail may leak into the document.
2. The renderer must be replaceable without touching tools, stores or the document.
3. Idle cost under 5 percent of a core (BUD-04): no free-running frame loop.
4. A keyboard path for every pointer action (R-058).
5. The hand-drawn SVG filter is not applied to canvas parts (RS-01 caveat).

## Considered options

| Option | Summary | Verdict |
|---|---|---|
| A. React components per part (`@xyflow/react`) | 131 KB gzip with React in the spike; not measured at 500 nodes | Rejected: bundle cost and per-element reconciliation |
| B. Custom SVG core with LOD and culling | 1.6 KB gzip in the spike; LOD gave p95 10 ms on one laptop | **Chosen as the first renderer** |
| C. Canvas 2D or WebGL | Cached bitmaps or Pixi | Held in reserve behind the same interface; naive Canvas measured worse |

## Decision

1. `EditorEngine` is an imperative class in `src/studio/engine/`; React renders chrome only.
2. `buildDrawList(state, view, viewport, quality)` is pure and testable; renderers consume the list.
3. The engine reads the document and the session, never writes; it emits intents.
4. LOD and culling are on from the start; the drawn-element budget is set from the harness curve (initial HYPOTHESIS 10,000).
5. RS-01 is re-run on a phone and a Chromebook when Amar has them; pass under 20 ms, fail trigger over 33 ms.

## Technical justification

React cannot reconcile tens of thousands of elements per pan frame, and what hurts is the drawn element count, not the part count (RS-01). A pure `DrawList` makes culling and level of detail testable without a browser and lets a second renderer consume the same list, so the open RS-01 question costs one file if it goes the wrong way.

## Performance data

RS-01 (INCONCLUSIVE, one M4 Pro laptop, no real device): plain SVG pan-fit p95 25.8 ms, zoom 25.0 ms at 1x; at 4x throttle p95 42 ms in zoom; at DPR 2 plain SVG p95 33.4 ms in pan and 66.4 ms in zoom. With LOD: 1x p95 10.3 to 10.7 ms in all five interactions, 4x under 20 ms except zoom (34.1 ms), DPR 2 p95 9.2 ms in pan, pan-fit and zoom, 6x still fails in zoom (58 ms). Canvas 2D as built: 33.6 ms p95 in pan-fit headed at 1x. WebKit desktop: svg-lod pan-fit 22 ms. LOD threshold of 12 CSS px is a HYPOTHESIS; RS-01 does not state one.

## Cost implications

No engine dependency. Own code: the DrawList builder and one SVG renderer (about a few hundred lines, ESTIMATED), plus a hit-test and a `FocusModel`. The harness from RS-01 is reused for the budget. A cached-bitmap renderer would be additional work only if the device re-run fails.

## Licensing

No third-party renderer is adopted, so none is added. The alternatives considered were `@xyflow/react` (MIT, EXTERNAL, not installed) and Pixi (MIT, EXTERNAL); neither is a dependency.

## Security implications

The engine never builds markup from document strings with `innerHTML`; part art comes from sanitised SVG or an `<img>` element, where scripts do not run (PROJECT_DATA_MODEL 13, SYSTEM 7.2). Hit testing and the focus model read the document and write nothing, so a hostile document cannot trigger an op through rendering. Avoiding `innerHTML` per frame also closes the P1 suspect (`figures/vendor/colorfigures/core.js:480`).

## Reversibility

High. Reversal cost of the renderer is one file; the document stores millimetres and ids only.

## Migration plan

New code; nothing in the legacy labs changes. Figures stay as part art through their bridge (A6). FE-3 builds the SVG renderer and the harness; RS-01 is re-run on devices as soon as hardware exists, and the result decides whether a Canvas renderer is built.

## Known limitations

- RS-01 is INCONCLUSIVE: the exit condition names a mid-range phone and a school-grade Chromebook, and neither was available.
- The 4x zoom miss (34.1 ms), the DPR 2 results beyond pan, and WebKit's 22 ms pan-fit with LOD are known misses or near-misses.
- CPU throttling does not model GPU, memory or thermal limits.
- The drawn-element budget (10,000) has no data between 0 and 47,097.
