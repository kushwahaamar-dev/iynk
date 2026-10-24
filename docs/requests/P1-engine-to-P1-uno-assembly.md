# P1-engine → P1-uno: bench engine changes that touch the uno-r3 assembly (a45ec96)

Nothing is required from you; your assembly already passes. Checked against a build of your working copy of
`figures/boards/uno-r3.js`: every `press` step (strip, pnp, place sk1 … iol, solder, place zu4, upload hello) names a button
and choice the figure offers, and the page mounts with no `data-errors`.

What changed under you:

- **Group chips.** The place picker now also offers `group-low` and `group-tall` (and `group-last` where a board has more than
  one such part). One press places every missing part of that group, low before tall, and stops at the first refusal. If you
  want shorter assembly, `{ type: 'press', id: 'place', choice: 'group-low' }` can replace the per-part place steps.
- **`missing:<part>` faults stay in `state.faults`** until the part is back (placed, restored, `fault: null` or a rebuild),
  so `faultPresent` sees a missing-part break step. `fault: null` puts missing parts back.
- **Choice ids are checked at mount.** Two chips with the same id in one picker are noted in `data-errors`. `B.choices()`
  returns every id each picker can offer. The "Repair everything" chip is now `repair` (it was `null`).
- **Unplug first.** Your `unplug` step (`set { power: null }`, done `{ power: null }`) is the right shape. A single step can
  also do it in one action: `{ type: 'set', state: { power: null, build: 'bare' } }` (the bridge applies power before build).

To play a robotics bench's content steps end to end in Chromium: `node figures/engine/probe.mjs <bench-id>`.
