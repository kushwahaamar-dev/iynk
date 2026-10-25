export const meta = {
  name: 'iynk-phase3-prose',
  description: 'iynk phase 3 prose translation: one agent per language translates item prose from scripts/workflows/phase3.md',
  whenToUse: 'Launched by the iynk driver; pass { wave, items, locales?, chunks? } to translate other items or relaunch',
  phases: [{ title: 'Prose', detail: 'one agent per language (or per language and chunk), each owning its language folder' }],
}

// args: { wave: 'T1', items: ['boards/uno-r3', ...], locales?: ['es', ...], chunks?: 2 }. Each language's items are
// split into `chunks` consecutive runs, one agent each, so a long list can be shared without two agents on one file.
const LANGUAGES = { es: 'Spanish', fr: 'French', de: 'German', zh: 'Simplified Chinese', hi: 'Hindi (Devanagari)' }
const wave = args?.wave ?? 'T1'
const items = args?.items ?? []
const locales = (args?.locales ?? Object.keys(LANGUAGES)).filter((l) => l in LANGUAGES)
const chunks = Math.max(1, Math.min(items.length, args?.chunks ?? 1))
if (!items.length) throw new Error('phase3-prose: pass args.items, e.g. ["boards/uno-r3", "drones/quad5"]')

const per = Math.ceil(items.length / chunks)
const jobs = locales.flatMap((lang) =>
  Array.from({ length: chunks }, (_, i) => ({
    lang,
    label: chunks > 1 ? `P3-prose-${lang}-${i + 1}` : `P3-prose-${lang}`,
    items: items.slice(i * per, (i + 1) * per),
  })).filter((j) => j.items.length),
)

const REPORT = {
  type: 'object',
  properties: {
    label: { type: 'string' },
    translated: { type: 'array', items: { type: 'string' }, description: 'items translated, passing and pushed' },
    left: { type: 'array', items: { type: 'string' }, description: 'items from your list not done, and why' },
    commits: { type: 'array', items: { type: 'string' }, description: 'short sha and subject of each commit you pushed' },
    verified: { type: 'array', items: { type: 'string' }, description: 'command and its real result, failures included' },
    notes: { type: 'array', items: { type: 'string' }, description: 'terms you chose, English text that looked wrong, anything the driver should know' },
    pushed: { type: 'boolean', description: 'true if every commit of yours is on origin/main' },
  },
  required: ['label', 'translated', 'left', 'commits', 'verified', 'notes', 'pushed'],
}

const brief = (job) => `You are ${job.label}, a translator in iynk's phase-3 wave ${wave} (HackTX 2026). Other agents work in
the same git working tree, /Users/amar/Codes/ak/simlab, at the same time.

Your brief is scripts/workflows/phase3.md: follow its "Shared rules" and the section "Wave T1: P3-prose-<lang>"
exactly (it applies to every prose wave). Your language is ${LANGUAGES[job.lang]} (\`${job.lang}\`): you own
src/i18n/content/${job.lang}/** for these items only, in this order:

${job.items.map((it, i) => `${i + 1}. ${it}`).join('\n')}

How this differs from the CLAUDE.md files you were given:
- You are a workflow agent, not the driver. Read HANDOFF.md and docs/handoff/CONTEXT.md for their rules, but don't
  take over, don't run its "How to resume" steps, and don't edit HANDOFF.md or CONTEXT.md.
- Your section is approved: work through your list to the end without stopping to ask for approval.
- Don't launch sub-agents or workflows. Do the work yourself (the account has a usage limit).
- Commit and push each item as soon as it passes, with only that item's path, so a dead session loses little.

Finish with the structured report.`

phase('Prose')
log(`Prose wave ${wave}: ${jobs.map((j) => `${j.label} (${j.items.length})`).join(', ')}`)
const results = await parallel(jobs.map((job) => () => agent(brief(job), { label: job.label, phase: 'Prose', schema: REPORT })))
return jobs.map((job, i) => results[i] ?? { label: job.label, failed: true })
