# iynk demo video

Devpost needs a demo video before the deadline. Target length: 2:55, under three minutes. Record 08:30–10:00 on
Sunday, upload by 10:00, submit the Devpost entry by 10:30.

The video tells the same story as the live pitch (`docs/hacktx/PITCH.md`: Maya, a burnt-out LED, Lucía answering in
Spanish) over the demo path in `docs/hacktx/BUILD-PLAN.md` §1, with the exact clicks. It is written to be recorded on
a local production build with the keys in `.env.local` and the relay running on the same laptop, so nothing depends on
the venue or on the deploy. Every click was checked against the pages at 1920×1080 at gate 3, on 2026-10-25 at 06:00
CDT (`docs/verify/gate3.md`); values in [BRACKETS] and the lines that need a key are listed in "Confirm before
recording".

No Solana and no hardware twin: both were skipped, and their tabs stay hidden.

## Local setup

1. `.env.local` holds `META_API_KEY`, `SERPAPI_KEY`, `DATABASE_URL` (optional: the leaderboard) and
   `NEXT_PUBLIC_REALTIME_URL=ws://127.0.0.1:43117/ws`. `NEXT_PUBLIC_*` is baked in at build time, so set it first.
2. With a database: `node scripts/db-migrate.mjs` once, so the leaderboard has its tables.
3. Terminal 1, the relay: `cd server/realtime && node server.js --port 43117`. `http://127.0.0.1:43117/healthz` answers
   `{"ok":true,...}`. With `REALTIME_ALLOWED_ORIGINS` unset it accepts pages on `localhost`.
4. Terminal 2, the app: `npm run build && npm run start`, then open `http://localhost:3000`.
5. Check `http://localhost:3000/api/status`: `ai`, `image`, `voice`, `search` and `realtime` true (`db` too with a
   database; `solana` stays false).
6. Two Chrome profiles side by side, both on `localhost` (a secure origin, so the microphone works):
   - **Maya**: English, the main recording window, 1920×1080.
   - **Lucía**: a second profile, Spanish (`/es/...` pages), display name "Lucía". Before the first take, open
     `/es/boards/uno-r3/blink`, press Ejecutar (Run) and wait for every check to pass: the partner asks her because her
     progress shows Blink done.

   One profile can't play both: two tabs of one profile share one saved name and one progress.
7. Sound on in Maya's window (the speaker button beside Lab tools, top right of each lab page), so the pop and the
   flight are heard.

Optional: once the deployed site and the relay are up, film Lucía's half on a real phone over HTTPS instead. A phone on
a plain `http://` LAN address can't use the microphone.

## Before each take

- Rooms: on Maya's Blink lesson, Lab tools, Together, "Start a room"; note the code as [ROOM_A]. Open the same lesson in
  Lucía's window with `?room=[ROOM_A]` (Spanish). Do the same on `/en/drones/quad5/fly` for [ROOM_B].
- Break it all off on both pages (the board's Repair button; the fly page's "Undo my changes").
- quad5 back on its default design (Battery 6S 1100 mAh, Motors 2306 1750KV, Props 5x4.3x3). Just before shot 7,
  press "Build it for me" on `/en/drones/quad5` so the quad stands on the bench: a reload empties it again.
- `/api/status` as in step 5. If a feature is off, drop its shot and its line. Don't fake it in editing.

## Shot list

Each shot has what's on screen, the clicks, and the voice-over line (VO). Times are positions in the finished cut.

### 1 · 0:00–0:08 · Cold open

- Screen: `/en/boards/uno-r3`, the figure full frame on its paper background.
- Clicks: drag the figure round slowly (or press E). No other cursor movement.
- VO: "Hardware is the most fun you can have with a computer. It's also the most expensive, scary and lonely way to
  learn."

### 2 · 0:08–0:18 · Meet the lab

- Screen: the same figure.
- Clicks: See-through. A beat later, Exploded view. Then cut to `/en` for two seconds: the three labs and their counts.
- VO: "Picture Maya. She wants to build a drone, but parts cost money, batteries can catch fire, and at 2 a.m. there's
  nobody to ask. iynk is a lab she can use tonight, free, in her browser."
- On screen: "iynk" in the lower left.

### 3 · 0:18–0:28 · Blink

- Screen: `/en/boards/uno-r3/blink?room=[ROOM_A]`, code panel beside the figure, serial monitor visible.
- Clicks: Run (or Space). The LED blinks and the Serial tab says Running; then the Checks tab, under the code, reads
  "All checks pass. Lesson done."
- VO: "She wires her first LED and runs Blink. That's Arduino code, on a virtual clock in her browser, and the figure
  follows every pin."

### 4 · 0:28–0:38 · Break it

- Screen: the same, with the Break it tab open under the code.
- Clicks: "LED with no resistor", Trigger. One bright flash, then dark; the figure's note says how many milliamps did it
  ("LED1 burned out: 113 mA …", a few seconds) and the readout under the figure says "LED1: burnt out". Hold two
  seconds on the "What you see / Why / Fix" text.
- VO: "Then the classic mistake: no resistor. One bright flash, and the LED is gone. Break it shows what you'd see,
  why it happened, and the fix."

### 5 · 0:38–0:52 · The partner asks a person

- Screen: Lab tools open on the Partner tab, beside the figure and the code.
- Clicks: type "My LED flashed once and died" and send. The LED is pointed out in the figure. "Asked Lucía to explain"
  appears, and the question shows in the room chat.
- VO: "She asks the lab partner, built on Meta's Muse Spark. It reads her circuit, her code and the fault, and points
  at the LED. It sees that her roommate Lucía passed this lesson, so before it answers, it asks Lucía."

### 6 · 0:52–1:08 · Lucía answers in Spanish

- Screen: split, Maya's window on the left, Lucía's (Spanish) on the right.
- Clicks, Lucía: Together tab, the question in Spanish in the room chat. "Grabar un mensaje de voz" (Record a voice
  message), say the line, then stop and send. On Maya's side the message lands in English, marked "Translated from
  Spanish". Maya: Repair, Run. It blinks.
- Lucía, in her own voice: "Ponle una resistencia de 220 ohmios al LED."
- On screen, under her line: "Put a 220 ohm resistor on the LED."
- VO: "Muse Voice Transcribe hears her, Muse Spark translates, and Maya reads it in English. Fixed, with help from a
  person."

### 7 · 1:08–1:17 · The drone

- Screen: `/en/drones/quad5`, the Design tab, and the quad built on the bench (see "Before each take").
- Clicks: Battery to "6S 1800 mAh LiPo". The tiles update: All-up weight, Thrust : weight, Hover throttle, Hard-flying
  time.
- VO: "Now the drone. A 5-inch freestyle quad, with the numbers live: weight, thrust to weight, hover throttle, flight
  time."

### 8 · 1:17–1:35 · Build it for real

- Screen: Lab tools, tab "Build it for real".
- Clicks: Battery back to 6S 1100 first. The parts list loads with each offer's store and the Cheapest total. Drag
  Budget to $280; "Best build within $280" lists the swaps. Press "Use this build in the lab"; the Design tiles
  change.
- VO: "Build it for real pulls live prices for every part from Google Shopping, Amazon and eBay through SerpApi. Today
  that's $291.50. With $280, the optimiser runs the drone maths on every combination and swaps the 6S 1100 mAh battery for a 4S 1500, so it
  still flies."
- On screen, small: "Prices checked [DATE, TIME]".

### 9 · 1:35–1:42 · Near you

- Screen: Near you, below the parts list.
- Clicks: type "Austin, TX", Search. Scroll through Makerspaces and Flying fields, then Maker events.
- VO: "SerpApi's Maps and Events searches find her a makerspace, a flying field and a meetup nearby."

### 10 · 1:42–2:00 · Fly with Lucía's ghost

- Screen: `/en/drones/quad5/fly?room=[ROOM_B]`, third-person view, Gate race.
- Clicks: in Lucía's window, Flight mode "Demo" and Arm: her craft flies the course. In Maya's window, Space to arm,
  W for throttle, the arrows to fly through the first gates beside the ghost with Lucía's name. Press V for two seconds
  of FPV goggles, then V again.
- VO: "Then she crashes it for free. That ghost with the name tag is Lucía's lap, live over our relay. Press V for the
  pilot's view."

### 11 · 2:00–2:20 · Break it in flight

- Screen: the same page.
- Clicks: Space to disarm, "Reset to the pad". Break it: switch on "Mount the flight controller backwards". Flight mode
  "Demo: the autopilot flies it", Arm. It flips on take-off; "Here's why" opens and the replay plays with "REPLAY ×⅓".
  Press "Turn the flight controller round", then Arm: it flies the course.
- VO: "Break it here too: the flight controller mounted backwards. It flips on take-off, replays in slow motion and
  says why. One click fixes it."

### 12 · 2:20–2:27 · Medals and the daily challenge

- Screen: the course list ("Gold 10 s · silver 14 s · bronze 20 s") and the Daily challenge card, then the
  Leaderboard if the database is set.
- VO: "Every course has medal times, and there's a daily challenge, the same for everyone."

### 13 · 2:27–2:38 · The story

- Screen: back on the Blink lesson, Lab tools, the Partner tab.
- Clicks: Build Story, then "Write our Build Story". "Writing your story…", then "Drawing the cover…", then the story
  with its cover and "Lucía helped Maya". Hover Share; press Download PNG.
- VO: "At the end, Muse Spark writes the session up as a story, what broke and who helped, and Muse Image draws the
  cover."

### 14 · 2:38–2:50 · Everything else

- Screen: a montage, one to two seconds a clip:
  - `/en/boards/basys3/counter`: Run, the Verilog counter on the LEDs.
  - `/en/robotics/uno-r3-build`: the step "Solder the through-hole joints".
  - `/en/drones/wing/fly`: Flight mode Demo, Arm.
  - `/en/drones/octo/fly`: in the air, Flight mode "Motor out": it keeps flying on seven.
  - The Language menu: Hindi, then Chinese, on `/hi/robotics/esp32-s3-build` and `/zh/robotics/esp32-s3-build`.
- VO: "Twelve boards, including FPGAs running Verilog. Thirteen robotics benches. Thirteen drones. Six languages."

### 15 · 2:50–2:55 · End card

- Screen: paper background, "iynk", [SITE], and a QR code to it.
- VO: "iynk. Nobody builds alone."
- On screen: "Built at HackTX 2026 · Muse Spark, Muse Image, Muse Voice Transcribe · SerpApi · Figures made with
  Colorfigures (MIT) · Code written during the event with Claude Code". Add Vultr and Tiger Data only if the relay and
  the leaderboard in the final cut ran on them.

## Voice-over in one piece

Read this straight through when you record. Leave a breath between paragraphs so each line can move to its shot.
Lucía's Spanish line is recorded live in shot 6, not here.

> Hardware is the most fun you can have with a computer. It's also the most expensive, scary and lonely way to learn.
>
> Picture Maya. She wants to build a drone, but parts cost money, batteries can catch fire, and at 2 a.m. there's
> nobody to ask. iynk is a lab she can use tonight, free, in her browser.
>
> She wires her first LED and runs Blink. That's Arduino code, on a virtual clock in her browser, and the figure
> follows every pin.
>
> Then the classic mistake: no resistor. One bright flash, and the LED is gone. Break it shows what you'd see, why it
> happened, and the fix.
>
> She asks the lab partner, built on Meta's Muse Spark. It reads her circuit, her code and the fault, and points at the
> LED. It sees that her roommate Lucía passed this lesson, so before it answers, it asks Lucía.
>
> Muse Voice Transcribe hears her, Muse Spark translates, and Maya reads it in English. Fixed, with help from a person.
>
> Now the drone. A 5-inch freestyle quad, with the numbers live: weight, thrust to weight, hover throttle, flight time.
>
> Build it for real pulls live prices for every part from Google Shopping, Amazon and eBay through SerpApi. Today
> that's $291.50. With $280, the optimiser runs the drone maths on every combination and swaps the 6S 1100 mAh battery for a 4S 1500, so it
> still flies.
>
> SerpApi's Maps and Events searches find her a makerspace, a flying field and a meetup nearby.
>
> Then she crashes it for free. That ghost with the name tag is Lucía's lap, live over our relay. Press V for the
> pilot's view.
>
> Break it here too: the flight controller mounted backwards. It flips on take-off, replays in slow motion and says
> why. One click fixes it.
>
> Every course has medal times, and there's a daily challenge, the same for everyone.
>
> At the end, Muse Spark writes the session up as a story, what broke and who helped, and Muse Image draws the cover.
>
> Twelve boards, including FPGAs running Verilog. Thirteen robotics benches. Thirteen drones. Six languages.
>
> iynk. Nobody builds alone.

About 360 words: roughly two and a half minutes of relaxed voice, which leaves room for Lucía's line and a few silent
beats.

## Recording tips

### Screen

- Record at 1920×1080, 30 fps; 60 fps for the flight shots if your recorder allows it.
- Size Maya's Chrome window to exactly 1920×1080, or record the whole screen at that size. Browser zoom 110 to 125% so
  text stays readable on a judge's laptop.
- Clean profiles: no extensions, no bookmarks bar, no personal tabs. Hide the Dock and the menu bar. Do Not Disturb on.
- macOS: Cmd+Shift+5 records a window or the screen. For a real phone, an iPhone on USB shows up in QuickTime (File,
  New Movie Recording, pick the iPhone as the camera); on Android, use scrcpy.

### Mic

- A USB mic or a wired headset, not the laptop's built-in mic.
- Record the voice-over separately, after the picture is cut, in a small room with soft things in it.
- A hand's width from the mic, slightly to the side so the p's don't pop. Record ten seconds of silence first, for noise
  removal. Normalise so peaks sit just under -1 dB.

### Cursor

- Move slowly. Pause about a second before and after every click.
- Make the pointer bigger (macOS: Accessibility, Display, Pointer size).

### Record in segments

- Record each shot as its own clip, with two seconds of stillness at both ends.
- Record the network shots first (partner, voice, prices, the ghost, the story), while there's time to retry. Do the
  montage and the end card last.
- Re-take a bad shot instead of patching it in the edit.

### Stitch

- DaVinci Resolve, iMovie or CapCut all work. Cut on actions, not in the middle of a still screen.
- You can trim waiting (an AI answer arriving, prices loading). If you speed something up instead, mark it "2×" in a
  corner. Never cut around a failure to make it look like it worked.
- Music is optional; keep it quiet and royalty-free. iynk's own sounds are fine to leave in.

### Captions

- Burn captions in: judges often watch with the sound off. Also upload an `.srt` to YouTube.
- Subtitle Lucía's Spanish line in English.

### Export and upload

- Export 1080p H.264.
- Upload to YouTube as Unlisted (private videos don't play on Devpost). Open the link in a logged-out window to check
  it plays, then paste it into Devpost and save.
- Keep the final file and each shot's clip on the laptop desktop for the stage fallback.

## Confirm before recording

- `/api/status` on the local build as in setup step 5. A shot whose feature is off is dropped with its line.
- [SITE], [TOTAL], [BUDGET], [SWAPS], and the prices' date and time for shot 8. At catalogue prices (no
  `SERPAPI_KEY`) quad5 is $346, and a $340 budget swaps the battery (6S 1100 to 4S 1500 mAh) and the motors (1750KV to
  2450KV) for $330; live prices will differ.
- Shot 4: the flash and the burnt-out readout show.
- Shot 5: the partner calls `ask_peer` and Lucía is named. It's the model's choice: take it until it does.
- Shot 6: the voice message transcribes and arrives translated in Maya's window.
- Shot 10: Lucía's ghost and its name tag show in Maya's window.
- Shot 13: the story names Lucía as the helper, and the cover is drawn.
- Shot 14: the Hindi and Chinese figure labels. At gate 3 all 4087 figure strings were translated in each language
  (`docs/hacktx/JUDGE-QA.md`, question 22), so any figure works; names, units and code stay as they are.
- The counts in shot 14 (12 boards, 13 robotics benches, 13 drones, 6 languages) match what shipped.
- Any label changed after gate 3: re-read each click against the page.
