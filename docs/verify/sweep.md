# Bug sweep list (overnight, after gate 2)

Found while building phase 3; fixed by the driver or the sweep wave once wave B no longer owns the files. Each line:
where, what a user sees, and the cause where known. Struck through when fixed, with the commit.

## Figures

1. ~~`boards/pico`: pressing BOOTSEL while unplugged sets `st.boot = 'uf2'` and nothing clears it. Uploads still toast
   "Done uploading: … is running" but the program never runs (no serial, LED dark). A real Pico reboots into the
   program after the UF2 copy. (P3-prompts)~~ Fixed in 3a32102.
2. ~~`boards/pico`: the scenario supply "USB, with a 5 V sensor output on GP17" (echo5) has a range, so Break it lists
   "Too high/Too low a voltage" for it (6.6 V / 1 V), which reads oddly. `def.levels` is not read by the engine.~~ Fixed in 3a32102 (`scenario: true` on the echo5 supply).
3. ~~`boards/esp32-s3-devkitc-1`: `upload.also: ['usb']` is not implemented. Powered from the USB port only, Upload
   answers "Plug in USB first: uploads go over the cable".~~ Fixed in c3f6768.
4. ~~`boards/esp32-s3-devkitc-1`: Break it shows the raw id `gpio5v:GPIO4` as a label (`faultLabel` has no `gpio5v`
   case and the figure gives no `[id, label]` pair).~~ Fixed in c3f6768.
5. ~~`robotics/esp32-s3-build`: the sketch clock and serial keep running through the J2 cold joint and the brown-out,
   while the lesson says the board restarts (ROM banner, "Brownout detector was triggered"). `NET = 'GPIO38'` is
   hard-coded, so `?variant=v1.0` (RGB LED on GPIO48) leaves the LED dark.~~ Fixed in c3f6768.
6. ~~`boards/nodemcu`: the ESP8266 straps are not modelled; FLASH held while RST is released only reports boot
   "download" and the sketch keeps running.~~ Fixed in 26a5627, with the HUD reading "ROM download mode" since 78498dd.
7. ~~`parts/traffic-light`: the green lens disappears at yaw 45, 230 and 300 (depth sort in the part's draw).~~ Fixed in f3e5616.
8. ~~Part and module pages `soil-moisture`, `ssd1306`, `traffic-light`, `uln2003` have no figure number, so the title
   reads "Fig. — …".~~ Fixed in f3e5616 and a38332f.
9. ~~NodeMCU blink, web server (D1) and dimmer (D5) circuits and the ESP32-S3 dimmer and web-server circuits have no
   built-in mode that drives their LED on the figure page alone (the lesson page drives the pins from the
   interpreter, so the lessons themselves work). Check on the lesson pages at gate 3.~~ Fixed in 26a5627.

13. ~~`boards/uno-r3` distance lesson: the obstacle is drawn past the mat's edge at 200 cm, and the slider goes to 450 cm
    (the obstacle's scale in `figures/engine/bench-props.js`). (P2-req-host)~~ Fixed in `ac8675d` (on the mat at 450 cm).
14. ~~`boards/uno-r3` light and distance lessons: the figure's HUD reads "PROGRAM Blink" while those lessons' sketches
    run. (P2-req-host)~~ Fixed: the figure side in `74266e7`, the runner side (pins kept only once delivered, resent on `ready`) by the driver.
15. ~~`boards/nucleo-f401re` test "a cold D13 joint drops blinks while the sketch runs on" fails on the shared tree
    since about 00:20, with P2-engine-b's engine changes uncommitted; recheck once they land. (P2-req-interp)~~ Fixed in `eea3352` (the test counts the breadboard LED).
16. ~~micro:bit `microphone` LOUD/QUIET events never fire (`sound_level()` reads the input; the thresholds are not in `docs/facts`). (P2-req-interp)~~ Fixed in d4c4734.

## Figure strings

10. ~~Wave B's figures and the strings the old collector missed are not in the figure dictionaries.~~ The key list was
    regenerated (`a786238`, then `874d761` with the bench models' status and stats) and the five P3-figs-delta agents
    translated it (`wf_7bcff872-581`); the last 96 keys go out with the figure sweep's delta.
11. ~~Silkscreen text and on-screen labels share keys (fr: "MOTOR" on the TB6612FNG silkscreen also reads "MOTEUR"; "POWER", "ON", "OFF" stay English everywhere because of it). A separate silkscreen path that never translates would fix it.~~ Fixed in 74266e7 (silkscreen goes through `B.flatText`, never `CF_T`).

17. ~~de prose: `robotics/l298n.json` and `robotics/tb6612fng.json` call the bench "Prüfstand" (about 19 times); the UI,
    the figure and the other German prose say "Werkbank". de `boards/nano.json` and `boards/uno-r4.json` say "Serial
    hello" where the figure says "Serielles Hallo", and "Place a part" is still English in the de figure and three
    prose quotes. Fix once the P3-prose-de agents are done with `src/i18n/content/de/`. (P3-ui-de)~~ Fixed: "Werkbank"
    in nine files with the articles changed, „Bauteil einsetzen“ in the figure and the prose, „Serielles Hallo“.
18. fr register: `ai.json` (the lab partner) says tu, the rest of the site vous. Left as the partner's own voice;
    change it only if the whole site should say vous. (P3-ui-fr)

## Docs

12. ~~`figures/prompts/uno-r3-build.md` has a stray line break ("the\n  iron solders").~~ Fixed in the commit that struck this.

## From wave D (P3-docs-repo, P3-docs-pitch, 02:20)

19. ~~The octo opens on hover-high (its hoverLimit 0.7 was never applied).~~ Fixed in `7510152`.
20. ~~MAVProxy `status` says STABILIZE on the VTOL, which boots in MANUAL.~~ Fixed in `7510152`.
21. ~~"Fly it" on a drone's bench and "Back to the bench" on its fly page drop `?room=`, so they leave the room.~~
    Fixed in `265f60a`.
22. ~~The MCP server instructions tell Muse it can check Proof of Build credentials with `get_passport` while Solana
    is off.~~ Fixed in `a5c70e8`.
23. ~~`docs/hacktx/DEPLOY.md` still reads 7 boards and `/es/boards/uno-r3` 404; no `scripts/smoke-search.mjs`.~~
    Fixed in `a5c70e8`.
24. ~~14 board lessons have no quiz (pico 6, esp32-devkitc 3, esp32-s3-devkitc-1 3, nodemcu 2).~~ F-quiz-pico and
    F-quiz-esp, run `wf_78186578-fbd`.
25. `LiveCounter` (`/api/live`) isn't mounted on any page. Left: nothing in the demo path needs it.
26. The fly page has no "Share anonymous usage counts" toggle, though the setting applies everywhere; it is on the
    board, lesson, bench and drone pages. Left for the final pass (F-build-drones) if the spec wants it.
27. Two tabs of one browser profile share one name and one progress (localStorage), so the no-relay fallback needs
    two Chrome profiles to show two people; a phone on a LAN `http://` address can't record voice (getUserMedia needs
    HTTPS). Both are written into VIDEO.md and JUDGE-QA; the deploy (https, relay) removes them.
28. ~~`/api/status` says `solana: true` on this machine (`.env.local` has the issuer key and program id) while the
    client hides Passport and Verify unless the devnet Config account exists, reading devnet from every page (a 429
    became a console error, F-review N11).~~ The server checks the Config account (cached) and `/api/status` says
    `solana` only once it exists. For the deploy, leave the Solana vars out of Vercel unless phase 4 runs.
29. BUILD-PLAN §1's demo path doesn't match the build in three places (the Uno Blink lesson has no reversed-LED
    failure, that is `led-backwards` on `/robotics/led-resistor`; "Short 5V" leaves the board dark with a warm
    polyfuse instead of smoke; quad5 can't be under $150, the catalogue range is $330-370). PITCH.md and VIDEO.md
    follow the build; BUILD-PLAN §1 is left as the plan of record.

## From the final pass (03:00) and the driver

30. ~~NodeMCU: the emulator, the D0 pin note and the dimmer hint say D0 has no PWM; `docs/facts/nodemcu.md` says core
    3.x runs PWM on GPIO16.~~ Fixed in `c3a79ef`.
31. ~~BUILD-PLAN §1 step 1 "Reverse the LED" had no fault on the Uno.~~ `led-backwards` on the Blink circuit, `144053e`.
32. ~~`/boards`, `/drones/quad5`, `/about` without a language are Next's bare 404 (SH B3).~~ Redirected like `/`,
    `1fa6979`, with `e2e/redirects.spec.ts`.
33. Blink passes on the first Run without an edit (FE nit 1). Left: board lessons are worked examples whose param chips
    are the edit (BUILD-PLAN asks a failing starter only of bench tasks).
34. quad5, the demo drone, has only the three safety tests and no craft test (BUILD-PLAN: at least one per drone).
    Needs a figure button in `figures/drones/quad5.js`; after the figure sweep, which owns that file until then.
35. es: the bench status "OFF" stays English because the key is shared with the drone battery readout and the slide
    switch positions (P3-figs-delta-es). Left: OFF reads fine in Spanish next to the switch that says OFF.
36. Figure sweep (`scripts/workflows/sweep.md`, run `wf_7513ba0c-9cb`, 03:06-03:37): S-engine and S-figures found items
    1-9 and 11 already fixed by P2-engine-b and named the commits; 16 needed the interpreter (`d4c4734`). New: the
    `chrome` bridge message, the wiring sheet fitted to its plate, honest Build it for me toasts (swarm's too,
    `a4eaa1c`), templated button labels, the craft MSG tables. Pages rebuilt in `e509a55`.
37. Wing: the CHECKS stat in the figure reads 3/3 while the craft has five check buttons (S-figures). Left: the stat
    counts the engine's three safety tests, as on every craft.
