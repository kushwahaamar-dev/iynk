export const meta = {
  name: 'redesign',
  description: 'Redesign every page outside the labs (shell, landing, catalogues, Together, About, Passport, Verify) to one editorial system; labs untouched',
  phases: [
    { title: 'Build', detail: 'four owners, disjoint files, in parallel' },
    { title: 'Review', detail: 'one reviewer screenshots every page as a set and fixes what is off' },
  ],
}

const scratch = args?.scratch

const BRIEF = `You are redesigning part of iynk (always written lowercase), a free hardware lab in the browser: Board Lab (12 microcontroller boards),
Robotics Lab (13 benches) and Drone Lab (13 drones plus a flight sim), social (rooms, a Meta-powered lab partner), in six languages. Next.js 16.4 App Router,
React, Tailwind 4, repo /Users/amar/Codes/ak/simlab. Read AGENTS.md and the relevant guide in node_modules/next/dist/docs/ before using a Next API you are unsure of.

Why: the owner says the labs are good but everything outside them (landing, catalogue pages, Together, About, header, footer) looks generic and template-like:
system fonts, boxed cards, no point of view. Hackathon judges see it in under an hour and the demo video is recorded right after. The goal is that a
design-literate judge opening the landing page thinks "wow, what taste". Precise, quiet, confident, engineered. Not decoration.

One system for every page (every agent follows this, so the pages read as one product):
- References: Linear, Vercel, Teenage Engineering, Nothing, Stripe Press, Arc. Editorial, technical, generous whitespace.
- Type: Geist for everything, Geist Mono for labels, numbers, metadata and small uppercase eyebrows (11 to 12px, tracking 0.08em), Instrument Serif italic only
  as a rare accent word inside a big headline. The shell agent loads them with next/font/google in src/app/[lang]/layout.tsx as the CSS variables
  --font-sans, --font-mono and --font-display (src/app/globals.css already reads those names; Devanagari and CJK keep their fallbacks there).
  Display headlines clamp(44px, 7vw, 104px), letter-spacing -0.035em, line-height 0.95; section titles clamp(28px, 3.4vw, 48px), -0.02em; body 16 to 17px,
  line-height 1.55, at most about 62ch per line.
- Layout: use the whole viewport. Content up to 1440px wide with fluid side gutters clamp(16px, 4vw, 56px), a 12-column grid, asymmetric compositions, big
  numbers. Sections separated by space (clamp(72px, 10vw, 160px)) and 1px hairlines in the existing border colour, not by boxes inside boxes.
- Imagery: the inked 3D figures (FigureFrame and FigureStill from @/components/figure, already used on these pages) are the hero art. Show them large, on the
  paper ground. No stock gradients, glass, glows, emoji or heavy shadows. At most one accent colour, taken from the existing tokens.
- Motion: only on enter (opacity and an 8px rise, 400 to 600ms, ease-out); nothing when prefers-reduced-motion is set; no scroll-jacking.
- Light is the default and dark is equally finished. WCAG AA contrast in both (axe must pass).
- Phone (390px) is first-class: no sideways scroll, 44px tap targets, headlines that scale down cleanly.
- Do not change the labs: nothing under src/components/{boardlab,robotics,dronelab,flight,figure,dock,ai,search,realtime,hw,data,settings}, no lab route
  below an item (boards/[id]/..., robotics/[id], drones/[id]/...), not WorkspaceBar, WorkspaceFrame or StageDrawer, and no change to the value of an existing
  CSS token the labs read. Add new tokens or classes instead.
- Every visible string comes from the i18n messages in src/i18n/messages/<locale>/*.json. A new or changed string goes into all six locales (en, es, fr, de,
  zh, hi) with a real translation and the same key, and only in the message files you own. Prefer existing strings; cut words rather than add them.
  The brand is "iynk" in every language.
- Keep what works and what the tests rely on: every link target, data-testid, role and accessible name used in e2e/ (grep e2e/ for your page's routes and
  selectors before you change markup), the language picker, theme, settings, nav, lesson progress, the live Uno figure on the landing, each catalogue card's
  figure, and the "Start with the Arduino Uno R3" entry.

How you work:
- Edit only the files you own (listed below). If you need something from another owner, write it in your result instead of editing their file.
- Look at what you build. Run your own dev server: NEXT_DIST_DIR=.next-dev-<your label> npx next dev -p <your port> (ports below), and screenshot with Playwright
  from an .mjs file under ${scratch}/redesign/<your label>/ (load it with createRequire("/Users/amar/Codes/ak/simlab/package.json")("playwright")).
  Shoot 1440x900 and 390x844, light and dark (emulateMedia colorScheme), in en plus one long language (de) and hi. Iterate until it is excellent.
  Never touch ports 3000 or 43117 (a server and the relay the owner may be using).
- Before you finish: npx tsc --noEmit (no new errors), npx eslint <your files> --quiet, npx vitest run src/i18n if you touched messages, and run axe on your
  pages if @axe-core/playwright is installed. Stop your dev server and delete your .next-dev-<label> folder. Do not commit tsconfig.json (next dev adds lines
  to it; the driver reverts them).
- Commit only your own files: git commit -m "<what changed and why>" -- <your paths> (retry if .git/index.lock is busy). Do NOT push: every push deploys the
  live site, and the driver pushes after the full check. No Co-Authored-By or agent lines.
- You have about 25 minutes. Return: the files you changed, what you did, your screenshot paths, the checks you ran and their results, and anything you need
  from another owner.`

const OWNERS = [
  {
    key: 'shell',
    port: 3611,
    files: `src/app/[lang]/layout.tsx (fonts), src/app/globals.css (font variables plus new tokens and classes only), src/components/shell/SiteHeader.tsx,
SiteFooter.tsx, Logo.tsx, NavLinks.tsx, MobileNav.tsx, FooterNav.tsx, LanguagePicker.tsx, SettingsMenu.tsx, ThemeControl.tsx, and the app icons
(src/app/icon.svg and any apple-icon or favicon there). You edit no message file.`,
    task: `The header, footer, type and the iynk wordmark.
1. Load Geist, Geist Mono and Instrument Serif with next/font/google as --font-sans, --font-mono and --font-display, and check that globals.css picks them up.
2. Design a real iynk wordmark (Logo.tsx, lowercase, set in Geist with tuned spacing or drawn as SVG) and a matching app icon (icon.svg).
3. Redesign the header (slim, precise, sticky, hairline bottom border, nav in the same type system, settings and language as quiet controls) and the footer
   (an editorial footer with the wordmark, the nav groups and small mono metadata). Keep every nav link, accessible name and test id.
4. The header and the fonts also show on lab pages: open /en/boards/uno-r3/blink, /en/robotics/transistor-switch and /en/drones/quad5/fly at 1440 and 390 after
   your change and make sure nothing overflows or breaks there.`,
  },
  {
    key: 'landing',
    port: 3612,
    files: `src/app/[lang]/page.tsx, everything under src/components/shell/dashboard/, a new folder src/components/marketing/ for section primitives you make,
and the dashboard.* keys in src/i18n/messages/<locale>/shell.json (all six locales; you are the only agent editing shell.json).`,
    task: `The landing page (/[lang]), the most important page.
A first screen that lands the product in five seconds: a big confident headline with one accent word, one sentence, the primary action ("Start with the
Arduino Uno R3") and a quiet secondary one, and the live inked figure large beside or behind it. Then the three labs as a strong editorial row or grid (each
with its figure, its count and its name), the four ideas (see, code, break, fly) as numbered statements rather than cards, the social part (rooms, the lab
partner that finds you a friend, six languages), and a closing call to action. Keep lesson progress and every link working.`,
  },
  {
    key: 'catalogue',
    port: 3613,
    files: `src/app/[lang]/boards/page.tsx, src/app/[lang]/robotics/page.tsx, src/app/[lang]/drones/page.tsx (the index pages only), a new folder
src/components/catalogue/ for the shared index layout and card you make, and the keys these three index pages use in boardlab.json, robotics.json and
dronelab.json (all six locales; only keys read by the index pages).`,
    task: `The three catalogue pages (/[lang]/boards, /[lang]/robotics, /[lang]/drones), as one design.
An editorial page head (eyebrow, big title, one line, the count as a big number), then the items as a refined grid that uses the full width: each card is the
item's figure on the paper ground with its name, a mono line of specs or tags, and its progress, with a precise hover state; no boxes inside boxes. Keep each
card's link, figure and progress, and whatever filters or chips exist today. Same layout component for all three pages.`,
  },
  {
    key: 'pages',
    port: 3614,
    files: `everything under src/app/[lang]/together/ (presentation only: keep Lobby, Planner and Buddies logic and their API calls exactly as they are),
src/app/[lang]/about/page.tsx, src/app/[lang]/passport/page.tsx, src/app/[lang]/verify/page.tsx, src/app/[lang]/[...rest]/page.tsx (the 404), the
presentation of src/components/solana/ (keep every call and state), and the message files together.json, common.json and the solana namespace's json
(all six locales).`,
    task: `Together (the room lobby with the Build Night planner and Build Buddies), About, Passport and Verify (Solana proof of build; it goes live today),
and the 404, in the same system: an editorial page head, clear sections, forms and lists that look designed, honest empty and error states.`,
  },
]

const RESULT = {
  type: 'object',
  properties: {
    files: { type: 'array', items: { type: 'string' } },
    summary: { type: 'string' },
    screenshots: { type: 'array', items: { type: 'string' } },
    checks: { type: 'string', description: 'each check run and its result' },
    commits: { type: 'array', items: { type: 'string' }, description: 'short hashes' },
    requests: { type: 'string', description: 'anything needed from another owner, or empty' },
  },
  required: ['files', 'summary', 'screenshots', 'checks', 'commits', 'requests'],
}

phase('Build')
const built = await parallel(OWNERS.map((o) => () =>
  agent(`${BRIEF}\n\nYour label: ${o.key}. Your dev server port: ${o.port}.\n\nYou own: ${o.files}\n\nYour task: ${o.task}`, {
    label: `build:${o.key}`,
    phase: 'Build',
    schema: RESULT,
  }),
))

const reports = OWNERS.map((o, i) => `${o.key}: ${built[i] ? JSON.stringify(built[i]) : 'no result (the agent failed)'}`).join('\n\n')

phase('Review')
const review = await agent(`${BRIEF}

Your label: review. Your dev server port: 3615.

You own every file the four builders owned (listed below) and run alone now. The builders worked in parallel, so the pages may disagree with each other.
Make them one system and fix anything that is not excellent:
1. Shoot every page outside the labs at 1440x900 and 390x844, light and dark: /en, /en/boards, /en/robotics, /en/drones, /en/together, /en/about,
   /en/passport, /en/verify, a 404 (/en/nope), plus /de and /hi of the landing and one catalogue. Look at them side by side.
2. Fix inconsistent type, spacing, rules, eyebrows, buttons and page heads; anything that overflows, clips, wraps badly or looks unfinished; dark-mode contrast;
   axe failures. Check the lab pages /en/boards/uno-r3/blink and /en/drones/quad5/fly still look right with the new header and fonts.
3. Run npx tsc --noEmit, npx eslint . --quiet, npx vitest run src/i18n src/components/shell, and the e2e selector check (grep e2e/ for each changed page's
   selectors). Fix what fails.
4. Commit your fixes (only those files, do not push).

Owned files: ${OWNERS.map((o) => `${o.key}: ${o.files}`).join('\n')}

The builders' reports:
${reports}`, { label: 'review', phase: 'Review', schema: RESULT })

return { built: OWNERS.map((o, i) => ({ owner: o.key, result: built[i] })), review }
