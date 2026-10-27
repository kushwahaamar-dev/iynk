# ADR-0603: AI changes are operation proposals: validated, dry-run, previewed, accepted by a person, applied as one undoable batch, attributed

Status: proposed, 2026-10-27. Author: AI architecture seat.
Upstream: BRIEF 13.3; F-110, F-106, F-083; R-157, R-158; ADR-0104; PROJECT_DATA_MODEL 7.1 to 7.5; `$defs/Proposal`; audit D5, A10; council ai.md principles 1 to 4. Spec: AI_ARCHITECTURE section 7.

## Problem

AI changes must be explicit, reviewable, reversible, schema-validated, permission-checked, logged and attributed. Today a stored finished text overwrites newer edits on Accept.

## Constraints

1. Local-only and room editing use the same `apply`.
2. A rejected batch changes nothing (RS-09 invariant).
3. A batch is one message in a room (relay frame 64 KiB).
4. Undo is per author, one step per Accept.
5. The `Proposal` schema has a fixed shape (four statuses).

## Considered options

| Option | Verdict |
|---|---|
| A. Full-text replacement (today) | Rejected (D5) |
| B. Let the model call edit tools that apply at once | Rejected: no review |
| C. Ops against a base revision, kept outside the document, applied on Accept | Chosen (extends data model 7.5) |
| D. Auto-apply low-risk ops | Deferred: not offered; risk classes exist so it could be added by a deliberate later decision |

## Decision

1. A proposal is `Proposal` plus a local `ProposalRecord` with state, steps, risk, read set, touched ids, taint, dry-run report, model, prompt version and context hash.
2. Pipeline P1 to P8: parse, schema, allow-list and mode, permission, secret and placeholder scan, dry-run at the current revision, checks, diff.
3. Risk classes R0 to R3 over the 55 op kinds; R3 is never proposed; R2 needs a confirm tick with cascade counts.
4. Accept re-checks revision, scans the log for overlap with `touched` (line based for `source.edit`), re-runs the dry run, and applies only if the diff hash equals what was shown.
5. Apply is one batch, `author.kind = ai`, `author.proposal`, one undo step. 'Accept some' selects whole steps with dependencies.
6. At most 2 repair retries; a failing check is shown as failing.
7. Attribution gap (model not in `OpEnvelope`) is recorded as Objection 1.

## Technical justification

It uses the exact path already specified for buddy proposals, so no second mechanism exists. The diff hash rule closes the gap between what was previewed and what is applied. Line-based overlap for source edits avoids the intent loss of the range transform that RS-09 documented.

## Cost implications

Dry run and checks are local CPU: 2 s wall budget per `try_ops` or proposal check (PROPOSAL, same worker kill as BUD-12).

## Security implications

Permission is the asker's role; the room server re-checks. `kind: ai` is an unverifiable claim from the client and is documented as advisory. Secrets and placeholders cannot be written into sources.

## Reversibility

The record store is local and prunable. Changing the risk table is a code change with tests, not a data migration.

## Known limitations

Stale detection needs the op log back to `base`; if it is gone the proposal is stale. After an accepted proposal is purged from the record store the model name can be lost (Objection 1).
