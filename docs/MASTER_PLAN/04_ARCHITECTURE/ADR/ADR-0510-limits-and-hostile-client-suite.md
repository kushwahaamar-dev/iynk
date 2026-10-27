# ADR-0510: Server-enforced limits and a named hostile-client suite

Status: proposed, 2026-10-27. Author: realtime-architecture seat.
Upstream: SECURITY_BASELINE R1 to R9; R-097; R-075; D-011. Spec: REALTIME_ARCHITECTURE 16.

## Problem

Limits are per socket and per address only (R3 shows they miss room creation); there is no test that plays a hostile client (the audit notes no test covers takeover or exhaustion).

## Constraints

1. Defaults suit 8 friends per room and tens of rooms; all configurable.
2. Every defence is tested and named after the baseline id.

## Considered options

| Option | Verdict |
|---|---|
| A. Buckets per socket and per device, quotas per device and server, caps on sizes and counts, tested by a script that plays a hostile client in CI | Chosen |
| B. A fronting WAF or rate limiter | Rejected for default setup; the operator may add one |
| C. Rely on the existing buckets | Rejected: R3 reproduced under them |

## Decision

The limit table of REALTIME_ARCHITECTURE 16.1 and the 17 hostile tests of 16.2, wired into CI (R-001) against a fresh server. Test titles contain R1 to R9.

## Technical justification

Each limit cites the code line it extends or the requirement it implements.

## Performance data

Existing flood close after 600 drops in 5 s (`config.js:36-37`) VERIFIED. New values are PROPOSALS tuned in RA-08.

## Cost implications

S8, about 1 week.

## Licensing

None.

## Security implications

This ADR is the security acceptance of COLLAB (SECURITY_BASELINE section 8 blockers 1, 2 and 6 for the self-hosted server).

## Reversibility

High. Values are configuration.

## Migration plan

S1 starts the suite with R3, R4, R6, R7, R8; S8 completes it.

## Known limitations

Valid but hostile edits by an editor are not prevented, only attributed and reversible. Limits are per process (no shared limiter) which is fine for one process.
