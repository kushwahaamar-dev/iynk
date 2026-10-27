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

HYPOTHESIS, not re-run: after Escape, focus was back in the editor, so `]` was typed into the sketch instead of navigating. The test blurs focus before Space and before `?`, and does not blur again before `]`. A lost keypress under load is also possible. The URL was still Blink after 5 s and 9 polls, so this was not a slow navigation that arrived late.

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

A keyed server. A retry of the one failure alone. A phone run of the keyboard test (it is not in the phone project).
