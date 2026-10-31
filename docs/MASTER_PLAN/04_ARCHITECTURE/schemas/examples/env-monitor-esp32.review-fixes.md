# env-monitor-esp32 example: review log

The project file is JSON and cannot hold a log, so the section lives here, next to it.

## Review fixes (2026-10-27)

### Issue 1 [high]: part refs do not match the component catalogue. Applied.

Evidence read: `03_PRODUCT/COMPONENT_ECOSYSTEM.md` row 16 (`core.bme280-module`) and row 37 (`core.supply-bench-dc`); `schemas/examples/components/` held only led, l298n, mpu6050 and dc-gear-motor; `component.schema.json` (pin, parameter, simulation rules); `docs/facts/la-components.md` sections 17 and 27; `src/lib/interp/devices.ts:173`; `figures/engine/bench-solve.js:89`.

| Old ref | New ref | Why |
|---|---|---|
| `core.bme280-breakout` | `core.bme280-module` | Ecosystem row 16 |
| `core.bench-supply` | `core.supply-bench-dc` | Ecosystem row 37 |
| `core.ssd1306-i2c-128x64` | `core.ssd1306` | The ecosystem names the display `ssd1306` (section 3.3 and `legacy_ids`), no row gives a core id. The 128 x 64 size is a fact of the part, not of its id |
| `core.resistor` | unchanged | The ecosystem lists "resistor" as carry-over without a core id; the id follows the `core.<name>` pattern used by `core.led-5mm` |
| `core.esp32-devkitc` | unchanged | Same: carry-over board, `BOARD_IDS` in `src/content/ids.ts` |

Five new descriptors in `schemas/examples/components/`, each valid against `component.schema.json` and `semantic.mjs`: `bme280-module`, `supply-bench-dc`, `ssd1306`, `resistor`, `esp32-devkitc`.

`dependencies.components[].interface` is now derived from those files by rule: pins keep id, designator, type; a board's pins also keep `header` from the connector; params come from `parameters`; groups from `groups`. The old snapshots were invented. The ESP32 pin table is the one they held, now backed by a descriptor. The `net` field on board pins is dropped: the descriptor has no field to derive it from (`InterfacePin.net` is described as legacy; open point for the PDM owner).

One pin changed: the BME280 power pin is now `VCC`, not `VIN`, to match the 6-pin GY-BME280 breakout in the fact sheet (section 27). `nets` and `views` were updated to match.

Checks run: `project.schema.json` validation passes; every dependency matches its descriptor (id, version, interface); every pin used in `nets` and `views` exists in the interface of its part; every placed part has a dependency. Result: 0 problems.

### Honesty labels in the new descriptors

| Part | Status | Reason |
|---|---|---|
| `core.supply-bench-dc` | not-modelled-yet, tier none | No `voltage_source` element in the solver (ecosystem row 37) |
| `core.bme280-module` | partly-modelled, T1, test `to-write` | No bme280 device in `src/lib/interp`; planned in ecosystem row 16. The example's tests c2 and c3 need it |
| `core.ssd1306` | partly-modelled, T1, test `to-write` | `Ssd1306` exists (`devices.ts:173`); no test mentions it |
| `core.resistor` | partly-modelled, T1, test `to-write` | `res` exists (`bench-solve.js:89`); no test stamps it |
| `core.esp32-devkitc` | partly-modelled, T1, test `to-write` | Interpreter profile exists; the chip is not modelled |

The PARTS gate fails any part with a `to-write` test, so these five are examples, not release content.

### Left for others

- `WALKTHROUGH.md` lines 58, 142 and 391 still say `core.bme280-breakout`, `core.ssd1306-i2c-128x64` and `core.bench-supply`. I did not edit it.
- `COMPONENT_ECOSYSTEM.md` has no rows for `core.resistor`, `core.esp32-devkitc` or `core.ssd1306`. It should name them.
- The ESP32 source is second-hand (UNKNOWN until the Espressif documents are read); `identity.generic` is false, so a primary datasheet must replace it before release.
- The interface-drift CI script does not exist yet. The derivation rule above is the spec for it.
