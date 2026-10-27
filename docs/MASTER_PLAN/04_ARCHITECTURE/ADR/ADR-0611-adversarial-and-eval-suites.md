# ADR-0611: The adversarial suite and the evaluation set are CI gates in different ways

Status: proposed, 2026-10-27. Author: AI architecture seat.
Upstream: BRIEF 13.5; F-111, F-112; R-153, R-159; Bug autopsy habit. Spec: AI_ARCHITECTURE sections 14.6, 15.

## Problem

Today 344 tests cover the AI layer's plumbing and none cover what the partner says or how it resists hostile text (audit).

## Constraints

1. Public CI has no model key.
2. Model behaviour varies between runs.
3. Every found bug should become a test.

## Considered options

| Option | Verdict |
|---|---|
| A. Live-model tests only | Rejected: no key in CI, flaky |
| B. Deterministic suite with a compromised-model stub as a hard gate; evaluation set run on demand with the user's key; live injection runs informational | Chosen |

## Decision

1. Adversarial suite: 82 cases at start, invariants AI-INV-1 to AI-INV-10, 100 percent pass required to merge; fuzz seeds fixed in the gate, random nightly.
2. Evaluation set: 50 conversations in six groups, scored 0 to 4; on demand and before a release; may not lose points on safety, mode and injection-adjacent rows against the last run.
3. Evaluation writes `ai-eval-report.json` and `ai-defaults.json`.
4. Each bug adds a case.

## Technical justification

Testing containment against an obedient attacker removes the dependence on model behaviour.

## Cost implications

Eval run USD 0.2 to 4 (ESTIMATED).

## Security implications

Corpus payloads are benign illustrations; the stub does what text says.

## Reversibility

Cases are files.

## Known limitations

Corpus size is an estimate; the coverage of real attacks is unknown.
