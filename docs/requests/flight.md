# Requests from the flight agent

1. **README / figure prompts (docs owner)**: the range's Colorfigures prompt is `figures/flight/PROMPT.md` (I do
   not own `figures/prompts/`). Please copy or link it as `figures/prompts/flight-range.md` and list it in the README.
2. **Figure build (platform)**: `python3 -I figures/tools/cfbuild.py --all` scans `figures/flight/*.js`, finds no
   top-level item there (the range sources are in `figures/flight/src/`) and so builds nothing for it. The range
   has its own build, `node figures/flight/build.mjs` (Node plus the installed `typescript` package, which embeds
   the 5-inch demo course), writing `public/figures/flight/range.html`. Please run it in the same figure build step.
3. **Drone lab (ui:dronelab)**: render `<FlightRange craft course calc={fromCalc(result, battery)} faults t={flight}
   courseText onEvent onSession onFigure />` on `/drones/[drone]/fly` (`docs/research/flight-render.md` §3, §8).
   From `onEvent`: keep `lap`/`run` bests in progress `best["drone:<id>:course:<courseId>"]` (lower is better),
   mark `drone:<id>:course:<courseId>` done on the first `run`, and hand `sfxFor(event)` to the sound engine.
   Give `onSession`'s session to the drone store / `LabDock`; it is `LabStore`-shaped.
4. **Courses and crafts for the other twelve drones (whoever is assigned them)**: suggested homes are new files
   `src/lib/flight/crafts/<id>.ts` and `src/lib/flight/courses/<id>.ts` in the formats of the doc's §4. They need
   no change to `sim.ts`, `types.ts` or `index.ts`; if one turns out to be needed, please ask here first.
5. **Sound engine (S10 owner)**: `sfxFor` uses only the figure vocabulary of `docs/FIGURES-DRONE.md`
   (`place whoosh tick click unplug power pop sizzle buzz ding spin`): gates and checkpoints `tick`, laps and
   landings `ding`, crashes `pop` + `sizzle`, refusals and warnings `buzz`. The original also had `chime` (gates)
   and `error` (refusals); if the engine adds them, tell me and I will switch those two.
6. **Settings (shell-app, optional)**: the gamepad mapping is kept per viewer in
   `localStorage["simlab:flight-pad:v1"]`, a convenience outside the D7 `simlab:v1` record. Fold it into settings if
   you want one key; the shape is `PadMapping` in `src/lib/flight/input.ts`, validated by `isPadMapping`.

P2-flight (2026-10-24): item 4 is superseded. Crafts and courses come from each craft's content module through
`src/lib/flight/registry.ts`; `src/lib/flight/crafts/` and `courses/` are gone, and `figures/flight/build.mjs`
embeds the quad5 gate race from its content. See `docs/requests/P2-flight-to-drone-content-flying.md`.
