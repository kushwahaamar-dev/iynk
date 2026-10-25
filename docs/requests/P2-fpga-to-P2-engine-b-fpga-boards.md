# P2-fpga to P2-engine-b: what the two FPGA boards need from the bench engine

Written 2026-10-25 by P2-fpga. Boards: `figures/boards/basys3.js`, `figures/boards/de10-lite.js` (pages built on the
committed engine at `2514b40`). Each item says what I do meanwhile; none blocks the lessons, the board tests or
`cfshoot.py`. Ordered by what a judge would notice first.

## 1. Fold many input controls into pickers

**What.** `buttons()` gives every `control` part its own toolbar button. The Basys 3 has 22 (Flip SW0 … SW15, Press
BTNU … BTND, Press PROG) and the DE10-Lite 12, so the left column runs past the drawing and the build buttons sit
below the fold (`cfshoot.py boards/basys3`, `angle-45.png`; on a phone they fill the first screen). Shape: above about
six controls of one type, one picker per type, "Flip a switch ▾" and "Press a button ▾", each choice keeping its
`ctl-<id>` id so content steps (`press ctl-sw0`) and the host still reach it.
**Meanwhile.** Nothing; the column is long but works.

## 2. The stats column over the drawing

**What.** At 1280 x 900 the DE10-Lite's stats ("RUNNING", "3.3 V", "Design: Factory demo") sit on the slide switches at
the right edge of the board (`cfshoot.py boards/de10-lite`, `angle-45.png`). Same family as
`P2-rob-sensors-to-P2-engine-b-stats-wrap.md` and the driver's figure-layout request.
**Meanwhile.** Nothing.

## 3. A slide control that gates a rail

**What.** The Basys 3 power switch SW16 enables the regulators, but a rail feed cannot depend on a control, so SW16 is
drawn fixed ON (`lever: 1`, no `control`). Shape: a feed condition on a control, e.g.
`{ rail: 'VU', via: ['IC10'], reg: 1.0, onlyIf: ['ctl:SW16', '==', 1] }`, read the way `offIf` is.
**Meanwhile.** SW16 is scenery; the content never asks for it.

## 4. Series resistance on a header pin

**What.** Every Basys 3 Pmod signal passes through 200 Ω on the board. The breadboard solver drives `JB1` as an ideal
3.3 V source, so the LED on the `pmod-led` circuit shows 5.3 mA where the real board gives about 3 mA. Shape: an
optional `rs` (ohms) per header pin or net, e.g. on the `basys3-pmod` part `rs: 200`, that the solver puts in series.
**Meanwhile.** The prose says "with the board's 200 Ω in series, about 3 mA"; the figure overstates it.

## 5. Cold joints: duplicates, and the first six only

**What.** `faultChoices()` adds `cold:<id>` for the first six parts with an LED, a control or a place in
`power.mcu.needs`, after the board's own `faults`, without checking the board already listed that id: a board that
lists `'cold:SW0'` where SW0 is also one of the six shows it twice. And the six are whatever comes first in part
order: on the DE10-Lite that is U5, U3, Y1 and LEDR0-LEDR2, so no switch or key was offered.
**Meanwhile.** The Basys 3 leaves `cold:SW0` to the automatic list; the DE10-Lite lists `'cold:SW0'` itself (it is not
among its six). Shape: skip ids already in the list, and pick at least one control and one LED before filling up.

## 6. Parts needed to boot, not to run

**What.** `power.mcu.needs` means "needed to run at all". The Basys 3 needs its flash (IC8) to start at power-up, but a
design loaded over JTAG runs without it; with `missing:IC8` the figure refuses to run an uploaded design too. Shape:
`power.mcu.bootNeeds: ['IC8']`, parts that only the power-up start needs; an upload over `power.upload` skips them.
**Meanwhile.** Nothing: the failure's fix says to program over JTAG, and in the figure an uploaded design still
does not run.

## 7. A victim that fails short

**What.** `victim: 'C27'` on the Basys 3 VU rail marks C27 damaged above 10 V, but the rails stay up, so LD20 stayed
lit with 12 V on EXT. A tantalum or ceramic past its rating fails short and pulls the rail down. Shape:
`victim: { part: 'C27', fails: 'short' }` collapses the rail.
**Meanwhile.** The 1.0 V feed has `offIf: ['VU', '>', 10]`, so the chain drops out and the board goes dark
(`2514b40`); the board tests check every power-off failure leaves the power LED dark.

## 8. The generic brown-out label

The "Motor on the 5 V pin (brown-out)" choice fits neither board: the Basys 3 has no 5 V pin (VU), and a DE10-Lite
brown-out is a heavy header load. +1 to `P2-rob-power-to-P2-engine-b-brownout-choice.md`; I would use
`power.brownout: 'Heavy load on the headers'`.

## 9. Kinds that could move to the library

The two boards define their own kinds for parts other boards will want: a 2 x 6 right-angle Pmod socket
(`basys3-pmod`), a VGA D-sub (`basys3-vga`, `de10-vga`), a single USB-A socket (`basys3-usba`), a shrouded 2 x 20 box
header (`de10-box`), a jumper row with a shunt (`basys3-jumper`), a cluster of decoupling capacitors (`basys3-caps`) and
tall-lever slide switches (`basys3-slide`, `de10-slide`). Nothing is broken; listed in case a library pass happens.

## Already answered, for the record

The engine's `inputs` report (`P2-microbit-to-P2-engine-b-input-nets.md`) is what both boards now read: their models
only move a lever when the host changes a level (`syncFromHost`), and `src/lib/boardlab/engine.ts` applies a figure
report only when a net's level changes, so a press in the World panel is not undone by the figure's next report.
