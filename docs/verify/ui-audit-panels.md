# UI audit: the lab dock and its panels (F-audit-panels, 2026-10-25 02:30 CDT)

Final pass, phase 1 (`scripts/workflows/final.md`). Surface: the lab dock on desktop and its phone sheet, with
everything inside it: the lab partner, Together (rooms, invite, chat), Build it for real (prices, the optimiser, Near
you, Video help), and the hidden Passport and Hardware tabs. Also a quick look at `/en/together`, which F-build-panels
owns.

## How this was checked

- Server: the driver's production build on `http://127.0.0.1:3430`, read only. `/api/status` there says `ai`, `search`,
  `voice`, `realtime`, `db` off, `solana` on (Passport still hidden: the config account check fails, so the tab stays
  off, as designed).
- Pages: the Blink lesson `/en/boards/uno-r3/blink`, the bench `/en/robotics/transistor-switch`, the drone
  `/en/drones/quad5` and its fly page `/en/drones/quad5/fly`.
- Desk runs: 1440 × 900 light en, light de, dark en; 1920 × 1080 light en, dark hi. Phone runs: 390 × 844 (iPhone 13
  touch profile) light en, dark hi, light de. 156 screenshots, all read. Every tab of the dock opened on every run.
- Clicked what a judge would: arrow keys across the tabs, Start a room, the name form, Invite (QR dialog), chat, Leave
  room, Join with a bad code, a two-tab room, the budget slider and "Use this build in the lab", Alternatives, the room
  link `?room=k7m2qx` on desk and phone, Escape and a backdrop tap on the sheet.
- A second pass with `/api/status` mocked to `ai`, `search`, `voice` on (the real requests still fail), to see the
  partner chat and the search forms the pitch shows.
- axe (`@axe-core/playwright`) on the dock, all three tabs: desk light, desk dark and the phone sheet.
- Scripts and raw numbers: `<scratchpad>/F-audit-panels/{desk,phone,interact,together,flap,on}.mjs`, `desk.json`,
  `phone.json`, `interact.log`. Screenshots: `<scratchpad>/F-audit-panels/shots/`, where `<scratchpad>` is
  `/private/tmp/claude-501/-Users-amar-Codes-ak-simlab/5990e040-4ffc-48cb-ba35-923d41b56efe/scratchpad`.

## The numbers

| Page (1440 × 900, en) | Dock top (px) | Page height | Screens down | Dock width | Placement |
|---|---|---|---|---|---|
| Lesson, Blink | 6670 | 7756 | 7.4 | 1232 | full width, after "Wire it in", before prev/next |
| Bench, transistor switch | 1400 | 9180 | 1.6 | 710 | left column, between "Selected part" and the serial monitor |
| Drone, quad5 | 1147 | 2563 | 1.3 | 633 | left column, under the Betaflight log |
| Fly, quad5 | 2121 | 2997 | 2.4 | 465 | bottom of the right aside, under the leaderboard |

- Same y at 1920 × 1080 (the frame is `max-w-7xl`, so 344 px gutters each side; lesson dock = 6.2 screens down).
- Height on the default tab (Partner): 512 px on every page and run, for one 82 px "not set up" callout
  (the partner frame has `min-h-[24rem]`).
- Build it for real: 905 px tall at 1232 wide (lesson), 1977 px at 465 wide (fly), 2164 px of scroll in the phone sheet
  (drone).
- Type inside Build it for real (fly page): 15 different size/weight/family combinations (mono 12/400, 12/700, 14/600,
  14/700, 14/800, 16/700, 16/800, 18/800, 20/800, 30/800; sans 12/400, 14/400, 15.2/400, 16/600; serif 16/600).
  The partner byline is 11.2 px.
- Phone sheet height by tab: Partner 540, Together 388, Build it for real 717 (the 85dvh cap). Its top edge jumps
  304 → 456 → 127 px as you switch tabs.
- Phone tab list: overflows by 30 px in en ("BUILD IT FOR REA" cut), 4 px in de, 0 in hi.
- Phone "Open lab tools" button: 154 × 44 at bottom centre (y 788–832) on every page; de 170 wide.
- Page errors: 0 on all 40 page loads. Sideways scroll at 390: none (document width 390 everywhere).
- axe: 0 violations in the dock, all three tabs, desk light, desk dark and the phone sheet.

## Findings, worst first

### Blockers

**B1. On desk the dock is far below the fold on every lab page, so the partner, rooms and prices are invisible to a
first-time judge, and the partner can never be seen next to the figure it points at.**
Where: all four pages, 1440 and 1920, every language and theme (table above). Worst on the lesson: y 6670, 7.4 screens
down, after the whole "Wire it in" list (16 module cards). Screenshots: `shots/lesson-1440-light-en-full.png`,
`shots/bench-1440-light-en-full.png`, `shots/drone-1440-light-en-full.png`, `shots/fly-1440-light-en-full.png`.
Why it matters: the pitch (`docs/hacktx/PITCH.md` 0:35) has the partner "point at the LED in the figure" on the Blink
lesson. The figure is at y 470, the partner at y 6670: the audience sees one or the other. Three sponsor features live
in this dock and nothing on screen says they exist. On the bench the dock also pushes the serial monitor and live
status down by 524 px; on the drone page it pushes "Meet the freestyle quad" down.
Proposal: make the dock the workspace's right-hand side panel on desk (≥ 1024 px), the way an IDE's secondary sidebar
works:
- A slim rail on the right edge of the lab workspace, 48 px wide, sticky under the header (`top: var(--header-h)`,
  `height: calc(100dvh - var(--header-h))`), with three 44 × 44 icon buttons (Partner, Together, Build it for real)
  plus the label as a tooltip and `aria-label`. A dot on Together while you are in a room.
- A rail button opens a 400 px panel (440 px at ≥ 1680) beside the rail, full height, its body scrolling on its own.
  At ≥ 1440 it narrows the workspace (the figure column gives up the width); at 1024–1439 it overlays the page as a
  non-modal drawer with a shadow and closes with Escape and its × button.
- Closed by default. Open by default only when the page has `?room=` (then on Together) or the user left it open last
  time (one remembered setting, not per page).
- Take it out of the four page flows: `LessonWorkspace`, `BoardWorkspace`, `BenchWorkspace`, `DroneWorkspace` and
  `FlyWorkspace` render `<LabDock>` once at the workspace root instead of inside a column (the call sites are in
  F-build-boards', -robotics' and -drones' files: each moves one line; the panel itself is F-build-panels').
- Keep `data-testid="lab-dock"`, `data-ready`, `data-layout="desk"` on the panel root and the tab names. `e2e/dock-shared.ts`
  `openDock(page, false)` expects the desk dock visible without a click; it must click the rail button first. That
  helper is also used by `e2e/room.spec.ts` and `e2e/fly-fun.spec.ts`, and `dock-shared.ts` is not matched by
  F-build-panels' `e2e/dock*.spec.ts`: F-direction should hand `e2e/dock-shared.ts` to F-build-panels.

**B2. An invite link opened on a desk shows nothing about the room.**
Where: `/en/boards/uno-r3/blink?room=k7m2qx`, 1440 × 900. The dock silently switches to Together and waits for a name,
6670 px down; the top of the page looks exactly like a normal visit. Screenshot: `shots/i-desk-roomlink-fold.png`.
On a phone the sheet opens straight onto "Who are you?" (`shots/i-phone-roomlink.png`), which is right.
Why: the person you invited thinks the link is broken, and the host sees nobody arrive. Room A in the pitch setup is a
desk tab opened from exactly this kind of link.
Proposal: with B1's panel, `?room=` opens the panel on Together. Without B1, at least scroll the dock into view and
focus the name field on load when `?room=` is present.

**B3. Build it for real shows "Cheapest total $0.00" for every board and bench when live prices are off.**
Where: lesson and bench, all sizes, all languages. Every line reads "No listing found" with a "—" price, then a big
"$0.00" total and "6 parts have no price yet" (`shots/lesson-1440-light-en-tab-build-it-for-real.png`,
`shots/bench-1440-light-en-tab-build-it-for-real.png`, `shots/bench-390-dark-hi-sheet-2.png`).
Why: "$0.00" for an Arduino build looks like a bug, and "No listing found" claims a search ran that never ran. Drones
are fine because their lines carry catalogue prices (`estimate`); board and robotics lines from `boardBom` /
`roboticsBom` have none.
Proposal (`src/components/search/RealBuildPanel.tsx`): when `availability === "off"` and no line has an `estimate`,
render the list as a plain parts checklist (name, quantity, no price column, no "No listing found") and drop the total
card. Title it "What you need" instead of "Parts list" in that state if a new string is acceptable; otherwise keep
`real.parts`. If someone can add catalogue estimates to `src/lib/search/bom.ts` for board and robotics parts (not a
panels-owned file today), the drone layout then works everywhere.

### Ugly

**U1. Every tab opens on a "not set up" message first, in a 512 px box.**
Where: desk, all pages; phone sheet, 540 px. The Partner tab is the default and this deployment has no AI key, so the
first thing in the dock is a 400 px empty frame around one callout (`shots/lesson-1440-light-en-tab-partner.png`,
`shots/lesson-390-light-en-sheet-0.png`).
Proposal (`LabDock.tsx`, `PartnerPanel.tsx`): open on the first tab that works. Partner when `features.ai`; otherwise
Together for boards and benches, Build it for real for drones (the optimiser works on catalogue prices). Keep the
Partner tab (e2e and PITCH use it) but make its off state compact: no `min-h-[24rem]`, no transcript well, just the
header row and a one-paragraph note (about 120 px).

**U2. Near you and Video help say "Live prices aren't set up on this deployment."**
Where: Build it for real, every page (`shots/drone-1440-light-en-tab-build-it-for-real.png`). Both reuse
`real.notSetUp`. Three stacked callouts in one tab, two of them about the wrong feature.
Proposal (`NearbyPanel.tsx`, `VideoHelp.tsx`): when search is off, say it once at the top of the tab ("Live prices,
places near you and video search need the search service, which isn't set up on this deployment."), then hide Near you
and Video help entirely. One new key in `search.json` × 6; or reuse `real.notSetUp` at the top and simply hide the
other two sections.

**U3. One guest joining a room shows "joined · left · joined" in the host's chat, and the guest gets a new member id
mid-join.**
Where: any lab page, two tabs, broadcast transport (`shots/room-two-host-dock.png`; `flap.mjs` shows the three lines
1.2 s after the guest's page loads, and nothing after that).
Cause: `LabRoom` (`src/components/dock/LabRoom.tsx`) gives `RoomProvider` an idle stand-in store until `LabDock`
registers the real one after mount. The join effect in `src/lib/realtime/provider.tsx` (deps
`[roomId, named, lab, itemId, store, locale]`) re-runs on that store swap, so the guest leaves and joins again.
Proposal (in `LabRoom.tsx`, panels-owned): give `RoomProvider` one stable proxy store for the page's life
(`getState`/`dispatch` forward to the registered store, `subscribe` re-attaches listeners when the target changes), so
the effect never sees a new `store`. Alternative: hold the join until the real store is registered.

**U4. Two tabs of one browser are two people with the same name and colour.**
Where: Together, broadcast transport (the only one this deployment has). The identity is per device, so the demo of
"rooms work between tabs of this browser" shows "2 people here: Host (you), Host", and "Pass the keyboard to Host"
(`shots/room-two-host-dock.png`).
Proposal: in broadcast mode, ask for a name in each new tab that arrives by a room link (keep the stored one as the
input's default), or suffix the second tab ("Host 2"). Identity storage is in `src/lib/realtime` (not panels-owned):
note for F-direction; `IdentityForm.tsx` can at least prefill instead of skipping.

**U5. The phone "Open lab tools" pill covers what is under it, and competes with each page's main action.**
Where: 390 × 844, all pages. Lesson: it hides the figure's "Remove a part" and "Break it" chips on first load
(`shots/lesson-390-light-en-fold.png`). Fly: it sits on the inner edges of both touch sticks on load
(`shots/fly-390-light-en-fold.png`) and over the battery reading once the sticks are mid-screen
(`shots/i-fly-phone-sticks.png`). It is the same mustard primary as "Run", "Arm" and "Do it".
Proposal (`LabDock.tsx`): a 48 × 48 round icon button at the bottom end corner (`inset-inline-end: 16px`,
`bottom: max(16px, safe-area)`) in the secondary (paper + ink) style, with "Open lab tools" as its accessible name
(e2e finds it by that name). Hide it while the fly page is armed (the flight store knows) or while the flight canvas
fills more than half the viewport (IntersectionObserver), and add `padding-bottom: 80px` to lab pages on phones so it
never sits on the last control.

**U6. The phone sheet changes height with every tab, and its tab list is cut off in English.**
Where: 390 × 844. Sheet top 304 → 456 → 127 px across the three tabs; "BUILD IT FOR REA" clipped with no scroll cue
(`shots/lesson-390-light-en-sheet-0.png`, `-sheet-1.png`, `-sheet-2.png`).
Proposal (`LabDock.tsx` passes a class to `Sheet`): a fixed sheet height, `h-[85dvh]`, so tabs switch in place. Tabs
in the sheet as an equal-width segmented row (three columns, labels may wrap to two lines, sentence case) instead of
uppercase folder tabs, so all three fit at 390 in every language.

**U7. Boxes inside boxes.**
Where: every tab. Partner: dock card → partner frame with its own border and header → dashed intro box → callout,
four nested outlines (`shots/on-desk-0.png`, `shots/lesson-1440-light-en-tab-partner.png`). Phone: sheet card →
partner frame → intro box. Build it for real: dock card → total card, optimiser card, dashed alternatives box, and a
callout per section. The dock also carries a hint line ("Partner, friends and real parts for this lab") above its
own tabs, and the Build it for real tab repeats its name as the first heading.
Proposal: in the dock, the panel is the only box. Drop the partner `Frame` border and radius when it sits in the dock
(keep its header as a plain row with a hairline under it), drop the dashed intro border, drop the dock's hint line,
and drop the `PanelHead` title where it repeats the tab name (keep the lede). The optimiser keeps one card; the total
becomes a plain row with a rule above it.

**U8. Too many type styles in one panel.**
Where: Build it for real, 15 size/weight/family combinations (numbers above); partner byline 11.2 px; callout titles
are whole sentences in uppercase mono ("THE LAB PARTNER ISN'T SET UP ON THIS DEPLOYMENT").
Proposal: in the panels use four styles: kicker (mono 12/700 uppercase, for section labels only), body (sans 14/400),
strong (sans 14/600 for part names), figure (mono 16/700 tabular for prices; 24/800 for the one total). Nothing under
12 px. Callout titles in sentence case, sans 14/700 (the `Callout` component is F-build-shell's).

**U9. Hindi labels in the UI face get monospace-wide gaps between words.**
Where: hi, all sizes; every `font-ui` string in the dock (tabs, kickers, "No listing found", the callout title):
"कोई  लिस्टिंग  नहीं  मिली" (`shots/bench-390-dark-hi-sheet-2.png`, `shots/lesson-390-dark-hi-sheet-0.png`). The
space glyph comes from IBM Plex Mono, which has no Devanagari, and the uppercase tracking spreads it further.
Proposal (F-build-shell, `globals.css`): under `html:lang(hi)` (and `:lang(zh)`), put the script face before the mono
in `--font-ui`, and set `letter-spacing: 0` on `.font-ui` there.

**U10. The four placements give the dock four widths.**
1232, 710, 633 and 465 px (table above). The drone's Build it for real is 1989 px tall at 633 wide; the same panel on
the lesson is 905 px tall at 1232 wide, with each price about 1150 px away from its part name. B1's one side panel fixes this;
if B1 is not done, cap the dock's content at 720 px and give it the same column on every page.

**U11. The room code field is 1100 px wide on the lesson page.**
Where: Together, lesson, 1440 (`shots/lesson-1440-light-en-tab-together.png`). A 6-character code in a field the
width of the page.
Proposal (`TogetherPanel.tsx`): `max-w-[16rem]` on the join row; inside B1's 400 px panel this solves itself.

**U12. `/en/together`: half the page is two "Not set up on this deployment" cards.**
Where: 1440 and 1920 (`shots/together-1440-light.png`): Build Buddies and Build Night planner each take a full-width
card with a callout. The Join card has about 130 px of empty space under its field.
Proposal (`src/app/[lang]/together/**`): rooms first (Start and Join side by side, equal height, no empty space);
the two AI features as one compact row below ("Build Buddies and the Build Night planner need the AI service, which
isn't set up on this deployment.") when AI is off; full cards only when it is on.

### Nits

- **N1.** The tab focus ring is clipped top and bottom by the tab list's `overflow-x-auto`
  (`shots/i-drone-focus-tab.png`): only the side edges of the 2 px ring show. `Tabs.tsx` (F-build-shell): `p-1` on
  the tablist, or an inset ring on tabs.
- **N2.** On a phone room link the sheet's first focus is the Close button; it should be the "Your name" field
  (`shots/i-phone-roomlink.png`).
- **N3.** Drone, prices off: the card says "Cheapest total" and the footnote "Prices are in US dollars from US stores",
  but every number is a catalogue price. Say "Catalogue total" and drop the stores note when no line is live.
- **N4.** Optimiser: after lowering the budget it says "For $16.00 more: thrust-to-weight 12.5 and 5.2 min of
  flight", which is the build you already have. When the upgrade equals the current pick, say "Your current build"
  instead.
- **N5.** Together's lede promises "the chat is translated into each person's language" while the room says
  "Translation isn't set up on this deployment". When translation is off, end the lede after "the same bench".
- **N6.** In a room, three separate "not set up" notes stack (relay chip, translation, voice). One line under the room
  bar is enough; hide the mic button when voice is off instead of showing it with a note.
- **N7.** "Join the room" is disabled until a name is typed, with no hint why. Enable it and show the field's error on
  submit, or say "Type a name to join" next to it.
- **N8.** "Change name" floats alone at the bottom of the room as a ghost button; it belongs in the room bar's menu
  next to Leave room.
- **N9.** The Hardware tab can never appear: `normalize()` in `src/lib/features.ts` forces `hw` off ("until phase 4"),
  so `HardwareTwinPanel` ships unreachable. Leave it hidden (Amar kept hardware out of the autonomous work); don't
  spend polish time on it.

## What already works and must be kept

- One dock on all five lab pages with the same three tabs in the same order, real WAI-ARIA tabs (arrow keys move and
  select, Home/End), and panels that stay mounted so a typed draft survives a tab switch.
- The phone sheet: opens on its button, closes on Escape and on a backdrop tap, gives focus back to "Open lab tools"
  every time (checked on 12 runs). A room link opens it straight onto "Who are you?".
- Rooms: Start a room → name and colour → live room with roles, the keyboard baton, chat and Leave, all working on
  the broadcast transport; the invite dialog's QR code and Copy link are clean (`shots/i-drone-invite.png`); a bad
  code gets a clear inline error.
- The drone optimiser: works on catalogue prices with search off, the budget slider updates the best build live,
  "Use this build in the lab" appears when it can apply, and the numbers check out against `quad5.ts` (4S 1500 +
  2306 2450KV: 178 → 182 g battery, 4 × 32 → 4 × 31 g motors, 514 g both ways).
- The partner chat with AI on (mocked): clear intro, suggestion chips that wrap, "Stuck? Give me a hint", 44 px send
  and mic buttons, the failure shown as a reply in the transcript (`shots/on-desk-0.png`, `shots/on-desk-sent.png`).
- Accessibility: axe clean in light, dark and the phone sheet; every control in the panels is at least 44 px except the
  optimiser's range input (16 px tall, a native slider: give its thumb a 44 px hit area on phones) and the "show
  other offers" toggle in a part line (`min-h-8`, 32 px; only visible with live prices).
- No page errors, no sideways scroll, German and Hindi tab labels fit on desk, dark mode colours hold.
- Strings the demo and tests use, to keep exactly: "Partner", "Together", "Build it for real", "Lab tools",
  "Open lab tools", "Start a room", "Join", "Room code or invite link", "The lab partner isn't set up on this
  deployment", "Live prices aren't set up on this deployment." (PITCH.md quotes it with the drone line),
  "This deployment has no relay server, so rooms work between tabs of this browser only.", "Use this build in the lab".
