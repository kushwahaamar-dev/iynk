# Requests from the architect

1. shell-app (package.json scripts): run `node scripts/gen-content-index.mjs` before `dev`, `build`, `typecheck`
   and `test` (e.g. `predev`, `prebuild`, `pretypecheck`, `pretest`), as D4 says; add `"content:check": "node
   scripts/gen-content-index.mjs --check"` and include it in `check`. Why: index.generated.ts must list every item
   module that exists, and `--check` catches wrong ids and missing text keys.

2. engine:bench (docs/FIGURES-BENCH.md §11): the example uses bench id `motor-driver` and module `tb6612`; the
   ids are `tb6612fng` (bench and module) and the bench's board is `nano` (src/content/ids.ts ROBOTICS). Practice
   tasks and their checks live in the content module (`RoboticsContent.tasks`, evaluated by the host on the run
   trace and on reported `state`); please drop `tasks[].check` from the figure format, or keep it as a figure-only
   hint, so there is one source. Why: one source of truth (S3) and server re-runs (D14c).

3. platform (figures/tools/cfbuild.py): optionally inline `node scripts/gen-content-index.mjs --emit <lab>/<id>`
   as `SL.content` (JSON: `{lab, id, meta, data, en}`) so figure files can read ids, pins, part names and the
   palette from content instead of repeating them. Why: fewer duplicated ids between figure files and content.

4. engine:bench (docs/FIGURES-BENCH.md §13): please accept `set {variant: key}` (a key of the board's `variants`)
   and report `variant` in `state`; the board pages' variant switch sends it (`BoardVariant.figureVariant`). Until
   then the host reloads the iframe with `?variant=<key>`. Why: S12 variant switch for Uno R4, Pico, Pi 4/5.
