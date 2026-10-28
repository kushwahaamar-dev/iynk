# BU2 task packages: finish the UI foundation before it merges

Written 2026-10-28 by the orchestrator after the BU run (`wf_986ef15d-2d1`). BU landed 57 of 59 tasks and its gate went green, but the
gate skipped steps 3 (ci-local), 5 (only 4 of 74 screenshots were opened), 6 (keyboard walk) and 10 (JS size), and T-BU-56 left
aliases behind. Amar asked for top-of-the-line UI, so BU is not done until those pass. Same rules as `BU-ui-foundation.md` (sections 1.1
proof commands, 1.2 design values, 1.5 screenshot check) and `/Users/amar/iynk-build/state/UI_RULES.md`. Branch `build/ui`.

## Exit

| Field | Value |
|---|---|
| Exit | Every step of T-BU-59 passes, run in full (none carried over): content, typecheck, lint, `ui:check`, keyless `npm run check`, keyless `bash scripts/ci-local.sh`, build, the keyboard walk, reduced motion, and every screenshot opened with a one-line verdict and no screen judged cheap, cramped, misaligned or generic. Gzip JS transferred for `/en` and the blink lesson is at most the B1 baseline plus 10 percent (`/en` 396862, lesson 584121 bytes, from `budgets.json`), measured with `scripts/bundle-report.mjs` on a keyless build. T-BU-56's greps print nothing. |

## Parallel groups

| Group | Tasks | Why |
|---|---|---|
| G1 | BU2-01, BU2-03 | Disjoint files: the icon set, and the alias removal plus the visual spec. |
| G2 | BU2-02 | Measures after the icon change. |
| G3 | BU2-04, BU2-05, BU2-06 | Screen review by area; disjoint folders (ownership below). |
| G4 | BU2-07 | The gate. |

## Task cards

### T-BU2-01. Regular-weight icon set, generated

Problem: `src/components/ui/icons.tsx` imports 55 icons from `@phosphor-icons/react/dist/ssr/<Name>`. Each one pulls `dist/defs/<Name>.es.js`,
which holds all six weights; the 55 defs are 53,463 bytes gzipped one by one, and the app uses only `regular` (UI_RULES, BU section 1.2).
This is most of the 72.7 KB growth on `/en` and the lesson.

Do: add `scripts/gen-icons.mjs` that reads the icon list (one exported constant, the name to Phosphor glyph map that `icons.tsx` already
has), loads each glyph's regular weight from the installed `@phosphor-icons/react` defs (or from `@phosphor-icons/core` if you add it as a
devDependency), and writes `src/components/ui/icon-paths.generated.ts` with only the regular SVG children per name. `Icon` renders one
`<svg viewBox="0 0 256 256" fill="currentColor" aria-hidden>` with those children and keeps its public API (name, size, label). Move
`@phosphor-icons/react` to devDependencies if nothing else imports it at run time. Narrow the `size` type to the sizes in use (the
T-BU-58 narrowing that waited on T-BU-56; `icons.test.tsx:98` uses 18, check every call site with grep first). Add `npm run icons` and a
test that the generated file is current (run the generator into a temp path and compare). Keep the missing-glyph test.
Files: `scripts/gen-icons.mjs`, `src/components/ui/icons.tsx`, `src/components/ui/icon-paths.generated.ts`, `src/components/ui/icons.test.tsx`,
`package.json` (and the lockfile).
Proof: typecheck, lint, `npx vitest run src/components/ui`, `npm run ui:check`, a keyless build and `node scripts/bundle-report.mjs` before
and after (report both numbers for `/en` and the blink lesson).

### T-BU2-03. Finish T-BU-56: last aliases; visual spec shows the figures

Do: remove the Button `"ink"` variant (`Button.tsx:12`, its test at `Button.test.tsx:56`; `dronelab/WiringPanel.tsx:51` uses it through a
ternary: use `solid`). Remove the `--color-line` alias (`tokens.css:77`) and its test line. Run every grep of the T-BU-56 card and the
second grep of T-BU-59 step 8; each must print nothing (domain tone names like `tone: "ink"` in `StatusPanel.tsx`, `Stat.tsx`, `Chip.tsx`
and `Callout` are component props, not the removed classes: keep them unless the card's grep names them). In `e2e/visual.spec.ts` mask the
iframes only when `UI_SHOTS=compare` (baselines need it; a person reviewing must see the figures framed). Do not touch `icons.tsx`
(T-BU2-01 owns it).
Files: `src/components/ui/Button.tsx`, `src/components/ui/Button.test.tsx`, `src/components/dronelab/WiringPanel.tsx`, `src/styles/tokens.css`,
`src/styles/tokens.test.ts`, `e2e/visual.spec.ts`.
Proof: typecheck, lint, `npx vitest run src/components/ui src/styles`, `npm run ui:check`, the greps.

### T-BU2-02. JS size back within budget

Measure first: keyless build, `node scripts/bundle-report.mjs`, compare `/en` and the blink lesson with the B1 baseline (`budgets.json`,
`/en` 396862, lesson 584121 gzip transferred). Find what grew since `73a4321` (B1's end) by chunk: the command menu, settings, keys dialog,
home sections, motion helpers. Fix the causes, not the budget: load the command menu body, the settings panel and the keys dialog on first
open (`next/dynamic` or `React.lazy` with a skeleton shaped like the panel); keep home sections server components unless a section needs
state (the tagline reveal may be the only client island); no library pulled into the shared layout for one screen. Target: both pages at
most the baseline plus 10 percent; report the numbers. If a cause cannot be fixed without breaking a feature, say which and by how much.
Files: what the measurement points to, at most 5 source files plus tests; list them in the commit message.
Proof: typecheck, lint, the vitest files of what you changed, keyless build plus bundle-report before and after, and the e2e specs of the
screens you changed (`shell`, `home`, `ship`, `states`).

### T-BU2-04. Screen review A: home, pages and shell

Screens: home in en, de, hi; about; privacy; the localized and global 404; boards, robotics and drones catalogues; together; the nav, mobile
menu, footer, command menu, settings and keys dialog. Run `KL NEXT_DIST_DIR=.next-T-BU2-04 npx playwright test e2e/visual.spec.ts --grep
"<these screens>"` (no `UI_SHOTS=compare`, so figures show), open every PNG it writes for these screens at both sizes and both themes,
and judge each against UI_RULES and both skills (Part A for the home page; the redesign audit's checklist for the rest). Write one line per
PNG: good, or the defect (cheap, cramped, misaligned, generic, weak hierarchy, low contrast, overflow at 390, inconsistent control styles in
one row, orphaned words in headings, empty space that reads as unfinished). Fix every defect, re-shoot, look again. Then run the keyboard
walk of T-BU-59 step 6 on `/en`.
Owns: `src/components/ui/**`, `src/components/shell/**`, `src/components/home/**`, `src/components/editorial/**`,
`src/components/catalogue/**`, `src/components/settings/**`, `src/app/[lang]/**` pages other than lab routes, `src/styles/**`, home and
common messages in `src/i18n/messages/*`. Do not edit lab component folders (B and C own them).
Proof: typecheck, lint, `npm run ui:check`, vitest for what changed, `e2e/shell.spec.ts`, `e2e/home.spec.ts`, `e2e/ship.spec.ts`, the
visual spec for these screens; return the verdict list.

### T-BU2-05. Screen review B: board lab

Screens: a board page, the blink lesson, the dock (every tab: serial, checks, break it, quiz, parameters, lab tools), the code editor, the
pinout and the power tree, at both sizes and both themes. Same method as T-BU2-04 (shoot without the mask, open every PNG, one line each,
fix, re-shoot). Known from the orchestrator's look at the gate shots: the lesson toolbar mixes a segmented control with heavy filled buttons
("Exploded view", "See through") and icon buttons in one row; make one row read as one control family (segmented for views, quiet
toggles for modes) using the existing base components. Then the keyboard walk on the lesson.
Owns: `src/components/boardlab/**`, `src/components/dock/**`, `src/components/hw/**`, `src/components/figure/**`, board lab messages. Use the
base components as they are; if one needs a change, describe it in notes for T-BU2-04's owner instead of editing it.
Proof: typecheck, lint, `npm run ui:check`, vitest for what changed, `e2e/boardlab.spec.ts`, `e2e/dock.spec.ts`, `e2e/dock.phone.spec.ts`,
the visual spec for these screens; return the verdict list.

### T-BU2-06. Screen review C: robotics, drones, flight, together

Screens: a robotics bench, a drone build, the fly page with its courses and break-it panel, the flight range, the together room bar and chat,
the AI partner panel and the search panels, at both sizes and both themes. Same method as T-BU2-04. Known: the fly toolbar puts filled
black buttons next to an accent button and plain text links ("Gamepad", "Controls"); give the row one family.
Owns: `src/components/robotics/**`, `src/components/dronelab/**`, `src/components/flight/**`, `src/components/realtime/**`,
`src/components/ai/**`, `src/components/search/**`, their messages. Same rule for base components as T-BU2-05.
Proof: typecheck, lint, `npm run ui:check`, vitest for what changed, `e2e/robotics.spec.ts`, `e2e/dronelab.spec.ts`, `e2e/fly.spec.ts`,
`e2e/room.spec.ts`, the visual spec for these screens; return the verdict list.

### T-BU2-07. Phase exit gate (no file changes unless a proof fails)

Run T-BU-59 in full on `build/ui`, every step, nothing carried over, plus the bundle check of the Exit row above. Step 5: open every PNG the
visual spec writes (run it without `compare`) and write the verdict list. A failed step is fixed with the smallest correct change and
committed as "BU2 gate: <what>".
