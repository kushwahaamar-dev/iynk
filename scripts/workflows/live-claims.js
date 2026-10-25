export const meta = {
  name: 'live-claims',
  description: 'Check the pitch, Devpost and judge-QA claims on the live iynk deployment; re-check every failure; no code changes',
  phases: [
    { title: 'Check', detail: 'one agent per surface drives the live site' },
    { title: 'Recheck', detail: 'a second agent reproduces each failed or partial claim from scratch' },
  ],
}

const base = args?.base ?? 'https://iynk.vercel.app'
const scratch = args?.scratch

const RULES = `You are checking iynk's pitch, Devpost and judge-QA claims against its live production deployment at ${base}.
The repo is /Users/amar/Codes/ak/simlab and you only read it.

Rules:
- Change nothing in the repo: no edits, no new files in it, no git command that changes anything, no builds, no npm install, no deploys.
- Never touch http://localhost:3000, http://127.0.0.1:3000 or anything on port 43117: the user is recording a video on them.
- Put every script and file you make under ${scratch}/live-claims/<your label>/ and nowhere else.
- Load Playwright from the repo in an .mjs file: import { createRequire } from "node:module"; const { chromium } = createRequire("/Users/amar/Codes/ak/simlab/package.json")("playwright").
  Two people means two separate browser contexts (separate profiles), never two tabs of one context.
- A display name is set by seeding localStorage "iynk:together:v1" with {"v":1,"name":"<name>","color":"#ef6a4c"} through context.addInitScript before the page loads.
  The dock opens from the page's "Lab tools" button ([data-testid="lab-dock"][data-ready="true"] when ready); Together starts a room; a room link carries ?room=CODE.
- Never share to Facebook or any other site, never send email or messages. Reading a share link's URL is fine; posting is not.
- Keys live in .env.local: never print, log or copy a value.
- If you add a Build Buddies profile, delete it before you finish. Laps you fly go to the real leaderboard: fly at most two, as the pilot "Maya".
- Report what you observed. A check you could not run is "blocked" with the reason, never "pass". Quote the exact claim and where it is written (file and section).
- Keep it to about 20 minutes.`

const SURFACES = [
  {
    key: 'partner-room',
    prompt: `Surface: the lab partner in a two-person room, chat translation, and Build Stories.
Set up the demo as docs/hacktx/VIDEO.md and PITCH.md describe it: Maya (en, 1440x900) on /en/boards/uno-r3/blink, and Lucía (es, display name "Lucía", 390x844) on
/es/boards/uno-r3/blink, who first presses Run (Ejecutar) and waits until every check passes. Maya starts a room from Lab tools → Together; Lucía opens the same lesson with ?room=CODE.
Check:
1. The partner asks a peer. In Maya's Lab tools → Partner, ask a question a peer who passed Blink could help with (for example that her LED doesn't blink). Do it three times, each
   in a fresh chat, and count how often the partner asks Lucía (Lucía is asked, the ask_peer tool) versus answering itself. When Lucía answers in Spanish, check Maya sees it in English.
2. Chat translation: Lucía writes a Spanish chat message; Maya sees English (and the reverse).
3. Build Story: make the room's story and check that it names Lucía as the helper and gets a Muse Image cover. On the story card, read the Facebook share link (do not post) and say
   whether a Web Share button exists.
Claims to test: the Meta paragraph in docs/hacktx/DEVPOST-WRITEUP.md ("[Title Sponsor: Meta/Facebook]"), PITCH.md "Confirm before pitching" (partner picks Lucía, story names Lucía,
share dialog), JUDGE-QA.md "Recheck before judging" (questions 14, 15, 21).`,
  },
  {
    key: 'voice',
    prompt: `Surface: voice. Lucía's Spanish voice message arrives in English for Maya, and push-to-talk to the partner, through Muse Voice Transcribe.
Make a Spanish clip with macOS: say -v Paulina -o clip.aiff "Hola Maya, tu LED necesita una resistencia de doscientos veinte ohmios" then afconvert -f WAVE -d LEI16@16000 clip.aiff clip.wav.
Launch Chromium with --use-fake-ui-for-media-stream --use-fake-device-for-media-stream --use-file-for-fake-audio-capture=<the wav>. Set up a two-person room like the demo (Maya en on
/en/boards/uno-r3/blink, Lucía es on /es/boards/uno-r3/blink with ?room=CODE). Find the app's voice message / push-to-talk controls and use them from Lucía's side.
Check: the transcript is right, Maya gets it in English, and push-to-talk to the partner (if the UI has it) turns speech into a question that gets an answer.
Claims to test: the voice lines in docs/hacktx/DEVPOST-WRITEUP.md (Meta paragraph), PITCH.md "Confirm before pitching" (Lucía's voice message), JUDGE-QA.md "Recheck before judging".`,
  },
  {
    key: 'drone-serpapi',
    prompt: `Surface: quad5 and SerpApi on /en/drones/quad5.
Check:
1. "Build it for real": the live total, offers from Google Shopping, Amazon and eBay, and the budget optimiser at $340: what it swaps and the thrust to weight it ends at. PITCH.md
   "Confirm before pitching" needs [TOTAL], [BUDGET] and [SWAPS] from a warm run, and says at catalogue prices the build is $346 and $340 swaps the battery (6S 1100 to 4S 1500 mAh)
   and the motors (1750KV to 2450KV) for $330 at thrust to weight 10.9. Report the live values.
2. "Near you" (makerspaces, electronics and hobby shops, flying fields: Google Maps), events (Google Events) and videos (YouTube), from wherever the app shows them.
3. The partner answering a datasheet question from Google results read through the Extract API, with cited sources.
Claims to test: the "[SerpApi] Best Use of SerpApi" paragraph in docs/hacktx/DEVPOST-WRITEUP.md, JUDGE-QA.md question 18, PITCH.md's quad5 lines.`,
  },
  {
    key: 'break-fly',
    prompt: `Surface: Break it and flying.
Check:
1. On the Uno R3 (Board Lab, /en/boards/uno-r3 and its Blink lesson), Break it: "LED with no resistor" flashes and shows the burnt-out readout; find the lesson with
   "5 V capacitor fitted backwards" and check it smokes in that lesson's view; a motor on the 5 V pin browns the board out (if the content has it).
2. /en/drones/quad5/fly: angle and acro mode, third person and FPV, gates; break the drone on purpose (flight controller mounted backwards, props swapped) and check it flips and the
   replay runs at a third of the speed with the reason on screen; gold, silver and bronze times; the daily challenge and its share link.
3. Ghosts across devices: two contexts in one room through the relay (Maya 1440x900 and Lucía 390x844 with touch, both on /en/drones/quad5/fly or /es/... with ?room=CODE): Lucía flies
   and her ghost shows on Maya's page.
4. The leaderboard (Tiger Data): fly one lap as "Maya" and check the fly page's leaderboard (or /api/leaderboard?course=<that course>) shows it.
Claims to test: the "[Most Entertaining] Jester's Court" paragraph in docs/hacktx/DEVPOST-WRITEUP.md, PITCH.md "Confirm before pitching" (LED with no resistor, 5 V capacitor, Lucía's
ghost), the Tiger Data paragraph's leaderboard sentence.`,
  },
  {
    key: 'mcp-counts',
    prompt: `Surface: the MCP server, the content counts and the facts the write-up states.
Check:
1. ${base}/api/mcp over POST (JSON-RPC; GET is 405 by design): initialize, tools/list (docs/hacktx/DEPLOY.md lists 7 tools), and call search_catalog, get_item, drone_calc,
   price_parts and plan_build_night once each; say what create_room and get_passport do without calling anything that spams (Solana is off on purpose).
2. Content counts on the live site against the write-up: 12 boards, 13 robotics benches, 13 drones, 6 languages, 80 figure pages, 71 board lessons, 22 courses (docs/hacktx/DEVPOST-WRITEUP.md
   "Confirm before submitting"; PITCH.md's close). Count from the live catalogue pages and figure URLs, and from the repo's content index where a page can't show it.
3. The Meta model ids in .env.example against docs/hacktx/AI.md (model names only, never key values).
4. Read-only repo checks: node scripts/figure-strings.mjs --static and npx vitest run src/i18n/figure-strings.test.ts (the write-up claims 4087 figure strings in every language).
5. The live counter: ${base}/api/live now that the database is on, and whether any page shows LiveCounter (JUDGE-QA.md question 25).
Claims to test: JUDGE-QA.md "Recheck before judging" (questions 16, 22, 25), DEVPOST-WRITEUP.md "Confirm before submitting".`,
  },
]

const CHECKS = {
  type: 'object',
  properties: {
    surface: { type: 'string' },
    checks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'short kebab-case id' },
          claim: { type: 'string', description: 'the claim, quoted' },
          source: { type: 'string', description: 'file and section where the claim is written' },
          result: { type: 'string', enum: ['pass', 'fail', 'partial', 'blocked'] },
          evidence: { type: 'string', description: 'what you saw: values, texts, counts, screenshots in the scratch folder' },
          docFix: { type: 'string', description: 'for fail or partial: the wording the doc should use instead, or empty' },
        },
        required: ['id', 'claim', 'source', 'result', 'evidence', 'docFix'],
      },
    },
  },
  required: ['surface', 'checks'],
}

const VERDICT = {
  type: 'object',
  properties: {
    confirmed: { type: 'boolean', description: 'true if the claim really fails or holds only partly on the live site' },
    result: { type: 'string', enum: ['pass', 'fail', 'partial', 'blocked'] },
    evidence: { type: 'string' },
    docFix: { type: 'string' },
  },
  required: ['confirmed', 'result', 'evidence', 'docFix'],
}

const results = await pipeline(
  SURFACES,
  (s) => agent(`${RULES}\n\nYour label: ${s.key}.\n\n${s.prompt}`, { label: `check:${s.key}`, phase: 'Check', schema: CHECKS }),
  (found, s) => {
    if (!found) return null
    const doubtful = found.checks.filter((c) => c.result === 'fail' || c.result === 'partial')
    if (doubtful.length) log(`${s.key}: ${doubtful.length} failed or partial claim(s) go to a recheck`)
    return parallel(doubtful.map((c) => () =>
      agent(`${RULES}\n\nYour label: recheck-${s.key}-${c.id}.\n\nAnother agent reported that this claim does not fully hold on the live site. Reproduce it from scratch, your own way,
and try hard to show the claim does hold (the first agent may have driven the UI wrong, missed a control, or not waited long enough). Only confirm the failure if you see it yourself.

Claim: ${c.claim}
Written in: ${c.source}
First agent's result: ${c.result}
First agent's evidence: ${c.evidence}
First agent's suggested wording: ${c.docFix}`, { label: `recheck:${s.key}:${c.id}`, phase: 'Recheck', schema: VERDICT })
        .then((v) => ({ ...c, recheck: v })),
    )).then((rechecked) => ({
      surface: s.key,
      checks: found.checks.map((c) => rechecked.filter(Boolean).find((r) => r.id === c.id) ?? c),
    }))
  },
)

return { surfaces: results.filter(Boolean) }
