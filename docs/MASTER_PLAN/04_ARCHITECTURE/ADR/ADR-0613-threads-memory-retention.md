# ADR-0613: Threads, attempts and the learner digest are stored locally per project under a retention setting and stay out of exports

Status: proposed, 2026-10-27. Author: AI architecture seat.
Upstream: BRIEF 13.1; F-115, F-105; audit D11 (conversations vanish on reload); PROJECT_DATA_MODEL 12, 13. Spec: AI_ARCHITECTURE sections 5.6, 13.

## Problem

Conversations live in a module-level Map and vanish on reload (audit D11). BRIEF 13.1 asks for prior attempts within allowed retention.

## Constraints

1. Local-first; nothing on a server.
2. The person controls retention.
3. Exports must not carry chat or keys.

## Considered options

| Option | Verdict |
|---|---|
| A. Memory only | Rejected as the only option (kept as `session`) |
| B. Per-project store with retention values | Chosen |
| C. Cross-project memory | Deferred (F-115, LONG-TERM RESEARCH) |

## Decision

1. Stores `ai_threads`, `ai_log`, `ai_usage`, `ai_memo`, `ai_debug` in IndexedDB database `iynk`, the same database as `proposals` and `keys` (SYSTEM_ARCHITECTURE 8.1, ADR-0106 amended; an earlier version named a second database `iynk-ai`). One database gives one upgrade path and one "wipe local data" action.
2. `ai.retention`: `session`, `project` (default), `forever`.
3. Attempt digest at most 600 tokens from the last 3 thread summaries, 5 Diagnosis records and 5 proposal outcomes of this project.
4. 'Delete AI data' and 'Remove key' are separate.
5. Exports contain no threads, logs, proposals or keys; 'Include AI notes' writes summaries only.

## Technical justification

Separating the AI database keeps the project database schema untouched.

## Cost implications

Small.

## Security implications

Local only; secret scan over exports remains.

## Reversibility

Stores can be dropped without affecting projects.

## Known limitations

No sync between devices. Summaries can be wrong; they are class L.

## Reconcile, second pass (2026-10-27)

| Id | Change |
|---|---|
| RC-72 | Line 22: "Deferred (F-115, LATER)" became "Deferred (F-115, LONG-TERM RESEARCH)", the Feature Prioritization class name. AI_ARCHITECTURE.md line 1097 ("Later" row) is a phase column label, not a class, so it was left alone. "12 benches" does not occur in this file (VERIFIED by grep), so nothing changed for it. |
