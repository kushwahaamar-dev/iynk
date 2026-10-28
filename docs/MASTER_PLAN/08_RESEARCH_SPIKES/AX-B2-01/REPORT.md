# AX-B2-01: Ajv 8 standalone and the type generator on the real schemas

Task T-B2-17. Spike, no product code changed. Run 2026-10-28 on macOS, Node v24.8.0, npm registry only.

## Verdict

| Q | Verdict | One line |
|---|---|---|
| Q1 | PASS, with a size caveat | Both schemas compile in under 0.25 s. Project source is 1,459,718 bytes (limit 1.5 MB). Gzip is 152,621 bytes: 149.0 KiB, but over 150,000 bytes. Read the caveat before you set a budget in T-B2-04 |
| Q2 | PASS by the counts, with one bug the card did not expect | No `eval`, no `new Function`. One run-time helper in the project module, two in the component module. But Ajv writes them as `require(...)` even with `code.esm: true`, and `require` does not exist in an ES module, so the first call of the validator throws. The generator must inline the helpers; the fix is 8 lines and was verified |
| Q3 | PASS | All 5 project and 9 component examples validate; all negative cases are rejected; first error carries `instancePath`. Works in Node 24.8 and in Vitest 5.0.3. The card's counts of negative cases are stale (see Results) |
| Q4 | PASS | `json-schema-to-typescript@16.0.0`, `tsc` exits 0 under the portable options, `Op` is a union of 64 members with 64 distinct `k`, 0 `any`. One option is required: `maxItems: -1` |
| Q5 | PASS | Import attributes work in Node 24.8 type stripping, in `tsc` with the portable options, and in Vitest 5.0.3 |
| Q6 | PASS | With `ajv` 8.17.1 as a root devDependency, `npm ls ajv` shows 8.17.1 at the top and 6.15.0 under ESLint; ESLint runs. No alias is needed |

## Question

The six questions of T-B2-17: can Ajv 8.17.1 emit standalone ESM validators for the real schemas with no run-time import (Q1 to Q3); does `json-schema-to-typescript` give usable, portable types (Q4); do JSON import attributes work in all three tools (Q5); does adding Ajv 8 break ESLint, which depends on Ajv 6 (Q6).

## Why it matters

T-B2-04 (the schema generator) is the base of every later B2 task and was written around four things nobody had run in the repo. The options below are the ones T-B2-04 should copy.

## Exit condition

Per question, as written in the card (`tasks/B2-core-document-netlist.md`, card T-B2-17). A missing verdict on Q1, Q4 or Q6 would block release; none is missing.

## Environment

| Item | Value |
|---|---|
| Node | v24.8.0 |
| Vitest | 5.0.3 (the repo's, run with `@vitest-environment node`) |
| TypeScript | 5.9.3 (published 2025-09-30) |
| ajv | 8.17.1 (published 2024-07-12) |
| json-schema-to-typescript | 16.0.0 (published 2026-08-28, at least two weeks old; newest on 2026-10-28). Needs Node 16 or later; pulls in `prettier`, `lodash`, `js-yaml`, `minimist`, `tinyglobby`, `@apidevtools/json-schema-ref-parser` (450 KB package, 9.6 MB with prettier) |
| Schemas | the four files in `docs/MASTER_PLAN/04_ARCHITECTURE/schemas/` at the commit this report sits in: `project.schema.json` (`schemaVersion` 1.1, 80 `$defs`), `component.schema.json` (44 `$defs`), `robotics.domain.schema.json`, `drone.domain.schema.json` |
| Work folder | `/Users/amar/iynk-master-plan-scratch/buildplan/T-B2-17/` (own `package.json` with `ajv` 8.17.1, `json-schema-to-typescript` 16.0.0, `typescript` 5.9.3; a copy of the schemas and their `tools/`). The repo's `node_modules` and lockfile were not touched. The only repo file added during the runs was a throwaway Vitest file, deleted before the commit |
| tsconfig | the options of `tsconfig.portable.json` in T-B2-01: `target ES2022`, `lib ["esnext"]`, `module esnext`, `moduleResolution bundler`, `strict`, `noEmit`, `allowImportingTsExtensions`, `verbatimModuleSyntax`, `erasableSyntaxOnly`, `isolatedModules`, `skipLibCheck`, `resolveJsonModule`, `types []` |

## Method

1. `gen.mjs`: `new Ajv2020({ strict: true, strictRequired: false, allErrors: true, code: { source: true, esm: true } })`, `addSchema` for the two domain schemas (project only), `compile`, `standaloneCode(ajv, validate)` from `ajv/dist/standalone/index.js`, write to `gen/*.validate.mjs`. Timed with `performance.now()` around the whole of new, add, compile and standalone.
2. Count `eval(`, `new Function`, `require(` and `import` in the output with `grep -o`.
3. Patch the copies of `project-lib.mjs`, `negative.mjs` and `validate.mjs` (in the scratch copy of `schemas/tools/`) to import the generated validators instead of compiling, then run `npm run check` there. The same cases ran in Node 24.8.
4. A throwaway `src/zz-spike17.test.ts` in the worktree (`// @vitest-environment node`) imported both generated modules and a JSON file with `with { type: 'json' }`, validated all 14 examples and one broken project, then was deleted.
5. `types.mjs`: `compile()` from `json-schema-to-typescript`, then `npx tsc -p tsconfig.portable.json` over `gen/*.ts`. The TypeScript compiler API counted the members of `Op`.
6. Q5 in a scratch folder: `a.json`, `b.ts` with `import uno from './a.json' with { type: 'json' }`.
7. Q6: copy of the repo `package.json`, `package-lock.json`, `eslint.config.mjs` into `q/`, add `"ajv": "8.17.1"` to `devDependencies`, `npm install --ignore-scripts`.

## Results

### Q1 compile and size

Options that passed (copy these):

```js
const base = { strict: true, strictRequired: false, allErrors: true, code: { source: true, esm: true } };
// project: new Ajv2020(base); ajv.addSchema(robotics); ajv.addSchema(drone); ajv.compile(project)
// component: new Ajv2020({ ...base, allowUnionTypes: true }); ajv.compile(component)
```

| Schema | Compile + emit | Source bytes | Gzip bytes |
|---|---|---|---|
| project (with both domain schemas) | 134 ms to 234 ms (several runs) | 1,459,718 | 152,621 |
| component | 57 ms to 126 ms | 675,104 | 82,497 |

- `component.schema.json` fails under the plain strict options: `strict mode: use allowUnionTypes to allow union type keyword at "urn:iynk:schema:component:1#/properties/default"` (also `/properties/values/items`, `/properties/value`). `allowUnionTypes: true` alone fixes it; `strictTypes: "log"` is not needed (tested alone, tested both: `{allowUnionTypes}` ok, `{strictTypes:'log'}` ok, both ok). The existing `negative.mjs` uses both; either is fine.
- The project schema needs no relaxation. Both domain schemas must be added before `compile`.
- Size caveat: bytes are inside the 1.5 MB limit by 2.7 percent. Gzip is 152,621 bytes, which is 149.0 KiB but 2.6 percent over 150,000 bytes. The card says "150 KB" without saying which; the card's own measured value was 102 KB, so the card's figure came from a different setting (not found). Without `allErrors` the source is 1,417,607 bytes and gzip 156,272, so `allErrors` is not the cause. Run-time cost is small: importing the project module takes 13 ms. T-B2-04's size guard should state its unit and leave headroom (suggest 1.6 MB and 170 KiB gzip), or the budget fails on the next schema addition.

### Q2 run-time imports, eval

| Module | `eval(` + `new Function` | `import` statements | `require(` calls |
|---|---|---|---|
| project.validate.mjs | 0 | 0 | 1: `require("ajv/dist/runtime/ucs2length").default` |
| component.validate.mjs | 0 | 0 | 2: `ucs2length`, `equal` (`equal` is `fast-deep-equal`) |

- That is within the exit condition (at most three helpers from `ajv/dist/runtime/`). But the helpers are emitted as `require(...)` although `code.esm: true` is set. In an ES module `require` is not defined. Importing the module works (the `require` sits inside the validator function), and the first call throws: `ReferenceError: require is not defined in ES module scope, you can use import instead`. Found by running the first example through the unpatched output.
- Fix, verified (all of Q3 ran on the fixed output): replace each `require("ajv/dist/runtime/NAME").default` with the helper's own source text, taken from the Ajv package at generation time:

```js
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
export function inlineRuntime(src) {
  return src.replace(/require\("ajv\/dist\/runtime\/(\w+)"\)\.default/g, (_, name) =>
    `(${require(`ajv/dist/runtime/${name}`).default.toString()})`);
}
```

  Output grows by 430 bytes (project) and 1,476 bytes (component); after it, `grep -o "require(\|^import \|eval(\|new Function"` finds nothing in either file. The `.toString()` of `equal` is the recursive `fast-deep-equal` function, which refers to itself by name, so it stays valid. The generator is a `.mjs` file, so `createRequire` is allowed there (it is not portable code).

### Q3 correctness in Node and Vitest

| Check | Result |
|---|---|
| 5 project examples (`schemas/examples/*.project.json`) through the generated validator | all valid, in Node (`validate-project.mjs`) and in Vitest |
| 9 component examples | all valid, in Node (`validate.mjs`) and in Vitest |
| `negative.mjs` (component) | 44 of 44 bad documents rejected, 2 good additions accepted. The card says 34; the file has 44 |
| `negative-project.mjs` | 62 of 62 cases behave as expected: 7 documents that must be accepted and 55 that must be rejected (by the schema or by `domainRules`). The card says twelve; the file has 62 |
| first error carries `instancePath` | yes. Example: `{"instancePath":"/id","schemaPath":"#/properties/id/pattern","keyword":"pattern",...}`; with `allErrors` the array has every error (2 for a document with two faults) |
| Vitest 5.0.3, `@vitest-environment node`, 4 tests (JSON attribute, 5 + 9 examples, one rejection with `instancePath`) | 4 passed, 575 ms |

Not run under Vitest: the 44 and 62 negative cases (they call `process.exit`). They ran in Node on the same module; Vitest loaded the same module and rejected the one case it was given.

### Q4 types

Options that passed:

```js
await compile(schema, name, {
  cwd: 'schemas', additionalProperties: false, unreachableDefinitions: true,
  format: true, bannerComment: '', enableConstEnums: false, strictIndexSignatures: true,
  maxItems: -1,
  $refOptions: { resolve: { urn: { order: 1, canRead: /^urn:/, read: (f) => urns[f.url.replace(/#.*/, '')] } } },
});
```

- The project schema `$ref`s the two domain schemas by `urn:`; without a custom `urn` resolver the library fails with `ERESOLVER ... source: 'urn:iynk:schema:robotics-domain:1.0'`. `urns` maps each domain schema `$id` to its JSON text.
- `maxItems: -1` is required. With the default (20), every array with `maxItems` becomes a union of tuples: 14,599 lines and 433,586 bytes for the project types. With `-1`: 2,938 lines, 69,263 bytes (15,371 gzip). Length limits stay in the validator.
- `tsc -p tsconfig.portable.json` over both outputs plus a `switch (op.k)` narrowing file: exit 0, 0.4 s. No `enum`, no `namespace` in the output (`grep` counts 0).
- `Op`: the compiler API reports a union of 64 members with 64 distinct values of `k`; narrowing on `k` works (`case 'meta.set'` gives `op.set.title`).
- `any`: 0 in `project.types.ts`; 1 in `component.types.ts`, in a comment only (line 639). `unknown` appears once (`value: unknown`, project line 878, an untyped value in the schema).
- Generation time: project 129 ms to 262 ms, component 37 ms to 53 ms.
- Keywords the four schemas use (counts of the schema words, approximate, from `kw.mjs`): `type`, `properties`, `required`, `additionalProperties`, `$ref`, `$defs`, `items`, `enum`, `const`, `pattern`, `min/max` family, `minItems`, `maxItems`, `uniqueItems`, `oneOf`, `allOf`, `anyOf`, `not`, `if/then/else`, `propertyNames`, `maxProperties`, `minProperties`, `contains`, `patternProperties`, `unevaluatedProperties`, `deprecated`. The hand-written fallback would need to cover more than the card's list (`if/then`, `allOf`, `anyOf`, `not`, `propertyNames`, `unevaluatedProperties`, `contains`), so it is not needed: nothing failed.

### Q5 JSON import attributes

| Tool | Result |
|---|---|
| Node 24.8 `node b.ts` (type stripping, no flag) | prints `uno 1` |
| `tsc -p` with the portable options | exit 0 (an unrelated `console` error with `types: []` was removed from the test file first) |
| Vitest 5.0.3 (`import uno from './zz-a.json' with { type: 'json' }` in a `.test.ts`) | passed |

The fallback in `src/parts/builtin.ts` (generated TypeScript) is not needed.

### Q6 Ajv 8 beside ESLint's Ajv 6

`npm install --ignore-scripts` (4.7 s) in a scratch copy of the manifest with `"ajv": "8.17.1"` in `devDependencies`:

```
├─┬ @modelcontextprotocol/sdk@1.32.2
│ ├─┬ ajv-formats@3.0.1
│ │ └── ajv@8.20.0
│ └── ajv@8.20.0
├── ajv@8.17.1
└─┬ eslint@9.39.5
  ├─┬ @eslint/eslintrc@3.3.7
  │ └── ajv@6.15.0
  └── ajv@6.15.0
```

- `npx eslint --version` prints v9.39.5 (exit 0). `npx eslint eslint.config.mjs --quiet` exits 0 (it prints only the Next plugin's "Pages directory cannot be found" notice, which the repo already prints).
- `require('ajv/package.json').version` at the root is 8.17.1, and `ajv/dist/standalone` exists there.
- Lockfile change: one line in the root package entry, plus `node_modules/@eslint/eslintrc/node_modules/ajv` 6.15.0 and its `json-schema-traverse` 0.4.1 move down under ESLint. The MCP SDK keeps its own Ajv 8.20.0 under it; nothing else changes. The `ajv8` alias fallback is not needed, and `overrides` stays unused.
- Already true before this change: the repo root has Ajv 6.15.0 at the top and 8.20.0 only under the MCP SDK (`npm ls ajv` in the worktree).

## What T-B2-04 should copy

1. Add `ajv` 8.17.1 and `json-schema-to-typescript` 16.0.0 as exact-pinned root devDependencies. Commit the lockfile change. `typescript` is already 5.9.3.
2. Ajv options as in Q1; `allowUnionTypes: true` for the component schema.
3. Run the `inlineRuntime` step on every emitted validator, and test that the output contains no `require(`.
4. `AJV_MODULE` is `'ajv/dist/2020.js'`; the standalone import is `'ajv/dist/standalone/index.js'`.
5. Type generator options as in Q4, with the `urn` resolver and `maxItems: -1`.
6. Budget the size check with headroom and say its unit (Q1 caveat).
7. The negative case counts are 44 (component) and 62 (project, 55 rejected plus 7 accepted); `T-B2-15` and `T-B2-04` text that says 34 and twelve should be updated.

## What it does not show

- Only the checked-in examples and the 106 negative cases were run. No generated or fuzzed documents.
- The generated modules were not loaded by Next.js or Turbopack (that is AX-03 in T-B2-01), nor in a browser or a worker.
- Output stability was checked once: regenerating all four files a second time gave identical SHA-1 sums. Only one machine was used.
- `json-schema-to-typescript` 16.0.0 output formatting depends on its bundled `prettier`; a different prettier version could change bytes and break `--check`.
- The size numbers are for these schemas today; they grow with the schemas.
- The gzip budget in the card (150 KB) and its measured 102 KB could not be reproduced and the cause is unknown.
