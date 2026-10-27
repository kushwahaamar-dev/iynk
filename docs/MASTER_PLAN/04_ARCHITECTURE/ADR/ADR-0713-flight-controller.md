# ADR-0713: The flight controller is iynk's own cascaded PID, and CLI settings bind to its parameters

Status: proposed, 2026-10-27. Author: drone architecture seat.
Upstream: BRIEF 12 ("configure flight controllers", "configure control parameters"), 12.1 (flight controller behaviour, controller tuning); council Q13 (GPL question); cli.ts; F-067; ADR-0712. Downstream: F-067, F-216, F-074a. Spec: DRONE_ARCHITECTURE sections 5.4, 7.4.

## Problem

The CLI emulator lets a person `set p_roll = 45` but the effect is a canned patch (`angleLimit`, `boardYaw`, `tailReverse`), because no controller exists to receive a gain. Real firmware is GPL-3.0 (Betaflight, ArduPilot).

## Considered options

| Option | Verdict |
|---|---|
| A. Own controller written from public documentation and control theory; parameters named like the CLI's settings; iynk gain units | Chosen |
| B. Port Betaflight's controller and constants | Rejected: licence risk (GPL-3.0) unresolved (Q13) |
| C. Embed firmware in WASM | Rejected: no known build; GPL |
| D. Keep canned effects | Rejected: cannot teach tuning |

## Decision

Cascaded angle P loop, rate PID with feed-forward, derivative on measurement with a low-pass, conditional-integration anti-windup, mixer computed from the motor geometry, desaturation with airmode, idle clamp, DShot-like command quantisation, thrust linearisation parameter. `FcParams` is one flat table with ranges from the CLI tables; `set` writes it through `domain.patch`. Gains are in iynk units; the Betaflight display-unit mapping waits for counsel (Q13). Notch and RPM filters are "not modelled yet".

## Technical justification

The tables, ranges and four dialects in `cli.ts` are pure and tested; only the "effects" change. The PID form is textbook.

## Cost

Part of slice D3; CLI test expectations updated for changed effects (34 tests, listed in the spec).

## Licensing

Own code. Setting names are facts about an interface; whether tables derived from firmware source carry obligations is open (DK-4) and a rewrite from documentation is the fallback.

## Security implications

Parameter ranges enforced; a hostile room cannot set a gain outside range (validated at `domain.patch`).

## Reversibility

Medium. A different controller is a new `FlightModel` component; the parameter table is stable.

## Migration plan

Settings with no controller meaning keep their old effect text; others bind. The 13 legacy crafts stay on the game model and keep canned effects.

## Known limitations

Not a copy of any firmware: tuning transfer to a real controller is not claimed.
