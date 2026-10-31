# ADR-0404: One RPC envelope for every worker; a per-tab ProjectWorker; WASM engines as verified static files

Status: proposed, 2026-10-27, revised after review the same day. Author: frontend and backend architecture seat.
Upstream: SIMULATION_ARCHITECTURE 17.2, ADR-0300, ADR-0311, SYSTEM_ARCHITECTURE 6.9 and 7.1, RS-03, RS-12, RS-13, D-014, D-015, `check-client.ts:25-38`. Downstream: F-203, F-044, F-048, F-050, R-041, R-043, R-110. Spec: FRONTEND_ARCHITECTURE section 8.

## Problem

The check job is the only worker today, with an in-thread fallback. The plan adds a sim worker, a project worker and optional engines of 0.88 MB to 12.5 MB. Bundlers are poor at large WASM, and a swapped file on a proxy must not become code. Saving a project (canonicalise, hash, validate, IndexedDB) costs 18.5 ms at the 2,000-part limit in Node, more than a frame.

## Constraints

1. No `SharedArrayBuffer`, so no cross-origin isolation headers.
2. A runaway program is stopped and the editor responsive within 2 s (BUD-12).
3. Engine sizes are shown before download (R-110); engines cache after first use (R-040).
4. Tests must run workers without a browser.
5. Autosave commit under 50 ms p95 with no dropped frame (BUD-08).

## Considered options

| Option | Summary | Verdict |
|---|---|---|
| A. Each worker its own ad hoc messages | As today | Rejected: three protocols to keep |
| B. Comlink or similar | RPC library | Rejected: a new dependency for a 100-line need; the sim messages are already typed |
| C. One small typed `RpcPort` in `src/protocol`, each owner creating its `Worker`, plus an inline port | Versioned envelope, ids, abort, kill | **Chosen** |
| D. Save work on the main thread, hash in a worker only if BUD-08 fails | The first draft of this ADR | Rejected on review: contradicts SYSTEM 6.9 and 7.1, and 18.5 ms at the limit already exceeds a frame |

## Decision

1. Every message has `v: 1`; calls have an `id`; `ack` or `error` resolves them.
2. `createRpcPort(worker)` wraps a structural `WorkerLike`; the module that owns the worker writes `new Worker(new URL(...), { type: 'module' })` at the call site. `kill(graceMs = 2000)` calls `terminate()`.
3. `createInlinePort` runs the same handler in-thread for tests and as the fallback.
4. The `project` worker lives as long as the tab. `Repository.save()` always posts the committed batch to it; it holds a shadow copy and does canonicalise, hash, validate, the IndexedDB write and the bound-file write (SYSTEM 6.9). The main-thread session stays the source of truth.
5. WASM engines are static files under `public/engines/<id>@<version>/` with a build-generated manifest (sha256, bytes, `requires`, licence review flag, size budget). `loadEngine` (in `src/sim-host/engines/`) checks `requires`, reports sizes first, fetches with integrity, caches in Cache Storage, compiles in the worker that uses it.
6. Parts stay data only; no code-bearing extension loads in the first release. RS-15 never ran, so this stays the default. The agent-doable check is a Worker-kill prototype (a hostile loop is stopped and the editor stays responsive within 2 s, BUD-12), run before any extension work. Nothing in the core phases waits for it.
7. avr8js is an opt-in 'Firmware mode' that runs in its own Worker behind the engine interface (R-102, ADR-0305). The TypeScript interpreters stay the default and the offline path. RS-03 (`08_RESEARCH_SPIKES/RS-03-avr8js-differential/REPORT.md`, INCONCLUSIVE overall; its check agreed): correctness PASS, 6.1 to 7.5x real time on desktop, but about 1.7x at 4x main-thread throttle and 1.1x at 6x, below the 3x line. The Worker throttle probe was not re-verified, so a Worker is a plan, not a measured fix. What would change it: a throttled Worker run that stays above 3x moves Firmware mode from opt-in toward a default for Uno lessons.

## Technical justification

A bundler follows a `Worker` URL only when the `new URL` literal is at the call site, so a shared `spawn(kind)` is not possible and the envelope code is what is shared. A tab-lifetime project worker avoids repeated start cost and keeps the validator (102 KB gzip) out of the first-load bundle. Fetch `integrity` binds a file to a hash produced by the build, so a CDN or proxy cannot swap it.

## Performance data

- Hash: canonicalise plus hash 3.84 ms at 500 parts, 18.5 ms at the 2,000-part limit, in Node (VERIFIED, PROJECT_DATA_MODEL 9.6); ESTIMATED 4x to 6x slower on a Chromebook. IndexedDB write time: UNKNOWN (FA-08).
- Rapier split build about 0.88 MB brotli, single-file 1.20 MB (over the 1.0 MB budget), Jolt 0.61 MB; step mean 0.07 to 0.09 ms at 20 bodies, 0.44 to 0.54 ms at 6x throttle (`08_RESEARCH_SPIKES/RS-13-physics-determinism/REPORT.md`, PASS; one CPU architecture, step time excludes state readback, sizes not re-run by the check). Decision: Rapier behind a `PhysicsBackend` interface, lazy-loaded in a Worker with a warm-up step, split build only. Jolt is the fallback. Rooms compare the class D hash until the cross-CPU check (RA-02, x86-64 and Firefox) passes. Applies in the Robotics phase, not before.
- Yosys (YoWASP) 12.5 MB brotli, 79.7 MB raw; load 2.3 s at 50 Mbps, 5.3 s at 20 Mbps, 10.3 s at 10 Mbps with Brotli; 20.7 s at 5 Mbps with 6x CPU; 662 to 725 MB renderer memory, 853 to 917 MB whole browser (`08_RESEARCH_SPIKES/RS-12-yosys-wasm/REPORT.md`, PASS on the stated exit condition, desktop only; the check restated it as passing at 10 Mbps and above with a 10 to 15 percent memory margin). Decision: Yosys plus DigitalJS is a lazy, opt-in, desktop-first 'Inspect' mode (R-110), gated on `navigator.deviceMemory`, never in the lesson bundle. The TypeScript Verilog simulator stays the live path (DigitalJS is 65 to 250x slower).
- ngspice (`eecircuit-engine` 1.9.0) 20.3 MB JS, 5.7 MB gzip, 349 ms start (TECHNICAL_RESEARCH, TESTED once).
- avr8js size UNKNOWN until built. rp2040js (RS-06, `08_RESEARCH_SPIKES/RS-06-rp2040js-micropython/REPORT.md`) runs at 0.54 to 0.79x real time on one core, so it is not an engine here: Pico lessons stay on the TypeScript MicroPython interpreter and rp2040js is an offline test oracle only. Message round trip per frame at 30 Hz: UNKNOWN; the ADR-0300 reversal condition is 1 ms.

## Cost implications

One build script (`scripts/build-engines.mjs`) and a manifest. Storage on the user's device is the engine sizes above, only after the person agrees. Self-hosting bandwidth is the same files served from the host's disk. Shadow copy: up to twice the 1.6 MB canonical limit in RAM. No paid service.

## Licensing

avr8js MIT; Rapier Apache-2.0; Jolt (`jolt-physics`) MIT; Yosys via YoWASP ISC and DigitalJS BSD-2-Clause (TECHNICAL_RESEARCH D3 and physics rows, EXTERNAL). ngspice has no single licence (each piece keeps its own text); the `eecircuit-engine` wrapper is MIT; CIDER (no-charge clause) and KLU (LGPL-2.1 or later) must be excluded from the build. The ngspice build tag and licence text are UNKNOWN (TECHNICAL_RESEARCH). The manifest field `license.reviewed` blocks copying an unreviewed engine into a published build (D-017).

## Security implications

The only place WASM enters the app is `loadEngine`; it needs `'wasm-unsafe-eval'` in the CSP, much narrower than `unsafe-eval` (ADR-0405). The sha256 values come from the same origin as the files, so integrity protects against a proxy or CDN swap, not against a compromised build. A worker is a performance boundary, not a confidentiality boundary, for first-party code (SYSTEM 7.2). The project worker can read the same IndexedDB as the page. Hostile files are validated in the worker with byte, depth and entry caps before any use.

## Reversibility

High for the envelope (about 100 lines). Medium for engines: the manifest and loader are the seam, and an engine can be dropped by removing its manifest entry. The save path can move back to the main thread behind `Repository.save()`, but that is not wanted.

## Migration plan

`check-client.ts` and `check.worker.ts` move to `src/sim-host/` and become the first message type (SIM-0). The `project` worker arrives in FE-1 with the `Repository`. Engines arrive with their phase in the D-014 order: ngspice oracle and avr8js Firmware mode in the fidelity phase, Rapier in robotics creation, Yosys Inspect mode after the core phases. Studio does not wait for any engine. No stored data changes.

## Known limitations

- Brotli must be served for the RS-12 times (about 10.7 MB compressed, 2.3 s at 50 Mbps). Next's `compress` is gzip, so the self-host reverse proxy serves precompressed `.br` files that `scripts/build-engines.mjs` emits (check BA-14, EXTERNAL until run). Without Brotli the Inspect mode is slower, not broken, and it stays opt-in.
- RS-12 misses 15 s below about 8 Mbps and is desktop only; phones and Chromebooks are untested for every engine. Device runs are work for Amar (see below).
- RS-13 covers one CPU architecture and no Firefox; the size budget (1.0 MB wire) is a self-proposed HYPOTHESIS. The check also noted p99.9 under throttle is not under 1 ms.
- Whether a worker's IndexedDB transaction finishes after `pagehide`, and whether `createWritable()` works in a worker on a picked file handle in all browsers, are UNKNOWN.
- Compile in the browser (avr-gcc WASM) is not built. Compile is server-side arduino-cli behind `CompileService`, opt-in with `IYNK_COMPILE_ENABLE=1` (ADR-0427, RC-28); import-hex works without it. RS-03 measured 0.33 to 0.56 s warm and 1.17 to 1.40 s cold; arduino-cli is GPL-3.0, so it runs as a separate program, never linked. RS-04, RS-05 and RS-17 never ran. What would change it: a local timing run (agent task) with cold compile over 5 s on Amar's server, or a licence answer against calling it as a separate program.

## Reconcile and spike fold-in (2026-10-27)

| Id | Change |
|---|---|
| RS-03 | Decision item 7: avr8js is an opt-in Firmware mode in a Worker; TS interpreters stay default. Numbers and the unverified Worker probe stated. Upstream list adds RS-03. |
| RS-03 / RS-04 / RS-05 / RS-17 | Last limitation: PENDING RS-04 replaced by server-side arduino-cli, opt-in, with timings, GPL-3.0 note and the change condition. |
| RS-06 | Performance data: rp2040js is not an engine; Pico stays on the TS MicroPython interpreter. |
| RS-12 | Brotli limitation rewritten (precompressed `.br` from the build script, BA-14 stays EXTERNAL). Performance data adds whole-browser memory, the check's restatement and the Inspect-mode decision with the `navigator.deviceMemory` gate. 5 Mbps limitation reworded to the measured threshold. |
| RS-13 | Performance data: Rapier split build behind `PhysicsBackend`, Jolt fallback, class D hash until RA-02, robotics phase only. Limitation adds the p99.9 caveat. |
| RS-15 | Decision item 6: no extension code in the first release; Worker-kill prototype named as an agent task that blocks nothing. |
| D-014 | Migration plan: engines listed in the D-014 phase order, Studio waits for none. No wording about interviews, pilots or Fault Lab existed in this file. |
| RS-01, RS-08, RS-09, DP-01 | No place in this file mentions them; no change. |

For Amar: the phone and Chromebook runs for avr8js, Yosys and Rapier (device-results.md), and the licence choice (D-017). Not agent tasks.
