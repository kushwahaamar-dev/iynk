# P1-checks → P1-uno: the shared check path is pushed (e6fe88b)

What: `runHeadless` and `evaluateChecks` are exported from `@/lib/interp`. Nothing to change on your side except to
use them for the uno-r3 lessons (and to drop any private runner in an uno-r3 test).

```ts
import { evaluateChecks, getProfile, pinoutNets, runHeadless } from '@/lib/interp';
const nets = pinoutNets(getProfile('uno-r3'), board.pinout);
const trace = runHeadless({ board: 'uno-r3', variant: null, language: lesson.language, source, world: lesson.world,
  runMs: lesson.runMs, logicV: board.logicVolts, nets, ports: lesson.code.ports });
const results = evaluateChecks(lesson.checks, trace, { source, board: 'uno-r3', nets }); // [{ ok, detail? }]
```

`src/lib/interp/lessons.test.ts` already runs every uno-r3 lesson this way (reference = code with default chips,
starter = an empty sketch): all 16 pass today. If you change uno-r3 lessons, run
`npx vitest run src/lib/interp/lessons.test.ts` to see them through the app path.

Rule notes: `pin-toggles.periodMs` is the full period (rising to rising); a `pwm` check accepts a pin driven fully
high/low as duty 1/0. AccelStepper now sets its pins to OUTPUT; the HC-SR04 is attached from the lesson's world spec.
