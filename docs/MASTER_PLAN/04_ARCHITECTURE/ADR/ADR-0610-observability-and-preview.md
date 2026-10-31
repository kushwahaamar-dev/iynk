# ADR-0610: Local observability: one log row per call without content, an activity panel, opt-in expiring content capture, and a preview of exactly what is sent

Status: proposed, 2026-10-27. Author: AI architecture seat.
Upstream: audit D10; BRIEF 13.5; R-154; F-006. Spec: AI_ARCHITECTURE section 12.

## Problem

Nobody can answer 'what does the partner cost and how well does it work' today. The person also cannot see what leaves the machine.

## Constraints

1. No content by default; no remote telemetry.
2. Useful for debugging the partner.
3. Honest about what is sent.

## Considered options

| Option | Verdict |
|---|---|
| A. Remote telemetry | Rejected (F-006 opt-in, never content) |
| B. Local rows plus panel plus debug capture plus preview | Chosen |

## Decision

1. `AiLogRow` per call (AI_ARCHITECTURE 12.1), 90 days or 20,000 rows.
2. Activity panel with spend, cache ratio, loops, latency, proposal outcomes, tool errors, policy hits.
3. Debug capture off by default, 24 hours, red chip.
4. 'What the partner sees' shows the exact bytes sent, with per-source toggles and a hash equal to the request's pack hash.
5. Relay logs hold counts only.

## Technical justification

The log doubles as the ledger and as the data for the evaluation and for tuning.

## Cost implications

Small.

## Security implications

Rows are content-free; the diagnostic bundle is scrubbed and secret-scanned.

## Reversibility

Local data; deletable.

## Known limitations

No cross-device view.
