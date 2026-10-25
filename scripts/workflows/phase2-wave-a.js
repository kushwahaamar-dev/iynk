export const meta = {
  name: 'simlab-phase2-wave-a',
  description: 'SimLab phase 2 wave A: 9 agents build BUILD-PLAN §5 phase-2 rows from scripts/workflows/phase2.md',
  whenToUse: 'Launched by the SimLab driver after gate 1; relaunch only unfinished labels by passing them as args',
  phases: [{ title: 'Wave A', detail: 'one agent per label, each owning the files in its phase2.md section' }],
}

// Runs every wave-A label, or only the labels passed in args: either a list of labels, or
// { labels, resume: { stoppedAt, since, backup } } when an earlier run was stopped part way.
const LABELS = [
  'P2-engine',
  'P2-uno-r4',
  'P2-modules',
  'P2-drone-prose',
  'P2-drones-fpv',
  'P2-flight',
  'P2-rob-uno',
  'P2-rob-motor',
  'P2-social',
]
const picked = Array.isArray(args) ? args : args?.labels
const labels = picked?.length ? LABELS.filter((l) => picked.includes(l)) : LABELS
const resume = Array.isArray(args) ? null : args?.resume

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

const brief = (label) => `You are ${label}, one of ${labels.length} agents in SimLab's phase-2 wave A, all working at once in
the same git working tree, /Users/amar/Codes/ak/simlab (HackTX 2026).

Your brief is scripts/workflows/phase2.md: follow its "Shared rules" and your own section "### ${label}" exactly.
Everything you may edit is listed there; anything else goes through a request file in docs/requests/.

How this differs from the CLAUDE.md files you were given:
- You are a workflow agent, not the driver. Read HANDOFF.md and docs/handoff/CONTEXT.md for their rules and history,
  but don't take over, don't run its "How to resume" steps, and don't edit HANDOFF.md or CONTEXT.md. The driver
  records your result.
- Your section is approved: work through it to the end without stopping to ask for approval between phases.
- Don't launch sub-agents or workflows. Do the work yourself (the account has a usage limit).
- Commit and push after each verified step, with only your own paths (Shared rules 8), so a dead session loses little.

Finish with the structured report: what you changed, your commits, what you verified (commands and real results),
what is not done and why, and the requests you filed.${resumeNote(label)}`

phase('Wave A')
log(`Wave A: ${labels.join(', ')}`)
const results = await parallel(labels.map((label) => () => agent(brief(label), { label, phase: 'Wave A', schema: REPORT })))
return labels.map((label, i) => results[i] ?? { label, failed: true })
