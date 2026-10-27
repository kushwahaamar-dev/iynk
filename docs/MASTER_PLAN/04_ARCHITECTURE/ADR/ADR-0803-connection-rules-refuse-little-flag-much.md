# ADR-0803: Refuse only what has no physical meaning; flag everything electrical through the shared static rules

Status: proposed, 2026-10-27. Author: Studio editor design seat.
Upstream: D-007, D-010; SA 13.4; PDM W-rules, B2. Downstream: F-081, F-085, F-097; STU-07, STU-08. Spec: `03_PRODUCT/STUDIO_EDITOR.md`, STUDIO_EDITOR section 7.

## Problem

A learner makes mistakes on purpose and by accident. Blocking an electrical error at connection time hides the lesson; accepting a physically impossible wire breaks the netlist.

## Constraints

1. Refusals must be a closed list with codes and messages.
2. The same rule set serves the editor, the solver preflight and the diagnosis record.
3. A breadboard strip that joins two nets is real physics, not an editor error.

## Considered options

| Option | Summary | Verdict |
|---|---|---|
| Block electrical errors at connection time | Refuse short, contention, reverse | Rejected: hides the fault the learner must be able to diagnose |
| Refuse breadboard shorts | Refuse a leg in a strip of another net | Rejected: it is what a real board does |
| Refuse the impossible, allow and flag the rest; a strip joining two nets merges them and says so | `canConnect` returns `{ok, effect, warnings}` or `{ok:false, reason}` | **Chosen** |

## Decision

`canConnect(doc, viewId, a, b)` refuses a pin to itself, a drop on empty canvas, a missing pin and a mechanical pin. Everything else is allowed and carries `warnings: RuleHit[]` from the shared static rules (SA 13.4). A strip joining two nets issues `net.merge`, shows the short or contention badge, and Undo removes both.

## Technical justification

- Matches the diagnose-first purpose (D-010).
- One rule set means a flag in the editor and in the run record have the same id.

## Performance data

Not measured. Rules run on the pins touched by a gesture. UNKNOWN until the harness measures a long wire drag at 1,000 wires.

## Cost implications

Engineering only.

## Licensing

No new dependency.

## Security implications

Refusals are returned values, not exceptions, and the message text is a key from the i18n catalogue; nothing from the document is injected as markup.

## Reversibility

High. The refusal list is data; moving a case between refuse and flag is a one-line change plus a test.

## Migration plan

Implement the closed refusal list, wire the static rules, add STU-07 and STU-08.

## Known limitations

- Whether a floating-pin warning at connection time is too noisy is a user-test question (not run).
- Rules that need the solver (a load that burns a pin) appear at run time, not at connection time.
