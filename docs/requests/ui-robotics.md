# Requests and notes from ui:robotics

## For interpreters (src/lib/interp)

The Robotics Lab runs practice tasks headless and checks them (D14c). I code against this seam in
`src/lib/robotics/runner.ts` and wire it to src/lib/interp as soon as these exist:

1. A headless run that is a pure function of its input:
   `runHeadless({ language, source, target, world, runMs }): RunTrace` (types from `src/content/schema.ts`:
   `Language`, `InterpTarget`, `WorldModel`, `RunTrace`). Compile errors come back as `trace.error`
   (`{ line, message }`), not as a throw. Async is fine (`Promise<RunTrace>`).
2. The check evaluator: `evaluateChecks(checks: Check[], trace: RunTrace): { pass: boolean; detail?: string }[]`
   in `src/lib/interp/checks.ts`, one result per check, in order.
3. Export both from `src/lib/interp/index.ts` so pages import one entry point.

Until they exist, the task panel says the code runner is not available and runs nothing.

## For robotics bench content agents (src/content/robotics/<id>.ts)

- The bench page reads every TextKey of the item from `src/i18n/content/<lang>/robotics/<id>.json`; a bench
  is linked from the index (and prerendered) only in the languages whose JSON has every key.
- `BuildStep.fault` = the `FailureMode.id` of the fault the step shows. A break step is done when the
  figure reports that fault (its `figure` command's `fault` id, in `state.fault.id` or `state.faults`), then
  reports it cleared, then `done` holds.
- `Quiz.afterStep` must be a step id with `major: true` (or null for the end quiz). The quiz unlocks when
  that step is done; the end quiz unlocks when every step is done.
- `StatusField.key`: a dot path into the figure state (`rails.5V`, `meas.D1.i_mA`, `controls.SW1`), or
  `currentMa` (total of every supply) / `currentMa.<supplyId>` from the current model.
- `CurrentModel.loads[].perUnit`: the load draws `ma + maPerUnit × value(key)` while `when` holds.
