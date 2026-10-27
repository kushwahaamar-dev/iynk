# E2E: keyless Playwright run

Run by the orchestrator on 2026-10-27, 01:08–01:11 CDT, after the Sonnet agents stopped on a usage limit. This file is that run. The earlier scratch log `e2e_full.log` is not a result: it only printed "Running 119 tests" and then the agent died.

| Field | Value |
|---|---|
| Repo | `/Users/amar/Codes/ak/simlab` |
| HEAD | `e6be2c7` (docs on top of audited source `bb546d6`) |
| Command | `E2E_PORT=47401 E2E_SKIP_BUILD=1 NEXT_DIST_DIR=.next-audit npm run e2e` |
| Build | Existing keyless `.next-audit`. Not rebuilt. |
| Port | 47401. Free again after the run. |
| Keyless | The eleven names in rule 9 were exported empty. Each printed `length=0`. No value was printed. |
| `/api/status` | `{"features":{"ai":false,"image":false,"voice":false,"search":false,"solana":false,"db":false,"realtime":false,"gemini":false}}`. VERIFIED. |
| Load at start | 109.94, 102.82, 81.90 on 14 cores. Not a quiet machine. The duration is measured under contention. |
| Log | `/Users/amar/iynk-master-plan-scratch/audit/e2e/e2e_retry2.log` |
| Tree | `package.json`, `package-lock.json` and `tsconfig.json` were unchanged after the run. VERIFIED (`git diff --stat` empty, `git status --short` empty). |

No second, keyed run. No contact with iynk.tech, rt.iynk.tech, Vercel, Vultr or Solana.

## Result

Playwright's own summary, VERIFIED from the log:

| Project | Passed | Failed | Skipped |
|---|---|---|---|
| chromium | 108 | 1 | 2 |
| phone | 8 | 0 | 0 |
| total | 116 | 1 | 2 |

119 tests, wall time 142.67 s (`real` from `/usr/bin/time -p`). The shell wrapper then exited 0 because it tried to assign `$?` to `status`, which is read-only in zsh, and the pipeline's exit code is `tee`'s. That 0 is not Playwright's exit code. The reporter says one test failed, so the suite failed.

## The failure

`e2e/boardlab.spec.ts:144`, chromium, "keyboard only: Space runs and stops, ? opens the shortcuts". It ran 21.2 s and failed at line 171.

```
Error: expect(page).toHaveURL(expected) failed
Expected pattern: /\/en\/boards\/uno-r3\/button$/
Received string:  "http://localhost:47401/en/boards/uno-r3/blink"
Timeout: 5000ms
```

The press of `]` did not leave the Blink lesson. The assertions before that line passed, so Space started and stopped the run, Enter did the same on the Run button, `?` opened the shortcuts dialog, and Escape closed it. This is not a keyless failure. The spec does not assert AI, search, the database, Solana or the relay.

What the code does, VERIFIED by reading it:

- `]` is the next-lesson shortcut (`src/components/boardlab/shortcuts.ts:90`).
- The handler pushes `/${lang}/boards/${board.id}/${target.id}` when a next lesson exists (`src/components/boardlab/LessonWorkspace.tsx:274`).
- The same handler returns without acting when focus is in the code editor (`shortcuts.ts:50`, `LessonWorkspace.tsx:241`).

Retest, VERIFIED (2026-10-27 12:34-12:36 CDT, same keyless build `.next-audit`, port 47401, same eleven names exported empty; logs in `/Users/amar/iynk-master-plan-scratch/audit/e2e-gap/`):

| Run | Command (after the keyless exports) | Load average (1 min) | Result | Playwright exit code |
|---|---|---|---|---|
| Low load | `E2E_PORT=47401 E2E_SKIP_BUILD=1 NEXT_DIST_DIR=.next-audit npx playwright test e2e/boardlab.spec.ts:144 --repeat-each=5` | 9 to 12 (about 5 just before) | 5 passed, 7.3 s, each 3.7 to 4.8 s | 0 (`low.log`, captured with `$?` straight after, no pipe) |
| Higher load, run 1 | same | 67 to 75 | 5 passed, 13.7 s, each 4.3 to 5.7 s | 0 (`high1.log`) |
| Higher load, run 2 | same | 73 to 75 | 5 passed, 6.6 s, each 3.8 to 5.3 s | 0 (`high2.log`) |

15 of 15 passes, including the `]` assertion at line 171. The failure did not reproduce. The load in the two higher runs was other work on the machine, not load I generated (my own busy-loop helper never started: `timeout` does not exist on this macOS shell). It was below the original run's load of about 110, so it is not an exact replay. The exit codes above are Playwright's own, not `tee`'s.

What this settles:

- The focus hypothesis is withdrawn. BROWSER_WALK step 2 measured `activeElement` = `BODY` after Escape and 5 of 5 hand passes; the retest agrees. Nothing here shows focus returning to the editor.
- The failure is not deterministic. On the evidence, the best remaining explanation is a lost or late keypress under the original load of about 110, but that is a HYPOTHESIS. It was not reproduced and I did not read a trace, so the cause is UNKNOWN.
- Fragility that the code does show (VERIFIED by reading the spec): after `Escape` closes the dialog, the test presses `]` at once, with no wait for focus to settle and no blur, while the earlier steps blur first (`e2e/boardlab.spec.ts:149`, `:165`). A short settle or an explicit blur before line 170 would remove that class of race. This is a suggestion, not a change made.
- Severity: low. One flake in 117 attempted tests at load about 110; 15 of 15 pass at load up to 75.

## The skips

Both skips are chromium, and both are the describe "a board whose prose is not translated yet" (`e2e/boardlab.spec.ts:207`). The condition is `test.skip(!untranslated, "every board's prose exists in every language")`. They skipped because the check found no untranslated board. That is the skip working as written, not a missing browser.

## What passed that matters

- Board Lab: Blink runs, the LED and serial monitor update, a compile error is shown and nothing runs, edited code runs, the lesson page passes axe, phone layout does not scroll sideways. VERIFIED by these tests passing.
- Robotics: the index lists 13 benches in en, es, de, fr, hi and zh. A bench page, its quiz and its figure loaded. VERIFIED.
- Drone Lab: the index lists 13 crafts. On quad5, a design change updates the calculation, the three safety tests run, and the Betaflight CLI answers. VERIFIED.
- Flight: the demo arms, takes off and clears a first gate or checkpoint for quad5, whoop, cinewhoop, racer, gpscam, wing, agrihex, swarm, tricopter, delivery, octo, longrange and vtol. VERIFIED. These are the app's own demo, not a comparison with a flight simulator.
- Rooms: `e2e/room.spec.ts` passed, including two tabs sharing a build. The spec's own comment (`room.spec.ts:7`) says that with no relay configured a room is a BroadcastChannel inside one browser profile. VERIFIED that those tests pass keyless. They do not show a relay on another machine.
- Shell: six languages render, a first visit is light, axe passes on the dashboard and the 404, and "without the AI service, the Together lede doesn't promise translated chat" passed (`e2e/shell.spec.ts:230`). That last one matches `features.ai: false`.

## Not run

A keyed server. A retest at load about 110 (the original failure's load). A phone run of the keyboard test (it is not in the phone project).

## Gap fixes (2026-10-27)

| # | Gap | What I did | Status |
|---|---|---|---|
| 1 | The failing test (`boardlab.spec.ts:144`) was never retried; the focus hypothesis contradicted BROWSER_WALK; the exit code 0 came from `tee`. | Ran the test alone with `--repeat-each=5` at low load (5/5) and twice at load 67 to 75 (5/5 each), keyless, port 47401, no rebuild. Recorded Playwright's own exit code (0 each time, no pipe). Replaced the focus hypothesis with the result. The original exit code of the full suite stays unknown: the reporter said 1 failed, so the real code was nonzero, but it was not captured. | Closed for the retest. Known limit: the original failure was not reproduced and its cause is UNKNOWN; load about 110 was not recreated. |
