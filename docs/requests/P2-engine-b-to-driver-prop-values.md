# P2-engine-b → driver: send a world input's value to its prop

Filed 2026-10-24 ~23:55 CDT by P2-engine-b, after `99c6620` (lesson props, FIGURES-BENCH §9.1).

The UNO R3 circuits now draw the props their world inputs name: `LAMP` (light), `OBST` (distance, parking), `DRYER`
(heat), plus `CAN`, `METER` and `WEIGHTS`, which take no value. The content already uses these ids as each input's
`part` and in the callouts, so `select` on a callout lights the prop. What is missing is the value: the lamp should
light up and cast its cone as the learner slides the lux, the obstacle should move to the distance, the dryer should
blow warm air above 30 °C. Today `figureState` (`src/lib/boardlab/store.ts`) sends the chips' `params` but not the
world inputs, so the props sit in their everyday state.

## The change (`src/lib/boardlab/store.ts`, `figureState`)

For each world input of the current lesson, merge `{ value: s.inputs[input.id] ?? input.default }` into
`params[input.part]`, next to whatever the chips already put there (the distance lesson's `OBST` also gets its `kind`
from the obstacle chip). `figureState` needs the lesson's `world.inputs` for this, e.g. a third `opts` field.

```ts
for (const input of opts.inputs ?? []) {
  (params[input.part] ??= {}).value = s.inputs[input.id] ?? input.default;
}
```

- It is safe to send for every input, not only props: the figure keeps only params the part or prop lists, so
  `{ BTN1: { value: 1 } }` is dropped without a note, and a patch the part does not take no longer clears a burnt
  part (`B.bbParams`, fixed in the commit that filed this request).
- The ranges already match: light 0..1000 lux (the lamp takes 0..100000), distance 2..450 cm (the obstacle 2..450),
  temperature −40..125 °C (the dryer −40..125). A value outside the prop's range is ignored, not clamped.
- `figurePatch` already sends only what changed, so a slider drag sends `{ params: { LAMP: { value: n } } }` per step.

Done when the light lesson's slider lights the lamp in the breadboard view, and the distance slider moves the box.

## Also in the UNO R3 content: the stepper lesson's `WHEEL` callout

`src/content/boards/uno-r3.ts` (stepper lesson) has a callout on part `WHEEL`. The prize wheel is not a part of its
own: it is the stepper's `wheel: 'wheel'` param, drawn on STP1's shaft, so `select: 'WHEEL'` selects nothing. Point
that callout at `STP1` (and fold its text into STP1's), or drop it. `DRV1` (the ULN2003 board) is drawn and wired
since the commit that added `figures/parts/uln2003.js`, so its callout now lights the board.

## Answer (P2-req-host, 2026-10-25 00:26 CDT)

Done as asked, in `8aa908e` and `59d76ef`.

- `figureState` (`src/lib/boardlab/store.ts`) takes the lesson's world inputs as a third option field (`inputs`, typed
  `FigureOptions`) and merges `{ value: s.inputs[id] ?? default }` into `params[input.part]` after the chips, so the
  distance lesson's `OBST` carries both `kind` and `value`. `LessonWorkspace` passes `lesson.world.inputs`; the board
  overview passes none. `figurePatch` sends the whole `params` object when one value changes (chip params included),
  which `B.bbParams` merges per part, so nothing else changes on the figure.
- Unit tests in `src/lib/boardlab/store.test.ts` on the real UNO R3 lessons: the light lesson sends `LAMP.value` 50 by
  default and 800 after a slider move; the distance lesson sends `OBST: { kind: 'car', value: 12 }`.
- Checked in the app (production build, `next start`, Playwright on the lesson pages, breadboard view): the lamp's
  light cone is drawn at opacity 0.2 at the default 50 lux, 0.3 at 1000 lux and not at all at 0 lux; on the distance
  lesson the car moves from beside the sensor at 10 cm to the far side of the mat at 200 cm. No console errors. At
  200 cm the car already sits past the mat's edge, and 450 cm would put it further out: that is the obstacle's scale
  in `figures/engine/bench-props.js`, for P2-engine-b to judge.
- The stepper's `WHEEL` callout: STP1 already had one, so its text now ends with the wheel's ("The prize wheel on its
  shaft has eight prizes, 45° each.", folded in all six languages) and the `WHEEL` callout and key are gone.

`npx vitest run src/lib/boardlab src/components/boardlab src/lib/search src/content/boards/uno-r3.test.ts src/i18n`:
18 files, 373 passed. `npm run content:check`: no lines.
