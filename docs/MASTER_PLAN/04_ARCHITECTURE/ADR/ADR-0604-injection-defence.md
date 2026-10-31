# ADR-0604: Prompt-injection defence assumes a compromised model: capability gating, taint, nonce fences, rendering rules and a compromised-model test harness

Status: proposed, 2026-10-27. Author: AI architecture seat.
Upstream: BRIEF 13.5; F-112; R-159; SECURITY_BASELINE A1 to A4, A6, X5; council security-privacy (background). Spec: AI_ARCHITECTURE section 14.

## Problem

Models cannot reliably tell instructions from data. Untrusted text reaches the model through names, code, imported files, serial output, compiler messages, search results, buddy chat and stored threads. The current fence is advice (A1) and search text is unfenced (A3).

## Constraints

1. Defence must hold when the model obeys every injected instruction.
2. Must not make the partner useless (every grounded turn reads project text).
3. Testable without a live model.

## Considered options

| Option | Verdict |
|---|---|
| A. Better prompts and fences only | Rejected: not enforcement |
| B. A second model that screens text | Rejected as the primary control: costs a call per turn, can be fooled the same way; may be added as an extra signal later |
| C. Capability limits so a compromised model can do little, plus fences as a hint | Chosen |

## Decision

1. Trust classes A, R, S, P, L, X; only shipped rules and the current user message carry authority.
2. Taint: P or X content in a turn is recorded on the proposal and shown on the card; X taint blocks `propose_ops` and `draft_buddy_message` until one explicit confirmation.
3. Effect tools always need a click; R3 ops never reach a card.
4. Fences carry a per-request random nonce; fenced text is escaped, capped, NFC-normalised, with zero-width and bidi controls removed (shown as escapes in code).
5. Output rendering: links only for URLs seen in this thread, with a confirm; no images, no HTML; claims of action are annotated.
6. The adversarial suite (82 cases at start) runs a `CompromisedModel` stub through the real host and checks invariants AI-INV-1 to AI-INV-10; it is a merge gate.
7. Live runs measure how often real models follow injections; informational.

## Technical justification

Each control limits a consequence, not a probability. Because every change needs a click and every outside effect needs a click, the worst realistic outcome of a successful injection is a bad suggestion that the person sees with its sources listed.

## Cost implications

Test time under 30 s in CI (ESTIMATED). No per-turn cost.

## Security implications

This ADR is the security control for the AI layer. Residual risk: a persuasive but harmless-looking suggestion the person accepts (R1 edit); the card's taint line and diff are the mitigation.

## Reversibility

Controls are independent layers; each can be tightened without touching the others.

## Known limitations

Link and claim checks are heuristics. Taint blocking can annoy when web results are useful; the confirm is one click. Trojan-source style attacks are mitigated in the pack, not in the editor, which is outside this ADR.
