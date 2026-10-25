# Bug sweep list (overnight, after gate 2)

Found while building phase 3; fixed by the driver or the sweep wave once wave B no longer owns the files. Each line:
where, what a user sees, and the cause where known. Struck through when fixed, with the commit.

## Figures

1. `boards/pico`: pressing BOOTSEL while unplugged sets `st.boot = 'uf2'` and nothing clears it. Uploads still toast
   "Done uploading: … is running" but the program never runs (no serial, LED dark). A real Pico reboots into the
   program after the UF2 copy. (P3-prompts)
2. `boards/pico`: the scenario supply "USB, with a 5 V sensor output on GP17" (echo5) has a range, so Break it lists
   "Too high/Too low a voltage" for it (6.6 V / 1 V), which reads oddly. `def.levels` is not read by the engine.
3. `boards/esp32-s3-devkitc-1`: `upload.also: ['usb']` is not implemented. Powered from the USB port only, Upload
   answers "Plug in USB first: uploads go over the cable".
4. `boards/esp32-s3-devkitc-1`: Break it shows the raw id `gpio5v:GPIO4` as a label (`faultLabel` has no `gpio5v`
   case and the figure gives no `[id, label]` pair).
5. `robotics/esp32-s3-build`: the sketch clock and serial keep running through the J2 cold joint and the brown-out,
   while the lesson says the board restarts (ROM banner, "Brownout detector was triggered"). `NET = 'GPIO38'` is
   hard-coded, so `?variant=v1.0` (RGB LED on GPIO48) leaves the LED dark.
6. `boards/nodemcu`: the ESP8266 straps are not modelled; FLASH held while RST is released only reports boot
   "download" and the sketch keeps running.
7. `parts/traffic-light`: the green lens disappears at yaw 45, 230 and 300 (depth sort in the part's draw).
8. Part and module pages `soil-moisture`, `ssd1306`, `traffic-light`, `uln2003` have no figure number, so the title
   reads "Fig. — …".
9. NodeMCU blink, web server (D1) and dimmer (D5) circuits and the ESP32-S3 dimmer and web-server circuits have no
   built-in mode that drives their LED on the figure page alone (the lesson page drives the pins from the
   interpreter, so the lessons themselves work). Check on the lesson pages at gate 3.

## Figure strings

10. Wave B's figures and the strings the old collector missed (1291 at `a516233`, e.g. the drone message tables, bench
    status words, "Off", craft logs) are not in the figure dictionaries yet: regenerate `figure-keys.json` after
    `cfbuild.py --all` and have T2's P3-ui agents add them.
11. Silkscreen text and on-screen labels share keys (fr: "MOTOR" on the TB6612FNG silkscreen also reads "MOTEUR";
    "POWER", "ON", "OFF" stay English everywhere because of it). A separate silkscreen path that never translates
    would fix it.

## Docs

12. ~~`figures/prompts/uno-r3-build.md` has a stray line break ("the\n  iron solders").~~ Fixed in the commit that struck this.
