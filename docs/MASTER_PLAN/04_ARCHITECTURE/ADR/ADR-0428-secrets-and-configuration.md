# ADR-0428: Environment-only configuration, refuse unsafe values, no signing secret

Status: proposed, 2026-10-27. Author: frontend and backend architecture seat.
Upstream: R-078, P3, S3, SECURITY_BASELINE section 9, K-KEY, K-SEC. Downstream: F-198, F-199. Spec: BACKEND_ARCHITECTURE section 13.

## Problem

A public repository and a stranger-reachable URL must not mean open keys or an open server. The old `.env.example` is tied to hackathon providers and Vercel.

## Constraints

1. One documented set of variables (R-078).
2. Any one credential must be revocable without logging everyone else out.
3. Containers run as non-root with a read-only root.

## Considered options

| Option | Summary | Verdict |
|---|---|---|
| A. Config file |  | Rejected: second place to look |
| B. Environment variables plus `_FILE` variants |  | **Chosen** |

## Decision

1. Defaults are safe; unknown, removed or unsafe values stop startup with one line naming the variable.
2. There is no signing secret: bearer tokens, invites, pairing and share tokens are random values stored as SHA-256 (ADR-0007). Nothing needs rotating, and the data directory holds only `iynk.db` and `backups/`.
3. Operator provider keys come from the environment or `_FILE` only; never from SQLite.
4. `IYNK_SERVER_TOKEN` exists only in slice BE-0 (at least 32 random bytes, constant-time compare) and is removed in BE-1.
5. `.env.example` is rewritten; Vercel, Meta, Gemini, Solana and Postgres names are removed.

## Consequences

- The server refuses `*` origins, a data directory open to group or others, root, a newer database, and removed variables (`IYNK_SECRET`, `IYNK_SERVER_TOKEN`, old `REALTIME_*` names).
- `iynk-server check-config` prints every problem at once.

## Technical justification

Environment variables are the one configuration form that works the same in compose, systemd and a shell, and `_FILE` variants fit Docker secrets. Refusing to start on an unsafe value turns a silent exposure into a visible error (REALTIME 17.2 does the same for stale names). Dropping the signing secret removes a file to protect, back up and rotate; revocation is a row update.

## Performance data

Not applicable: configuration is parsed once at start. `check-config` runs in the same process path and takes milliseconds (judgement, not measured).

## Cost implications

ESTIMATED 1 to 2 days for the loader, the refusals and their tests, assuming the variable table of section 13.1 is the whole surface. No running cost.

## Licensing

No dependency is added; parsing is first-party.

## Security implications

The unsafe-value refusals are tests (BA-01). Operator keys never reach the database, a response or a log (the redaction list includes `authorization`, `x-iynk-provider-key`, `x-iynk-server-token` and `cookie`). Setting the data directory to mode 0700 limits the file that holds project content and credential hashes. Residual: environment variables can be read by anyone with `docker inspect` rights on the host; the guide recommends `_FILE` secrets.

## Reversibility

High. Reverse if a configuration surface larger than a page of variables appears: then add a validated config file, keeping the environment as the override.

## Migration plan

BE-0 rewrites `.env.example` and deletes the Vercel and Vultr scripts; BE-1 adds the loader, `check-config` and the refusals. Old variable names print an error pointing at the new name.

## Known limitations

About thirty variables; most operators set five. `IYNK_ENROLLMENT` takes `code`, `invite` or `open` here because REALTIME 5.3 and API_CONTRACTS 5.2 define it that way; the `open` value is for private networks and logs a warning.
