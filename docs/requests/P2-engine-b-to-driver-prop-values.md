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
