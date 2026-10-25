# P2-nucleo: gaps in the Nucleo-F401RE board

The board meets the §4 bar (figure with board, breadboard, schematic and power views; English prose; 5 lessons that
pass the app check path and fail the starter; 14 failures; an 11-step assembly that completes; a quiz per lesson; the
prompt record). What is simplified or unverified:

1. **`power.idleMa: 45` is an estimate.** UM1724 and DS10086 give no whole-board idle current. 45 mA is the ST-LINK
   (STM32F103 at 72 MHz) plus the F401 at 84 MHz running from flash, plus LD3. Measure a board with a USB meter and
   replace it.
2. **`cold:CN5.6` also flickers LD2 in the figure.** On the real board LD2 hangs off PA5 through R31 on the PCB, so a
   cold joint on the CN5 header pin only breaks the breadboard LED. The bench engine's `cold:<pin>` fault cuts the
   whole net's output, LD2 included. Owner: P2-engine-b (a `cold:<pin>` that only cuts the wire side of the header).
3. **The JP5 cap moves itself.** On the board the user moves the JP5 cap from 1-2 (U5V) to 2-3 (E5V) before using VIN
   or E5V. The figure models one cap that sits on 2-3 whenever VIN or E5V is the chosen source, so "VIN with the cap
   still on 1-2" (board stays dark) is not a failure you can pick.
4. **C16 is in the VIN feed's `via` list.** That lets "C16 fitted backwards" take the rail down, but it also means a
   missing C16 kills the VIN path in the sim; the real board would still run, just with less input filtering.
5. **Figure presses of B1 don't reach a lesson run yet.** B1 is a `control.action: 'input'` on net PC13 (active 0),
   but during a lesson run the interpreter only sees the World panel's button. P2-microbit already filed this for the
   engine (`docs/requests/P2-microbit-to-P2-engine-b-input-nets.md`); the Nucleo needs nothing more once that lands.
6. **HC-SR04 trigger at 3.3 V is unverified on a classic (EM78P153) module.** TRIG reads 3.3 V as HIGH in practice;
   the hcsr04 fact sheet marks the EM78P153S V_IH as unverified. ECHO into D8 (PA9) is fine: every F401 GPIO is FT
   while it is a digital input.
7. **Commit `1034385` gives the wrong reason in its message.** It says DS10086 marks PH0/PH1 "TC"; the table marks
   them FT and the footnote drops FT "in analog mode or oscillator mode". The change itself (PH0/PH1 not 5 V tolerant
   on this board, where PH0 takes the ST-LINK's 8 MHz MCO) is right.
8. **Prose is English only.** The other five locales come in phase 3; the crawl lists them under "figure strings not
   translated yet" for all 30 non-English Nucleo pages.
