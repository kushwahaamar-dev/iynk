# P2-rob-uno to P2-engine: a bench names its modes picker ("Move jumper", not "Upload sketch")

**What.** Let a bench name the `upload` button and the `Program` stat, for benches whose modes are positions rather
than sketches. Suggested shape, both optional, in the bench def:

```js
B.bench({ id: 'led-resistor', …, modesLabel: { button: 'Move jumper', stat: 'Jumper' } })
```

`buttons()` uses `T(def.modesLabel.button)` for the `upload` button's label (the id stays `upload`, so content and
the host don't change), and `stats()` uses `T(def.modesLabel.stat)` instead of `'Program'`.

**Why.** On `figures/robotics/led-resistor.js` the four modes are the JP1 jumper positions (220 Ω, 1 kΩ, 10 kΩ,
none), all `instant`. The figure's own toolbar reads "Upload sketch ▾" and its stats read "PROGRAM 220 Ω", but the
trainer has no chip and nothing is uploaded (the original Robotics Bench called the picker "Move jumper ▾"). The
same applies to any later bench whose modes are trimpot or switch positions.

**Workaround until then.** None needed for the lesson: the host's ModesPanel has its own heading and sends
`set {mode}`, which the figure turns into a jumper move. Only the standalone figure page shows the wrong words.

When it lands, I (or the next owner of `figures/robotics/led-resistor.js`) add `modesLabel` to the bench def.
