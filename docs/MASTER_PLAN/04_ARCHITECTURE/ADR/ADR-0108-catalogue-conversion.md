# ADR-0108: The 38 catalogue items become 12 part descriptors and 140 projects, by a script, and the TypeScript content stays until parity

Status: proposed, 2026-10-27. Author: project-data-model seat.
Upstream: audit D1 ("the 38 catalogue items can be converted and become the first valid projects"), A1, A8; BRIEF 3.5 (preserve working code until a replacement is measurably better); R-032, R-139 to R-141, R-152; REF-3; F-077, F-084. Spec: PROJECT_DATA_MODEL 11.

## Problem

The content is 38 TypeScript modules (12 boards, 13 robotics benches, 13 drones) with text keys into six language files, closed id unions and circuits inside figure files. Studio needs them as projects and templates (D-014, phase LABS) without losing the 71 lessons, 461 checks, 106 bench faults and the six languages, and without rewriting working content by hand.

## Constraints

1. Preserve the working pages until the Studio version is measurably at least as good (R-152).
2. The converted projects must be valid, round-trip, and reproduce the old check verdicts (REF-3, R-141).
3. Board data belongs in part descriptors, not in every lesson project.
4. Third-party content provenance is unresolved (D-017, F-197); nothing may be silently published.
5. Robotics and drone specs own their domain data.

## Considered options

| Option | Summary | Verdict |
|---|---|---|
| A. Generate projects from the TypeScript content with a script, run in CI and at build; keep the TS modules as the source until parity gates pass, then retire them | Safe path | Chosen |
| B. Convert once and delete the TypeScript content | Clean | Rejected: no way back if a conversion is wrong; content authors lose the working source |
| C. Rewrite lessons by hand as projects | Highest quality | Rejected: 71 lessons and 31 tasks by hand; no regression oracle |
| D. Run old pages and Studio side by side permanently | No risk | Rejected: two sources of truth (D5) |

## Decision

1. One script, `catalogue-convert`, built on the existing `scripts/gen-content-index.mjs --emit <lab>/<id>` (which already writes `{meta, data, en}` per item) plus the other five languages from `src/i18n/content/<lang>/<lab>/<id>.json`.
2. Outputs: 12 board descriptors and the module and part descriptors (to the component spec), and 140 projects: 12 board tours, 71 lessons, 13 benches, 31 tasks, 13 crafts.
3. Types map as in PROJECT_DATA_MODEL 11.3. `Check`, `WorldModel` (inputs, events), `DeviceModel`, `BuildStep` and `StateCond` are reused as they are; `CodeTemplate` is split into a rendered source plus `guide.starter`; `TextKey` becomes inline six-language text.
4. Nets come from the figure circuit by the same union-find the figure uses, with holes recorded as layout (PROJECT_DATA_MODEL 11.4).
5. Leg, rail and hole names of the figure parts convert with rule C-LEG (PROJECT_DATA_MODEL 3.4): `+` to `PLUS`, `V+` to `VPLUS`, `+VS` to `PLUS_VS`, rails `T+`, `T-`, `B+`, `B-` to `RAIL_TP`, `RAIL_TN`, `RAIL_BP`, `RAIL_BN`, bare digits get a `P` prefix; the old spelling stays in the interface pin's `legacy` field, and a unit test converts every figure part and fails on a collision.
6. Items the converter cannot yet convert (bench circuits that need the figure engine, drone wiring without pins) are listed in a report with a reason and kept as legacy data in `domains.*` and `guide.legacyFigure`; none is dropped silently.
7. Each project starts with a `thirdParty` entry `unchecked`; publishing is blocked on F-197.
8. The TypeScript modules and figure files stay as the source of truth until a lab passes the parity gates, then that lab's content is generated from the projects instead.

## Technical justification

- VERIFIED by running the emit command on all 38 items: 71 lessons (57 with a figure circuit), 31 tasks, 461 checks across 9 of the 10 kinds, 101 parameter chips, 11 `DeviceModel` kinds all in use. These counts match the audit's catalogue figures.
- A prototype of the converter ran on the `button` lesson of the Uno R3 and produced a document that passes all five validation passes with 5 nets and no hole in any net, equal to a hand derivation (PROJECT_DATA_MODEL 11.4).
- Reusing the catalogue's types unchanged is what makes check parity testable: the same check engine, the same inputs.

## Performance data

Emit of all 38 items is 2.3 MB of JSON (VERIFIED). A converted lesson with six-language text is 32.9 KB canonical (VERIFIED, one lesson); text is 15.5 KB of it (the `guide` section, VERIFIED). Conversion time was not measured (UNKNOWN). The corpus of 140 projects is estimated at a few MB (ESTIMATED from one lesson, not run).

## Cost implications

Engineering: converter plus circuit extraction. ESTIMATED 2 to 3 person-weeks for the Board Lab path (57 circuits through one algorithm), and unknown extra for the 13 bench circuits that live in figure files with power-tree rules (UNKNOWN until the figure-engine harness is tried). No run-time cost.

## Licensing

The catalogue content copied from the three third-party sites must be checked or rewritten before the repository is published (D-017, F-197); the converter carries every such item into `provenance.thirdParty` as `unchecked`. Datasheet citations (`Source[]`) stay as references. Figure artwork is first-party hand-inked (audit); not converted.

## Security implications

The converter runs at build time on trusted repository files. Output goes through the same validators as any document. Hidden practice-task solutions are stored in `ext["x-iynk-solution"]` and excluded from exports and room snapshots by default.

## Reversibility

High while the TypeScript modules stay. The converter is deterministic, so a better version can regenerate all 140 projects. After retirement of the TS modules the projects become the source and reversal means a reverse converter (not planned).

## Migration plan

1. CORE: converter for Board Lab lessons with circuits; 3 examples checked in; corpus test (REF-3) green.
2. LABS: the rest of the Board Lab, then robotics benches (figure-engine harness), then crafts into `domains.drone`.
3. Parity gates per lab (R-141, R-152); retire a lab's page only when its gates pass.
4. One-time progress import (PROJECT_DATA_MODEL 11.6).

## Known limitations

- Comment translations inside starter code are lost (English only); recorded per project.
- 14 of 71 lessons have no figure circuit (bare board); they convert to a board-only project with no nets.
- Bench current models and power-tree rules are not netlist-derived until the solver (F-045) replaces them; they stay legacy data.
- Drone wiring has no pins, so craft projects have no nets and stay at the illustrative tier.
- Check parity is untested until the interpreter reads `nets`; the worked example proves structure, not behaviour.
- The component ids used for the other 11 boards are assumptions until the component spec defines them.
