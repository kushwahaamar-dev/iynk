export const meta = {
  name: 'simlab-phase3-wave',
  description: 'SimLab phase 3: one agent per job, each following its section of scripts/workflows/phase3.md',
  whenToUse: 'Launched by the SimLab driver for waves T2 (UI and figure strings) and D (docs); pass { wave, jobs }',
  phases: [{ title: 'Phase 3', detail: 'one agent per job, each owning the files its section lists' }],
}

// args: { wave: 'T2', jobs: [{ label: 'P3-ui-es', section: 'P3-ui-<lang> (es, fr, de, zh, hi)', note?: 'Your language is Spanish (es).' }] }
const wave = args?.wave ?? 'T2'
const jobs = args?.jobs ?? []
if (!jobs.length) throw new Error('phase3-wave: pass args.jobs')

const REPORT = {
  type: 'object',
  properties: {
    label: { type: 'string' },
    changed: { type: 'array', items: { type: 'string' }, description: 'files you changed or added' },
    commits: { type: 'array', items: { type: 'string' }, description: 'short sha and subject of each commit you pushed' },
    verified: { type: 'array', items: { type: 'string' }, description: 'command and its real result, failures included' },
    notDone: { type: 'array', items: { type: 'string' }, description: "what your section asked for that isn't done, and why" },
    notes: { type: 'array', items: { type: 'string' }, description: 'anything the driver should know (wrong English, claims you could not verify)' },
    pushed: { type: 'boolean', description: 'true if every commit of yours is on origin/main' },
  },
  required: ['label', 'changed', 'commits', 'verified', 'notDone', 'notes', 'pushed'],
}

const brief = (job) => `You are ${job.label}, one of ${jobs.length} agents in SimLab's phase-3 wave ${wave} (HackTX 2026),
all working at once in the same git working tree, /Users/amar/Codes/ak/simlab.

Your brief is scripts/workflows/phase3.md: follow its "Shared rules" and the section "### ${job.section}" exactly.${job.note ? ` ${job.note}` : ''}
Everything you may edit is listed there; anything else goes into your report's notes for the driver.

How this differs from the CLAUDE.md files you were given:
- You are a workflow agent, not the driver. Read HANDOFF.md and docs/handoff/CONTEXT.md for their rules and history,
  but don't take over, don't run its "How to resume" steps, and don't edit HANDOFF.md or CONTEXT.md.
- Your section is approved: work through it to the end without stopping to ask for approval between phases.
- Don't launch sub-agents or workflows. Do the work yourself (the account has a usage limit).
- Commit and push after each verified step, with only your own paths, so a dead session loses little.

Finish with the structured report.`

phase('Phase 3')
log(`Phase 3 wave ${wave}: ${jobs.map((j) => j.label).join(', ')}`)
const results = await parallel(jobs.map((job) => () => agent(brief(job), { label: job.label, phase: 'Phase 3', schema: REPORT })))
return jobs.map((job, i) => results[i] ?? { label: job.label, failed: true })
