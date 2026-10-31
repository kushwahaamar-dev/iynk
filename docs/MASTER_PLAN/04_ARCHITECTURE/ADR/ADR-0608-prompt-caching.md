# ADR-0608: Cache-friendly request layout: stable prefix, volatile tail, canonical bytes; a local memo for read results and datasheet lookups

Status: proposed, 2026-10-27. Author: AI architecture seat.
Upstream: platform-options 7.1, 7.2; RS-11 target (80 percent cache reads); ADR-0103 (canonical bytes); audit D3 (search quota). Spec: AI_ARCHITECTURE section 10.3, 10.4.

## Problem

Input dominates cost because history and pack are re-sent each call; caching cuts the modelled cost about 3 to 6 times (ESTIMATED).

## Constraints

1. Anthropic needs explicit breakpoints (up to 4); others cache by prefix identity.
2. The project changes while the person works.
3. Nothing shared across people.

## Considered options

| Option | Verdict |
|---|---|
| A. Ignore caching | Rejected |
| B. Order by volatility, canonical bytes, breakpoints after rules and tools, after the digest, after the previous turn | Chosen |
| C. A server-side shared cache | Rejected: no shared server (D-015) |

## Decision

1. Order: rules and mode, tools, digest, history, volatile tail (revision, selection, state, errors, code window, new message).
2. No clocks or nonces in the prefix; revision and hash in the tail.
3. Three breakpoints on Anthropic, 5-minute lifetime by default.
4. Memo: read-tool results by (tool, args, revision) in memory; datasheet searches 24 hours in `ai_memo`; model answers never cached.
5. Compaction at 6,000 tokens of history by the `fast` model, facts only, class L.

## Technical justification

Cache read prices are 5 to 10 percent of input price on the modelled Claude models, and implicit on others (platform-options 7.1).

## Cost implications

Cache miss after an edit is accepted; a pause over 5 minutes costs one re-write.

## Security implications

Summaries are fenced data (ADR-0604).

## Reversibility

Layout is code; can change per provider.

## Known limitations

Hit rate (target 80 percent) is unmeasured until RS-11 or the evaluation run.
