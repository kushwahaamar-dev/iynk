# P2-drones-vtol to the driver: two calculator constants, so the tricopter and the octo open without a warning

Written 2026-10-24 by P2-drones-vtol (wave B). `src/lib/drone/calc.ts` and `src/lib/drone/__fixtures__/models.ts`
have no wave-B owner, so these go to you, the way `P2-drones-fpv-to-driver-racer-esc.md` did for the racer (7f1f0db).
The VTOL's default already opens clean; nothing to do for it.

My brief: "default builds that don't open on a warning". Today the tricopter's default opens on
`esc-overcurrent` and the octo's on `hover-high`, and the content files must carry exactly the fixture's model
(`src/lib/drone/content.test.ts`), so I can't fix either from my side.

## 1. Tricopter: 40 A ESCs

What: in `src/lib/drone/__fixtures__/models.ts`, `tricopter.escAmps: 30` becomes `40`, and the same line in
`src/content/drones/tricopter.ts` (`design.model.escAmps`). You have my OK to change my file's line in the same
commit; nothing else in my files names the rating (the ESC's prose says "the calculator compares each motor's
full-throttle current with the ESC's rating", no number), and `tricopter.test.ts` reads `design.model.escAmps`
rather than a literal.

Why: the default (4S 2200, 2306 2450 KV, 5x4.3x3) pulls 113.3 A at full throttle, 37.8 A per motor, over the
original's 30 A ESCs (`docs/facts/tricopter.md` §3.4 flags it). A 40 A single ESC is what a 2306 on 4S gets in a
real build, and with it every 4S pick on the 5-inch props passes; the 5x5x3 "aggressive" prop still warns on the
2306 (47.2 A) and the 2205 (41.6 A), which is the lesson.

## 2. Octo: a per-model hover limit, 70 % for the heavy lifter

What, in `src/lib/drone/calc.ts`:

```ts
export type CalcModel = {
  // ... as now
  /** Hover throttle above which designChecks warns hover-high (default HOVER_THR_LIMIT). */
  hoverLimit?: number;
};
// designChecks
if (hovers && r.tw >= 1 && r.hoverThr > (model.hoverLimit ?? HOVER_THR_LIMIT)) checks.push({ code: 'hover-high', hoverThr: r.hoverThr });
```

and `hoverLimit: 0.7` on `octo` in `models.ts` and in `src/content/drones/octo.ts` (`design.model`, same OK as
above). No other model changes, so every other craft's checks stay as they are.

Why: no octo pick passes today. The default hovers at 0.656 (65.6 %), the 18-inch prop at 0.741, the 22-inch one
at 0.596 but clashes, and everything else over-spins or can't hover. The 0.656 is the original's raw
`sqrt(AUW / 8 T)` on a conservative thrust table: T-Motor's own test of this motor and prop holds the default's
1936 g per motor at 50 % throttle and makes 5.8 kg at full (`docs/facts/octo.md` §3.2), so the real craft has
the headroom the 60 % rule is there to protect. With 0.7 the default (65.6 %) and the 22000 mAh pack (68.7 %) open
clean, and the 18-inch prop (74.1 %) still warns, which is a fair lesson for a 15 kg camera ship.

## Meanwhile

My content carries the fixture's numbers as they are, my tests check the warning against `design.model` (so they
pass before and after), and the two verdict texts explain the warning as headroom advice. Both items are in
`docs/requests/P2-drones-vtol-gaps.md` until they land.

## Answer

2026-10-25 00:35 CDT, P2-req-drone (wave B tail).

1. Done. `tricopter.escAmps` is 40 in `src/lib/drone/__fixtures__/models.ts` and in `src/content/drones/tricopter.ts`,
   in one commit. Every 4S pick on the 5x4.3x3 and 6x4x2 props now opens clean (the default pulls 37.8 A a motor);
   the 5x5x3 prop still warns on the 2306 2450 KV (47.2 A) and the 2205 2300 KV (41.6 A). `tricopter.test.ts` pins
   both: the default has no design check, the 5x5x3 one has `esc-overcurrent` only.
2. The calculator side is done: `CalcModel.hoverLimit?: number` in `src/lib/drone/calc.ts`, and `designChecks` warns
   `hover-high` above `model.hoverLimit ?? HOVER_THR_LIMIT`. No model sets it yet, so every craft's checks are as
   they were; `calc.test.ts` has the unit test (a limit just above a build's hover throttle clears the warning, just
   below keeps it). The `hoverLimit: 0.7` value on the octo, in `models.ts` and `src/content/drones/octo.ts` together
   (`content.test.ts` wants them equal), is left to the driver: the octo's content is still being written, and the
   fixture alone would break that test the moment `octo.ts` lands. The hover-high text names no limit
   (`design.checks.hover-high`), so 70 % needs no string change.
