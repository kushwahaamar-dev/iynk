# ADR-0605: Modes are enforced by tool gating and context exclusion, not only by the prompt; the hint ladder is the Diagnosis hint level

Status: proposed, 2026-10-27. Author: AI architecture seat.
Upstream: BRIEF 13.4; D-010; F-113, F-018; R-120, R-160; council ai.md principle 7. Spec: AI_ARCHITECTURE section 8.

## Problem

The audited partner has one set of rules and a 'second ask' convention. No mode can be tested, and nothing stops a model from printing a fix in guided mode.

## Constraints

1. Five modes: Socratic, beginner, direct, debugging, advanced.
2. No full solutions in guided mode unless the person asks.
3. One hint record shared with the faults feature (D-010).
4. No teacher or lock exists (D-013).

## Considered options

| Option | Verdict |
|---|---|
| A. Prompt text per mode | Rejected as the only lever |
| B. Prompt plus tool gating plus context exclusion plus a heuristic output check | Chosen |
| C. A hard lock that cannot be overridden | Rejected: the person owns the lab; 'Show me' is always one click |

## Decision

1. `Mode` enum of five; defaults by `meta.kind`.
2. `propose_ops` is absent from the request in `socratic` and `beginner` until level 3 or 'Show me'.
3. Hidden checks, quiz answers, hints above the level and hidden diagnose-first causes are not in the pack.
4. The ladder levels 0 to 3 equal `Diagnosis.hint_level`; levels rise only by a person's action; one function (`requestHint`) serves both the faults UI and the partner.
5. In guided modes below level 3, fenced blocks over 6 lines are withheld.
6. 'Hold me to it' adds one confirmation to 'Show me'.

## Technical justification

What the model never receives it cannot leak; what it cannot call it cannot do. The heuristic check covers the remainder and is measured on the evaluation rows.

## Cost implications

None beyond the mode blocks (150 to 300 tokens each) and five cache prefixes.

## Security implications

Mode state is local. A user can switch modes; this is not an access control.

## Reversibility

Modes are data and prompts; changing the table is a code change.

## Known limitations

A model can still deduce a hidden fault from the netlist it can read (setting 'Partner blind to injected faults' addresses it). The output heuristic is a hint, not a guarantee.
