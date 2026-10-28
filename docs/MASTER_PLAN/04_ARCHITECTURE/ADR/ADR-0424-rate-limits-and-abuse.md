# ADR-0424: In-process token buckets keyed by device, trusted-proxy hop count, persisted usage

Status: proposed, 2026-10-27. Author: frontend and backend architecture seat.
Upstream: C6, C7, B5-15, B6-01, R-008, R-075. Downstream: F-003. Spec: BACKEND_ARCHITECTURE section 9.

## Problem

Limits are per instance and keyed by a client-controlled header; the search counter is a closure variable; a missing header maps every caller to one key.

## Constraints

1. One process is the supported shape (K-SELF); a shared store is out of scope.
2. A restart must not reset a spend cap.
3. IPv6 callers can rotate within a /64.

## Considered options

| Option | Summary | Verdict |
|---|---|---|
| A. Redis or Postgres limiter |  | Rejected: second service, not needed |
| B. In-process buckets plus persisted usage table |  | **Chosen** |

## Decision

1. Key is `dev:<id>` when authenticated, else the socket address (IPv6 as /64).
2. `IYNK_TRUST_PROXY=N` takes the N-th entry from the right of `X-Forwarded-For`; `0` ignores forwarded headers.
3. Bounded LRU map of 10,000 keys.
4. A `usage` table for provider caps; kill switches by environment variable.
5. Pre-auth socket cap 32 with a 10 s hello window. The per-socket, per-member and per-address rates are the values of REALTIME 16.1; a flood closes the socket with 4429.

## Consequences

- Documented limitation: limits reset on restart except usage.
- Every route has a limiter entry; the registry test enforces it.

## Technical justification

The audit showed three failures: counters per instance (C6, B6-01), a key taken from `x-real-ip` or the first `x-forwarded-for` value that any caller can set (C7), and a missing header collapsing all callers into one `unknown` key (R-008). One process removes the first, a hop count removes the second (the right-most entries are written by proxies the operator controls, EXTERNAL standard behaviour of `X-Forwarded-For`), and falling back to the socket address removes the third. A token bucket allows short bursts, which chat and cursors need, and costs one map lookup per request.

## Performance data

Not measured. The existing `ratelimit.ts` is 41 lines with a 10,000-key bound (VERIFIED); the cost per request is one map lookup and a few arithmetic operations (judgement). The limiter runs inside the load test RA-08; a limiter share of event-loop time above a few percent would be a finding. UNKNOWN until then.

## Cost implications

ESTIMATED 2 to 3 days, assuming `ratelimit.ts` is extended rather than rewritten and the `usage` table exists from the store slice. No running cost.

## Licensing

No dependency is added; the limiter is first-party code.

## Security implications

Closes C6 (per-instance counters become documented per-process counters plus persisted spend), C7 (spoofed address), and the shared `unknown` key. The /64 rule stops an IPv6 caller from rotating addresses to dodge a per-address limit (B5-15). Persisted `usage` means a restart cannot reset a provider cap (C3, R-008). Kill switches turn a module off without a deploy. Residual: many friends behind one carrier-grade NAT share an IPv4 address and an address limit; device-keyed limits avoid this once a device is authenticated.

## Reversibility

High. The limiter is one module with a `take(class, key)` call. Reverse if the server is ever run as several instances: then move buckets to a shared store.

## Migration plan

BE-0 fixes `clientIp` with `IYNK_TRUST_PROXY` and removes CORS `*` on the remaining routes. BE-1 adds the server limiter with the route registry. BE-4 adds the `usage` table and provider caps.

## Known limitations

Counters reset on restart (except usage). Limits are per process. The /64 grouping can lump unrelated IPv6 users of one provider into one key. Thresholds are PROPOSAL values to confirm in RA-08.

## Reconcile, second pass (2026-10-27)

| Id | Change |
|---|---|
| RC-18 | Added the enrolment-code row below. The file had none. |

| Code | Shape | Strike rule |
|---|---|---|
| Enrolment code, typed fallback | 12 Crockford base32 characters (60 bits), valid 24 h, one use, hashed over canonical bytes (RECONCILIATION RC-18) | UNKNOWN. No strike rule is decided here or in BE 6.3 line 239. Until it is set, the typed form falls under the default per-address and per-device limits of the route registry. To decide in RA-08. |
