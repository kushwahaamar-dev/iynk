# Provenance

Where the content of iynk came from, set by set. iynk started as a rebuild of three teaching sites: Learn Arduino,
Robotics Engineer and Drone Engineer. The code is written here. Some content follows those sites, and the repository has
no written permission from them. Nobody has yet decided whether each set is fine to keep, needs rewriting, or is our own,
so those rows say `unset`.

- `status` is `cleared` (permission or a free source exists), `rewrite-needed`, `own`, or `unset` (not decided).
- `decided by` is the person who set the status, or `unset`.
- A row is open until its status is `cleared` or `own`. Run `npm run provenance:check` to list the open rows, and
  `npm run provenance:check -- --strict` to make them fail the run (exit 1). CI uses the first form until a publish date
  is set.
- To add a row, append it to the table. Write a literal pipe inside a cell as `\|`.

<!--provenance:start-->
| id | set | source | what was copied | how | status | decided by |
|---|---|---|---|---|---|---|
| P-01 | Lessons: 71 board lessons and their structure | Learn Arduino and Robotics Engineer (third-party sites) | The order and shape of the lessons. `README.md` and `shell.json` say the structure follows these sites. | Rewritten into our own JSON under `src/i18n/content/en/boards/`. Text overlap is not measured. | unset | unset |
| P-02 | Board timings | The three original sites | Timings the original lessons use, as the About page says ("facts, formulas, timings and lessons"). | Entered by hand in `src/content/boards/`. Which values match a datasheet and which only match the sites is not recorded. | unset | unset |
| P-03 | Pinouts, formulas and constants | Chip datasheets and the three original sites | Pinouts, formulas and constants. `README.md` says "facts ... not their code". | Typed from the figures. The split between datasheet facts and site-specific choices is not recorded. | unset | unset |
| P-04 | Drone calculator formulas and constants | Drone Engineer site | The calculator maths matches the original "formula for formula" (`src/lib/drone/calc.ts` header). Catalogue options for 13 crafts come from the original figure sources. | Read as data with a script (`src/lib/drone/__fixtures__/extract.py`), then written into `src/content/drones/`. | unset | unset |
| P-05 | 342 golden calculator references | Drone Engineer site | 342 builds (108 in `golden-a.json`, 234 in `golden-b.json`) read off the original site's own `calc()`, per the comment at `src/lib/drone/calc.test.ts:20-26`. | Taken from research notes, converted to JSON by `extract.py`, used only as test data. | unset | unset |
| P-06 | The three originals text | Learn Arduino, Robotics Engineer, Drone Engineer | The About page lede says iynk "reuses their facts, formulas, timings and lessons". Descriptions in `originals` of `shell.json` follow each site. | Written by us in six languages. Wording overlap is not measured. | unset | unset |
<!--provenance:end-->
