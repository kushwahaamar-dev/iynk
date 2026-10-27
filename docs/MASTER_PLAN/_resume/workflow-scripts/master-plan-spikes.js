export const meta = {
  name: 'master-plan-spikes',
  description: 'Run the seven research spikes that can run on this Mac (editor rendering, avr8js, MNA vs ngspice, op log, Yosys WASM, physics determinism, rp2040js MicroPython)',
  phases: [
    { title: 'Spikes', detail: 'two lanes, one spike at a time per lane, so timings are not crushed by each other', model: 'sonnet' },
    { title: 'Check', detail: 'a second agent reproduces each spike\'s headline number and grades the verdict', model: 'sonnet' },
  ],
}

// Every subagent runs on Sonnet 5.5 (Amar, 2026-10-26); only the orchestrating session is Opus.
const sonnet = (prompt, opts = {}) => agent(prompt, { ...opts, model: 'sonnet' })

const repo = '/Users/amar/Codes/ak/simlab'
const scratch = args?.scratch ?? '/Users/amar/iynk-master-plan-scratch'
const mp = `${repo}/docs/MASTER_PLAN`
const spikesDir = `${mp}/08_RESEARCH_SPIKES`
const today = '2026-10-27'

const RULES = `You run one research spike for the iynk master plan (repo ${repo}; brief ${mp}/BRIEF.md; spike list and context in
${mp}/02_RESEARCH/TECHNICAL_RESEARCH.md section 6 and ${mp}/02_RESEARCH/tech/*.md; audit in ${mp}/01_AUDIT/). A spike answers one falsifiable question
with measurements. It is a throwaway proof of concept, not product code.

Rules:
- Never modify the iynk repo outside your spike folder ${spikesDir}/<ID>-<slug>/. Never edit src/, figures/, server/, package.json or lockfiles. Do not
  commit. You may IMPORT repo code read-only from your scratch scripts (for example figures/engine/bench-solve.js or src/lib/interp) to compare against it.
- Work in ${scratch}/spikes/<ID>/: npm init there and install what you need there (never in the repo), download tools there (official sources only:
  npm, GitHub releases, vendor sites; record the URL, version and licence), and keep logs there. No sudo, no brew install, no global installs.
- Never touch production services, never use .env.local keys, never use ports 3000 or 43117. Kill every process you start.
- This machine is an Apple-silicon Mac (check: uname -m, sysctl -n machdep.cpu.brand_string, sysctl -n hw.ncpu). The spike list asks for phones and
  Chromebooks: you do not have them. Approximate with Playwright CPU throttling (CDP Emulation.setCPUThrottlingRate 4x and 6x) and WebKit where
  relevant, and say clearly that the device question stays open. Record uptime (load) with every timing; another spike lane runs at the same time.
  If load is above 10 when you time something, wait and retry, or report the load next to the number.
- Measure; never invent a number. If a step fails, record the exact error and what you tried. A spike that cannot reach its exit condition reports
  INCONCLUSIVE with the reason, which is a valid result.
- Time box: about 60 to 90 minutes of work. Prefer a narrow, honest answer to a broad, shaky one.
- Deliverables: (1) ${spikesDir}/<ID>-<slug>/REPORT.md with: Question; Why it matters (which decision it unblocks); Exit condition (copied from
  TECHNICAL_RESEARCH.md); Environment (machine, OS, Node, browser versions, tool versions, licences); Method; Results (tables with raw numbers, load at
  the time); Verdict: PASS / FAIL / INCONCLUSIVE against the exit condition, with the reason; Caveats; What this means for the architecture (one
  paragraph, labelled HYPOTHESIS where it is not settled); How to reproduce (exact commands). (2) Copy your source files (scripts, prototype code,
  netlists, fixtures; NOT node_modules, binaries or downloads) into ${spikesDir}/<ID>-<slug>/src/ so the spike can be re-run.
- Write plainly: short sentences, no marketing, no em dashes. Your final text is returned as data; the report must stand on its own.`

const SPIKE_SCHEMA = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    report: { type: 'string', description: 'absolute path of REPORT.md' },
    verdict: { type: 'string', enum: ['PASS', 'FAIL', 'INCONCLUSIVE'] },
    headline: { type: 'string', description: 'the one-sentence result with its key number' },
    keyNumbers: { type: 'array', items: { type: 'string' } },
    reproduce: { type: 'string', description: 'the single command that re-runs the headline measurement' },
    architectureImplication: { type: 'string' },
  },
  required: ['id', 'report', 'verdict', 'headline', 'keyNumbers', 'reproduce'],
}

const SPIKES = [
  {
    id: 'RS-01', slug: 'editor-rendering', lane: 'A',
    task: `Does an SVG editor hold 60 fps at 500 parts and 1,000 wires with real artwork, pan and zoom, and how do vanilla SVG, React-rendered SVG and
Canvas 2D compare? Build three minimal prototypes in scratch (a static page served by a tiny node server): (a) vanilla SVG with one transform group for
pan/zoom, (b) React 19 SVG (one component per part, memoised), (c) Canvas 2D with the same scene. Parts: use real part artwork from the repo if you can
extract it (look at public/figures/parts/*.html or figures/parts/*.js for inline SVG; if extraction is impractical, generate parts of comparable
complexity: about 40 to 80 path elements each, and say so). Wires: 1,000 orthogonal polylines between random pins. Scripted interactions: 5 s pan,
5 s zoom in/out, 5 s dragging one part (with its connected wires updating), hover highlighting a net. Measure frame times with requestAnimationFrame
deltas in Chromium at CPU throttle 1x, 4x and 6x, and in Playwright WebKit at 1x; report p50/p95/max per prototype and interaction, and DOM node count.
Also build an Uno + LED + resistor scene with 20 wires and report the gzipped bundle size of @xyflow/react (bundle it with esbuild in scratch) versus your
vanilla core's size. Exit (from TECHNICAL_RESEARCH.md): pass p95 under 20 ms; fail trigger p95 over 33 ms. Record that real phones and Chromebooks were
not tested.`,
  },
  {
    id: 'RS-08', slug: 'mna-vs-ngspice', lane: 'A',
    task: `Is iynk's in-house circuit solver (figures/engine/bench-solve.js; read its tests figures/engine/bench-solve.test.mjs to learn the input format)
accurate for DC operating points? Build 20 canonical DC circuits covering what the benches use: voltage dividers (2 and 3 resistors), loaded divider
with source resistance, LED plus series resistor at several values (including the "no resistor" damage case), two LEDs in parallel without a resistor
each, a Wheatstone bridge, a diode clamp, an NPN low-side motor switch with base resistor, a MOSFET switch if modelled, a battery with internal
resistance under load, a linear regulator approximation, a buck converter's DC equivalent if modelled, a brownout case (a motor on the 5 V rail), and
whatever else the solver supports. Express each both in bench-solve's format and as a SPICE netlist. Run SPICE with ngspice compiled to WASM from npm
(try the eecircuit-engine package; record version and licence; if it fails, try another ngspice WASM package or build none and say so). Use matching
device models where the solver uses an LED/diode model (read the solver to find its I-V model and parameters, and give SPICE the same equivalent:
for example a piecewise-linear source or a diode .model fitted to it), so you measure solver error, not model choice; then also report the error against
a realistic SPICE LED model separately. Compare every node voltage and branch current. Exit: pass within 2 percent on 18 of 20 with failures explained;
fail if more than 5 disagree. Also time ms per solve for each circuit and for the largest bench circuit in the repo.`,
  },
  {
    id: 'RS-13', slug: 'physics-determinism', lane: 'A',
    task: `Rapier or Jolt for robotics bodies in the browser? Install @dimforge/rapier3d-deterministic-compat (or the closest deterministic Rapier build on
npm; record which) and jolt-physics (WASM build). Build the same scene in both: a four-wheel robot (chassis plus four wheels on revolute joints with
motors), a line-follower-sized two-wheel robot with a caster, and 20 bodies in total including a few obstacles, on a plane with friction. Run 10,000
fixed steps of 1/240 s with a scripted motor command sequence. Hash the full state (positions and rotations, float bits) every 1,000 steps. Run in Node,
in Playwright Chromium and in Playwright WebKit; report whether hashes match across the three runtimes and across two runs in the same runtime. Measure
mean and p95 step time at 20 bodies, WASM and JS sizes (raw and gzipped), and API ergonomics in a few lines. Exit: identical snapshot hash after 10,000
steps on two browsers, step under 1 ms at 20 bodies, size within budget (report sizes; no budget exists yet, so propose one and label it HYPOTHESIS).`,
  },
  {
    id: 'RS-03', slug: 'avr8js-differential', lane: 'B',
    task: `Can avr8js run real compiled Uno sketches and match iynk's TypeScript Arduino interpreter? (This also partly answers RS-04 locally.)
1. Download arduino-cli (official GitHub release for macOS arm64, into scratch) and install the arduino:avr core with ARDUINO_DIRECTORIES_DATA,
   ARDUINO_DIRECTORIES_DOWNLOADS and ARDUINO_DIRECTORIES_USER all pointing inside scratch. Record versions and licences (arduino-cli is GPL-3.0: note it
   for RS-17, which asks whether server-side use needs a commercial licence; do not decide that question).
2. Take the reference solutions of three Uno R3 lessons from src/content/boards/uno-r3.ts (Blink, a PWM fade, and an analogRead/serial lesson; read the
   module to find them). Compile each with arduino-cli compile --fqbn arduino:avr:uno --output-dir; time cold (first compile) and warm compiles.
3. Run each hex in avr8js (npm avr8js, MIT) in Node: 16 MHz, attach PORTB/PORTD listeners and the USART, feed the ADC a fixed value for analogRead.
   Record pin-change timestamps (in simulated microseconds), the PWM duty on the fade pin over time, and serial output.
4. Run the same source through iynk's interpreter headlessly (find runHeadless or the export src/lib/interp/lessons.test.ts uses) and capture its trace.
5. Compare: serial lines equal? toggle period equal within one PWM period? PWM duty within 2 percent? Simulated speed: simulated seconds per wall second
   for avr8js (in Node, and in a Web Worker in Playwright Chromium if time allows).
Exit: equal serial output, PWM duty within 2 percent, at 3x real time or better. Also record whether iynk's pin/world model could be driven by avr8js
pin-change callbacks (read src/lib/interp for how pins reach the world model).`,
  },
  {
    id: 'RS-06', slug: 'rp2040js-micropython', lane: 'B',
    task: `Does rp2040js boot the stock MicroPython firmware for the Raspberry Pi Pico, with a filesystem, GPIO, ADC and I2C, fast enough? Install rp2040js
(npm, MIT) in scratch and look at its repository's MicroPython example (GitHub wokwi/rp2040js, demo or examples folder) for how to load a UF2 and attach
the USB CDC or UART console. Download the official MicroPython UF2 for RPI_PICO from micropython.org (record version and URL). Then: boot to the REPL;
paste and run a blink script (machine.Pin(25) toggling) and record GPIO 25 transitions with timing; read machine.ADC(26) with a value you inject;
write and read a file (LittleFS: open('t.txt','w')); scan an I2C bus with a stub device you implement at one address. Measure simulated vs wall time
(speed relative to the 125 MHz real chip) and Node CPU usage. Compare one of iynk's Pico MicroPython lessons (src/content/boards/pico.ts) run in rp2040js
against iynk's own MicroPython interpreter output. Exit: all four (boot, blink, ADC, file write, I2C) work, CPU under 60 percent of one core at 1x.
Fail: filesystem writes or I2C missing and needing more than 2 weeks.`,
  },
  {
    id: 'RS-12', slug: 'yosys-wasm', lane: 'B',
    task: `Do YoWASP Yosys (npm @yowasp/yosys, ISC licence; verify) and DigitalJS handle iynk's Verilog lessons? Extract every Verilog reference solution and
starter from src/content/boards/basys3.ts and src/content/boards/de10-lite.ts (read the modules; count them with a command). For each, run Yosys in Node:
read_verilog (or read_verilog -sv), hierarchy -auto-top, proc, opt, stat; then write_json for a netlist. Record: elaborates yes/no, error text, wall
time, peak memory (process.memoryUsage or /usr/bin/time -l). Then try converting two or three netlists to DigitalJS (npm yosys2digitaljs and digitaljs;
record licences) and run a short simulation of one (e.g. a counter) to see whether its outputs match iynk's own Verilog interpreter's trace for the same
inputs. Report download sizes of the WASM. Exit: at least 90 percent elaborate, first load under 15 s on broadband (estimate from size), memory under
1 GB; fail if more than 25 percent need unsupported constructs.`,
  },
  {
    id: 'RS-09', slug: 'op-log-collab', lane: 'B',
    task: `Does a server-ordered operation log handle collaborative editing of a project document with 5 editors, undo, reconnect and invalid-edit
rejection? Read server/realtime/src/*.js and src/lib/realtime to see how rooms order actions today. In scratch (Node, TypeScript or JS), model a minimal
project document: parts (id, type, position), wires (id, from pin, to pin), code files (text). Implement a relay that assigns a global sequence number,
validates each op against the current state (reject a wire to a deleted part, a duplicate id, a stale base revision where it matters), and broadcasts;
clients apply optimistically and rebase on rejection; undo is an inverse op; reconnect sends a snapshot plus the tail after the client's last seq.
Property test with fast-check (npm): 5 clients, 10,000 random ops (add/move/delete part, add/delete wire, edit code with insert/delete ranges, undo),
random disconnects and message delays. Check after quiescence: all replicas byte-identical (state hash), no dangling wires, no lost acknowledged ops.
Measure reconnect time for a 1,000-op tail and a 10,000-op tail, and op throughput. Then, briefly, build the same document in Yjs (npm yjs, MIT) and
show what happens to a wire when one client deletes its part while another adds the wire offline (dangling or not), to inform RS-20. Exit: no divergence
after 10,000 randomised ops, reconnect under 2 s.`,
  },
]

const runSpike = s => sonnet(`${RULES}

Spike ${s.id} (${s.slug}). Your folder: ${spikesDir}/${s.id}-${s.slug}/ ; scratch: ${scratch}/spikes/${s.id}/.
${s.task}
Return the structured result.`, { label: `spike:${s.id}`, phase: 'Spikes', schema: SPIKE_SCHEMA })

const CHECK_SCHEMA = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    reproduced: { type: 'boolean' },
    reproducedNumbers: { type: 'array', items: { type: 'string' } },
    verdictHolds: { type: 'boolean' },
    problems: { type: 'array', items: { type: 'string' } },
  },
  required: ['id', 'reproduced', 'verdictHolds', 'problems'],
}

const checkSpike = (r, s) => r ? sonnet(`${RULES}

You check spike ${s.id}. Read ${r.report} in full and the source in its src/ folder. Re-run the headline measurement yourself (the report's reproduce
command: ${r.reproduce}), using the same scratch folder ${scratch}/spikes/${s.id}/ (its dependencies are installed there). Then judge: do your numbers
match the report's (state the tolerance you used)? Does the verdict (${r.verdict}) follow from the exit condition, or is it generous? Is the method sound
(does it measure the stated question, or a proxy)? Are the comparisons fair (same models, same inputs)? Append "## Independent check (${today})" to the
report with what you ran, your numbers, and any correction to the verdict or caveats. Change nothing else.`,
  { label: `check:${s.id}`, phase: 'Check', schema: CHECK_SCHEMA }).then(c => ({ ...r, check: c })) : null

phase('Spikes')
const lane = async name => {
  const results = []
  for (const s of SPIKES.filter(x => x.lane === name)) {
    const r = await runSpike(s)
    log(`${s.id}: ${r?.verdict ?? 'no result'} ${r?.headline ?? ''}`)
    results.push({ s, r })
  }
  return results
}
const lanes = await parallel([() => lane('A'), () => lane('B')])
const ran = lanes.filter(Boolean).flat()

phase('Check')
const checked = await parallel(ran.map(({ s, r }) => () => checkSpike(r, s)))

return { spikes: checked.filter(Boolean).map(c => ({ id: c.id, verdict: c.verdict, headline: c.headline, report: c.report, check: c.check })),
  missing: SPIKES.filter(s => !ran.find(x => x.s.id === s.id && x.r)).map(s => s.id) }
