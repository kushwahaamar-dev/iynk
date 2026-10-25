export const meta = {
  name: 'iynk-hx2',
  description: 'HackTX layer wave 2 for iynk: LabDock on every lab page, the landing and About pages, multiplayer drone races, Build Story sharing, wave-1 fixups then end-to-end proof of every sponsor flow, deploy prep',
  phases: [
    { title: 'Integrate', detail: 'dock, landing, race, story, fixups then e2e, deploy-prep (args.only picks a subset)' },
  ],
}

const R = args.root
const S = args.scratch

const CONTEXT = `PROJECT: iynk at ${R} (Next.js 16.4.3 App Router, React 19.3, Tailwind v4, TypeScript). It is its own local git repo (branch main). Do NOT touch the parent git repo at /Users/amar/Codes. Read ${R}/AGENTS.md first: this Next.js has breaking changes versus what you know, so read the relevant guide in ${R}/node_modules/next/dist/docs (route handlers, server-only code, environment variables, streaming, caching) before relying on any Next API.

iynk is the user's HackTX 2026 entry. Read these in full before you design anything:
- ${R}/docs/hacktx/STRATEGY.md : why we build what we build, the tracks we target, the 3-minute demo
- ${R}/docs/hacktx/HX-CONTRACT.md : BINDING for you: env vars, server conventions, every API shape, the realtime protocol, the Solana program interface, ownership (H12) and the dependency rule (H13)
- ${R}/docs/hacktx/BASE_ARCHITECTURE.md : the core's fixed decisions D1-D14 (D14 are the seams you plug into)
- ${R}/docs/hacktx/DEVPOST.md : the tracks and how they are judged
Skim ${R}/docs/SPEC.md (the brief) and read lines 1-40 of ${R}/docs/research/nextjs16-primer.md (binding rules for pages: static, sync default export, params awaited in an async child inside Suspense, localStorage via useSyncExternalStore).

RIGHT NOW about thirty other agents are building the core in this same tree: shell-app (layout, i18n, progress, FigureFrame, src/components/dock types), design-system (src/components/ui, shell), interpreters (src/lib/interp), the figure engines, the drone calculator (src/lib/drone), and the three lab UIs (src/lib/{boardlab,robotics,dronelab}, src/app/[lang]/{boards,robotics,drones}). Their files appear and change while you work. Read them as they land and adapt; never edit them. Until a module you need exists, code against the contract and a small adapter in your own folder, and list the gap in your report.
SCRATCH: ${S}/gm/<your-label>/ for throwaway files. TOOLS: Python Playwright works (python3 -I; p.chromium.launch()); Google Chrome is not installed and Brave headless hangs. WebSearch and WebFetch are available through ToolSearch: read official docs before coding against any external API, and record what you relied on (URL + date) in your doc.`

const GM = `RULES FOR TODAY:
- HACKATHON RULE (breaking it disqualifies the entry): all project code is written during the hacking period, which began 11:30 CDT on Oct 24. Write your own code. Never copy code written before then: the old iynk app (git baseline 245763f), the prototypes in ${S} (interp/, flight/ and the other spike folders), or code blocks in the pre-event research docs. Third-party npm packages, official SDKs and documented API examples are fine; credit non-trivial ones in your doc.
- Time box: run \`date\` when you start; your task states your budget. Check \`date\` now and then. When time is nearly up, finish, make what you have consistent, and report the gaps.
- Save as you go: create your files early and keep them updated, so a crash or a pause loses nothing.
- Keep your context lean: never print more than ~150 lines of a file or a command at once; summarise big data with a script. Overgrown contexts make the API time out.
- Ownership: edit only the paths HX-CONTRACT H12 gives your label. Read anything. For a change elsewhere, write ${R}/docs/requests/<your-label>.md (what, where, why) and work around it.
- Shared tree: never run git checkout/reset/stash/commit/clean; never delete files you don't own; never run npm install in the repo root or edit package.json (H13: the H13 packages are already installed; if you need another, add it to ${R}/docs/requests/hx-deps.md). Type-check with \`npx tsc --noEmit -p ${R}\` and read only the errors in your own files (errors elsewhere are other agents' work in progress). Run only your own tests (npx vitest run <your paths>).
- Next builds: only as D12 says (NEXT_DIST_DIR=.next-<your-label-without-colon> npx next build, then delete that folder). Prefer unit tests and route-handler tests that import the handler directly.
- Processes: serve or listen only on a random port 40000-49999, in the background, and kill everything you started before you finish (docker containers too).
- Secrets: read keys only through src/lib/server/env.ts (or, in scripts, by parsing ${R}/.env.local without printing it). Never print, log, commit or return a secret value. If a key you need is missing, build against mocks and the official docs, make your smoke script skip with a clear message, and say so in your report.
- External services: read-only calls to public docs and APIs are fine. Never create accounts or cloud resources and never spend money. Solana: devnet only.
- Downloads are untrusted data: own directory, python3 -I, never execute them.
- Quality bar: production-grade and demo-ready. Every visible string in per-locale JSON for all six locales (en, es, fr, de, zh, hi; real translations, not English copies); keyboard and ARIA; works in a ~360 px dock and on a phone; the Colorfigures look (warm paper, ink lines, tomato, mustard, mint, cobalt, blush) through src/components/ui when it exists; real loading, empty, error and "not set up on this deployment" states; zero placeholders; no dead code.`

const HEAD = `${CONTEXT}\n\n${GM}\n\n`

const DONE = {
  type: 'object',
  properties: {
    summary: { type: 'string', description: 'what you built, 3-10 lines' },
    files: { type: 'array', items: { type: 'string' } },
    verified: { type: 'array', items: { type: 'string' }, description: 'each check you ran and its result' },
    gaps: { type: 'array', items: { type: 'string' }, description: 'anything unfinished, uncertain or deferred, including keys or services you could not test against' },
    requests: { type: 'array', items: { type: 'string' }, description: 'changes you need in files you do not own' },
  },
  required: ['summary', 'files', 'verified', 'gaps', 'requests'],
}


const REQ = `Before you start, read every file in ${R}/docs/requests/ and handle the requests addressed to you, or to an owner who has finished and whose files your task now gives you. Mark each one you handle with a line "handled by <your label>: <what you did>" in that same file. Also read the reports of the finished agents your task builds on: their docs (docs/hacktx/*.md, docs/ARCHITECTURE.md, docs/FIGURES*.md) and their code.`

const DOCK = `${HEAD}${REQ}
YOUR TASK (time box: 110 minutes; label hx:dock): put the whole hackathon layer onto every lab page through the LabDock, so the demo's four flows work end to end (STRATEGY sections 5 and 7). shell-app and design-system have finished; your task gives you src/components/dock/** and src/components/shell/nav.ts.
Every lab page renders <LabDock lab itemId store figure/> (D14e; check the board, robotics bench, drone and fly pages). Do everything through it, so the lab pages and stores, which the lab follow-up agents own and are editing now, need no change from you:
1. The real LabDock (src/components/dock/**): tabs Partner (src/components/ai PartnerPanel), Together (src/components/realtime TogetherPanel), Real (src/components/search RealBuildPanel and NearbyPanel), Passport (src/components/solana PassportPanel) and Hardware (src/components/hw HardwareTwinPanel; board lab only, Chromium only). It is a side panel on wide screens and a bottom sheet on phones. Tabs show badges for unread chat and new hints. The open tab is remembered per viewer (localStorage through useSyncExternalStore, wrapped in try/catch). Everything works from the keyboard. Each tab honours useFeatures() (src/lib/features.ts). The window event iynk:dock-tab switches tabs (hx:partner's open_panel tool).
2. Rooms: wrap the dock in RoomProvider (src/lib/realtime). While a room is open it swaps store.dispatch, so the page's shared actions sync in server order (H7). Open the Together tab when the URL has ?room=. Render PresenceCursors over the figure through a portal into the figure's positioned box; find that box through the figure prop (read src/components/figure). Share the viewer's done keys (src/lib/progress) through presence so the partner can find helpers.
3. Telemetry: subscribe to the store in LabDock and call track() (src/lib/telemetry, hx:data) on state transitions: lesson attempt and pass, a fault shown, room join, credential issued. Laps belong to hx:race.
4. Navigation: add Together and Passport to src/components/shell/nav.ts (add their ids to NavId), with nav.<id> strings in src/i18n/messages/<lang>/shell.json for all six locales.
5. You own src/i18n/namespaces.ts from now on. Register the namespaces ai, search, solana, together and hw (NAMESPACES and Messages) where the orchestrator hasn't yet, and every new namespace whose English file appears under src/i18n/messages/en/ while you work (hx:landing's home, hx:story's story). Make sure each one has all six locale files with the English key set.
6. If a lab page doesn't render LabDock, or a store lacks something you need, write docs/requests/hx-dock.md (the orchestrator routes it) and work around it.
7. Verify: typecheck is clean for your files and the tests you touched are green. Then do a Playwright run on a D12 build: open a board, a robotics bench and a drone page; switch every dock tab; join a room in two browser contexts, both through the local relay (server/realtime; see docs/hacktx/REALTIME.md) and through BroadcastChannel. Take screenshots of each lab with the dock open, at desktop and phone width, look at them and fix what looks wrong.
You own: src/components/dock/**, src/components/shell/nav.ts, src/i18n/namespaces.ts, the nav strings in src/i18n/messages/*/shell.json, e2e/dock.spec.ts, docs/requests/hx-dock.md.`

const FIXUPS = `${HEAD}${REQ}
YOUR TASK (time box: 70 minutes; label hx:fixups): close every open request addressed to the hackathon wave-1 agents (hx:server-ai, hx:partner, hx:search, hx:solana-program, hx:solana-app, hx:realtime-server, hx:realtime-client, hx:mcp, hx:data, hx:hw). They have all finished, so their files are yours now. Known requests (the files have the details; look for newer ones):
- docs/requests/hx-mcp.md: export bomFor and findOffers (hx:search), planBuildNight (hx:server-ai), and credentialsOf with CredentialView (hx:solana-app). Then switch the MCP tools from HTTP calls to these functions.
- docs/requests/hx-server-ai.md item 5: the partner's push-to-talk uploads 16 kHz mono 16-bit PCM WAV.
- docs/requests/hx-realtime-client.md "For hx:realtime-server": welcome.room; the presence fields name, done and status; kick; the error codes; the optional resume; cursor -1.
- docs/requests/hx-partner.md "For hx:server-ai".
- The open items, gaps or TODO sections in each wave-1 doc (docs/hacktx/*.md) that say part of a contract section is unfinished: finish those.
Keep every HX-CONTRACT shape and change things additively. Keep the owners' tests green and add tests for what you add. Mark each request handled.
You own: the wave-1 hx agents' files per HX-CONTRACT H12, except src/components/dock/** (hx:dock) and src/components/realtime/** UI that hx:story is extending (coordinate through docs/requests/hx-fixups.md).`

const LANDING = `${HEAD}${REQ}
YOUR TASK (time box: 90 minutes; label hx:landing): the first screen judges see. Rework the home page (src/app/[lang]/page.tsx, from design-system, which has finished) and the About page (src/app/[lang]/about/**, from shell-app) for the hackathon without losing what they do (the dashboard of progress across the three labs, D7; the credits and the originals' MIT licence).
1. Home: a hero with a live, turnable figure (FigureFrame) and the one-line story from STRATEGY section 4; the three labs with progress ("0/16"); the four flows as clear entry points: build together (create a room: src/lib/realtime createRoom), ask the partner, build it for real, prove it (passport); the live counter (src/components/data LiveCounter) when the db feature is on. Fast: static, figures lazy, no layout shift. Colorfigures look, six locales, keyboard and ARIA, phone layout.
2. About: what iynk is, how it works (core plus hackathon layer, in plain words), credits for Meta Muse Spark, SerpApi, Solana, Vultr, Tiger Data, the Colorfigures skill, Next.js and every open-source package with a licence that asks for credit, plus the originals' MIT licence; privacy notes (no accounts, devnet only).
3. Strings go in a new home namespace, src/i18n/messages/<lang>/home.json, for all six locales. hx:dock registers it in src/i18n/namespaces.ts, so don't edit that file or shell.json. Metadata comes from alternatesFor.
4. Verify: typecheck, the touched tests, and screenshots of both pages at desktop and phone width in light and dark mode; look at them and fix.
You own: src/app/[lang]/page.tsx, src/app/[lang]/about/**, src/components/home/**, the strings you add.`

const RACE = `${HEAD}${REQ}
YOUR TASK (time box: 110 minutes; label hx:race): multiplayer drone races for "Most Entertaining" (STRATEGY section 3, demo beat 4). The flight agent and ui:dronelab have finished; your task gives you their flight files for additive changes, and with them every open request addressed to flight (docs/requests/ui-dronelab.md item 1, the fly page's outputs, faults and onCourseDone, among them).
1. In a room (src/lib/realtime useRoom: sendPose/onPose, H7.1), the fly page broadcasts the pilot's pose at up to 20 Hz and renders every other pilot as a ghost drone in the range (add a ghosts message to the range's typed host API in src/lib/flight and figures/flight; interpolate, show names, fade on disconnect).
2. Races: the host starts a synchronised countdown; gate splits and the finish order show for everyone; results post to the room chat and as flight.lap telemetry; the course leaderboard (src/components/data Leaderboard, /api/leaderboard) shows on the fly page when the db feature is on.
3. Other crafts in the range: the drone verify agents, running beside you, write src/lib/flight/crafts/<id>.ts and src/lib/flight/courses/<id>.ts for the twelve crafts besides quad5 (docs/requests/flight.md item 4). In your first 20 minutes, write scripts/gen-flight-index.mjs: it must be deterministic and idempotent, and it writes src/lib/flight/crafts/index.generated.ts, importing every crafts/*.ts and courses/*.ts. Make the fly page pick the craft from that index and fall back to quad5 when a craft has no model yet. Re-run the script before you finish. Don't write the per-craft files yourself.
4. Solo play keeps working exactly as before. Keyboard (WASD/arrows, Space, V, R), touch sticks and the Gamepad API keep working.
5. Verify: unit tests for interpolation and race state; a Playwright run with two browser contexts in one room through the local relay (server/realtime) flying the same course; screenshots; look at them and fix.
You own: additive edits to figures/flight/**, public/figures/flight/** (rebuilt), src/lib/flight/** (except the per-craft files above), scripts/gen-flight-index.mjs, src/components/flight/**, src/app/[lang]/drones/[drone]/fly/**; new src/components/race/**, src/lib/race/**, e2e/race.spec.ts; strings in the flight namespace for all six locales.`

const STORY = `${HEAD}${REQ}
YOUR TASK (time box: 80 minutes; label hx:story): Build Stories (STRATEGY sections 4 and 5, demo beat 2:40). After a session, Muse Spark writes the room's story, Muse Image draws its cover, and people share it.
1. In the Together panel (src/components/realtime, from hx:realtime-client, who has finished) add a "Write our story" action. Anyone can use it, limited to once every few minutes. It sends the room's event log and chat to /api/ai/story (H4; at most 300 events of who did what, what broke and who helped, taken from the room's action log and chat), then asks /api/ai/image for the cover. It shows the story card in the panel and posts a link to the room chat.
2. A share page /[lang]/story/[id] (src/app/[lang]/story/**) showing the story card: title, cover, the story, highlights, the helpers credited and the lab item with a link to try it, with per-story Open Graph metadata. Stories are stored through hx:data's database when the db feature is on (add a stories table as an additive migration in db/**, plus an /api/story route). Without a database the link carries the story in the URL fragment (compressed, base64url) and the page renders it on the client. Share through the Web Share API, a PNG download of the card (canvas), and Facebook's share dialog (https://www.facebook.com/sharer/sharer.php?u=<url>, which needs no app id).
3. Every string goes in a new story namespace, src/i18n/messages/<lang>/story.json, in all six locales; hx:dock registers it, so don't edit src/i18n/namespaces.ts. Keyboard and ARIA, a phone layout, the Colorfigures look.
4. Verify: unit tests for the encoding and the route. Run a Playwright flow with the AI mocked by route interception: write a story, open its share link in a fresh context and see the card. Take screenshots, look at them and fix.
You own: src/app/[lang]/story/**, src/components/story/**, src/app/api/story/**, the story additions to src/components/realtime/** and db/**, the strings you add.`

const E2E = `${HEAD}${REQ}
YOUR TASK (time box: 110 minutes; label hx:e2e): prove every hackathon flow works, and fix what doesn't (Completion is judged). hx:fixups has just closed the wave-1 requests; read its report (docs/requests/*.md lines \"handled by hx:fixups\"). hx:dock may still be mounting the dock: test the API flows and the standalone pages first and the dock flows last.
1. Playwright specs (e2e/hx-*.spec.ts), on a production build (D12), desktop and phone viewports: the partner (stream a reply with the Meta API mocked by route interception; a client tool highlights a part; a proposed change is accepted), rooms (two contexts through the local relay and through BroadcastChannel: join by link, presence, a shared action applies on both in order, chat translates (mocked), the baton), build it for real (SerpApi mocked from the recorded fixtures: offers, totals, the optimiser changes the pick and the calculator numbers), passport (verifyRun on a real run log; the attest route against a mocked or, if NEXT_PUBLIC_SOLANA_PROGRAM_ID and SOLANA_ISSUER_KEYPAIR exist, the real devnet program; the verify page shows it), /together (create, join, buddies, plan with mocked AI), /passport and /verify render in every locale, the hardware panel's feature detection, the MCP route (initialize, tools/list, one call), /api/status. axe on every new page and the dock.
2. When a spec fails, find the cause and fix it in the hackathon-layer files (src/lib/{server,ai,search,solana,realtime,hw,verify,telemetry}/**, src/components/{ai,search,solana,hw,data}/**, src/app/api/** except story/**, src/app/[lang]/{together,passport,verify}/**): their owners have finished. hx:dock (src/components/dock/**) and hx:story (src/components/realtime/**, story/**) may still be working: for bugs there, and in core files, write docs/requests/hx-e2e.md and the orchestrator routes them.
3. Report every flow with PASS/FAIL and what you fixed.
You own: e2e/hx-*.spec.ts, e2e/fixtures/**, and bug fixes in the hackathon-layer files listed above.`

const DEPLOY_PREP = `${HEAD}${REQ}
YOUR TASK (time box: 70 minutes; label hx:deploy-prep): make the production deploy boring. Do NOT deploy, push, create cloud resources or change DNS; the orchestrator does that after the user approves.
1. A clean production build: NEXT_DIST_DIR=.next-deploy npx next build (then delete the folder); list every error or warning with its owner; fix what is in deploy-only files.
2. scripts/vercel-env-push.sh: reads ${R}/.env.local and adds every non-empty H1 variable to the linked Vercel project for production and preview with \`vercel env add NAME <env>\` reading the value from stdin, never printing values; idempotent (skips names that exist unless --force); a --dry-run that prints only names.
2b. ${R}/.vercelignore so a CLI deploy can never upload a secret or junk: .env* except .env.example, **/*-keypair.json, *.pem, id_*, solana/target/, solana/node_modules/, server/realtime/node_modules/, .next*/, playwright-report/, test-results/, e2e/.auth/, docs/research/, ${S} paths if any. Prove it: run \`npx vercel build\` only if the project is linked (otherwise skip); list what the upload would contain with a dry script that applies .vercelignore to the tree, and check that no .env.local and no keypair appear.
3. Check the relay deploy scripts (scripts/realtime-*.sh, deploy/realtime/**) by running their dry-run or lint paths; fix what is broken there.
4. docs/hacktx/DEPLOY.md: the runbook in order: Vercel link and project settings (Next.js preset, Node 24), env push, the production deploy command, the relay on Vultr (create, deploy, TLS through Caddy, health check), the .tech domain (Vercel domain add, the DNS records for the apex and rt. for the relay), the Solana program id and issuer funding check, post-deploy smoke checks (curl /api/status, open the four flows), and rollback.
You own: scripts/vercel-env-push.sh, .vercelignore, docs/hacktx/DEPLOY.md, and fixes in deploy-only files.`

const ONLY = args.only || null
const want = l => !ONLY || ONLY.includes(l)
const run = (prompt, label) => want(label)
  ? agent(prompt, { label, phase: 'Integrate', schema: DONE }).then(r => { log(`${label}: ${r ? 'done' : 'FAILED'}`); return r })
  : Promise.resolve(null)

phase('Integrate')
const [dock, landing, race, story, fixE2e, deployPrep] = await Promise.all([
  run(DOCK, 'hx:dock'),
  run(LANDING, 'hx:landing'),
  run(RACE, 'hx:race'),
  run(STORY, 'hx:story'),
  run(FIXUPS, 'hx:fixups').then(fx => run(E2E, 'hx:e2e').then(e2e => ({ fixups: fx, e2e }))),
  run(DEPLOY_PREP, 'hx:deploy-prep'),
])
return { dock, landing, race, story, fixups: fixE2e.fixups, e2e: fixE2e.e2e, 'deploy-prep': deployPrep }
