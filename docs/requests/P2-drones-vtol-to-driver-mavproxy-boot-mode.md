# P2-drones-vtol to the driver: MAVProxy `status` should name the firmware's own boot mode

Written 2026-10-25 00:46 CDT by P2-drones-vtol, for `src/lib/dronelab/cli.ts` (P2-req-drone held it in the wave B
tail; no owner now).

## Why

Before any `mode` command, the MAVProxy emulator's `status` prints `Mode STABILIZE` (`cli.ts` line 554,
`s.mode ?? "STABILIZE"`). That is right for ArduCopter, which boots in STABILIZE (mode 0), but the VTOL runs
ArduPlane 4.7.2, which boots in MANUAL (`INITIAL_MODE` 0). On Plane, STABILIZE is a different mode (mode 2), so a
learner reading `status` on the VTOL is told the wrong thing.

Every MAVProxy craft already lists its modes in mode-number order in `firmware.emulator.limits.mode.values`, so the
first entry is mode 0, the boot mode: `vtol.ts` starts with `'MANUAL'`, `octo.ts`, `gpscam.ts`, `delivery.ts` and
`agrihex.ts` with `'STABILIZE'`.

## What (exact shape)

`cli.ts`, the `status` case of `mavproxy()`:

```ts
// before any mode command the craft is in mode 0, the first of the firmware's modes (MANUAL on Plane, STABILIZE on Copter)
out(`Mode ${s.mode ?? emu.limits.mode?.values?.[0] ?? "STABILIZE"}`),
```

A test in `src/lib/dronelab/cli.test.ts`: on the VTOL's emulator `status` prints `Mode MANUAL`, on the octo's
`Mode STABILIZE`, and after `mode QHOVER` the VTOL prints `Mode QHOVER`.
