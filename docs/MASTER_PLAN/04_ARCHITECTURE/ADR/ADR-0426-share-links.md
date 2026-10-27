# ADR-0426: Share links are capability tokens to stored snapshots; no library sync

Status: proposed, 2026-10-27. Author: frontend and backend architecture seat.
Upstream: F-089, R-095, R-078, R-083, PROJECT_DATA_MODEL 12.1 and 13. Downstream: F-089, F-143. Spec: BACKEND_ARCHITECTURE section 11.

## Problem

A friend needs to open exactly what Amar made, without a live room. The audit found no save or share at all. With identity per device there is no account to sync across.

## Constraints

1. The link must not leak through `Referer` or server logs.
2. Content is untrusted when opened.
3. Missing and revoked links must look the same.
4. A leak of the database file or a backup must not expose live links.

## Considered options

| Option | Summary | Verdict |
|---|---|---|
| A. URL payload `#p=` for small projects |  | Not built first: many chat apps truncate long URLs (EXTERNAL, unchecked) |
| B. Server snapshot behind a 128-bit token | token stored as SHA-256 only | **Chosen** |
| C. Library sync |  | Not built: no account, not in R-078 or R-083 |

## Decision

1. The credential is a 128-bit token (22 base64url characters). The server stores `SHA-256(token)` in `shares.token_hash`. The row has a separate public id `shr_` plus 64 bits, used by revoke and lists, which is not a credential.
2. The link is `https://<app>/<lang>/studio#share=<token>`. The app calls `GET /v1/shares/{token}`, which looks up by hash.
3. Create validates through the five passes and the secret-shape scan and stores a gzip `.iynk` envelope. The document is at most `IYNK_MAX_PROJECT_BYTES`; assets are separate content-addressed uploads.
4. Open goes through the `project` worker as an untrusted file and creates a fork.
5. Revocation and expiry sweep; a constant 404 for missing and revoked.

## Consequences

- Shares are immutable; live work is a room.
- A new route class `capability` is added to R-007's list.
- A lost link cannot be recovered; it is revoked by id and made again.

## Technical justification

The fragment of a URL is not sent to the web server or in `Referer` (EXTERNAL browser behaviour), so the token reaches only the API call that opens the share. Storing only the hash gives the same guarantee as every other capability in the server (invites, pairing, enrolment): the database file or a backup shows no usable link. A 128-bit random token cannot be guessed (about 2^128 possibilities against a 120 per minute per address limit). An immutable snapshot needs no merge logic, and a fork on open means the opener cannot change the original.

## Performance data

The largest allowed document (5,242,880 bytes canonical) gzips to about 159 KB (PROJECT_DATA_MODEL 9.6, VERIFIED); the 2,000-part synthetic goes from 1.6 MB to 159 KB. Opening a share is one indexed lookup on a unique hash column plus one blob read. Not measured on the server; UNKNOWN but small (judgement).

## Cost implications

ESTIMATED 2 to 3 days for create, open, revoke, sweep and the tests, assuming validation passes exist from the project core. Storage is bounded by the per-device share and upload quotas and `IYNK_STORAGE_LIMIT_MB`.

## Licensing

No dependency is added. A share carries the project's own `license` field and `provenance`, so the opener sees the terms the author set. The repository's own licence is decided later (D-017) and is separate.

## Security implications

Closes the exposure of live links by a database or backup leak (BA-10 searches the SQLite file and its WAL for the token and must find nothing). The token never appears in logs (route template only). The opened document is validated again in a worker before use. Residual: anyone holding the link can read the share until it expires or is revoked, and a link pasted into a chat is in that chat's history.

## Reversibility

High. Shares are rows and routes; removing the feature breaks existing links and loses nothing else. Reverse if Amar asks for one project on several of his own devices: add a same-person pairing and library sync, or recommend project files.

## Migration plan

None to migrate: the audit found no share or save. BE-3 builds shares with the buddies list and the compose kit; the app side is the share dialog and the fragment handler.

## Known limitations

Shares are immutable and do not follow later edits. The token is shown once. Some chat apps may strip or rewrite URL fragments (HYPOTHESIS, unchecked); the fallback is a file. `ShareCreated.url` in `openapi.yaml` is still the path form `{origin}/s/{token}` and is to be changed to the fragment form.
