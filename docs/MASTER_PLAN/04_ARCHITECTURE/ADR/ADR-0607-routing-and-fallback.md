# ADR-0607: Routing is data: three tiers mapped by the user, explicit escalation rules, a user-chosen fallback list

Status: proposed, 2026-10-27. Author: AI architecture seat.
Upstream: R-153; F-111; platform-options 7.2; TECHNICAL_RESEARCH D11, RS-11 (PENDING). Spec: AI_ARCHITECTURE section 10.1, 10.2.

## Problem

A single flagship on every turn is expensive; a single small model may fail hard debugging; the audited fallback silently sent text to a second vendor.

## Constraints

1. Defaults cannot be chosen without RS-11.
2. Model ids drift.
3. No silent change of vendor.

## Considered options

| Option | Verdict |
|---|---|
| A. One model | Rejected as the only mode of use (still possible: one model fills all tiers) |
| B. Tiers `fast`, `standard`, `strong` mapped by the user, escalation rules, fallback list | Chosen |
| C. A classifier that picks a model per turn | Deferred: needs evaluation data |

## Decision

1. `ai-routes.json` maps tiers to (profile, model); editable; written by the evaluation run.
2. Tasks map to tiers (AI_ARCHITECTURE 10.1).
3. Escalate to `strong` for the next call on: 'Think harder', two failed proposals, a failed P7 check after repair, or a large debugging trace (HYPOTHESIS).
4. Fallback only to profiles in the person's list, only before output starts; `auth`, `quota`, `capped` never fall back.
5. Defaults by the RS-11 rule: cheapest model with at least 90 percent of the top score and at least 80 percent cache reads. PENDING RS-11.

## Technical justification

Estimated routed cost is about USD 0.07 to 0.09 per session against USD 0.30 on a mid-tier model alone (AI_ARCHITECTURE 11.3).

## Cost implications

Eval run cost USD 0.2 to 4 for 50 conversations depending on model.

## Security implications

Fallback respects the person's list, so project text goes only where they allowed.

## Reversibility

Tier map is a file; changing it needs no code change.

## Known limitations

Escalation triggers are HYPOTHESES to be tested by the evaluation rows.
