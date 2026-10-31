# ADR-0010: Observability for a self-hoster

Status: proposed, 2026-10-27. Author: system architecture seat.
Upstream: D-013, D-015; R-009, R-098, F-006, F-016, F-024; SECURITY_BASELINE R10; relay `/metrics` (`server/realtime/src/relay.js:215-232`).
Downstream: `SYSTEM_ARCHITECTURE.md` 13; AR-12, AR-22.

## Problem

An operator needs to know the server is alive, loaded or failing, and a contributor needs a bug report that does not require sending data anywhere. Today `/metrics` is public through Caddy, telemetry defaults to on (`src/lib/progress/storage.ts:38`), and a public counter reads the events table.

## Constraints

1. No third-party error, analytics or tracing service by default (R-009).
2. Logs never contain tokens, invites, codes, keys, project text, source text, chat text (R-078).
3. One small process; no collector to run.
4. Metrics are not public (R10).

## Considered options

| Option | Summary | Verdict |
|---|---|---|
| A. JSON logs on stdout, `/healthz`, Prometheus text on a separate loopback listener (`iynk_*` names, BACKEND 13.5), a local browser error log | Chosen | Chosen |
| B. Prometheus server and Grafana bundled | Standard tooling | Not bundled: a friends-sized install does not run them. The text format is chosen anyway so any scraper can read it, and it is readable with `curl` or the `node -e` line in SYSTEM_ARCHITECTURE 13.2 |
| C. Sentry or similar | Rich errors | Rejected: third party, sends project context |
| D. OpenTelemetry | Vendor neutral | Rejected: weight for no consumer |

## Decision

As in `SYSTEM_ARCHITECTURE.md` 13: stdout JSON lines with `{ts, level, msg, reqId, route, status, ms, deviceId?}`; `/healthz` and `/readyz` public with `ok` and `draining` only (no version, no uptime: a version oracle, BACKEND 5.3); metrics as Prometheus text on `IYNK_METRICS_ADDR` (default `127.0.0.1:9464`), never proxied, with the metric set of BACKEND 13.5 (detail ADR-0429) and build information only there; a browser `errors` store (ring buffer) with "Copy for a bug report"; an opt-in local `events` store. An external uptime pinger, if wanted, is the operator's.

## Technical justification

The relay already logs structured lines and exposes counters; this keeps the shape and closes the exposure. Event-loop delay via `perf_hooks` is the most useful single health number for a single-process Node server (EXTERNAL API).

## Performance data

Not measured. Metrics cost a counter increment per frame; the existing token bucket already runs per frame.

## Cost implications

None.

## Licensing

None added.

## Security implications

Closes R10 (public metrics). Scrubbing is tested: AR-13 scans logs for keys, and the error log scrubs keys and project text before write.

## Reversibility

High. Swapping the exporter is one function over the same three instrumentation calls (`obs.count`, `obs.time`, `obs.gauge`, BACKEND 13.5).

## Migration plan

B0: stop default telemetry; delete the counter. COLLAB: new log and metrics in `server/src/ops`.

## Known limitations

No history of metrics (the operator must scrape if they want it). A browser error log is lost with site data.
