# ADR-0302: Four fidelity tiers T0 to T3 and a separate bench-checked mark

Status: proposed, 2026-10-27. Author: simulation architecture seat.
Upstream: D-007; BRIEF 10.2; `00_EXECUTIVE/council/fidelity.md` section 7. Spec: SIMULATION_ARCHITECTURE.md section 4.
Downstream: ADR-0310; F-011, F-182, F-184; R-114, R-FID-1 to R-FID-7; SA-17, SA-20.

## Problem

People read a number on screen as true. The tool has parts that are scripted (T0), parts with a stated simplified model (T1), and, later, parts compared with an independent engine (T2) or run on real firmware (T3). Without a fixed vocabulary the label would flatter the weakest layer.

## Constraints

1. The word "validated" is never printed (D-007).
2. The labels must come from data, not from UI strings (ADR-0310).
3. A project mixes layers of different tiers.
4. F-011 already uses T0 to T3.

## Considered options

| Option | Verdict |
|---|---|
| A. The three tiers of BRIEF 10.2 | Rejected: no place for scripted behaviour |
| B. T0 to T3 plus a separate mark for bench data | Chosen |
| C. A continuous accuracy score | Rejected: false precision, nothing to test against |
| D. One tier per project | Rejected: hides which layer is weak |

## Decision

T0 Illustration, T1 Teaching model, T2 Calculated model, T3 Runs your firmware, and the mark "Checked on a real board" (never "validated"). Each tier has an entry bar enforced by registry validation (4.1). A project shows one chip per layer and a summary equal to the lowest. Anything not modelled returns `not-modelled-yet` with a reason and no number. The simulator never issues a positive safety statement.

## Technical justification

The lowest-tier rule is the only summary that cannot overstate. The per-layer chips keep a strong layer visible (a T3 CPU beside a T1 circuit reads "Execution T3, Circuit T1, Summary T1").

## Performance data

Not applicable; the labels are computed once at load from the registry.

## Cost implications

Every part and model needs a registry entry with a "what it models" list. SA-17 asserts there is one for each of the 38 converted projects.

## Licensing

None.

## Security implications

Honest labels are a safety property: the drone and robot labs must not imply a safe design (4.1 rule 4; DRONE ADR-0716).

## Reversibility

Reverse if the lowest-tier rule hides a useful T3 result in practice; then show only the per-layer chips and drop the summary.

## Migration plan

SIM-2 registry v0 with the first entries (section 16.5); SIM-7 completes it. Existing UI strings that say "accurate" or "validated" are removed by the banned-words grep in SA-17.

## Known limitations

Tier is a property of a model, not of one run; a run outside the range a model was checked over gets the message "outside the range this model was checked over", not a lower tier.
