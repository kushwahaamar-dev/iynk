# ADR-0206: Extension boundary: API first, container deferred (RS-15 never ran)

Status: proposed, 2026-10-27. Decision updated by the reframe fold-in the same day. The filename keeps the old "pending-rs-15" slug so existing links resolve; the title is the current name. Author: component-schema design pass.
Spec: COMPONENT_SCHEMA.md (section 12 holds the pointer table).

## Problem

Third-party hardware models need code; code must not get the browser or the server (BRIEF §9.3)

## Constraints

Deterministic for replay; hard CPU and memory limits; no network, DOM, storage or clock; works offline; beginners need no code; D-015 no server execution

## Considered options

Options A to F in 9.6

## Decision

**API first. The container is deferred behind `ModelHost`. Ship option F (data only) now; keep options A, B and C swappable.** RS-15 never ran and has no `REPORT.md` (checked: `docs/MASTER_PLAN/08_RESEARCH_SPIKES/` holds RS-01, 03, 06, 08, 09, 12, 13 only), so there is no result to fold in. Under D-014 and D-015 the code author is Amar or a friend on a self-hosted app. That lowers the threat but not the need for a kill switch. Code parts stay off until a Worker-kill prototype in the Components phase passes the 9.6 exit condition (host responsive, no cookie or storage access, worker killed in under 2 s) plus the storage check. Studio does not wait for it. What would change this: a pass moves option B (or A) from off to opt-in; a fail on all options keeps F and cuts F-102. Fixed now: the ABI `iynk.model/1` (9.5), the manifest and permissions (9.4), the limits as caps (9.6), the determinism rules (9.7) and the `ModelHost` interface. Until the prototype passes, code parts do not ship; beginner mode ships. Rule for choosing the container is in 9.6

## Technical justification

The API is the stable part and is runtime independent. Capability by construction (B, C) beats removing globals (A). A deterministic budget is needed for replay, and wall-clock kills are not deterministic. Both are reasoned, not measured: HYPOTHESIS

## Performance data

None. `quickjs-emscripten` has "no speed number gathered" (platform-options.md); RS-15 and RS-15b never ran. No other spike (RS-01, 03, 06, 08, 09, 12, 13) measured a sandbox

## Cost implications

$0 hosting (browser only). Effort for A: 3 to 5 weeks (ESTIMATED by the research pass, low confidence, `TECHNICAL_RESEARCH.md` D8); B and C not estimated

## Licensing

QuickJS and `quickjs-emscripten` MIT (EXTERNAL, `platform-options.md`); WASM component model Apache-2.0; no licence blocker found for A or B

## Security implications

See the threat table in 9.11. Code runs only after per-hash approval, never on a server, never auto-updated

## Reversibility

High by design: the container is behind `ModelHost`; descriptors do not name it

## Migration plan

Ship beginner mode and the ABI draft. In the Components phase (D-014 order, after Studio, collaboration, fidelity and faults), an agent builds the Worker-kill prototype (infinite loop, 2 GB allocation, message flood, `fetch` to the parent origin, storage read) and RS-15b, then this ADR is revisited with the numbers. F-102 is late in that phase and does not block Studio

## Known limitations

Sequential logic needs code parts; nested Workers inside a sandboxed iframe via blob URL are unverified (HYPOTHESIS); the work-unit definition is open

## Reconcile and spike fold-in (2026-10-27)

| Id | Change |
|---|---|
| (no RC id) | RECONCILIATION.md has no row for this ADR (RC-26 there is the room asset upload, unrelated). Decision rewritten from "PENDING RS-15 and RS-15b" to "API first, container deferred; ship F, keep A, B, C swappable", matching COMPONENT_SCHEMA.md 9.6 (decision paragraph after the options table) and its lines 32 and 997. Title and 4 body mentions of "pending RS-15" replaced (title, Decision, Performance data, Migration plan) |
| RS-15 | Never ran, no report. No numbers folded in. Reversible option chosen (F now). Replaced by a Components-phase Worker-kill prototype, an agent task |
| D-014 | Migration plan no longer says F-102 waits on a spike before other work. Studio does not wait for it |
| Skipped | The filename is unchanged: renaming would break links in other files, and this step may edit only this file. Rename to `ADR-0206-extension-boundary-api-first-container-deferred.md` in a later step that can update the references |
