# B1 exit evidence

Run on 2026-10-28 by T-B1-29 against `build/v1` at `38e067c` (B1 T-B1-24), keyless. `KL` is `META_API_KEY= GEMINI_API_KEY= SERPAPI_KEY= NEXT_PUBLIC_REALTIME_URL= IYNK_SERVER_TOKEN= IYNK_AI_ENABLE= IYNK_SEARCH_ENABLE=`. Nothing was fixed during the run. Servers used ports 47311, 47312, 47321 and 47322 and were stopped.

## Verdict

Not green. Two blocking lines are red and one gate spec does not exist.

| # | Line | Result |
|---|---|---|
| 1 | `KL npm run check` | Exit 1 |
| 2 | `bash scripts/ci-local.sh` | Exit 1 (stops at e2e) |
| 3 | `node scripts/copy-check.mjs` | Exit 0 |
| 4 | CSP and keyless e2e | `e2e/csp.spec.ts` does not exist; keyless passes |
| 5 | Build and `bundle-report.mjs` | Exit 0 |
| 6 | `perf-budget.mjs` twice | Exit 0 both times |
| 7 | `provenance:check` and `--strict` | 0 and 1, same 6 rows |
| 8 | Clean-clone README walk | 200 on `/en` |
| 9 | Canary scan | Nothing found |
| 10 | Banned-word grep | Only the allow-listed line |
| 11 | Authorship | Only Amar Kushwaha; no Co-Authored-By |

## Red lines (reopen the owning task, section 6)

1. `e2e/shell.spec.ts:242` "the Keys and usage dialog opens from Settings, passes axe, closes with Escape and hands focus back" fails every time (3 runs: inside `check`, inside `ci-local`, alone with home). At line 56, `page.evaluate` for `document.getAnimations()...animation.finished` rejects with `AbortError: The user aborted a request.` An animation in the open dialog is cancelled before it finishes, so the wait in `expectNoAxeViolations` throws. Owner: T-B1-02 (keys dialog) or the spec's wait; decided by the orchestrator.
2. `e2e/home.spec.ts:27` "the home page passes axe and fits a 360 px screen" failed twice in the full parallel runs with a serious `color-contrast` violation and passed when run with only `home.spec.ts` and `shell.spec.ts` (35 passed, 1 failed, the shell one above). Looks like an entrance animation read mid-fade under load. Owner: T-B1-21 (home page). Flaky, not proven fixed.
3. `e2e/csp.spec.ts` is missing, so the exit line "CSP e2e 0 violations" has no proof. T-B1-13 (CSP) is not on `build/v1`; `git log` has no T-B1-13 commit and `src/lib/csp.ts` is absent. Owner: T-B1-13.

## Outputs

### 1. `KL npm run check` (NEXT_DIST_DIR=.next-T-B1-29)

content:check, typecheck, lint passed. Vitest: 182 files passed, 1 skipped; 2961 tests passed, 3 skipped. Playwright: 136 passed, 2 skipped, 2 failed (the two above). Exit 1.

### 2. `bash scripts/ci-local.sh`

```
step          seconds  result
content             0  passed
typecheck           5  passed
lint                9  passed
no-only             0  passed
copy                0  passed
provenance          0  passed
relay-deps          0  passed
unit               42  passed
relay               6  passed
build              11  passed
e2e                44  FAILED   (same two specs)
```

The run stops at e2e. Run separately with `--only secrets,audit`: secrets passed, audit passed.

### 3. `node scripts/copy-check.mjs`

```
copy check: clean
```
Exit 0.

### 4. `KL NEXT_DIST_DIR=.next-build npx playwright test e2e/csp.spec.ts e2e/keyless.spec.ts`

Only `keyless.spec.ts` ran (the CSP file does not exist): 1 passed (a visitor with no keys and no server walks the app without a single failure).

### 5. Build and bundle report

`KL NEXT_DIST_DIR=.next-build npm run build` succeeded. `node scripts/bundle-report.mjs --dist .next-build` exit 0:

```
route                            chunks  raw bytes  gzip bytes
/[lang]/boards/[board]/[lesson]      15    1055162      334062
/[lang]/robotics/[bench]             15    1040808      328780
/[lang]/boards/[board]               15    1025590      323444
/[lang]/drones/[drone]/fly           14     820632      258304
/[lang]/drones/[drone]               13     797657      247615
/[lang]/together                     10     579794      179982
/[lang]                              10     548086      168433
/[lang]/boards                        9     531194      162532
/[lang]/drones                        9     530480      162284
/[lang]/robotics                      9     530183      162200
/[lang]/about                         9     528094      161511
/[lang]/[...rest]                     8     517363      157402
/_not-found                           6     457636      135712
```

### 6. `node scripts/perf-budget.mjs http://localhost:47311` (production server from the build above)

The script needs a running server (the card omits the URL). Run 2, exit 0, three runs in total all exit 0:

```
metric                        baseline     current  result
landing.js.gzipTransferred      396862      396862  ok
lesson.js.gzipTransferred       584121      584121  ok
idle.landing.mainThreadPct         8.4         7.3  ok
idle.lesson.mainThreadPct            8         7.6  ok
idle.bench.mainThreadPct             7         6.8  ok
run.blink.startMs.cpu4x            115         116  ok
```

Note: the lesson baseline (584121 bytes gzip) is above the proposed 409600 budget; budgets are not enforced yet.

### 7. Provenance

`npm run provenance:check` exit 0; `--strict` exit 1. Same open rows:

```
P-01  Lessons: 71 board lessons and their structure  [unset, decided by unset]
P-02  Board timings  [unset, decided by unset]
P-03  Pinouts, formulas and constants  [unset, decided by unset]
P-04  Drone calculator formulas and constants  [unset, decided by unset]
P-05  342 golden calculator references  [unset, decided by unset]
P-06  The three originals text  [unset, decided by unset]
```

### 8. Clean-clone walk

`git clone --local --branch build/v1 /Users/amar/iynk-build/v1` into scratch (head `38e067c`), `npm ci` (0 vulnerabilities), `KL npm run build`, `npx next start --port 47312`, `curl -w "%{http_code}" /en` printed `200`. The README shows `npm run dev`; the walk used build and start as the card says.

### 9. Canary scan

A built server (`IYNK_AI_ENABLE=1`, a 40-character server token, `META_API_BASE` pointing at a local mock on 47321, `IYNK_DATA_DIR` in scratch, port 47322) answered one chat request sent with `x-iynk-provider-key: iynk-canary-KEY-0001-do-not-use`: events `text` "hello" and `done` with usage 5 in, 2 out. The mock saw `POST /chat/completions` with an authorization header. `grep -r "iynk-canary"` over the data dir, `.iynk-data`, `.next-build/server` and the server log printed nothing. The data dir held only `usage.json`. The token itself was not scanned for separately (only the key string `iynk-canary`).

### 10. Banned words

`git grep -niE "solana|vercel|proof of build" -- README.md src/i18n/messages ':(glob)docs/*.md'` printed one line:

```
docs/FIGURES.md:21:public/figures/<kind>/<id>.html   build output; commit it (Vercel does not run Python)
```
It is allow-listed in `scripts/copy-exceptions.json`.

### 11. Authorship

`git log --format='%an <%ae>' b116e5b..build/v1`: 34 commits, all `Amar Kushwaha`. `git log --grep='Co-Authored-By' b116e5b..build/v1`: no output. `--grep='Generated with'`: no output.

## Open items

- The three red lines above.
- Provenance rows P-01 to P-06 are open (licence decisions are Amar's, D-017).
- The lesson page gzip script total (584121 bytes) is over the proposed 409600 byte budget; the budget is unenforced.
- No device-lab result exists (UNKNOWN).
