# AX-03: does `next build` accept a `.ts`-extension import and a `#core/*` import?

## Question
Does Turbopack in Next 16.4.3 (with `cacheComponents: true`) compile a page that imports a file by a relative path ending in `.ts`, and a file by a `package.json` `imports` subpath (`#core/*`)? Do the root `tsc --noEmit` and plain Node accept the same files?

## Why it matters
ADR-0014 puts the shared project code in `src/core`, `src/project` and `src/parts`, written for Node's type stripping: relative imports end in `.ts`. If the browser build rejected that, the same files could not be imported by a page and ADR-0014 option B (a build step) would be needed.

## Exit condition
PASS: `BUILD` exits 0 and the prerendered page shows the value read through both imports; `node` runs the `.ts` file; `npm run typecheck` exits 0. FAIL otherwise.

## Environment
| Item | Value |
|---|---|
| Node | v24.8.0 |
| Next | 16.4.3, Turbopack, `cacheComponents: true`, `partialPrefetching: true` |
| TypeScript | 5.9.3 |
| Date | 2026-10-28 |

## Method
1. Added `"allowImportingTsExtensions": true` to `tsconfig.json` and an `imports` map (`#core/*` to `./src/core/*.ts`) to `package.json`.
2. Created three throwaway files: `src/core/ax03.ts` (`export const ax03 = 3;`), and a page that imports it twice: `import { ax03 as relative } from "../../../core/ax03.ts"` and `import { ax03 as subpath } from "#core/ax03"`, rendering `relative + subpath`. The page is at `src/app/[lang]/ax03/page.tsx` and not `src/app/ax03/page.tsx` as the card says: the only root layout (`<html>`) is `src/app/[lang]/layout.tsx`, so a page outside `[lang]` would have no root layout.
3. Read `AGENTS.md` and the Turbopack and `cacheComponents` docs first. The page reads no dynamic data.
4. Ran the keyless build with `NEXT_DIST_DIR=.next-T-B2-01`, then `node -e`, then `npm run typecheck`. Deleted the three files and the build folder afterwards.

## Results
| Step | Result |
|---|---|
| `BUILD` | exit 0. `Next.js 16.4.3 (Turbopack)`, `Compiled successfully`, `Finished TypeScript`, 810 static pages generated. The route list contained `/[lang]/ax03` with `/en/ax03` and `/es/ax03` prerendered |
| Prerendered HTML (`.next-T-B2-01/server/app/en/ax03.html`) | `<p>6</p>`: both imports resolved to the same module (3 + 3) |
| `node -e "import('./src/core/ax03.ts').then(m=>console.log(m.ax03))"` | prints `3`. Node adds a `MODULE_TYPELESS_PACKAGE_JSON` warning because `package.json` has no `"type"`; it is a warning, not an error, and costs one reparse |
| `npm run typecheck` (root `tsc --noEmit`) | exit 0, with `allowImportingTsExtensions` set. The root `moduleResolution: bundler` reads the `imports` map, so `#core/ax03` type-checks too |

## Verdict
PASS. Turbopack accepts a `.ts`-extension relative import and a `#core/*` subpath import from a page, Node runs the file without a flag, and the root type check accepts both.

## What B2 does next
Keep ADR-0014 as written (option A). `tsconfig.json` keeps `allowImportingTsExtensions`, `package.json` keeps the `imports` map, and `tsconfig.portable.json` checks the portable folders. The Node warning about the missing `"type"` field is not acted on: a `"type": "module"` field would change how every `.js` file in the repo loads. Nothing in B2 imports portable code into a page, so this proof is the only place the browser build is exercised until B3.

## What it does not show
It does not test a client component importing a `.ts` file, a Web Worker bundle, or `next dev`. It does not test a file that is only reachable through `#project/*` or `#protocol/*` (same mechanism, not run). It ran with the warm Turbopack cache of a copied worktree.
