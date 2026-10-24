# SimLab pitch

Three versions of the same story, plus stage notes. The 3-minute version is for the stage: the in-person judges and the "A Bard's Tale" audience vote. The 60-second version is for judges who stop at the table. The 20-second line is for hallways and lines. The live demo follows the seven beats in STRATEGY §7.

Anything in [BRACKETS] gets filled in after the last rehearsal. Every bracket, and every line that depends on the final build, is listed in "Confirm before pitching" at the bottom.

## Who's who

| Role | Device | Does |
|---|---|---|
| Driver | Laptop, display name "Maya" | Talks and clicks. Plays Maya. |
| Lucía | Phone in Spanish, display name "Lucía" | Sits in both rooms, answers by voice, flies the ghost. |
| Spotter (optional) | Second laptop | Holds the backup video, watches /api/status. |

Pitching on your own? Ask a friend to be Lucía. She needs to say one Spanish sentence and fly one lap on the phone.

Maya is a stand-in. If someone on the team has a true version of this story (a first board fried, a first crash, an LED that wouldn't light at 2 a.m.), tell that one, with real names. A true story beats an invented one, and an audience can tell the difference.

## Timing at a glance

| Starts | Beat | Sponsor on screen | Has to work |
|---|---|---|---|
| 0:00 | Hook: spin the Uno, see-through, explode | (the Colorfigures look) | The figure loads |
| 0:20 | Blink, LED in backwards, Lucía helps by voice | Meta: Muse Spark, Muse Voice Transcribe | Partner, ask a peer, push-to-talk, translation, the relay |
| 1:05 | Quad5 numbers, live prices, budget swap, nearby | SerpApi | Offers, optimizer, Maps |
| 1:45 | Fly the gates with Lucía's ghost | Vultr, Tiger Data | Ghost poses, leaderboard |
| 2:15 | Safety checks, Proof of Build, bounty, tip | Solana | Attest, bounty payout, Explorer, tip |
| 2:40 | Build Story with its cover, share | Meta: Muse Spark, Muse Image | Story, image, share |
| 2:50 | Close | .Tech (the URL on the slide) | Nothing |

## The 3-minute pitch

About 380 spoken words. That only fits in three minutes if you click while you talk, so don't wait for silence before each click. Quoted blocks are said out loud. Everything else is what you do.

### 0:00 Hook

Screen: tab 1, the Uno R3 figure.
Do: drag it one full turn, slowly. Then See-through. Then Exploded view.

> Hardware is the most fun you can have with a computer.
> It's also the most expensive, scary and lonely way to learn.
> Picture Maya, a first-year student. She wants to build a drone.
> Parts cost money. Batteries can catch fire.
> And at 2 a.m., nobody's around to help.
> This is SimLab. Let's be Maya for three minutes.

### 0:20 The backwards LED (Meta)

Screen: tab 2, the Blink lesson in room A, Partner tab open. Lucía shows in the room.
Do: Run. The LED blinks.

> She wires her first LED and runs Blink.
> That's real Arduino code, running in the browser.

Do: flip the LED. Run. Nothing lights.

> Then she does what everyone does once. LED in backwards. Nothing.

Do: in Partner, type "my LED won't light" and send.

> So she asks the lab partner. That's Muse Spark, Meta's model.
> It reads her circuit and her code.

The partner flashes the LED in the figure and sends Lucía a question.

> It points at the LED. And it sees that her roommate Lucía passed this lesson, so it asks Lucía first.

Lucía holds push-to-talk and says her line (see "The phone" below).

> Lucía reads Spanish. She answers by voice.
> Muse Voice Transcribe hears her, Muse Spark translates, and Maya reads it in English.

Do: flip the LED back. Run. It blinks.

> Fixed. And two people just talked.

### 1:05 What it really costs (SerpApi)

Screen: tab 3, quad5 in room B, the Design panel.
Do: change the battery. The tiles move.

> Maya's real dream is the drone. Here's a 5-inch freestyle quad.
> Swap the battery and the numbers move: weight, thrust-to-weight, flight time.

Do: open Build it for real. The offers and the total load.

> Now, build it for real. Live prices from Google Shopping, Amazon and eBay, through SerpApi.
> Today, the whole build is [TOTAL].

Do: set the budget to [BUDGET].

> Maya has [BUDGET]. The optimizer swaps the motors and re-runs the drone math.
> Thrust-to-weight stays above four, so it still flies.

Do: scroll to Nearby.

> And SerpApi's Maps search finds her the nearest makerspace and a flying field.

### 1:45 Fly it (Vultr, Tiger Data)

Screen: tab 4, the fly page in room B. Lucía is on the same page on her phone.
Do: Space to arm. W A S D through the gates. Finish the lap.

> Before she spends a dollar, she crashes this one for free.
> Space to arm. W, A, S, D, through the gates.
> That ghost is Lucía, flying on her phone right now, through our relay on Vultr.
> The lap time goes into Tiger Data, and the leaderboard updates.

### 2:15 Prove it (Solana)

Screen: tab 3 again, the bench.
Do: Smoke stopper test. Check motor direction. Calibrate accelerometer. Checks read 3/3.

> Before a real battery goes in, pilots run three checks.
> Smoke stopper. Motor direction, props off. Accelerometer calibration.

Do: Passport tab, Proof of Build.

> Our server replays her exact run. Only then does it write a Proof of Build credential to Solana devnet.
> There was a bounty on this skill. It paid her in the same transaction.

Do: open the Explorer link, come back, tip Lucía.

> Anyone can check it on Explorer.
> And she tips Lucía for the help. On Solana, the fee is a fraction of a cent.

### 2:40 The story (Meta)

Do: open the Build Story. The cover appears. Share.

> At the end, Muse Spark writes the night up as a short story: what broke, and who helped. Lucía gets the credit.
> Muse Image draws the cover. One tap to share it.

### 2:50 Close

Screen: the closing slide, [SITE] in large type and a QR code.

> Maya started alone at 2 a.m. She didn't finish alone.
> Twelve boards. Thirteen drones. Thirteen robotics benches. Six languages.
> Free in any browser.
> Nobody builds alone.

Stop. Let it land before you touch anything.

### If rehearsal runs long

Cut in this order: the battery swap (go straight to Build it for real), opening Explorer (say the line, skip the tab), the tip, the Nearby list. Never cut Lucía's voice answer or the close.

If you have five seconds spare, the fact that lands hardest with a student audience goes right before the close: "All of this was written in the last 24 hours."

### Two changes from STRATEGY §7

- The close says "thirteen robotics benches", not "13 robots". The benches are training benches (motor drivers, sensors, a Pi 5), and a judge who clicks through will find benches.
- The close starts at 2:50 instead of 2:55 to make room for the Maya callback. Drop the callback if you need those five seconds back.

## The 60-second table version

For a judge standing at the table. Laptop on the Uno figure, the phone in room A, ready to hand over.

> SimLab is a hardware lab in your browser. Twelve boards, thirteen drones, thirteen robotics benches. Every one is a hand-drawn figure you can spin, see through and take apart.

Do: spin the Uno, turn on See-through.

> And the code is real.

Do: Run Blink on tab 2.

> Arduino, MicroPython and Verilog run right here, and things break the way they do in real life: reverse polarity, brown-outs, an LED in backwards.
> Learning this alone is hard. So our lab partner, built on Meta's Muse Spark, tries to send you to a person before it answers.

Do: hand the judge the phone.

> That phone is in my room. Switch it to any of our six languages and send me a message. I'll read it in English.

Do: show their message arriving on the laptop, translated.

> When you're ready to buy parts, SerpApi prices the build live and fits it to your budget. When you pass, our server replays your run and writes a credential to Solana.
> All of it was written since 11:30 yesterday, and most of the sponsor side was new to us: Anchor, WebSockets, Web Serial, tool calling.

Then ask which track they're judging, and do the matching add-on.

### Add-ons by track (about 20 seconds each)

| Judge from | Show | Say |
|---|---|---|
| Meta | Partner: ask "make it blink twice as fast" and accept the diff it proposes. Then the Build Night planner with two people's wishes, or opt the judge into buddy matching. | "Meta asked for AI that turns a group chat into a plan and a session into a story. Those are two of our features. The partner's main job is finding you a human." |
| SerpApi | Build it for real: offers with their sources, the optimizer's trade-off, then a datasheet question answered with a citation. | "The prices don't just sit there. They change the design: the optimizer picks a different drone because of them." |
| MLH Solana | Passport, the /verify page, Explorer. Offer the one-click devnet wallet on their own phone. | "It's a program account, not a token, so it can't be sold. The server replays the run before it signs, and the bounty pays in the same transaction." |
| MLH Vultr | The relay's /healthz and /metrics. | "Vercel can't hold WebSockets, so every room runs through this VM." |
| MLH Tiger Data | The flight leaderboard and the live counter. | "Both read continuous aggregates, not raw events." |
| MLH .Tech | The address bar. | "[SITE], and rt. for the relay." |
| Hardware | The real Uno on USB. Run Blink and the real LED blinks with the figure; turn the real knob and the figure's knob turns. | "The sim drives the real board, and the real board drives the sim." |

## The 20-second line

> SimLab is a free hardware lab in your browser. You wire, code, break and fly twelve boards, thirteen drones and thirteen robotics benches. When you're stuck, the AI partner finds you a person who's solved it, in your own language. When you're ready, it prices the real parts.

If they're already walking away: "It's the hardware lab everyone can afford, and nobody builds alone."

## Stage notes

### Devices

- Laptop: Chrome (Web Serial needs Chrome or Edge), charger, HDMI and USB-C adapters, the backup video on the desktop.
- Lucía's phone, charged. A second phone for a hotspot.
- Entering Hardware: the Uno running StandardFirmata and its USB cable, plugged in before you start.

### Laptop tabs, left to right

1. `[SITE]/en/boards/uno-r3`: the Uno figure at rest, labels off.
2. `[SITE]/en/boards/uno-r3/blink?room=[ROOM_A]`: Blink code loaded, LED wired the right way round, Partner tab open, Lucía in the room.
3. `[SITE]/en/drones/quad5?room=[ROOM_B]`: the Design panel showing. Build it for real already loaded once, so the prices are cached. The Passport tab holds a fresh, funded devnet wallet.
4. `[SITE]/en/drones/quad5/fly?room=[ROOM_B]`: the shortest gate course, not armed.
5. The closing slide: [SITE] in large type and a QR code to it.

In a second window, out of sight: `[SITE]/api/status`, the backup video (full screen, muted), and a /verify link for the rehearsal wallet's credential.

Browser zoom at 110 to 125% so the back row can read it. Bookmarks bar hidden, notifications off.

Why two rooms: a room is tied to one lab item, so the Uno lesson and the quad5 bench can't share one.

### The phone (Lucía)

- Two tabs: `[SITE]/es/boards/uno-r3/blink?room=[ROOM_A]` and `[SITE]/es/drones/quad5/fly?room=[ROOM_B]`.
- Display name "Lucía". Pass the Blink lesson on this phone beforehand. The partner picks her because her progress shows that lesson done.
- Microphone permission granted, push-to-talk tested once. Do Not Disturb on, auto-lock off, brightness up.
- Her line, on a card: "Dale la vuelta al LED. La pata larga va hacia el pin 13." It should arrive on the laptop as something like "Turn the LED around. The long leg goes toward pin 13."

### 30 minutes before

- `/api/status` shows ai, image, voice, search, solana, db and realtime all true.
- The relay's /healthz answers ok.
- Ask the partner one throwaway question so the first real answer isn't a cold start.
- Run Build it for real on quad5 once. Write the total on your card as [TOTAL].
- Make a fresh devnet wallet on the laptop (Passport: forget, new, faucet). A credential is issued once per wallet and skill, so a wallet used in rehearsal gets "already issued" on stage.
- Post a fresh bounty on the quad5 safety skill from a second browser profile's wallet. Every rehearsal pays out the previous one.
- Both devices in both rooms, on the same network. Laptop on power.

### Beat order, if arming needs calibration

The original Drone Lab refuses to arm until the accelerometer is calibrated. If SimLab does the same, run the three checks at the end of the 1:05 beat (they take a few seconds), then fly, and open the 2:15 beat with: "Remember those three checks? Our server replays her exact run." Every other line stays.

### If the ghost is a replay

If ghosts turn out to be recorded laps rather than live poses, change "flying on her phone right now" to "her best lap from this morning".

### When something fails on stage

Say one sentence and keep going. Never debug in front of judges.

- The partner is slow: keep talking through the beat. The answer can land a few seconds late.
- Push-to-talk fails: Lucía types her line. The translation still shows.
- Prices fail: "SerpApi's having a slow moment." Play that beat's clip and keep narrating.
- The credential fails: open the /verify link from rehearsal. "Here's the one from this morning."
- The story is slow: next run, start it during the Solana beat.

### If the Wi-Fi dies

1. Move both devices to the hotspot phone. It takes about 30 seconds; say what you're doing.
2. No network at all: switch to the local build on the laptop. Run `npm run start` from a build made the night before with `NEXT_PUBLIC_REALTIME_URL` unset (NEXT_PUBLIC values are baked in at build time). Open two windows side by side, one in English and one in Spanish: rooms then run between tabs of the same browser. The labs, code, failures, drone math and flight sim all work. Muse, SerpApi, Solana, Tiger Data and the relay don't.
3. For those beats, play that beat's clip from the demo video, muted, and keep narrating live.
4. Worst case, play the whole video with its voice-over and stand beside it. "Here's the recording. The venue Wi-Fi had other plans."

## Confirm before pitching

- [SITE] and the relay host, once the .tech domain is set.
- The Blink lesson's URL (`/en/boards/uno-r3/blink` is a guess) and how you flip the LED in that lesson.
- [TOTAL] from the warm run, and a [BUDGET] that makes the optimizer swap the motors while still finding a build with thrust-to-weight above four. STRATEGY suggests $150; real 5-inch parts may not fit under that. If the optimizer swaps something other than the motors, change the line.
- Whether arming needs accelerometer calibration first (see "Beat order").
- Whether ghosts are live or replays.
- Push-to-talk on Lucía's actual phone and browser. Meta's transcription endpoint takes WAV only, and the app converts the recording in the browser.
- Which room's log the Build Story uses. The LED help happens in room A and the flight in room B. If the story only covers room B, "who helped" may not include the LED.
- The counts in the close (12 boards, 13 drones, 13 robotics benches, 6 languages) match what shipped.
- Facebook's share dialog works from the deployed URL.
- Real names instead of Maya and Lucía, if you tell a true story.
