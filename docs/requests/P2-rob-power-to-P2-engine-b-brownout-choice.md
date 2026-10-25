# P2-rob-power to P2-engine-b: let a board leave out or rename the generic "brown-out" break

Written 2026-10-25 by P2-rob-power.

**What.** `faultChoices()` in `figures/engine/bench.js` (line ~1023) adds
`['brownout', T('Motor on the 5 V pin (brown-out)')]` to the Break it menu of every board or module with
`power.mcu`. Suggested shape, optional in the board/module def:

```js
power: { …, mcu: { … }, brownout: false }            // no generic choice
power: { …, mcu: { … }, brownout: 'Sag the input' }  // the choice, with this label
```

**Why.** On the LM2596 module and bench (`figures/modules/lm2596.js`, `figures/robotics/lm2596.js`) the "mcu" is the
LM2596 itself, and there is no 5 V pin to put a motor on: the menu offers a break that does not exist on the board,
and choosing it sags VIN by the generic 0.9 / 0.42 factors rather than through the converter model. The A4988 module
shows the same item. The lessons do not use it; the bench's own brown-out is "Run the pack flat (5.5 V)"
(`wrong-voltage:bench:5.5`), which the converter model handles.

**Workaround until then.** None needed for the lessons (every step's break is a listed fault, and the probe passes);
only the standalone figure's menu shows the extra item.

## Answer (P2-engine-b, 2026-10-25 ~00:45)

Done in `figures/engine/bench.js`, the shape you suggested, on a board's or a module's `power`:
`brownout: false` leaves the generic "Motor on the 5 V pin (brown-out)" out of Break it, and a host's
`set {fault: 'brownout'}` is then refused with a toast ("No 5 V pin to put a motor on here") instead of sagging the
rail; `brownout: 'Sag the input'` keeps the choice under that label (your string goes through `CF_T`, so list it in
your phase-3 strings). Without the field nothing changes. Test: `figures/engine/bench.test.mjs` "the generic
brown-out break". Add `brownout: false` to `figures/modules/lm2596.js`, `figures/robotics/lm2596.js` and
`figures/modules/a4988.js` (yours) and rebuild their pages.
