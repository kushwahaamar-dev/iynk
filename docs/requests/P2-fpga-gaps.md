# P2-fpga: what is still short of perfect

Both FPGA boards meet the §4 board bar. The Basys 3 and the DE10-Lite each have a figure with board, breadboard,
schematic and power views, complete English prose, and five Verilog lessons. Each lesson's reference passes the app
check path at every chip value, and an empty design fails it (lesson table: 102/102 pass, 102/102 starters fail).
The Basys 3 has nine failures that change the figure and the DE10-Lite eight. Each board has an assembly sequence that
runs from bare PCB to a newly programmed design, and each lesson has a three-question quiz. `bom.ts` lists the parts,
and the prompt records are `figures/prompts/{basys3,de10-lite}.md`. Verilog drives the figures through
`CompileOptions.ports`: each lesson's port map lands port bits on the figure's nets (LD0, LEDR3, SW5, JB1, D3,
DIG0_A). These gaps are left.

1. **Engine items** (series resistance on Pmod pins, a power switch that gates a rail, boot-only parts, cold-joint
   choices, the control column, the stats over the drawing). → `P2-fpga-to-P2-engine-b-fpga-boards.md`.
2. **Figure strings.** The two pages show 374 strings that `src/i18n/figure-keys.json` does not list yet.
   → `P2-fpga-to-phase3-strings.md`.
3. **What the Verilog simulator does not do**, so no lesson uses it:
   - no `function`, `task` or `generate`;
   - no `inout`: the Pmod and Arduino-header ports are outputs only, so a design cannot read a button wired to JB2 or
     D2 (the push-button wireables say how to wire one, for the real board);
   - no UART, so the serial monitor stays empty for FPGA lessons;
   - no XADC or MAX 10 ADC, so the "analog" lessons are PWM;
   - no VGA timing or SDRAM model.
   A design that declares `parameter CLK_HZ` runs on a 100 kHz simulated clock with CLK_HZ overridden; one without it
   runs at the board clock, under the 400k-cycles-per-step budget. A design with no clock at all now costs nothing per
   cycle (`c082df0`).
4. **Unmeasured numbers**, each a modelling choice the fact sheets do not give:
   - `idleMa: 150` on both boards (neither maker publishes an idle current);
   - `brownoutVolts` is the figure's MCU rail minimum (2.9 V Basys 3, 3.0 V DE10-Lite), not a datasheet POR level;
   - the DE10-Lite's factory design: Terasic does not list the characters it shows, so the figure walks hex digits;
   - design sizes on the DE10-Lite (1 MiB) are illustrative.
5. **Estimated geometry.**
   - DE10-Lite: every position is measured from the manual's photo (about ±1.5 mm). U2, U3, Y1, the regulators, the
     op-amps and the diodes are placed near what they serve.
   - DE10-Lite connections: which end of JP1 is pin 1 is unknown; KEY0 over KEY1 is read from the silkscreen; what
     AREF and VIN connect to is undocumented, and the prose says so.
   - Basys 3: a few bottom-side parts are placed from the product photo.
6. **Not run here: the hardware path.** Both boards are programmed in the simulator only; nothing was tried on a real
   board (the hardware layer is out of scope for this wave).
7. **Commit `c71958a`'s subject swaps the failure counts.** The Basys 3 has nine and the DE10-Lite eight. History is
   not rewritten.
8. **Two other boards' tests fail in the shared working tree**, not from these boards (seen 2026-10-25 00:00 and
   again at 00:15):
   - `src/content/boards/nucleo-f401re.test.ts`, "a cold D13 joint drops blinks while the sketch runs on";
   - `src/content/boards/uno-r4.test.ts`, "a cold D13 header joint drops blinks while the sketch runs on".
   Both build their figure from the working-tree engine, which has uncommitted changes in `bench-bb.js` and
   `bench-solve.js`, after the header cold-joint change (`d13b0ef`). For the driver to route; I filed no request.
