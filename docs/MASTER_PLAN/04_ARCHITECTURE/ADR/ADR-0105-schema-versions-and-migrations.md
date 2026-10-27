# ADR-0105: MAJOR.MINOR schema versions with a chain of pure migrations; newer files are refused

Status: proposed, 2026-10-27. Author: project-data-model seat.
Upstream: BRIEF 8.3 ("migration rules"); R-027, R-028; D-017 (placeholder licence); audit A8, A11. Spec: PROJECT_DATA_MODEL 10.

## Problem

Documents outlive the app version that wrote them: a file sent to a friend, a project in IndexedDB for months, a checkpoint in a container. The format will change. The app must open old documents, must never corrupt a document it does not understand, and must make migrations testable.

## Constraints

1. Local-first: no server to migrate data for us (D-015).
2. A person must never lose a document to an upgrade or to opening a newer file.
3. Migrations must be deterministic so hashes stay stable (DET-3).
4. Part descriptors and the robotics and drone data have their own owners and versions.
5. Small team: migrations must be cheap to write and cheap to test.

## Considered options

| Option | Summary | Verdict |
|---|---|---|
| A. `MAJOR.MINOR`; MINOR is additive, MAJOR is breaking; a chain of pure migrations; refuse newer | Predictable | Chosen |
| B. Single integer (R-025 draft: "starts at 1") | Simplest | Rejected: no way to say "added an optional field" versus "changed meaning", so every change looks breaking or none does |
| C. Tolerant reader with no versions (ignore unknown, default missing) | No migrations | Rejected: the schema is closed; silent defaults hide data loss; hashes would differ by reader |
| D. Date-based versions | Easy to order | Rejected: no meaning about compatibility |
| E. Migrate on write on the server | Central | Rejected: no server is required |
| F. Keep old readers forever | No migration | Rejected: the code would carry every old shape |

## Decision

`schemaVersion` is `"MAJOR.MINOR"`. MINOR: add an optional field, enum value, op kind or raise a limit. MAJOR: remove, rename, change meaning, change canonical form, hash domain or id rules, or tighten a limit. Rules M1 to M10 in PROJECT_DATA_MODEL 10.2: pure functions, composed in a chain, idempotent, fixture-tested with real previous-version output, original kept as a backup until the person saves, a newer version (including a newer MINOR) is refused with the original bytes untouched, no down-migrations, `history.ops` dropped on MAJOR migration, `domains.*` and part descriptors migrate by their own chains, and a room needs equal `MAJOR.MINOR`. Before CORE ships, schema edits are edits, not migrations.

## Technical justification

- Refusing a newer minor is the safe reading of R-027 ("never half-opened"). It costs a little convenience and protects against a half-understood document being re-saved with fields dropped. `ext` namespaced fields give a safe way for tools to add data without a version bump.
- A pure function is testable with one fixture pair and cannot depend on the part library, so a migration never changes what a pinned part means (parts are pinned by exact version, ADR-0107).
- Dropping the op tail on a MAJOR change is safe because the head document is always complete; checkpoints store their own `schemaVersion` and migrate on restore.

## Performance data

Not measured; no migration exists. A migration is one pass over the document; parse plus validate measured 1.9 ms at 500 components (VERIFIED), which bounds the cost of re-validating after a migration. The 140 converted projects will be the migration corpus once a second version exists.

## Cost implications

Engineering: a registry of migrations, a fixture folder and a CI check. ESTIMATED under 1 person-week for the harness (no measurement behind it); each migration is then small.

## Licensing

None.

## Security implications

Migrations run on untrusted input after V2 validation of the source version, and are pure (no I/O, no clock, no random). A migration can never execute document content. Refusing newer files avoids silently stripping fields a newer app relied on for safety checks.

## Reversibility

High. The numbering scheme can be swapped without touching documents because the chain only needs an order on versions. A decision to stop refusing newer minors is a loosening and needs no migration.

## Migration plan

1. Ship `1.0` with the migration harness and an empty chain.
2. When the first change lands, write `1.0 -> 1.1` and add its fixture; CI fails without it.
3. Keep every released version's fixture output forever.
4. `provenance.migrations` records what ran.

## Known limitations

- No downgrade: a person who opens a file in an older app gets a refusal.
- Dropping `history.ops` on a MAJOR migration loses undo across the upgrade and the retained tail used for proposal staleness.
- Refusing a newer MINOR blocks harmless additions. If that proves annoying, an "open read-only" mode that shows the raw JSON and sources is the compromise (not specified yet).
- Rooms need every participant on the same version; an update must roll out to all buddies together (the self-hosted server can announce its version).
