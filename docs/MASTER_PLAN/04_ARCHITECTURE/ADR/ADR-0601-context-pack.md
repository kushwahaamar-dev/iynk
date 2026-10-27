# ADR-0601: The model reads a context pack: typed sources, four trust classes, one text serialisation, a token budget with a fixed eviction order

Status: proposed, 2026-10-27. Author: AI architecture seat.
Upstream: BRIEF 13.1; D-007, D-010; F-109, F-112; R-156, R-159; audit D6 (`parts: []`), TECHNICAL_DEBT A10; PROJECT_DATA_MODEL 3, 5; SIMULATION_ARCHITECTURE 14. Spec: AI_ARCHITECTURE section 5.

## Problem

The audited bench context is a heuristic text dump (`src/lib/ai/bench*.ts`) capped at 12 KB. On boards and robotics it sends no parts and no nets (audit D6), so the model guesses ids and key names. Untrusted text (names, chat, search results) is mixed into system messages with advisory fences (SECURITY_BASELINE A1).

## Constraints

1. Ids the model quotes must exist (unknown ids rejected, never trusted).
2. Simulation readings keep tier and provenance (D-007, ADR-0313).
3. Works for a 4-part project and a 500-part project without a different code path.
4. Prefix bytes stable for caching (ADR-0608).
5. Instruction authority only for shipped rules and the current user message.

## Considered options

| Option | Verdict |
|---|---|
| A. Send the whole document JSON | Rejected: 5 MiB cap, mostly layout and noise; the electrical truth is the nets array |
| B. Fixed-size dump (today) | Rejected: lossy, guesses keys |
| C. Typed sources, text serialisation, levels D0 to D2, tools to drill | Chosen |
| D. Embedding retrieval over the project | Rejected for the first release: bundle and privacy cost; HYPOTHESIS test named in AI_ARCHITECTURE 5.8 |

## Decision

1. Eleven sources S1 to S11 (BRIEF 13.1), each with a trust class A, R, S, P, L or X.
2. The serialisation is `iynk-context v1`: line oriented, canonical order, ids exact, absence explicit, P text quoted and capped at 120 characters per field.
3. Digest levels D2 full, D1 outline, D0 minimum, chosen by budget; neighbourhood function breadth-first depth 2, at most 60 components.
4. Profiles Compact 8k, Standard 24k, Extended 64k input tokens; estimator `ceil(bytes / 3.5) * 1.15`, corrected by provider-reported counts.
5. Eviction order fixed (AI_ARCHITECTURE 5.7); rules, mode block, current message, selection, newest diagnostics and mode tools are never cut; if still over budget the turn does not start.
6. Every statement of fact in an answer cites a `[[ref]]` token resolved against the live document; unresolved tokens show as unverified.

## Technical justification

Net-first connectivity (ADR-0101) means the nets table is the whole wiring truth in about 100 bytes per net. A row of the example pack is about a third the size of its JSON (1,429 bytes for a four-part project, scratch `pack-example.txt`). The reference check turns invented pins from a silent error into a visible one.

## Cost implications

Pack building is local CPU: target under 20 ms p95 for the RS-01 scene on desktop (PROPOSAL, measured at AI-1). Tokens per turn: about 19,600 typical Standard (ESTIMATED).

## Security implications

Pack text is data in a nonce fence; a pack never contains a key (redaction, section 13.2); hidden checks and answers are left out in guided modes (ADR-0605).

## Reversibility

The serialisation version is in the header; a new version changes the prefix and loses cache once. Levels and budgets are config.

## Known limitations

Token counts are estimates (no tokenizer ships). A 500-part project is only seen at D1 plus a neighbourhood and needs drill-down calls.
