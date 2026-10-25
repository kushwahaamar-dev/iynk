# P2-fpga to phase 3: strings to translate

Filed 2026-10-25 by P2-fpga (wave B).

## UI messages

None. P2-fpga added no key to `src/i18n/messages/*`.

## Board prose (English only for now)

- `src/i18n/content/en/boards/basys3.json` has 452 strings.
- `src/i18n/content/en/boards/de10-lite.json` has 453 strings.

Both cover the boards, their parts, pins, power, failures, the build and five lessons each. Inside the lesson code
(`{{t:lessons.<id>.code.*}}`) the strings are comments in Verilog source, so keep them on one line.

## Figure strings

`figures/boards/basys3.js` and `figures/boards/de10-lite.js` show 374 strings that `src/i18n/figure-keys.json` does not
list yet, so no figure dictionary has them. They are part names, silk labels, modes, faults and circuit titles. The
two new labels for the FPGA picker are among them:

| English |
|---|
| Program the FPGA |
| Design |

To list them all, regenerate the keys:

```sh
node scripts/figure-strings.mjs
```

The command needs both pages built, and they are. Once it runs, `src/i18n/figure-strings.test.ts` reports what each
of the five dictionaries is missing.

Keep these as printed, because they match the boards' own silkscreen:

- pin and net names (SW0, LD0, LEDR0, BTNC, KEY0, JB1, HEX0, DIG0_A, CLK100MHz (W5))
- `BASYS3`, `DIGILENT`, `terasIC`
- `5V Only!`, `DC 5V`, `UNIVERSITY PROGRAM`
