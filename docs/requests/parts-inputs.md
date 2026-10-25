# Requests from parts:inputs (rgb-led, push-button, potentiometer, ldr, tmp36, fsr402, piezo-buzzer)

The seven parts are in `figures/parts/<id>.js`, built into `public/figures/parts/<id>.html` (cfshoot clean), with
prompts in `figures/prompts/<id>.md`. Each part declares `params`, `elec`, `press`, `tag`, `draw`, `show` and
`defaults`; the requests below make the declared parts of that contract live.

## 1. engine:bench (`figures/engine/bench*.js`)

1. **Pressing a part on the breadboard.** Each part has `press(p, down)`, which returns a param patch (or `null`).
   On pointerdown on a part's drawing (`act 'bb'`), and on Enter/Space for keyboard users, please call
   `def.press(p, true)`; on pointerup or keyup call `def.press(p, false)`. Apply the patch with `B.bbParams`, and
   keep sending the `part` event as now. Today a click only selects the part, so the button can't be pressed in the
   scene. Here is what a press does for each part: push-button, held down while pressed; potentiometer, turns an
   eighth of its travel; ldr, steps the light (1, 10, 100, 1000, 10 000 lx); tmp36, a finger pinch (33 °C while
   held); fsr402, 10 N while held; piezo-buzzer, A4 (passive) or on (active) while held; rgb-led, steps red, green,
   blue, white, off.
2. **Part-page pickers.** Please read `def.steps[key]` (the picker values for a range) and `def.paramNames[key]`
   (the English label) before `rangeSteps` and `PARAM_NAMES`. Without them, the FSR offers 0/25/50/75/100 N (its
   range is 0.2-20 N), the buzzer offers 1 Hz and 10 Hz (tone() starts at 31 Hz), and the labels read "TempC".
3. **Frame the part on its page.** The parts are 5-12 mm across on a 46 mm mini breadboard, so they show tiny at
   100 % zoom. Please fit the view to the part's box plus about 10 mm of breadboard.
4. **Bounds include part heights.** The FSR 402 stands about 50 mm above the breadboard, and the breadboard view's
   headroom is `md.height + 10`.
5. **Draw context.** Please pass `k` (the see-through ease) to breadboard-part `draw`, and `solo: true` on part
   pages. The parts fall back to `ease(st.xr)` and `B.md.def.partPage` for now.
6. **Solver.** These are the `elec` declarations to support. Until then, the parts draw from their params and
   carry no current, as §8 says.
   - push-button: `{type:'button', pressed, pairs:[[0,1],[2,3]], imax:.05, vmax:24, bounce:.005}`. Each pair is
     always joined, and `pressed` joins the two pairs. A switched pair that lands in one strip shorts the switch:
     please report `meas.state = 'shorted'`, which the tag reads as "always closed: turn it 90°".
   - potentiometer: `{type:'pot', ohms, pos, pmax:.05}`. The legs are [end 1, wiper, end 3]; R(1-W) = ohms × pos
     and R(W-3) = ohms × (1 − pos). Please report `v` (the wiper volts), `state:'hot'` when a segment takes more
     than `pmax`, and `'burnt'` once it has been hot for about 2 s.
   - ldr and fsr402: plain `{type:'res', ohms}`. The ohms follow `lux` / `force` (the curves are exported as
     `def.ohmsAt`). Dividers need node voltages, not only LED series paths. Please report each analog pin's volts
     so the host's `analogRead` matches the figure.
   - rgb-led: an array of three `{type:'led', ch, legs:[anode, cathode], vf, imax}` (leg indices; the common lead
     is leg 1). Please report `meas[id] = {state, i_mA, ch:{R:{i_mA,state}, G:{…}, B:{…}}}`. The part draws
     `m.ch`.
   - tmp36: `{type:'sensor', model:'tmp36', supply:[0,2], out:1, vout, vmin:2.7, vmax:5.5, vabs:7, iq:5e-5,
     polar:true}`. This is a voltage source on leg 1 while the supply is in range. Reversed: `state:'hot'`, then
     `'dead'` after about 3 s of virtual time (it stays dead). Below `vmin`: `'low'`. Above `vabs`: `'dead'`.
   - piezo-buzzer: `{type:'buzzer', kind:'passive', polar:false, farads:2e-8, fres:4000}` or `{type:'buzzer',
     kind:'active', polar:true, imax:.03, vmin:3, vmax:8, fixed:2300}`. Please report `f` (the Hz of the square
     wave on +) and `v` (the steady volts across), and `state:'reverse'` for an active one put in backwards.
     `def.sound(p, m)` turns those into what it sounds like. The tone frequency has to reach the figure, so please
     add `set {tones: {D8: 440}}` (interpreters would send it) or let `pins` carry `{f}`.
7. **Circuit-part faults.** For the polar parts (tmp36, rgb-led, an active buzzer), please support
   `reversed:<circuit part id>` (swap its holes), and `missing:<id>` for a series resistor (an RGB colour then
   burns).

## 2. Owner of `src/i18n/figures/<lang>.json`

Please add these keys to the five non-English files, keyed by the English text, with the `{…}` placeholders kept.
They are pulled from the seven files at 14:20.

```json
["Blue duty","Brass disc","Carbon track","CdS track","Centre: pins 3–4","Ceramic base","Comb electrode",
"Common anode cup","Common cathode cup","Common lead","Force (N)","Force sensor (FSR 402)","Force-sensing ink",
"Gold bond wires","Green duty","Lead frame","Light sensor (LDR)","Oscillator","Piezo buzzer","Piezo ceramic",
"Plunger colour","Potentiometer","Push button","Put in backwards","RGB LED","Red duty","Red, green and blue dies",
"Ring to pin W","Ring: pins 1–2","Silicon die","Silver fingers","Snap dome","Sound hole","Spacer, air vent",
"Steady HIGH","Temperature (°C)","Temperature sensor (TMP36)","Tone (Hz)","Type","Wiper","active","anode","black",
"blue","cathode","green","no","passive","red","white","yellow","yes",
"{id} · R {r} · G {g} · B {b} mA","{id} · always closed: turn it 90°","{id} · backwards: burning hot",
"{id} · backwards: dark","{id} · backwards: silent","{id} · contacts burnt","{id} · destroyed",
"{id} · hot: 5 V shorted through the track","{id} · no force · open","{id} · one click, then silence: use tone()",
"{id} · overheated","{id} · pressed","{id} · released","{id} · rough buzz: an active buzzer wants a steady HIGH",
"{id} · silent","{id} · supply too low","{id} · track burnt","{id} · {ch} burnt","{id} · {c} °C · {v} V",
"{id} · {hz} Hz","{id} · {hz} Hz ({note})","{id} · {lux} lx · {r}","{id} · {n} N · {r}","{id} · {pct} %",
"{id} · {pct} % · {v} V"]
```

## 3. Hosts of the Inspect dialog (ui agents) and sound (src/lib/sound)

Part pages accept `set {params: {P1: {…}}}` with these keys. Ranges take any number inside them; lists take only
their values.

| Part | Params |
|---|---|
| push-button | `pressed` 0..1, `color` black/red/yellow/green/blue/white |
| potentiometer | `pos` 0..1 (0 = wiper at pin 1), `ohms` 1 k..1 M |
| ldr | `lux` 0..100 000 |
| tmp36 | `tempC` −40..150, `reversed` false/true |
| fsr402 | `force` 0..100 N |
| rgb-led | `common` cathode/anode, `r`, `g`, `b` 0..1 (duty) |
| piezo-buzzer | `kind` passive/active, `freq` 0..20 000 Hz, `on` 0..1, `reversed` false/true |

The buzzer figure does not emit `sfx` for tones. Please play the pitch from the interpreter's `tone()` on a board,
and from `freq` on the part page.

## Answer from P2-engine (2026-10-24 ~21:00 CDT)

**§3 sound (engine side): done** (`e61a5b8`). `set {tones: {D8: 440}}` reaches the buzzer on that pin's node (`m.f`,
and `m.v` the average volts across). After every solve the engine asks each part with `def.sound(p, m)` and keeps the
loudest: `state.sound = { part, hz, loud, how } | null`, and a bridge event `tone` `{ part, hz, loud, how }` whenever it
changes (`hz: 0` = silence). A part page plays its `freq` param the same way. Playing it is the host's: asked in
`P2-engine-to-P2-social-sound-readout.md` (the host also has to send `tones` to the figure; today it plays the
interpreter's pitches without asking whether a buzzer is wired).

Also done from §1 (`e61a5b8`):
1. Pressing a part: pointerdown on its drawing calls `def.press(p, true)`, pointerup `def.press(p, false)`; the patch
   goes through `B.bbParams`. On the standalone page the off-screen part buttons do the same with Enter/Space.
2. Pickers read `def.steps[key]` before the generic steps (`paramNames` was already read, v5).
4. Bounds: the headroom takes `foot[2]` or `def.height` (the FSR has neither yet: give it `height: 50`).
5. `draw` gets `k` and `solo`.
6. Solver: `button` (pairs joined, pressed joins the pairs, `m.state = 'shorted'` when a switched pair is already
   joined), `pot` (two segments; `m.v` the wiper volts, `hot` above `pmax`, `burnt` after 2 s hot), `res` for the LDR
   and FSR (`open` skips it), `led` arrays for the RGB LED (`m.ch.R/G/B` with `{ i_mA, state }`), `sensor` tmp36 (a
   source on VOUT while VS is in range; `low`, `hot` reversed, `dead` after 3 s reversed or above `vabs`), `buzzer`
   (passive open at DC; active a polar load of `imax`; `reverse` backwards). Every pin and input net in the circuit
   reports its average volts in `state.volts` (`{ A0: 2.47, D2: 0 }`), for `analogRead` and `digitalRead`.

Not done: 3 (framing the part page on the part alone) and 7 (`reversed:`/`missing:` for circuit parts; no content
sends them yet). Both in `P2-engine-gaps.md`.
