# ADR-0409: Injected interfaces for time, ids, workers, storage, transports and engines

Status: proposed, 2026-10-27, revised after review the same day. Author: frontend and backend architecture seat.
Upstream: A13, B4-13, B5-16, R-002, R-052, DET-1 to DET-5. Downstream: F-180, F-182. Spec: FRONTEND_ARCHITECTURE section 13.

## Problem

UI is thin on tests, engine tests need a figure page and jsdom, relay tests sit outside `npm test`, and simulation tests are timing-sensitive under load.

## Constraints

1. Deterministic tests that never touch production or third parties (R-002, R-003).
2. A headless core test run under 30 seconds (R-052, target ESTIMATED).
3. No test sleeps for real time.
4. The portable modules (SYSTEM 5.2) run in Node without a DOM.

## Considered options

| Option | Summary | Verdict |
|---|---|---|
| A. Mock modules ad hoc | jest-style module mocks | Rejected: hides interface drift |
| B. Interfaces with in-memory implementations | `Clock`, `Ids`, `RpcPort`, `Repository`, `Transport`, `FileAccess`, `KeyStore`, `loadEngine` | **Chosen** |

## Decision

1. Each seam in section 13 has a real and a test implementation.
2. `core`, `project`, `protocol`, `sim`, `export` and `server` tests run in a Node-only Vitest project.
3. The RS-09 property test runs in CI against `RoomAuthority` and the server (REF-4).
4. Playwright covers the M1 walk, offline reload and two browsers against a real server process.

## Technical justification

The audit found that engine unit tests calling `advance()` many times exhaust memory in jsdom (PERFORMANCE_BASELINE section 4) and that solver tests need a figure page (A13). With injected time and a `createInlinePort`, the same worker code runs in a Node test, and SA-01 compares worker output to in-thread output.

## Performance data

UNKNOWN: run time of `npm run test:core`; the 30 s target is ESTIMATED. RS-09's property test ran 40 runs of about 10,900 ops (VERIFIED in its report) and gives the size of the CI job. The jsdom memory problem is MEASURED in PERFORMANCE_BASELINE section 4.

## Cost implications

Production code takes its dependencies as arguments, a little boilerplate per module. One extra test dependency for the IndexedDB fake. CI time for the property test and the Playwright suites; the scheduled job carries the noisy frame-time tests.

## Licensing

Vitest 5.0.3 MIT, Playwright 1.64.0 Apache-2.0, `@axe-core/playwright` 4.13.0 MPL-2.0 (all VERIFIED in `node_modules`; the MPL applies to modified files, and these are test tools). `fast-check` (MIT, EXTERNAL) and `fake-indexeddb` (licence UNKNOWN until checked) are not installed yet; each is checked before it is added.

## Security implications

`KeyStore` has an in-memory test implementation so a test can prove a key never reaches an export, a share, a log or a room (R-010). Tests use no real keys and no production endpoints (R-002). The hostile-client and injection suites run against the same interfaces as production code.

## Reversibility

High. An interface with one implementation can be inlined (the reversal rule below). The Vitest project split is configuration.

## Migration plan

Seams are added as each module is built, starting with `Clock`, `Ids`, `RpcPort` and `Repository` in FE-1. Existing tests stay in the default project. `server/realtime` tests (39, `node --test`) move into CI with BACKEND section 15. Reverse a seam if it has exactly one implementation after two phases.

## Known limitations

- jsdom does not implement layout, IndexedDB or Web Workers; the fakes approximate them and a Playwright test is still needed for behaviour that depends on the real thing.
- A fake IndexedDB cannot show real write time or eviction.
- Property tests find divergence, not missing dedup; RS-09 showed a hand-built unit test is required for that (PROJECT_DATA_MODEL 7.4).
- Playwright WebKit is a desktop build, not iOS Safari.
