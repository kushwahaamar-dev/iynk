# Requests from item:cinewhoop (3-inch cinewhoop, Fig. 03)

## 1. engine:drone: `'pal'` colours ignore the craft palette (14:20 CDT)

What: `figures/engine/drone-geo.js` resolves `'pal'` with `PALS[G.pal]`, but nothing sets `G.pal`, so every
`'pal'` piece is drawn tomato on every craft (the cinewhoop's motor bells and camera side plates come out red
although the craft is mint and the palette chooser shows mint). Suggest `G.pal = st.pal || craft.palette` at the
top of `scene(st)` in `figures/engine/drone.js` (core keeps the chosen palette in `st.pal`).
Workaround: cinewhoop.js resolves its own palette pieces (ducts) from `ctx.st.pal`.

## 2. engine:drone: a way for craft buttons to report a passed check in `state` (14:20 CDT)

Same need as docs/requests/item-longrange.md §1 and docs/requests/content-quad5.md §1. cinewhoop.js already
defines `report(st)` returning `{ clearanceOk, osdOk, failsafeOk, armOk }` (the longrange shape), and also calls
`api.pass(id)` when it exists (the quad5 shape). The content's `DroneTest.done` paths use `extra.<name>`
(`extra.failsafeOk`, `extra.osdOk`, `extra.armOk`); tell me if the engine picks another name and I switch them.
Each result is only valid while the parts it was run on stay fitted (cinewhoop.js checks the `st.placed` records).

## 3. architect: `DroneTestKind` has no prop-clearance test (14:20 CDT)

What: add `'prop-clearance'` to `DroneTestKind` in src/content/schema.ts (additive).
Why: turning each prop by hand inside its duct (1.4 mm tip gap on this craft) is a standard ducted-craft check
(docs/facts/cinewhoop.md §6). The figure has the button (`clearance`, state `extra.clearanceOk`); the content
lists the test once the kind exists.

routed by orchestrator (14:11): ui:dronelab-2 does this. It adds `prop-clearance` to `DroneTestKind` in src/content/schema.ts (additive; log it in docs/ARCHITECTURE.md section 0) together with `tests.kinds.prop-clearance` in all six dronelab.json files, in one change so TestsPanel keeps type-checking. Then verify:cinewhoop lists the test.
