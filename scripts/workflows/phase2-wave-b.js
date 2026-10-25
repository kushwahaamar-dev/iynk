export const meta = {
  name: 'simlab-phase2-wave-b',
  description: 'SimLab phase 2 wave B: 10 agents build the rest of BUILD-PLAN §5 phase 2 from scripts/workflows/phase2.md',
  whenToUse: 'Launched by the SimLab driver after wave A closes; relaunch only unfinished labels by passing them as args',
  phases: [{ title: 'Wave B', detail: 'one agent per label, each owning the files in its phase2.md section' }],
}

// Runs every wave-B label, or only the labels passed in args: either a list of labels, or
// { labels, resume: { stoppedAt, since, backup } } when an earlier run was stopped part way.
const LABELS = [
  'P2-engine-b',
  'P2-microbit',
  'P2-nucleo',
  'P2-pi',
  'P2-fpga',
  'P2-rob-sensors',
  'P2-rob-power',
  'P2-drones-heavy',
  'P2-drones-vtol',
  'P2-fun',
]
const picked = Array.isArray(args) ? args : args?.labels
const labels = picked?.length ? LABELS.filter((l) => picked.includes(l)) : LABELS
const resume = Array.isArray(args) ? null : args?.resume

// phase2.md has one section for the two single-board agents.
const section = (label) => (label === 'P2-microbit' || label === 'P2-nucleo' ? 'P2-microbit, P2-nucleo' : label)

const resumeNote = (label) =>
  resume
    ? `

You are resuming. An earlier run of ${label} was stopped at ${resume.stoppedAt} when the driver paused the wave.
Its commits since ${resume.since} are on origin/main, and its uncommitted edits are still in the tree (a copy is in
${resume.backup}). Start with \`git log --oneline ${resume.since}..HEAD\` and \`git status --short\`, find the work
on your own paths, check it (it may stop mid-edit) and carry on from it instead of starting over.`
    : ''

const REPORT = {
  type: 'object',
  properties: {
    label: { type: 'string' },
    changed: { type: 'array', items: { type: 'string' }, description: 'files you changed or added' },
    commits: { type: 'array', items: { type: 'string' }, description: 'short sha and subject of each commit you pushed' },
    verified: { type: 'array', items: { type: 'string' }, description: 'command and its real result, failures included' },
    notDone: { type: 'array', items: { type: 'string' }, description: "what your section asked for that isn't done, and why" },
    requests: { type: 'array', items: { type: 'string' }, description: 'request files you filed in docs/requests/' },
    pushed: { type: 'boolean', description: 'true if every commit of yours is on origin/main' },
  },
  required: ['label', 'changed', 'commits', 'verified', 'notDone', 'requests', 'pushed'],
}

const brief = (label) => `You are ${label}, one of ${labels.length} agents in SimLab's phase-2 wave B, all working at once in
the same git working tree, /Users/amar/Codes/ak/simlab (HackTX 2026).

Your brief is scripts/workflows/phase2.md: follow its "Shared rules" and your own section "### ${section(label)}"
exactly (where the section covers two labels, you are ${label} and own only your board). Everything you may edit is
listed there; anything else goes through a request file in docs/requests/. Wave A finished before you started: its
work is on origin/main, and the gaps it left for you are named in your section.

How this differs from the CLAUDE.md files you were given:
- You are a workflow agent, not the driver. Read HANDOFF.md and docs/handoff/CONTEXT.md for their rules and history,
  but don't take over, don't run its "How to resume" steps, and don't edit HANDOFF.md or CONTEXT.md. The driver
  records your result.
- Your section is approved: work through it to the end without stopping to ask for approval between phases.
- Don't launch sub-agents or workflows. Do the work yourself (the account has a usage limit).
- Commit and push after each verified step, with only your own paths (Shared rules 8), so a dead session loses little.

Finish with the structured report: what you changed, your commits, what you verified (commands and real results),
what is not done and why, and the requests you filed.${resumeNote(label)}`

phase('Wave B')
log(`Wave B: ${labels.join(', ')}`)
const results = await parallel(labels.map((label) => () => agent(brief(label), { label, phase: 'Wave B', schema: REPORT })))
return labels.map((label, i) => results[i] ?? { label, failed: true })
