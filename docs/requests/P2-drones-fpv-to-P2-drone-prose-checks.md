# P2-drones-fpv to P2-drone-prose: two small changes in `src/content/drones/_checks.ts`

Written 2026-10-24 20:30 CDT by P2-drones-fpv. `racer.test.ts`, `gpscam.test.ts` and `delivery.test.ts` call your
`checkCraft()` (and racer `checkBetaflightSyntax()`); two of its checks reject real firmware lines.

## 1. Two Betaflight mode ids missing from `BF_MODES`

What: add `39` (VTX PIT MODE) and `49` (LAUNCH CONTROL) to `BF_MODES`, and name them in the comment above it:

```ts
// Betaflight 2026.6.2 permanent mode ids (src/main/msp/msp_box.c) the crafts use: ARM, ANGLE, HORIZON, ALTHOLD,
// BEEPER, FLIP OVER AFTER CRASH, VTX PIT MODE, GPS RESCUE, LAUNCH CONTROL.
const BF_MODES = new Set([0, 1, 2, 3, 13, 35, 39, 46, 49]);
```

Why: the racer's switch snippet puts VTX PIT MODE on AUX3 and LAUNCH CONTROL on AUX4 (`aux 2 39 2 1700 2100 0 0`,
`aux 3 49 3 1700 2100 0 0`), the two switches every race quad has. Both ids are in `msp_box.c` at 2026.6.2
(`docs/facts/racer.md` §5 and its check table, row 13, "confirmed"). Today `racer Betaflight CLI > writes aux lines
...` fails on them.

## 2. ArduPilot parameter lines in the firmware checks

What: the firmware block of `checkCraft()` only reads Betaflight/INAV `set name = value` lines. gpscam and delivery
run ArduPilot Copter through the `mavproxy` emulator, whose lines are `param set NAME value` (src/lib/dronelab/cli.ts
`mavproxy()`). Suggested change (the tests' logic stays the same):

```ts
// a settings line: Betaflight / INAV `set name = value`, MAVProxy `param set NAME value`
const setLine = /^(?:set (\w+) = (\S+)|param set (\w+) (\S+))$/;
const setOf = (line: string): [name: string, value: string] | null => {
  const m = setLine.exec(line);
  return m ? [m[1] ?? m[3], m[2] ?? m[4]] : null;
};
const isSet = (line: string) => line.startsWith('set ') || line.startsWith('param set ');
```

then in "only sets settings the emulator knows" and "starts the CLI emulator with the values the snippets set" use
`isSet(l.line)` for the filter and `setOf(line)` in place of `setLine.exec(line)` (`[, name, value]` becomes
`[name, value]`).

Why: without it `from.length > 0` fails for both ArduPilot crafts ("starts the CLI emulator ...") and none of their
`param set` lines is checked against the emulator's table and limits. "only uses commands the emulator offers" already
works (`param`, `mode` are emulator commands).

Until this lands those two checks fail in `gpscam.test.ts` and `delivery.test.ts`, and the racer's aux check fails;
everything else in the three files passes. Reply here when done (or why not) and I re-run them.
