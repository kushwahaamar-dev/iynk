# B10 task packages: Faults on any circuit

Written 2026-10-27 for the build-plan step. Plan only: no file in `src/`, `figures/`, `server/`, `solana/`, `db/`, `e2e/`, `package.json` or a lockfile was changed to write it, and nothing was committed.
Repo state read: `main`, HEAD `4d11dc5`, with the uncommitted reconcile edits in the working tree (the schema and example files named below are read from the working tree).
Labels: VERIFIED (read in code or a file in this step), DOCUMENTED (a plan file says it), EXTERNAL, ESTIMATED, HYPOTHESIS, UNKNOWN.

Binding inputs: `00_EXECUTIVE/DECISION_REGISTER.md` (D-010, D-013 to D-017), `03_PRODUCT/PRODUCT_REQUIREMENTS.md` section 10.2 (R-118 to R-130), `03_PRODUCT/EDUCATION.md` section 6 and 7, `03_PRODUCT/STUDIO_EDITOR.md` section 10, `04_ARCHITECTURE/SIMULATION_ARCHITECTURE.md` section 13 (called SIM below), `04_ARCHITECTURE/PROJECT_DATA_MODEL.md` 5.11, `04_ARCHITECTURE/COMPONENT_SCHEMA.md`, `04_ARCHITECTURE/RECONCILIATION.md` (RC-43 to RC-45, RC-48, RC-49), ADR-0314, `05_ENGINEERING/IMPLEMENTATION_ROADMAP.md` (phase card B10, section 2 conventions, section 6 "For Amar").

## 1. What this phase is

| Item | Content |
|---|---|
| Goal | Break and diagnose any circuit: fault operations, detectors on any netlist, a hidden cause, a hint ladder, one shared diagnosis record. |
| Scope | F-017 to F-026, F-028 to F-030, F-056, F-183 and R-118 to R-130. R-130 is "For Amar" (section 9). F-027 and F-187 are out of scope (shelved with D-009). F-025 belongs to SIM and is built in B4 and B8 (T-B4-17, T-B8-01, T-B8-02). F-023 belongs to LABS (B12). |
| Not in it | Classroom roles, class CSV, lecturer guide, outcome studies, any claim that a fault matches a real board (R-130 stays open until Amar's bench check), robotics and drone detectors (B16 to B19 add them), the AI partner's use of faults (B14, B15). |
| Phase depends on | B8 (live analog, honest states, probe tap, replay), B4 (Studio editor), and through them B3 and B2. Section 2 finds that SA-23 also needs five B9 tasks. |
| Exit gate | `KL npm run check` (only failing test files that are not on the audit baseline block, section 3.1); corpus gate (0 false alarms on `clean/`, at least 18 of 20 `broken/` caught, at least 8 distinct rules each catching at least one broken file); the R-123 no-false-warning check on the starter projects; SA-23 walkthrough passes; then Amar's OK. |
| Size | 34 tasks (T-B10-00 to T-B10-33, ids in section 5). The roadmap card lists 14. Section 2 explains why. |
| Branch and commits | Local branch `build/v1`. One commit per task, authored as Amar Kushwaha, message `B10 T-B10-<nn>: <what>`, no `Co-Authored-By` line, no "Generated with" line. Never push. Never deploy. Ports 3000 and 43117, `.env.local` values and production services are off limits. |

## 2. Findings that change the roadmap card

The roadmap card for B10 was written before the design documents were reconciled. Reading the inputs for this step found these differences. Each is handled by a task below and each is repeated in section 10 for Amar where it needs his word.

| # | Finding | Evidence | What this plan does |
|---|---|---|---|
| F1 | SA-23 needs B9 output. The healthy half reads `net_3v3` through the ESP32 board power model, the `Adafruit_BME280` library and the BME280 model, and the faulted half needs the I2C bus layer to return a NACK. The roadmap lists B8 and B4 as the dependencies and B9 as a sibling. | SA-23 text, `SIMULATION_ARCHITECTURE.md` line 2042; B9 tasks T-B9-01 (bus), T-B9-02 (`Wire.begin` binding), T-B9-04 (BME280), T-B9-05 (board power model), T-B9-06 (world script) in the roadmap | D-014 orders B9 before B10, so on the planned order they exist. T-B10-13 and T-B10-05 list them as hard dependencies. If Amar reorders B10 before B9, T-B10-13 and the bus evidence in T-B10-05 move after B9. |
| F2 | The four new `Fault.kind` values (`param`, `mount`, `sensor`, `swap-phase`) are already in the working-tree `project.schema.json` (line 2521), uncommitted. The committed file at HEAD has none of them (VERIFIED: `git show HEAD:...project.schema.json` has 0 matches). | `git status` shows the file modified | T-B10-01 starts by checking the file. It adds the four values only if the tree lacks them. |
| F3 | The roadmap names no task that adds the `node-voltage` and `supply-current` check kinds to the check engine, yet PDM 5.12 defines them and SA-23 check `c1` is a `node-voltage` check. `src/lib/interp/checks.ts:122` handles 10 kinds, none of them these two (VERIFIED). | grep of the roadmap for both names returned nothing | New task T-B10-21. It may move to B8 if Amar prefers. |
| F4 | EDUCATION 6.6 lists the 20 `broken/` files in a table that lost rows 6 to 10 (the left column jumps from 5 to 16). The text beside it says 18 electrical ids minus 2 gives 16 base files plus 4 variants. | `EDUCATION.md` table after line 371 | Rows 6 to 10 are rebuilt in section 4.4 from the registry: `part-not-powered`, `button-no-pulldown`, `open-connection`, `swapped-pins`, `wrong-pin-in-code`. Amar confirms (section 10, Q3). |
| F5 | Symptom ids disagree. SIM 13.4 and SA-23 use kebab ids (`i2c-no-ack`). The example project files use dotted ids (`i2c.no-ack`, `led.dark`, `regulator.hot`). The schema pattern allows both. RC-43 only renamed cause ids. | `env-monitor-esp32.project.json` line 606; `SIMULATION_ARCHITECTURE.md` line 2042 | Registry ids are kebab, no dots (R4: SIM owns the list). T-B10-16 renames the dotted symptom ids in the example files. |
| F6 | The matrix in SYSTEM 5.3 does not let `studio` or UI import `sim`. The F-028 rules live in `src/sim/faults` and `staticProblems` is a Studio helper. The roadmap's own T-B8-04 (ModelsPanel from the registry) hits the same wall. | `SYSTEM_ARCHITECTURE.md` section 5.3, `studio` and `UI` rows | (a) The static check runs in the SimWorker over a new `static-check` message (T-B10-24). (b) The pure fault code (types, reducer, generator, hints, seal) needs a one-folder import exception for `studio` and UI: T-B10-01 part B. The default answer Yes to Q2 is binding unless `DECISION_REGISTER.md` holds a Q2 row that says No. |
| F7 | R-119 says a schema test fails for any new fault without `cause_id` and `symptom_id`. RC-44 says a project fault may carry zero `symptom_ids`. | `PRODUCT_REQUIREMENTS.md` line 912; RC-44 | The test covers faults the product ships (catalogue mapping, part descriptors, generated faults, the 40 items), not faults a person writes. |
| F8 | R-119 says the record is written to the local event log. R-009 makes the local log an opt-in setting, default off, and ADR-0106 makes the `events` store an opt-in ring buffer of 5,000 rows. | `PRODUCT_REQUIREMENTS.md` line 290; `ADR-0106` line 32 | The session always keeps its record and can export it. The log write happens only when the switch is on. Amar decides the default (section 10, Q5). |
| F9 | The catalogue fault counts differ: the plan says 144 board failures and 106 bench faults. A grep of `trigger: {` finds 127 in `src/content/boards/*.ts` and 35 in `src/content/robotics/*.ts` (VERIFIED), because some faults are built by helpers. | `grep -c "trigger: {"` | T-B10-25's test counts at run time from the content index. It trusts neither number. |
| F10 | `ext["x-iynk-guided"]` and its JSON Schema (`edu-guided.schema.json`) are not built by any task in B1 to B9 (VERIFIED: no match in the roadmap). Sealed items need only the `diagnose` part. | `EDUCATION.md` lines 130 and 339 | T-B10-19 reads and validates only `ext["x-iynk-guided"].diagnose`. The rest of the plan is left alone for LABS. |
| F11 | Two detector ideas in the roadmap row have no cause id: "wrong baud" and "pin mode". The registry has none. | SIM 13.4 table | PROPOSAL: extension ids `x-code.serial-baud-mismatch` and `x-code.pin-mode-wrong`. Amar accepts or drops them (Q6). |
| F12 | PDM 5.11 says Restore "disables" the fault and the document hash "returns to its earlier value". A disabled fault is still stored, so the hash cannot return. | `PROJECT_DATA_MODEL.md` line 536 and the hash definition at line 713 | Restore removes a fault that Break it added (hash equal) and disables a fault the author wrote (Q9). |
| F13 | SA-23 asserts a "Studio I2C scan" that finds 0 of 112 addresses. No roadmap task builds it (grep for "scan" in the roadmap finds none). | `SIMULATION_ARCHITECTURE.md` line 2042 | New task T-B10-33. |

## 3. Conventions

### 3.1 Proof shorthands (copied from the roadmap, section 2.3, so this file stands alone)

| Name | Expands to |
|---|---|
| `TL` | `npm run typecheck && npm run lint` |
| `V <path>` | `npx vitest run <path>` |
| `KL` | `env META_API_KEY= GEMINI_API_KEY= SERPAPI_KEY= NEXT_PUBLIC_SOLANA_PROGRAM_ID= SOLANA_ISSUER_KEYPAIR= NEXT_PUBLIC_REALTIME_URL= VULTR_API_KEY= TIMESCALE_SERVICE_URL= PGPASSWORD= PGHOST= DATABASE_URL=` (after T-B0-12 the names that no longer exist are dropped) |
| `E <spec>` | `KL NEXT_DIST_DIR=.next-build npx playwright test <spec>` (picks a random port; skips 43117 after T-B0-03) |
| `SCHEMA` | `npm run schema:check` (T-B2-04) |
| `PORTABLE` | `npx tsc -p tsconfig.portable.json` (T-B2-01) |
| `GATE` | `npm run check` (content check, typecheck, lint, test, e2e) |

Every task below ends with `TL` plus the commands it names. A task is not done until those exit 0, except tasks that name another proof (T-B10-00 and T-B10-31).

The phase gate is run as `KL npm run check`, never bare. The audit (`01_AUDIT/runs/COMMANDS.md`, row 6) records 13 timing failures in 9 test files on a loaded machine: `src/content/drones/{octo,wing,racer,longrange,cinewhoop,whoop,vtol}.test.ts`, `src/content/boards/basys3.test.ts` and `src/lib/interp/lessons.test.ts`. No assertion failed in any of them. After a gate run the agent lists the failing test files and compares them with that list. A failing file that is on the list does not block B10 (re-run it alone once to confirm it is a timeout). A failing file that is not on the list blocks. The heavy content suites keep the baseline timeout (`testTimeout: 60_000`, `vitest.config.mts:15`); no B10 task raises it.

### 3.2 Rules every task follows

1. Step 0, name check. The B2 to B9 files named in section 3.3 do not exist at the time of writing. Their names come from the roadmap rows. Before writing code, the agent runs `ls` and `grep` for each predecessor symbol the task uses. If a name differs, the agent adapts inside the one adapter file the task names. It never edits a predecessor file that the task does not list. If a predecessor is missing, the agent stops and reports.
2. Portable code. Everything under `src/sim/faults/`, `src/sim/bus/scan.ts` and `src/export/diagnosis.ts` has no DOM, React, Next, `Worker`, `Date.now`, `performance.now` or `Math.random` import. The lint ban from T-B3-10 applies. `PORTABLE` must pass. `src/local/events.ts` and `src/content/faults/*` follow the rules of their own modules (`local` may use IndexedDB; `content` imports only `core` and `project` types). Tests that read fixture files from disk use `// @vitest-environment node` and `node:fs`.
3. Layering (SYSTEM 5.3). `src/sim/faults` imports `core`, `project` (types, netlist) and `parts`. `src/studio` and `src/components` reach the rules through `src/sim-host` messages (T-B10-24, T-B10-33) and read results as plain data. They import the pure fault code in `src/sim/faults/*` (types, reducer, generator, hints, seal, items) under the exception of T-B10-01 part B. The default answer Yes to Q2 is binding unless `DECISION_REGISTER.md` holds a Q2 row that says No; the orchestrator records the answer as a register row before G1. `src/studio` and `src/sim/faults` import nothing from `src/local`: logging is injected as a structural `EventSink` (T-B10-23) and `appEventLog()` is called only from components under `src/components/` (T-B10-09, T-B10-32). `src/content` and `src/sim` do not import each other, so a test in one folder reads the other folder's data with `node:fs`. `src/architecture.test.ts` (T-B2-01) enforces the matrix and reads every import, test files included.
4. Text. All user-visible strings come from the `faults` namespace (T-B10-12), in six languages (`en`, `es`, `fr`, `de`, `zh`, `hi`, `src/i18n/config.ts:4`). No string says "validated" or "certified". No em dashes.
5. Randomness and time. Anything seeded takes the seed as an argument. Anything timed takes a `SimTime` (integer nanoseconds). Tests step the virtual clock and never wait on wall time (R-002).
6. A rule never fires on something it cannot see. A rule that needs a part descriptor, code facts or run facts skips the net or part that lacks them and records a `skipped` count. The skip count is part of the corpus report. A rule that false-alarms on a `clean/` file is switched off (`enabled: false` with a reason string) until fixed; the gate test fails if a rule is switched off without a reason.
7. Next.js. This repo runs Next.js 16.4.3 (VERIFIED, `package.json`). No B10 task adds a route, a route handler or a Next config key. UI tasks use client components under `src/components/studio/` and the existing studio mount. If a task finds it must name a Next API, it reads the matching guide in `node_modules/next/dist/docs/01-app/` first (`AGENTS.md`).

### 3.3 Outputs of earlier phases that B10 uses

All rows are DOCUMENTED by the roadmap row named. None exists in the tree today (VERIFIED: `src/sim`, `src/project`, `src/studio`, `src/components/studio` do not exist).

| Symbol or file | Built by | Used by B10 for |
|---|---|---|
| `src/project/generated/types.ts` (`Fault`, `Operation`, `Project`, `Check`), `validate.mjs`, `npm run schema:check` | T-B2-04 | fault and op types, schema parity tests |
| `src/project/apply/sim.ts` (`fault.set`, `fault.remove`) | T-B2-07 | applying faults as undoable operations |
| `src/project/session.ts` (`ProjectSession`, undo, `stateHash`) | T-B2-10, T-B2-09 | Break it, Restore, hash equality |
| `src/parts/registry.ts`, `descriptor.ts`; descriptors for Uno, LED, resistor, push button, buzzer, potentiometer, one I2C display | T-B2-11, T-B2-12 | pin `type`, `class`, `polarity`, `pull`, `ratings`, `protocols`, `injectable_faults`, `failure_modes` |
| `src/project/netlist.ts` (SimNetlist: `nets`, `parts[].pins`, `settings`) | T-B2-13 | the input of every rule |
| catalogue converter and its output (`scripts/convert-catalogue.mjs`, `src/project/convert/*`) | T-B2-14 | the `clean/` corpus |
| `src/sim/core/*` (clock, rng, hash), `src/sim/engine.ts`, `orchestrator.ts` | T-B3-10, T-B3-11 | `SimTime`, hooks |
| `src/sim-host/protocol.ts`, `host.ts`, `sim.worker.ts` | T-B3-13 | the new `static-check` message |
| `src/sim/analog/*` (solve, elements) | T-B3-16, T-B3-17 | solved detectors |
| `src/sim/replay/record.ts` (`ReplayRecord`) | T-B3-19 | replay of a diagnosis |
| `src/project/diagnosis.ts` (`Diagnosis`, `Evidence`), `src/sim/faults/cause-ids.ts` (the 45 ids, `x-` rule) | T-B3-20 | the shared record type and the id list |
| IndexedDB store `events` | T-B3-02 | the local learning log |
| `src/components/studio/StudioEntry.tsx`, `src/studio/commands.ts`, `src/studio/stores/doc.ts`, `session.ts`, `src/studio/problems.ts`, `src/components/studio/Problems.tsx`, `src/studio/overlays/netlist.ts`, `src/studio/templates.ts`, `src/studio/run/session.ts`, `SerialPane.tsx` | T-B4-01, T-B4-02, T-B4-10, T-B4-13, T-B4-16, T-B4-17 | mounting panels, Problems producer, overlay highlight, starter projects |
| `src/sim/registry/entries.ts`, `tiers.ts`, `data/*.json` | T-B8-03 | failure-model entries, tier labels |
| `src/sim/analog/live.ts`, `states.ts`, `rails.ts` (honest states: over-current, burn-out, brown-out, floating input, with evidence) | T-B8-05, T-B8-06 | solved detectors |
| `src/sim/probe/tap.ts`, `provenance.ts`, `meter.ts` | T-B8-10, T-B8-11 | evidence with provenance |
| `src/sim/replay/snapshot.ts`, `restore.ts` | T-B8-15 | replay check |
| Bus models, `Wire.begin` binding, BME280, board power entry, world script | T-B9-01, T-B9-02, T-B9-04, T-B9-05, T-B9-06 | SA-23 only (finding F1) |
| `src/components/settings/LocalLog.tsx`, `src/lib/keys/usage.ts`; telemetry default off | T-B1-07, T-B0-08 | the log viewer and the opt-in switch |

Existing files B10 edits or reads today (VERIFIED by reading them in this step):

| File and line | What is there |
|---|---|
| `src/content/schema.ts:213-216` | `FailureKind`, 13 values |
| `src/content/schema.ts:218-229` | `FailureTrigger`, 10 `by` values |
| `src/content/schema.ts:243-253` | `FailureMode {id, kind, trigger, figure, effect, title, symptom, explanation, fix}` |
| `src/content/schema.ts:356` and `370-380` | `RunTrace`; `Check` union with 10 kinds |
| `src/components/boardlab/FailurePanel.tsx:66-75` | `trigger` and `repair` handlers; Break it on catalogue circuits |
| `src/components/robotics/FaultsPanel.tsx:58` | the Trigger and Repair dispatch for bench faults |
| `src/lib/boardlab/store.ts:92-93, 285-287`; `src/lib/robotics/store.ts:55-56, 205-212` | `fault/trigger` and `fault/clear` actions |
| `src/lib/telemetry/kinds.ts:5-20` | `TELEMETRY_KINDS`, 14 kinds. It is the telemetry ingest and send path (`MAX_DATA_BYTES` at line 47, `MAX_BODY_BYTES` at line 48). B10 reads it and does not edit it (T-B10-20 tests that none of its six learning kinds is in it) |
| `src/lib/interp/checks.ts:122` | `evaluateCheck`, the one check evaluator |
| `src/lib/interp/arduino/parser.ts:249-327, 915` | `Expr`, `Stmt`, `Unit`, `parseSketch(src, typeNames)` |
| `src/lib/interp/arduino/libs.ts:741-745` | `Wire.begin` is a no-op today |
| `src/i18n/namespaces.ts:4` and `:8-20` | `NAMESPACES` array and the typed `Messages` map (one `typeof import(...)` entry per namespace) |
| `src/i18n/server.ts:30-33` | `getDictionary` imports every namespace for a locale; nothing reaches the client unless a page passes it down (`server.ts:10-11`) |
| `src/i18n/messages.test.ts` | parity test: every language has the English keys and the same placeholders |
| `figures/engine/bench-solve.js:10` | `PIN_R = 25` |
| `figures/engine/bench-solve.js:317, 328, 341, 372, 379` | the five burn rules (LED, diode, NPN, TMP36, potentiometer track) |
| `figures/engine/bench-bb.js:116` | the USB sag rule (`st.sag`, 0.6 s) |
| `vitest.config.mts` | `testTimeout: 60_000` (line 15); `include` is `src/**/*.test.{ts,tsx}`, `figures/**`, `scripts/**`; so corpus tests live in `src`, not in `tests/` |

## 4. Shared contracts

These are the contracts several tasks use. A task cites them by number. A contract is changed only by editing this section and the task that owns it, in one commit.

### 4.1 Types (owned by T-B10-01, `src/sim/faults/types.ts`)

```ts
import type { Fault } from '@/project/generated/types';
import type { Evidence, Diagnosis } from '@/project/diagnosis';
import type { Operation } from '@/project/generated/types';

export type SimTime = number;                       // integer nanoseconds (ADR-0301)
export type CauseId = string;                       // member of CAUSE_IDS, or starts with "x-"
export type SymptomId = string;                     // member of SYMPTOM_IDS, or starts with "x-"
export interface PinRef { part: string; pin: string }

export type FaultOp =                               // SIM 13.2, copied unchanged
  | { kind: 'open'; pin: PinRef }
  | { kind: 'short'; a: PinRef; b: PinRef; ohms: number }
  | { kind: 'swap'; a: PinRef; b: PinRef }
  | { kind: 'value'; part: string; param: string; factor: number }
  | { kind: 'polarity'; part: string }
  | { kind: 'cold-joint'; pin: PinRef; onFraction: number; periodNs: number }
  | { kind: 'stuck'; part: string; level: number; pin?: string }   // pin is a PROPOSAL (Q7); SIM 13.2 has no pin
  | { kind: 'degrade'; part: string; param: string; perHour: number }
  | { kind: 'code-pin'; file: string; line: number; from: number; to: number }
  | { kind: 'param'; target: string; path: string; factor?: number; value?: number | string }
  | { kind: 'mount'; mount: string; pose: unknown }
  | { kind: 'sensor'; sensor: string; mode: 'dropout' | 'stuck' | 'bias' | 'noise'; magnitude?: number; atNs: SimTime; durationNs?: SimTime }
  | { kind: 'swap-phase'; motor: string };

export type FaultErrorCode =
  | 'unknown-target' | 'ambiguous-target' | 'needs-choice' | 'missing-param' | 'bad-param' | 'no-such-line';
export interface FaultError { code: FaultErrorCode; faultId: string; message: string }

export type RuleLayer = 'static' | 'code' | 'solved';
export interface ProblemTarget { kind: 'part' | 'pin' | 'net' | 'wire' | 'hole' | 'file'; id: string; pin?: string; line?: number; col?: number }  // STUDIO_EDITOR 10.1

export interface Finding {
  ruleId: string;                                   // 'rule:led-polarity@1'
  causeId: CauseId;
  symptomId: SymptomId;
  severity: 'error' | 'warning' | 'note';
  targets: ProblemTarget[];
  evidence: Evidence[];                             // SIM 13.4 shape (RC-49)
  messageKey: string;                               // bare key in the `faults` namespace, e.g. 'check.skipped' (4.6)
  args: Record<string, string | number>;
  fixes?: Array<{ kind: 'code' | 'wiring' | 'value'; messageKey: string; args: Record<string, string | number>; ops?: Operation[] }>;   // R-126
}

export interface Rule {
  id: string;                                       // '<layer>:<name>@<major>' as in the table of 4.3
  layer: RuleLayer;
  causeId: CauseId;
  symptomId: SymptomId;
  needs: Array<'descriptors' | 'code' | 'run'>;
  enabled: boolean;
  disabledReason?: string;
  check(input: RuleInput): Finding[];
}
export interface RuleInput { view: NetView; code?: CodeFacts; run?: RunFacts; checks?: CheckOutcome[]; skipped: { add(ruleId: string, what: string): void } }
```

```ts
export interface CheckOutcome { id: string; kind: string; ok: boolean; detail?: string; atMs: number }
export interface HintLevel { text: string; focus?: { components?: string[]; nets?: string[] }; probe?: { a: string; b: string; expect?: { min: number; max: number; unit: 'V' | 'A' | 'ohm' } } }
export interface HintLadder { levels: [HintLevel, HintLevel, HintLevel] }      // EDUCATION 7.1
export interface FaultState { id: string; op: FaultOp; appliedAt: SimTime; causeId: string }   // SIM 13.2

// The three inputs of a rule are declared here, in the file T-B10-01 owns, so that G1 compiles alone.
// T-B10-03, T-B10-05 and T-B10-04 implement them (buildNetView, extractCodeFacts, runFactsFrom).
import type { ComponentDescriptor } from '@/parts/descriptor';     // T-B2-11; Step 0 reads the real path and type name

export interface PinInfo { part: string; pin: string; net: string | null; type?: string; cls?: string; polarity?: string }
export interface NetView {
  readonly groundNet: string;
  nets(): string[];
  parts(): string[];
  pinsOn(net: string): PinInfo[];
  pin(part: string, pin: string): PinInfo | undefined;
  descriptor(part: string): ComponentDescriptor | undefined;
  isBoard(part: string): boolean;
  category(part: string): string | undefined;               // identity.category
  netClass(net: string): 'power' | 'ground' | 'signal' | 'unknown';
  nominalVolts(net: string): number | undefined;            // from power.outputs of the source part on the net
  wireOnly(a: string, b: string): boolean;                  // joined by wires and internal-short groups only
  resistorsOn(net: string): PinInfo[];
}

export interface CodeFact<T> { value: T; file: string; line: number }
export interface CodeFacts {
  language: 'arduino-cpp' | 'unsupported';
  pinModes: CodeFact<{ pin: string; mode: 'INPUT' | 'OUTPUT' | 'INPUT_PULLUP' }>[];
  pinWrites: CodeFact<{ pin: string; fn: 'digitalWrite' | 'analogWrite' | 'tone' }>[];
  pinReads: CodeFact<{ pin: string; fn: 'digitalRead' | 'analogRead' }>[];
  wireBegin?: CodeFact<{ sda: string; scl: string }>;
  wireClock?: CodeFact<{ hz: number }>;
  i2cAddresses: CodeFact<{ addr: number }>[];
  serialBegin?: CodeFact<{ baud: number }>;
  unresolved: number;                                      // calls whose pin argument is not a literal
}

export interface RunFacts {
  endNs: SimTime;
  states: { at: SimTime; part: string; state: 'burnt' | 'over-current' | 'brown-out' | 'floating-input' | 'reverse-biased' | 'sag'; quantity?: string; value?: number; unit?: string; modelId: string; tier: Evidence['tier']; provenance: Evidence['provenance'] }[];
  node(net: string, atNs: SimTime): { v: number; tier: Evidence['tier']; provenance: Evidence['provenance'] } | undefined;
  branch(part: string, pin: string, from: SimTime, to: SimTime): { peakA: number; avgA: number; tier: Evidence['tier']; provenance: Evidence['provenance'] } | undefined;
  pinLevels: Record<string, { at: SimTime; level: 0 | 1 }[]>;
  serial: { at: SimTime; text: string }[];
  bus: { at: SimTime; bus: string; kind: 'ack' | 'nack' | 'stuck-low'; addr?: number }[];
  resets: SimTime[];
}
```

`NetView`, `PinInfo`, `CodeFact`, `CodeFacts` and `RunFacts` are interfaces declared in `types.ts` by T-B10-01, so `RuleInput`, `Rule` and `FaultMonitor` compile in G1 and no task in G3 waits for another G3 task for a type. Other tasks only implement them: `buildNetView` (T-B10-03), `runFactsFrom` (T-B10-04), `extractCodeFacts` (T-B10-05). If a later task finds that an interface needs one more field or method, it edits `types.ts` in its own commit and counts the file under its 5-file limit. There is no barrel file: importers name the file (`@/sim/faults/types`).

### 4.2 Diagnosis record (owned by B3, read-only for B10)

`Diagnosis { cause_id; symptom_id; evidence: Evidence[]; hint_level: 0|1|2|3 }` and `Evidence { kind: 'pin-level'|'net-voltage'|'branch-current'|'serial-line'|'state'|'timeline'; ref; at: SimTime; value: number|string; unit?; provenance: 'computed'|'approximation'|'mocked'; tier: 'T0'|'T1'|'T2'|'T3'; modelIds: string[] }` (SIM 13.4, RC-49). A wrong pick is an event, never an evidence entry (EDUCATION 6.9).

### 4.3 The rule table

This is the set the corpus gate runs. "Catches" names the broken file slots of section 4.4. The three `solve:` rows that catch a broken file (12, 13, 15) are what stand between 17 and 20 of 20, so the gate has a margin of one file only (section 11, risk 2).

| Rule id | Layer | cause_id | symptom_id | Fires when | Guard against a false alarm | Catches |
|---|---|---|---|---|---|---|
| `rule:open-pin@1` | static | `open-connection` | `part-dead` | a non-board part pin that is `power_in`, an input type, or listed in a modelled `protocols[].pins` has no net, while another pin of that part is on a net | all parts on the check are described; skips pins of the board part (those belong to `floating-input`) | 8, 17 |
| `rule:missing-ground@1` | static | `missing-ground` | `part-dead` | a part has a `ground` pin with no net, or a net with no path to the ground net through wires and `internal-short` groups only, while a power pin of that part is connected | needs the described part; a part with no `ground` pin is skipped | 16, 20 |
| `rule:rail-short@1` | static | `supply-shorted-to-ground` | `supply-collapses` | one net holds a `power_out` or board supply pin and a `ground`-class pin with no part between | wires and `internal-short` groups only; a jumper part marked `identity.category: 'jumper'` still counts as a wire | 4 |
| `rule:contention@1` | static + code | `output-contention` | `pin-level-wrong` | a net holds two or more driver pins: `digital_out`, `power_out`, or a `digital_io` pin that `CodeFacts.pinModes` says is OUTPUT | open-drain pins and tri-state pins are not drivers; a pin whose mode is unknown is not a driver | 3 |
| `rule:floating-input@1` | static + code | `floating-input` | `reading-erratic` | a board input pin read by code is on a net with no driver, no rail and no resistor, or its net has only that pin; `INPUT_PULLUP` or a descriptor `pin.pull` removes it | needs `CodeFacts`; without code the rule is skipped | 5 |
| `rule:button-no-pull@1` | static + code | `button-no-pulldown` | `button-erratic` | a board input pin read by code shares its net with exactly one switch pin, the other switch contact is on a rail, no resistor reaches the opposite rail, and the mode is not `INPUT_PULLUP` | switch is recognised by `identity.category: 'switch'`; skips if the descriptor lacks it | 7 |
| `rule:led-series@1` | static | `led-no-series-resistor` | `led-burnt` | a path from a source net (power or driver pin) through an LED to the ground net holds no element other than the LED and wires | skips LED modules that declare an on-board resistor (`pull`/`ratings` role `characteristic` with measure `resistance` on the part) | 1 |
| `rule:led-polarity@1` | static | `led-reversed` | `led-dark` | an LED `anode` pin is on the ground net (or on the lower-potential net of a driver and a rail) and its `cathode` is on the driven net | uses `pin.polarity` only; a part without polarity data is skipped | 2 |
| `rule:supply-polarity@1` | static | `reverse-polarity` | `part-hot` | a part has `power_in` on the ground net and a `ground` pin on a power net, or a polarised part (`positive`/`negative`) has them swapped | same data guard | 14 |
| `rule:part-supply@1` | static | `part-not-powered` | `part-dead` | a part's `power_in` pin is on a net with no source, or on a net whose nominal voltage is below the part's operating minimum rating | nominal voltage comes from the board or supply descriptor `power.outputs`; a net with unknown voltage is skipped | 6 |
| `rule:i2c-roles@1` | static | `swapped-pins` | `i2c-no-ack` | a device pin with protocol role SDA shares a net with a board pin whose board protocol role is SCL, or the reverse | needs both descriptors | 9, 18 |
| `rule:i2c-pullup@1` | static | `i2c-missing-pullup` | `i2c-no-ack` | an SDA or SCL net has no resistor to a power net, no on-board `pin.pull` and no board internal pull | a module with its own pull-ups declares `pin.pull.kind: 'on-board'` | 11 |
| `rule:i2c-pullup-value@1` | static | `wrong-value` | `i2c-no-ack` | the pull-up on an I2C line is above `Rp_max = t_r / (0.8473 * Cb)` for the bus speed or below `Rp_min = (Vcc - 0.4 V) / 3 mA` | EXTERNAL formula from the I2C specification (UM10204), not read in this step; `Cb` is ASSUMED 100 pF; the thresholds are data in the rule, not in the code | 19 |
| `code:wire-begin-pins@1` | code | `swapped-pins` | `i2c-no-ack` | `Wire.begin(sda, scl)` names GPIOs whose nets reach the device `SCL` and `SDA` pins in the opposite roles (BRIEF 30 `flt_swap`) | only literal integer arguments | 18 (variant), SA-23 |
| `code:pin-mismatch@1` | code | `wrong-pin-in-code` | `code-no-effect` | the code writes pin P and P's net holds no output part pin, while another board pin Q holds an LED or buzzer that the code never writes | names both P and Q; offers a fix on either side (R-126) | 10 |
| `code:i2c-address@1` | code | `wrong-value` | `i2c-no-ack` | the 7-bit address in the code is not one the wired device answers to, given its address-select pin level | needs the device descriptor's address table | none in the corpus |
| `code:serial-baud@1` | code | `x-code.serial-baud-mismatch` | `serial-garbled` | `Serial.begin(b)` differs from the serial monitor instrument `settings.baud` | only literal `b` | none in the corpus |
| `code:pin-mode@1` | code | `x-code.pin-mode-wrong` | `pin-level-wrong` | `digitalRead` on a pin only ever set OUTPUT, or `digitalWrite` on a pin never set OUTPUT | `analogWrite` and `tone` pins are exempt | none in the corpus |
| `solve:led-overcurrent@1` | solved | `led-no-series-resistor` | `led-burnt` | peak LED current above 2.5 times its `imax` (the rule at `bench-solve.js:317`) | uses the computed state of T-B8-06, never a fixed figure | 1 (confirms) |
| `solve:pin-overcurrent@1` | solved | `pin-overcurrent` | `pin-overloaded` | a board pin's current above the board `maxAmps` | `PIN_R = 25` ohms comes from the board data (`bench-solve.js:10`) | 12 |
| `solve:brownout@1` | solved | `brownout` | `mcu-resets` | the MCU supply crosses below the board minimum, with hysteresis and dwell (SIM 7.6) | the board power entry supplies the thresholds; no entry means skipped | 13 |
| `solve:rail-collapse@1` | solved | `supply-shorted-to-ground` | `supply-collapses` | source current at its limit with a node pair at 0 V | confirms the static rule; never the only evidence | 4 (confirms) |
| `solve:part-undervolt@1` | solved | `part-not-powered` | `part-dead` | a supply pin below the part's minimum for at least 50 ms | the part must be described | 6 (confirms) |
| `solve:value-band@1` | solved | `wrong-value` | `led-dim` | a `node-voltage` or `supply-current` check fails at its time, or an LED's current is below 0.1 mA for at least 50 ms while its driver net is high | needs check outcomes or run facts | 15 |
| `solve:led-reverse@1` | solved | `led-reversed` | `led-dark` | an LED is reverse biased with zero current while its anode net is high | confirms the static rule | 2 (confirms) |

Count: 13 static, 5 code, 7 solved: 25 rules. 17 of them are the primary catcher of at least one slot in the table above. The gate needs 8.

### 4.4 The corpus (owned by T-B10-06, read by T-B10-18)

Directory `tests/fixtures/fault-corpus/` (EDUCATION 6.6 owns it; RC-48):

| Path | Content |
|---|---|
| `README.md` | what the corpus is, how it is rebuilt, how to add a file, the rule that a rule which alarms on `clean/` is switched off |
| `MANIFEST.json` | `{ version: 1, cleanCount, clean: [{file, source, parts: string[], described: boolean}], broken: [{file, base, ops, expectedCauseId, expectedRule, slot}] }` |
| `clean/*.project.json` | converter output that is meant to work (Uno R3 and Uno R4 lessons, their reference solutions, Uno tour steps with a netlist). Count is `cleanCount`, written by the script. The "79 circuits" figure in older documents is ESTIMATED with derivation UNKNOWN and is not used. |
| `broken.spec.json` | 20 entries, each `{slot, base, ops: Operation[], expectedCauseId, expectedRule, note}`; the ops are hand-written project operations (`net.disconnect`, `component.set`, `net.merge`, `source.edit`, ...) |
| `broken/*.project.json` | the 20 projects, generated from the spec by `scripts/fault-corpus.mjs`; committed; a test regenerates and compares |

The 20 slots (rows 6 to 10 rebuilt, finding F4):

| Slot | expectedCauseId | Slot | expectedCauseId |
|---|---|---|---|
| 1 | `led-no-series-resistor` | 11 | `i2c-missing-pullup` |
| 2 | `led-reversed` | 12 | `pin-overcurrent` |
| 3 | `output-contention` | 13 | `brownout` |
| 4 | `supply-shorted-to-ground` | 14 | `reverse-polarity` |
| 5 | `floating-input` | 15 | `wrong-value` |
| 6 | `part-not-powered` | 16 | `missing-ground` |
| 7 | `button-no-pulldown` | 17 | `open-connection` (signal leg left off) |
| 8 | `open-connection` | 18 | `swapped-pins` (two I2C lines) |
| 9 | `swapped-pins` | 19 | `wrong-value` (I2C pull-up 100 times too large) |
| 10 | `wrong-pin-in-code` | 20 | `missing-ground` (sensor only) |

Pass condition (EDUCATION 6.6, RC-48): no rule reports a finding on any `clean/` file; the findings include the `expectedCauseId` for at least 18 of the 20 `broken/` files; at least 8 distinct rule ids each account for at least one of those catches. "Caught" means at least one `Finding.causeId` equals `expectedCauseId`. "False alarm" means any `Finding` with severity `error` or `warning` on a clean file; severity `note` is reported but not counted.

### 4.5 Learning events (owned by T-B10-20)

Shape from EDUCATION 11.3: `{ id: string; at: string /* ISO */; kind; payload }`. No project name, room code or buddy name is stamped. Cap 5,000 rows, oldest dropped first (ADR-0106).

| kind | payload | Written when | Task |
|---|---|---|---|
| `hint.open` | `{projectId, level: 1|2|3, via: 'ladder'|'partner'}` | a level opens | T-B10-08, T-B10-20 |
| `diagnose.answer` | `{projectId, cause_id, correct, confidence?}` | a pick | T-B10-23 |
| `reveal` | `{projectId}` | Give up | T-B10-23 |
| `diagnosis.record` | `{projectId, diagnosis: Diagnosis, outcome: 'clean'|'assisted'|'helped'|'revealed'}` | verified or revealed (PROPOSAL: EDUCATION 11.3 has no row for the record itself; R-119 needs one) | T-B10-10, T-B10-25 |
| `check.transition` | `{projectId, test, check, from, to}` | a check changes verdict between runs | T-B10-20 |
| `code.changed` | `{projectId}` | the first edit of a session (flag only, F-024) | T-B10-20 |

### 4.6 The `faults` i18n namespace (owned by T-B10-12)

New namespace `faults`, file `src/i18n/messages/<lang>/faults.json` in six languages. T-B10-12 makes two edits in `src/i18n/namespaces.ts`: `"faults"` goes into the `NAMESPACES` array (line 4) and `faults: typeof import("./messages/en/faults.json");` goes into the `Messages` map (lines 8-20). Without the second edit `Messages[N]` has no entry and `npm run typecheck` fails.

Shape. The JSON has no top-level `faults` wrapper: its first keys are `breakIt`, `diagnose`, `hint`, and so on, so the file holds `breakIt.title` and not `faults.breakIt.title`. A component builds its translator from the namespace (`messages.faults`) and calls `t("breakIt.title")`. In this file `faults.breakIt.title` is shorthand for that key in that namespace. Data that stores a key (`Finding.messageKey`, `labelKey`, `hintTemplate`) stores the bare key (`check.skipped`, `fidelity.notChecked`). `robotics.json` has its own top-level `faults` object (`t("faults.repair")` at `FaultsPanel.tsx:60`); it is another namespace and B10 does not touch it.

Loading. The namespace is not loaded on demand. `getDictionary` (`src/i18n/server.ts:30-33`) imports every namespace for a locale, like the other eleven. It reaches the client only when a page passes it down (`server.ts:10-11`); T-B10-32 passes `messages.faults` to the fault dock as a prop and nothing else.

Component tasks use only these keys. T-B10-12 ships a test that scans the component files for `t("...")` literals with the pattern `\bt\(\s*(["'])([A-Za-z][\w.-]*)\1` and fails on a key that is not a dotted path in `en/faults.json`. A template literal with `${` is not scanned.

| Group | Keys (bare keys of `faults.json`, no `faults.` prefix in the file) |
|---|---|
| Break it | `breakIt.title`, `lede`, `pick`, `surprise`, `restore`, `forBuddy`, `applied`, `none`, `explain`, `undone`, `needsDescriptor` |
| Diagnose | `diagnose.title`, `symptomHeading`, `pickHeading`, `pick`, `right`, `wrong`, `tryAgain`, `giveUp`, `showCause`, `hideCause`, `fixHeading`, `noEvidence`, `sealedInfo`, `addNote`, `skip`, `transferTitle`, `state.presented`, `state.observing`, `state.picking`, `state.fixing`, `state.verified`, `state.revealed` |
| Hints | `hint.title`, `level.1`, `level.2`, `level.3`, `open`, `generated`, `locked`, `none` |
| Record | `record.title`, `cause`, `symptom`, `evidence`, `hintLevel`, `export`, `copy`, `logOn`, `logOff`, `clear`, `outcome.clean`, `outcome.assisted`, `outcome.helped`, `outcome.revealed`, `empty` |
| Fidelity | `fidelity.notChecked`, `fidelity.checked`, `fidelity.outside`, `fidelity.modelOnly`, `fidelity.mocked` |
| Check | `check.title`, `run`, `none`, `found`, `skipped` |
| Scan | `scan.title`, `run`, `found`, `none`, `pins`, `noPins` |
| Evidence | `evidence.kind.pin-level`, `net-voltage`, `branch-current`, `serial-line`, `state`, `timeline`; `provenance.computed`, `approximation`, `mocked` |
| Causes | `cause.<id>.title`, `cause.<id>.why`, `cause.<id>.fix` for 20 ids: the 16 with a B10 detector, `bus-device-not-modelled`, `library-not-modelled` and the two `x-code.` ids |
| Symptoms | `symptom.<id>` for the 14 electrical symptom ids of T-B10-16 |
| Hint templates | `hintTemplate.<family>.1`, `.2`, `.3` for the families `wiring`, `power`, `code`, `bus`, `value` |

The fidelity string `fidelity.notChecked` reads: "Not checked against hardware. This is what the model says, not what a bench measured." It is shown with every diagnosis until `tests/fixtures/bench-check/uno-10.json` (T-B10-30, R-130) has Amar's results; then `fidelity.checked` shows for the causes those results cover.

### 4.7 Error handling

Pure functions return `Result<T, E>` from `src/core/result.ts` (T-B2-02); they do not throw for bad input. Rules never throw: an exception inside a rule is caught by the runner, recorded as a `note` finding with `ruleId` and `messageKey: 'check.skipped'`, and the other rules still run.

## 5. Task index

| ID | Title | Priority | Group | Depends on (inside B10) | R-ids |
|---|---|---|---|---|---|
| T-B10-00 | Spike: can the 20 slots be built from described parts? | must | G1 | none | R-124 |
| T-B10-01 | Fault types (with `NetView`, `CodeFacts`, `RunFacts`), the stored-kind to `FaultOp` map, import exception | must | G1 | none | R-118, R-124 |
| T-B10-16 | Symptom registry and cause metadata | must | G1 | none | R-119 |
| T-B10-19 | Sealed diagnose items: reader and redaction | must | G1 | none | R-120, R-125 |
| T-B10-20 | Local learning events | should | G1 | none | R-122 |
| T-B10-21 | `node-voltage` and `supply-current` checks | must | G1 | none | R-123, R-124 |
| T-B10-02 | Failure models as data | must | G2 | 01, 16 | R-118, R-127 |
| T-B10-03 | Rule runner, `buildNetView`, topology rules | must | G2 | 01, 16 | R-123, R-124 |
| T-B10-06 | Corpus: `clean/`, `broken/` spec and generator | must | G2 | 00, 16 | R-124 |
| T-B10-07 | Diagnosis session: states, evidence, options | must | G2 | 01, 16, 19, 20 | R-119, R-120, R-127 |
| T-B10-12 | `faults` namespace and fidelity labels | must | G2 | 16 | R-121, R-127 |
| T-B10-15 | Apply fault ops to a netlist and to code | must | G2 | 01 | R-118, R-125 |
| T-B10-25 | Tag the 250 catalogue faults; log their record | must | G2 | 16, 20 | R-118, R-119 |
| T-B10-26 | Diagnose item format, materialiser, lint | should | G2 | 16, 19 | R-129 |
| T-B10-04 | Solved detectors | must | G3 | 02, 03, 15, 21 | R-123, R-124 |
| T-B10-05 | Code facts and code detectors | must | G3 | 03 | R-124, R-126 |
| T-B10-08 | Hint ladder: logic and component | should | G3 | 07, 12 | R-121 |
| T-B10-10 | Diagnosis record view and export | must | G3 | 07, 12, 20 | R-119, R-127 |
| T-B10-17 | Part-aware static rules | must | G3 | 03 | R-123, R-124 |
| T-B10-22 | Fault generator and seeded pick | must | G3 | 01, 03, 16 | R-124, R-125 |
| T-B10-28 | Diagnose items 1 to 20 | should | G3 | 26 | R-129 |
| T-B10-29 | Diagnose items 21 to 40 | should | G3 | 26 | R-129 |
| T-B10-09 | Break it: tool and panel | must | G4 | 03, 04, 07, 12, 15, 19, 20, 22 | R-118, R-125 |
| T-B10-11 | All 45 cause ids: detector or "no detector yet" | must | G4 | 03, 04, 05, 17 | R-119 |
| T-B10-23 | Diagnose panel and store | must | G4 | 07, 08, 12, 19, 20 | R-120, R-121, R-127 |
| T-B10-24 | Static check and findings over the worker, Problems producer, overlay (plumbing only) | must | G4 | 03, 04, 12 | R-123 |
| T-B10-30 | Bench-check sheet (prepares R-130) | should | G4 | 04, 06, 15, 22 | R-130 |
| T-B10-14 | Fault authoring in a project and replay of a diagnosis | must | G5 | 09 | R-125 |
| T-B10-18 | Corpus gate test | must | G5 | 04, 05, 06, 11, 17, 21, 22, 24, 25, 28, 29 | R-124, R-123 |
| T-B10-27 | Transfer question | could | G5 | 23, 28, 29 | R-128 |
| T-B10-33 | I2C scan instrument | must | G5 | 24 | R-127 |
| T-B10-32 | Fault dock, commands, mounting, Check button, idle trigger, Problems footer | must | G6 | 09, 10, 23, 24, 30, 33 | R-118 to R-127 |
| T-B10-13 | SA-23 walkthrough | must | G7 | 05, 14, 32, 33 | R-119, R-126 |
| T-B10-31 | `docs/FAULTS.md` | must | G8 | all | none |

The roadmap card lists T-B10-01 to T-B10-14 with the meanings kept below. T-B10-15 to T-B10-33 and T-B10-00 are added by splitting work that the 5-file rule or the dependency findings forced apart. The roadmap total of 341 tasks therefore grows by 20 (finding for the orchestrator; section 10, Q1).

## 6. Task packages

A task row uses these labels. "Identity" gives id, subsystem, phase, priority, dependencies, status. All tasks have status "not started". Subsystem is FAULTS unless stated. Phase is B10.

---

### T-B10-00 Spike: can the 20 slots be built from described parts?

**Identity.** T-B10-00; subsystem FAULTS (spike); B10; must; depends on T-B2-12, T-B2-14 (earlier phases); status not started.

**Intent.**
- Problem: the gate needs 20 broken files made from converter output using parts that have a descriptor. Only seven descriptors exist at the start of B10 (Uno, LED, resistor, push button, buzzer, potentiometer, one I2C display; the other 22 hand-drawn parts convert in B11, after this phase). Nobody knows how many converter outputs are fully described, or whether slots such as `brownout` (13) and `button-no-pulldown` (7) can be made from them.
- Target user: Amar, who needs to know before the gate is written whether the gate is meaningful.
- User story: As the person who has to trust the 18 of 20 number, I want to see which slots are real before the detectors are built.
- Falsifiable question: "At the start of B10, can all 20 slots of section 4.4 be realised as one `clean/`-grade project plus one operation batch, using only parts that have a descriptor, and do at least 10 converter outputs have every part described?"
- Exit condition: PASS when at least 18 slots are realisable and at least 10 converter outputs have every part described. FAIL otherwise. On FAIL the report names each unrealisable slot and the missing part. The orchestrator then asks Amar whether to pull that part's descriptor forward from B11 as an extra task or to replace the slot with another variant of the same cause. T-B10-06 does not start until the report exists.
- Success metric: `REPORT.md` holds a table of 20 rows (slot, base project id, op batch in words, parts used, realisable yes/no) and the two counts.

**Implementation.**
- Existing files read: converter output of T-B2-14 (`src/project/convert/index.ts`, `scripts/convert-catalogue.mjs`), `src/parts/registry.ts`, `src/parts/data/*.component.json`.
- New files: `docs/MASTER_PLAN/08_RESEARCH_SPIKES/RS-B10-corpus-coverage/REPORT.md` and `coverage.mjs` (throwaway, outside `src/`). The folder is under `docs/MASTER_PLAN/` (VERIFIED: `ls docs/MASTER_PLAN/08_RESEARCH_SPIKES` lists the other `RS-*` folders there, and `RS-B10-corpus-coverage` does not exist yet). The commands below run from the repo root.
- How the script loads the converter: with relative `.ts` imports on Node 24.8 (`node --version` prints v24.8.0, VERIFIED), as T-B10-06 does. Plain Node cannot resolve the `@/` aliases of `tsconfig.json` (`paths`, line 25). If the converter or the registry imports through `@/`, the script stops, prints which file did, and the agent reports to the orchestrator. It does not add `tsx`, a loader or a bundler.
- Method: run the converter in memory; for each project list parts and whether the registry has a descriptor; count projects with zero undescribed parts; for each slot search the described projects for a base that has the parts the slot needs (an LED plus resistor for slots 1, 2, 12, 15; a button for 7; an I2C display for 9, 11, 18, 19; a second output pin for 3; a supply or board power input that can be set for 13 and 14; a sensor with a ground pin for 20).
- Data model, schemas, API, state transitions, permissions, migration: none. The script writes nothing outside the spike folder.
- Error conditions: converter output missing (T-B2-14 not built) means stop and report.

**Verification.**
- Unit tests: none (a spike). Evidence is the report with the numbers.
- Fixtures: none produced.
- Acceptance. Given the converter and the registry, When `node docs/MASTER_PLAN/08_RESEARCH_SPIKES/RS-B10-corpus-coverage/coverage.mjs` runs, Then it prints the 20-row table and the two counts and exits 0; Then `REPORT.md` states PASS or FAIL with those numbers.
- Observability: the script prints one line per project (`id parts=<n> undescribed=<k>`).
- Release blockers: a FAIL stops T-B10-06 until Amar answers.

**Delivery.**
- Done when `REPORT.md` is committed with a verdict and the numbers.
- Verify: `node docs/MASTER_PLAN/08_RESEARCH_SPIKES/RS-B10-corpus-coverage/coverage.mjs` (exit 0, prints the table and both counts); `npm run typecheck && npm run lint` (unchanged, proves the spike touched no source).
- Documentation: none beyond the report.
- Rollback: delete the folder.
- Later tasks need: the slot-to-base table (T-B10-06), the count of fully described `clean/` files (T-B10-18 states it in its output).

---

### T-B10-01 Fault types and the stored-kind to `FaultOp` map

**Identity.** T-B10-01; FAULTS / simulation; B10; must; depends on T-B2-01, T-B2-04, T-B2-07, T-B3-20; not started.

**Intent.**
- Problem: a stored `Fault` (what a person broke) has no code that turns it into the operations the simulator applies (SIM 13.2). PDM 5.11 says the mapping table "does not yet contain it", but SIM 13.2 now has the table (VERIFIED, lines 1371 to 1391). No code implements it. Finding F2: the four RC-45 kinds are in the working-tree schema but not in the committed one.
- Target user: every later task, and Amar through "Break it".
- User story: As a person who breaks a circuit, I want my fault to become the same operations the solver understands, with a clear error when the fault cannot be applied.
- Expected behaviour: every one of the 21 `Fault.kind` values maps to zero or more `FaultOp`s or to a named `FaultError`. Kinds that need a choice the stored fault does not carry (`overcurrent`, `boot-strap` without a pin, `level-mismatch`, `thermal`) return `needs-choice` unless `params` carries it (PROPOSAL rows of SIM 13.2).
- Success metric: a test enumerates all 21 enum values from the schema and every value has a mapping test; 0 values unmapped.

**Implementation.**
- Existing files: `docs/MASTER_PLAN/04_ARCHITECTURE/schemas/project.schema.json:2519-2521` (VERIFIED: working tree has `param`, `mount`, `sensor`, `swap-phase`; HEAD has none). Edit it only if the tree you start from lacks them, then run `SCHEMA` so the generated types follow. `src/project/apply/sim.ts` (T-B2-07) already handles `fault.set` and `fault.remove`; edit it only if its test of all 64 kinds fails.
- New files: `src/sim/faults/types.ts` (contract 4.1, including the interfaces `PinInfo`, `NetView`, `CodeFact`, `CodeFacts` and `RunFacts`; the file holds types only and imports `ComponentDescriptor` from `@/parts/descriptor`, whose real path and name Step 0 reads), `src/sim/faults/ops.ts`. Tests: `src/sim/faults/ops.test.ts`, `src/sim/faults/kinds.test.ts`.
- Part B, the import exception. The default answer Yes to Q2 is binding unless `docs/MASTER_PLAN/00_EXECUTIVE/DECISION_REGISTER.md` contains a Q2 entry that says No; the orchestrator records the answer as a register row before G1 starts, so the agent has no one to ask. If the register says No, skip part B and report: the Studio tasks then use the worker route (see Q2). Step 0: grep `eslint.config.mjs` and `src/architecture.test.ts` for an existing `sim/registry` or `sim/faults` exception (roadmap T-B8-04, `ModelsPanel` from the registry, needs the same kind of exception, and B8 may already have added it). If one exists, extend it with `src/sim/faults/**` and do not add a second one. Edit `eslint.config.mjs` and `src/architecture.test.ts` (both from T-B2-01) so that files under `src/studio/**` and `src/components/**` may import `src/sim/faults/**` and nothing else under `src/sim`. The edit is one zone exception and one matrix cell; `sim` still imports nothing from `studio` or `components`. A test case in `src/architecture.test.ts` plants an import of `@/sim/orchestrator` from a studio file and expects a failure, and plants `@/sim/faults/types` and expects a pass. The SYSTEM 5.3 text and ADR-0400 are not edited by this task; the orchestrator records the exception as a new RC row after Amar says yes.
- If the working tree lacks the four schema values (finding F2), the schema edit is its own first commit, `B10 T-B10-01a: Fault.kind gains param, mount, sensor, swap-phase`, so each commit stays within five files.
- Modules and signatures:
```ts
export interface FaultCtx {
  partPins(part: string): PinRef[];
  pinNet(p: PinRef): string | null;
  boardPinsOn(net: string): PinRef[];
  isPolarised(part: string): boolean;
  paramValue(part: string, param: string): number | undefined;
  supplyParam(component: string): { part: string; param: string } | undefined;
  secondsToNs(s: number): SimTime;                    // Math.round(s * 1e9)
}
export function faultToOps(fault: Fault, ctx: FaultCtx): Result<FaultOp[], FaultError>;
export function faultStates(fault: Fault, ops: FaultOp[], at: SimTime): FaultState[];   // id = `${fault.id}#${i}`
```
- Data model: reads `Fault {id, cause_id, symptom_ids, kind, target {component?, pin?, net?, nets?}, params?, enabled}`. Writes nothing.
- Algorithm: the table of SIM 13.2 line by line.

| Stored kind | Result |
|---|---|
| `reverse-polarity` | `polarity` on `target.component` |
| `reversed-part` | `polarity` if the part is polarised; else pin reversal as `swap` pairs (pin i with pin n+1-i by designator order; PROPOSAL) |
| `short` | `short {a, b, ohms}`; pins from `params.pins` or the first pin of each net in `target.nets` (sorted); `ohms` from `params.ohms`, default 0.01 (ASSUMED) |
| `overcurrent` | `short` with `params.ohms`; without it `needs-choice` |
| `missing-part` | one `open` per pin of the part |
| `open-wire`, `floating-input` | `open` on `{target.component, target.pin}` |
| `wrong-connection` | `swap`: from `target.nets`, exactly one board pin per net, else `ambiguous-target`; or from `{component, pin}` plus `params.with` |
| `cold-solder` | `cold-joint`; `onFraction` default 0.5, `periodNs` from `params.periodMs` |
| `stuck-level`, `boot-strap` | `stuck {part, level}`; needs `target.pin` for `boot-strap` else `needs-choice`. `stuck` gains an optional `pin` field here (PROPOSAL; SIM 13.2 must carry it too, Q7) |
| `wrong-value` | `value {part, param: params.parameter, factor}`; factor from `params.factor` or `params.value / paramValue` |
| `wrong-voltage`, `brownout` | `value` on `supplyParam`; `brownout` factor default 0.6 (ASSUMED) |
| `level-mismatch` | `value` on `params.part`, `params.parameter`; else `needs-choice` |
| `thermal` | `param {target, path: params.path}`; else `needs-choice` |
| `config` | `code-pin` if `params.file` and `params.line`; `param` (value) if `params.parameter`; else `needs-choice` |
| `param`, `mount`, `sensor`, `swap-phase` | same name; `sensor` converts `params.atMs` with `secondsToNs`; `atNs` stays integer |

- Validation: unknown component or pin gives `unknown-target`; a missing required `params` key gives `missing-param`; a wrong type gives `bad-param`; `factor <= 0` gives `bad-param`. `enabled: false` is the caller's filter, not this function's.
- Edge cases: a part with 0 pins in the registry gives `unknown-target`; `missing-part` on a part with unconnected pins still emits one `open` per pin (they are inert).
- Permissions: none. Performance: pure, under 1 ms per fault (ESTIMATED). Migration: none.

**Verification.**
- `ops.test.ts`: one case per row above, including the three error codes; `needs-choice` rows with and without the choice in `params`; `short` between two nets picks sorted first pins; `reversed-part` on a 4-pin IC gives two `swap`s; fault ids `flt_x#0`, `flt_x#1`.
- `kinds.test.ts`: reads `project.schema.json`, takes the `Fault.kind` enum, asserts it equals the 21 values of PDM 5.11 and that `faultToOps` handles every value (none returns an `unsupported` error). This is the "schema test" of R-119 for kinds.
- Fixtures: the `flt_swap` fault of `schemas/examples/env-monitor-esp32.project.json` (nets `net_scl`, `net_sda`) must give one `swap` between GPIO22 and GPIO21 of `brd_esp`.
- Acceptance. Given the `flt_swap` fault, When `faultToOps` runs with a ctx built from the example, Then it returns `[{kind:'swap', a:{part:'brd_esp', pin:'GPIO22'}, b:{part:'brd_esp', pin:'GPIO21'}}]`. Given a `thermal` fault with no `params.path`, Then the result is `needs-choice`.
- Observability: errors carry `faultId`.
- Release blockers: any enum value without a mapping test.

**Delivery.**
- Done when tests pass, `SCHEMA` is clean, `PORTABLE` passes, and `npm run typecheck` passes with `types.ts` alone (no G2 or G3 file exists yet; this is the check that `RuleInput` has all its types).
- Verify: `npm run typecheck && npm run lint`; `npx vitest run src/sim/faults/ops.test.ts src/sim/faults/kinds.test.ts`; `npm run schema:check`; `npx tsc -p tsconfig.portable.json`.
- Documentation: a short "Fault kinds" table goes into `docs/FAULTS.md` in T-B10-31.
- Rollback: revert the commit; no other task has run on it yet.
- Later tasks need: `FaultOp`, `FaultState`, `FaultCtx`, `faultToOps`, `Finding`, `Rule`, `NetView`, `CodeFacts`, `RunFacts` (everything in contract 4.1).

---

### T-B10-16 Symptom registry and cause metadata

**Identity.** T-B10-16; FAULTS / registry; B10; must; depends on T-B3-20, T-B2-15; not started.

**Intent.**
- Problem: `cause-ids.ts` (T-B3-20) holds the 45 ids and the `x-` rule. Nothing holds symptom ids, the family of each cause, which causes can be confused (EDUCATION 6.7 `confusableWith`, needed for distractors), or which detector layer owns a cause. The example projects use dotted symptom ids that disagree with SIM 13.4 (finding F5).
- Target user: the diagnose flow, hints and the corpus gate.
- User story: As a learner offered four possible causes, I want the wrong ones to be plausible, not random.
- Expected behaviour: one table of 45 causes with `family`, `seat`, `layer`, `confusableWith`, `symptomIds`; one list of symptom ids; example files use the same ids.
- Success metric: a test shows all 45 cause ids have a row; every `confusableWith` and `symptomIds` entry resolves; every `faults[].symptom_ids` value in the five example project files (`drone-quad`, `env-monitor-esp32`, `lesson-uno-r3-button`, `robot-line-follower`, `uno-blink-d12`) and every `injectable_faults`/`failure_modes` symptom in the example component files is in the symptom list or starts with `x-`.

**Implementation.**
- Existing files read: `src/sim/faults/cause-ids.ts` (T-B3-20). Edit (one data set) `docs/MASTER_PLAN/04_ARCHITECTURE/schemas/examples/*.project.json` and `examples/components/*.component.json`. Only five example project files exist (VERIFIED by `ls`: `drone-quad`, `env-monitor-esp32`, `lesson-uno-r3-button`, `robot-line-follower`, `uno-blink-d12`); `lesson-uno-r3-button` has no symptom ids. The list below comes from walking every `symptom_ids` array in the example files (VERIFIED, 24 distinct ids). Cause ids with a dot (`x-l298n.supply-too-low`) stay: they are `x-` extension ids.

| Old id | New id | Files that hold it |
|---|---|---|
| `i2c.no-ack` | `i2c-no-ack` | env-monitor-esp32, mpu6050-gy521 |
| `i2c.wrong-address` | `i2c-no-ack` | mpu6050-gy521 |
| `i2c.odd-currents` | `x-i2c-odd-currents` | mpu6050-gy521 |
| `sensor.latent-damage` | `x-sensor-latent-damage` | mpu6050-gy521 |
| `sensor.dead`, `module.dead`, `logic.no-5v`, `controller.dead` | `part-dead` | mpu6050-gy521, l298n-module |
| `regulator.hot`, `heatsink.hot` | `part-hot` | l298n-module, mpu6050-gy521 |
| `logic.brownout` | `mcu-resets` | l298n-module |
| `led.dark` | `led-dark` | led-5mm, uno-blink-d12 |
| `led.flash-then-dark` | `led-burnt` | led-5mm |
| `motors.dead` | `x-motors-dead` | l298n-module |
| `motor.dead-no-enable` | `x-motor-dead-no-enable` | l298n-module |
| `motor.intermittent` | `x-motor-intermittent` | l298n-module |
| `motor.stutters` | `x-motor-stutters` | l298n-module |
| `gyro.noisy` | `x-gyro-noisy` | mpu6050-gy521 |
| `line-not-detected`, `robot-resets-at-start`, `robot-turns-wrong-way` | the same ids with an `x-` prefix | robot-line-follower |
| `fc-resets-in-flight`, `flips-on-takeoff`, `yaw-spin-on-takeoff` | the same ids with an `x-` prefix | drone-quad |

  The robotics and drone symptom ids are not in the 14 electrical ids. They become `x-` ids now; B16 to B19 promote them into `SYMPTOM_IDS` when they model those causes. A rename that merges two old ids into one (for example `sensor.dead` and `module.dead` into `part-dead`) can leave a duplicate inside one `symptom_ids` array (`regulator.hot` and `heatsink.hot` in one fault): remove the duplicate, keep the order of first appearance. The sweep in `causes.test.ts` is the proof; the table is the edit list and is not copied into code.
- Hashes. Editing these files changes their canonical bytes and their state hashes. The example-hash test (T-B2-15, `src/project/examples.test.ts`, part of `npm run check`) will fail until the expected constants follow. Last step of this task: recompute the expected hashes with the method the test uses (the PDM table was made with `canon` and `sha` from `docs/MASTER_PLAN/04_ARCHITECTURE/schemas/tools/project-lib.mjs`, `PROJECT_DATA_MODEL.md` around line 1048) and update the constants in `src/project/examples.test.ts`. Step 0 also greps `src/` for `led-5mm.component`, `mpu6050-gy521` and `l298n-module` and updates any other test that pins a hash or digest of a changed file. `src/project/examples.test.ts` is an existing test file and counts as a test file of this task, not as a source file. The agent reports to the orchestrator that the hash table in `PROJECT_DATA_MODEL.md` (the five-row table near line 1048, and the second hash list under it) needs a matching edit; the orchestrator owns the master plan files and this task does not edit them.
- New files: `src/sim/faults/symptoms.ts`, `src/sim/faults/causes.ts`. Tests: `src/sim/faults/causes.test.ts`.
- Signatures:
```ts
export const SYMPTOM_IDS: readonly string[];             // 14 electrical ids, then pending ones for ROB and DRN
export type CauseFamily = 'wiring' | 'power' | 'code' | 'bus' | 'value' | 'mechanical' | 'flight';
export interface CauseMeta {
  id: CauseId; family: CauseFamily; seat: 'SIM' | 'ROB' | 'DRN';
  layer: 'L3' | 'L4' | 'L5' | 'L6' | 'L7' | 'L8' | 'static';
  confusableWith: CauseId[]; symptomIds: SymptomId[]; modelled: boolean;   // false for ROB and DRN ids until B16 to B19
}
export const CAUSES: readonly CauseMeta[];
export const causeMeta: (id: CauseId) => CauseMeta | undefined;
export const isSymptomId: (s: string) => boolean;        // member, or "x-" prefix
```
- Electrical symptom ids (14): `led-dark`, `led-dim`, `led-burnt`, `part-dead`, `part-hot`, `i2c-no-ack`, `reading-erratic`, `button-erratic`, `supply-collapses`, `mcu-resets`, `pin-level-wrong`, `pin-overloaded`, `serial-garbled`, `code-no-effect`. The pending ids for the ROB and DRN causes are named by B16 to B19; this task lists them with `modelled: false` only as cause rows.
- `confusableWith` seed pairs (EDUCATION 6.7): `floating-input` with `button-no-pulldown` and `open-connection`; `led-no-series-resistor` with `pin-overcurrent`; `output-contention` with `supply-shorted-to-ground`; `part-not-powered` with `missing-ground` and `brownout`; `swapped-pins` with `open-connection`; `wrong-pin-in-code` with `open-connection`. The relation is made symmetric by a function, not by hand.
- Validation: the registry build (this test) rejects an id that is neither in `CAUSE_IDS` nor `x-`-prefixed (SIM 13.4). Symptom ids match `^[a-z][a-z0-9-]*$` for core, and the schema pattern for `x-` ones.
- Permissions, performance, migration: none.

**Verification.**
- `causes.test.ts` (reads the example files with `node:fs`; header `// @vitest-environment node`): 45 rows; ids equal `CAUSE_IDS`; 18 rows have `modelled: true` (the 16 with a B10 detector, `bus-device-not-modelled` and `library-not-modelled`, the last two raised by T-B8-01 and T-B8-02) and the other 27 have `modelled: false`; `confusableWith` is symmetric and has no self-reference; every symptom referenced exists; the example-file sweep above; a planted unknown id fails.
- Acceptance. Given the example project and component files, When the sweep runs, Then no `symptom_ids` value contains a dot and every one is in `SYMPTOM_IDS` or starts with `x-`. Given the renamed files, When `src/project/examples.test.ts` runs with the updated constants, Then it passes. Given `causeMeta('floating-input')`, Then `confusableWith` includes `button-no-pulldown` and `open-connection`.
- Observability: test failure names the file and JSON path.
- Release blockers: a cause row missing, or an example file left with a dotted symptom.

**Delivery.**
- Done when the tests pass, `SCHEMA` still validates the example files (`npm run schema:check` validates them if T-B2-15 wired it) and the expected hashes in `src/project/examples.test.ts` match the edited files.
- Verify: `TL`; `npx vitest run src/sim/faults/causes.test.ts src/project/examples.test.ts`; `npm run schema:check`; `PORTABLE`.
- Documentation: the symptom list goes into `docs/FAULTS.md` (T-B10-31). Edit notes for the orchestrator, who owns the master plan files: a row RC-43b in `RECONCILIATION.md` records F5; the hash table in `PROJECT_DATA_MODEL.md` needs the new hashes; `PROJECT_DATA_MODEL.md` also quotes `led.dark`, `i2c.no-ack` or `regulator.hot` in prose (VERIFIED by grep) and needs the kebab ids. This task only reports these.
- Rollback: revert; the example files return to dotted ids and the old hash constants.
- Later tasks need: `CAUSES`, `causeMeta`, `SYMPTOM_IDS`, `isSymptomId`.

---

### T-B10-19 Sealed diagnose items: reader and redaction

**Identity.** T-B10-19; FAULTS / privacy; B10; must; depends on T-B2-07, T-B2-10; not started.

**Intent.**
- Problem: diagnose-first works only if the cause is hidden. The document is plain JSON, so hiding is an interface rule with three enforcement points (EDUCATION 6.5): the fault list, part inspector and history omit the answer; the AI context builder drops it; share and export mark the item sealed. Finding F10: the guided-plan schema does not exist yet.
- Target user: a person who opens a bug a buddy made, and the AI partner (B14) that must not see the answer.
- User story: As a buddy who received a sealed bug, I want the app not to show me the cause until I give up or solve it.
- Expected behaviour: one pure function removes every field that names the answer from a document view; one reads and validates `ext["x-iynk-guided"].diagnose`; the label says "hidden in the app, not encrypted".
- Success metric: a test serialises a redacted view of a sealed item and finds none of: the answer `cause_id`, the fault `id`, the fault `note`, the fault `target`, the `rule` id, and the explanation text.

**Implementation.**
- Existing files: none changed. Reads the document type from `src/project/generated/types.ts`.
- New files: `src/sim/faults/seal.ts`. Tests: `src/sim/faults/seal.test.ts`.
- Signatures:
```ts
export type ItemState = 'presented' | 'observing' | 'picking' | 'fixing' | 'verified' | 'revealed';
export interface DiagnoseSpec {                            // EDUCATION 6.4, unchanged
  kind: 'built-wrong' | 'injected';
  symptom: { id: SymptomId; text: string };
  answer: { cause_id: CauseId; fault?: string; rule?: string };
  options: { cause_id: CauseId; label: string }[];          // 4 to 6, exactly one equals answer.cause_id
  remedies?: { id: string; text: string; correct: boolean }[];
  explanation: string;
  readings?: { a: string; b: string; label: string }[];
  transfer?: { template: string; question: string; options: string[]; answer: number };
  review: { status: 'draft' | 'reviewed' | 'model-only'; by?: string; source: 'own-reasoning' | 'datasheet' | 'bench'; date?: string };
}
export function readDiagnoseSpec(doc: Project): Result<DiagnoseSpec | null, { code: 'bad-spec'; path: string }>;
export function isSealed(doc: Project, state: ItemState): boolean;       // spec present and state not verified or revealed
export function redactForUnrevealed(doc: Project, state: ItemState): Project;   // returns a copy
export function sealForSharing(doc: Project): Project;                           // marks ext["x-iynk-guided"].sealed = true
```
- Data model: reads `ext["x-iynk-guided"].diagnose` and `simulation.faults[]`. Redaction removes: `ext["x-iynk-guided"].diagnose.answer`, `.explanation`, `.remedies[].correct`, `.options[].cause_id` order hints are kept (labels stay); in `simulation.faults[]` the entries whose `id` equals `answer.fault` are replaced by `{id: '(hidden)'}`; `history.ops` entries that set those faults are dropped from the view; `note` of any fault in the view is dropped.
- Rules: `options` has 4 to 6 entries and exactly one equals `answer.cause_id` (lint L5); every `options[].cause_id` is a registry id or `x-`; `symptom.text` at most 300 characters.
- Edge cases: a document with no spec returns `ok(null)` and `isSealed` is false; `kind: 'built-wrong'` has no `answer.fault`; a spec in an unrevealed state shared as a file: `sealForSharing` keeps the answer in the file (it must, so the receiver can check), and marks it so the receiver's app applies the same redaction.
- Permissions: none. Performance: copy-on-write of the touched arrays only. Migration: none.

**Verification.**
- `seal.test.ts`: the leak test above on an injected item and on a built-wrong item; `redactForUnrevealed` is identity once the state is `verified` or `revealed`; spec with 3 options is rejected with `bad-spec` and a path; two options equal to the answer are rejected; the redaction does not mutate its input (deep-freeze the input in the test).
- Acceptance. Given a sealed item in state `observing`, When the fault list view is built from `redactForUnrevealed`, Then `JSON.stringify` of the view contains neither the answer cause id nor the fault id. Given state `revealed`, Then the view equals the input.
- Observability: `bad-spec` returns the JSON path.
- Release blockers: a leak in any field above. B14 reuses this function for the AI context (T-B14-08 imports it; AI-AC-03 depends on it).

**Delivery.**
- Done when tests pass and `PORTABLE` passes.
- Verify: `TL`; `npx vitest run src/sim/faults/seal.test.ts`; `npx tsc -p tsconfig.portable.json`.
- Documentation: `docs/FAULTS.md` section "Hidden cause".
- Rollback: revert. Nothing else uses it until T-B10-07.
- Later tasks need: `DiagnoseSpec`, `ItemState`, `readDiagnoseSpec`, `isSealed`, `redactForUnrevealed`, `sealForSharing`.

---

### T-B10-20 Local learning events

**Identity.** T-B10-20; FAULTS / events; B10; should; depends on T-B3-02, T-B0-08, T-B1-07; not started.

**Intent.**
- Problem: F-024 and R-122 want hints, picks, check changes and edits logged locally. `TELEMETRY_KINDS` (`src/lib/telemetry/kinds.ts:5-20`) has 14 kinds and none of these. That list belongs to the telemetry ingest and send path (sendBeacon, request body caps), so local-only learning events must not join it: they could be sent. The `events` store exists (T-B3-02) but no module appends to it. The log is an opt-in switch (finding F8).
- Target user: Amar, in the settings log viewer.
- User story: As a maker, I want to see my own record of hints and wrong picks, and clear it, without anything leaving my machine.
- Expected behaviour: `appendEvent` writes one row when the switch is on and does nothing when it is off; ring buffer of 5,000; list and clear; no project name, room code or buddy name on a row; `code.changed` carries no text.
- Success metric: with the switch off, 100 appends write 0 rows; with it on, 5,001 appends leave 5,000 rows and drop the oldest.

**Implementation.**
- Existing files: none changed. `src/lib/telemetry/kinds.ts` stays untouched (read-only: `TELEMETRY_KINDS` at lines 5-20, `MAX_DATA_BYTES` at line 47). `LearningKind`, the six kinds and the payload allow-list are defined in `src/local/events.ts` only. If the settings viewer (`LocalLog.tsx`, T-B1-07) needs the kinds, it imports `LEARNING_KINDS` from `events.ts`; this task does not edit the viewer.
- New files: `src/local/events.ts`. Tests: `src/local/events.test.ts`.
- Signatures:
```ts
export const LEARNING_KINDS = ['hint.open', 'diagnose.answer', 'reveal', 'diagnosis.record', 'check.transition', 'code.changed'] as const;
export type LearningKind = (typeof LEARNING_KINDS)[number];
export interface LearningEvent { id: string; at: string; kind: LearningKind; payload: Record<string, unknown> }
export interface EventLog {
  enabled(): Promise<boolean>;
  append(kind: LearningKind, payload: Record<string, unknown>): Promise<void>;   // no-op when disabled
  list(limit?: number): Promise<LearningEvent[]>;
  clear(): Promise<void>;
}
export function createEventLog(repo: Repository, clock: { isoNow(): string }, newId: () => string): EventLog;
export function appEventLog(): EventLog;          // the browser singleton over the app repository (T-B3-02); legacy panels and the Studio stores call this
```
- The clock and id source are injected into `createEventLog` so tests pass fixed ones; `appEventLog` uses the real ones. `src/local` may use IndexedDB, so this file is not portable code.
- Validation: `payload` serialised size at most 2,048 bytes (`events.ts` declares its own `MAX_PAYLOAD_BYTES = 2048`, equal to `MAX_DATA_BYTES` at `kinds.ts:47`, so the module imports nothing from the telemetry code); a larger payload is dropped and counted; payload keys checked against an allow-list per kind; a `code.changed` payload with any key but `projectId` is rejected.
- Edge cases: `Repository` write failure never throws to the caller (the learner's flow must not break); a failed append is counted in memory and shown by the viewer as "n events not saved".
- Permissions: local only. Performance: one IndexedDB put per append, under 5 ms (ESTIMATED). Migration: none (the store exists).

**Verification.**
- `events.test.ts` (memory repository of T-B3-02): none of the six kinds is in `TELEMETRY_KINDS` and `MAX_PAYLOAD_BYTES` equals `MAX_DATA_BYTES` (the test imports both from `@/lib/telemetry/kinds`; if `src/architecture.test.ts` forbids that edge for `src/local`, it reads `kinds.ts` as text with `node:fs` and a regular expression; after T-B0-17 renames the file, Step 0 finds the new name); switch off writes nothing; on writes; ring cap; clear; order newest first; allow-list rejects a payload with a free-text key; oversize dropped; repository throwing does not throw.
- Acceptance. Given the switch off, When I use hints and picks for ten minutes, Then the store holds 0 rows. Given it on, Then each hint adds a `hint.open` row and no row contains project text.
- Observability: `list()` is the viewer's source; the dropped count is returned by `stats()` (add to the interface if the viewer needs it; Step 0 checks `LocalLog.tsx`).
- Release blockers: any network call from this module (a test spies `fetch` and `sendBeacon`); any of the six kinds appearing in `TELEMETRY_KINDS`; any edit to `kinds.ts`.

**Delivery.**
- Done when tests pass; `git diff --stat` shows `src/lib/telemetry/kinds.ts` unchanged; `LocalLog.tsx` shows the new kinds without edits (if it does not, report; do not edit it here).
- Verify: `TL`; `npx vitest run src/local/events.test.ts src/lib/telemetry`; `git diff --exit-code -- src/lib/telemetry/kinds.ts`.
- Documentation: `docs/FAULTS.md` "What is logged".
- Rollback: revert; the viewer shows the old kinds only.
- Later tasks need: `EventLog`, `createEventLog`, `appEventLog`, `LEARNING_KINDS`.

---

### T-B10-21 `node-voltage` and `supply-current` checks

**Identity.** T-B10-21; SIM / checks (added here because no roadmap task builds it, finding F3); B10; must; depends on T-B8-05, T-B8-10; not started. May move to B8 if Amar prefers.

**Intent.**
- Problem: PDM 5.12 adds two check kinds. SA-23 check `c1` ("the 3.3 V rail is up") is a `node-voltage` check. `evaluateCheck` (`src/lib/interp/checks.ts:122`) has no case for either. The rule `solve:value-band@1` reads their outcomes.
- Target user: a project author, SA-23, the corpus.
- User story: As an author, I want a check that says the 3V3 rail must be between 3.2 and 3.4 V at 200 ms.
- Expected behaviour: both kinds evaluate against node samples in the run trace, in volts and amps, with the sample at or before `atMs`; a net with no sample gives a failed check with the detail "no reading" and never a pass.
- Success metric: for the example project, `c1` passes at 3.3 V and fails at 2.9 V.

**Implementation.**
- Existing files: `src/content/schema.ts:370-380` (add `{ kind: 'node-voltage'; net: string; volts: [number, number]; atMs: number; label: TextKey }` and `{ kind: 'supply-current'; net: string; amps: [number, number]; atMs: number; label: TextKey }` to `Check`), `src/content/schema.ts:356` (`RunTrace` gains `nodes?: Record<string, { tMs: number; v: number; i?: number }[]>`), `src/lib/interp/checks.ts:122-168` (two new cases). If the check types have moved by then (T-B12-01 comes later, so they have not), Step 0 re-greps `kind: 'pin-toggles'` to find them.
- New files: none. Tests: `src/lib/interp/checks.test.ts` (exists; add cases) and `src/lib/interp/checks-nodes.test.ts`.
- Signatures: unchanged `evaluateCheck(check, trace, ctx): CheckResult`; helper `sampleNodeAt(samples, tMs)` exported for the corpus test.
- Algorithm: take the last sample with `tMs <= atMs`; compare to the closed range; `detail` is the value with unit ("3.30 V").
- Validation: `volts` and `amps` are ordered pairs with `min <= max`; `atMs >= 0`. A project check naming a net id that is not in the document is a V3 warning from the validator, not a check failure.
- Edge cases: no `nodes` in the trace (a run before analog is live) gives a failed check with detail "no reading"; a range with `min == max` is allowed.
- Permissions, migration: none. Performance: linear scan; samples are sorted so use binary search.

**Verification.**
- Unit tests: pass at the range edge; fail 1 mV outside; no sample before `atMs`; no `nodes`; unit mixing guard (a `volts` check never reads `i`).
- Integration: the example project's `c1` through the orchestrator once T-B9-05 exists (this case runs in T-B10-13, not here).
- Acceptance. Given a trace with `net_3v3` at 3.3 V from 150 ms, When `c1` is evaluated at 200 ms, Then it passes with detail "3.30 V". Given 2.9 V, Then it fails.
- Observability: `detail` text.
- Release blockers: a pass with no reading.

**Delivery.**
- Done when the existing 10 kinds' tests still pass unchanged.
- Verify: `TL`; `npx vitest run src/lib/interp`.
- Documentation: PDM 5.12 already describes the kinds; nothing to edit.
- Rollback: revert; the two kinds disappear and `solve:value-band@1` loses its check path.
- Later tasks need: the two check kinds. `CheckOutcome` is declared in `src/sim/faults/types.ts` (section 4.1) and built from `CheckResult` in T-B10-04.

---

### T-B10-02 Failure models as data

**Identity.** T-B10-02; FAULTS / models; B10; must; depends on T-B10-01, T-B10-16 (symptom registry, used to validate `message.symptomId`), T-B8-03; not started.

**Intent.**
- Problem: the burn rules live as code in `figures/engine/bench-solve.js:317, 328, 341, 372, 379` and as constants in `bench-bb.js:116`. SIM 13.3 and ADR-0203 want each failure as a `FailureModel` record with a trigger, a derivation, reference data and the range the evidence covers, so the label can say "Not checked against a reference".
- Target user: the solved detectors (T-B10-04) and anyone reading "What it models".
- User story: As a maker who sees "LED burnt", I want to read the rule that decided it and see that it was hand-fitted, not measured.
- Expected behaviour: seven records load, validate and register; a restricted expression language evaluates the `trigger` text over solved quantities with no `eval`.
- Success metric: 7 of 7 records pass validation; the evaluator reproduces the five legacy burn decisions on the legacy test vectors (see Verification).

**Implementation.**
- Existing files read: `figures/engine/bench-solve.js:317` (LED: `ip > el.imax * 2.5`), `:328` (diode: `i > el.imax || ip > el.isurge`), `:341` (NPN: `tj > (+e.tjmax || 150) || icp > (+e.icmax || 1) * 1.5`), `:371-372` (TMP36: `vs < -.5` accumulates `m.revT` at line 371, then `vs > (+e.vabs || 7) || m.revT > 3` at line 372), `:379` (potentiometer track: `m.hotT > 2` s), `bench-bb.js:116` (USB source `ilim`, sag 0.6 s), `bench.js:269` (rail multiplied by 0.42). Edit `src/sim/registry/entries.ts` (T-B8-03) to register the records, or add the folder to its data loader if it reads `data/*.json` by glob (Step 0 decides; the edit is at most one import line).
- New files: `src/sim/faults/models.ts`, `src/sim/faults/expr.ts`, `src/sim/faults/data/failure-models.json` (one data set). Tests: `models.test.ts`, `expr.test.ts`.
- Records (all `threshold: {kind:'fixed'}`, `referenceData: []`, so each label reads "Not checked against a reference"):

| id | causeId | trigger | window | outcome | basis |
|---|---|---|---|---|---|
| `failure:led-overcurrent@1` | `led-no-series-resistor` | `peak(i) > 2.5 * rating.imaxAmps` | none | `open`, latch | `bench-solve.js:317` |
| `failure:diode-overcurrent@1` | `x-diode.overcurrent` | `avg(i) > rating.imaxAmps \|\| peak(i) > rating.isurgeAmps` | none | `open`, latch | `:328` |
| `failure:npn-overheat@1` | `x-npn.overheat` | `tj > default(rating.tjmaxC, 150) \|\| peak(ic) > 1.5 * default(rating.icmaxAmps, 1)` | none | `open`, latch | `:341` |
| `failure:tmp36-reverse@1` | `reverse-polarity` | `vs < -0.5` | 3 s | `open`, latch | `:371-372` |
| `failure:tmp36-overvoltage@1` | `x-supply-overvoltage` | `vs > default(rating.vabsVolts, 7)` | none | `open`, latch | `:372` |
| `failure:track-overpower@1` | `x-pot.track-overpower` | `peak(p) > rating.pmaxWatts` | 2 s | `open`, latch | `:379` |
| `failure:usb-sag@1` | `brownout` | `load > source.ilimAmps` | 0.6 s | `derated`, `params {railFactor: 0.42}`, no latch | `bench-bb.js:116`, `bench.js:269` |

  Each record also holds `derivation.text` ("datasheet-informed, hand-fitted", SIM 13.3), `assumptions`, `evidenceRange: []`, `message {symptomId, i18nKey}`. `appliesTo` names descriptor ids or families (`family:led`). The three `x-` cause ids are PROPOSAL (they are not in the 45; EDUCATION 6.6 allows `x-` until accepted).
- Signatures:
```ts
export interface FailureModel { /* SIM 13.3 exactly */ }
export function loadFailureModels(): FailureModel[];
export function validateFailureModel(m: unknown): Result<FailureModel, { code: 'bad-model'; path: string }>;
export function modelsFor(causeId: CauseId): FailureModel[];
export function labelKey(m: FailureModel): 'faults.fidelity.notChecked' | 'faults.fidelity.checked';
// expr.ts
export function parseTrigger(src: string): Result<Expr, { code: 'bad-expr'; at: number }>;
export function evalTrigger(e: Expr, q: Quantities): boolean | undefined;   // undefined when a name is missing
export interface Quantities { value(name: string): number | undefined; peak(name: string): number | undefined; avg(name: string): number | undefined }
```
- Expression language: numbers, dotted names, `peak(n)`, `avg(n)`, `default(name, number)`, `+ - * /`, `< <= > >= ==`, `&&` and `||`, and parentheses. No other function call. Maximum 200 characters and depth 8. `default` returns the number when the named quantity is missing.
- Validation: `id` matches `^[a-z0-9:.-]+@[0-9]+$` (rule 6 of 16.3); `causeId` in the registry or `x-`; `message.symptomId` is a symptom id; empty `referenceData` forces `labelKey` to `notChecked`; `trigger` parses.
- Errors: `bad-model` with a JSON path; `bad-expr` with a character offset.
- Edge cases: a missing quantity makes `evalTrigger` return `undefined`, and the detector treats that as "cannot tell" and reports nothing (rule 6 of section 3.2).
- Permissions, migration: none. Performance: parse once, evaluate per tick; under 5 microseconds per record per tick (ESTIMATED).

**Verification.**
- `expr.test.ts`: precedence; `default`; division by zero gives `undefined`; 201-character input rejected; no `eval`, `Function` or `new Function` (a grep test over the two source files); depth 9 rejected.
- `models.test.ts`: 7 records valid; every id ends `@1`; every `causeId` and `symptomId` resolves; `labelKey` is `notChecked` for all 7; legacy vectors: LED at 51 mA with imax 20 mA burns, at 49 mA does not; diode i 1.1 imax burns; NPN tj 151 burns; TMP36 at -1 V for 3.1 s burns, 2.9 s not; pot 2.1 s above pmax burns, 1.9 s not.
- Acceptance. Given the LED record and a peak current of 117.65 mA with rating 20 mA, When the trigger is evaluated, Then it is true. Given 40 mA, Then false. (RS-08 solver value 117.65 mA is a computed input here, not a stored constant.)
- Observability: `validateFailureModel` errors carry the path.
- Release blockers: a record without a `derivation`, or a label that says "checked" with no reference data.

**Delivery.**
- Done when tests pass and the registry test of T-B8-03 (asserted tier never above computed tier) still passes with the new entries.
- Verify: `TL`; `npx vitest run src/sim/faults src/sim/registry`; `PORTABLE`.
- Documentation: `docs/FAULTS.md` table of the seven records.
- Rollback: revert; the registry loses 7 entries.
- Later tasks need: `loadFailureModels`, `modelsFor`, `evalTrigger`.

---

### T-B10-03 Rule runner, `NetView` and topology rules

**Identity.** T-B10-03; FAULTS / detectors; B10; must; depends on T-B10-01, T-B10-16, T-B2-11, T-B2-13; not started.

**Intent.**
- Problem: F-028 and F-029 want plain-language checks on any netlist. Nothing reads a netlist for mistakes today. The six rules in this task need no part values, only topology, pin types and classes.
- Target user: a maker who just wired a circuit.
- User story: As a maker, I want to be told "pin 7 of the display is not connected" before I run.
- Expected behaviour: `runRules` runs a list of rules over one `NetView`, isolates a failing rule, counts skipped checks, and returns `Finding`s with targets for highlighting.
- Success metric: the six rules below find their cases on hand-made netlists and report nothing on a 10-circuit clean set built in the test.

**Implementation.**
- Existing files: none. Reads the netlist type (`SimNetlist`, SIM 5.2, T-B2-13) and the descriptor type (T-B2-11; its type name is UNKNOWN until built, Step 0).
- New files: `src/sim/faults/netlist-view.ts`, `src/sim/faults/rules.ts`, `src/sim/faults/static.ts`. There is no barrel file (section 4.1). Tests: `netlist-view.test.ts`, `rules.test.ts`, `static.test.ts`.
- Signatures:
```ts
// PinInfo and NetView are declared in src/sim/faults/types.ts (contract 4.1, T-B10-01). This task implements them.
export function buildNetView(net: SimNetlist, describe: (descriptorId: string) => ComponentDescriptor | undefined): NetView;
export function runRules(rules: readonly Rule[], input: Omit<RuleInput, 'skipped'>): { findings: Finding[]; skipped: Record<string, Record<string, number>>; errors: { ruleId: string; message: string }[] };
export function defaultRules(): Rule[];                     // static.ts rules only; T-B10-11 assembles the full list
// static.ts
export const STATIC_RULES: readonly Rule[];                 // the six rules below
```
- The six rules (table 4.3): `rule:open-pin@1`, `rule:missing-ground@1`, `rule:rail-short@1`, `rule:contention@1`, `rule:floating-input@1`, `rule:button-no-pull@1`. The last three use `CodeFacts` when present and are skipped without them (the type is declared in `types.ts`; T-B10-05 produces it).
- Algorithm. `buildNetView` makes one pass: map `nets[].connections[]` to `PinInfo`, merge nets joined by an `internal-short` group (a `group` of kind `internal-short` in the descriptor), classify a net as `ground` if it is the ground net or holds a `ground`-class pin of a `power_out` part, `power` if it holds a `power_out` pin or the supply pin of a source part, else `signal` if it holds only digital or analog pins, else `unknown`. `runRules` iterates rules sorted by id, wraps each in try/catch (contract 4.7), and sorts findings by (severity, ruleId, first target id) so output is deterministic.
- Finding evidence for static rules: `{kind:'state', ref:'net:<id>' or 'pin:<part>.<pin>', at:0, value:<short text>, provenance:'computed', tier:'T0', modelIds:[]}`.
- State transitions: none. Validation: a rule id not matching `^(rule|code|solve):[a-z0-9-]+@[0-9]+$` is rejected when registering.
- Error conditions: descriptor missing means the part is "undescribed"; every rule skips undescribed parts and records `skipped[ruleId]['undescribed-part']++`.
- Edge cases: a net with one pin only is a dangling stub; a part with all pins unconnected is "not placed in a circuit" and is skipped (it belongs to the unplaced-parts tray of ADR-0804); two boards (two `brd_` parts) are handled per board.
- Permissions: none. Performance: linear in pins; target p95 under 10 ms for 500 parts and 1,000 wires (ESTIMATED; measured in T-B10-24). Migration: none.

**Verification.**
- `netlist-view.test.ts`: classes; `wireOnly` through an `internal-short` group; nominal volts from a 5 V source; undescribed part yields `descriptor() === undefined`.
- `static.test.ts`: per rule, one positive netlist and one negative; `open-pin` ignores board pins and unplaced parts; `missing-ground` fires only when a power pin is connected; `rail-short` fires on a wire between 5V and GND and not on a 0 ohm jumper part marked `jumper` that joins two grounds; `contention` needs two driver pins and ignores open-drain; `floating-input` is quiet with `INPUT_PULLUP`; `button-no-pull` is quiet when a resistor reaches the other rail.
- `rules.test.ts`: a throwing rule yields an `errors` entry and the others still run; output order is stable under rule-list permutation; skip counts are summed.
- Fixtures: netlists built inline with a helper in the test.
- Acceptance. Given a netlist where an I2C display `VCC` pin has no net, When `runRules(defaultRules(), ...)` runs, Then one finding with `causeId: 'open-connection'`, `symptomId: 'part-dead'` and a `pin` target `{kind:'pin', id: <part>, pin:'VCC'}`. Given a 10-circuit clean set, Then 0 findings.
- Observability: `skipped` and `errors` are returned and printed by the corpus gate.
- Release blockers: a false alarm on the inline clean set.

**Delivery.**
- Done when tests pass and `PORTABLE` passes.
- Verify: `TL`; `npx vitest run src/sim/faults/netlist-view.test.ts src/sim/faults/static.test.ts src/sim/faults/rules.test.ts`; `PORTABLE`.
- Documentation: `docs/FAULTS.md` rule table (copy of 4.3 with final ids).
- Rollback: revert; later detector tasks have not started in group 2.
- Later tasks need: `buildNetView`, `runRules`, `STATIC_RULES`, and the skip log (`NetView`, `Rule` and the finding shape come from `types.ts`).

---

### T-B10-06 Corpus: `clean/`, `broken/` spec and generator

**Identity.** T-B10-06; FAULTS / corpus; B10; must; depends on T-B10-00 (PASS), T-B10-16, T-B2-09, T-B2-12, T-B2-14; not started.

**Intent.**
- Problem: the gate (F-029) needs a directory that does not exist (`tests/fixtures/` is absent, VERIFIED). EDUCATION 6.6 defines it. The roadmap calls the 20 broken files "hand-written"; 20 large project files are error-prone by hand, so the hand-written part is the operation batch and a script writes the files.
- Target user: the gate (T-B10-18) and Amar, who adds real broken circuits later (section 9, item 2).
- User story: As Amar, I want to add a broken circuit by writing one line of spec, not by editing a project file.
- Expected behaviour: one script builds `clean/` from converter output, builds `broken/` from `broken.spec.json`, writes `MANIFEST.json`; a check mode fails if the committed files differ from a fresh build.
- Success metric: `node scripts/fault-corpus.mjs --check` exits 0; `cleanCount` equals the file count; 20 broken files each differ from their base by `stateHash`.

**Implementation.**
- Existing files read: converter (T-B2-14), `apply` (T-B2-05 to T-B2-07), `stateHash` (T-B2-09), validators (T-B2-08).
- New files: `scripts/fault-corpus.mjs`, `tests/fixtures/fault-corpus/README.md`, `MANIFEST.json`, `broken.spec.json`, `clean/*.project.json`, `broken/*.project.json` (the two folders are one data set). Test: `src/sim/faults/corpus-build.test.ts` (header `// @vitest-environment node`).
- `scripts/fault-corpus.mjs`: `node scripts/fault-corpus.mjs` writes; `--check` builds in memory and diffs (canonical JSON, T-B2-03), exit 1 on any difference, prints the differing path. Node 24 imports the TypeScript modules directly (DOCUMENTED, ADR-0400 and SYSTEM 5.4: relative `.ts` imports run on Node 24.8); Step 0 confirms the converter can be called from Node, else the script goes through `npx tsx` only if `tsx` is already a dev dependency, never by adding one.
- Spec entry: `{ slot, base, ops, expectedCauseId, expectedRule, note }`; `ops` are `Operation`s (`net.disconnect`, `net.connect`, `net.merge`, `component.set`, `component.remove`, `source.edit`, `component.set` on a supply part). Draft ops per slot (T-B10-00 finalises bases):

| Slot | Operation, in words |
|---|---|
| 1 | remove the series resistor so the LED joins the pin directly |
| 2 | exchange the nets of the LED's anode and cathode |
| 3 | join a second output pin's net to the first output pin's net (both `OUTPUT` in the code) |
| 4 | merge the 5V net with the GND net by a wire |
| 5 | cut the wire that joins a sensor or button to an input pin so the pin's net is a stub; the code reads it with `INPUT` |
| 6 | connect a module's `VCC` to the 3V3 pin where the part needs 5 V |
| 7 | remove the pull-down resistor in a button circuit that uses `INPUT` |
| 8 | disconnect the `VCC` pin of the I2C display |
| 9 | exchange the nets of SDA and SCL at the board |
| 10 | `source.edit`: change the pin constant to the pin next to the LED's |
| 11 | remove the SDA and SCL pull-ups |
| 12 | replace the series resistor by a value that drives more than the board pin limit |
| 13 | set the supply to a value below the board minimum |
| 14 | exchange the module's supply and ground nets |
| 15 | change the series resistor to 100 kOhm |
| 16 | disconnect a module's `GND` |
| 17 | disconnect a sensor's signal leg |
| 18 | exchange SDA and SCL on the device side |
| 19 | change the I2C pull-up to 100 times its value |
| 20 | disconnect `GND` on a sensor only |

- Clean selection: converter output whose board is Uno R3 or Uno R4, for lessons, their reference solutions and tour steps that have a netlist. Each `MANIFEST.clean[]` row records `described: boolean` (every part has a descriptor). The gate counts all clean files; the rules skip undescribed parts, and the report prints how many files were fully described.
- Validation (in the test): every file passes the five validation passes; the netlist builds; `cleanCount` equals the folder; every broken `base` is a clean file; every broken file differs from its base by `stateHash`; `expectedCauseId` is in the registry; `expectedRule` matches the id pattern; slots 1 to 20 each appear once.
- Edge cases: an op that the validators reject (a V3 error) fails the build and names the slot; a broken file that still validates is the point, a broken file that does not validate is a defect in the spec.
- Permissions: the script reads and writes under `tests/fixtures/fault-corpus/` only. Performance: under 60 s (ESTIMATED; 140 projects). Migration: none.
- Size: 140 projects at about 20 KB would be 2.8 MB; `clean/` holds only the Uno subset (ESTIMATED under 1 MB). If it exceeds 5 MB the script stores a gzip of each file and says so in the README (decide at Step 0).

**Verification.**
- `corpus-build.test.ts` as above plus: `--check` run in-process passes; planting a changed byte in a copy fails with the path.
- Acceptance. Given the spec and the converter output, When `node scripts/fault-corpus.mjs` then `node scripts/fault-corpus.mjs --check` run, Then the second exits 0 and the manifest lists 20 broken entries with distinct slots. Given a hand-edited broken file, Then `--check` exits 1.
- Observability: the script prints `clean=<n> described=<k> broken=20`.
- Release blockers: fewer than 18 realisable slots at the time T-B10-00 reports (stop, ask Amar).

**Delivery.**
- Done when tests pass and the corpus is committed.
- Verify: `TL`; `node scripts/fault-corpus.mjs --check`; `npx vitest run src/sim/faults/corpus-build.test.ts`.
- Documentation: the README (how to add a broken circuit; "a rule that alarms on `clean/` is switched off until fixed").
- Rollback: revert; delete the folder.
- Later tasks need: the directory, `MANIFEST.json` shape (contract 4.4).

---

### T-B10-07 Diagnosis session: states, evidence, options

**Identity.** T-B10-07; FAULTS / diagnose flow; B10; must; depends on T-B10-01, T-B10-16, T-B10-19, T-B10-20; not started.

**Intent.**
- Problem: R-120 and EDUCATION 6.3 define the diagnose-first states and rules. No code holds them, so each panel would invent its own.
- Target user: the Diagnose panel (T-B10-23) and the SA-23 walkthrough.
- User story: As a learner, I want a wrong pick to teach me something and never end the exercise.
- Expected behaviour: a pure reducer implements Presented, Observing, Picking, Fixing, Verified, Revealed with the rules of 6.3; it emits effects (events, a record) for the caller to carry out; it builds the option list and the final `Diagnosis`.
- Success metric: the reducer's property test over 1,000 random action sequences never produces an illegal state and never emits a `diagnose.answer` with `correct: true` before a correct pick.

**Implementation.**
- Existing files: none.
- New files: `src/sim/faults/diagnose.ts`, `src/sim/faults/evidence.ts`. Tests: `diagnose.test.ts`, `evidence.test.ts`.
- Signatures:
```ts
export interface PickRecord { cause: CauseId; correct: boolean; atMs: number; confidence?: 'guess' | 'think' | 'sure' }
export interface DiagnoseSession {
  state: ItemState; spec: DiagnoseSpec; projectId: string;
  picks: PickRecord[]; hintLevel: 0 | 1 | 2 | 3; notes: Evidence[]; causeVisible: boolean; runs: number;
}
export type DiagnoseAction =
  | { t: 'run' } | { t: 'note'; evidence: Evidence } | { t: 'diagnose' }
  | { t: 'pick'; cause: CauseId; atMs: number; confidence?: PickRecord['confidence'] }
  | { t: 'hint'; level: 1 | 2 | 3 } | { t: 'giveUp' } | { t: 'showCause' }
  | { t: 'cleared'; symptomCleared: boolean } | { t: 'applyFixAfterReveal' };
export type Effect =
  | { t: 'event'; kind: 'hint.open' | 'diagnose.answer' | 'reveal'; payload: Record<string, unknown> }     // a subset of LearningKind (T-B10-20, `src/local`); declared as literals so `sim/faults` imports nothing from `local`
  | { t: 'unlockEdits' } | { t: 'lockEdits' } | { t: 'revealCause' }
  | { t: 'record'; diagnosis: Diagnosis; outcome: Outcome; noEvidence: boolean };
export type Outcome = 'clean' | 'assisted' | 'helped' | 'revealed';
export function startSession(spec: DiagnoseSpec, projectId: string): DiagnoseSession;
export function reduce(s: DiagnoseSession, a: DiagnoseAction): { session: DiagnoseSession; effects: Effect[] };
export function toDiagnosis(s: DiagnoseSession): Diagnosis | undefined;      // after verified or revealed
export function outcomeOf(s: DiagnoseSession): Outcome;
export function buildOptions(spec: DiagnoseSpec, seed: number): DiagnoseSpec['options'];   // stable shuffle
// evidence.ts
export interface ReadingLike { at: SimTime; quantity: 'voltage' | 'current' | 'resistance'; a: string; b?: string; value: number; unit: string; provenance: Evidence['provenance']; tier: Evidence['tier']; modelIds: string[] }
export function evidenceFromReading(r: ReadingLike): Evidence;
export function evidenceFromSerial(line: { at: SimTime; text: string }, tier: Evidence['tier']): Evidence;
export function evidenceFromPin(p: { at: SimTime; ref: string; level: 0 | 1; tier: Evidence['tier'] }): Evidence;
export function evidenceFromFinding(f: Finding): Evidence[];
```
- Transition table (EDUCATION 6.3):

| From | Action | To | Effects |
|---|---|---|---|
| presented | `run` | observing | none |
| observing | `run`, `note` | observing | `note` appends to `notes` (cap 64, oldest kept) |
| observing | `diagnose` | picking | none |
| picking | `pick` wrong | observing | event `diagnose.answer {cause_id, correct:false}` |
| picking | `pick` right | fixing | event `diagnose.answer {correct:true}`; `unlockEdits` for built-wrong items; remedy choice for injected |
| observing, picking | `giveUp` or `showCause` | revealed | event `reveal`; `revealCause`; `unlockEdits` |
| fixing | `cleared` true | verified | `record` with outcome |
| revealed | `applyFixAfterReveal` | verified | `record` with outcome `revealed` |
| any | `hint` level n | same | event `hint.open {level, via:'ladder'}`; accepted only when `n === hintLevel + 1`; a lower level is a no-op; a higher one is rejected |

- `outcomeOf`: `revealed` if the state path included revealed; else `helped` if `hintLevel === 3` or picks >= 3; else `clean` if the first pick was right and `hintLevel === 0`; else `assisted`. An empty `notes` list sets `noEvidence: true` on the record effect.
- `buildOptions` keeps the spec's options, shuffles by a seeded stable sort (seed = hash of project id), and never reorders so that the right answer is first more often than chance in the test.
- Validation: `pick` of a cause not in `options` is rejected with no state change. `showCause` always works, as R-120 requires.
- Edge cases: a pick after `verified` is ignored; `giveUp` after `verified` is ignored; evidence `at` values are integers.
- Permissions: none. Performance: pure. Migration: none.

**Verification.**
- `diagnose.test.ts`: every row of the table; the order rule for hints; wrong pick keeps the item open and logs once; revealed items never count clean; outcomes for the four classes; property test of 1,000 random sequences with a fixed seed; `toDiagnosis` gives `hint_level` equal to the highest opened level and `cause_id`, `symptom_id` from the spec.
- `evidence.test.ts`: provenance and tier are copied unchanged; an unmodelled reading (`provenance: 'mocked'`) stays `mocked`; `evidenceFromFinding` keeps `ref` and `at`.
- Acceptance. Given a session on the SA-23 faulted item, When the learner picks `i2c-missing-pullup` then `swapped-pins`, Then the first pick logs `correct:false` and the state is observing; the second logs `correct:true`, the state is fixing, and after `cleared` the record is `{cause_id:'swapped-pins', symptom_id:'i2c-no-ack', hint_level:0}` with outcome `assisted` (two picks).
- Observability: effects are data; the panel logs them through T-B10-20.
- Release blockers: a wrong pick appended to `evidence` (EDUCATION Objection 1b).

**Delivery.**
- Done when tests pass and `PORTABLE` passes.
- Verify: `TL`; `npx vitest run src/sim/faults/diagnose.test.ts src/sim/faults/evidence.test.ts`; `PORTABLE`.
- Documentation: `docs/FAULTS.md` state diagram.
- Rollback: revert.
- Later tasks need: `DiagnoseSession`, `reduce`, `Effect`, `toDiagnosis`, `outcomeOf`, `buildOptions`, evidence builders.

---

### T-B10-12 `faults` namespace and fidelity labels

**Identity.** T-B10-12; FAULTS / copy; B10; must; depends on T-B10-16; not started.

**Intent.**
- Problem: R-121 and the D-007 fidelity rule need text for causes, symptoms, hints and the honest label. K-I18N needs six languages in one commit. Several UI tasks run in the same group and cannot all edit one JSON file, so this task owns the whole namespace first (contract 4.6).
- Target user: every user of the fault panels.
- User story: As a maker who reads Hindi or German, I want the same plain words as the English ones.
- Expected behaviour: the namespace `faults` exists in six languages with the keys of 4.6; `fidelity.notChecked` is the default claim label; no banned word appears.
- Success metric: `messages.test.ts` passes for the new namespace; a banned-word grep finds 0 hits.

**Implementation.**
- Existing files: `src/i18n/namespaces.ts`: two edits. Add `"faults"` to the `NAMESPACES` array (line 4) and add `faults: typeof import("./messages/en/faults.json");` to the `Messages` map (lines 8-20). The second edit is required: with only the first, `Messages[N]` has no entry for `faults` and `npm run typecheck` fails (VERIFIED: the map has one entry per namespace). `src/i18n/messages.test.ts` runs automatically for each namespace in `NAMESPACES` (`messages.test.ts:21`).
- New files: `src/i18n/messages/{en,es,fr,de,zh,hi}/faults.json` (one set). The JSON has no top-level `faults` wrapper: the first keys are `breakIt`, `diagnose`, `hint`, `record`, `fidelity`, `check`, `scan`, `evidence`, `provenance`, `cause`, `symptom`, `hintTemplate` (contract 4.6). Test: `src/i18n/faults-keys.test.ts`.
- Content: every key of 4.6. Cause texts exist for these 20 ids: the 16 that have a B10 detector (`led-no-series-resistor`, `led-reversed`, `output-contention`, `supply-shorted-to-ground`, `floating-input`, `part-not-powered`, `button-no-pulldown`, `open-connection`, `swapped-pins`, `wrong-value`, `missing-ground`, `wrong-pin-in-code`, `i2c-missing-pullup`, `pin-overcurrent`, `brownout`, `reverse-polarity`), `bus-device-not-modelled`, `library-not-modelled`, `x-code.serial-baud-mismatch`, `x-code.pin-mode-wrong`. Each has `title`, `why`, `fix`. Level 3 hint templates name the cause category and the part, never the fix (R-121). Placeholders: `{part}`, `{pin}`, `{net}`, `{value}`, `{unit}`, `{expected}`.
- `faults-keys.test.ts`: (1) every key in 4.6 exists in `en/faults.json` as a dotted path from the file root (`breakIt.title`); (2) the test scans `src/components/studio/{BreakIt,DiagnosePanel,HintLadder,DiagnosisRecord,FaultDock,TransferQuestion}.tsx` and `src/components/studio/instruments/I2cScan.tsx` for `t("…")`, `t('…')` literals with the pattern of contract 4.6 (bare keys such as `breakIt.title`; a literal that starts with `faults.` is also a failure, because the file has no such wrapper) and fails on a key that is not a path in `en/faults.json` (files that do not exist yet are skipped; the test is re-run at each UI task); (3) no value contains `validated`, `certified`, an em dash, or the phrase "guaranteed"; (4) level-3 templates contain none of the words "replace", "reconnect", "swap back", "fix" in `en` (a heuristic for "never names the fix", HYPOTHESIS about false positives).
- Edge cases: Hindi and Chinese strings have different word order, so placeholders are named, never positional (the existing parity test checks placeholders).
- Translation quality: the five non-English files are written by the agent and are machine-quality (HYPOTHESIS). The README line in `docs/FAULTS.md` says so, and section 9 item 6 asks Amar or a buddy to read them.
- Permissions: none. Performance: the namespace is not lazy. `getDictionary` (`src/i18n/server.ts:30-33`) imports every namespace for a locale, and a namespace reaches the client only when a page passes it as a prop (`server.ts:10-11`). T-B10-32 passes `messages.faults` to the fault dock and nothing wider. Migration: none.

**Verification.**
- Unit: `npx vitest run src/i18n` (parity, placeholders, the new key test).
- Acceptance. Given `NAMESPACES`, When `messages.test.ts` runs, Then the `faults` namespace has a file in all six languages with equal keys and equal placeholders, and `npm run typecheck` accepts `Messages["faults"]`. Given the key `fidelity.notChecked`, Then the English text is exactly the sentence of 4.6.
- Observability: the test names the missing key and file.
- Release blockers: any banned word; any language missing a key.

**Delivery.**
- Done when `npx vitest run src/i18n` passes.
- Verify: `TL` (this proves the `Messages` edit); `npx vitest run src/i18n`.
- Documentation: none (keys are the documentation).
- Rollback: revert; UI tasks in groups 3 to 6 would lose their keys, so revert them first.
- Later tasks need: the `faults` keys, `fidelity.*`.

---

### T-B10-15 Apply fault ops to a netlist and to code

**Identity.** T-B10-15; FAULTS / simulation; B10; must; depends on T-B10-01; not started.

**Intent.**
- Problem: `faultToOps` yields operations; nothing applies them. Structural faults must change the netlist the solver and the rules see; code faults must change the source the interpreter runs; neither may touch the stored document (SIM 13.2, "Where these live").
- Target user: the solver, the detectors, the bench-check sheet, and Restore.
- User story: As a maker who presses Break it, I want the run to behave as if the wire were cut, and Restore to bring back exactly my document.
- Expected behaviour: given a base netlist, base sources and the enabled faults, a pure function returns the effective netlist and sources plus the engine-level fault states; the inputs are never mutated.
- Success metric: for every structural op kind, the effective netlist differs from the base only in the nets or parts named; the base object is deep-equal after the call.

**Implementation.**
- Existing files: none changed. Reads `SimNetlist`/`SimPart` (SIM 5.2: `SimPart.faults?: FaultState[]`).
- New files: `src/sim/faults/apply.ts`, `src/sim/faults/code-pin.ts`. Tests: `apply.test.ts`, `code-pin.test.ts`.
- Signatures:
```ts
export interface BaseSetup { net: SimNetlist; sources: Record<string, string> }
export interface EffectiveSetup { net: SimNetlist; sources: Record<string, string>; states: FaultState[] }
export function applyFaults(base: BaseSetup, faults: readonly Fault[], ctx: FaultCtx, at: SimTime): Result<EffectiveSetup, FaultError>;
export function applyStructural(net: SimNetlist, ops: readonly FaultOp[], ids: { resistor: string; resistanceParam: string }): Result<SimNetlist, FaultError>;
export function applyCodePin(source: string, op: Extract<FaultOp, { kind: 'code-pin' }>): Result<string, FaultError>;
export const ENGINE_KINDS: ReadonlySet<FaultOp['kind']>;   // stuck, cold-joint, degrade, param, mount, sensor, swap-phase
```
- Semantics:

| Op | Effect |
|---|---|
| `open` | the pin's net becomes `null` |
| `swap` | the two pins exchange nets |
| `short` | a new part `fault_short_<n>` is added: the resistor descriptor, `params[resistanceParam] = ohms`, pins on the two nets; either net `null` gives `unknown-target` |
| `polarity` | the nets of the anode/positive pin and the cathode/negative pin exchange; for a part without polarity data, the nets of its `power_in` and `ground` pins |
| `value` | `params[param] *= factor` on a copy |
| `code-pin` | the source text of `file` has the integer `from` replaced by `to` on `line` (1-based); the line count does not change, so `#line` markers and breakpoints keep their meaning |
| other kinds | recorded as `FaultState` on `SimPart.faults` (or on the scene for `mount`, `sensor`); the engines read them at P0 |

  `ids.resistor` and `ids.resistanceParam` come from the resistor descriptor (T-B2-12; Step 0 reads the real names).
- Ordering: faults apply in document order; ops inside one fault in the order `faultToOps` returned. Disabled faults are filtered by `applyFaults`.
- Validation and errors: `code-pin` with a missing file gives `unknown-target`; a line with no whole-token `from` gives `no-such-line`; `value` on a missing param gives `bad-param`.
- Edge cases: two faults on one pin: the later one sees the earlier one's result; `open` then `swap` on the same pin is applied in order; `short` between a net and itself is a no-op with a `note`.
- Permissions: none. Performance: copy-on-write of touched parts only; under 1 ms at 500 parts (ESTIMATED). Migration: none.
- State: this is where R-125's "Restore returns the exact document" is secured: the document is never edited by `applyFaults`, so a hash taken before and after is equal. The undoable operation that stores a fault is T-B10-09.

**Verification.**
- `apply.test.ts`: one case per structural op; inputs deep-frozen; swap twice equals identity; `short` adds exactly one part; order of faults matters and is tested; the env-monitor `flt_swap` swaps the nets of GPIO21 and GPIO22.
- `code-pin.test.ts`: replaces `13` in `digitalWrite(13, HIGH)` but not in `113`; line count unchanged; `from` absent gives `no-such-line`; a line inside a string literal is replaced only if the token is outside quotes (the test pins the behaviour: inside quotes is left alone).
- Acceptance. Given the env-monitor base and `flt_swap` enabled, When `applyFaults` runs, Then `net.parts[brd_esp].pins.GPIO21` is the net that held GPIO22 before and the reverse, and the base is unchanged. Given the `wrong-pin-in-code` candidate on `digitalWrite(13, ...)`, Then the effective source has the new pin and the same number of lines.
- Observability: `states[]` lists `{id, op, appliedAt, causeId}`.
- Release blockers: any mutation of the input.

**Delivery.**
- Done when tests pass; `PORTABLE` passes.
- Verify: `TL`; `npx vitest run src/sim/faults/apply.test.ts src/sim/faults/code-pin.test.ts`; `PORTABLE`.
- Documentation: `docs/FAULTS.md` "Where a fault lives".
- Rollback: revert.
- Later tasks need: `applyFaults`, `EffectiveSetup`, `ENGINE_KINDS`.

---

### T-B10-22 Fault generator and seeded pick

**Identity.** T-B10-22; FAULTS / generators; B10; must; depends on T-B10-01, T-B10-03 (the test builds a `NetView` with `buildNetView`), T-B10-16 (`causeMeta`); group G3; not started.

**Intent.**
- Problem: R-124 wants faults generated from the netlist and the part descriptors, not authored per circuit. R-118 wants Break it on a project. R-125 wants a seeded "Surprise me" whose draw is deterministic.
- Target user: a maker who wants to practise on a circuit they drew.
- User story: As a maker, I want a list of ways my circuit could break, in words, and a button that picks one for me.
- Expected behaviour: `listCandidates` returns every fault the generators can make on this project, each with a cause id, symptom ids and a target label; `pickSurprise` chooses one by seed; `breakOps` and `restoreOps` return the operations.
- Success metric: on the env-monitor example, at least 5 distinct candidate families exist (open wire, swapped pins, wrong value, missing ground, wrong pin in code); the same seed picks the same candidate in 1,000 repeats.

**Implementation.**
- Existing files: none changed. The signature takes `NetView` from `types.ts` (T-B10-01); the test builds the view with `buildNetView` (T-B10-03) and reads `causeMeta` (T-B10-16), which is why this task sits in G3.
- New files: `src/sim/faults/generate.ts`. Tests: `generate.test.ts`.
- Signatures:
```ts
export type GeneratorId = 'open-wire' | 'swap-pins' | 'wrong-value' | 'missing-ground' | 'wrong-pin-in-code' | 'reverse-part' | 'part-fault';
export interface FaultCandidate {
  generator: GeneratorId; causeId: CauseId; symptomIds: SymptomId[]; family: CauseFamily;
  fault: Fault;                                   // enabled: true; id matches ^flt_[a-z0-9][a-z0-9_-]{0,63}$
  label: { part?: string; pin?: string; nets?: [string, string] };
}
export function listCandidates(doc: Project, view: NetView, sources: Record<string, string>, opts?: { families?: CauseFamily[] }): FaultCandidate[];
export function pickSurprise(c: readonly FaultCandidate[], seed: number): FaultCandidate | undefined;
export function breakOps(doc: Project, c: FaultCandidate): Operation[];        // [{ k: 'fault.set', fault }]
export function restoreOps(doc: Project, faultId: string): Operation[];        // [{ k: 'fault.remove', id }]
```
- Generators:

| Generator | Candidate | Stored kind | cause_id |
|---|---|---|---|
| `open-wire` | each connected pin of a described non-board part that is `power_in`, an input, or in a protocol | `open-wire` | `open-connection` |
| `swap-pins` | each pair of SDA/SCL (or TX/RX) nets of one protocol | `wrong-connection`, `target.nets` | `swapped-pins` |
| `wrong-value` | each resistor or capacitor parameter, factor 10 and 0.1 | `wrong-value` | `wrong-value` |
| `missing-ground` | each `ground` pin of a described part | `open-wire` | `missing-ground` |
| `wrong-pin-in-code` | a literal pin in `digitalWrite`, `analogWrite` or `tone` that has another board pin with an LED or buzzer | `config` with `params {file,line,from,to}` | `wrong-pin-in-code` |
| `reverse-part` | each LED or polarised part | `reversed-part` | `led-reversed` for an LED, else `reverse-polarity` |
| `part-fault` | each entry of a placed part's `injectable_faults` | mapped by the PDM 5.11 table; `injectable {component, id}` set | the entry's `cause_id` |

- Rules: candidate ids are `flt_<generator>_<part>_<pin>` lowercased with every other character replaced by `-`, cut to 64; ties get `_2`, `_3`. `symptomIds` come from `causeMeta(causeId).symptomIds`. A part with no descriptor yields no candidate and a skip count. `pickSurprise` draws with the seeded PRNG of `src/core/prng.ts`, sorting candidates by id first so list order never changes the pick; the seed comes from the caller (the UI uses `crypto.getRandomValues` for the seed only, EDUCATION 6.10).
- Restore (finding F12): PDM 5.11 says Restore "disables" the fault and the hash "returns to its earlier value". A disabled fault is still stored, so the hash would differ. This plan makes Restore the inverse of Break it: `fault.remove`, which returns the earlier `stateHash` (T-B2-09 excludes `history`, `exports`, `updatedAt`, `revision`). A fault that was already in the document (an author's fault) is enabled and disabled, never removed (section 10, Q9).
- Validation: `breakOps` rejects a candidate whose id already exists in the document (`duplicate-fault`). Edge cases: a document at the 200-fault limit gives no `breakOps` (error `limit`).
- Permissions: none. Performance: under 20 ms at 500 parts (ESTIMATED). Migration: none.

**Verification.**
- `generate.test.ts`: env-monitor gives the five generators; every candidate id matches the schema pattern; applying `breakOps` then `restoreOps` through `ProjectSession` returns the same `stateHash`; same seed same pick over 1,000 runs; different seeds spread over at least 3 candidates; reordering the input arrays does not change the pick; `part-fault` copies `cause_id`, `symptom_ids` and sets `injectable`.
- Fixtures: `schemas/examples/env-monitor-esp32.project.json`, `uno-blink-d12.project.json`.
- Acceptance. Given `uno-blink-d12` (LED on D12), When candidates are listed, Then one `wrong-pin-in-code` candidate changes the pin constant to 12 or from 12 to the neighbouring pin and carries `causeId: 'wrong-pin-in-code'`. Given Break it then Restore, Then `stateHash` equals the original.
- Observability: candidates carry `generator`; the UI shows it as "why this one".
- Release blockers: `Restore` leaving any residue in the document.

**Delivery.**
- Done when tests pass; `PORTABLE` passes.
- Verify: `TL`; `npx vitest run src/sim/faults/generate.test.ts`; `PORTABLE`.
- Documentation: `docs/FAULTS.md` generator table.
- Rollback: revert.
- Later tasks need: `listCandidates`, `pickSurprise`, `breakOps`, `restoreOps`, `FaultCandidate`.

---

### T-B10-25 Tag the 250 catalogue faults and log their record

**Identity.** T-B10-25; FAULTS / legacy; B10; must; depends on T-B10-16, T-B10-20; not started. Files: three (`legacy-map.ts` and the two panels).

**Intent.**
- Problem: R-118 says the existing 250 faults keep working. R-119 says every fault carries `cause_id` and `symptom_id`. Today a `FailureMode` (`src/content/schema.ts:243`) has neither. Editing about 250 literals in 20 content files is large and is moved in B12 and B13 anyway.
- Target user: the learner on the catalogue labs, and the converter in B12.
- User story: As a learner pressing Repair on a bench fault, I want my record kept the same way as on a Studio circuit.
- Expected behaviour: one mapping function gives each `FailureMode` a registry cause id and symptom ids; the two legacy panels write a `diagnosis.record` event when the learner repairs (explains) a fault. No content file changes.
- Success metric: the test maps all faults found at run time; 0 unmapped; every id is in the registry or starts with `x-`.

**Implementation.**
- Existing files: `src/components/boardlab/FailurePanel.tsx:66-75` (the `trigger` and `repair` handlers: when `repair` runs for the active fault, call `appEventLog().append('diagnosis.record', ...)` from `@/local/events` with `legacyDiagnosis(f, projectId)` and outcome `revealed`; no prop and no parent change, so the three parents `BoardWorkspace.tsx:335`, `LessonWorkspace.tsx:312` and `BenchWorkspace.tsx:478` stay as they are), `src/components/robotics/FaultsPanel.tsx:58` (the dispatch: the same call when `on` is true). The `projectId` for a legacy fault is `legacy:<board or bench id>:<fault id>`; it holds no name or room. Both panels are deleted by B12 and B13; this task is deliberately small.
- New files: `src/content/faults/legacy-map.ts`. It sits in `content` so that the UI panels may import it (UI does not import `sim`, SYSTEM 5.3) and takes the legacy `FailureMode` type from `src/content/schema.ts`. Tests: `src/content/faults/legacy-map.test.ts` (header `// @vitest-environment node`). `content` gets only `core` and `project` types from the layering matrix, and the architecture test reads every import, test files included. So the test never imports `@/sim/faults/*`. Its default way to get the registry is: import the id list from `@/project/diagnosis` if T-B3-20 exports `CAUSE_IDS` there; otherwise read `src/sim/faults/cause-ids.ts` as text with `node:fs` and take the quoted ids with a regular expression. Symptom ids are read the same way from `src/sim/faults/symptoms.ts` (`SYMPTOM_IDS`). Step 0 only checks which of the two ways applies; it does not choose to import from `sim`.
- Signature:
```ts
export function legacyCause(f: FailureMode): { cause_id: string; symptom_ids: string[] };     // plain strings: `content` may not import the types of `src/sim/faults`
export function legacyDiagnosis(f: FailureMode, projectId: string): Diagnosis;      // evidence: [], hint_level: 0
```
- Mapping (EDUCATION 6.6, applied to `FailureKind`; the trigger decides the ambiguous ones):

| `FailureKind` | cause_id |
|---|---|
| `reverse-polarity` | `reverse-polarity` |
| `reversed-part` | `led-reversed` when the id or trigger part names an LED, else `reverse-polarity` |
| `brownout` | `brownout` |
| `overcurrent` | `led-no-series-resistor` when the trigger is `remove-part` on a resistor, else `pin-overcurrent` |
| `short` | `supply-shorted-to-ground` when the two nets include a ground net and a supply net, else `output-contention` |
| `floating-input` | `floating-input` |
| `missing-part` | `open-connection` for a signal part, `x-missing-decoupling` for a capacitor, else `x-missing-part` |
| `wrong-voltage` | `x-supply-overvoltage` when `effect.damages` is non-empty, else `part-not-powered` (HYPOTHESIS, spot-checked in the test) |
| `cold-solder` | `x-intermittent-connection` |
| `boot-strap` | `x-boot-strap-level` |
| `level-mismatch` | `x-logic-level-mismatch` |
| `config` | `x-wrong-config` |
| `thermal` | `x-thermal-shutdown` (not modelled yet) |

  Symptoms from `effect`: `power: 'resetting'` gives `mcu-resets`; `damages` with an LED gives `led-burnt`; `pins` with a stuck or dead pin gives `pin-level-wrong`; `halts` or `power: 'off'` gives `part-dead`; otherwise `part-dead`.
- Validation: the test fails if a kind is added to `FailureKind` without a row.
- Edge cases: the 250 are DOCUMENTED (144 + 106); this task's grep found 127 `trigger: {` literals in the board files and 35 in the robotics files (finding F9), because helpers build some faults. The test reads the content index at run time (`src/content/index.generated.ts`, from `scripts/gen-content-index.mjs`), prints the count, and does not assert 250.
- Permissions: none. Performance: pure. Migration: none; no content file changes.

**Verification.**
- `legacy-map.test.ts`: one spot-check per kind (13 rows); the run-time sweep over all board and robotics faults; every symptom id exists; `legacyDiagnosis` validates against the `Diagnosis` type.
- Component test (existing style, e.g. `ChecksPanel.test.tsx`): pressing Repair on an active fault calls the event log's `append` once with kind `diagnosis.record`.
- Acceptance. Given the Uno R3 `reverse-jack` fault, When Repair is pressed with the event log on, Then one `diagnosis.record` event holds `cause_id: 'reverse-polarity'`. With the log off, Then no row is written.
- Observability: the sweep prints `mapped=<n> x-ids=<k>`.
- Release blockers: an unmapped fault.

**Delivery.**
- Done when tests pass and the old panel tests still pass.
- Verify: `TL`; `npx vitest run src/content/faults/legacy-map.test.ts src/components/boardlab src/components/robotics`.
- Documentation: `docs/FAULTS.md` "The catalogue faults".
- Rollback: revert; panels return to the old behaviour.
- Later tasks need: `legacyCause` (B12 uses it when the converter writes `cause_id` into projects).

---

### T-B10-26 Diagnose item format, materialiser and lint

**Identity.** T-B10-26; FAULTS / items; B10; should; depends on T-B10-16, T-B10-19; not started.

**Intent.**
- Problem: F-022 asks for 40 reviewed items. Each needs a stored format, a way to become a runnable project, and the lint rules of EDUCATION 6.8 so a leak or a bad distractor is caught by a test.
- Target user: the item authors (T-B10-28, T-B10-29) and the panel.
- User story: As a learner, I want the symptom to describe what I can see and not name the broken part.
- Expected behaviour: a `FaultItem` is a base project reference, one fault, a `DiagnoseSpec` and a hint ladder; `materialiseItem` produces the project; `lintItem` runs L1 to L7 and returns issues.
- Success metric: lint catches each planted defect in a table of 8 bad items and passes 3 good ones.

**Implementation.**
- Existing files: none.
- New files: `src/sim/faults/items.ts`. Tests: `src/sim/faults/items.test.ts`.
- Signatures:
```ts
export interface FaultItem {
  id: string;                                   // 'item-uno-r3-reverse-jack'
  base: string;                                 // converter project id
  fault: Fault;                                 // enabled: true, cause_id and symptom_ids set
  spec: DiagnoseSpec;
  ladder: HintLadder;                           // contract 4.1
  family: CauseFamily;
  source: { catalogueId?: string; board?: string };
}
export function materialiseItem(item: FaultItem, baseDoc: Project): Result<Project, { code: 'base-mismatch' | 'invalid'; message: string }>;
export type LintId = 'L1' | 'L2' | 'L3' | 'L4' | 'L5' | 'L6' | 'L7';
export interface LintIssue { lint: LintId; itemId: string; message: string }
export function lintItem(item: FaultItem, ctx: { baseDoc: Project; causeTitle(id: CauseId): string; fixText: string }): LintIssue[];
export const OBSERVABLE_NOUNS: readonly string[];       // LED, serial, reading, heat, smell, reset, motor, sound, display, nothing
```
- Lint rules (EDUCATION 6.8): L1 the symptom names no refdes or descriptor name of the faulted part; L2 no word of 5 or more letters from the cause's display name appears in the symptom, after a stop list; L3 the symptom contains an observable noun; L4 every distractor is a registry id, at least two come from `confusableWith(answer)`, the rest from the same family; L5 exactly one option equals the answer; L6 an item whose `spec.review.status` is `reviewed` has an answer whose `causeMeta().modelled` is true; L7 the ladder has 3 levels and level 3 shares no run of 4 words with the fix text. L8 (the base tests fail on the broken state and pass on the stored solution) runs in the item data tests of T-B10-28 and T-B10-29, not here.
- `materialiseItem`: copies the base document, adds the fault with `fault.set`, sets `ext["x-iynk-guided"].diagnose = spec` and `ext["x-iynk-guided"].ladder = ladder`, keeps `guide.kind = 'challenge'`; the result validates (V1 to V5).
- Validation and errors: `base-mismatch` when `baseDoc.id !== item.base`; `invalid` carries the validator message.
- Edge cases: an item whose cause has no detector (`modelled: false`, or an `x-` cause with no rule) can only be `draft` or `model-only` (R-129, EDUCATION 6.4); L6 enforces it.
- Permissions, performance, migration: none.

**Verification.**
- `items.test.ts`: 3 good inline items pass; 8 bad ones each trip exactly the lint planted (symptom names the part; symptom restates the cause; no observable noun; one distractor from another family; two right answers; reviewed item with a not-modelled cause; level 3 contains the fix; 2-level ladder); `materialiseItem` output validates and holds the fault disabled-state `enabled: true`; the redaction of T-B10-19 applied to the output hides the answer.
- Acceptance. Given the `reverse-vin` symptom text quoted in EDUCATION 6.6 ("the regulator near the jack gets hot..."), When L1 runs with the regulator as the faulted part, Then L1 fails. Given the rewritten text ("nothing runs; one component near the jack is too hot to touch"), Then L1 passes.
- Observability: `LintIssue` names the item and the lint.
- Release blockers: a lint that passes a planted defect.

**Delivery.**
- Done when tests pass and `PORTABLE` passes.
- Verify: `TL`; `npx vitest run src/sim/faults/items.test.ts`; `PORTABLE`.
- Documentation: `docs/FAULTS.md` "Writing an item".
- Rollback: revert.
- Later tasks need: `FaultItem`, `materialiseItem`, `lintItem`.

---

### T-B10-04 Solved detectors

**Identity.** T-B10-04; FAULTS / detectors; B10; must; depends on T-B10-02, T-B10-03, T-B10-15, T-B10-21, T-B8-05, T-B8-06, T-B8-10; not started.

**Intent.**
- Problem: current-based rules (R-123 "needs the solver") cannot be decided from topology. T-B8-06 produces honest states (over-current, burn-out, brown-out, floating input, each with evidence). Nothing turns those into diagnoses with a cause id.
- Target user: a maker who runs a circuit and sees an LED burn or a board reset.
- User story: As a maker, I want the app to say why the board reset and show the voltage that did it.
- Expected behaviour: after a run (and on pause), the solved rules read the run facts and return findings whose evidence comes from the solver, with provenance and tier; the static rules' findings are confirmed or left alone.
- Success metric: the seven `solve:` rules of 4.3 fire on hand-made run facts and stay silent on healthy ones; on the corpus they catch slots 12, 13 and 15 (checked in T-B10-18).

**Implementation.**
- Existing files: edit `src/sim/orchestrator.ts` (T-B3-11, T-B8-09) only to add an optional run-end observer if the `Engine` interface of T-B3-11 has none (one edit, listed here so the 5-file count holds; Step 0 decides).
- New files: `src/sim/faults/run-facts.ts`, `src/sim/faults/solved.ts`, `src/sim/faults/monitor.ts`. Tests: `run-facts.test.ts`, `solved.test.ts`, `monitor.test.ts`.
- Signatures:
```ts
// RunFacts and CodeFacts are declared in src/sim/faults/types.ts (contract 4.1, T-B10-01).
// This task implements runFactsFrom; it does not wait for T-B10-05 because CodeFacts is a type in types.ts.
export function runFactsFrom(src: RunSource): RunFacts;               // adapter over the T-B8-06 and T-B8-10 outputs
export const SOLVED_RULES: readonly Rule[];                           // the seven solve: rules
export function checkOutcomes(results: { check: Check; result: CheckResult }[]): CheckOutcome[];
// monitor.ts
export interface FaultMonitor { onRunEnd(facts: RunFacts, view: NetView, code?: CodeFacts, checks?: CheckOutcome[]): Finding[] }
export function createFaultMonitor(rules: readonly Rule[]): FaultMonitor;
```
  `RunSource`, the type T-B8-06 and T-B8-10 expose, is UNKNOWN until built; `runFactsFrom` is the only place that names their fields.
- Rules: see 4.3. Thresholds come from the failure models of T-B10-02 (`modelsFor(cause)` and `evalTrigger`) and from board data (`maxAmps`, MCU minimum, `PIN_R`). Evidence per finding: the solver quantity with `at`, `unit`, the tier and provenance copied from the fact (never upgraded), and `modelIds` from the state event. The finding's `messageKey` args hold the computed number, so no prose carries a fixed figure (T-B8-07 removes the 113 mA text; this task adds none).
- Algorithm: for each rule, scan `states` for its state kind on an eligible part; apply the failure-model trigger when a model exists; skip when `tier` is `T0` for a quantity the rule needs a computed value for (a rule never claims a number the engine did not compute). `solve:value-band@1` reads `CheckOutcome` entries of kind `node-voltage` and `supply-current` (T-B10-21) and LED current from `branch`.
- Validation and errors: a fact the adapter cannot find returns `undefined` and the rule records a skip. Exceptions are isolated by `runRules`.
- Edge cases: a latched burn reports once; a brown-out followed by recovery still reports once with the first crossing time; two resets within 50 ms are one finding.
- Permissions: none. Performance: the monitor runs at run end and on pause, not per tick; a pause scan of a 5,000 ms run stays under 5 ms (ESTIMATED).
- Migration: none.

**Verification.**
- `solved.test.ts`: per rule, a positive fact set and a healthy fact set; the LED at 117.65 mA gives `led-no-series-resistor` with evidence value 117.65 and unit `mA`; a `T0` fact never produces a numeric finding; `value-band` with a failing `c1` at 2.9 V gives `wrong-value` with the rail voltage as evidence (SIM 7.6.1: 4.0 V supply gives 2.9 V rail and `wrong-value`; 3.0 V supply gives 1.9 V and `brownout`).
- `run-facts.test.ts`: adapter over a recorded run of the Uno blink example; every field present or `undefined` by design.
- `monitor.test.ts`: a monitor over a recorded run with an LED and no resistor returns one finding; calling twice returns the same finding (idempotent).
- Fixtures: recorded runs produced in the test by the headless harness (T-B2-16) with a seed.
- Acceptance. Given the env-monitor with the supply set to 3.0 V, When the run ends, Then one finding `brownout` with evidence `net-voltage net_3v3 = 1.9 V` and `symptomId: 'mcu-resets'`. Given the healthy supply, Then no finding.
- Observability: findings carry `ruleId`; the monitor returns skip counts.
- Release blockers: a finding that states a number the solver did not compute.

**Delivery.**
- Done when tests pass and the T-B8-03 tier test still passes.
- Verify: `TL`; `npx vitest run src/sim/faults src/sim/orchestrator.test.ts`; `PORTABLE`.
- Documentation: `docs/FAULTS.md` solved rules and their thresholds.
- Rollback: revert; static rules still work.
- Later tasks need: `runFactsFrom`, `SOLVED_RULES`, `createFaultMonitor`, `checkOutcomes` (`RunFacts` and `CheckOutcome` come from `types.ts`).

---

### T-B10-05 Code facts and code detectors

**Identity.** T-B10-05; FAULTS / detectors; B10; must; depends on T-B10-03, T-B8-02, T-B9-02; not started.

**Intent.**
- Problem: the commonest beginner mistake is code that drives a different pin from the one the LED is on (F-026), and the SA-23 fault is a `Wire.begin` order that disagrees with the wiring. Both need the code and the netlist together. `Wire.begin` is a no-op in the interpreter today (`src/lib/interp/arduino/libs.ts:745`, VERIFIED); T-B9-02 binds it to nets.
- Target user: a maker whose circuit looks right and does nothing.
- User story: As a maker, I want to be told "your code writes pin 13, your LED is on pin 12", with both named and either fix offered.
- Expected behaviour: a static pass over the sketch extracts literal pin, mode, bus and baud facts; five code rules compare them with the netlist; the pin-mismatch finding carries a code fix as an operation.
- Success metric: the SA-23 source gives `wireBegin {sda: 21, scl: 22}`; the pin-mismatch rule names both pins on the slot-10 corpus file.

**Implementation.**
- Existing files read: `src/lib/interp/arduino/parser.ts:249-327, 915` (`Expr`, `Stmt`, `Unit`, `parseSketch(src, typeNames)`), `src/lib/interp/profiles.ts` (`resolvePin`, used at `checks.ts:6`), `src/lib/interp/arduino/libs.ts:741-745`. The matrix does not list `src/lib`; T-B3-12 sets the precedent of `src/sim/mcu/arduino.ts` importing `src/lib/interp`. Step 0 confirms `src/architecture.test.ts` allows `src/sim/faults` to import `src/lib/interp/arduino/parser` and `profiles`; if not, only `code-facts.ts` is moved to `src/sim/mcu/` and re-exported.
- New files: `src/sim/faults/code-facts.ts`, `src/sim/faults/code.ts`. Tests: `code-facts.test.ts`, `code.test.ts`.
- Signatures:
```ts
// CodeFact and CodeFacts are declared in src/sim/faults/types.ts (contract 4.1, T-B10-01). This task implements them.
export function extractCodeFacts(sources: Record<string, string>, entry: string[], board: { variant: string }): CodeFacts;
export const CODE_RULES: readonly Rule[];                  // the five code: rules
```
- Extraction: parse each source with `parseSketch`; walk `call` expressions where `fn` is an `id` (`pinMode`, `digitalWrite`, `analogWrite`, `tone`, `digitalRead`, `analogRead`) or a `member` (`Wire.begin`, `Wire.setClock`, `Wire.beginTransmission`, `bme.begin`, `Serial.begin`); resolve an argument that is a `num`, an `id` bound to a global `const`/`#define` with a literal initialiser, or a board pin name through `resolvePin`. Everything else increments `unresolved` and never produces a fact.
- Rules (4.3): `code:wire-begin-pins@1`, `code:pin-mismatch@1`, `code:i2c-address@1`, `code:serial-baud@1`, `code:pin-mode@1`.
  - `wire-begin-pins`: GPIO `sda` and `scl` from the code; find the nets those GPIOs sit on; find the I2C device pins with protocol roles `sda`/`scl`; if the net of GPIO `sda` holds a device `scl` pin (and the reverse) the finding is `swapped-pins` with `symptomId: 'i2c-no-ack'`; evidence is `pin-level` entries for both GPIOs with their nets (`ref: 'GPIO21 -> net_scl'`), plus, when `run` is given, `serial-line` entries matching `not found`, `net-voltage` of both lines high (idle high with their pull-ups, so the finding says NACK and does not say stuck low: SIM 13.4), and the first `nack` bus event.
  - `pin-mismatch`: for each `pinWrites` fact on pin P whose net holds no output-part pin (LED, buzzer, relay by `identity.category`), look for a board pin Q on whose net such a part sits and which no write names. The finding names P and Q and offers two fixes (R-126): a code fix with `ops: [{ k: 'source.edit', ... }]` that changes the literal on the right line, and a wiring fix as text only (moving the leg is done by hand in the editor in B10).
  - `i2c-address`: the 7-bit address in the code against the device descriptor's address table and its address-select pin level on the netlist.
  - `serial-baud`: against the serial-monitor instrument `settings.baud` in `simulation.instruments[]`.
  - `pin-mode`: per table 4.3.
- The finding uses `fixes?` of section 4.1 (an array, because R-126 offers both fixes).
- Validation: only literal arguments count; a non-literal pin makes the rule quiet and increments `skipped[ruleId]['non-literal-pin']`.
- Error conditions: a sketch that does not parse yields `language: 'arduino-cpp'` with empty facts and the parse error is already a Problem (T-B4-17); the rules skip.
- Edge cases: Python and Verilog sources give `language: 'unsupported'` (MicroPython `Pin(n)` detection is not built in B10; section 10, Q10); two `Wire.begin` calls use the first; `#include`d user headers are walked through `sources[]`.
- Permissions: none. Performance: parse once per source version; the result is cached by source hash. Migration: none.

**Verification.**
- `code-facts.test.ts`: the SA-23 `main` source; `const int led = 13` resolves; `LED_BUILTIN` resolves on the Uno; a pin passed through a function parameter is `unresolved`; comment and string contents are ignored.
- `code.test.ts`: per rule, one positive and one negative; pin-mismatch fix op changes only the intended digit; wire-begin on the swapped example returns the SA-23 evidence kinds; with a correct `Wire.begin(21, 22)` on the healthy example there is no finding.
- Fixtures: the env-monitor source (`src_main`), `uno-blink-d12.project.json` with the pin constant changed to 13.
- Acceptance. Given the Uno blink example with the LED on D12 and code writing pin 13, When the rules run, Then one finding `wrong-pin-in-code` names pin 13 and pin 12, offers two fixes, and `ops` is a `source.edit`. Given the env-monitor with `flt_swap` enabled, Then `swapped-pins` with `symptomId: 'i2c-no-ack'`.
- Observability: `unresolved` count and skip counts reach the corpus report.
- Release blockers: a finding on the healthy env-monitor.

**Delivery.**
- Done when tests pass; `PORTABLE` passes (or the documented exception).
- Verify: `TL`; `npx vitest run src/sim/faults/code-facts.test.ts src/sim/faults/code.test.ts src/lib/interp`; `PORTABLE`.
- Documentation: `docs/FAULTS.md` "What the code rules read".
- Rollback: revert.
- Later tasks need: `extractCodeFacts`, `CODE_RULES` (`CodeFacts` comes from `types.ts`).

---

### T-B10-08 Hint ladder: logic and component

**Identity.** T-B10-08; FAULTS / hints; B10; should; depends on T-B10-07, T-B10-12; not started.

**Intent.**
- Problem: F-020 and R-121 want a three-level ladder (where to look, what to measure, which part) that opens in order, is logged, and never names the fix at level 3. Hint text exists in three places: reviewed items, part descriptors (`injectable_faults[].hints`, `failure_modes[].hints`, levels 1 to 3, `component.schema.json`), and nowhere for generated faults (EDUCATION 7.2).
- Target user: a learner who is stuck.
- User story: As a learner, I want a nudge that does not give the answer away.
- Expected behaviour: `ladderFor` returns three resolved levels from the best source; the component opens one level at a time, keeps opened levels visible, marks generated ones, and can be used with the keyboard.
- Success metric: for each of the 20 cause ids with texts, generated level 3 passes the "never names the fix" test.

**Implementation.**
- Existing files: none.
- New files: `src/sim/faults/hints.ts`, `src/components/studio/HintLadder.tsx`. Tests: `hints.test.ts`, `HintLadder.test.tsx`.
- Signatures:
```ts
export interface ResolvedLevel { level: 1 | 2 | 3; text: string | { key: string; args: Record<string, string | number> }; focus?: { components?: string[]; nets?: string[] }; probe?: { a: string; b: string; expect?: { min: number; max: number; unit: 'V' | 'A' | 'ohm' } }; generated: boolean }
export function ladderFor(input: { item?: { ladder?: HintLadder }; descriptorHints?: { level: 1 | 2 | 3; text: string }[]; cause: CauseId; finding?: Finding }): [ResolvedLevel, ResolvedLevel, ResolvedLevel];
export function nextLevel(opened: 0 | 1 | 2 | 3): 1 | 2 | 3 | undefined;
export function namesTheFix(level3: string, fix: string): boolean;     // true when they share a run of 4 words
// HintLadder.tsx
export function HintLadder(props: { levels: ReturnType<typeof ladderFor>; opened: 0 | 1 | 2 | 3; onOpen: (level: 1 | 2 | 3) => void; disabled?: boolean }): JSX.Element;
```
- Source order per level: reviewed item ladder, then descriptor hints (a level present there), then generated. Generated level 1: `focus` is the finding's target parts and nets; level 2: a `probe` between the first target pin and the ground net, or the rail named by the cause family, with the expected band when the rule knows it; level 3: key `faults.hintTemplate.<family>.3` with the cause title and the part (never the `fix` key).
- Component behaviour: one "Show hint" button per level; only the next level is enabled; opened levels stay and are announced once in a polite live region; generated levels carry the text from `faults.hint.generated`; the buttons are native `button`s so Tab, Enter and Space work (R-121 a11y); a locked level shows `faults.hint.locked` as text, not colour. The component does not log; its parent passes `onOpen` and the reducer emits the `hint.open` event.
- Validation: `ladderFor` always returns three levels; a missing source falls through; level text never empty.
- Edge cases: a 2-level lesson ladder (33 of 71 lessons have 2 hints, EDUCATION 7.2) yields levels 1 and 2 reviewed and level 3 generated; a finding with no targets gives a level 1 that says where in words only.
- Permissions, migration: none. Performance: trivial.

**Verification.**
- `hints.test.ts`: source order; fallthrough; `namesTheFix` on planted pairs; level 3 for each of the 20 cause ids with texts passes the check against that cause's `fix` text in `en`; `nextLevel` sequence.
- `HintLadder.test.tsx` (jsdom, testing library as in `ChecksPanel.test.tsx`): only level 1 enabled at start; pressing opens it and enables level 2; level 3 disabled until 2; live region text set once; Tab order; no colour-only state (the locked state has text).
- Acceptance. Given a stuck learner on a `swapped-pins` item, When she opens hint 1, Then the two I2C nets are highlighted via `focus`, and the ladder reports `opened = 1`. Given she presses hint 3 first, Then nothing happens.
- Observability: the parent logs `hint.open`; this component has no side effect.
- Release blockers: a level 3 that names the fix.

**Delivery.**
- Done when tests pass; the key scan in `faults-keys.test.ts` passes for this file.
- Verify: `TL`; `npx vitest run src/sim/faults/hints.test.ts src/components/studio/HintLadder.test.tsx src/i18n`.
- Documentation: `docs/FAULTS.md` "Hints".
- Rollback: revert.
- Later tasks need: `ladderFor`, `HintLadder`.

---

### T-B10-09 Break it: tool and panel

**Identity.** T-B10-09; FAULTS / Studio; B10; must; group G4; depends on T-B10-03 (`NetView`, `buildNetView`, `FaultCandidate` context), T-B10-04 (Explain shows monitor evidence), T-B10-07, T-B10-12, T-B10-15, T-B10-19, T-B10-20 (`appEventLog`), T-B10-22, T-B3-05 (`.iynk` export for the buddy copy), T-B4-02, T-B4-11, T-B4-13 (run bridge); not started.

**Intent.**
- Problem: R-118 and R-125 want "Break it" on a project: a fault goes in as an undoable operation, the symptom runs, the cause is known to me, Restore returns the exact document. Sealed bugs for a buddy are the diagnose-first path (EDUCATION 6.10).
- Target user: a maker practising on their own circuit.
- User story: As a maker, I want to break my own circuit and see what it does, then put it back with one press.
- Expected behaviour: a list of candidates in plain words by family, a seeded Surprise me, Break it as one undo entry, Explain, Restore, and "Break it for a buddy" which downloads a sealed `.iynk` copy.
- Success metric: Break it then Restore returns the original `stateHash` (R-125); the Surprise seed is shown and replays the same pick.

**Implementation.**
- Existing files: none changed. Uses the command registry and the doc/session stores (T-B4-02), undo wiring (T-B4-11), run bridge (T-B4-13), `.iynk` export (T-B3-05).
- New files: `src/studio/tools/break.ts`, `src/components/studio/BreakIt.tsx`. Tests: `src/studio/tools/break.test.ts`, `src/components/studio/BreakIt.test.tsx`.
- The Studio imports the pure files `@/sim/faults/generate`, `@/sim/faults/types`, `@/sim/faults/seal` and `@/sim/faults/diagnose` (decision Q2 in section 10; part B of T-B10-01; the default Yes is binding unless the register says No). If the register says No, this task calls the same functions through the worker (a `fault-candidates` message), +1 week ESTIMATED. Layering: `src/studio/tools/break.ts` imports nothing from `src/local`. `BreakIt.tsx` (a component) calls `appEventLog()` from `@/local/events`.
- Signatures:
```ts
// break.ts: a tool is (doc, gesture) => Batch (ADR-0802)
export type BreakGesture =
  | { t: 'list' } | { t: 'break'; candidate: FaultCandidate } | { t: 'surprise'; seed: number; families?: CauseFamily[] }
  | { t: 'restore'; faultId: string } | { t: 'buddy'; candidate: FaultCandidate; lang: string };
export function breakTool(doc: Project, view: NetView, sources: Record<string, string>, g: BreakGesture): Result<{ ops: Operation[]; candidate?: FaultCandidate; sealedDoc?: Project }, { code: 'duplicate-fault' | 'limit' | 'no-candidate'; message: string }>;
export function specFromCandidate(c: FaultCandidate, texts: { symptom(id: SymptomId): string; explanation(id: CauseId): string; option(id: CauseId): string }, seed: number): DiagnoseSpec;
```
- Behaviour. List: `listCandidates` grouped by family; each row shows `label` (part, pin or nets) in words from `faults.cause.<id>.title`. A second list, "In this project", shows the faults already stored in the document (for example `flt_swap` in the env-monitor example) with Turn on and Turn off; each is one `fault.set` operation that flips `enabled`. While an item is sealed and unrevealed this list is the redacted view of T-B10-19. Break it: `breakOps` as one batch, one undo entry (ADR-0805 scope: per author); then the panel asks the run bridge to restart the run from time 0 (a fault applies at P0, SIM 13.2); a message says so. Surprise me: the panel draws a seed with `crypto.getRandomValues` (UI only), calls `pickSurprise`, shows "seed 48213 (replay with this number)". Explain: shows `faults.cause.<id>.title/why/fix`, the symptom text, and, after a run, the evidence from the monitor (T-B10-04); the Explain action also appends a `diagnosis.record` event (outcome `revealed`, because the cause was known) through `appEventLog()`, called in `BreakIt.tsx` after the tool returns and never in `break.ts`. Restore: `restoreOps`, or undo when the last batch is the break. Buddy: builds a copy with `breakOps` applied and `specFromCandidate` stored in `ext["x-iynk-guided"].diagnose`, runs `sealForSharing`, and offers a `.iynk` download. The original document is untouched.
- State transitions: panel states `idle`, `broken(faultId)`, `explained(faultId)`; leaving `broken` happens only through Restore or undo.
- Validation: a candidate whose fault id exists is `duplicate-fault`; 200 faults is `limit`; a part without a descriptor never appears (the `faults.breakIt.needsDescriptor` text explains).
- Error conditions: the run bridge being absent (no worker) leaves the fault stored and says the run will use it next time.
- Edge cases: Break it while a run is going: the run restarts; Restore during a run: restart; a project that already has an enabled author fault: Break it adds a second fault, and the list says "2 faults on" in text.
- Permissions: none; the sealed copy leaves the machine only through a file the person saves.
- Performance: `listCandidates` under 20 ms at 500 parts (ESTIMATED). Migration: none.
- Accessibility: every control is a native button or a list with roles; the list is also in the outline pane order; results are announced in a polite live region; no state by colour alone.

**Verification.**
- `break.test.ts`: Break then Restore through `ProjectSession` returns the same `stateHash`; Turn on then Turn off of a stored fault returns the same `stateHash` as before Turn on; one undo entry per break; Surprise with a fixed seed is stable; the buddy copy contains the spec and the sealed flag and the redaction of T-B10-19 hides the answer from its views; original document unchanged (deep-frozen).
- `BreakIt.test.tsx`: renders candidates; Break it enables Restore; Explain shows the cause text; the buddy button calls the download function once.
- Playwright: `e2e/break-it.spec.ts` is written in T-B10-32 after the dock is mounted.
- Acceptance. Given `uno-blink-d12` open in Studio (LED on D12, code writes pin 12), When I press Break it on the `wrong-pin-in-code` candidate (the code now writes the pin next to the LED's), Then the run restarts, the pin trace of D12 stays low, Explain names `wrong-pin-in-code` with the fault's symptom text, and Restore returns the original `stateHash`. This needs no B9 task. The BME280 case (`BME280 not found`, `swapped-pins`) is the acceptance of T-B10-13, which depends on the B9 tasks.
- Observability: the Explain action writes a `diagnosis.record` event when the log is on (from `BreakIt.tsx`).
- Release blockers: Restore leaving any residue; the sealed copy exposing the answer in a redacted view; any import of `src/local` in `break.ts` (the architecture test catches it).

**Delivery.**
- Done when tests pass; the key scan passes for `BreakIt.tsx`.
- Verify: `TL`; `npx vitest run src/studio/tools src/components/studio/BreakIt.test.tsx src/i18n src/architecture.test.ts`.
- Documentation: `docs/FAULTS.md` "Break it".
- Rollback: revert (T-B10-32 and T-B10-14 depend on it, so revert them first).
- Later tasks need: `breakTool`, `specFromCandidate`, `BreakIt`.

---

### T-B10-10 Diagnosis record view and export

**Identity.** T-B10-10; FAULTS / record; B10; must; depends on T-B10-07, T-B10-12, T-B10-20; not started.

**Intent.**
- Problem: R-119 and R-127: the record must be visible, exportable, and every claim shows its evidence with times and honesty labels. Unmodelled evidence says so.
- Target user: a learner or maker who wants to keep or share what they found.
- User story: As a maker, I want to save "what was wrong and what I measured" as a small file.
- Expected behaviour: a panel shows cause, symptom, evidence list (kind, reference, time in virtual ms, value with unit, tier and provenance as words), hint level and outcome; Export saves a JSON file and Copy puts a plain-text summary on the clipboard; the panel says whether the local log is on.
- Success metric: the exported JSON validates against `parseDiagnosis`, and round-trips equal.

**Implementation.**
- Existing files: none changed.
- New files: `src/export/diagnosis.ts`, `src/components/studio/DiagnosisRecord.tsx`. Tests: `src/export/diagnosis.test.ts`, `DiagnosisRecord.test.tsx`.
- Signatures:
```ts
export interface DiagnosisFile { v: 1; diagnosis: Diagnosis; outcome: 'clean' | 'assisted' | 'helped' | 'revealed'; noEvidence: boolean; tierLowest: Evidence['tier']; projectId: string }
export function exportDiagnosis(d: Diagnosis, meta: { outcome: DiagnosisFile['outcome']; projectId: string }): { json: string; filename: string; text: string };
export function parseDiagnosis(json: string): Result<DiagnosisFile, { code: 'bad-json' | 'bad-record'; path: string }>;
export function evidenceLine(e: Evidence, t: (key: string, args?: Record<string, string | number>) => string): string;
```
- `exportDiagnosis`: canonical JSON (T-B2-03), filename `diagnosis-<cause_id>.json` (no project name, no date: the file carries none, so it reveals nothing about when or what), `text` is a plain summary in English for pasting in a bug report ("cause: swapped-pins, symptom: i2c-no-ack, hint level 0, evidence: ..."). `tierLowest` is the lowest tier among evidence entries, so a reader sees how strong the claim is.
- `parseDiagnosis`: validates ids against the registry or `x-`, `hint_level` in 0 to 3, evidence kinds in the closed list, `at` an integer, string lengths bounded (value at most 200 characters), at most 64 evidence entries.
- Component: heading, cause title from the namespace, symptom, an evidence table (a real `table` with headers), tier and provenance as text chips, hint level, outcome, the log status (`faults.record.logOn` or `logOff`) with a link to the settings viewer, Export and Copy buttons. An empty evidence list shows `faults.record.empty` ("no evidence recorded: this was a guess") and `noEvidence` is true. A `mocked` entry shows `faults.fidelity.mocked`.
- Fidelity label: the component always renders `faults.fidelity.notChecked` under the record until `bench-check` results exist for the cause (T-B10-30); it reads a prop `benchChecked: boolean` set by T-B10-32 from the fixture.
- Edge cases: 64 or more evidence entries show the first 64 and a count; ns-to-ms conversion rounds down and shows "1,204 ms".
- Permissions: none; nothing is sent anywhere. Performance: trivial. Migration: none.

**Verification.**
- `diagnosis.test.ts`: export then parse is identity; a record with a core cause id outside the registry is `bad-record`; `x-` ids pass; oversize value rejected; the filename holds no project id; canonical ordering stable.
- `DiagnosisRecord.test.tsx`: table has headers; tier and provenance text; empty evidence text; Export calls the download function once; Copy writes `text` to the clipboard mock.
- Acceptance. Given the SA-23 record, When I press Export, Then the file holds `{cause_id:'swapped-pins', symptom_id:'i2c-no-ack', hint_level:0}` and three or more evidence entries, and `parseDiagnosis` accepts it.
- Observability: none beyond the visible log status.
- Release blockers: a file that names the project.

**Delivery.**
- Done when tests pass and `PORTABLE` passes for `src/export/diagnosis.ts`.
- Verify: `TL`; `npx vitest run src/export/diagnosis.test.ts src/components/studio/DiagnosisRecord.test.tsx src/i18n`; `PORTABLE`.
- Documentation: `docs/FAULTS.md` "The record file".
- Rollback: revert.
- Later tasks need: `exportDiagnosis`, `parseDiagnosis`, `DiagnosisRecord`.

---

### T-B10-17 Part-aware static rules

**Identity.** T-B10-17; FAULTS / detectors; B10; must; depends on T-B10-03; not started.

**Intent.**
- Problem: LED, polarity, supply and I2C mistakes need pin polarity, ratings, protocol roles and pull data from the part descriptors, not only topology.
- Target user: a maker wiring an LED or an I2C sensor.
- User story: As a maker, I want "this LED has no resistor" before I run, not after it burns.
- Expected behaviour: seven static rules (table 4.3) that read descriptor data and skip any part they cannot read.
- Success metric: each rule has a positive and a negative test; all seven are quiet on the T-B10-03 clean set.

**Implementation.**
- Existing files: none changed.
- New files: `src/sim/faults/static-power.ts` (rules `rule:led-series@1`, `rule:led-polarity@1`, `rule:supply-polarity@1`, `rule:part-supply@1`), `src/sim/faults/static-bus.ts` (rules `rule:i2c-roles@1`, `rule:i2c-pullup@1`, `rule:i2c-pullup-value@1`). Tests: `static-power.test.ts`, `static-bus.test.ts`.
- Signatures: `export const POWER_RULES: readonly Rule[]; export const BUS_RULES: readonly Rule[]; export const I2C_LIMITS: Record<'standard' | 'fast', { trNs: number; cbPf: number; iolA: number }>;`
- Rule detail:
  - `led-series`: for an LED (`identity.category: 'led'`), anode net A and cathode net K. If A holds a source pin (`power_out`, or a board output pin) and K is ground-class, with no element between (both nets hold only the LED, wires and the source), fire. Skip a module that declares an on-board resistor in `ratings` (measure `resistance`, role `characteristic`). Message args: the source pin and the LED.
  - `led-polarity`: LED anode on a ground-class net while the cathode net holds a source or power pin; or the anode net is nominally lower than the cathode net (`nominalVolts`).
  - `supply-polarity`: `power_in` on the ground net and `ground` on a power net; or `positive`/`negative` pins on nets of reversed nominal voltage.
  - `part-supply`: a `power_in` pin on a net with no source part, or `nominalVolts(net)` below the part's lowest `operating` voltage rating (`ratings[]` with `measure: 'voltage'`, `role: 'operating'`; the min is the `abs_min` or the lowest `recommended`). A net with unknown voltage is skipped.
  - `i2c-roles`: device pins from `protocols[]` of kind `i2c` with their `role` per pin, board pins from the board descriptor's `protocols[]`; fire when a device SDA pin shares a net with a board SCL pin or the reverse. Boards with remappable I2C (ESP32) have roles by default pins only; remapped use goes through `code:wire-begin-pins@1`, and this rule skips a board pin whose descriptor marks the function as remappable.
  - `i2c-pullup`: SDA/SCL net with no resistor to a power net, no `pin.pull` of kind `on-board` on any member, no board internal pull.
  - `i2c-pullup-value`: resistance of the pull-up resistor (a resistor from the line to a power net) outside `[Rp_min, Rp_max]`. `I2C_LIMITS` holds `standard {trNs: 1000, cbPf: 100, iolA: 0.003}` and `fast {trNs: 300, cbPf: 100, iolA: 0.003}`. `Rp_max = trNs * 1e-9 / (0.8473 * cbPf * 1e-12)`; `Rp_min = (Vdd - 0.4) / iolA`. These constants and the formula are EXTERNAL (I2C specification UM10204, not read in this step) and `cbPf` is ASSUMED; they live in the table so Amar can change them. Bus speed is `wireClock` when code facts exist, else standard.
- Evidence: `state` entries with the computed numbers in the value text; static evidence tier is `T0`, provenance `computed`.
- Validation, errors, edge cases: a resistor on both lines in series with a device counts as a series resistor, not a pull-up (it has no pin on a power net); a module with two pull-ups in parallel uses the parallel value; a missing rating is a skip, never a guess.
- Permissions, migration: none. Performance: linear in the pins of each LED or bus.

**Verification.**
- Unit tests per rule (positive, negative, undescribed part skipped); `I2C_LIMITS` arithmetic: standard gives `Rp_max` about 11.8 kOhm and fast about 3.5 kOhm at 100 pF (computed in the test from the formula, not typed); 4.7 kOhm passes both; 470 kOhm fails both; 100 Ohm fails `Rp_min` at 5 V.
- Acceptance. Given the Uno blink with the series resistor removed, When the rules run, Then `rule:led-series@1` fires once with `led-no-series-resistor`. Given an I2C display with the SDA and SCL nets exchanged at the board, Then `rule:i2c-roles@1` fires once per net pair.
- Observability: skip counts.
- Release blockers: a false alarm on the T-B10-03 clean set.

**Delivery.**
- Done when tests pass; `PORTABLE` passes.
- Verify: `TL`; `npx vitest run src/sim/faults/static-power.test.ts src/sim/faults/static-bus.test.ts`; `PORTABLE`.
- Documentation: `docs/FAULTS.md` limits table with the EXTERNAL label.
- Rollback: revert.
- Later tasks need: `POWER_RULES`, `BUS_RULES`.

---

### T-B10-24 Static check over the worker, Problems and overlay

**Identity.** T-B10-24; FAULTS / Studio; B10; must; depends on T-B10-03, T-B10-04, T-B10-12, T-B3-13, T-B4-10, T-B4-17; not started.

**Intent.**
- Problem: R-123 wants a Check button that lists plain-language warnings with the pins involved, highlighted in the netlist overlay. The rules are in `src/sim/faults`; the Studio cannot run them on the main thread by the layering and should not for speed (finding F6). `staticProblems` is a named Studio helper (STUDIO_EDITOR 6.6).
- Target user: a maker who just changed the wiring.
- User story: As a maker, I want warnings to appear as I wire, not only when I press Run.
- Expected behaviour (plumbing only): the SimWorker answers a `static-check` message with findings and posts a `findings` event at run end and on pause; `staticProblems` maps findings to Problems; the netlist overlay highlights their targets; a sealed unrevealed item yields an empty list. The idle-task trigger after each batch, the Check button and its disabled state, and the footer counts are not here: they belong to T-B10-32, which owns `StudioEntry.tsx` and `Problems.tsx`.
- Success metric: static pass p95 under 10 ms in the worker for 500 parts and 1,000 wires (ESTIMATED target); no false warning on any starter template (checked in T-B10-18).

**Implementation.**
- Existing files: `src/sim-host/protocol.ts` (T-B3-13: add the two message variants), `src/sim-host/host.ts` (add `staticCheck`), `src/sim-host/sim.worker.ts` (handle the message by calling `runRules(defaultRules(), ...)`), `src/studio/problems.ts` (T-B4-17: add the `static` producer), `src/studio/overlays/netlist.ts` (T-B4-10: highlight targets).
- New files: none. Tests: `src/sim-host/static-check.test.ts`, `src/studio/problems.test.ts` (extend), `src/studio/overlays/netlist.test.ts` (extend).
- Message additions, following the `v: 1` envelope of SIM 17.2:
```ts
// HostToSim
| { v: 1; id: number; t: 'static-check'; net: SimNetlist; sources: Record<string, string> }
// SimToHost
| { v: 1; id: number; t: 'checked'; findings: Finding[]; skipped: Record<string, Record<string, number>>; errors: { ruleId: string; message: string }[] }
// a new variant of SimEventPublic, posted at run end and on pause
| { v: 1; t: 'event'; event: { kind: 'findings'; findings: Finding[] } }
```
- Monitor wiring: in `sim.worker.ts` the worker builds `createFaultMonitor(defaultRules())` (T-B10-04; T-B10-11, in the same group, makes `defaultRules()` return the full list, so the worker needs no later edit) and, at run end and on pause, posts the `findings` event. `Finding` is imported into `protocol.ts` from `src/sim/faults/types` (sim-host may import protocol types from sim, SYSTEM 5.3). The host forwards `findings` events to the Problems producer.
- Host: `staticCheck(net, sources): Promise<CheckedMessage>`; a newer request cancels an older one by id (the older result is dropped). The 2 s grace and worker restart rules of T-B3-13 apply unchanged.
- Producer: `staticProblems(doc, delta?, opts: { sealedUnrevealed: boolean })` maps `Finding` to the `Problem` of STUDIO_EDITOR 10.1: `id = ruleId + sorted target ids`, `source: 'static'` (or `'run'` for a `findings` event), `severity` from the finding, `rule: ruleId`, `diagnosis: {cause_id, symptom_id, evidence, hint_level}` where `hint_level` is 3 (STUDIO_EDITOR 10.1: ordinary projects open at level 3), `targets`, `messageKey`, `args`. When `sealedUnrevealed` is true, `staticProblems` returns an empty list, because the rules would reveal the cause. The flag is a parameter; T-B10-32 reads it from the diagnose store, passes it in and disables the Check button.
- Overlay: targets of kind `pin`, `net`, `part` are added to the netlist overlay highlight set with a non-colour cue (the overlay's existing outline plus a text badge); the cue is cleared when the finding clears.
- Validation: findings with unknown target ids are dropped with a counted note. Error conditions: worker not ready returns an empty list and a `check.skipped` note (key in the `faults` namespace), never a thrown error.
- Edge cases: the change set is only the touched nets in the first version (STUDIO_EDITOR 10.1 PROPOSAL); this task runs the whole netlist, which the 10 ms target allows; incremental runs are not built (HYPOTHESIS that they are not needed).
- Permissions: none. Migration: none.

**Verification.**
- `static-check.test.ts`: in-thread port (T-B3-01 `createInlinePort`) round trip returns findings for a netlist with one open pin; a second request cancels the first; a thrown rule yields an `errors` entry; the response is JSON-safe (structured clone); a run with an LED and no resistor posts one `findings` event at run end.
- Producer and overlay tests: finding to problem mapping with `hint_level` 3; `sealedUnrevealed: true` returns `[]`; highlight set equals the finding targets and clears.
- Performance test: p95 over 50 runs of a generated 500-part, 1,000-wire netlist (T-B2-16 generator) under 10 ms in the in-thread port; the number is printed and recorded in the PR (ESTIMATED target; if missed, the report says so and the task is not closed until Amar sees the number).
- Acceptance. Given a netlist with an LED wired straight to a pin, When `host.staticCheck` resolves, Then `staticProblems` returns one Problem for `rule:led-series@1` with the pin and LED as targets, and the overlay highlight set holds both. Given `sealedUnrevealed: true`, Then `staticProblems` returns `[]`. The pane, the idle trigger and the disabled Check button are proven in T-B10-32.
- Observability: `host.staticCheck` returns the `skipped` and `errors` counts; T-B10-32 shows them in the Problems footer.
- Release blockers: a static pass that leaks the cause of a sealed item.

**Delivery.**
- Done when tests pass and the existing sim-host tests still pass (102 reference runs equal, SA-01).
- Verify: `TL`; `npx vitest run src/sim-host src/studio`; `PORTABLE`.
- Documentation: `docs/FAULTS.md` "Check circuit".
- Rollback: revert; Problems loses the static producer only.
- Later tasks need: `host.staticCheck`, the `static` Problem source.

---

### T-B10-28 Diagnose items 1 to 20

**Identity.** T-B10-28; FAULTS / content; B10; should; depends on T-B10-26; not started.

**Intent.**
- Problem: F-022 and R-129 want 40 items built from the 144 board failures, each with a symptom written as an observation, distractors, a ladder, an explanation and a source. This task writes the first 20 as drafts. Amar reviews (section 9, item 3); only he can mark an item `reviewed`.
- Target user: a learner who wants weeks of exercises.
- User story: As a learner, I want to meet a broken Uno and work out why.
- Quota (EDUCATION 6.6, by kind, so the set covers causes not boards): reverse-polarity 5, wrong-voltage 6, missing-part 6, short 3 (20 in this task). At most 4 from one board; Uno R3 and ESP32 DevKitC first.
- Success metric: 20 items pass L1 to L7 and L8; each has a `source`; none is marked `reviewed`.

**Implementation.**
- Existing files read: `src/content/boards/uno-r3.ts:2116` (failures, 15 on that board), `src/i18n/content/en/boards/uno-r3.json` (`failures.<id>.{title,symptom,explanation,fix}`), the other board files in `src/content/boards/`.
- New files: `src/content/faults/items-a.en.json` (one data file). Tests: `src/sim/faults/items-data-a.test.ts` (header `// @vitest-environment node`). The test sits in `src/sim/faults` because it imports `lintItem`, `materialiseItem` and the registry from there; `content` gets only `core` and `project` types from the matrix, and the architecture test reads every import. The test reads the JSON with `node:fs` and does not import `src/content`. It checks the stored `cause_id` and `symptom_ids` against the registry; it does not call `legacyCause`.
- Item shape: `FaultItem` (T-B10-26). Per item: `base` (a converter project id for the board or lesson that shows the circuit), `fault` (kind from the catalogue, `cause_id` and `symptom_ids` copied by the agent from the mapping table of T-B10-25 and then stored as plain strings), `spec` with 4 to 6 options (two from `confusableWith`), `ladder` with 3 levels, `explanation` in plain words, `review: {status: 'draft', source: 'own-reasoning'}`. Rewriting rule for the symptom: observations only (nothing runs; one component too hot to touch; serial repeats the banner).
- Items whose answer is an `x-` cause or a cause with `modelled: false` get `review.status: 'model-only'` and carry a note (L6); this affects the reverse-polarity and missing-part items less than the 9 items of kinds `cold-solder`, `boot-strap` and `level-mismatch` in T-B10-29 (section 10, Q8).
- Validation (the test): for each item, `lintItem` L1 to L7 pass; L8: the base project's tests fail with the fault enabled and pass with it disabled (run through the headless harness; if the harness cannot run a base, the item is flagged `l8: 'not-run'` and the report counts them; more than 3 not-run items is a failure of the task); `materialiseItem` validates; ids unique; counts by kind equal the quota.
- Error conditions: a base project that does not exist is a test failure naming the item. Edge cases: a failure that exists on several boards is used once.
- Permissions: none. Performance: the L8 runs take about 1 s each (ESTIMATED), 20 s in all. Migration: none.
- Copy: English only (F-022 says "English"). The non-English item texts are future work.

**Verification.**
- `items-data-a.test.ts` as above plus: the leak test of T-B10-19 over every materialised item; the answer is not the first option in more than 8 of 20 items (shuffle check).
- Acceptance. Given `items-a.en.json`, When `items-data-a.test.ts` runs, Then 20 items pass the lints, none says `reviewed`, and the report lists the count per kind and per board.
- Observability: the test prints a table (id, kind, board, status, l8).
- Release blockers: a symptom that names the faulted part.

**Delivery.**
- Done when tests pass.
- Verify: `TL`; `npx vitest run src/sim/faults/items-data-a.test.ts`.
- Documentation: `docs/FAULTS.md` "Items" lists the quota and statuses.
- Rollback: revert.
- Later tasks need: the items for T-B10-23 demos and T-B10-27.

---

### T-B10-29 Diagnose items 21 to 40

**Identity.** T-B10-29; FAULTS / content; B10; should; depends on T-B10-26; not started.

**Intent.** The same as T-B10-28 for the remaining quota: short 1, cold-solder 4, brownout 4, reversed-part 3, boot-strap 3, level-mismatch 2, overcurrent 3 (20 items). Success metric: 20 more items pass L1 to L7; none is `reviewed`.

**Implementation.**
- Existing files read: as T-B10-28.
- New files: `src/content/faults/items-b.en.json`. Tests: `src/sim/faults/items-data-b.test.ts` (placed in `src/sim/faults` and reading the JSON with `node:fs`, for the reason given in T-B10-28).
- Notes. `cold-solder` (4), `boot-strap` (3) and `level-mismatch` (2) map to `x-` causes (`x-intermittent-connection`, `x-boot-strap-level`, `x-logic-level-mismatch`) that have no detector in B10, so those 9 items are `model-only` and may be used as read-only explanations only (EDUCATION 6.4). The 11 others use `brownout`, `led-reversed`, `reverse-polarity`, `pin-overcurrent`, `led-no-series-resistor`, `supply-shorted-to-ground` or `output-contention`, which have detectors. If Amar wants all 40 reviewable, 9 detectors are added later; they are not in this phase.
- Validation, edge cases, performance: as T-B10-28. The ids of the two files do not overlap (the test of T-B10-26 reads both when both exist).

**Verification.**
- `items-data-b.test.ts` as `items-data-a.test.ts` in T-B10-28. Acceptance. Given `items-b.en.json`, When the test runs, Then 20 items pass and 9 are `model-only`.
- Release blockers: as T-B10-28.

**Delivery.**
- Verify: `TL`; `npx vitest run src/sim/faults/items-data-a.test.ts src/sim/faults/items-data-b.test.ts`.
- Documentation, rollback: as T-B10-28.
- Later tasks need: as T-B10-28.

---

### T-B10-11 All 45 cause ids: a detector or "no detector yet"

**Identity.** T-B10-11; FAULTS / registry; B10; must; depends on T-B10-03, T-B10-04, T-B10-05, T-B10-17; not started.

**Intent.**
- Problem: the registry has 45 ids (SIM 13.4, RC-43). A cause with no detector must say so, so no item or hint promises a diagnosis the app cannot make (EDUCATION 6.4, L6).
- Target user: the item lint, the gate and the reader of `docs/FAULTS.md`.
- User story: As Amar reviewing the gate, I want one table that says which causes are detected, by which rule, and which are not yet.
- Expected behaviour: `allRules()` assembles the full rule list; `detectorStatus(id)` returns the layer that detects a cause or `not-modelled-yet` with a reason; a test covers all 45.
- Success metric: 16 ids have at least one rule; 2 ids have status `diagnostic` (raised by the interpreter, T-B8-01, T-B8-02); 27 ids have `not-modelled-yet` with a reason that names the phase that adds them (B16 to B19).

**Implementation.**
- Existing files: edit `src/sim/faults/rules.ts` (T-B10-03: `defaultRules()` becomes an alias of `allRules()`; add `allRules()` assembling `STATIC_RULES`, `POWER_RULES`, `BUS_RULES`, `CODE_RULES`, `SOLVED_RULES`; check ids unique and `disabledReason` set when `enabled` is false), `src/sim/faults/causes.ts` (T-B10-16: add `detectorStatus`). `src/sim/faults/cause-ids.ts` (T-B3-20) is left alone: the roadmap row lists it, but the id list does not change.
- New files: none. Tests: `src/sim/faults/coverage.test.ts`.
- Signatures:
```ts
export function allRules(): Rule[];
export type DetectorStatus = { status: 'static' | 'code' | 'solved'; rules: string[] } | { status: 'diagnostic'; source: string } | { status: 'not-modelled-yet'; reason: string; phase: string };
export function detectorStatus(id: CauseId): DetectorStatus;
```
- Rules for the table: an id with rules in several layers reports the lowest-cost layer first (`static`, then `code`, then `solved`) and lists all rule ids. `bus-device-not-modelled` is `diagnostic` (source `T-B8-01`), `library-not-modelled` is `diagnostic` (source `T-B8-02`). The 27 others are `not-modelled-yet`: 12 from ROB and 14 from DRN plus `motor-stall` (reason "needs the robot physics engine", phase B16); each reason names its phase from the seat column of SIM 13.4 (ROB to B16 and B17, DRN to B18 and B19).
- Validation: a duplicate rule id, a rule whose `causeId` is not in the registry (and not `x-`), or a switched-off rule without `disabledReason` fails the test.
- Edge cases: the two `x-code.` rules count as detected `x-` ids, listed separately in the report.
- Permissions, migration: none. Performance: trivial.

**Verification.**
- `coverage.test.ts`: 45 statuses; counts 16, 2, 27; every rule's cause and symptom resolve; ids unique; the printed table is stable (sorted).
- Acceptance. Given the registry, When `detectorStatus('floating-input')` is read, Then the status is `static` and lists `rule:floating-input@1`. Given `detectorStatus('prop-clash')`, Then `not-modelled-yet`, phase `B18`.
- Observability: the test prints the table that goes into `docs/FAULTS.md`.
- Release blockers: an id without a status.

**Delivery.**
- Done when tests pass; `PORTABLE` passes.
- Verify: `TL`; `npx vitest run src/sim/faults`; `PORTABLE`.
- Documentation: the printed table into `docs/FAULTS.md`.
- Rollback: revert; `defaultRules()` returns the static six again.
- Later tasks need: `allRules`, `detectorStatus` (the gate, T-B10-18; item lint L6).

---

### T-B10-14 Fault authoring in a project and replay of a diagnosis

**Identity.** T-B10-14; FAULTS / authoring; B10; must; group G5; depends on T-B10-09, T-B3-19, T-B8-15, T-B8-16 (the `record.ts` edit follows it), T-B2-16 (headless harness); not started.

**Intent.**
- Problem: a lesson author (Amar) needs to write a fault into a project with a cause and symptoms and leave it off; a learner needs to replay a diagnosis later and see the same symptom. A fault is "recorded in the replay log" (SIM 13.2).
- Target user: Amar as author; a maker coming back to a saved diagnosis.
- User story: As an author, I want to add a named fault to a project and keep it switched off until a lesson turns it on.
- Expected behaviour: `authorFault` writes a `fault.set` operation with `enabled: false` and a cause and symptoms that pass the registry check; the replay record stores the enabled faults and the diagnosis hash; a replay reproduces the same findings; a sealed item's replay hides the cause.
- Success metric: two runs and one replay of the Uno blink example (`uno-blink-d12`) with a `wrong-pin-in-code` fault switched on give equal serial text, equal pin-trace hash and an equal finding list. The same check on the SA-23 example needs B9 and runs in T-B10-13 (step 3).

**Implementation.**
- Existing files: edit `src/studio/tools/break.ts` (T-B10-09: add the `author` gesture and `authorFault`), `src/sim/replay/record.ts` (T-B3-19, T-B8-16: add `faults` to `ReplayRecord`).
- New files: none. Tests: `src/studio/tools/author.test.ts`, `src/sim/replay/record-faults.test.ts`.
- Signatures:
```ts
export function authorFault(doc: Project, f: { kind: Fault['kind']; target: Fault['target']; params?: Fault['params']; cause_id: CauseId; symptom_ids: SymptomId[]; note?: string }): Result<Operation[], { code: 'bad-cause' | 'bad-symptom' | 'no-symptom' | 'limit' | 'unknown-target'; message: string }>;
// ReplayRecord addition
faults: { id: string; kind: Fault['kind']; target: Fault['target']; params?: Fault['params']; atNs: SimTime; causeId?: CauseId }[];   // causeId omitted when the item is sealed and unrevealed
diagnosisHash?: string;                                                     // sha256 of the canonical Diagnosis, when a diagnosis was recorded
```
- Rules. `authorFault` requires a registry or `x-` cause, at least one registry or `x-` symptom (R-119: faults the product ships carry both, finding F7), checks that `faultToOps` accepts the fault on this document (a dry run with `FaultCtx`), generates the id as the generator does, and sets `enabled: false`. Turning a fault on or off is `fault.set` with the flag flipped.
- Replay: `ReplayRecord.faults` lists faults enabled at record time with `atNs: 0` (faults apply at P0). A replay re-enables the same faults before the first tick. The record carries no cause id for a sealed unrevealed item; the diagnosis hash lets the receiver verify a claimed diagnosis without the record saying what it is.
- Validation and errors as in the signature. Edge cases: a schedule-only fault (a drone course `sensorFailures`) is an input, not a stored fault, and is not written here; a fault authored on a sealed item is allowed (the author sees the doc) but the redaction applies to every view.
- Permissions: none. Performance: trivial. Migration: older replay records have no `faults`; readers treat absence as `[]` (record version stays 1 because the field is additive and optional; if T-B3-19 versions strictly, bump to 2 and add a migration, Step 0 decides).

**Verification.**
- `author.test.ts`: cause missing or unknown rejected; no symptom rejected; ids unique; dry run catches `unknown-target`; ops apply through `ProjectSession`; undo removes it.
- `record-faults.test.ts`: record with faults round-trips; replay equals live (the `uno-blink-d12` example with a `wrong-pin-in-code` fault, using the headless harness, seed 7, 5,000 ms; no B9 task needed); sealed item record has no `causeId`; diagnosis hash matches.
- Acceptance. Given `uno-blink-d12` with its `wrong-pin-in-code` fault switched on, When I run twice and replay once, Then serial text and pin-trace hash are equal across the three, and the finding list is equal.
- Observability: hashes shown in the test output.
- Release blockers: a sealed record that exposes the cause.

**Delivery.**
- Done when tests pass and the B3 and B8 replay tests still pass.
- Verify: `TL`; `npx vitest run src/studio/tools src/sim/replay`.
- Documentation: `docs/FAULTS.md` "Authoring a fault".
- Rollback: revert.
- Later tasks need: `authorFault`, `ReplayRecord.faults` (B12 T-B12-11 uses both).

---

### T-B10-18 Corpus gate test

**Identity.** T-B10-18; FAULTS / gate; B10; must; group G5; depends on T-B10-04, T-B10-05, T-B10-06, T-B10-11, T-B10-17, T-B10-21 (check kinds), T-B10-22 (`listCandidates`), T-B10-24, T-B10-25 (its test runs in the verify line), T-B10-28 and T-B10-29 (items files; both are `should`); not started.

**Intent.**
- Problem: the F-029 target and the FAULTS gate checks (PRD after R-130) need one test that decides: 0 false alarms on `clean/`, at least 18 of 20 `broken/` caught, at least 8 distinct rules, the Diagnosis schema test, and no false warning from R-123 on the starter projects.
- Target user: Amar at the phase stop.
- User story: As Amar, I want one command and one table that say whether the faults phase is real.
- Expected behaviour: the test runs every enabled rule on every corpus file, prints a table, and fails on any breach. Thresholds are constants with a comment that only Amar changes them (D-014).
- Success metric: the three numbers hold; the table is pasted into the PR.

**Implementation.**
- Existing files: none changed.
- New files: none (test files only). Tests: `src/sim/faults/corpus.test.ts` (header `// @vitest-environment node`), `src/sim/faults/registry-sweep.test.ts`.
- `corpus.test.ts` steps: load `MANIFEST.json`; for each `clean/` and `broken/` file, validate, build the netlist and sources, run `runRules(allRules(), ...)` for the static and code layers, then run the file headless for its `runMs` (or 5,000 ms) with the seed from the file and feed `runFactsFrom` and `checkOutcomes` to the solved rules. Counting rules: a false alarm is any finding of severity `error` or `warning` on a clean file; "caught" is a finding with `causeId === expectedCauseId` on a broken file; the distinct-rule count is the number of rule ids that account for at least one catch. Constants: `MAX_FALSE_ALARMS = 0`, `MIN_CAUGHT = 18`, `MIN_RULES = 8`, each with the comment "gate numbers are Amar's decision (D-014, RC-48)".
- Report (printed with `console.table` through a helper, not on failure only): totals; one row per rule (fired on clean, caught on broken, skipped counts); per broken slot the catching rules; clean files with an undescribed part (count and list); disabled rules and their reasons; time per file.
- `registry-sweep.test.ts` (the R-119 schema test; header `// @vitest-environment node`): sweeps (1) every `injectable_faults[]` and `failure_modes[]` in `src/parts/data/*.component.json`, (2) the items files `src/content/faults/items-a.en.json` and `items-b.en.json`, read with `node:fs` (a `sim` test cannot import `content`), (3) `listCandidates` over the five example projects and the `clean/` corpus, (4) `checkOutcomes` on a result of each of the two new check kinds (`node-voltage`, `supply-current`, T-B10-21): each `cause_id` is a registry id or `x-`, each has at least one valid symptom id, each `kind` is in the 21-value enum. If an items file is absent (T-B10-28 or T-B10-29 not built, they are `should`), sweep (2) logs `items-a.en.json absent: skipped` and passes for that file; the file's own absence never fails the gate. The sweep of `legacyCause` over the catalogue runs in `src/content/faults/legacy-map.test.ts` (T-B10-25), because a `sim` test cannot import `content`; the verify line below runs both.
- Starter check (R-123 gate): load every template of `src/studio/templates.ts` (T-B4-16; the PRD says 10 starters, the count here is read at run time and printed) and assert zero `error` or `warning` findings from the static and code rules.
- Edge cases: a rule that throws counts as an error and fails the test; a skipped rule is not a failure but a total skip count above 50 percent of checks prints a warning line (HYPOTHESIS: a high skip rate means the descriptors are thin).
- Permissions: reads fixtures only. Performance: under 120 s for the whole corpus (ESTIMATED; the 102 reference runs take 27.8 s unloaded, VERIFIED in the audit). Migration: none.

**Verification.**
- The test is the verification. A mutation check inside the file: a planted rule that fires on every file makes the test fail with "false alarms: n", and a planted no-op rule list fails with "caught: 0" (the file runs these two in-process using `runRules` with substitute rule arrays, so the gate cannot pass vacuously).
- Acceptance. Given the corpus and all rules, When `npx vitest run src/sim/faults/corpus.test.ts` runs, Then false alarms are 0, caught is at least 18 of 20, at least 8 distinct rules each caught at least one file, and the starter check finds nothing. If the numbers are not met the task is not done; the agent writes the numbers into its report and stops, it does not lower a constant.
- Observability: the printed table.
- Release blockers: any of the three numbers breached; a rule switched off without a reason.

**Delivery.**
- Done when both tests pass.
- Verify: `TL`; `npx vitest run src/sim/faults/corpus.test.ts src/sim/faults/registry-sweep.test.ts src/content/faults/legacy-map.test.ts`.
- Documentation: the table goes into `docs/FAULTS.md` and the PR text.
- Rollback: revert; the phase cannot close without it.
- Later tasks need: the numbers, for T-B10-31 and the exit gate.

---

### T-B10-23 Diagnose panel and store

**Identity.** T-B10-23; FAULTS / Studio; B10; must; depends on T-B10-07, T-B10-08, T-B10-12, T-B10-19, T-B10-20, T-B4-02, T-B8-11; not started.

**Intent.**
- Problem: diagnose-first (R-120) needs a panel where the symptom shows, the cause is hidden, the learner measures, notes, picks, and either fixes or gives up; and it can switch to cause-visible at any time.
- Target user: a learner with a sealed item, or a maker with a bug from a buddy.
- User story: As a learner, I want to see what is wrong with the board by measuring, and be told right or wrong without being locked out.
- Expected behaviour: the panel is driven by the reducer of T-B10-07 through a store; wrong picks keep the item open; hints come from the ladder; "Add to notes" pins the latest multimeter reading or a serial line as evidence; the circuit is read-only until the pick for built-wrong items; the fidelity label shows.
- Success metric: a keyboard-only user completes pick, wrong pick, hint, correct pick (the e2e of T-B10-32 and the a11y check).

**Implementation.**
- Existing files: none changed. Uses the store pattern of `src/studio/stores/ui.ts` (T-B4-01), the multimeter of T-B8-11, `HintLadder` (T-B10-08).
- New files: `src/studio/stores/diagnose.ts`, `src/components/studio/DiagnosePanel.tsx`. Tests: `src/studio/stores/diagnose.test.ts`, `src/components/studio/DiagnosePanel.test.tsx`.
- Signatures:
```ts
export interface DiagnoseStore {
  getState(): { session: DiagnoseSession | null; findings: Finding[]; lastRun: RunFacts | null };
  start(item: { spec: DiagnoseSpec; projectId: string }): void;
  dispatch(a: DiagnoseAction): void;                       // runs reduce, then carries out effects
  note(e: Evidence): void;
  setFindings(f: Finding[]): void;
  isSealedUnrevealed(): boolean;                           // read by problems.ts (T-B10-24)
}
// declared in stores/diagnose.ts; method syntax, so the `EventLog` of src/local/events.ts is assignable to it
export interface EventSink { append(kind: string, payload: Record<string, unknown>): Promise<void> }
export function createDiagnoseStore(deps: { log: EventSink; setReadOnly(reason: 'diagnose' | null): void; clock(): number; applyOps(ops: Operation[]): void }): DiagnoseStore;
export function DiagnosePanel(props: { store: DiagnoseStore; ladder: ReturnType<typeof ladderFor>; t: Translate; benchChecked: boolean }): JSX.Element;
```
- Layering: the store file imports nothing from `src/local`. The SYSTEM 5.3 matrix has no studio-to-local edge (studio imports core, project, parts and sim-host), so `EventSink` is declared in the store file and the UI layer injects `appEventLog()` (T-B10-32, `StudioEntry.tsx`). The store test passes a fake sink.
- Effects carried out by the store: `event` goes to `log.append`; `lockEdits` and `unlockEdits` call `setReadOnly` (the editor read-only flag that viewers use; Step 0 finds it in `src/studio/stores/doc.ts`; if it does not exist the store sets the ui store `readOnlyReason`); `revealCause` sets `causeVisible` and drops the redaction; `record` calls `log.append('diagnosis.record', ...)` and hands the record to `DiagnosisRecord`.
- "Symptom cleared" decision (the `cleared` action): after a run, true when no finding with the answer's cause id remains in the latest static, code and solved results, and every visible test of the project passes (if the project has tests). For an injected item the fix is a remedy choice: the learner picks one of 3 to 5 remedies; the correct one calls `applyOps` with `fault.set` `enabled: false`; the next run decides.
- Panel layout: a heading with the state in words (`faults.diagnose.state.*`); the symptom text; the readings shortcuts from `spec.readings`; the notes list with "Add to notes"; Diagnose button; the option list as radio buttons with an optional 3-point confidence (guess, think so, sure); Right or Wrong in a polite live region; Try again; the hint ladder; "Show the cause" (same as Give up, always available); the info line `faults.diagnose.sealedInfo` ("hidden in the app, not encrypted"); the fidelity label; the record when verified or revealed.
- Validation: all state changes go through `reduce`; the panel never computes correctness.
- Error conditions: log append failure never blocks; `applyOps` failure shows the validator message.
- Edge cases: project reopened mid-item restarts the session at `presented` (no persistence of an unfinished item in B10; Q11); a second pick while the live region still announces is queued; the store ignores `note` after `verified`.
- Permissions: none. Performance: trivial. Migration: none.
- Accessibility: every control keyboard-operable; state announced; Right and Wrong shown as words and an icon, never colour alone; radio group labelled.

**Verification.**
- `diagnose.test.ts`: effects carried out in order; wrong pick appends exactly one `diagnose.answer` event with `correct:false` and no evidence entry; `showCause` before the first pick equals Give up; `isSealedUnrevealed` truth table.
- `DiagnosePanel.test.tsx`: renders each state; keyboard flow; Wrong does not disable the list; the label is present; axe-style check with the existing jest-axe setup if present (else the Playwright axe in T-B10-32).
- Acceptance. Given the sealed SA-23 item, When I pick `i2c-missing-pullup`, Then I see Wrong with a reason and may pick again; When I pick `swapped-pins`, Then I see Right and the circuit becomes editable; When the next run shows no `swapped-pins` finding, Then the record shows `hint_level` 0 and outcome `assisted`.
- Observability: events in the local log when on.
- Release blockers: the answer visible in the DOM before reveal (a test greps the rendered HTML for the cause title and the fault id).

**Delivery.**
- Done when tests pass; key scan passes for `DiagnosePanel.tsx`.
- Verify: `TL`; `npx vitest run src/studio/stores src/components/studio/DiagnosePanel.test.tsx src/i18n`.
- Documentation: `docs/FAULTS.md` "Diagnose first".
- Rollback: revert (T-B10-27 and T-B10-32 depend on it).
- Later tasks need: `createDiagnoseStore`, `DiagnosePanel`.

---

### T-B10-27 Transfer question

**Identity.** T-B10-27; FAULTS / learning; B10; could; depends on T-B10-23, T-B10-26, T-B10-28, T-B10-29; not started. Amar may drop it at the stop.

**Intent.**
- Problem: F-021 and R-128: after a fix, one optional question about a similar circuit checks that the idea moved beyond the one circuit.
- User story: As a learner, I want one question after I fix a fault, which I can skip.
- Expected behaviour: in state `verified`, if the item has `spec.transfer`, the panel shows the question with its options; answering shows right or wrong and the reason; skipping is one press; nothing is logged, because R-128 says answering is optional and local and the event list of 4.5 has no kind for it.
- Success metric: 10 of the 40 items carry a transfer question; the component test passes.

**Implementation.**
- Existing files: edit `src/components/studio/DiagnosePanel.tsx` (T-B10-23: render `TransferQuestion` in `verified`), `src/content/faults/items-a.en.json` and `items-b.en.json` (add `spec.transfer` to 5 items each: `{ template, question, options, answer }`; `template` is a starter template id from `src/studio/templates.ts`).
- New files: `src/components/studio/TransferQuestion.tsx`. Tests: `TransferQuestion.test.tsx`; the item data tests of T-B10-28 and T-B10-29 (`src/sim/faults/items-data-a.test.ts`, `items-data-b.test.ts`) gain a case that `answer` indexes into `options` and `options` has 2 to 4 entries.
- Signature: `export function TransferQuestion(props: { transfer: NonNullable<DiagnoseSpec['transfer']>; t: Translate; onDone(): void }): JSX.Element`.
- Rules: the question is about a near variant of the same fault (the same cause on a different template); the correct option is not always first; the text may not name the original item's answer part (lint L1 applied to the question).
- Keys: `diagnose.skip` and `diagnose.transferTitle` are in the contract (4.6), so no copy file is edited. Files: `TransferQuestion.tsx`, `DiagnosePanel.tsx`, `items-a.en.json`, `items-b.en.json` (four).
- Permissions, performance, migration: none.

**Verification.**
- Component test: shows only in `verified`; Skip calls `onDone`; wrong answer shows the reason; keyboard flow.
- Acceptance. Given a verified item with a transfer question, When I press Skip, Then the panel returns to the record and no event is written.
- Release blockers: a question that names the answer of the original item.

**Delivery.**
- Verify: `TL`; `npx vitest run src/components/studio/TransferQuestion.test.tsx src/sim/faults/items-data-a.test.ts src/sim/faults/items-data-b.test.ts src/i18n`.
- Documentation: one line in `docs/FAULTS.md`. Rollback: revert. Later tasks need: none.

---

### T-B10-30 Bench-check sheet (prepares R-130)

**Identity.** T-B10-30; FAULTS / process; B10; should; group G4; depends on T-B10-04, T-B10-06 (the corpus op batches), T-B10-15, T-B10-22, T-B2-07 (`apply` for op batches), T-B2-16; not started.

**Intent.**
- Problem: F-183 and R-130: Amar reproduces the 10 most common faults on a real Uno with a multimeter and records the real symptom next to the simulated one. Two or more mismatches mean the model is wrong and gets fixed before more fault content is written. Today there is no sheet to fill in, and no way for the app to know whether the check was done. The bench work itself is not an agent task (section 9, item 1).
- Target user: Amar, at the bench.
- User story: As Amar, I want a printed list of ten non-destructive faults with the simulated reading beside an empty box for the real one.
- Expected behaviour: a script writes the fixture and a human-readable sheet from the model; a status function reads the fixture and says "not yet checked on hardware" or the counts; the UI label reads the status.
- Success metric: the fixture has 10 rows with `real: null`; the status says `checked: 0`; changing the model makes a test fail until the fixture is regenerated.

**Implementation.**
- Existing files: none changed.
- New files: `scripts/bench-check-sheet.mjs`, `tests/fixtures/bench-check/uno-10.json`, `tests/fixtures/bench-check/README.md`, `src/sim/faults/bench.ts`. Tests: `src/sim/faults/bench.test.ts`.
- The ten faults are chosen by the rule "non-destructive on a real Uno: no part is overdriven": `led-reversed`, `open-connection` (a module `VCC` lifted), `missing-ground` (a module `GND` lifted), `button-no-pulldown` (floating input read with a high-impedance meter), `i2c-missing-pullup`, `swapped-pins` (SDA and SCL exchanged, the scan finds nothing), `wrong-value` (a 10 kOhm resistor in place of 220 Ohm), `part-not-powered` (a 5 V module on 3.3 V), `wrong-pin-in-code`, and `floating-input`. `led-no-series-resistor`, `pin-overcurrent`, `supply-shorted-to-ground` and `output-contention` are excluded as destructive. These ten are a PROPOSAL; Amar may swap rows in the fixture.
- Fixture row: `{ id, cause_id, built: { how: 'candidate' | 'fault-literal' | 'corpus-slot'; ref: string }, setup: string (how to build it), measure: { a: string, b: string, unit: 'V' | 'mA' | 'ohm' }, simulated: { value: number, tier, modelIds }, real: { value: number | null, photo: string | null, date: string | null, board: string | null }, match: boolean | null, note: string | null }`.
- Script: builds each of the ten rows, runs it headless, reads the simulated meter reading, and writes the fixture and the printable sheet (a Markdown table) into the README. `listCandidates` (T-B10-22) has generators for only seven families (open-wire, swap-pins, wrong-value, missing-ground, wrong-pin-in-code, reverse-part, part-fault) and none for `part-not-powered`, `i2c-missing-pullup`, `button-no-pulldown` or `floating-input`. So each row names how it is built (`built.how`):

| Row | Built by |
|---|---|
| `led-reversed` | `listCandidates`, generator `reverse-part` |
| `open-connection` (module `VCC` lifted) | `listCandidates`, generator `open-wire` |
| `missing-ground` | `listCandidates`, generator `missing-ground` |
| `swapped-pins` | `listCandidates`, generator `swap-pins` |
| `wrong-pin-in-code` | `listCandidates`, generator `wrong-pin-in-code` |
| `wrong-value` (10 kOhm for 220 Ohm) | an explicit `Fault` literal in the script: kind `wrong-value`, `params {parameter, value: 10000}` |
| `button-no-pulldown` | the op batch of corpus slot 7 in `broken.spec.json` (T-B10-06), applied with `src/project/apply` |
| `i2c-missing-pullup` | the op batch of corpus slot 11 |
| `part-not-powered` (5 V module on 3.3 V) | the op batch of corpus slot 6 |
| `floating-input` | the op batch of corpus slot 5 |

  A row built from a `Fault` goes through `applyFaults` (T-B10-15); a row built from an op batch is applied to the base document before the netlist is made. `--check` mode regenerates `simulated` only and compares with the committed file.
- `bench.ts`: `benchStatus(fixture): { rows: number; checked: number; mismatches: number; modelWrong: boolean; causesChecked: CauseId[] }` where `modelWrong` is true at 2 or more mismatches (R-130, F-183). `fidelityLabelFor(cause, status)` returns `fidelity.checked` only for causes with a matched row and `fidelity.notChecked` otherwise.
- Validation: a `real` object is either all null or has `value` (a finite number), `photo`, `date` and `board` all set; a mixed object is invalid; `match` is computed by the script from a stated tolerance in the README (10 percent or 0.1 V, ASSUMED, Amar may change it), never typed by an agent.
- Edge cases: a row with `real` set but `match: null` is incomplete and counts as unchecked; photos are file paths under `tests/fixtures/bench-check/photos/` (the folder is created by Amar).
- Permissions: none. Performance: the script takes about 10 s (ESTIMATED). Migration: none.
- This is the first class-A (real-hardware) test set in the sense of REF-6 (PRD R-130), but only once Amar fills it.

**Verification.**
- `bench.test.ts`: fixture shape; `simulated` equals a fresh simulation within 1e-6 (so a model change forces a regeneration); status with all `real: null` is `checked: 0, modelWrong: false`; with 2 planted mismatches `modelWrong: true`; `fidelityLabelFor` returns `notChecked` for every cause today; a fixture with one complete `real` object is accepted and one with a half-filled `real` is rejected; the ten rows cover the ten cause ids listed above and each `built.how` names a source that exists.
- Acceptance. Given the committed fixture, When the app asks for the label of `swapped-pins`, Then it gets `fidelity.notChecked`. Given Amar fills the row and the values match, Then the label for that cause becomes `fidelity.checked`. The task report states that all ten `real` objects are null.
- Observability: the status is shown in `DiagnosisRecord` (T-B10-10) via T-B10-32.
- Release blockers: a `real` object that is half filled (the test checks that every `real` is all null or has `value`, `photo`, `date` and `board` all set, so it still passes after Amar fills the rows); a `match` set while `real` is not complete. That the agent never fills `real` or `match` is a rule in the agent's task report ("all ten `real` objects are null in my commit"), not a test: a test that forbade non-null `real.value` would fail after Amar does his bench work.

**Delivery.**
- Done when tests pass and the sheet is printable (Markdown table).
- Verify: `TL`; `npx vitest run src/sim/faults/bench.test.ts`; `node scripts/bench-check-sheet.mjs --check` (exits 0 when the committed `simulated` values equal a fresh run).
- Documentation: the README is the sheet.
- Rollback: revert.
- Later tasks need: `benchStatus`, `fidelityLabelFor`.

---

### T-B10-33 I2C scan instrument

**Identity.** T-B10-33; FAULTS / instrument (added for SA-23); B10; must; depends on T-B10-24, T-B9-01, T-B9-02, T-B8-15, T-B8-20; not started.

**Intent.**
- Problem: SA-23 says: "the Studio I2C scan (a read-only bus master issuing an address probe for 0x08 to 0x77) finds 0 of 112 addresses". No roadmap task builds it (VERIFIED: grep for "scan" finds none). Without it the swapped-pins symptom has no visible evidence on the bus.
- Target user: a maker whose I2C device "does not respond".
- User story: As a maker, I want to press Scan and see which addresses answer.
- Expected behaviour: Scan probes 0x08 to 0x77 on a forked copy of the simulation state, so the running simulation and its trace hash are untouched; it lists responding addresses, the count of probed addresses (112), and says which pins it used.
- Success metric: healthy env-monitor finds the BME280 (0x76) and the SSD1306 (0x3C); with `flt_swap` it finds 0 of 112.

**Implementation.**
- Existing files: edit `src/sim-host/protocol.ts`, `src/sim-host/host.ts`, `src/sim-host/sim.worker.ts` (T-B3-13, T-B10-24): add `{ t: 'i2c-scan'; bus?: string }` and `{ t: 'scanned'; bus: string; sda: string; scl: string; probed: number; found: number[] }`.
- New files: `src/sim/bus/scan.ts`, `src/components/studio/instruments/I2cScan.tsx`. Tests: `src/sim/bus/scan.test.ts`, `src/components/studio/instruments/I2cScan.test.tsx`. (`InstrumentDock.tsx` is edited in T-B10-32.)
- Signatures:
```ts
export function scanBus(snapshot: OrchestratorSnapshot, restore: (s: OrchestratorSnapshot) => ScanSession, opts?: { bus?: string; from?: number; to?: number }): { sda: string; scl: string; probed: number; found: number[] };
export interface ScanSession { probe(addr: number): 'ack' | 'nack'; pins(): { sda: string; scl: string }; dispose(): void }
```
- Algorithm: take a snapshot (T-B8-15), restore it into a second orchestrator instance, issue a write-address phase for each address 0x08 to 0x77 (112) as a master on the bus the sketch bound with `Wire.begin` (T-B9-02) or the board default pins if none, record ACK or NACK, discard the instance. The main run is not stepped, so the pin-trace hash does not change.
- Rules: the scan never starts when the bus has no master pins (message `no pins bound`); it caps at 112 probes and 2 s of wall time through the watchdog (T-B3-14); results are sorted ascending.
- Errors: restore failure returns an error with the T-B8-15 message. Edge cases: a bus held low gives 0 found and the evidence says `stuck-low` (T-B9-01 bus events); a swapped bus with pull-ups gives NACK, not stuck-low (SIM 13.4 symptom note).
- Permissions: none. Performance: ESTIMATED under 50 ms (112 address phases at 100 kHz virtual time are about 112 x 0.2 ms of simulated time).
- Accessibility: the result is a table with an address column and a status column in text; a live region announces the count.

**Verification.**
- `scan.test.ts`: healthy env-monitor finds `[0x3c, 0x76]` (requires T-B9-04; the test uses the headless harness); swapped finds `[]`; the snapshot's trace hash before and after the scan is equal; unbound pins give the `no pins bound` error.
- `I2cScan.test.tsx`: table, live region, button disabled while scanning.
- Acceptance. Given the SA-23 faulted run, When I press Scan, Then the table shows "0 of 112" and the pins `GPIO21` and `GPIO22`.
- Observability: result table; the finding evidence of `code:wire-begin-pins@1` can add the scan result as a `state` entry.
- Release blockers: any change of the main run's hash after a scan.

**Delivery.**
- Done when tests pass; the sim-host tests (SA-01) still pass.
- Verify: `TL`; `npx vitest run src/sim/bus src/sim-host src/components/studio/instruments`; `PORTABLE`.
- Documentation: `docs/FAULTS.md` "I2C scan".
- Rollback: revert.
- Later tasks need: the `i2c-scan` message and `I2cScan` (mounted in T-B10-32).

---

### T-B10-32 Fault dock, commands and mounting

**Identity.** T-B10-32; FAULTS / Studio; B10; must; depends on T-B10-09, T-B10-10, T-B10-23, T-B10-24, T-B10-33, T-B10-30; not started.

**Intent.**
- Problem: the panels exist as components; the person must reach them from the editor, and the pieces must be wired: the sealed flag to the Problems producer, the bench status to the record label, the I2C scan to the instrument dock, the "Check circuit" and "Why isn't it working" actions to commands. T-B10-24 is plumbing only, so this task also owns what the person sees of the static check: the idle-task trigger, the Check button with its disabled state, and the footer counts.
- Target user: every user of the fault features.
- User story: As a maker, I want one place in Studio for Break it, Check circuit and Diagnose, and keyboard commands for each.
- Expected behaviour: a "Faults" dock loads on demand (it costs nothing until opened, ADR-0800), holds Break it, Check, Diagnose (when the project has a sealed item or a stored fault is on) and the record; commands `faults.break`, `faults.check`, `faults.explain`, `faults.restore`, `faults.hint` appear in the command list.
- Success metric: the e2e specs pass with 0 axe violations on the dock.

**Implementation.**
- Existing files (five source files with the new one): `src/components/studio/StudioEntry.tsx` (T-B4-01, T-B8-20: mount the dock lazily; the lazy-loading guide `node_modules/next/dist/docs/01-app/02-guides/lazy-loading.md` is read first, as the roadmap's section 2.1 requires; create the diagnose store with `appEventLog()` as its `EventSink`; run the idle-task trigger), `src/studio/commands.ts` (T-B4-02: register the five commands), `src/components/studio/InstrumentDock.tsx` (T-B8-20: add `I2cScan`), `src/components/studio/Problems.tsx` (T-B4-17: a Check button, a footer line with the skip and error counts), and the new `src/components/studio/FaultDock.tsx`.
- Tests: `FaultDock.test.tsx`, `Problems.test.tsx` (extend); Playwright `e2e/break-it.spec.ts` (a test file, not counted).
- Idle trigger (in `StudioEntry.tsx`): after each applied batch, schedule one idle task (`requestIdleCallback`, with a 200 ms timeout fallback where it is missing) that calls `host.staticCheck(net, sources)` through the run session bridge (`src/studio/run/session.ts`, T-B4-13) and passes the result to `staticProblems`. A newer batch cancels the pending task. Layering: the diagnose store file (`src/studio/stores/diagnose.ts`) imports nothing from `src/local`; `StudioEntry.tsx` and `BreakIt.tsx`, which are components, call `appEventLog()`.
- Check button (in `Problems.tsx`): props `onCheck(): void`, `checkDisabled: boolean`, `counts: { skipped: number; errors: number }`. It is a native `button` labelled by `check.run`. `checkDisabled` is true while the diagnose store reports `isSealedUnrevealed()` (the rules would reveal the cause), while a check is running, or when the worker is not ready; a disabled button also shows its reason as text. The footer reads `check.found`, `check.skipped` with the counts, as text, never by colour.
- Wiring: the diagnose store's `isSealedUnrevealed` goes to `staticProblems` and to `checkDisabled`; `messages.faults` is passed to the dock as a prop and no wider (contract 4.6); `benchStatus` from the committed fixture goes to `DiagnosisRecord`; the monitor's `findings` events (T-B10-24) go to the diagnose store's `setFindings` and to Problems; "Check circuit" calls `host.staticCheck`; Explain from Break it opens the record; the dock hides stored faults while sealed (the redaction of T-B10-19 is applied to the dock's own list).
- `e2e/break-it.spec.ts` scenarios (keyless, `E e2e/break-it.spec.ts`): (1) open the Uno blink starter, press Break it then Surprise me, run, press Explain, see a cause title and one evidence row, press Restore, run again, serial output equals the first run's; (2) open a project with a variant with the resistor removed, wait for the idle check, see "LED with no series resistor" in Problems with the highlight and the footer counts, press Check circuit and see the same list; open a sealed buddy copy and see an empty list and a disabled Check button; (3) keyboard only through scenario 1 with an axe scan of the dock (same pattern as T-B4-20).
- Edge cases: opening a project with a sealed item starts the diagnose store; closing Studio mid-item drops the session; the dock never loads when the browser has no Worker support (message in text).
- Permissions: none. Performance: the dock chunk loads only on first open; its size is recorded in the PR (target under 40 KB gzip, ESTIMATED).
- Migration: none.

**Verification.**
- `FaultDock.test.tsx`: mounts lazily; commands registered; sealed flag reaches the producer (a spy). `Problems.test.tsx`: the Check button calls `onCheck`; with `checkDisabled` it is disabled and shows its reason as text; the footer shows the skip and error counts as text; a batch followed by an idle tick calls `staticCheck` once and a second batch before the tick cancels the first (fake timers).
- Playwright: the three scenarios above.
- Acceptance. Given a project with an LED wired straight to a pin, When the idle task finishes, Then the Problems pane lists "LED with no series resistor" with the pin and LED highlighted. Given a sealed unrevealed item, Then the list is empty and Check is disabled. Given Studio with the Uno blink starter, When I follow scenario 1 with the keyboard, Then every control is reachable, the live region announces Applied and Restored, and axe reports 0 violations.
- Observability: none beyond the UI.
- Release blockers: an axe violation; the cause visible on the dock of a sealed item.

**Delivery.**
- Done when unit and e2e pass.
- Verify: `TL`; `npx vitest run src/components/studio src/studio src/architecture.test.ts`; `E e2e/break-it.spec.ts`.
- Documentation: `docs/FAULTS.md` "Where it is in Studio".
- Rollback: revert; panels stay unmounted.
- Later tasks need: the mounted dock (T-B10-13).

---

### T-B10-13 SA-23 walkthrough

**Identity.** T-B10-13; FAULTS / acceptance; B10; must; depends on T-B10-05, T-B10-14, T-B10-32, T-B10-33, and B9 tasks T-B9-01, T-B9-02, T-B9-04, T-B9-05, T-B9-06 (finding F1); not started.

**Intent.**
- Problem: SA-23 is the phase's end-to-end proof: the BRIEF 30 walkthrough, healthy and with the swapped-pins fault, ending in the diagnosis record `{cause_id:'swapped-pins', symptom_id:'i2c-no-ack', evidence:[...], hint_level:0}`.
- User story: As Amar, I want one test that shows the whole idea working on a circuit the authors never tuned for.
- Success metric: the spec passes twice in a row and the two runs give identical serial text and pin-trace hash.

**Implementation.**
- Existing files: none changed.
- New files: `e2e/diagnose.spec.ts`, `e2e/fixtures/env-monitor-esp32.project.json` (a copy of `04_ARCHITECTURE/schemas/examples/env-monitor-esp32.project.json` at the time of the task, so the spec does not depend on the docs folder). A planned copy test compares the two files' canonical hashes and fails if the docs example changes without the fixture (the failure message says to copy it).
- Spec steps (runtime `rtm_esp`, interpreter, seed 7, 5,000 ms of simulated time, run as fast as possible, T-B8-14):
  1. Healthy: open the project from file; run; assert `c1` passes at 200 ms (`net_3v3` between 3.2 and 3.4 V through the board power entry, T-B9-05); serial shows `boot` then at least 3 lines matching `^T=-?[0-9]+\.[0-9] H=[0-9]+$` by 4,000 ms and at least one matching `^T=30\.` by 4,500 ms; the OLED framebuffer holds text (read through the accessible text the display overlay exposes, T-B4-14; Step 0 confirms the hook); Check circuit lists no `error` or `warning`.
  2. Faulted: turn on `flt_swap` from the "In this project" list of Break it (stored, off by default); run; assert no `T=` line, serial shows `boot` then `BME280 not found`; press Scan: 0 of 112; the Problems pane or Explain shows the record `swapped-pins` with `i2c-no-ack`; the evidence holds a `serial-line` entry `BME280 not found`, `pin-level` entries for GPIO21 and GPIO22 with their nets, and a `net-voltage` entry for both lines high; `hint_level` 0; no `bus-device-not-modelled` and no silent value (the spec asserts neither text appears).
  3. Determinism: run twice; serial text and pin-trace hash equal; the hash is read from the replay record export (T-B3-19), not from the page. Then replay the faulted record (`ReplayRecord.faults`, T-B10-14): the serial text, the pin-trace hash and the finding list equal the live run. (T-B10-14 proves replay on the Uno blink example only, because the SA-23 replay needs B9.)
  4. Diagnose-first variant: seal the faulted project for a buddy (Break it for a buddy), open the sealed copy, assert the fault list and Problems pane do not show the cause, pick `i2c-missing-pullup` (Wrong), open hint 1, pick `swapped-pins` (Right), assert the record has `hint_level` 1.
  5. Restore: Restore the author fault off; run; the healthy lines return.
- Error conditions: if a B9 prerequisite is missing, the spec fails at the step that needs it and the failure message names the B9 task (the spec has a pre-flight that checks for the bus model, the BME280 library and the power entry by their registry ids and prints which are absent).
- Permissions: none. Performance: the whole spec under 60 s with a prebuilt app (ESTIMATED).
- Migration: none.

**Verification.**
- The spec is the verification; it runs on Chromium and, if the WebKit project of T-B3-21 exists, on WebKit too.
- Acceptance: the Given/When/Then of SA-23, steps 1 to 5 above.
- Observability: Playwright trace on failure.
- Release blockers: a failure at any step; a hash difference between the two runs.

**Delivery.**
- Done when `E e2e/diagnose.spec.ts` exits 0.
- Verify: `TL`; `KL NEXT_DIST_DIR=.next-build npx playwright test e2e/diagnose.spec.ts`; then `KL npm run check`, and compare the failing test files with the audit baseline (section 3.1; only a new failing file blocks). The orchestrator pastes the SA-23 result into T-B10-31 (G8).
- Documentation: the SA-23 result goes into the PR text; T-B10-31 (G8, after this task) records it in `docs/FAULTS.md`.
- Rollback: revert.
- Later tasks need: none in this phase.

---

### T-B10-31 `docs/FAULTS.md`

**Identity.** T-B10-31; FAULTS / docs; B10; must; group G8 (alone: it depends on every other B10 task, including T-B10-13 whose SA-23 result it records); not started.

**Intent.** The roadmap card names `docs/FAULTS.md`: ids, detectors, what is not checked against hardware. A maker or contributor should learn how to add a cause, a rule or a corpus file from it.

**Implementation.**
- New file: `docs/FAULTS.md`. Sections: what a fault, failure, symptom and diagnosis are (SIM 13.1); the 21 stored kinds and their ops; the cause table with detector status (printed by T-B10-11); the rule table with thresholds and the EXTERNAL label on the I2C numbers; the generators; hidden cause and its limit ("hidden in the app, not encrypted"); hints; the record file; what is logged and the opt-in; the corpus and how to add a broken circuit; the gate numbers from T-B10-18; the bench check and the sentence "Not checked against hardware" until T-B10-30's fixture is filled; how to add a cause id (a code change plus a schema test, R-119); known gaps (section 11).
- Style: short sentences, tables, no em dashes, no "validated" or "certified".
- Edit `docs/FAULTS.md` only; do not edit the master plan.

**Verification.** A docs task has no test file. Three commands prove it, each with a stated exit code:
- `! grep -niE "validated|certified|$(printf '\342\200\224')" docs/FAULTS.md` exits 0 when the file contains no banned word and no em dash (the `printf` writes the em dash character as its three bytes, so this plan file stays free of the character). (A bare `grep` exits 1 when it finds nothing, which is the passing case, so the leading `!` is part of the command.)
- `grep -oE '(src|e2e|scripts|tests)/[A-Za-z0-9_./-]+' docs/FAULTS.md | sort -u | xargs ls` exits 0 only when every path the document names exists. The document therefore writes paths without a trailing full stop or glob, and does not name a path of a task that was not built (for example a skipped `could` task).
- `node scripts/copy-check.mjs` (T-B4-15 and T-B20-14 own it) if the script exists; otherwise the first command is the copy check.

**Delivery.** Done when the three commands exit 0 and the SA-23 result from T-B10-13 and the corpus table from T-B10-18 are in the file. Verify: the three commands above (`npm run typecheck && npm run lint` proves nothing for a docs file and is not part of this task). Rollback: delete the file. Later tasks need: it is the hand-off for B11, B12 (T-B12-11 uses B10 faults) and B14.

## 7. Parallel groups

Tasks in the same group touch disjoint files (checked against section 8) and can be built by separate agents at once. Groups run in order. A task's dependencies inside B10 are all in earlier groups. Dependencies on B2 to B9 are outside this table and are listed in each task.

| Group | Tasks | Why they can run together | What must be green before the next group |
|---|---|---|---|
| G1 | T-B10-00, T-B10-01, T-B10-16, T-B10-19, T-B10-20, T-B10-21 | Six unrelated file sets: spike folder, fault types and ops, registries, seal, event log, check kinds. T-B10-01 owns every type the rules need (4.1), so G1 compiles alone. | `TL`; `npx vitest run src/sim/faults src/local src/lib/interp src/project/examples.test.ts`; T-B10-00 verdict read |
| G2 | T-B10-02, T-B10-03, T-B10-06, T-B10-07, T-B10-12, T-B10-15, T-B10-25, T-B10-26 | Models, rule runner, corpus, session, copy, apply, legacy map, items: eight disjoint file sets. T-B10-06 waits for the T-B10-00 verdict. | `TL`; `npx vitest run src/sim/faults src/i18n src/content/faults src/components/boardlab src/components/robotics`; `node scripts/fault-corpus.mjs --check` |
| G3 | T-B10-04, T-B10-05, T-B10-08, T-B10-10, T-B10-17, T-B10-22, T-B10-28, T-B10-29 | Solved detectors, code detectors, hints, record, part rules, generator (needs T-B10-03), two item files: disjoint. | `TL`; `npx vitest run src/sim/faults src/components/studio src/export` |
| G4 | T-B10-09, T-B10-11, T-B10-23, T-B10-24, T-B10-30 | Break it (needs 03, 04, 22), rule assembly and coverage, diagnose store and panel, worker messages and Problems producer (plumbing), bench sheet. T-B10-11 owns `rules.ts` and `causes.ts` alone; T-B10-24 owns the three sim-host files alone. | `TL`; `npx vitest run src/sim src/sim-host src/studio src/components/studio` |
| G5 | T-B10-14, T-B10-18, T-B10-27, T-B10-33 | Authoring and replay (edits `break.ts` and `record.ts`, needs 09), gate test (tests only), transfer question, I2C scan (owns the three sim-host files in this group). | the corpus gate numbers; `TL`; `npx vitest run src/sim src/sim-host src/studio src/components/studio src/content/faults` |
| G6 | T-B10-32 | Mounts everything in `StudioEntry.tsx`, `commands.ts`, `InstrumentDock.tsx`, `Problems.tsx`; alone because it touches the shared Studio shell. | `TL`; `E e2e/break-it.spec.ts` |
| G7 | T-B10-13 | The SA-23 spec. Alone in its group so that T-B10-31 can record its result. | `E e2e/diagnose.spec.ts` |
| G8 | T-B10-31 | The document. It depends on every other B10 task, so no other task shares its group. | the three commands of T-B10-31; then `KL npm run check` |

Exit sequence after G8: `KL npm run check`; list the failing test files and compare them with the baseline of section 3.1 (only a new failing file blocks); paste the corpus table (T-B10-18) and the SA-23 result into the PR text; stop for Amar's OK; the orchestrator makes the local tag `phase-B10`.

## 8. File ownership

Each row names the task that creates or edits the file and its group. A file with more than one row is edited by tasks in different groups only. Test files belong to the task that names them and are not listed.

| File | Task (group) |
|---|---|
| `docs/MASTER_PLAN/08_RESEARCH_SPIKES/RS-B10-corpus-coverage/REPORT.md`, `coverage.mjs` | T-B10-00 (G1) |
| `src/sim/faults/types.ts` (including `NetView`, `CodeFacts`, `RunFacts`) | T-B10-01 (G1) |
| `src/sim/faults/ops.ts` | T-B10-01 (G1) |
| `eslint.config.mjs`, `src/architecture.test.ts` (matrix exception; default Yes unless the register says No) | T-B10-01 (G1) |
| `04_ARCHITECTURE/schemas/project.schema.json` (only if the four kinds are absent) | T-B10-01 (G1) |
| `src/sim/faults/symptoms.ts`, `src/sim/faults/causes.ts` | T-B10-16 (G1); `causes.ts` again T-B10-11 (G4) |
| `04_ARCHITECTURE/schemas/examples/*.project.json`, `examples/components/*.component.json` (symptom ids) | T-B10-16 (G1) |
| `src/project/examples.test.ts` (expected hashes; an existing test file of T-B2-15, a test file of this task) | T-B10-16 (G1) |
| `src/sim/faults/seal.ts` | T-B10-19 (G1) |
| `src/local/events.ts` (`src/lib/telemetry/kinds.ts` is not edited) | T-B10-20 (G1) |
| `src/content/schema.ts` (Check union, RunTrace), `src/lib/interp/checks.ts` | T-B10-21 (G1) |
| `src/sim/faults/models.ts`, `expr.ts`, `data/failure-models.json`, `src/sim/registry/entries.ts` | T-B10-02 (G2) |
| `src/sim/faults/netlist-view.ts`, `static.ts` | T-B10-03 (G2) |
| `src/sim/faults/rules.ts` | T-B10-03 (G2); T-B10-11 (G4) |
| `scripts/fault-corpus.mjs`, `tests/fixtures/fault-corpus/**` | T-B10-06 (G2) |
| `src/sim/faults/diagnose.ts`, `evidence.ts` | T-B10-07 (G2) |
| `src/i18n/namespaces.ts` (array and `Messages` map), `src/i18n/messages/{en,es,fr,de,zh,hi}/faults.json` | T-B10-12 (G2) |
| `src/sim/faults/apply.ts`, `code-pin.ts` | T-B10-15 (G2) |
| `src/content/faults/legacy-map.ts`, `src/components/boardlab/FailurePanel.tsx`, `src/components/robotics/FaultsPanel.tsx` | T-B10-25 (G2) |
| `src/sim/faults/items.ts` | T-B10-26 (G2) |
| `src/sim/faults/run-facts.ts`, `solved.ts`, `monitor.ts`, `src/sim/orchestrator.ts` (only if no observer hook exists) | T-B10-04 (G3) |
| `src/sim/faults/code-facts.ts`, `code.ts` | T-B10-05 (G3) |
| `src/sim/faults/hints.ts`, `src/components/studio/HintLadder.tsx` | T-B10-08 (G3) |
| `src/export/diagnosis.ts`, `src/components/studio/DiagnosisRecord.tsx` | T-B10-10 (G3) |
| `src/sim/faults/static-power.ts`, `static-bus.ts` | T-B10-17 (G3) |
| `src/sim/faults/generate.ts` | T-B10-22 (G3) |
| `src/content/faults/items-a.en.json` | T-B10-28 (G3); T-B10-27 (G5) |
| `src/content/faults/items-b.en.json` | T-B10-29 (G3); T-B10-27 (G5) |
| `src/studio/tools/break.ts` | T-B10-09 (G4); T-B10-14 (G5) |
| `src/components/studio/BreakIt.tsx` | T-B10-09 (G4) |
| `src/studio/stores/diagnose.ts`, `src/components/studio/DiagnosePanel.tsx` | T-B10-23 (G4); `DiagnosePanel.tsx` again T-B10-27 (G5) |
| `src/sim-host/protocol.ts`, `host.ts`, `sim.worker.ts` | T-B10-24 (G4); T-B10-33 (G5) |
| `src/studio/problems.ts`, `src/studio/overlays/netlist.ts` | T-B10-24 (G4) |
| `scripts/bench-check-sheet.mjs`, `tests/fixtures/bench-check/**`, `src/sim/faults/bench.ts` | T-B10-30 (G4) |
| `src/sim/replay/record.ts` | T-B10-14 (G5) |
| `src/components/studio/TransferQuestion.tsx` | T-B10-27 (G5) |
| `src/sim/bus/scan.ts`, `src/components/studio/instruments/I2cScan.tsx` | T-B10-33 (G5) |
| `src/components/studio/FaultDock.tsx`, `StudioEntry.tsx`, `src/studio/commands.ts`, `src/components/studio/InstrumentDock.tsx`, `src/components/studio/Problems.tsx` | T-B10-32 (G6) |
| `e2e/break-it.spec.ts` | T-B10-32 (G6) |
| `e2e/diagnose.spec.ts`, `e2e/fixtures/env-monitor-esp32.project.json` | T-B10-13 (G7) |
| `docs/FAULTS.md` | T-B10-31 (G8) |
| `src/sim/faults/corpus.test.ts`, `registry-sweep.test.ts` (tests only) | T-B10-18 (G5) |
| `src/sim/faults/items-data-a.test.ts`, `items-data-b.test.ts` (tests; they sit in `sim` and read the JSON with `node:fs`) | T-B10-28 (G3), T-B10-29 (G3) |

Source-file count per task (tests not counted; deleted files none): T-B10-00: 0 (spike files outside `src`); 01: 2 plus the matrix edit of 2 config files (4), plus the schema file only in a separate preceding commit if needed; 02: 4; 03: 3; 04: 3 (4 with the orchestrator edit); 05: 2; 06: 2 plus a data set; 07: 2; 08: 2; 09: 2; 10: 2; 11: 2; 12: 2 (`namespaces.ts` and the JSON set); 13: 1; 14: 2; 15: 2; 16: 2 plus a data set (`src/project/examples.test.ts` is a test file); 17: 2; 18: 0; 19: 1; 20: 1 (`events.ts` only; `kinds.ts` is not edited); 21: 2; 22: 1; 23: 2; 24: 5 (the three sim-host files, `problems.ts`, `overlays/netlist.ts`); 25: 3; 26: 1; 27: 4; 28: 1; 29: 1; 30: 3 plus a data set; 31: 1; 32: 5 (`StudioEntry.tsx`, `commands.ts`, `InstrumentDock.tsx`, `Problems.tsx`, `FaultDock.tsx`; the e2e spec is a test file); 33: 5. None exceeds 5.

## 9. For Amar (not agent tasks)

| # | Item | Why only Amar | When |
|---|---|---|---|
| 1 | R-130 and F-183: build the ten non-destructive faults of `tests/fixtures/bench-check/uno-10.json` on a real Uno with a multimeter, write the real reading, a photo path and the date beside the simulated one. Two or more mismatches mean the model is wrong and the fault content waits (roadmap section 6 item 3) | Needs a board, hands and a meter. An agent filling it in would make a false claim | After B10, before relying on any diagnosis claim |
| 2 | Add real broken circuits you have met to the corpus: one line each in `broken.spec.json` (roadmap section 6 item 8). The 20 agent-written files may share the agent's blind spots (risk R2) | Judgement from real mistakes | At the phase stop; again after B11 |
| 3 | Review the 40 draft items: read each symptom, answer, distractors, ladder and explanation; set `review.status` to `reviewed` with a source (own reasoning, datasheet or bench), or leave `model-only`. Only you set `reviewed` (R-129). ESTIMATED 20 to 40 minutes per item, 13 to 27 hours for 40 (EDUCATION) | Only the reviewer can back a cause | After T-B10-28 and T-B10-29; items stay drafts until then |
| 4 | Read the five non-English `faults.json` files, or ask a buddy who reads those languages | Machine-quality translation (HYPOTHESIS) | Before publishing |
| 5 | Screen-reader pass of Break it, the Diagnose panel, the hint ladder and the record (extends roadmap section 6 item 8) with NVDA or VoiceOver | Needs assistive technology and judgement | At the phase stop |
| 6 | Read the I2C specification table behind `I2C_LIMITS` (rise time and sink current) and confirm or change the numbers | The numbers are EXTERNAL and were not read in this step | Before trusting `rule:i2c-pullup-value@1` |
| 7 | Answer the open questions of section 10 (Q2, Q3, Q5, Q7, Q9 first). A default in section 10 is binding for the agents unless the answer is recorded in `DECISION_REGISTER.md`; the orchestrator records Q2 as a register row before G1 starts | Decisions are his | Q2 recorded before G1 starts; the rest by the phase stop |

## 10. Open questions

| # | Question | Default this plan uses | Cost of the other answer |
|---|---|---|---|
| Q1 | The roadmap card lists 14 tasks. This file has 34. May the orchestrator raise the B10 count and the total (341 to 361) and the effort (roadmap 4 / 6 / 9 weeks; this plan ESTIMATES 5 / 8 / 12 for 34 tasks, because 12 tasks are small and seven are tests, data or text) | Yes | none; the roadmap needs a row update |
| Q2 | May `src/studio` and `src/components` import `src/sim/faults/**` (pure rules, types, reducer, generator)? SYSTEM 5.3 lists no such edge, and the roadmap's own T-B8-04 (ModelsPanel from the registry) needs the same exception for `src/sim/registry`. Edit: the SYSTEM matrix, ADR-0400, `eslint.config.mjs`, `src/architecture.test.ts` | Yes, for these two folders only (T-B10-01 part B). Binding for the agents unless `DECISION_REGISTER.md` has a Q2 row that says No | Route every call through the worker: three more messages and an async store, ESTIMATED +1 week, and the reducer and hints would move to a module `studio` may import |
| Q3 | EDUCATION 6.6 lost rows 6 to 10 of the broken table. Rows rebuilt here: `part-not-powered`, `button-no-pulldown`, `open-connection`, `swapped-pins`, `wrong-pin-in-code`. Right? | Yes | the spec file changes; no code |
| Q4 | Should T-B10-21 (`node-voltage` and `supply-current` checks) move to B8 where the solver outputs are built? | Stay here so B10 is complete | one task moves; the order inside the roadmap changes |
| Q5 | The local log is opt-in and default off (R-009, ADR-0106). R-119 wants the record "written to the local event log". Default when the switch is off: keep the record in the session and export only | Yes | on by default means a local ring buffer of 5,000 rows nobody asked for; it never leaves the machine |
| Q6 | Extension ids proposed: `x-code.serial-baud-mismatch`, `x-code.pin-mode-wrong`, `x-npn.overheat`, `x-supply-overvoltage`, `x-pot.track-overpower`, `x-diode.overcurrent`, and the catalogue ones of EDUCATION 6.6 (`x-intermittent-connection`, `x-boot-strap-level`, `x-logic-level-mismatch`, `x-wrong-config`, `x-thermal-shutdown`, `x-missing-part`, `x-missing-decoupling`). Accept as `x-` ids until promoted? | Yes | each needs a core id added to SIM 13.4 (a code change plus a schema test) |
| Q7 | SIM 13.2 `stuck` has `part` and `level` and no pin, but `stuck-level` and `boot-strap` faults name a pin. Add an optional `pin` to `stuck` in SIM 13.2 and `types.ts`? | Yes | a pin-level stuck fault cannot be expressed; two stored kinds lose their op |
| Q8 | Nine of the 40 items (cold-solder, boot-strap, level-mismatch) have `x-` causes with no detector, so they can be `model-only` only. Keep the quota (they are good read-only explanations) or add nine detectors later? | Keep the quota | nine detectors are new work; ESTIMATED 1 to 2 weeks |
| Q9 | PDM 5.11 says Restore "disables" the fault and the hash "returns". Disabling leaves a stored disabled fault, so the hash would differ. This plan makes Restore remove a fault Break it added (hash equal) and disable a fault the author wrote. Right? | Yes | a different hash rule in R-125, or a leftover disabled fault after every Break it |
| Q10 | Code detectors read Arduino C++ only. MicroPython `Pin(n)` and Verilog are not covered in B10. Accept? | Yes | one more task for MicroPython pin facts, ESTIMATED 2 to 3 days |
| Q11 | An unfinished diagnose item is not saved across a reload. Save it? | No | a persistence record in the progress store (B12 owns it) |
| Q12 | Symptom ids: kebab (SIM 13.4, SA-23) against dotted (the example files). This plan renames the example files. Right? | Yes | the SA-23 assertion and the registry change to dotted ids |
| Q13 | F-018 says diagnose-first on the legacy figure path first. B12 and B13 delete that path, so this plan builds diagnose-first only in Studio and only tags and logs the legacy panels. Accept? | Yes | a bridge-based diagnose mode on 38 figures that B12 then deletes, ESTIMATED 1 to 2 weeks wasted |
| Q14 | R-126 says the diagnosis "offers to fix either". The code fix is an operation. The wiring fix is text, because moving a leg is a hole-level edit the tool set does not expose as one batch yet. Accept? | Yes | a `wireRecipe`-based fix op, ESTIMATED 2 to 3 days after B4 tools are read |

## 11. Risks and gaps

| # | Risk or gap | Evidence | Mitigation in this plan |
|---|---|---|---|
| 1 | False alarms on valid circuits (roadmap R1) | rules run on circuits the authors never saw | zero-false-alarm gate on `clean/`; every rule skips what it cannot see and counts the skip; a rule that alarms is switched off with a reason |
| 2 | The 18 of 20 margin is one file. Seventeen slots are caught by static or code rules; slots 12, 13 and 15 need solved states from T-B8-06 | rule table 4.3, "Catches" column | T-B10-00 checks the slots first; T-B10-04 is tested against the B8 states early; Amar adds files (section 9, item 2) |
| 3 | The 20 broken files are written by an agent (roadmap R2) | the roadmap card | the spec is data, one line per file, easy to extend; Amar's own broken circuits are the real test |
| 4 | Claims of realism before the bench check (roadmap R3) | no bench data exists | `fidelity.notChecked` on every diagnosis; T-B10-30 and R-130 |
| 5 | Only seven part descriptors exist when B10 starts, so many `clean/` files have undescribed parts and the rules skip them | T-B2-12 list; B11 converts the other 22 parts | T-B10-00 counts it; the gate prints the count; re-run the gate after B11 |
| 6 | SA-23 needs five B9 tasks and an I2C scan nobody had planned | findings F1 and T-B10-33 | stated dependencies; pre-flight in the spec that names the missing task |
| 7 | Predecessor names are not built yet, so signatures here may drift | none of `src/sim`, `src/project`, `src/studio` exists | Step 0 in every task; adapters confined to named files |
| 8 | Machine-written translations in five languages | no reviewer | section 9 item 4; the parity tests only check keys and placeholders |
| 9 | Static pass cost on 500 parts | the 10 ms target is ESTIMATED | measured in T-B10-24; the task is not closed without the number |
| 10 | The Studio shell files (`StudioEntry.tsx`, `commands.ts`) are shared with other phases | B8-20, B9-11 also edit them | T-B10-32 runs alone in its group and reads the file fresh at the start |
| 11 | The plan assumes the working-tree schema edits (finding F2) will be committed by the reconcile step | `git status` shows them uncommitted | T-B10-01 checks and adds only what is missing |

## 12. Traceability

### 12.1 Features

| Feature | Tasks |
|---|---|
| F-017 Break it | T-B10-09, T-B10-25, T-B10-32 |
| F-018 Diagnose-first | T-B10-07, T-B10-19, T-B10-23 (legacy path: Q13) |
| F-019 Record and cause ids | T-B10-01, T-B10-07, T-B10-10, T-B10-11, T-B10-16, T-B10-25 |
| F-020 Hint ladder | T-B10-08, T-B10-12, T-B10-23 |
| F-021 Transfer question | T-B10-27 |
| F-022 40 reviewed items | T-B10-26, T-B10-28, T-B10-29, then Amar (section 9, item 3) |
| F-024 Learning events | T-B10-20 |
| F-026 Code versus wiring | T-B10-05, T-B10-13 |
| F-028 Electrical rules check | T-B10-03, T-B10-17, T-B10-24 |
| F-029 Generic fault rules | T-B10-03, T-B10-04, T-B10-05, T-B10-06, T-B10-11, T-B10-17, T-B10-18, T-B10-22 |
| F-030 Break it on my circuit | T-B10-09, T-B10-14, T-B10-22 |
| F-056 Evidence trace | T-B10-04, T-B10-07, T-B10-10, T-B10-33 |
| F-183 Real-board check | T-B10-30, then Amar (section 9, item 1) |
| F-025 (belongs to SIM), F-023 (LABS), F-027 and F-187 (out of scope) | not in B10 |

### 12.2 Requirements

| Requirement | Tasks that satisfy it |
|---|---|
| R-118 Break it | T-B10-01, T-B10-09, T-B10-15, T-B10-22, T-B10-25, T-B10-32 |
| R-119 Shared record | T-B10-01 (kind schema test), T-B10-07, T-B10-10, T-B10-11, T-B10-16, T-B10-18 (sweep), T-B10-20, T-B10-25 |
| R-120 Diagnose-first | T-B10-07, T-B10-19, T-B10-23 |
| R-121 Hint ladder | T-B10-08, T-B10-12, T-B10-23 |
| R-122 Local events | T-B10-20 (viewer is T-B1-07) |
| R-123 Rules check | T-B10-03, T-B10-17, T-B10-21, T-B10-24, T-B10-18 (starter check) |
| R-124 Generic rules | T-B10-03, T-B10-04, T-B10-05, T-B10-06, T-B10-11, T-B10-17, T-B10-18, T-B10-22 |
| R-125 Break it on my circuit | T-B10-09, T-B10-14, T-B10-15, T-B10-22 |
| R-126 Code versus wiring | T-B10-05, T-B10-13 |
| R-127 Evidence trace | T-B10-04, T-B10-07, T-B10-10, T-B10-33 |
| R-128 Transfer question | T-B10-27 |
| R-129 Reviewed items | T-B10-26, T-B10-28, T-B10-29, then Amar |
| R-130 Real-board check | prepared by T-B10-30; run by Amar (section 9, item 1) |

### 12.3 Roadmap rows

| Roadmap row | Here |
|---|---|
| T-B10-01 | T-B10-01 (the schema edit is conditional; the `apply/sim.ts` edit is not expected) |
| T-B10-02 | T-B10-02 |
| T-B10-03 | T-B10-03 and T-B10-17 (split by the 5-file rule) |
| T-B10-04 | T-B10-04 |
| T-B10-05 | T-B10-05 |
| T-B10-06 | T-B10-06 (build) and T-B10-18 (gate) |
| T-B10-07 | T-B10-07 |
| T-B10-08 | T-B10-08 |
| T-B10-09 | T-B10-09, T-B10-23, T-B10-32 (split) |
| T-B10-10 | T-B10-10 |
| T-B10-11 | T-B10-11 (`cause-ids.ts` is not edited) |
| T-B10-12 | T-B10-12 (moved earlier; the label component work is in T-B10-10 and T-B10-23) |
| T-B10-13 | T-B10-13, after T-B10-33 |
| T-B10-14 | T-B10-14 |
| new | T-B10-00, 15, 16, 19, 20, 21, 22, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33 |

## Review fixes (2026-10-27)

Applied by the review-fix step. Each row says what changed and the evidence checked. Paths are from the repo root.

| # | Verdict | What changed | Evidence |
|---|---|---|---|
| 1 | Applied | `PinInfo`, `NetView`, `CodeFact`, `CodeFacts` and `RunFacts` are now declared in `src/sim/faults/types.ts` (4.1, T-B10-01). T-B10-03, T-B10-04 and T-B10-05 only implement them (`buildNetView`, `runFactsFrom`, `extractCodeFacts`); the signature blocks that declared them were removed. The sentence under 4.1 now says so and lets a later task add a field in its own commit. `FaultMonitor.onRunEnd(..., code?: CodeFacts)` and the T-B10-17 `wireClock` read need no dependency on T-B10-05 any more. T-B10-01 Done-when adds "typecheck passes with `types.ts` alone". | The original 4.1 block imported no `NetView`; `RuleInput` named three types defined in G2 and G3. |
| 2 | Applied | T-B10-22 depends on T-B10-01, T-B10-03, T-B10-16 and moves to G3. T-B10-09 moves to G4. T-B10-14 moves to G5. T-B10-32 stays in G6 (its inputs 09, 23, 24, 30 are in G4 and 10, 33 in G3 and G5). Group table, section 5 and section 8 were regenerated. Other readers of 22: T-B10-30 (G4) and T-B10-18 (G5) are later groups, so they are unaffected. | Checked every task that lists 22, 09 or 14 in its dependencies. |
| 3 | Applied | G8 holds only T-B10-31. G7 holds only T-B10-13, so 31 records the SA-23 result. Exit sequence now says "after G8". | Option one of the issue; it keeps the real dependency. |
| 4 | Applied | T-B10-31 verification is three commands with stated exit codes: a negated banned-word grep (the em dash is written with `printf` so this file contains no em dash), the path-existence loop with `xargs ls`, and `copy-check.mjs` if it exists. `TL` is dropped. | The original grep exits 1 on a clean file. |
| 5 | Applied | T-B10-16 holds the full 24-row old-to-new table, built by walking every `symptom_ids` array of the example files. Robotics and drone ids become `x-` ids. The count is five example project files, in T-B10-16 and in the T-B10-18 sweep. The issue said T-B10-22 repeats "six example projects"; the repeat is in T-B10-18 (T-B10-22 names only two fixtures), so the fix is there. | VERIFIED by `ls docs/MASTER_PLAN/04_ARCHITECTURE/schemas/examples` (five `*.project.json`) and a script over every `symptom_ids` value. |
| 6 | Applied | T-B10-16 now ends with "recompute the expected hashes and update `src/project/examples.test.ts`", names that file as its test file, and asks for a grep of other tests that pin digests. The orchestrator is told that the hash table in `PROJECT_DATA_MODEL.md` needs a matching edit. | The issue says PDM section 6; the table is at `PROJECT_DATA_MODEL.md` near line 1048 (the hash definition is in section 6.4). |
| 7 | Applied | T-B10-12 edits both the `NAMESPACES` array and the `Messages` map. 4.6 says the JSON has no top-level `faults` wrapper, keys start at `breakIt`, components call `t("breakIt.title")`, and stored keys are bare (`check.skipped`). The key-scan pattern and 4.6 agree. The on-demand claim is deleted. | VERIFIED: `src/i18n/namespaces.ts:8-20` typed map; `robotics.json` has a top-level `faults` object; `src/i18n/server.ts:30-33` imports every namespace. |
| 8 | Applied | T-B10-24 is plumbing only (worker message, host method, `staticProblems`, overlay). Idle trigger, Check button, disabled state and footer moved to T-B10-32, which gains `Problems.tsx` (5 source files; the spec stays a test file). | |
| 9 | Applied | Spike path is `docs/MASTER_PLAN/08_RESEARCH_SPIKES/RS-B10-corpus-coverage/` everywhere. The script loads the converter by relative `.ts` imports on Node 24.8 and stops and reports if `@/` aliases are in the way. | VERIFIED: the folder does not exist yet; the other `RS-*` folders are under `docs/MASTER_PLAN/`; `node --version` is v24.8.0; `tsconfig.json` has `paths`. |
| 10 | Applied | `EventSink` is declared in `src/studio/stores/diagnose.ts`; `appEventLog()` is injected from `StudioEntry.tsx` (T-B10-32). T-B10-09 keeps `appEventLog()` in `BreakIt.tsx` only. Rule 3 of section 3.2 states the no studio-to-local rule. Found while applying this: T-B10-07 `Effect` used `LearningKind` from `@/local/events`, which is a `sim` to `local` import. It now uses the literals `'hint.open' | 'diagnose.answer' | 'reveal'`. | SYSTEM 5.3 has no studio-to-local edge, as the issue says. |
| 11 | Applied | The item data tests are `src/sim/faults/items-data-a.test.ts` and `items-data-b.test.ts`, reading the JSON with `node:fs`. In `legacy-map.test.ts` the registry read through `@/project/diagnosis` or a text read of `cause-ids.ts` is the default. Found while applying this: `legacyCause` returned `CauseId` and `SymptomId` types from `sim`; it now returns `string`. `registry-sweep.test.ts` (in `sim`) reads items with `node:fs`, and the `legacyCause` catalogue sweep stays in `legacy-map.test.ts`. | |
| 12 | Applied | T-B10-01 part B, rule 3, Q2 and section 9 item 7 say the default Yes is binding unless the register has a Q2 row that says No. Step 0 greps `eslint.config.mjs` and `src/architecture.test.ts` for an existing `sim/registry` or `sim/faults` exception and extends it. The orchestrator records Q2 before G1. | `src/architecture.test.ts` does not exist yet (T-B2-01 builds it). |
| 13 | Applied | T-B10-02 depends on T-B10-16 (identity line and section 5). TMP36 basis cites `bench-solve.js:371-372`. | VERIFIED: line 371 `if (vs < -.5) m.revT = ...`; line 372 `m.revT > 3`. |
| 14 | Applied | T-B10-09 dependencies add T-B10-03, 04, 20, T-B3-05, T-B4-13 and it sits in G4. The BME280 acceptance is replaced by a Uno acceptance (`wrong-pin-in-code` on `uno-blink-d12`); the BME280 case stays in T-B10-13. | |
| 15 | Applied | T-B10-14 adds T-B8-16 and T-B2-16, and uses the Uno blink example with a `wrong-pin-in-code` fault for replay. T-B10-13 step 3 now also replays the SA-23 record. | |
| 16 | Applied | T-B10-18 depends on 21, 22, 25, 28, 29 as well; section 5 matches. A missing items file is skipped with a message. | The `legacyCause` sweep runs in T-B10-25's test, run from the T-B10-18 verify line. |
| 17 | Applied | T-B10-30 builds the ten rows from `listCandidates` for five families, one explicit `Fault` literal, and corpus slots 5, 6, 7 and 11 for the four with no generator. T-B10-06 and T-B2-07 added as dependencies. The grep release blocker is replaced by a check that each `real` is all null or fully set; "the agent never fills `real`" is a line in the task report. | Generator list in T-B10-22 has seven families and none for four of the ten rows. |
| 18 | Applied | `kinds.ts` is not edited. `LearningKind` and `LEARNING_KINDS` live in `events.ts`; a test asserts none of the six is in `TELEMETRY_KINDS`; cite `kinds.ts:47`. T-B10-20 is one source file. | VERIFIED: `MAX_DATA_BYTES` is at `kinds.ts:47`. |
| 19 | Applied | Exit gate, G8 and T-B10-13 use `KL npm run check`. Section 3.1 lists the nine baseline failing files from `01_AUDIT/runs/COMMANDS.md` row 6 and says only a new failing file blocks; the 60 s `testTimeout` is not raised. Also corrected `vitest.config.ts` to `vitest.config.mts` in section 3.3. | VERIFIED: `ls vitest.config.*` shows `.mts`; timeout at line 15. |

For the orchestrator (it owns these files; this step did not edit them):
- Record Q2 as a `DECISION_REGISTER.md` row before G1 (default Yes).
- `PROJECT_DATA_MODEL.md`: new hashes in the example hash table (near line 1048), and kebab symptom ids where it quotes `led.dark`, `i2c.no-ack` or `regulator.hot`.
- `RECONCILIATION.md`: a row RC-43b for the symptom id rename (finding F5).
- Roadmap T-B8-04 and T-B10-01 share one import-exception edit; whichever runs first adds it, the other extends it.
