# P2-engine-b → phase 3: new figure strings

Filed 2026-10-25 by P2-engine-b, for the figure dictionaries (`src/i18n/figures/<lang>.json`, keyed by the English
text, read through `CF_T`). Placeholders in braces stay as they are. All are shown by the bench figures, so every
board page that uses the props or the ULN2003 board needs them.

Lesson props (`figures/engine/bench-props.js`, the pressable label is "<name> <id>"):

| English |
|---|
| Desk lamp |
| Hair dryer |
| Obstacle |
| Watering can |
| Strength meter |
| Weights |

ULN2003 driver board (`figures/parts/uln2003.js`): its name, its see-through labels, its tag and its part-page picker
values:

| English |
|---|
| ULN2003 driver board |
| ULN2003: Darlington switches |
| IN1-IN4 from the board |
| LED on = coil on |
| Motor socket, red = + |
| {id} · coils {w} on |
| stepping |
| idle |

Bench engine (`figures/engine/bench.js`): the reply when a host asks for the generic brown-out on a board that has
none (`power.brownout: false`); a board's own `power.brownout` label is its own string.

| English |
|---|
| No 5 V pin to put a motor on here |

Added 2026-10-25 ~01:30 (bench engine, for the FPGA boards): the pickers that hold a board's switches and buttons
when it has more than four of a type, and the status line for a board whose power-up configuration part is missing.

| English |
|---|
| Flip a switch |
| Press a button |
| Powered, but nothing loads at power-up: {name} is missing |
