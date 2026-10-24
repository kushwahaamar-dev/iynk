# SimLab demo video

Devpost requires a demo video before the deadline. Target length: 2:50, under three minutes. STRATEGY §8 has recording from 08:30 to 10:00 on Sunday, the upload done by 10:00, and the Devpost submission by 10:30.

The video tells the same story as the live pitch (Maya, a backwards LED, Lucía on a phone) and shows a little more, because a camera can cut where a stage can't. Values in [BRACKETS] and anything that depends on the final build are listed in "Confirm before recording" at the end.

## Before each take

- Fresh demo state: a new devnet wallet on the laptop, a new bounty on the quad5 safety skill (posted from a second browser profile), and both rooms open on both devices. A credential is issued once per wallet and skill, so a reused wallet gets "already issued".
- Display names: "Maya" on the laptop, "Lucía" on the phone. The phone has the Blink lesson passed already, so the partner picks her.
- `/api/status` shows every feature true. If a feature is off in the final build, drop its shot and its line. Don't fake it in editing.

## Shot list

Each shot has what's on screen, the action, and the voice-over line (VO). Times are positions in the finished cut.

### 1 · 0:00–0:07 · Cold open

- Screen: the Uno R3 figure, full frame, on its paper background. Turntable on.
- Action: let it turn. No cursor.
- VO: "Hardware is the most fun you can have with a computer. It's also the most expensive, scary and lonely way to learn."

### 2 · 0:07–0:18 · Meet the lab

- Screen: the same figure.
- Action: See-through on. A beat later, Exploded view.
- VO: "Picture Maya. She wants to build a drone, but parts cost money, batteries can catch fire, and at 2 a.m. there's nobody to ask. SimLab is a lab she can use tonight, free, in her browser."
- On screen: "SimLab" in the lower left.

### 3 · 0:18–0:27 · Blink

- Screen: the Blink lesson, code panel beside the figure, serial monitor visible.
- Action: click Run. The LED blinks and the serial monitor reads Running.
- VO: "She wires her first LED and runs Blink. That's real Arduino code on a virtual clock, and the figure follows every pin."

### 4 · 0:27–0:33 · The mistake

- Screen: the same.
- Action: flip the LED. Run. Nothing lights.
- VO: "Then the classic mistake. The LED goes in backwards. No error. Just nothing."

### 5 · 0:33–0:47 · The partner

- Screen: the Partner panel beside the figure.
- Action: type "my LED won't light" and send. The LED flashes in the figure. A question to Lucía appears in the room chat.
- VO: "She asks the lab partner, built on Meta's Muse Spark. It reads her circuit and her code, and points at the LED. It sees that her roommate Lucía passed this lesson, so before it answers, it asks Lucía."

### 6 · 0:47–1:02 · Lucía answers

- Screen: split screen, laptop on the left, the phone's screen (Spanish) on the right. Optionally cut to a hand holding the phone, filmed with a second phone.
- Action: Lucía holds push-to-talk and speaks. Her message lands on the laptop in English. Maya flips the LED back and it blinks.
- Lucía, in her own voice: "Dale la vuelta al LED. La pata larga va hacia el pin 13."
- On screen, under her line: "Turn the LED around. The long leg goes toward pin 13."
- VO: "Muse Voice Transcribe hears her, Muse Spark translates, and Maya reads it in English. Fixed, with help from a person."

### 7 · 1:02–1:11 · The drone

- Screen: quad5, the Design panel and the figure.
- Action: change the battery and let the tiles update. If there's time, a two-second See-through on the drone.
- VO: "Now the drone. A 5-inch freestyle quad, with the numbers live: weight, thrust-to-weight, hover throttle, flight time."

### 8 · 1:11–1:26 · Build it for real

- Screen: the Build it for real tab.
- Action: the offers load with their sources and a total. Set the budget to [BUDGET]. The optimizer swaps the motors; the thrust-to-weight tile stays above 4.
- VO: "Build it for real pulls live prices from Google Shopping, Amazon and eBay through SerpApi. Today that's [TOTAL]. With [BUDGET], the optimizer swaps the motors and re-runs the math, so it still flies."
- On screen, small: "Prices captured [DATE, TIME]".

### 9 · 1:26–1:33 · Near you

- Screen: the Nearby and Events lists.
- Action: scroll slowly.
- VO: "Maps and Events searches find her a makerspace, a flying field and a meetup nearby."

### 10 · 1:33–1:53 · Fly

- Screen: the flight range, third-person view, with Lucía's ghost.
- Action: arm, fly through the gates, press V for the FPV view for two or three seconds, back to third person, finish the lap. The leaderboard updates.
- VO: "Then she crashes it for free. Through the gates, with Lucía's ghost racing beside her over our relay on Vultr. Press V for the pilot's view. Lap times go into Tiger Data, and the leaderboard updates."

### 11 · 1:53–2:13 · Prove it

- Screen: the quad5 bench, then the Passport tab.
- Action: run Smoke stopper test, Check motor direction and Calibrate accelerometer until the checks read 3/3. Then Proof of Build. The result shows the credential and the bounty payout.
- VO: "Before a real battery goes in: smoke stopper, motor direction with props off, accelerometer calibration. Our server replays her run, and only then writes a Proof of Build credential to Solana devnet. A bounty on that skill pays out in the same transaction."

### 12 · 2:13–2:20 · Verify

- Screen: Solana Explorer (devnet) on that transaction, then SimLab's /verify page for the credential.
- VO: "Anyone can check it on Explorer, or on our verify page, without trusting us."

### 13 · 2:20–2:25 · Tip

- Screen: the room's people list.
- Action: tip Lucía. The tip appears in the room chat.
- VO: "And she tips Lucía for the help."

### 14 · 2:25–2:37 · The story

- Screen: the Build Story card.
- Action: the cover image arrives. Open the share sheet.
- VO: "At the end, Muse Spark writes the session up as a story, what broke and who helped, and Muse Image draws the cover."

### 15 · 2:37–2:49 · Everything else

- Screen: a montage, one to two seconds per clip. The Basys 3 running a Verilog LED chaser. The Pico. A robotics bench with its solder joints forming. The flying wing. The octocopter. The language menu switching to Hindi, then Chinese, with the figure labels changing. [The real Uno blinking in step with the figure, only if the hardware twin works.]
- VO: "Twelve boards, including FPGAs running Verilog. Thirteen robotics benches. Thirteen drones. Six languages."

### 16 · 2:49–2:55 · End card

- Screen: paper background, "SimLab", [SITE], and a QR code to it.
- VO: "SimLab. Nobody builds alone."
- On screen: "Built at HackTX 2026 · Muse Spark, Muse Image, Muse Voice Transcribe · SerpApi · Solana · Vultr · Tiger Data · Figures made with Colorfigures (MIT) · Code written during the event with Claude Code"

## Voice-over in one piece

Read this straight through when you record the voice-over. Leave a breath between paragraphs so each line can be moved to its shot. Lucía's Spanish line is recorded live in shot 6, not here.

> Hardware is the most fun you can have with a computer. It's also the most expensive, scary and lonely way to learn.
>
> Picture Maya. She wants to build a drone, but parts cost money, batteries can catch fire, and at 2 a.m. there's nobody to ask. SimLab is a lab she can use tonight, free, in her browser.
>
> She wires her first LED and runs Blink. That's real Arduino code on a virtual clock, and the figure follows every pin.
>
> Then the classic mistake. The LED goes in backwards. No error. Just nothing.
>
> She asks the lab partner, built on Meta's Muse Spark. It reads her circuit and her code, and points at the LED. It sees that her roommate Lucía passed this lesson, so before it answers, it asks Lucía.
>
> Muse Voice Transcribe hears her, Muse Spark translates, and Maya reads it in English. Fixed, with help from a person.
>
> Now the drone. A 5-inch freestyle quad, with the numbers live: weight, thrust-to-weight, hover throttle, flight time.
>
> Build it for real pulls live prices from Google Shopping, Amazon and eBay through SerpApi. Today that's [TOTAL]. With [BUDGET], the optimizer swaps the motors and re-runs the math, so it still flies.
>
> Maps and Events searches find her a makerspace, a flying field and a meetup nearby.
>
> Then she crashes it for free. Through the gates, with Lucía's ghost racing beside her over our relay on Vultr. Press V for the pilot's view. Lap times go into Tiger Data, and the leaderboard updates.
>
> Before a real battery goes in: smoke stopper, motor direction with props off, accelerometer calibration. Our server replays her run, and only then writes a Proof of Build credential to Solana devnet. A bounty on that skill pays out in the same transaction.
>
> Anyone can check it on Explorer, or on our verify page, without trusting us.
>
> And she tips Lucía for the help.
>
> At the end, Muse Spark writes the session up as a story, what broke and who helped, and Muse Image draws the cover.
>
> Twelve boards, including FPGAs running Verilog. Thirteen robotics benches. Thirteen drones. Six languages.
>
> SimLab. Nobody builds alone.

About 340 words. At a relaxed pace that's roughly two and a quarter minutes of voice, which leaves room for Lucía's line and a few silent beats.

## Recording tips

### Screen

- Record at 1920×1080, 30 fps. Use 60 fps for the flight shot if your recorder allows it.
- Size the Chrome window to exactly 1920×1080, or record the whole screen at that resolution. Browser zoom 110 to 125% so text stays readable on a judge's laptop.
- Use a clean Chrome profile: no extensions, no bookmarks bar, no personal tabs. Hide the Dock and the menu bar. Turn on Do Not Disturb.
- macOS: Cmd+Shift+5 records a window or the screen. For the phone, an iPhone on USB shows up in QuickTime (File, New Movie Recording, pick the iPhone as the camera). On Android, use scrcpy.

### Mic

- A USB mic or a wired headset, not the laptop's built-in mic.
- Record the voice-over separately, after the picture is cut, in a small room with soft things in it. A closet full of clothes works.
- Keep about a hand's width from the mic, slightly off to the side so the p's don't pop. Record ten seconds of silence first, for noise removal.
- Read standing up, and smile on the first line. You can hear it.
- Normalize so the voice is even and peaks sit just under -1 dB.

### Cursor

- Move slowly. Pause about a second before and after every click.
- Make the pointer bigger (macOS: Accessibility, Display, Pointer size).
- Don't scroll fast, and don't wiggle the cursor while the voice-over talks about something else on screen.

### Record in segments

- Record each shot as its own clip, with two seconds of stillness at both ends.
- Record the network shots first (partner, prices, the flight with the ghost, the credential), while there's still time to retry. Do the montage and the end card last.
- Re-take a bad shot instead of patching it in the edit.

### Stitch

- DaVinci Resolve, iMovie or CapCut all work. Cut on actions, not in the middle of a still screen.
- You can trim waiting time (an AI answer arriving, a transaction confirming). If you speed something up instead, mark it "2×" in a corner. Never cut around a failure to make it look like it worked.
- Music is optional. If you use it, keep it quiet and royalty-free under the voice. SimLab's own sound effects are fine to leave in.

### Captions

- Burn captions into the video. Judges often watch with the sound off.
- Also upload an .srt to YouTube.
- Subtitle Lucía's Spanish line in English.

### Export and upload

- Export 1080p H.264.
- Upload to YouTube as Unlisted. Private videos don't play on Devpost. Open the link in a logged-out window to check that it plays, then paste it into Devpost and save the project.
- Keep the final file on the laptop desktop for the stage fallback, and keep each shot as its own clip too, so you can play any single beat if the Wi-Fi fails during the live pitch.

## Confirm before recording

- Every shot shows a feature that works on the deployed build. Drop any shot, and its line, that doesn't.
- [SITE], [TOTAL], [BUDGET], and the capture date and time for shot 8.
- Whether ghosts are live or replays. If they're replays, shot 10 says "Lucía's best lap" instead of "Lucía's ghost racing beside her".
- Whether arming needs accelerometer calibration first. If it does, record the three checks before the flight and cut them in before shot 10; the credential part of shot 11 stays after the flight.
- The hardware-twin clip in shot 15 only if a real Uno works on camera.
- The counts in shot 15 (12 boards, 13 benches, 13 drones, 6 languages) match what shipped.
- Facebook's share dialog and the Web Share sheet both open from the story card on the deployed URL.
