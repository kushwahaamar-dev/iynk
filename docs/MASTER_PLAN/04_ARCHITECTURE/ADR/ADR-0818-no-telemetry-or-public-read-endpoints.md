# ADR-0818: No telemetry, counter or public read endpoint exists

Status: proposed, 2026-10-27. Author: API contracts design seat.
Upstream: R-009, D-013, D-016, SECURITY_BASELINE D1 and D2. Downstream: AC-API-11. Spec: API_CONTRACTS sections 1, 4.10, 12.

## Problem

Today's server has a public telemetry ingest, a public live counter, a public 24-hour buddy list and a public leaderboard of strangers. The project is now a personal lab for Amar and his friends.

## Constraints

1. Nothing about the work leaves the machine (R-009).
2. No endpoint returns a person's data to someone who is neither a buddy nor a share-token holder.

## Considered options

| Option | Verdict |
|---|---|
| A. Remove them; no replacement | Chosen |
| B. Opt-in server telemetry | Rejected: no consumer for it |
| C. Keep a public counter | Rejected: a public read of user-originated rows |

## Decision

`/api/telemetry`, `/api/live`, `/api/buddies` (public list) and `/api/leaderboard` (public) are deleted. The buddy list is `GET /buddies` for the signed-in caller; boards are buddies-only. There is no telemetry preference endpoint because there is no telemetry.

## Technical justification

Deleting the routes closes SECURITY_BASELINE D1 and D2 by construction (AC-API-11 probes it).

## Performance data

Not applicable.

## Cost implications

Removes the Timescale-specific store (`0001_events.sql`, `0002_aggregates.sql`).

## Licensing

Not applicable.

## Security implications

A stranger learns nothing; probes for others' resources answer the same 404 as a missing id.

## Reversibility

High. A future opt-in endpoint is additive.

## Migration plan

Delete the routes, `LiveCounter.tsx`, `useFeed.ts`, `db/live.ts` and `db/ingest.ts`; the store migration drops the old tables.

## Known limitations

The operator has no usage numbers; any metric is a local log on the host.
