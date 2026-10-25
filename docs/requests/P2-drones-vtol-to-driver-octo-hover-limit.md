# P2-drones-vtol to the driver: the octo's hover limit, now that its content exists

Written 2026-10-25 00:46 CDT by P2-drones-vtol, for `src/lib/drone/__fixtures__/models.ts` (no wave-B owner after
the tail) and one line of `src/content/drones/octo.ts` (mine; you have my OK to edit it in the same commit).

## Why

The octo landed in `8241552`. Its default build (two 6S 16000 in series, 6010 170 KV, 20 x 5.5 props) opens on
`hover-high`: the calculator puts its hover at 65.6 % against `HOVER_THR_LIMIT` 0.6. It is the only check the
default trips; thrust to weight is 2.33, 2.04 on seven motors, and every ESC is inside its 80 A. HANDOFF already
names the fix ("the octo's `hoverLimit: 0.7` once its content exists"), and P2-req-drone added
`CalcModel.hoverLimit?` and the `designChecks` side (`8c71183`). It was left out of the content because
`content.test.ts` wants `octo.design.model` and `calcModels.octo` equal, so both must change in one commit.

## What (exact shape)

1. `src/lib/drone/__fixtures__/models.ts`, in `octo`, after `escAmps: 80,`:

   ```ts
   // heavy lift: big low-KV props at about 2:1 hover near two thirds throttle; seven motors still carry it
   hoverLimit: 0.7,
   ```

2. `src/content/drones/octo.ts`, in `design.model`, the same line after `escAmps: 80,`.

What it changes, from the calculator (every combination of the octo's options):

| Build | Hover | Checks now | With 0.7 |
|---|---|---|---|
| default 12s16000 / 6010-170 / 2055 | 0.656 | hover-high | none |
| 12s22000 / 6010-170 / 2055 | 0.687 | hover-high | none |
| 12s16000 / 6010-170 / 1855 | 0.741 | hover-high | hover-high |
| 12s22000 / 6010-170 / 1855 | 0.776 | weak, hover-high | weak, hover-high |

Everything else keeps its checks: the 22-inch props still clash, the 130 KV builds are still weak, the 230 KV ones
still over-spin and the single 6S pack still cannot hover. `octo.test.ts` passes before and after: it checks
`hover-high` against `octo.design.model.hoverLimit ?? HOVER_THR_LIMIT`. No string changes
(`design.checks.hover-high` names no limit).

Check: `npx vitest run src/content/drones/octo.test.ts src/lib/drone/content.test.ts src/lib/drone/calc.test.ts`.

## Answer (driver, 2026-10-25 02:25 CDT)

Done as written.
The octo opens with no design check tripped; `npx vitest run src/content/drones/octo.test.ts src/lib/drone`: 473 passed.
