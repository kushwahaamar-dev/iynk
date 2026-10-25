# Requests from item:whoop (Tiny Whoop 65 mm, Drone Lab Fig. 02)

## To engine:drone

1. **Motor and prop details at whoop scale** (figures/engine/drone-pieces.js, `K.motors`, `K.props`).
   The shaft (r 2.5 mm x 7 mm), the prop hub (r 6 mm x 5.5 mm plus a r 4.2 mm nut), the three bell spokes (from
   r 3.5 mm) and the 3 mm motor base are fixed 5-inch sizes. On a 0702 whoop motor (bell 9.5 mm across, 1 mm shaft)
   and a 31 mm prop (hub about 4 mm across, no nut) they are out of scale: the shaft is five times too thick, the hub
   pokes above the duct rim, and the spokes run backwards (R - 2.4 < 3.5). Please derive them from the chosen motor
   and prop (for example shaft r = bell d x 0.06, hub r = max(1.8, prop d x 25.4 x 0.06), spokes from bell r x 0.35,
   base h = bell h x 0.25), or accept optional `motors[k].shaft: [d, l]`, `motors[k].base: h` and
   `props[k].hub: [d, h]`. Until then the whoop draws its motors and props with `custom` pieces that follow the
   engine's own conventions (spin from `ctx.spin`, `ctx.rpm`, mirrored pitch on `PROPS` orientation 1, a disc when
   spinning, the stator in see-through).
2. **Per-craft message overrides** (`craft.messages`, today only `powered`). The whoop has no electrolytic
   capacitor: its `XT60` part is the BT2.0 battery pigtail on the AIO's pads, and its mistake is a pigtail soldered
   the wrong way round (reverse polarity). The texts `MSG.pop`, `MSG.smokeShort`, `MSG.faultFix`, `MSG.smokeNeeds`,
   `MSG.plugNeeds` and `LOG.pop`, `LOG.capNew` talk about a capacitor. Please let `craft.messages[key]` override any
   `MSG` key and `craft.logs[key]` any `LOG` key (same lookup as `powered`), so the craft can say
   "POP: the pigtail was soldered red-to-minus ..." The whoop file already sets `messages` and `logs`.
3. The battery lead drawn when plugged (`K.battery`, `ctx.xt60At`) is always a yellow XT60. A `plug` field on the
   battery piece (`'xt60' | 'xt30' | 'bt2'`, default `'xt60'`) would let small crafts draw their own connector. The
   whoop draws its BT2.0 plug itself and never sets `ctx.xt60At` outside the smoke test, so nothing breaks meanwhile.

4. **The palette never reaches the pieces.** `SD.mat('pal')` reads `SD.G.pal`, which stays `'tomato'`: the core
   calls `cfg.scene(st, PALS[st.pal])`, but `scene(st)` in drone.js never copies `st.pal` into `G.pal`. Every
   `'pal'` part of a mint craft (the whoop's frame and ducts) is drawn tomato, and the colour swatches do nothing.
   Fix: `G.pal = st.pal || craft.palette;` at the top of `scene(st)` (and of `SD.sheet`).
5. **Craft checks for craft buttons.** A craft button (`buttons[].onClick(api)`) can say, log and play a sound, but
   it cannot report a result, so a host `DroneTest` with `button: 'rxtest'` has no state to wait for. Please add
   `api.pass(id)` (and `api.fail(id)`) that set `st.checks[id] = true | false`, report them as `state.checks`, and
   clear them on `strip`, `step 0` and when a part the craft lists in `buttons[].needs` comes off. The whoop's
   `rxtest` and `failsafe` buttons already call `api.pass(id)` when it exists, and its content uses
   `done: { 'checks.rxtest': true }` and `{ 'checks.failsafe': true }`.

## To the Drone Lab host (ui:dronelab)

- The whoop has no barometer: its `alt` flight mode is a simulator aid, not a Betaflight mode. The content marks it
  with the hint text `flight.modes.alt.hint`; please show that hint next to the mode picker.

P2-flight (2026-10-24), to the Drone Lab host: done. The fly page shows the selected mode's own `hint` from the
content under the mode picker (FlightRange `courseText.hints`), so the whoop's `alt` hint appears there.
