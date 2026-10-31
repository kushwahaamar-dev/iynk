# BUILD_OUTPUT: keyless production build

Agent: validate:commands. Run 2026-10-27 (CDT), HEAD `16a3d09`, source identical to audited commit `bb546d6` (see `COMMANDS.md`). Planning only; no server was started.

## Keyless setup

| Item | Result | Label |
|---|---|---|
| Command | `NEXT_DIST_DIR=.next-audit npm run build` (via `/Users/amar/iynk-master-plan-scratch/audit/validate/build.sh`, which exports the names below as empty first) | VERIFIED |
| Names exported empty (names only) | `NEXT_PUBLIC_SOLANA_PROGRAM_ID`, `SOLANA_ISSUER_KEYPAIR`, `META_API_KEY`, `GEMINI_API_KEY`, `SERPAPI_KEY`, `NEXT_PUBLIC_REALTIME_URL`, `VULTR_API_KEY`, `TIMESCALE_SERVICE_URL`, `PGPASSWORD`, `PGHOST`, `DATABASE_URL` | VERIFIED |
| Printed before the build | each name as `name length=0`; all 11 printed `length=0` | VERIFIED |
| `.env.local` has those names set | yes, all 11 are set and non-empty in `.env.local` (checked by name and length only; no value was printed) | VERIFIED |
| Build still read `.env.local` | yes: log line `- Environments: .env.local`. The empty shell variables override it for the 11 names. | VERIFIED |
| Names in `.env.local` I did not blank (names only) | `GEMINI_MODEL`, `META_API_BASE`, `META_IMAGE_MODEL`, `META_MODEL`, `META_TRANSCRIBE_MODEL`, `NEXT_PUBLIC_SOLANA_CLUSTER`, `PGDATABASE`, `PGPORT`, `PGSSLMODE`, `PGUSER`, `SERPAPI_MONTHLY_BUDGET`, `VULTR_HOST`. The task did not list them; they are model names, a cluster name, ports and hosts rather than keys. | VERIFIED |
| Build exit code | **0** | VERIFIED |
| Wall time | 72.77 s `real` (133.46 s user, 14.96 s sys). Measured under contention: load average 86.39 before, 74.12 after, 14 cores. Not a quiet-machine number. | VERIFIED |
| Next.js | 16.4.3, Turbopack, "Cache Components enabled", "Partial Prefetching enabled" | VERIFIED |
| Dist dir | `/Users/amar/Codes/ak/simlab/.next-audit` (632 MB by `du -sh`), **kept**, gitignored by `.next-*/` | VERIFIED |
| Full log | `/Users/amar/iynk-master-plan-scratch/audit/validate/09_build.log` (158 lines), timing in `09_build.meta` | VERIFIED |

Phases from the log: "Compiled successfully in 15.9s", "Finished TypeScript in 32.8s", "Generating static pages using 13 workers (827/827) in 18.5s".

### Is `rt.iynk.tech` in the client chunks?

**No.** Commands, run in the repo root:

| Command | Output |
|---|---|
| `rg -F -c "rt.iynk.tech" .next-audit/static \| wc -l` | 0 files |
| `rg -F -l "iynk.tech" .next-audit/static \| wc -l` | 0 files |
| `find .next-audit/static -name '*.js' \| wc -l` | 116 JS files searched (5,637,633 bytes together, `... \| xargs -0 cat \| wc -c`) |
| `rg -F -l "rt.iynk.tech" .next-audit/server \| wc -l` | 0 files (for information) |
| `rg -n "rt\.iynk\.tech" src figures server/realtime/src scripts next.config.ts .env.example` | one hit, in `scripts/workflows/master-plan-audit.js:28` (a prompt text, not product code). No hit in `src/`. |

Reading: the relay host is not written in the source. It comes from `NEXT_PUBLIC_REALTIME_URL` at build time, and this build had it empty. VERIFIED (build and search). So a keyless build carries no hard-coded production relay hostname and no fallback to it. What the relay URL does in a normal build (inlined into client chunks when set) is HYPOTHESIS: not built here.

No secret value was searched for in the source or in the build. Only the public hostnames above.

### Status check

Not done. No server was started (task rule), so `/api/status` could not be curled. That check belongs to the later serve step.

### tsconfig.json

`next build` rewrote `tsconfig.json`: `git diff --stat tsconfig.json` printed `1 file changed, 3 insertions(+), 1 deletion(-)`. It added `.next-audit/types/**/*.ts` and `.next-audit/dev/types/**/*.ts` to `include`, and the log says "We detected TypeScript in your project and reconfigured your tsconfig.json". I ran `git checkout -- tsconfig.json`. `git status --short` was then clean. VERIFIED.

Why this matters: this `NEXT_DIST_DIR` build wrote to a tracked file, so an agent build with its own dist dir dirties the tree (severity low). `.gitignore` already ignores `.next-*/`, but not the `tsconfig.json` edit.

## Route table

Source: the "Route (app)" table in `09_build.log` and `.next-audit/prerender-manifest.json`. Symbols as the build prints them: `○` static, `●` SSG with `generateStaticParams`, `◐` partial prerender (static shell, dynamic content streamed), `ƒ` dynamic (server-rendered on demand).

### Counts (commands in the right column)

| Count | Value | Command | Label |
|---|---|---|---|
| Static pages generated | **827** | log line `Generating static pages using 13 workers (827/827) in 18.5s` | VERIFIED |
| Routes in `prerender-manifest.json` `routes` | 791 | `python3 -I` reading `.next-audit/prerender-manifest.json` | VERIFIED |
| `dynamicRoutes` in that manifest | 14 | same | VERIFIED |
| Top-level entries in the route table | 41 | `rg "^[├└┌] [○●ƒ◐ ]" 09_build.log \| wc -l` | VERIFIED |
| of which `ƒ` dynamic (all under `/api/`) | 23 | `rg -c "^[├└┌] ƒ" 09_build.log` | VERIFIED |
| of which `○` static files (`/_not-found`, `/apple-icon.png`, `/icon.svg`) | 3 | `rg -c "^[├└┌] [○●]" 09_build.log` | VERIFIED |
| of which page route patterns (app pages) | 15 | `rg -c "^[├└┌]   /" 09_build.log` (14 `[lang]` page patterns plus `/-/opengraph-image.png`) | VERIFIED |

The 827 versus 791 gap (36) is not explained by the manifest alone; the build counts every generated artifact (for example icons, not-found and image routes), the manifest counts routes. HYPOTHESIS: not investigated further.

### Page patterns and what they prerender

| Pattern | Rendering in table | Notes from the table |
|---|---|---|
| `/[lang]` | `◐` plus `○ /en`, `○ /es`, +4 more paths | 6 locales appear in "+4 more" |
| `/[lang]/[...rest]` | `◐`, `○ /en/not-found`, `○ /es/not-found`, +4 | catch-all not-found |
| `/[lang]/about` | `◐` +`○` | |
| `/[lang]/boards` | `◐` +`○` | index |
| `/[lang]/boards/[board]` | `◐`, `○ /en/boards/uno-r3`, `○ /en/boards/nano`, +70 | 12 boards x 6 locales = 72 |
| `/[lang]/boards/[board]/[lesson]` | `◐`, `○ /en/boards/uno-r3/board`, `.../blink`, +424 | largest group |
| `/[lang]/drones` | `◐` +`○` | index |
| `/[lang]/drones/[drone]` | `◐`, `○ /en/drones/quad5`, `.../whoop`, +76 | 13 drones x 6 locales = 78 |
| `/[lang]/drones/[drone]/fly` | `◐`, `○ /en/drones/quad5/fly`, `.../whoop/fly`, +76 | same 78 |
| `/-/opengraph-image.png` | `●` | one image |
| `/[lang]/passport` | `◐` +`○` | |
| `/[lang]/robotics` | `◐` +`○` | index |
| `/[lang]/robotics/[bench]` | `◐`, `○ /en/robotics/uno-r3-build`, `.../led-resistor`, +76 | 13 robotics x 6 locales = 78 |
| `/[lang]/together` | `◐` +`○` | |
| `/[lang]/verify` | `◐` +`○` | |
| `/apple-icon.png`, `/icon.svg` | `○` | |

Dynamic API routes (`ƒ`, 23): `/api/ai/chat`, `/api/ai/image`, `/api/ai/match`, `/api/ai/plan`, `/api/ai/story`, `/api/ai/transcribe`, `/api/ai/translate`, `/api/buddies`, `/api/leaderboard`, `/api/live`, `/api/mcp`, `/api/mcp/tools/[name]`, `/api/openapi.json`, `/api/search/events`, `/api/search/nearby`, `/api/search/offers`, `/api/search/videos`, `/api/search/web`, `/api/solana/attest`, `/api/solana/credentials`, `/api/solana/faucet`, `/api/status`, `/api/telemetry`.

The locale count "6" is read from the table arithmetic (72 = 12 x 6, 78 = 13 x 6, "+4 more paths" after `en` and `es`). It is not read from `src/i18n` here. Label: ESTIMATED from the table.

## First Load JS sizes

**The build log does not print a "First Load JS" column.** Next 16.4 with Turbopack prints only the route table above. The sizes come from `.next-audit/diagnostics/route-bundle-stats.json` (`firstLoadUncompressedJsBytes` and `firstLoadChunkPaths` per route), copied to the scratch folder. VERIFIED (file read).

Uncompressed is the number in that file. Gzip is my own figure: each route's listed chunks compressed with Python `gzip.compress(level 6)` and summed (`bundle_table.py`, `09_bundle_table.log`). ESTIMATED: the real transfer size depends on the host's compression (Brotli or gzip level) and on chunks shared between routes being cached.

| Route | Uncompressed first-load JS | Gzip level 6 (ESTIMATED) | Chunks |
|---|---|---|---|
| `/[lang]/boards/[board]/[lesson]` | 2,221,388 B (2169 KB) | 701,192 B (685 KB) | 16 |
| `/[lang]/drones/[drone]/fly` | 1,720,232 B (1680 KB) | 538,513 B (526 KB) | 16 |
| `/[lang]/drones/[drone]` | 1,694,772 B (1655 KB) | 527,435 B (515 KB) | 16 |
| `/[lang]/robotics/[bench]` | 1,686,406 B (1647 KB) | 524,384 B (512 KB) | 16 |
| `/[lang]/boards/[board]` | 1,671,175 B (1632 KB) | 518,616 B (506 KB) | 16 |
| `/[lang]/passport` | 1,040,258 B (1016 KB) | 316,434 B (309 KB) | 12 |
| `/[lang]/verify` | 1,023,819 B (1000 KB) | 311,311 B (304 KB) | 12 |
| `/[lang]/together` | 585,839 B (572 KB) | 181,379 B (177 KB) | 11 |
| `/[lang]` | 530,074 B (518 KB) | 162,807 B (159 KB) | 10 |
| `/[lang]/boards` | 513,182 B (501 KB) | 156,906 B (153 KB) | 9 |
| `/[lang]/drones` | 512,468 B (500 KB) | 156,658 B (153 KB) | 9 |
| `/[lang]/robotics` | 512,171 B (500 KB) | 156,574 B (153 KB) | 9 |
| `/[lang]/about` | 510,082 B (498 KB) | 155,885 B (152 KB) | 9 |
| `/[lang]/[...rest]` | 499,351 B (488 KB) | 151,776 B (148 KB) | 8 |
| `/_not-found` | 457,636 B (447 KB) | 135,709 B (133 KB) | 6 |

15 routes (`python3 -I bundle_table.py`: "15 routes in route-bundle-stats.json"). The API routes have no first-load JS.

What the sizes say (findings):

| Finding | Evidence | Why it matters | Severity |
|---|---|---|---|
| The floor is large: an empty not-found page loads 447 KB of JS uncompressed | `/_not-found` row | Every page pays this first. About 130 KB gzip (ESTIMATED). Shell, i18n and dock code is in the shared chunks. | low |
| The lab pages load 1.6 to 2.2 MB uncompressed (about 500 to 700 KB gzip, ESTIMATED) | five `/[lang]/boards`, `drones`, `robotics` detail rows | The lesson page is the heaviest. On a slow school connection this is the first thing a learner opens. Which chunk causes the jump from 513 KB (`/boards`) to 1.67 MB (`/boards/[board]`) was not broken down here. | medium |
| Sizes cannot be compared with a stock Next table | no First Load JS column in log | The plan should record the numbers from `route-bundle-stats.json`, not from the log. | low |

The attribution of the jump to specific libraries (CodeMirror, Solana wallet adapter and so on) is HYPOTHESIS. It needs a bundle analysis.

## Notes

- Shared machine. The load average was 74 to 86 during the build. The 72.77 s total is a contended number.
- Warnings printed by the build: none. `rg -ic "warn|deprecat" 09_build.log` returned no match (rg prints nothing and exits 1 on zero hits).
- The build log does print one notice: "We detected TypeScript in your project and reconfigured your tsconfig.json" (handled above).
- `prebuild` ran `npm run content` first and printed "content index: 12 boards, 13 robotics, 13 drones (unchanged)", so the generated index was not rewritten.
- The build used `Collecting page data using 13 workers`, so it competed with the other session for 13 of 14 cores.
- Typecheck inside the build took 32.8 s ("Finished TypeScript in 32.8s"); the separate `npm run typecheck` took 6.2 s (`tsconfig.json:19` has `incremental: true`, so a warm `.tsbuildinfo` probably helped; HYPOTHESIS). Both exit 0.
- `.next-audit/` is kept so the later serve step can start it. It was built with the 11 names empty, so that step will show the "not configured" behaviour of each feature, not the live one.
