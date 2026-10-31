# ADR-0014: Repository layout and the portable-code toolchain

Status: proposed, 2026-10-27. Author: system architecture seat.
Upstream: ADR-0001, ADR-0003; SYSTEM_ARCHITECTURE 5.2 (canonical module map); `tsconfig.json:15,25`; `package.json` (`engines.node` 24.x, `typecheck` script); scratch run `ts/a.ts` (Node 24.8.0 runs TypeScript without flags, VERIFIED).
Downstream: `SYSTEM_ARCHITECTURE.md` 5.4; ADR-0400; ADR-0430 (superseded by this ADR); AR-03, AR-04; AX-03.

## Problem

The server must run the same project logic as the browser. The app's TypeScript uses `moduleResolution: "bundler"` and an `@/` alias, which Node does not understand. Do we add a build step for the server, a monorepo, or a source rule?

## Constraints

1. Keep one repository and one `package.json` for the app; the server may have its own small manifest.
2. No build step for the server if avoidable (fewer moving parts for contributors).
3. Shared code must be unambiguous about what it may import.
4. Next's bundler must still accept the same files (UNKNOWN, AX-03).

## Considered options

| Option | Summary | Verdict |
|---|---|---|
| A. Node runs TypeScript directly; shared modules use relative imports with `.ts` extensions and erasable syntax only; a second `tsconfig` checks them | Chosen | Chosen |
| B. Compile the server with `tsc` or a bundler to `dist/` | Conventional | Fallback if AX-03 fails |
| C. npm workspaces with packages (`@iynk/project`, `@iynk/sim`) | Strong boundaries | Deferred (ADR-0001 option B) |
| D. Duplicate the project logic in the server | No coupling | Rejected: two definitions of a valid operation |

## Decision

1. `server/` has its own `package.json` (dependency `ws`) and runs `node src/main.ts`.
2. Portable folders (`src/core`, `src/protocol`, `src/project`, `src/parts`, `src/sim`, `src/export`; `protocol` holds wire frames, error codes and close codes shared by browser and server, SYSTEM 5.2) use only relative imports ending in `.ts`, `import type` for types (`verbatimModuleSyntax`), and no `enum`, parameter properties or `namespace` (`erasableSyntaxOnly`).
3. `tsconfig.portable.json` includes exactly those six folders (`src/core`, `src/protocol`, `src/project`, `src/parts`, `src/sim`, `src/export`) plus `server/`, with `lib` limited to `esnext` (no DOM), `allowImportingTsExtensions`, `noEmit`. CI runs it next to the app typecheck.
4. The `@/` alias and `bundler` resolution remain for UI code.
5. Code in `server/` reaches the shared folders through Node subpath imports in the root `package.json`: `"imports": { "#core/*": "./src/core/*.ts", "#protocol/*": "./src/protocol/*.ts", "#project/*": "./src/project/*.ts" }` (SYSTEM 5.4 item 4). `server/` never uses `@/`. Portable folders import each other by relative `.ts` path. This map replaces the two-entry map of ADR-0430, which is superseded by this ADR. `#parts/*` is not added; SYSTEM 5.4 lists three entries, and the server adds it only if it imports `parts` (open point for the SYSTEM owner).
6. Module names and the import matrix are those of SYSTEM 5.2 and 5.3. Non-portable modules are `sim-host`, `local`, `studio`, `ai`, `collab`, `server-client` and UI; there is no `src/host`.
7. Server tests use Node's test runner as the relay does today (`node --test`, 39 tests); portable-module tests use vitest as the rest of the repo.

## Technical justification

VERIFIED: on Node 24.8.0 a `.ts` file importing `./b.ts` and reading `globalThis.Request` ran with no flag and printed `3 function`. Type stripping removes types and does not transform, so only erasable syntax works; the portable `tsconfig` catches the rest at typecheck time.

## Performance data

Not applicable. Start-up time of stripped TypeScript versus compiled JavaScript: UNKNOWN, small.

## Cost implications

None.

## Licensing

None added (TypeScript already a dev dependency; Node MIT, EXTERNAL).

## Security implications

Fewer build artefacts to verify; the runtime executes the reviewed source. The no-DOM `lib` in the portable config prevents browser-only code from slipping into the server.

## Reversibility

High. Option B is a build script; the source layout is unchanged.

## Migration plan

AX-03 before X2. Then create `tsconfig.portable.json`, move files into the portable folders, add the CI step.

## Known limitations

Type stripping in Node 24 may print an experimental warning depending on the exact version (not seen in the one run); the pinned image decides. Stack traces refer to the `.ts` sources, which is good. Contributors must learn the "erasable only" rule; the portable typecheck error message names it.

## Review fixes (2026-10-27)

| # | Issue | What I did |
|---|---|---|
| 1 | Module layout conflict (high) | Accepted. Read SYSTEM_ARCHITECTURE 5.2 (line 180 lists `protocol` as portable), 5.3 (line 220, `protocol` imports `core` only) and 5.4 item 4 (the three-entry `imports` map), ADR-0400 and ADR-0430. In this file: added `src/protocol` to the portable list (decision 2) and to `tsconfig.portable.json` (decision 3); added the `#core/*`, `#protocol/*`, `#project/*` imports map (decision 5); stated that SYSTEM names are canonical and `src/host` does not exist (decision 6); marked ADR-0430 superseded in Downstream. |

Not done here, because I may edit only this file:

- ADR-0430 still needs its Status line changed to "superseded by ADR-0014" and its decision 1 pointed at the three-entry map. Its `ADR/README.md` row (line 120) needs the same status.
- ADR-0400 already uses the SYSTEM 5.2 names and calls the module `sim-host` (its option D and decision 1), so the restatement is largely in place. What remains: its Known limitations still say SYSTEM 5.3 has no `protocol` row, which is now false (SYSTEM 5.3 has it); and it has no explicit layer-order line (core < project, parts, protocol < sim < sim-host, local < studio, ai, collab < app), which the owner should add.
- FRONTEND_ARCHITECTURE section 4 and Objection 7 still describe the old `host` layer and `#parts/*`; SYSTEM line 196 already gives the mapping.

## Review fixes (T-B6-15, 2026-10-28)

| # | Issue | What I did |
|---|---|---|
| 2 | `#core/*` from `server/` (decision 5) cannot work | Node reads only the nearest `package.json`. Once `server/package.json` exists and defines no `imports`, `#core/*` throws `ERR_PACKAGE_IMPORT_NOT_DEFINED`, and a target of `../src/core/*.ts` throws `ERR_INVALID_PACKAGE_TARGET`. Decision 5 is replaced for `server/`: the server imports shared code by relative `.ts` path (`../../src/core/sha256.ts`). The root `imports` map stays for the web app and tests. |

Spike result, PASS (Node 24.8.0, no flags):

- Without a stub, `node server/test/fixtures/import-core.ts` prints the right digest but also `MODULE_TYPELESS_PACKAGE_JSON` on stderr, because the root `package.json` has no `"type"`.
- With `src/core/package.json` = `{"type":"module"}`, stderr is empty and stdout is the SHA-256 of `abc`. The root `"type"` fallback and the esbuild bundle were not needed.
- `BUILD` (with a throwaway `src/core/sha256.ts` import in the about page, removed afterwards) passes. `npx vitest run src` passes. `npm run typecheck` (including the portable config) passes.
- `npm run server:typecheck` first failed with 44 `noUncheckedIndexedAccess` errors in `src/core/sha256.ts`. The shared code is checked by the root and portable configs, which do not enable that flag, so it was removed from `server/tsconfig.json`; shared files are checked once, under the same rules everywhere.
- Rule for later tasks: each shared folder the server imports (`src/core` now, `src/protocol` in T-B6-16) carries its own `{"type":"module"}` stub.
