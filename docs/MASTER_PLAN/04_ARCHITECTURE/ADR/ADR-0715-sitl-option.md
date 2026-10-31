# ADR-0715: PX4 SIH as an offline oracle first; a local bridge to SITL only on a stated need; nothing hosted

Status: proposed, 2026-10-27; S0 is for the Drone phase (D-014 order). Author: drone architecture seat.
Upstream: BRIEF 12.1 (PX4/ArduPilot SITL interoperability; "identify whether deeper integrations are worthwhile"); D-015; TECHNICAL_RESEARCH D7, RS-14 (never run: `08_RESEARCH_SPIKES/` has no RS-14 folder; DP-01 is an author-run prototype, not a verdict); RS-14b (dropped: it measured hosted CPU cost, and D-015 excludes hosted SITL); platform-options flight rows; F-074b; R-177. Spec: DRONE_ARCHITECTURE section 13.

## Problem

Would running real flight-controller code add enough value to justify its cost, and where could it run?

## Considered options

| Option | Cost (ESTIMATED) | Value | Verdict |
|---|---|---|---|
| S0 offline oracle (PX4 SIH on Amar's machine, 3 crafts, step response) | about 1 week; no runtime dependency | measures how far the TypeScript model is; sets the label | Chosen first. Built as an offline verification task in the Drone phase (RS-14). Does not block Studio or any earlier phase |
| S1 local bridge (helper on the user's machine, lockstep over loopback WebSocket, about 10 HIL messages) | 4 to 6 weeks; ongoing version upkeep | tune real firmware against the simulated craft; export parameters tested on real controller code | Optional, on a stated need |
| S2 hosted SITL | per-session cost UNKNOWN and abuse handling | | Excluded by D-015 |

## Decision

S0 is built in the Drone phase (D-014 order: after Studio, collaboration, fidelity, faults, components, labs, AI partner and robotics), as RS-14. S1 later if Amar wants real-firmware tuning or ground-station labs, S2 never. The model label after RS-14 follows the rule in the spec: within 15 percent on rise time and overshoot for 3 craft allows "checked against a flight-controller simulation on 3 craft, within X percent" with the measured X; otherwise "Rigid-body teaching model, not checked against flight-controller firmware". The word "validated" is never used (D-007).

## Technical justification

PX4 SIH is BSD-3-Clause, headless, no external dependencies (platform-options S56). ArduPilot SITL and Betaflight SITL are GPL-3.0 (S55, S77); running them as separate processes on the user's machine avoids linking, a reading that is HYPOTHESIS and needs a lawyer if firmware is ever distributed with iynk. The external-simulator message interface for PX4 and ArduPilot's JSON interface are recalled, not fetched (UNKNOWN until read); verify before S1. RS-14b is dropped: it asked whether SITL fits under 50 percent of one shared vCPU for 30 minutes, which only matters for a hosted service. S1 runs on Amar's own machine, so no CPU budget decides anything.

## Cost

As in the table. The prototype shows the controller alone can move step-response metrics by more than the 15 percent threshold (untuned 26 percent overshoot), so RS-14 must compare tuned loops on both sides. The prototype is `08_RESEARCH_SPIKES/DP-01-robot-prototypes/results/quad.txt` (rise 10-90 85.0 ms, overshoot 26.4 percent). It has no independent check and is not a pass or fail for RS-14.

## Licensing

PX4 BSD-3-Clause; ArduPilot and Betaflight GPL-3.0; MAVLink libraries to be checked when chosen (UNKNOWN).

## Security implications

S1 helper is local; allowlisted ports; no remote exposure; messages validated and rate limited.

## Reversibility

High. `FlightModel` can gain a third implementation behind the same interface without touching the UI.

## Migration plan

S0 runs in the Drone phase as an offline task; S1 only on Amar's request. Nothing waits on interviews, a pilot or Fault Lab.

## Known limitations

PENDING RS-14: no report exists (VERIFIED: no folder under `08_RESEARCH_SPIKES/`). What would change the decision: a pass sets the label to the measured X; a fail sends the model back for investigation, and S1 is not built to hide it. S1 runs are not replayable. No browser build of any firmware was found.

## Reconcile and spike fold-in (2026-10-27)

| Id | Change |
|---|---|
| RS-14 | Still no report. Status line now ties S0 to the Drone phase in the D-014 order. Added the DP-01 reference (`results/quad.txt`, overshoot 26.4 percent) as a prototype only. Pending text now says what would change the decision. Matches DRONE_ARCHITECTURE section 13. |
| RS-14b | Marked dropped: it was a hosted-CPU test and D-015 excludes hosted SITL. SITL stays an optional local bridge. |
| RS-03, RS-06, RS-13 | Read for relevance. None bears on SITL, so no change. |
| RC-01 to RC-35 | Checked `RECONCILIATION.md`. No RC id concerns SITL, RS-14 or this ADR, so no change. |
| Skipped | The brief pointed at line 24 for RS-14b. Line 24 holds the licensing and recalled-interface text, not RS-14b. RS-14b appears only on line 4, and I added the dropped note to line 24's text. |

## Reconcile, second pass (2026-10-27)

| Id | Change |
|---|---|
| RC-62 | Line 3 changed from "accepted for the Drone phase" to "proposed, 2026-10-27", with the Drone phase reason kept after it. Only Amar accepts. |
| RC-62 (other files) | Not changed here. ADR-0801, ADR-0807 and ADR-0808 line 3 are outside this task's one-file scope. They still need the same fix (0801: proposed; 0807: "pending RS-16"; 0808: plain proposed) from the agent that owns them. |
