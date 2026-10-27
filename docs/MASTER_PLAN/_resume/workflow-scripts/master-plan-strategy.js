export const meta = {
  name: 'master-plan-strategy',
  description: 'Master plan strategy: council lens reviews of audit + research, three competing market-entry strategies, independent judges score them',
  phases: [
    { title: 'Council', detail: 'eight discipline groups review the audit and research and red-team the startup', model: 'sonnet' },
    { title: 'Strategies', detail: 'three drafters each argue a different market-entry strategy', model: 'sonnet' },
    { title: 'Judge', detail: 'four judges with different lenses score every strategy', model: 'sonnet' },
  ],
}

// Every subagent runs on Sonnet 5.5 (Amar, 2026-10-26); only the orchestrating session is Opus.
const sonnet = (prompt, opts = {}) => agent(prompt, { ...opts, model: 'sonnet' })

const repo = '/Users/amar/Codes/ak/simlab'
const mp = `${repo}/docs/MASTER_PLAN`
const scratch = args?.scratch
const today = '2026-10-26'

const RULES = `You sit on an independent startup and engineering council planning the future of iynk (https://iynk.tech, repo ${repo}), a free browser
hardware lab built in 24 hours at HackTX 2026. The hackathon is over; the founders want a durable startup whose mission is to make hardware
experimentation accessible to anyone, anywhere, regardless of money, place, language or equipment. Their long-term vision is one workflow: imagine,
design, assemble, wire, program, simulate, debug, learn, collaborate, optimise, build for real; with original projects (not only catalogue lessons) as a
first-class capability. They have explicitly invited you to challenge every assumption, including their vision, architecture, business model and feature
preferences. Do not be agreeable. A working hackathon demo is not production readiness, a feature count is not value, and a clever algorithm is not
feasibility.

Evidence base (read what your task names, in full; cite by path):
- ${mp}/01_AUDIT/: REPOSITORY_INVENTORY.md, FEATURE_VERIFICATION.md, TECHNICAL_DEBT.md, SECURITY_BASELINE.md, PERFORMANCE_BASELINE.md, TEST_COVERAGE.md,
  inventory/*.md (one per subsystem), runs/*.md (commands, e2e, browser walk), REVIEW_GAPS.md.
- ${mp}/02_RESEARCH/: COMPETITOR_LANDSCAPE.md, competitors/*.md, WORKFLOW_BENCHMARK.md, USER_SEGMENTS.md, USER_RESEARCH_PLAN.md, MARKET_ANALYSIS.md,
  TECHNICAL_RESEARCH.md, tech/*.md, SOURCE_REGISTER.md.
- The founders' own words: ${repo}/docs/handoff/CONTEXT.md (requests and decisions during the hackathon).

Rules:
- Every important statement carries a label: VERIFIED (audit inspected/reproduced it), DOCUMENTED, EXTERNAL (cite the research file and its [S#]),
  ESTIMATED (assumptions shown), HYPOTHESIS (say how to test it), UNKNOWN. Never invent user demand, interviews, benchmarks, prices or revenue. No
  confidence percentages. Use measurable hypotheses and decision criteria.
- Change nothing in the repo except your output file. Scratch goes in ${scratch}/strategy/<your label>/. You may use WebSearch/WebFetch (load with
  ToolSearch "select:WebSearch,WebFetch") to fill a specific gap; cite what you add.
- Write plainly: short sentences, tables where they help, no marketing language, no em dashes. Be specific: name files, competitors, segments, numbers.
- Your final text is returned as data; the human reads your file, so it must stand alone.`

const LENSES = [
  {
    key: 'ceo-investor',
    roles: 'Founder/CEO (vision, strategy, positioning, capital allocation) and a skeptical venture investor (defensibility, market size, growth, failure risk)',
    focus: `Answer the brief's red-team questions 1-5, 8, 9, 11, 16, 17, 20 head-on with evidence: why use iynk instead of Wokwi? instead of Tinkercad? what
can iynk do that existing tools cannot? which advantages can competitors copy quickly? is combining three labs coherent? is the learning market large but
hard to monetise? could institutions adopt faster than consumers? are we building too many features before validating retention? is the Solana layer
strategic or a distraction? does a component marketplace need network effects we do not have? can a small founding team maintain this? Then: what would
make this a fundable company versus a good open-source project or a nonprofit; the three ways it most likely dies; capital plan options (bootstrap,
grants, pre-seed) with what each requires to be true.`,
  },
  {
    key: 'product-learning',
    roles: 'Chief Product Officer, human-computer interaction researcher, and learning scientist (pedagogy, assessment, learning outcomes)',
    focus: `Answer red-team questions 7, 10, 13: do users want custom project building enough to justify its expense (what evidence exists, what would test
it cheaply)? are we confusing entertainment engagement with educational value? does multilingual materially improve adoption? Evaluate the current
product's learning design (lessons, checks, fault exercises, AI hints) against learning-science evidence (productive failure, worked examples, cognitive
load, transfer to physical hardware) with citations. Judge the browser walk (01_AUDIT/runs/BROWSER_WALK.md) as a first-time user would. Propose the
north-star metric and the activation/retention definitions. What is the smallest product that would show real value to one segment?`,
  },
  {
    key: 'cto-platform',
    roles: 'CTO, principal frontend engineer, principal backend engineer, site reliability engineer, developer-ecosystem architect',
    focus: `Using TECHNICAL_DEBT.md and the inventories: is the codebase a foundation or a prototype to mine? Which subsystems should be preserved, extended,
replaced (with evidence)? Can an original-project builder be built on the current content schema, interpreters, circuit solver, figure engines and stores,
or is a new core needed (a canonical project document, a netlist independent of drawings, a simulation orchestrator)? Answer red-team questions 14 and 15
(can the engines support custom components? which architectural assumptions are most likely to fail?). Estimate the effort for the minimum original-
project builder in engineer-weeks (best / expected / adverse, assumptions stated) for a team of 2-3. Operational reality: Vercel + a single Vultr relay +
Tiger Postgres; what breaks first at 10x and 100x usage. Extensibility: is a component SDK feasible before the core model exists?`,
  },
  {
    key: 'fidelity',
    roles: 'embedded-systems engineer, electrical engineer, and simulation researcher (numerical methods, fidelity, uncertainty, validation)',
    focus: `Answer red-team questions 6 and 18: are our simulations accurate enough for the intended users, and could open-source competitors (Wokwi's
avr8js/rp2040js, ngspice, SimulIDE, Falstad) offer better fidelity? Grade each simulation domain (MCU execution per board family, circuit solver, fault
models, protocols, FPGA/Verilog) on what it really computes, using the inventories and tech research. Recommend the fidelity tier model (educational
approximation / behavioural / firmware-target), what iynk should claim publicly today (honest copy), and where to adopt open-source engines instead of
extending the TypeScript interpreters (licence-checked). Outline the physical validation programme (which measurements, which instruments, how many
reference circuits) and its cost.`,
  },
  {
    key: 'robotics-aero',
    roles: 'robotics engineer (kinematics, control, sensors, ROS 2, dynamics) and aerospace/flight-simulation engineer',
    focus: `Using the flight, drone-calc and robotics inventories and the robotics/drone dossiers: what do the Robotics and Drone labs really model? Is
there a credible, differentiated path for each (original robot assemblies; design-to-flight drones) or should one or both be frozen as content while
the core electronics builder is built? What would the minimum honest robotics and drone creation features be, which engines (Rapier, MuJoCo WASM,
PX4/ArduPilot SITL) and at what cost? Safety and dual-use: LiPo, props, autonomy content; what warnings and restrictions are needed now.`,
  },
  {
    key: 'ai',
    roles: 'AI systems architect (context-aware agents, tools, evaluations, inference costs)',
    focus: `Answer red-team question 12: will AI inference make free access unsustainable? Using the ai-search-mcp inventory, the security baseline and the
AI price research: what context the partner gets today, what tools it has, injection exposure, cost per session (ESTIMATED with token counts), model
vendor risk (Meta Muse Spark API availability and terms, Gemini fallback). Design principles for a partner grounded in a structured project (operation
proposals, preview/apply, attribution, evaluation sets). What must the AI never do with minors. Budget guardrails for a free tier.`,
  },
  {
    key: 'security-privacy',
    roles: 'security architect and privacy/compliance reviewer (student data, minors, international regulations)',
    focus: `Using SECURITY_BASELINE.md and 02_RESEARCH/tech/compliance-safety.md: the release blockers before (a) a public relaunch for adults, (b) marketing
to schools, (c) any under-13 use. Which current features must be disabled, gated or redesigned (public rooms, chat, voice, buddies with location,
stories, leaderboards, wallets, AI with minors)? Answer red-team question 19 (legal or licensing risks in imported component data, figure art, fact
sheets, the Colorfigures licence, competitor-derived lesson structure). The minimum compliance programme and its cost.`,
  },
  {
    key: 'business-growth',
    roles: 'FinOps and business analyst (unit economics, sustainable monetisation) and growth strategist (distribution, partnerships, communities)',
    focus: `Using MARKET_ANALYSIS.md, the competitor pricing and the infrastructure/AI cost research: the simplest viable business model that keeps an
accessible free core (compare institutional subscriptions, classroom plans, university licences, compute/advanced tiers, team plans, API access,
manufacturer partnerships, affiliate commerce, sponsored programmes, grants/nonprofit, creator marketplace), with ESTIMATED unit economics at 1k/10k/100k
weekly actives (hosting, AI, storage, support) and what must be true to break even. Distribution: which channels can realistically reach the first
1,000 weekly active creators (named communities, educators, YouTubers, hackathons, MLH, Indian colleges, STEM nonprofits) and at what cost. Evaluate the
proposed north star "weekly users completing meaningful, independently verified hardware experiments or original project milestones" for measurability
and gaming.`,
  },
]

const MEMO_SCHEMA = {
  type: 'object',
  properties: {
    file: { type: 'string' },
    verdict: { type: 'string', description: 'the lens\'s one-paragraph bottom line' },
    weaknesses: { type: 'array', items: { type: 'string' } },
    opportunities: { type: 'array', items: { type: 'string' } },
    buildFirst: { type: 'array', items: { type: 'string' } },
    doNotBuild: { type: 'array', items: { type: 'string' } },
    redTeamAnswers: { type: 'array', items: { type: 'object', properties: { question: { type: 'string' }, answer: { type: 'string' } }, required: ['question', 'answer'] } },
    keyRisks: { type: 'array', items: { type: 'string' } },
    openQuestions: { type: 'array', items: { type: 'string' } },
  },
  required: ['file', 'verdict', 'weaknesses', 'opportunities', 'buildFirst', 'doNotBuild', 'keyRisks'],
}

phase('Council')
const memos = (await parallel(LENSES.map(l => () => sonnet(`${RULES}

Your seat: ${l.roles}.
${l.focus}

Write ${mp}/00_EXECUTIVE/council/${l.key}.md with sections: Bottom line; Evidence reviewed (files); Weaknesses (each with evidence and label);
Opportunities; Answers to the red-team questions in your remit; What to build first (from your lens, with the reason); What not to build yet (and the
trigger that would change that); Risks; Open questions and the cheapest way to answer each. Return the structured memo.`,
  { label: `council:${l.key}`, phase: 'Council', schema: MEMO_SCHEMA })))).filter(Boolean)

log(`Council: ${memos.length}/${LENSES.length} memos`)
const memoDigest = memos.map(m => `### ${m.file}\nVerdict: ${m.verdict}\nBuild first: ${m.buildFirst.join(' | ')}\nDo not build: ${m.doNotBuild.join(' | ')}\nRisks: ${m.keyRisks.join(' | ')}`).join('\n\n')

// Three competing market-entry strategies, each argued by its own drafter.
const STRATEGIES = [
  {
    key: 'A-creator-builder',
    thesis: `Original-project builder first, for self-directed learners and makers (high-school to university students and hobbyists): a free,
no-account browser studio where you wire any supported board and parts, write code, simulate, break it, get grounded AI help and export a real build.
Lessons become templates. Distribution through maker communities, YouTube educators, hackathons; revenue later from institutions and advanced tiers.`,
  },
  {
    key: 'B-classroom',
    thesis: `Classroom and course platform first, for educators (high-school CTE/STEM and introductory university electronics/embedded courses): assignments
built from the lesson and fault-diagnosis engine, auto-checked submissions, teacher dashboards, rostering/LMS, privacy compliance. Free for students,
paid by schools/departments. The original-project builder arrives as the capstone tool inside courses.`,
  },
  {
    key: 'C-fault-lab',
    thesis: `Debugging and failure-based learning as the wedge: "the lab where you learn by breaking things", focused on the fault simulation, explainable
failures and AI-guided diagnosis, sold to university lab courses and bootcamps (and used free by individuals) as a pre-lab and troubleshooting trainer
that measurably improves debugging competence before students touch real hardware. Original projects follow once the fault engine works on arbitrary
circuits.`,
  },
]

const STRATEGY_SCHEMA = {
  type: 'object',
  properties: {
    file: { type: 'string' },
    targetCustomer: { type: 'string' },
    user: { type: 'string' },
    payer: { type: 'string' },
    influencer: { type: 'string' },
    organicDistributor: { type: 'string' },
    uniqueValue: { type: 'string' },
    firstMilestone: { type: 'string', description: 'the smallest product that proves it, exact scope' },
    competitorResponse: { type: 'string' },
    monetization: { type: 'string' },
    engineeringCost: { type: 'string', description: 'best/expected/adverse engineer-weeks with assumptions' },
    risks: { type: 'array', items: { type: 'string' } },
    evidenceRequired: { type: 'array', items: { type: 'string' }, description: 'experiments with pass/fail thresholds' },
    killCriteria: { type: 'array', items: { type: 'string' } },
  },
  required: ['file', 'targetCustomer', 'payer', 'uniqueValue', 'firstMilestone', 'competitorResponse', 'monetization', 'engineeringCost', 'risks', 'evidenceRequired', 'killCriteria'],
}

phase('Strategies')
const strategies = (await parallel(STRATEGIES.map(s => () => sonnet(`${RULES}

You are the advocate for one market-entry strategy. Make the strongest honest case for it; then state plainly where it is weak. Another two advocates
argue different strategies and independent judges will score all three, so overclaiming will cost you.

Strategy ${s.key}: ${s.thesis}

The council's memos (read the files for detail):
${memoDigest}

Write ${mp}/06_BUSINESS/strategy-options/${s.key}.md with: thesis; target customer; who uses the free product, who benefits financially, who pays, who
influences adoption, who drives organic distribution; the job to be done and why existing tools (name them, cite the dossiers) fail it; unique value and
which part is hard to copy versus merely convenient; the first milestone (exact scope: what a user can do, what is out of scope); how Wokwi, Tinkercad,
MakeCode and Arduino would respond and how fast; monetisation path and pricing hypotheses (cite comparable prices); ESTIMATED engineering cost
(best/expected/adverse engineer-weeks for a 2-3 person team, assumptions listed, using the audit's preserve/replace verdicts); what it reuses from the
current code; risks; the evidence required before committing (experiments with pass/fail thresholds); kill criteria. Return the structured summary.`,
  { label: `strategy:${s.key}`, phase: 'Strategies', schema: STRATEGY_SCHEMA })))).filter(Boolean)

const JUDGES = [
  { key: 'investor', lens: 'a skeptical seed investor: market size and willingness to pay, defensibility, speed to evidence, capital efficiency, founder-team fit (2-3 people, student founders)' },
  { key: 'educator', lens: 'a learning scientist and veteran CTE/university electronics instructor: learning outcomes, classroom reality (devices, accounts, privacy, teacher time), adoption path in schools and universities' },
  { key: 'engineer', lens: 'a principal engineer who read the whole audit: technical feasibility on this codebase, hidden cost, fidelity risk, maintenance load, how much of today\'s code survives' },
  { key: 'mission', lens: 'the founders\' mission: accessible hardware creation for anyone anywhere regardless of money, place, language or equipment; would it make more people capable of building something they could not build before, including learners in low-resource regions?' },
]

const SCORE_SCHEMA = {
  type: 'object',
  properties: {
    judge: { type: 'string' },
    scores: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          strategy: { type: 'string' },
          userValue: { type: 'number' }, frequencyOfNeed: { type: 'number' }, differentiation: { type: 'number' }, monetization: { type: 'number' },
          feasibility: { type: 'number' }, costAndRisk: { type: 'number', description: '5 = cheap and low-risk' }, missionFit: { type: 'number' },
          speedToEvidence: { type: 'number' }, total: { type: 'number' }, reasoning: { type: 'string' },
        },
        required: ['strategy', 'userValue', 'frequencyOfNeed', 'differentiation', 'monetization', 'feasibility', 'costAndRisk', 'missionFit', 'speedToEvidence', 'total', 'reasoning'],
      },
    },
    recommendation: { type: 'string', description: 'which strategy (or which hybrid) and why, in one paragraph' },
    graftFromOthers: { type: 'array', items: { type: 'string' }, description: 'the best ideas from the losing strategies worth keeping' },
    fatalFlaws: { type: 'array', items: { type: 'string' } },
  },
  required: ['judge', 'scores', 'recommendation', 'graftFromOthers', 'fatalFlaws'],
}

phase('Judge')
const stratFiles = strategies.map(s => s.file).join(', ')
const judgments = (await parallel(JUDGES.map(j => () => sonnet(`${RULES}

You are an independent judge with the lens of ${j.lens}. Read the three strategy files in full (${stratFiles}) and as much of the audit and research as
you need to test their claims (the advocates may overclaim: check their numbers against MARKET_ANALYSIS.md, the dossiers and TECHNICAL_DEBT.md). Score
each strategy 1-5 on: user value, frequency of need, differentiation, monetisation, feasibility on this codebase, cost and risk (5 = cheap/low risk),
mission fit, speed to evidence; total is the plain sum. Explain each score briefly with evidence. Then recommend one strategy or a precise hybrid (say
exactly which parts of which), list the ideas worth grafting from the others, and any fatal flaws. Write your judgment to
${mp}/06_BUSINESS/strategy-options/judge-${j.key}.md and return it structured (judge="${j.key}").`,
  { label: `judge:${j.key}`, phase: 'Judge', schema: SCORE_SCHEMA })))).filter(Boolean)

return { memos, strategies, judgments }
