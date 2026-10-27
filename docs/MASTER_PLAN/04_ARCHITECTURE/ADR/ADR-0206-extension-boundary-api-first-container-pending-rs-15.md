# ADR-0206: Extension boundary: API first, container pending RS-15

Status: proposed, 2026-10-27. Author: component-schema design pass.
Spec: COMPONENT_SCHEMA.md (section 12 holds the pointer table).

## Problem

Third-party hardware models need code; code must not get the browser or the server (BRIEF §9.3)

## Constraints

Deterministic for replay; hard CPU and memory limits; no network, DOM, storage or clock; works offline; beginners need no code; D-015 no server execution

## Considered options

Options A to F in 9.6

## Decision

**PENDING RS-15 and RS-15b.** Fixed now: the ABI `iynk.model/1` (9.5), the manifest and permissions (9.4), the limits as caps (9.6), the determinism rules (9.7) and the `ModelHost` interface. Until the spike reports, code parts do not ship; beginner mode ships. Rule for choosing the container is in 9.6

## Technical justification

The API is the stable part and is runtime independent. Capability by construction (B, C) beats removing globals (A). A deterministic budget is needed for replay, and wall-clock kills are not deterministic. Both are reasoned, not measured: HYPOTHESIS

## Performance data

None. `quickjs-emscripten` has "no speed number gathered" (platform-options.md); RS-15 and RS-15b not run

## Cost implications

$0 hosting (browser only). Effort for A: 3 to 5 weeks (ESTIMATED by the research pass, low confidence, `TECHNICAL_RESEARCH.md` D8); B and C not estimated

## Licensing

QuickJS and `quickjs-emscripten` MIT (EXTERNAL, `platform-options.md`); WASM component model Apache-2.0; no licence blocker found for A or B

## Security implications

See the threat table in 9.11. Code runs only after per-hash approval, never on a server, never auto-updated

## Reversibility

High by design: the container is behind `ModelHost`; descriptors do not name it

## Migration plan

Ship beginner mode and the ABI draft; run RS-15 and RS-15b before F-102; revisit this ADR with the numbers

## Known limitations

Sequential logic needs code parts; nested Workers inside a sandboxed iframe via blob URL are unverified (HYPOTHESIS); the work-unit definition is open
