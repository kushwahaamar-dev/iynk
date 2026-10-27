# ADR-0602: Tools in three kinds of power: read, propose, effect; op schemas come from the project schema

Status: proposed, 2026-10-27. Author: AI architecture seat.
Upstream: BRIEF 13.2, 13.5; F-105, F-107, F-110, F-167; R-155, R-157, R-163; audit D4, D7, A4, A10. Spec: AI_ARCHITECTURE section 6.

## Problem

The audited tool set has `propose_change` with full-text find and replace (stale overwrite, audit D5), advertises wire and part changes two of three labs reject (D7), `ask_peer` posts into the room without a click (A4) and `find_parts` can cost 30 searches per call with no meter (D4).

## Constraints

1. The model must not execute code or call privileged APIs without controlled authorization (BRIEF 13.5).
2. One schema per tool serves the model's JSON Schema and validation (kept from `tools.ts`).
3. Same tools later reachable over MCP (F-167).
4. Tool definitions cost tokens every call.

## Considered options

| Option | Verdict |
|---|---|
| A. Keep the six tools, fix each | Rejected: the central one, `propose_change`, has the wrong shape |
| B. Read tools, one `propose_ops`, effect tools with a click | Chosen |
| C. A code-execution tool for analysis | Rejected: no need; `try_ops` gives bounded what-if runs in the sandboxed worker |
| D. Give the model every op kind's schema | Rejected: the `Op` schema is 12,848 bytes (about 3,700 tokens ESTIMATED); op groups load on demand |

## Decision

1. 24 tools in classes `read`, `compute`, `ui`, `propose`, `effect` (AI_ARCHITECTURE 6.2).
2. `propose_ops` takes steps of ops from `$defs/Op`; op groups `core` first, `board`, `mech`, `sim`, `meta` on `request_ops_group`.
3. Effect tools show their exact arguments and wait for a click, every time; `draft_buddy_message` only drafts.
4. Unknown ids return `unknown_ref` with nearest ids.
5. Limits: 6 read rounds, 8 tool calls per round, 20 per message, one owner of the counters (the AI host).
6. Tool-less models use `iynk-tool` and `iynk-ops` fenced blocks parsed by the same schemas.

## Technical justification

The tool classes map to what can go wrong: read cannot change anything, compute works on a copy, propose waits for the Accept, effect waits for a click. Reusing the project schema means the model cannot express an edit the editor cannot.

## Cost implications

Tool block about 2,200 tokens without op schemas, about 1,700 more with `core` ops (ESTIMATED).

## Security implications

No tool applies a change, runs host code, reads disk, or fetches an arbitrary URL. Search tools go through the person's own search key after a click.

## Reversibility

Tool names and schemas are versioned with `promptVersion`. A tool can be removed from a mode by configuration.

## Known limitations

A model with weak tool calling needs the json-text path (quality UNKNOWN). 24 tools is a lot for small models; Compact profile exposes the read subset only.
