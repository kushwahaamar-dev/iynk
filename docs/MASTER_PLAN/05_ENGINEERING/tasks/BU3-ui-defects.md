# BU3 task packages: the defects the BU2 screen reviews left open

Written 2026-10-28 by the orchestrator from the BU2 results (`wf_09409038-9e1`). Same rules as `BU-ui-foundation.md` and
`/Users/amar/iynk-build/state/UI_RULES.md`. Branch `build/ui`. Each card fixes named defects in files only it owns, then shoots the
screens it changed (`KL NEXT_DIST_DIR=.next-<id> npx playwright test e2e/visual.spec.ts --grep "<screens>"`, no `UI_SHOTS=compare`), opens
those PNGs in full (not crops), and looks again until each one is good.

## Exit

| Field | Value |
|---|---|
| Exit | Every defect below is fixed and shown fixed in a screenshot; content, typecheck, lint, `ui:check`, the full vitest suite, a keyless build and the full keyless e2e suite pass; the gzip transferred budget of BU2 still holds (`node scripts/perf-budget.mjs` against a keyless `next start` on a port from 47000 to 47999: `/en` at most 436548, the blink lesson at most 642533). The gate opens every PNG the visual spec writes in full and writes one verdict line each; none is cheap, cramped, misaligned or generic. |

## Parallel groups

| Group | Tasks |
|---|---|
| G1 | BU3-01, BU3-02, BU3-03, BU3-04 (disjoint files, listed per card) |
| G2 | BU3-05 (gate) |

## Task cards

### T-BU3-01. Base components and shell

1. The Dialog focuses its close button on open, and the IconButton tooltip then draws over the first line of the dialog copy (keys dialog).
   Show the tooltip on hover and on keyboard focus (`:focus-visible`), not on programmatic focus at open.
2. `Tabs` phone grid wraps into rows of unequal width on the phone lesson and overview tabs: make the phone layout one scrolling row or
   an even grid, whichever reads better at 390 px with the six languages.
3. Toggles nested in a button group keep `rounded-lg` because `Button` has no class merge: give `Button` a way to sit in a group
   (a prop or a group context) with the correct inner radius (UI_RULES radius rule), without adding a dependency.
4. Hindi nav labels sit about 2 px high in the floating nav: fix the line box for `:lang(hi)` in the nav only.
5. The global 404 (outside the language layout) follows the system colour scheme, not the stored theme: apply the stored theme there the
   same way the language layout does (inline boot script allowed by D-022).
Owns: `src/components/ui/**`, `src/components/shell/**`, `src/app/global-not-found.tsx` (or wherever the global 404 lives), `src/styles/**`.

### T-BU3-02. Pages, catalogues, home figure, copy

1. Catalogue titles are title case ("Board Lab", "Robotics Lab", and the drones one): sentence case in all six languages
   (`src/i18n/messages/*/boardlab.json`, `robotics.json`, `dronelab.json` or wherever the catalogue titles live; change only those keys).
2. The robotics catalogue "Start here" group is one card in a three column grid, leaving two thirds of the row empty: lay out a group with
   fewer cards than columns so it does not read as unfinished (`src/components/catalogue/Catalogue.tsx`).
3. The index card grid's top rule is about 24 px off the page gutter: align it.
4. About page "How it works" cards have bare headings "a", "b", "c" that look like placeholders: give them real short headings (six languages).
5. Light theme home hero: the figure draws a black outline on a transparent plate, while dark fills beige. Make the light plate read as
   the figure's paper, as in dark (`src/components/home/HeroFigure.tsx`; do not edit generated figure HTML).
Owns: `src/components/catalogue/**`, `src/components/home/**`, `src/components/editorial/**`, `src/app/[lang]/about/**`,
`src/app/[lang]/(boards|robotics|drones)/page.tsx`, the message keys named above and the about namespace.

### T-BU3-03. Lab screens

1. The fly page course list marks the selected course with a one-sided left border bar (UI_RULES: no border on one side of a card): mark it
   with the surface step and `aria-current` or `aria-pressed`, as the nav marks the current page.
2. The bench figure toolbar (`src/components/figure/**`) still puts a segmented control beside a filled-looking "Exploded view" button and
   filled "See through" and "Labels" pills: one control family, as BU2 did for the lesson toolbar (commit 6e730ab).
3. The lesson picker select truncates "2. Blink an LED" on a phone while the header already shows the title: on phone show the lesson
   number and position only, or let the select shrink to its content.
Owns: `src/components/flight/**`, `src/components/dronelab/**`, `src/components/figure/**`, `src/components/boardlab/**`.

### T-BU3-04. Visual spec covers every screen

1. Add to the visual spec's screens: the localized and the global 404, each dock tab (partner, together, real), the room bar and chat in a
   room, the AI partner panel and the search panels (keyless: their not-set-up states are what a keyless run shows; that is fine).
2. Settings is captured mid-fade: wait for the panel's animations to finish before the shot (reuse the e2e helper that waits for finite
   animations).
Owns: `e2e/visual.spec.ts`, `e2e/support/visual.ts`.
Proof: the visual spec passes with the new screens, axe clean.

### T-BU3-05. Phase exit gate

Run the Exit row in full. Open every PNG of `test-results/ui-shots/` in full (scale a long page down rather than cropping it) and write one
verdict line each. A failed step is fixed with the smallest correct change, committed as "BU3 gate: <what>".
