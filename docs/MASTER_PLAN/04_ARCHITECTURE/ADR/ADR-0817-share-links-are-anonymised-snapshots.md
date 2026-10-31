# ADR-0817: A share link is an immutable read-only snapshot, served as an anonymised copy

Status: proposed, 2026-10-27. Author: API contracts design seat.
Refines: ADR-0426 (share links are capability ids to stored snapshots). Does not decide the link id form again. Upstream: R-095, D-016, PROJECT_DATA_MODEL 5.1 and 13. Downstream: AC-API-12, AC-API-14, F-089. Spec: API_CONTRACTS section 7.1 (Share copy).

## Problem

ADR-0426 chose a stored snapshot. The first API draft served the project's own document, which carries `actors[]` (id, name, `keyThumbprint`), `access.owners`, `provenance.createdBy` and `history.ops[].author`, so a reader could learn identity ids and thumbprints while the contract said they could not.

## Constraints

1. A reader needs no identity.
2. An edit capability must not live in a URL.
3. A revoked or expired link looks like a missing one.
4. The copy must still validate (V2 to V5).

## Considered options

| Option | Verdict |
|---|---|
| A. Freeze an anonymised copy at creation | Chosen |
| B. Serve the stored document and promise privacy | Rejected: false, as above |
| C. Strip fields on every read | Rejected: the hash would differ per read and a bug leaks silently |
| D. Live or editable links | Rejected by R-095 |
| E. Project embedded in the URL | Rejected: too large (PROJECT_DATA_MODEL 12.1: 11.1 KB gzip for one converted lesson) and not revocable |

## Decision

`createShare` builds a copy with `history` and `exports` emptied, `access` reset to one random owner, `actors` reduced to `{id: S, name: <sharer's display name>}` without a thumbprint, `provenance.createdBy` set to `S` and `contributors` omitted, where `S` is `usr_` plus 16 random base32 characters, new per share. The copy and its hash are stored in the share row and `SharedProject.stateHash` is the copy's. The link carries a 128-bit token in the fragment (ADR-0812); `shr_` ids are for management only.

## Technical justification

Building the copy once makes the served bytes stable and the hash meaningful. A random actor per share prevents linking two shares or tying a share to a key.

## Performance data

PROJECT_DATA_MODEL 12.1 gives 11.1 KB gzip for one converted lesson. A copy is at most the 5 MiB document limit and is smaller than the project because history is dropped (ESTIMATED). No timing is claimed.

## Cost implications

One extra stored document per share.

## Licensing

No new dependency. A share exposes the project's own content licence, which the document carries.

## Security implications

A reader learns the sharer's display name and nothing else about identities. Deleting the sharer deletes the share. Documents are untrusted on open (ADR-0426). A copy a reader already downloaded stays theirs.

## Reversibility

High. The copy rule is server-side; the wire shape is unchanged.

## Migration plan

None; no shares exist today.

## Known limitations

A sharer's display name is public to link holders by design. Text inside the project (a title, a comment, source code) can still name a person; the server does not scan free text.
