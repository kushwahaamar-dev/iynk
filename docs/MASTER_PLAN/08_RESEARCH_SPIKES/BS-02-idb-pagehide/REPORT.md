# BS-02: IndexedDB at `pagehide`, and a file handle in a worker

## Question
Q1: does an IndexedDB `readwrite` transaction started in a dedicated worker, from a message posted in the page's `pagehide` or `visibilitychange` (hidden) handler, commit before the tab goes away, in Chromium and WebKit?
Q2: does `FileSystemFileHandle.createWritable()` work inside a dedicated worker for a handle received by `postMessage`?

## Why it matters
T-B3-04 must decide where the last autosave batch is written when the person closes the tab (FA-08). T-B3-05 and T-B3-27 must decide whether a worker or the main thread streams bytes into a file handle.

## Exit condition
Q1 PASS: at least 199 of 200 trials survive in each engine. Q1 FAIL in an engine: T-B3-04 writes the last batch to the `journal` store from the main thread. Q2 PASS: the worker writes bytes to the handle. Q2 FAIL: the worker returns bytes and the main thread streams them.

## Environment
| Item | Value |
|---|---|
| Node | v24.8.0 |
| Playwright | the repo's `@playwright/test`; Chromium 156.0.8078.4 and WebKit 27.2 (Firefox is not installed, so not tested) |
| Browser mode | headless, `launchPersistentContext` with a throwaway profile (see "Harness notes") |
| Server | a 25-line static server on `127.0.0.1`, random port in 47000 to 47999, stopped after the run |
| Date | 2026-10-28 |

## Method
1. A scratch page starts a dedicated worker that opens database `s2` (store `c`). The page registers `pagehide` and `visibilitychange` (hidden) handlers. Each handler does one thing and nothing before it: post `{trial, durability}` to the worker, which then opens `db.transaction('c', 'readwrite', { durability })` and puts the trial id.
2. One trial: open the page with a unique trial id, wait until the worker is ready, close the page with `page.close({ runBeforeUnload: true })`, open a new page in the same context, ask its worker for the key, count a hit when the value equals the trial id.
3. 200 trials per engine, per `durability` (`relaxed`, `strict`).
4. Controls, same 200 trials: `main` does the put from the main thread in the same two handlers (this is the T-B3-04 fallback); `early` posts to the worker as soon as it is ready, before teardown starts (proves the read side and the worker write work at all).
5. A second teardown, `leave`: instead of closing, navigate the same tab to another same-origin URL (what a reload or a link does) and read there.
6. Q2: `navigator.storage.getDirectory()` then `getFileHandle('q2.bin', { create: true })` on the page, `postMessage` the handle to the worker, and in the worker `createWritable()`, `write(Uint8Array[1,2,3,4])`, `close()`, then `getFile()` to count bytes. Also tried `createSyncAccessHandle()`.
7. A user-picked handle (`showSaveFilePicker`) needs a person. Not tested here: this is "For Amar" item 4 in the B3 task file.

## Results

### Q1, tab closed (`page.close({ runBeforeUnload: true })`), survivals of 200
| Engine | Writer | `relaxed` | `strict` |
|---|---|---|---|
| Chromium | worker at `pagehide`/hidden | 198 | 199 |
| Chromium | main thread at `pagehide`/hidden | 197 | 198 |
| Chromium | control: worker, before teardown | 200 | not run |
| WebKit | worker at `pagehide`/hidden | 0 | 0 |
| WebKit | main thread at `pagehide`/hidden | 0 | 0 |
| WebKit | control: worker, before teardown | 195 | not run |

### Q1, tab navigated away (same origin), survivals of 200
| Engine | Writer | `relaxed` | `strict` |
|---|---|---|---|
| Chromium | worker at `pagehide`/hidden | 0 | 0 |
| Chromium | main thread at `pagehide`/hidden | 0 | 0 |
| Chromium | control: worker, before teardown | 200 | not run |
| WebKit | worker at `pagehide`/hidden | 0 | 0 |
| WebKit | main thread at `pagehide`/hidden | 0 | 0 |
| WebKit | control: worker, before teardown | 200 | not run |

A beacon sent from the same handlers showed that `pagehide`, `visibilitychange` (hidden) and `beforeunload` all fired in both engines, so the zeros are not a handler that never ran.

### Q2, `createWritable()` in a worker (OPFS handle sent by `postMessage`)
| Engine | Handle cloned to worker | `createWritable()` + `write` + `close` | Bytes read back | `createSyncAccessHandle()` |
|---|---|---|---|---|
| Chromium | yes | ok | 4 | ok |
| WebKit | yes | ok | 4 | ok |

## Verdict
**Q1: FAIL in both engines.** A transaction that is only requested in `pagehide` is not reliable. Chromium commits most of the time when the tab is closed (about 99 percent) and never when the tab navigates away; WebKit never commits. Under this method the main-thread `put` is no better than the worker: it fails the same way, so the card's fallback ("a single small `put` from the main thread at `pagehide`") does not fix it. `durability: 'strict'` changed little. The controls show the mechanism works when the request is issued earlier (200 of 200, and 195 of 200 in WebKit where the tab was closed straight after).

**Q2: PASS in both engines.** A worker can open `createWritable()` on a received handle and write. Only an OPFS handle was tested, a user-picked handle may behave differently.

## Consequences for later tasks
| Task | What to do |
|---|---|
| T-B3-04 | Set `FlushStrategy` to `'main-journal-at-pagehide'` as the card says, but do not rely on `pagehide` for durability. The save must already be in flight before teardown: send `save` on `visibilitychange` to hidden (which fires while the page is still alive, e.g. on a tab switch) and keep the 500 ms debounce and 5 s max-wait, so the exposure at close is at most the last 500 ms of edits. Treat anything written in `pagehide` as best effort. Not tested here: a small synchronous `localStorage` write at `pagehide` as a last-gasp copy of the pending journal batch; it is the one option that does not need a transaction to finish, and the next open could move it into the `journal` store. Measure it before adopting |
| T-B3-24 | The FA-08 close-the-tab test should assert the loss window (edits made in the last debounce interval), not zero loss |
| T-B3-05, T-B3-27 | The worker may write the file itself with `createWritable()` on a handle received by `postMessage`; the main-thread streaming fallback is not needed. Re-check with a user-picked handle once (For Amar item 4) |

## Harness notes and limits
- With `browser.newContext()` Playwright's WebKit refused `navigator.storage.getDirectory()` ("UnknownError ... transient reason"). `launchPersistentContext` with a throwaway profile made it work, so all results above use that.
- `page.close()` is not a person closing a tab: Playwright may tear the page down faster than a browser UI does, which could understate survival. The same applies to the WebKit control (195 of 200). A real tab close in Chrome and Safari was not tested; the numbers are an upper bound on the risk only if real browsers give the page more time.
- Firefox is not installed here, so it is untested.
- Safari on iOS and desktop Safari proper were not tested; Playwright WebKit is the engine build only.
- The spike code is throwaway and lives outside the repository; this report holds the method needed to repeat it.
