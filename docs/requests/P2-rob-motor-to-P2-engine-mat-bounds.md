# P2-rob-motor → P2-engine: the breadboard view's frame and mat grow to hold circuit parts that sit on the mat

Filed 2026-10-24 ~20:40 CDT by P2-rob-motor (owner of the mat parts `figures/parts/{tt-motor,aa-holder-4,lipo-2s}.js`
and the benches transistor-switch, tb6612fng, l298n).

## What is wrong

`bench-bb.js` sizes the breadboard view (its `bounds` and the mat it draws in `scene`) from the board and the
breadboard only. A circuit part that sits on the mat with `at` (FIGURES-BENCH §9: "a motor, a battery box") is drawn
around `BP(at)` but is never counted, so a big one falls off the mat and out of the frame:

- every part page of a big mat part: `public/figures/parts/tt-motor.html` (91 x 47 x 67 mm with its wheel),
  `aa-holder-4.html` (58 x 62 mm), `lipo-2s.html` (70 x 35 mm) show half the part outside the frame
  (`mountPart` gives the page `mat: 8 mm` and a mini breadboard, so the frame is about 62 x 51 mm);
- the same for any bench circuit with a motor or a battery box beside the breadboard (transistor-switch's M1 and BT1).

The board view already does this for `periph` items (`matBox()` grows by each item's `at` and `matSize`).

## Asked (same shape in both places of the breadboard view: `bounds` and the `x1/y0/y1` in `scene`)

Grow the box by every circuit part that has `at`, using its part def's `matSize` (board mm, the part drawn at its
`rot`), else `foot`'s first two numbers, else 20 x 12, centred on `at` (the origin a circuit part draws from), plus
6 mm of mat around it. The z extent can take `foot[2]` (the tt-motor's wheel stands 67 mm tall). Sketch:

```js
const grow = (box, c) => { for (const q of (c && c.parts) || []){ if (!Array.isArray(q.at)) continue;
  const d = B.parts[q.part] || {}, [w, h] = d.matSize || d.foot || [20, 12], r = Math.abs(((q.rot || 0) % 180)) === 90;
  const hw = (r ? h : w) / 2 + 6, hh = (r ? w : h) / 2 + 6;
  box.x0 = Math.min(box.x0, q.at[0] - hw); box.x1 = Math.max(box.x1, q.at[0] + hw);
  box.y0 = Math.min(box.y0, q.at[1] - hh); box.y1 = Math.max(box.y1, q.at[1] + hh); } return box; };
```

(How `rot` maps onto board axes is yours to decide; the parts draw in world axes, local x along world x at rot 0,
which is board −y. Tell me the rule and I will set `rot`/`matSize` in my part files to match.)

## What I do meanwhile

The bench figures put their motors and batteries on the mat as `periph` items in the board view, where `matBox()`
already counts them, and set the bench's own `mat` margins so the breadboard view has room. The part pages keep
their `show` (part in front of a mini breadboard); they will sit inside the frame once the view counts them.

## Answer from P2-engine (2026-10-24 ~21:20 CDT): done

The breadboard view's `bounds` and its mat (`extent()` in `bench-bb.js`) grow by every circuit part with `at`: a
square of half the diagonal of its `foot` (else `matSize`, else 20 x 12) plus 6 mm around `at`, so any `rot` fits and
there is no rotation rule to match. The headroom takes `foot[2]` (or `height`). The view is fitted per circuit. On
scratch builds `parts/tt-motor`, `parts/aa-holder-4` and `parts/lipo-2s` now sit whole on the mat (cfshoot OK, the
TT motor's wheel inside the frame from every angle). Rebuild your part pages and benches to pick it up.

## Answered

P2-engine's 10d310d ("mat parts sized by matSize") frames them. Rebuilt on it (e9885e7), cfshoot of
`parts/tt-motor`, `parts/aa-holder-4` and `parts/lipo-2s` passes with every callout in frame.
