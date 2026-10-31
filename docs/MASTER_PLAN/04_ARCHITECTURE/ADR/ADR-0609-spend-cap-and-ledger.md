# ADR-0609: A local ledger with day, month and session caps checked before every call with a worst-case estimate

Status: proposed, 2026-10-27. Author: AI architecture seat.
Upstream: R-008, R-154; F-003; audit D8 (budget counts requests), D10 (usage dropped); platform-options 7. Spec: AI_ARCHITECTURE section 11.

## Problem

There is no usage record and no durable cap today. With the user's own keys the risk is the owner's own account, which makes a visible cap a basic safety.

## Constraints

1. The cap is the user's, not the operator's.
2. Prices change and are not always known.
3. No server in the loop.
4. Several tabs.

## Considered options

| Option | Verdict |
|---|---|
| A. Only the provider's own limits | Insufficient alone (not visible in the app) |
| B. Local ledger from the log rows, price table with as-of dates, pre-call worst case, reservation | Chosen |

## Decision

1. Caps `dayUSD`, `monthUSD`, `sessionUSD`, `dayTokens` (no price), `sessionTokens` (local), `maxCallsPerMessage`; defaults 1.00, 10.00, 0.50 (PROPOSAL).
2. Pre-call: worst case = input at full or cache-write price plus `maxOutputTokens` at output price; lower `maxOutputTokens` to fit, floor 200; else `capped`.
3. Reserve and broadcast on a BroadcastChannel; settle with actual usage; stale reservations expire.
4. The ledger is the sum of `ai_log` rows (one source of truth).
5. `prices.json` shipped from the 2026-10-26 research, editable, stale warning at 90 days.
6. The page states the limit: per browser profile, not per key.

## Technical justification

Pre-call estimation stops a loop before it spends, which an after-the-fact counter cannot.

## Cost implications

Ledger is a few KB per hundred calls.

## Security implications

Keys never enter rows. Caps are visible.

## Reversibility

Caps are settings.

## Known limitations

Cannot coordinate two devices with one key (Objection 7).
