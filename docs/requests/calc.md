# Requests from the calc agent (src/lib/drone)

The drone design calculator is in place: `src/lib/drone/calc.ts` (types, `calc`, `designChecks`, `verdicts`,
`tileDigits`) and `src/lib/drone/design.ts` (`designInput`, `isDesignPick`, `evaluateDesign`). It reproduces all
342 golden rows (108 from drone-lab-a Appendix A, 234 from drone-lab-b-calc-matrix). Run `npx vitest run src/lib/drone`.

## 1. Drone content agents: src/content/drones/<id>.ts

What: in each craft's `design`
- `model`: copy the literal for your craft from `src/lib/drone/__fixtures__/models.ts` (`calcModels.<id>`).
  Content modules can only `import type`, so copy it as written (products such as `1750 * 6 * 1.15` included).
- `batts` / `motors` / `props`: the same keys as the originals and the same calc fields as
  `src/lib/drone/__fixtures__/catalogues.json` (batteries: cells, mah, g, price; motors: kv, g, price and, where
  the original has them, sz, maxCells, big; props: pf, eff, g, price and r). Keep `liion: true` on the long-range
  Li-ion packs and `cg` on the wing's packs. Add `liion: true, parallel: 2` to the VTOL's `4s2p-li`
  (4S2P Li-ion 8000 mAh) so the pack current check runs; the original lacked it.
- `fixed`: the same ids, grams, prices and categories as `catalogues.json`, in the same order.
- `default`: the original default pick (the `default` of each table in `golden-a.json` / `golden-b.json`).
- `golden`: optional. Any rows you add are checked by value at the precision you write them.

Why: `src/lib/drone/content.test.ts` loads every craft listed in `AVAILABLE.drone` and fails if the model,
catalogue, fixed parts or default differ from the fixtures; crafts not written yet show as todos.

## 2. ui:dronelab (Drone Lab design panel)

- Use `evaluateDesign(design, pick)` for `{ result, checks }` and `isDesignPick` to validate URL or stored picks.
- `checks` are codes with numbers (`over-spin`, `weak`, `cannot-hover`, `prop-clash`, `esc-overcurrent`,
  `battery-overcurrent`, `hover-high`, `tail-heavy`, `short-flight`), most serious first; `checkLevel[code]` gives
  danger / warn / info. The text belongs in the dronelab i18n namespace; the per-craft verdict lines of the
  originals (`verdicts(result)`: over / weak / ok) belong in each craft's content JSON.
- Format numbers with `Intl.NumberFormat` and the decimals in `tileDigits`.
- `result.flyMin` is "Freestyle time" on most crafts, but the cruise time on the VTOL (and 0.8 x cruise time on
  the wing, where `hoverMin` is the cruise time and `result.cruise` holds the cruise, stall and top speeds):
  label the sixth tile per craft.
- The defaults of gpscam, delivery, agrihex, swarm and octo hover above 60 % throttle and get a `hover-high`
  warning. The racer and tricopter defaults get `esc-overcurrent` at full throttle (54 A and 38 A per motor
  against 45 A and 30 A ESCs). Word these as headroom advice, not as faults.
