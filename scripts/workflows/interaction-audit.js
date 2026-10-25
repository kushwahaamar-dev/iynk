export const meta = {
  name: 'simlab-interaction-audit',
  description: 'SimLab after gate 3: drive every surface of the running app, find controls whose effect does not match, reproduce each finding independently; no code changes',
  whenToUse: 'Launched by the SimLab driver with { base, scratch } once a production build is serving; read-only',
  phases: [
    { title: 'Find', detail: 'one agent per surface drives the app and reports what it reproduced' },
    { title: 'Verify', detail: 'a second agent reproduces each finding from scratch and looks for the cause' },
  ],
}

const base = args?.base ?? 'http://127.0.0.1:3000'
const scratch = args?.scratch

const RULES = `
You are auditing SimLab, a hackathon web app (Next.js 16) whose production build is already serving at ${base}.
Repo: /Users/amar/Codes/ak/simlab. You change nothing: do not edit, create or delete tracked files, run no git command
that changes anything, no builds, no npm install, and never stop or restart the server (if it is down, say so and stop).

Drive the app with Playwright from Node. A script must sit inside the repo to resolve 'playwright': write throwaway
scripts as scripts/.tmp-audit-LABEL-*.mjs (LABEL is your label) and delete every one before you finish. Put
screenshots and logs in ${scratch}/audit/LABEL/ and read the screenshots you take.

How the pages work: each lab page shows a figure in an iframe (\`main iframe\`); inside it the drawing is \`#fig\` and
the figure records its own problems on \`document.documentElement.dataset.errors\`. The app draws the figure's main
controls itself (the view buttons, See-through with aria-keyshortcuts="T", the turn buttons, selects for the board
variant and the power source); the figure's own copies are hidden on purpose. The header has the theme toggle and
the language switch; Settings opens from the header. Languages: en, es, fr, de, zh, hi (the URL starts /<lang>/).

What to look for, most important first:
1. A control whose visible effect does not match what it says, or app state and figure that disagree (the bug class
   just fixed: picking a board variant changed the pin table but the drawing stayed on the default board).
2. State that is lost or stale after switching something: variant, power, view, language, theme, reload, navigating
   away and back, opening and closing the Lab tools drawer.
3. Page errors, console errors, and figure notes (dataset.errors) that appear while you use the page.
4. Layout faults at 1920x1080, 1440x900 and 390x844 (isMobile, hasTouch), light and dark: clipped or overlapping
   text, horizontal scroll, controls out of reach, a panel that hides what it should not.
5. English left in a translated page (fr, de, zh, hi), and keyboard shortcuts that do nothing.
Spend your effort where a judge clicks in a three-minute demo first, then go wide.

Known and out of scope, do not report: AI features, Partner, Build Buddies and search say they are not set up (keys
are placeholders); rooms cannot connect (no relay host yet); /passport and /verify (Solana, skipped); a drone bench is
empty again after a reload (known); the 13th drone card alone on the last row; the HackTX live counter not on a page;
the figures' own hidden buttons.

Report only what you reproduced at least twice, with exact steps a stranger can follow, the URL, the viewport and the
language, and the screenshot path. If you can see the likely cause in the source (read-only), name the file and line.
`

const SURFACES = [
  {
    key: 'boards',
    prompt: `Your label: boards. Surface: the Board Lab. /en/boards, every board page /en/boards/<id> (12 boards: read
the ids from the index cards) and lessons /en/boards/<id>/<lesson> (open at least two per board, more on uno-r3, uno-r4,
pico, esp32-devkitc and basys3). Exercise: the variant select (uno-r4, pico, pi4-pi5, esp32-s3-devkitc-1), the power
select, the view buttons (Board, Power tree, Breadboard, Schematic where offered), Exploded, See-through, turn left,
reset, turn right, zoom, Labels, Press RESET, Remove a part; in a lesson Run and Stop, editing the code, the Serial
monitor, the Break it, Checks, Quick quiz and Parameters tabs, the speaker (sound) button, Lab tools (Partner, Together,
Build it for real), the ? shortcuts sheet and each shortcut it lists, and Next/Previous lesson. Check the figure follows
every control and that each lesson's checks can pass with its reference behaviour where the page makes that possible.`,
  },
  {
    key: 'robotics',
    prompt: `Your label: robotics. Surface: the Robotics Lab. /en/robotics and every bench /en/robotics/<id> (13 benches:
read the ids from the index). Exercise: each build step and "Build it for me", the program/mode choice, Break it and
repairing it, practice tasks (run them), the quizzes, the live strip (state, main reading, current), the Status and other
rail tabs, See-through and the view controls, and that the figure, the strip and the step list agree at every step.
Check the reference solution of at least one task per bench passes where the page offers it.`,
  },
  {
    key: 'drones',
    prompt: `Your label: drones. Surface: the Drone Lab workshops. /en/drones and every drone /en/drones/<id> (13: read
the ids from the index). Exercise: the part-by-part build and "Build it for me", swapping parts and watching weight,
thrust to weight and flight time update, the safety tests (smoke stopper, motor tests) and their verdicts, the flight
controller settings (Betaflight, ArduPilot, iNav, Crazyflie) and any export or copy button, the workshop progress label,
See-through and the view controls, the wiring sheet. Check every number the page shows agrees with the figure and with
the other panels after each change.`,
  },
  {
    key: 'fly',
    prompt: `Your label: fly. Surface: the flying range /en/drones/<id>/fly for every drone (13). Exercise: the Flight mode
select (every option, including "Demo: the autopilot flies it"), arming, keyboard flying at 1440x900, the touch sticks at
390x844 (isMobile, hasTouch), the gates and lap timer, the Break it switches in the right panel and what each one does to
the flight, replay and ghosts if offered, FPV, pause and reset, and the notes/toast placement. Check the readouts match
what the craft does and that leaving and coming back (or reloading) leaves no stale state.`,
  },
  {
    key: 'shell',
    prompt: `Your label: shell. Surface: everything around the labs. The landing page /en (the live Uno hero, the three lab
cards and their pictures), the catalogue pages /en/boards, /en/robotics, /en/drones as pages, /en/about, /en/together
(Start a room and Join a room up to the point the missing relay stops it: the message must be clear), the 404 page,
the header (nav, theme toggle, language switch, Settings and every setting in it: does each one take effect and survive a
reload?), the footer, the phone menu at 390x844, keyboard-only navigation with visible focus, and dark mode on every page.
Then repeat a short walk (landing, a board, a lesson, a bench, a drone, the fly range) in fr, de, zh and hi looking for
English left over, text that overflows, and a language switch that loses your place.`,
  },
]

const FINDINGS = {
  type: 'object',
  properties: {
    label: { type: 'string' },
    covered: { type: 'array', items: { type: 'string' }, description: 'what you actually exercised, one line each' },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'LABEL-1, LABEL-2, ...' },
          title: { type: 'string' },
          url: { type: 'string' },
          viewport: { type: 'string' },
          steps: { type: 'array', items: { type: 'string' } },
          expected: { type: 'string' },
          actual: { type: 'string' },
          severity: { type: 'string', enum: ['high', 'medium', 'low'], description: 'high: a judge would hit it in the demo or it is plainly broken' },
          kind: { type: 'string', enum: ['broken-control', 'state-mismatch', 'stale-state', 'console-error', 'layout', 'i18n', 'a11y', 'copy', 'other'] },
          evidence: { type: 'string', description: 'screenshot paths, console lines, figure notes' },
          suspect: { type: 'string', description: 'file:line if you saw the likely cause, else empty' },
        },
        required: ['id', 'title', 'url', 'viewport', 'steps', 'expected', 'actual', 'severity', 'kind', 'evidence', 'suspect'],
      },
    },
    notes: { type: 'array', items: { type: 'string' } },
  },
  required: ['label', 'covered', 'findings', 'notes'],
}

const VERDICTS = {
  type: 'object',
  properties: {
    verdicts: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          reproduced: { type: 'boolean' },
          how: { type: 'string', description: 'what you ran and what you saw' },
          cause: { type: 'string', description: 'file:line and the mechanism, if found; else empty' },
          fix: { type: 'string', description: 'the smallest correct fix you would make, or empty' },
        },
        required: ['id', 'reproduced', 'how', 'cause', 'fix'],
      },
    },
  },
  required: ['verdicts'],
}

const results = await pipeline(
  SURFACES,
  s => agent(`${RULES.replaceAll('LABEL', s.key)}\n${s.prompt}`, { label: `find:${s.key}`, phase: 'Find', schema: FINDINGS }),
  (found, s) => {
    if (!found || !found.findings.length) return { surface: s.key, found, verdicts: [] }
    const label = `verify-${s.key}`
    return agent(`${RULES.replaceAll('LABEL', label)}
Your label: ${label}. Another agent reported the findings below. Try to reproduce each one yourself from a fresh browser,
following its steps and varying them where a step is ambiguous. Default to reproduced=false when you cannot make it
happen. For each one you reproduce, read the source (read-only) to find the cause and say the smallest correct fix.

${JSON.stringify(found.findings, null, 1)}`, { label: `verify:${s.key}`, phase: 'Verify', schema: VERDICTS })
      .then(v => ({ surface: s.key, found, verdicts: v ? v.verdicts : null }))
  },
)

const confirmed = []
for (const r of results.filter(Boolean)) {
  const byId = Object.fromEntries((r.verdicts || []).map(v => [v.id, v]))
  for (const f of r.found?.findings || []) if (byId[f.id]?.reproduced) confirmed.push({ ...f, verdict: byId[f.id] })
  if (r.verdicts === null) log(`${r.surface}: the verifier did not return; its ${r.found?.findings.length ?? 0} findings are unverified`)
}
const rank = { high: 0, medium: 1, low: 2 }
confirmed.sort((a, b) => rank[a.severity] - rank[b.severity])
return {
  confirmed,
  unconfirmed: results.filter(Boolean).flatMap(r => (r.found?.findings || []).filter(f => !confirmed.some(c => c.id === f.id)).map(f => ({ id: f.id, title: f.title }))),
  covered: Object.fromEntries(results.filter(Boolean).map(r => [r.surface, r.found?.covered ?? []])),
}
