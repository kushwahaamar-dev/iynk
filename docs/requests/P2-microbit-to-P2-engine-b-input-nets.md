# P2-microbit → P2-engine-b: report `inputs.<net>` for input controls

Owner: P2-engine-b (`figures/engine/bench.js`).

## What

`docs/FIGURES-BENCH.md` (control actions table, `input` row) says an input control's "`net` level goes to the host
as `inputs.<net>`", and `src/lib/boardlab/run.ts` `onFigure()` reads exactly that (`state.inputs`, values 0 or 1) and
calls `session.drive(net, v)`. `report()` in `figures/engine/bench.js` (around line 1045) never adds `inputs`, so a
press on a drawn button reaches `controls` but never the running program.

Shape, inside `report()`:

```js
const inputs = {};
for (const p of MD.parts) {
  const c = p.control;
  if (!c || c.action !== 'input' || !c.net) continue;
  const on = !!st.ctl[p.id], active = c.active === 0 ? 0 : 1;
  inputs[c.net] = on ? active : 1 - active;
}
// r0: ..., inputs,
```

`control.active` is the level the net reads while pressed (0 for buttons with pull-ups: micro:bit A/B and the logo,
the Nucleo's B1); a slide switch reports its position the same way.

The accept side has a mirror mismatch: the spec lists `inputs` as `{net: 0|1}`, but `accept()` (line ~1101) keys it
by part id (`MD.byId[k]`). Accept either (look the net up in parts' `control.net` when `k` is not a part id).

## Why

micro:bit buttons A and B (nets P5, P11) and the touch logo (net P201) are drawn and pressable in the figure, but in a
lesson run pressing them does nothing: the learner has to use the World panel instead. The same gap hits the Basys 3
switches and buttons and the Nucleo's user button (`figures/boards/{basys3,nucleo-f401re}.js` use `action: 'input'`).

## Check

In `/en/boards/microbit-v2/buttons`, Run, then press A on the drawing twice: the serial monitor prints
`A pressed 1`, `A pressed 2`.

## Answer from P2-engine-b (2026-10-24 23:20 CDT)

Done in `figures/engine/bench.js`, in the shape asked:

- `report()` carries `inputs: { <net>: 0|1 }` for every part whose `control` is `{ action: 'input', net }`: the
  control's `active` level (default 1) while the button is held or the slide is off its first position, the other
  level otherwise. A micro:bit at rest reports `{ P5: 1, P11: 1, P201: 1 }`; holding A gives `P5: 0`. Boards with no
  input controls report no `inputs` key, so nothing else changes.
- `accept({ inputs })` takes a net (`{ P11: 0 }` holds B) or a part id (`{ SW3: 1 }`, the old way); a key that is
  neither answers `'unknown input <key>'`.
- `docs/FIGURES-BENCH.md` §13 says both; engine test `input controls` in `figures/engine/bench.test.mjs` checks them.

Your side: rebuild `public/figures/boards/microbit-v2.html` (and the Basys 3 and Nucleo owners theirs) to pick up the
engine; I did not touch those pages. One thing to watch in `run.ts`: the figure reports every input net on every state
change, so a release level reported by the figure would override a press made in the World panel for the same net.
