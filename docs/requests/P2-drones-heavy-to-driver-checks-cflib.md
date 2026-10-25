# P2-drones-heavy to the driver: a Crazyflie in `_checks.ts`, and read-only parameters in the cflib console

Written 2026-10-24 by P2-drones-heavy. `src/content/drones/_checks.ts` belongs to P2-drone-prose (wave A, finished)
and `src/lib/dronelab/cli.ts` to ui:dronelab, so both go to the driver. Nothing is blocked: `swarm.test.ts` runs the
same checks its own way today.

## 1. `checkCraft()` for a craft with no smoke stopper and cflib lines

What: two options on `CraftOptions`, so `swarm.test.ts` can call `checkCraft(swarm, en, { noSmoke: true })` and drop
its local copies (the `figureParts`, `block`, `leaves` helpers and the first three describe blocks).

```ts
export type CraftOptions = {
  // ...
  /** The figure has `smoke: false` (a factory-built craft): the engine tests are motors and calibrate only. */
  noSmoke?: boolean;
};

// in 'runs the engine’s three safety tests ...'
const want = opts.noSmoke ? ['motors', 'calibrate'] : ['smoke', 'motors', 'calibrate'];
expect(content.tests.filter(isEngineTest).map((t) => t.button)).toEqual(want);
if (opts.noSmoke) expect(engine).toMatch(/\bsmoke: false\b/);

// a settings line: Betaflight / INAV `set name = value`, MAVProxy `param set NAME value`,
// cflib `cf.param.set_value('group.name', value)` (inside a Python script too, so match anywhere in the line)
const setLine = /^(?:set (\w+) = (\S+)|param set (\w+) (\S+))$|cf\.param\.set_value\('([\w.]+)', (-?\d+(?:\.\d+)?)\)/;
const isSet = (line: string) => line.startsWith('set ') || line.startsWith('param set ') || line.includes('cf.param.set_value(');
```

and in the firmware block, for `emulator.kind === 'cflib-python'`:

- "starts the CLI emulator with the values the snippets set": compare the **last** value each build snippet sets
  (the motor check sets `motorPowerSet.m1` to 10000 and back to 0; the light snippet ends on `led.bitmask` 0);
- "only uses commands the emulator offers": skip it, or check only the lines `runnableLines()` returns (the mode
  snippets are whole Python scripts the console shows as code);
- the integer rule in `valid()` should treat cflib like MAVProxy (`pm.lowVoltage` is a float parameter).

Why: a Crazyflie has no smoke stopper (factory-built, no hand soldering in the power path, the cell has its own
protection board; `docs/facts/swarm.md` §6) and its parameters are set from Python.

## 2. Read-only parameters in the cflib console

What: an optional `readOnly?: string[]` on `CliEmulator` (schema owner this wave: P2-drones-vtol), and in
`src/lib/dronelab/cli.ts` `cflib()`, before the value check:

```ts
if (emu.readOnly?.includes(name)) return { session: s, out: [...lines, err(`AttributeError: ${name} is read-only!`)], effects: [] };
```

Why: `deck.bcFlow2` and `deck.bcLighthouse4` are read-only in the firmware, and cflib 0.1.34's `param.set_value`
raises `AttributeError('{} is read-only!')` for them. Today `swarm.ts` limits both to `values: ['1']`, so the console
refuses `0` with a ValueError but accepts `1`. Once this lands, `swarm.ts` adds
`readOnly: ['deck.bcFlow2', 'deck.bcLighthouse4']` and can drop those two limits.
