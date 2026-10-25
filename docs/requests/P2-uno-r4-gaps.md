# P2-uno-r4: what the UNO R4 still lacks (2026-10-24 ~21:00 CDT)

The board meets BUILD-PLAN §4 in English: prose for both variants, 7 lessons whose reference passes the app check
path (starter fails), 11 failures that change the figure's report (tested per variant), the assembly completing on
both variants, a quiz per lesson, the Build-it-for-real kit and a prompt record. What is left, none of it blocking:

1. **The DAC is not simulated.** `src/lib/interp/arduino/libs.ts` scales `analogWrite(DAC, v)` as 8 bits whatever
   `analogWriteResolution()` says, and `analogRead()` never sees the DAC voltage. Lesson 4 prints the level and the
   volts it computes itself, so it passes, but no check or pin readout can see A0's real voltage. The two-line fix is
   in `P2-uno-r4-to-P2-modules-r4-dac.md` (P2-modules' answer); `interp/arduino/**` has no owner in either wave, so
   the driver routes it.
2. **The `dac-wave` circuit** in `figures/boards/uno-r4.js` (P2-modules) still draws an A0 → A1 jumper and is titled
   "read back on A1"; the lesson no longer reads A1. Cosmetic.
3. **WiFi-only failure on the Minima.** `esp-download-strap` is listed on both variants (FailureMode has no
   `variants` field and the failure panel doesn't filter). Its title says "(UNO R4 WiFi)" and the Minima figure shows
   no change for it. A phase-3 idea: an additive `variants?: string[]` on FailureMode (schema owner) and a filter in
   `FailurePanel.tsx` (workspace owner).
4. **5 V into the 3.3V pin** is shown by the figure as 5 V fed in on that pin with nothing else (the whole board dark),
   because the engine has no "rail shorted to rail while powered" fault. The prose describes what a real board does
   (USB, and on the WiFi the bridge, die while ON stays lit).
