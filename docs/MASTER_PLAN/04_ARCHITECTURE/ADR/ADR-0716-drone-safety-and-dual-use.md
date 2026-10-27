# ADR-0716: Safety notices and the dual-use content rule are data with tests

Status: proposed, 2026-10-27. Author: drone architecture seat.
Upstream: BRIEF 12.2; D-007, D-013, D-017; compliance-safety.md 5 and 6; council robotics-aero 6a and W9; F-010, F-066; R-024, R-179. Downstream: F-010, F-111 (AI evaluation set), F-172. Spec: DRONE_ARCHITECTURE section 12.

## Problem

Simulation can be mistaken for certification, and public drone tooling can drift toward sensitive capabilities. Both risks are handled today by nothing (no safety panel, no content rule, no terms route found in the audit).

## Considered options

| Option | Verdict |
|---|---|
| A. Eight notice ids placed by rule; a content rule with enforcement points in the part registry, mode list, scale caps, AI tool schema, templates and export headers; CI checks | Chosen |
| B. A single disclaimer page | Rejected: not where the person looks, and not testable |
| C. No restriction because it is a private lab | Rejected: the code is public (D-013, SECURITY_BASELINE) |

## Decision

Notices SN-1 to SN-8 (lithium, propellers, high current, stability, physical testing, regulations, autonomy limits, not certification), each with a trigger and a placement; SN-8 on every output and every export header. Banned phrases checked by grep. Part registry `restricted` flag; no follow-me or target tracking modes; field and range caps; no encrypted-link guidance; swarm capped at 8 at lab scale; AI tools without restricted operations and a 20-prompt refusal set in CI. The five flagged crafts are reviewed (the decision is Amar's).

## Technical justification

Legal reading in compliance-safety.md section 6 is a HYPOTHESIS: public beginner content is "published" under 15 CFR 734.7 and outside the EAR; ITAR VIII(a)(5) and sensitive capabilities are where risk grows (EXTERNAL; not legal advice).

## Cost

Notices and tests in slice D0: about 1 week of the 3 to 4 weeks, ESTIMATED. Copy needs second sources and review.

## Licensing

None.

## Security implications

Prevents the AI and templates from becoming a path to sensitive capabilities by construction rather than by prompt alone.

## Reversibility

High. Rules are data.

## Migration plan

D0 ships before any new drone feature; the existing crafts are reviewed against the table.

## Known limitations

The legal reading is UNKNOWN. The LiPo guidance has only a community source until a second one is cited. Regional rules differ and some primary pages were unreachable. The rule cannot stop a determined person from using public knowledge elsewhere; it controls what iynk itself builds, suggests and exports.
