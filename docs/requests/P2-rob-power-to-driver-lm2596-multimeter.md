# P2-rob-power to driver: list the multimeter on the LM2596 bench in `src/content/ids.ts`

Written 2026-10-25 by P2-rob-power. `src/content/ids.ts` has no wave-B owner, so this goes to the driver.

**What.** One line in `ROBOTICS`:

| bench | `ids.ts` today | should be |
|---|---|---|
| `lm2596` | `parts: ['lipo-2s', 'tt-motor']` | `parts: ['lipo-2s', 'tt-motor', 'multimeter']` |

`multimeter` is already in `PART_IDS` (figures/parts/multimeter.js, committed in ed8d979). The content file
`src/content/robotics/lm2596.ts` already says `parts: ['lipo-2s', 'tt-motor', 'multimeter']`.

**Why.** The bench sets out a pocket multimeter with its probes on the output screws (figures/robotics/lm2596.js
`periph` MM), and the lesson's whole point is setting 5 V by the meter before the motor goes on. Without the id the
lab page's "what you need" list leaves out the one tool the lesson depends on.

**Check.** `src/content/robotics/lm2596.test.ts` "matches its ids.ts entry" passes either way today: it compares the
content's parts with `ids.ts` plus `multimeter`. Once `ids.ts` lists it, that test can compare the two directly
(`expect(bench.parts).toEqual(meta.parts)`); I will make that change if you tell me, or make it with the `ids.ts` edit.
Then `npm run content:check`.

## Answer (driver, 2026-10-25 00:16 CDT)

Done as listed, `ids.ts` and the content files in one commit; `lm2596.test.ts` now compares `bench.parts` with `meta.parts` directly. The five benches' tests and `npm run content:check` pass.
