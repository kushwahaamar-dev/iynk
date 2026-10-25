# SimLab pitch

Three versions of one story, plus stage notes. The 3-minute version is for the stage: the in-person judges and the "A
Bard's Tale" audience vote. The 60-second version is for judges who stop at the table. The 20-second line is for
hallways and queues. The live demo follows the demo path in `docs/hacktx/BUILD-PLAN.md` §1.

Every line was checked against the pages at gate 3, on 2026-10-25 at 06:00 CDT (`docs/verify/gate3.md`). Values in
[BRACKETS] are filled in after the last rehearsal on the deployed build; "Confirm before pitching" at the end lists
them, with every line that depends on a key.

## What each beat needs

Amar adds the keys and deploys on the morning of the 25th. Until a key is set, its panel says plainly that it isn't
set up, and the rest of the page works.

| Beat | Works with no keys | Needs, and what shows without it |
|---|---|---|
| Uno figure, Blink, Break it | yes | nothing |
| The partner asks Lucía; her Spanish voice answer arrives in English | no | `META_API_KEY` for the partner, voice and translation ("The lab partner isn't set up on this deployment"); the relay (`NEXT_PUBLIC_REALTIME_URL`) for a second device ("This deployment has no relay server, so rooms work between tabs of this browser only") |
| quad5 numbers and the budget optimiser | yes, on the catalogue's prices | `SERPAPI_KEY` for live prices, Near you and maker events ("Live prices aren't set up on this deployment. The optimiser below works with the catalogue's prices instead.") |
| Fly, Break it in flight, slow-motion replay, medal times, daily challenge, ghosts of your best lap and of the autopilot | yes | the relay for a friend's ghost from another device; `DATABASE_URL` for the leaderboard ("Leaderboards aren't set up here") |
| Build Story with its cover | no | `META_API_KEY` ("Build Stories aren't set up on this deployment.") |

Not in this pitch: Solana and the hardware twin. Both were planned for last and skipped, and their tabs stay hidden.

## Who's who

| Role | Device | Does |
|---|---|---|
| Driver | Laptop, display name "Maya" | Talks and clicks. Plays Maya. |
| Lucía | Phone in Spanish, display name "Lucía" | Sits in both rooms, answers by voice, flies the ghost. |
| Spotter (optional) | Second laptop | Holds the backup video, watches `/api/status`. |

Pitching on your own? Ask a friend to be Lucía. She says one Spanish sentence and flies one lap on the phone.

Maya is a stand-in. If someone on the team has a true version of this story (a first board fried, a first crash, an LED
that died at 2 a.m.), tell that one, with real names. A true story beats an invented one, and an audience can tell.

## Timing at a glance

| Starts | Beat | Sponsor on screen | Has to work |
|---|---|---|---|
| 0:00 | Hook: turn the Uno, See-through, Exploded view | (the Colorfigures look) | The figure loads |
| 0:15 | Blink, then Break it: an LED with no resistor | (Best Overall, Most Entertaining) | Nothing beyond the page |
| 0:35 | The partner asks Lucía first; she answers by voice | Meta: Muse Spark, Muse Voice Transcribe | Partner, voice, translation, the relay |
| 1:10 | quad5: the numbers, live prices, the optimiser, Near you | SerpApi | Offers, Maps |
| 1:50 | Fly with Lucía's ghost; break it and watch the replay | (Most Entertaining) | Ghost poses over the relay |
| 2:30 | Build Story with its cover | Meta: Muse Spark, Muse Image | Story, image |
| 2:45 | Close | | Nothing |

## The 3-minute pitch

About 390 spoken words. That only fits if you click while you talk, so don't wait for silence before each click.
Quoted blocks are said out loud. Everything else is what you do.

### 0:00 Hook

Screen: tab 1, the Uno R3 figure.
Do: drag it round slowly (or press E a few times). Then See-through. Then Exploded view.

> Hardware is the most fun you can have with a computer.
> It's also the most expensive, scary and lonely way to learn.
> Picture Maya, a first-year student. She wants to build a drone.
> Parts cost money. Batteries can catch fire.
> And at 2 a.m., nobody's around to help.
> This is SimLab. Let's be Maya for three minutes.

### 0:15 Blink, then break it

Screen: tab 2, the Blink lesson in room A.
Do: Run. The LED blinks, the Serial tab says Running, and the Checks tab reads "All checks pass. Lesson done."

> She wires her first LED and runs Blink.
> That's Arduino code, running in her browser on a virtual clock.

Do: in the Break it tab under the code, find "LED with no resistor" and press Trigger. One bright flash, then dark.
The figure's note says how many milliamps did it ("LED1 burned out: 113 mA is far above its 20 mA", for a few
seconds), and the readout under the figure says "LED1: burnt out".

> Then she does what everyone does once. No resistor.
> One bright flash, and the LED is gone. SimLab solved the circuit and knows exactly how much current killed it.

### 0:35 The partner asks a person (Meta)

Do: in Lab tools, the Partner tab, type "My LED flashed once and died" and send.

> So she asks the lab partner. That's Muse Spark, Meta's model.
> It reads her circuit, her code and the fault.

The partner points at the LED in the figure and posts a question to Lucía in the room chat.

> It points at the LED. And it sees that Lucía, in her room, passed this lesson, so it asks Lucía first.

Lucía records a voice message and says her line (see "The phone").

> Lucía reads Spanish. She answers by voice.
> Muse Voice Transcribe hears her, Muse Spark translates, and Maya reads it in English.

Do: Repair. Run. It blinks.

> Fixed, by a friend. Two people just talked.

### 1:10 What it really costs (SerpApi)

Screen: tab 3, quad5, the Design tab, the quad built on the bench.
Do: change the battery. The tiles move.

> Maya's real dream is the drone. Here's a 5-inch freestyle quad.
> Swap the battery and the numbers move: weight, thrust to weight, flight time.

Do: Lab tools, Build it for real. The offers and the cheapest total load.

> Now, build it for real. Live prices for every part from Google Shopping, Amazon and eBay, through SerpApi.
> Today the whole build is [TOTAL].

Do: drag the budget to [BUDGET]. Show "Best build within [BUDGET]", then press "Use this build in the lab".

> Maya has [BUDGET]. The optimiser runs the drone maths on every battery, motor and prop at today's prices,
> and swaps [SWAPS]. Thrust to weight stays above five, so it still flies.

Do: scroll to Near you, type "Austin, TX", Search.

> And SerpApi's Maps search finds her a makerspace and a flying field nearby.

### 1:50 Fly it, then break it

Screen: tab 4, the fly page in room B. Lucía is on the same page on her phone.
Do: Space to arm. W and S throttle, A and D yaw, the arrows pitch and roll. Fly a few gates.

> Before she spends a dollar, she crashes this one for free.
> That ghost with her name on it is Lucía, flying on her phone right now, through our relay.

Do: Disarm, Reset to the pad. In Break it, switch on "Mount the flight controller backwards". Set Flight mode to "Demo:
the autopilot flies it" and press Arm. It flips on take-off, "Here's why" opens and the replay plays at a third of
the speed. Press "Turn the flight controller round".

> Now break it on purpose. Flight controller mounted backwards.
> It flips, it replays in slow motion, and it tells her why. One click fixes it.
> Every course has gold, silver and bronze times, and there's a daily challenge for everyone.

### 2:30 The story (Meta)

Screen: tab 2 again, the Partner tab.
Do: Build Story, then "Write our Build Story". The cover arrives. Press Share.

> At the end, Muse Spark writes the night up as a story: what broke, and who helped. Lucía gets the credit.
> Muse Image draws the cover. One tap to share it.

### 2:45 Close

Screen: the closing slide, [SITE] in large type and a QR code.

> Maya started alone at 2 a.m. She didn't finish alone.
> Twelve boards. Thirteen robotics benches. Thirteen drones. Six languages.
> Free in any browser.
> Nobody builds alone.

Stop. Let it land before you touch anything.

### If rehearsal runs long

Cut in this order: the battery swap (go straight to Build it for real), Near you, the medal line, the Share tap. Never
cut Lucía's voice answer or the close.

If you have five seconds spare, the line that lands hardest with a student audience goes right before the close: "All
of this was written in the last 24 hours."

### Changes from the BUILD-PLAN demo path

- The broken LED is "LED with no resistor": it flashes and burns out, which reads better on stage than a dark LED.
  Blink also has "LED in backwards" now (BUILD-PLAN step 1, `144053e`): the sketch runs and the LED stays dark,
  nothing burns. "5V shorted to GND" turns the board dark rather than smoking. For smoke, "5 V capacitor fitted
  backwards" pops and smokes; use it in the 60-second version.
- The budget is not "under $150": quad5's parts cost $330 to $370 at catalogue prices. Pick [BUDGET] from the warm run.
- The MCP beat (Muse asking SimLab what we built) is left out: no tool answers that question. Show the connector to a
  Meta judge at the table instead, once it's been tried from Muse.

## The 60-second table version

For a judge standing at the table. Laptop on the Uno figure, the phone in room A, ready to hand over.

> SimLab is a hardware lab in your browser. Twelve boards, thirteen robotics benches, thirteen drones. Every one is a
> hand-drawn figure you can turn, see through and take apart.

Do: turn the Uno, switch on See-through.

> And the code is real.

Do: Run Blink on tab 2.

> Arduino, MicroPython and Verilog run right here, and things break the way they do in real life.

Do: Break it, "5 V capacitor fitted backwards", Trigger. It pops and smokes.

> Learning this alone is hard. So our lab partner, built on Meta's Muse Spark, tries to send you to a person before it
> answers.

Do: hand the judge the phone.

> That phone is in my room. Switch it to any of our six languages and send me a message. I'll read it in English.

Do: show their message arriving on the laptop, translated.

> When you're ready to buy parts, SerpApi prices the build live, and the optimiser changes the design to fit your
> budget.
> All of it was written since 11:30 yesterday.

Then ask which track they're judging, and do the matching add-on.

### Add-ons by track (about 20 seconds each)

| Judge from | Show | Say |
|---|---|---|
| Meta | Partner: "Give me a hint", then "Show me", and accept the code change it proposes. Then the Build Night planner on `/en/together` with two people's wishes. | "Meta asked for AI that turns a group chat into a plan and a session into a story. Those are two of our features. The partner's main job is finding you a human." |
| Meta, connector | Only if it worked from Muse on the deployed URL: Muse calling SimLab's MCP server (`docs/hacktx/MUSE-CONNECTOR.md`). | "Muse can search our catalogue, size a drone, price a build and plan a build night." |
| SerpApi | Build it for real: offers with their sources, the optimiser's swap, then a datasheet question to the partner answered with a citation. | "The prices don't just sit there. They change the design: the optimiser picks a different drone because of them." |
| Most Entertaining | The fly page: Break it, the slow-motion replay, the fix; then the daily challenge link. | "You can break anything on purpose and find out why. Then beat today's time." |
| MLH Vultr, if the relay runs there | The relay's `/healthz`. | "Vercel can't hold WebSockets, so every room runs through this VM." |
| MLH Tiger Data, if the database is live | The leaderboard on the fly page. | "It reads a continuous aggregate of the best lap per day, not raw events." |
| MLH .Tech, if the domain is set | The address bar. | "[SITE]." |

## The 20-second line

> SimLab is a free hardware lab in your browser. You wire, code, break and fly twelve boards, thirteen robotics benches
> and thirteen drones. When you're stuck, the AI partner finds you a person who's solved it, in your own language.
> When you're ready, it prices the real parts.

If they're already walking away: "It's the hardware lab everyone can afford, and nobody builds alone."

## Stage notes

### Devices

- Laptop: Chrome, charger, HDMI and USB-C adapters, the backup video on the desktop.
- Lucía's phone, charged. A second phone for a hotspot.

### Laptop tabs, left to right

1. `[SITE]/en/boards/uno-r3`: the Uno figure at rest.
2. `[SITE]/en/boards/uno-r3/blink?room=[ROOM_A]`: Blink loaded and not run yet, Lab tools open on the Partner tab,
   Lucía in the room, sound on (the speaker button beside Lab tools).
3. `[SITE]/en/drones/quad5`: the Design tab showing, and "Build it for me" pressed so the quad stands on the bench
   (a reload empties it, so do this last). Build it for real already opened once, so the prices are cached.
4. `[SITE]/en/drones/quad5/fly?room=[ROOM_B]`: the Gate race course, not armed, Break it all off.
5. The closing slide: [SITE] in large type and a QR code to it.

In a second window, out of sight: `[SITE]/api/status` and the backup video (full screen, muted).

Browser zoom at 110 to 125% so the back row can read it. Bookmarks bar hidden, notifications off.

Why two rooms: a room is tied to one lab item, so the Uno lesson and the quad5 fly page can't share one. Open tab 4
straight from its room link: the "Fly it" button on the quad5 page doesn't carry the room.

### The phone (Lucía)

- Two tabs: `[SITE]/es/boards/uno-r3/blink?room=[ROOM_A]` and `[SITE]/es/drones/quad5/fly?room=[ROOM_B]`. A room
  link opens the lab tools sheet on Together.
- Display name "Lucía". Pass the Blink lesson on this phone beforehand (Run until "All checks pass"): the partner
  picks her because her progress shows that lesson done.
- Microphone permission granted, one voice message tested in the room chat ("Record a voice message", then "Stop and
  send"). Voice needs the HTTPS site; a phone on a plain `http://` LAN address can't use the microphone.
- Do Not Disturb on, auto-lock off, brightness up.
- Her line, on a card: "Ponle una resistencia de 220 ohmios al LED." It should arrive on the laptop as something like
  "Put a 220 ohm resistor on the LED."

### 30 minutes before

- `/api/status` shows `ai`, `image`, `voice`, `search`, `realtime` and `db` true (`solana` stays false).
- The relay's `/healthz` answers ok.
- Ask the partner one throwaway question so the first real answer isn't a cold start.
- Open Build it for real on quad5 once. Write the total on your card as [TOTAL], pick a [BUDGET] that makes the
  optimiser swap something, and write down what it swaps as [SWAPS].
- Both devices in both rooms, on the same network. Laptop on power.
- On the fly page, Break it is all off and the course is the Gate race.

### When something fails on stage

Say one sentence and keep going. Never debug in front of judges.

- The partner is slow: keep talking through the beat. The answer can land a few seconds late.
- The voice message fails: Lucía types her line. The translation still shows.
- Prices fail: "SerpApi's having a slow moment." The panel falls back to catalogue prices and the optimiser still
  works; say so and keep going.
- The ghost doesn't show: "Her lap's on the way." The autopilot's ghost line is still there to race.
- The story is slow: start it during the fly beat next time.

### If the Wi-Fi dies

1. Move both devices to the hotspot phone. It takes about 30 seconds; say what you're doing.
2. No network at all: switch to the local build on the laptop (`docs/hacktx/VIDEO.md`, "Local setup", with the relay
   running on the laptop). Two browser profiles side by side, one in English as Maya and one in Spanish as Lucía, can
   share a room through the local relay. The labs, code, failures, drone maths, optimiser and flight sim all work.
   Muse and SerpApi need the internet.
3. For those beats, play that beat's clip from the demo video, muted, and keep narrating live.
4. Worst case, play the whole video with its voice-over and stand beside it. "Here's the recording. The venue Wi-Fi had
   other plans."

## Confirm before pitching

- [SITE], and the relay's host, once the domain is set.
- [TOTAL], [BUDGET] and [SWAPS] from the warm run. At catalogue prices the build is $346, and $340 swaps the battery
  (6S 1100 to 4S 1500 mAh) and the motors (1750KV to 2450KV) for $330 at thrust to weight 10.9; live prices will
  differ. If the optimiser swaps something else, change the line.
- The partner picks Lucía (it calls `ask_peer` only when it judges a peer can help): rehearse it three times. If it
  answers instead, say "It usually asks Lucía first" and move on.
- "LED with no resistor" in Break it: the flash and the burnt-out readout show on the deployed build, and "5 V capacitor
  fitted backwards" smokes in the lesson's view.
- Lucía's voice message on her actual phone and browser, over HTTPS.
- Lucía's ghost from her phone shows on the laptop's fly page (this needs the relay; without it only tabs of one browser
  share a room).
- The Build Story names Lucía as the helper. It's written from tab 2's room only.
- Facebook's share dialog and the Web Share sheet open from the story card on the deployed URL.
- The counts in the close (12 boards, 13 robotics benches, 13 drones, 6 languages) still match what shipped.
- Real names instead of Maya and Lucía, if you tell a true story.
