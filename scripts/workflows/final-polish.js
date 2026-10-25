export const meta = {
  name: 'simlab-final-polish',
  description: 'SimLab final pass: research and audit every page, one design spec, then rebuild the shell and each lab on it, then review',
  whenToUse: 'Launched by the SimLab driver for the final pass in scripts/workflows/final.md; pass { finish: { look, decide, shell, surfaces, review } } as CDT clock times',
  phases: [
    { title: 'Look', detail: 'research, five surface audits and the fresh-eyes walk; no code' },
    { title: 'Decide', detail: 'F-direction writes docs/design/POLISH-SPEC.md' },
    { title: 'Foundation', detail: 'F-build-shell: shared components, page frames, shell pages' },
    { title: 'Surfaces', detail: 'boards, robotics, drones, panels on the new foundation' },
    { title: 'Check', detail: 'F-review walks everything against the spec' },
  ],
}

const BRIEF = 'scripts/workflows/final.md'
const finish = args?.finish ?? {}

const REPORT = {
  type: 'object',
  properties: {
    label: { type: 'string' },
    changed: { type: 'array', items: { type: 'string' }, description: 'files you changed or added' },
    commits: { type: 'array', items: { type: 'string' }, description: 'short sha and subject of each commit you pushed' },
    verified: { type: 'array', items: { type: 'string' }, description: 'command and its real result, failures included' },
    notDone: { type: 'array', items: { type: 'string' }, description: "what your section asked for that isn't done, and why" },
    notes: { type: 'array', items: { type: 'string' }, description: 'anything the driver should know, including any visible label you changed (old and new)' },
    pushed: { type: 'boolean', description: 'true if every commit of yours is on origin/main' },
  },
  required: ['label', 'changed', 'commits', 'verified', 'notDone', 'notes', 'pushed'],
}

const prompt = (label, section, note, by, together) => `You are ${label}, one of the agents in SimLab's final pass
(HackTX 2026), working ${together ? 'at the same time as others ' : ''}in the git working tree /Users/amar/Codes/ak/simlab.

Your brief is ${BRIEF}: follow its "Shared rules" and the section "### ${section}" exactly.${note ? ` ${note}` : ''}
Everything you may edit is listed there; anything else goes into your report's notes for the driver.
${by ? `Check the clock with \`date\`: aim to be finished and pushed by ${by} CDT. Past it, ship what is verified and list the rest.` : ''}

How this differs from the CLAUDE.md files you were given:
- You are a workflow agent, not the driver. Read HANDOFF.md and docs/handoff/CONTEXT.md for their rules and history,
  but don't take over, don't run its "How to resume" steps, and don't edit HANDOFF.md or CONTEXT.md.
- Your section is approved: work through it to the end without stopping to ask for approval between phases.
- Don't launch sub-agents or workflows. Do the work yourself (the account has a usage limit).
- Commit and push after each verified step, with only your own paths, so a dead session loses little.

Finish with the structured report.`

const run = (label, section, phaseTitle, opts = {}) =>
  agent(prompt(label, section, opts.note, opts.by, opts.together), { label, phase: phaseTitle, schema: REPORT, ...(opts.model ? { model: opts.model } : {}) })
    .then((r) => r ?? { label, failed: true })

const SURFACES = ['shell', 'boards', 'robotics', 'drones', 'panels']
const out = {}

phase('Look')
const look = await parallel([
  () => run('F-research', 'F-research', 'Look', { by: finish.look, together: true, model: 'fable' }),
  ...SURFACES.map((s) => () => run(`F-audit-${s}`, 'F-audit-<surface> (shell, boards, robotics, drones, panels)', 'Look',
    { note: `Your surface is ${s}; your file is docs/verify/ui-audit-${s}.md.`, by: finish.look, together: true })),
  () => run('F-fresh-eyes', 'F-fresh-eyes', 'Look', { by: finish.look, together: true }),
])
out.look = look
log(`Look done: ${look.filter((r) => !r.failed).length}/${look.length} reported`)

phase('Decide')
out.direction = await run('F-direction', 'F-direction', 'Decide', { by: finish.decide })
if (out.direction.failed) return out

phase('Foundation')
out.shell = await run('F-build-shell', 'F-build-shell (dev server port 3441)', 'Foundation', { by: finish.shell })
if (out.shell.failed) return out

phase('Surfaces')
const builders = [['boards', 3442], ['robotics', 3443], ['drones', 3444], ['panels', 3445]]
out.surfaces = await parallel(builders.map(([s, port]) => () =>
  run(`F-build-${s}`, `F-build-${s} (dev server port ${port})`, 'Surfaces', { by: finish.surfaces, together: true })))

phase('Check')
out.review = await run('F-review', 'F-review', 'Check', { by: finish.review })
return out
