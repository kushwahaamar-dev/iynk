# B0-S1: what makes the `]` shortcut miss

Task T-B0-26. Spike, no product code changed.

## Verdict

No failure of the `]` step in 159 runs under load. None of H1, H2 or H3 was observed, so none can be named as the cause. Per the card's exit condition, T-B0-04 applies the defensive fix from its card: wait for the shortcuts dialog to be hidden, assert focus is not a typing target, wait up to 15,000 ms for the URL.

The experiment did find a neighbouring slow step that T-B0-04 should also cover: the `?` press that opens the shortcuts dialog (see "Side finding").

## Question

Under 14 busy-loop processes, in 120 runs of the `]` step, does at least one run fail, and is the cause (H1) focus left inside a typing target after the dialog closes, (H2) the key event reaching no handler, or (H3) the route change taking longer than 5,000 ms?

## Method

- Scratch spec copied from `e2e/boardlab.spec.ts:144-172` (the keyboard-only test: Space, Enter on Run, `?`, Escape, `]`). It lived in `/Users/amar/iynk-master-plan-scratch/buildplan/B0/s1/` and was copied into `e2e/` untracked only to run, then deleted.
- Before `]`: log `document.activeElement` tag, class, `closest(".cm-editor")`, `isContentEditable`. Also install a capture-phase `keydown` listener recording `key` and `defaultPrevented`. After `]`: wait up to 30,000 ms for the URL and log elapsed time. A run counts as failed when the URL is not reached or takes 5,000 ms or more.
- One keyless production build with `NEXT_DIST_DIR=.next-b0-s1` (KL env), then `E2E_SKIP_BUILD=1 npx playwright test <spec> --repeat-each=40 --workers=4 --retries=0`, with 14 busy loops running (the card's `LOAD`).
- The machine was also carrying other agents' work, so the load was higher than the busy loops alone.

## Results

| Batch | Runs | Reached the `]` step | `]` misses | Max `]` time | Load avg (1 min) before, after |
|---|---|---|---|---|---|
| A (first spec version) | 40 | 39 | 0 | 79 ms | 39.4, 102.8 |
| B1 | 40 | 40 | 0 | 70 ms | 42.3, 51.0 |
| B2 | 40 | 40 | 0 | 78 ms | 51.0, 83.1 |
| B3 | 40 | 40 | 0 | 74 ms | 83.1, 143.3 |
| Total | 160 | 159 | 0 | 79 ms | |

- Planned three batches of 40 (120 runs). Batch A was cut short of the plan because its loop script stopped after one batch (a `wait` on the busy-loop jobs); the three batches B1 to B3 were then run with the spec version that also logs the `?` step. Batches A and B are the same test; only the logging differs.
- `activeElement` before `]` in every one of the 159 runs: `BODY`, not inside `.cm-editor`, not contenteditable. So `typingTarget` returned false each time (H1 not seen). The 1-minute load average at the moment of the press, across batch B, ranged from 40 to 114.
- Every `]` press navigated to `/en/boards/uno-r3/button`. Median 34 ms, maximum 79 ms (H3 not seen; far below 5,000 ms). With no miss, the key-event listener log was never needed (H2 not seen).

## Side finding: the `?` step is the slow one

- Batch A: 1 of 40 runs never saw the dialog open from `?` and hit the 30,000 ms test timeout at `expect(dialog).toBeVisible()` (`zz-s1.spec.ts:31`). That is before the `]` step, so it is not a `]` miss. The spec at that point did not log `activeElement` or timing, so the cause of that one is not known.
- Batch B (120 runs): the time from pressing `?` to the dialog being visible had median 17 ms, but 3 runs took more than 5,000 ms (the maximum was 10,613 ms, run 28 of B2) and the rest of the 120 were below that. With Playwright's default 5,000 ms expect timeout those 3 runs would have failed on the dialog assertion, not on `]`.
- So under this load, a keystroke that depends on a late-mounting piece (the dialog) can take longer than 5,000 ms. This is consistent with H3 in spirit (a slow response, not a lost key), but it was measured for `?`, not `]`. Whether the original failure at `:171` was a slow route change cannot be shown from these runs.

## What T-B0-04 should do

1. Apply the defensive fix in its card: after Escape, wait for the dialog to be hidden; assert `document.activeElement` is not a typing target; wait up to 15,000 ms for the `]` URL.
2. Give the `?` dialog assertion the same 15,000 ms, since it was the only step observed to exceed 5,000 ms.
3. Do not add a retry loop around `]`; no evidence says the key is ever lost.

## Reproduce

Scratch spec and logs: `/Users/amar/iynk-master-plan-scratch/buildplan/B0/s1/` (`s1.spec.ts`, `b1.log` to `b3.log`, `run1.log`, `loads.txt`, `loads2.txt`, `go.sh`). Not committed.

## Fix

T-B0-04 applied the defensive fix in `e2e/boardlab.spec.ts` (15,000 ms for the dialog and the `]` URL, a focus check after the dialog is hidden) and added `src/components/boardlab/shortcuts.test.ts`. No retry was added and no product code changed.
