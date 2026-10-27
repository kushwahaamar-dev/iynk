# ADR-0429: Structured logs, minimal health, separate metrics listener, redacted diagnostics

Status: proposed, 2026-10-27. Author: frontend and backend architecture seat.
Upstream: R-098, R10, F-016, B5-13. Downstream: F-016, F-199. Spec: BACKEND_ARCHITECTURE section 13.5. Related: ADR-0010 (the system seat's record of the same decision).

## Problem

The current relay logs JSON but proxies `/metrics` to the public. A self-hoster needs to see problems without reading source and without leaking tokens.

## Constraints

1. Never log tokens, secrets, document text, chat or addresses at `info`.
2. No hosted monitoring dependency.
3. No label may hold an id.

## Considered options

| Option | Summary | Verdict |
|---|---|---|
| A. OpenTelemetry now |  | Rejected: dependency weight; not needed |
| B. JSON logs, Prometheus text, a diagnostics bundle |  | **Chosen** |

## Decision

1. Logs: one JSON object per line with the route template, status, ms and short hashes.
2. `/healthz` (`{ ok, draining, store }`) and `/readyz` are public and minimal; `/metrics` is on `IYNK_METRICS_ADDR` (loopback).
3. All instrumentation goes through three functions (`obs.count`, `obs.time`, `obs.gauge`) so an exporter can be added without touching call sites.
4. `iynk-server diagnostics` writes a redacted tarball.

## Consequences

- A canary-secret test guards the redaction (BA-09).
- No alerting is built in; the guide suggests three cron checks.

## Technical justification

A self-hoster with one container needs three things: a line per request they can read, a probe the orchestrator can call, and numbers they can scrape. JSON lines on stdout need no agent; a `/healthz` with a store check catches a dead database; a text metrics format is readable by hand and by Prometheus. Routing everything through three functions keeps the cost of a later swap small. `/metrics` stays off the public proxy because it was an exposed admin surface (R10).

## Performance data

Not measured. Counter and gauge updates are in-memory increments (judgement); histogram updates add a bucket search. The overhead on the op path is checked in the load test RA-08 together with `iynk_event_loop_lag_seconds`; UNKNOWN until then. The relay today already exposes counters with no reported cost.

## Cost implications

ESTIMATED 2 to 3 days for the log shape, the metric set, redaction tests and the diagnostics command, assuming no metrics library. No running cost.

## Licensing

No dependency is added; the text exposition format is written by hand. If a metrics library is adopted later its licence is checked then (UNKNOWN).

## Security implications

The redaction rule and the canary test (BA-09) keep tokens, provider keys, document text and chat out of logs, labels and the diagnostics bundle. Addresses appear only in `warn` lines about abuse, as a /64 hash. Health answers carry no version, uptime or counts, so a stranger learns nothing from them. `/metrics` is loopback only; the Caddy file does not proxy it.

## Reversibility

High. Reverse if the operator wants traces: add an exporter behind the same three functions.

## Migration plan

BE-1 adds logs, health and the three functions; BE-3 adds metrics and `diagnostics`. The public `/metrics` proxy line is removed from the Caddy file in the same slice.

## Known limitations

No alerts, traces or log shipping. SYSTEM_ARCHITECTURE describes the metrics response as JSON where this file says Prometheus text; the two are to be aligned. Event-loop lag is a proxy for the synchronous store cost, not a direct measure of it.
