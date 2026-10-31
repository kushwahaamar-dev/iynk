# ADR-0110: Validate with JSON Schema through standalone-compiled Ajv, then plain-code passes for what a schema cannot say

Status: proposed, 2026-10-27. Author: project-data-model seat.
Upstream: R-025 (asks for zod), R-028 (recovery on invalid input), R-033 (op validation); audit X1 (no `eval` or `new Function` in the app, VERIFIED); BUD-05 (first-load JS); Objection O-2. Spec: PROJECT_DATA_MODEL 8 and 9.

## Problem

Documents and ops come from the keyboard, files, rooms, imports and an AI, so they must be validated by one definition everywhere: browser, worker, relay, tests and external tools. The route-level validation in the repo is zod (4.6.7). R-025 says the document type should be a zod schema. The document needs discriminated unions of 55 ops and 12 check kinds, a schema that tools outside the app can use, and no runtime code generation.

## Constraints

1. One definition shared by the app, the self-hosted server, the AI adapter and MCP and OpenAPI tooling (F-167).
2. No `eval` or `new Function` at run time (a Content-Security-Policy without `unsafe-eval` stays possible; the app sets none today).
3. First-load JavaScript at most 400 KB gzip (BUD-05); validation code loads in a worker.
4. Fast enough for load and per-batch checks at the 500-part scale.
5. Rules a schema cannot state (references across arrays, uniqueness across kinds, cross-field invariants) are plain code.

## Considered options

| Option | Summary | Verdict |
|---|---|---|
| A. JSON Schema 2020-12 as the definition; Ajv compiled to standalone code at build time; plain-code passes for references, limits, hygiene | Language-neutral, no `eval` | Chosen |
| B. Zod as the definition; generate JSON Schema with a tool when needed | Already used on routes | Rejected as the definition: schema generation for large unions and for non-TypeScript consumers is a one-way export and the generated schema is not the file anyone edits or tests. Zod stays for HTTP bodies |
| C. Ajv at run time (compiles with `new Function`) | Simple | Rejected: needs `unsafe-eval`; compile cost 94 ms (VERIFIED) on every start |
| D. A JSON Schema interpreter that does not generate code (for example `@cfworker/json-schema`) | CSP safe | Considered, not tested: slower per validation by design (EXTERNAL, HYPOTHESIS); kept as the fallback if standalone size is a problem |
| E. Hand-written validators | Smallest | Rejected: 55 ops, 12 checks and 79 definitions by hand will drift from the schema |
| F. Valibot, Typia, others | Smaller bundles | Not evaluated (UNKNOWN); no benefit shown against the need for a shared schema |

## Decision

1. `project.schema.json` is the single definition of the document, ops, envelopes, proposals, replay logs and file envelopes.
2. At build time Ajv (strict mode, no `allErrors` for speed in production, `allErrors` in recovery view) compiles it to a standalone module; no run-time code generation.
3. Five passes plus a library pass (PROJECT_DATA_MODEL 9.1): V1 canonical bytes, V2 schema, V3 references and invariants, V4 limits, V5 hygiene, V6 part library.
4. Types are generated from the schema; no hand-written duplicate.
5. Route-level zod stays; a route that accepts a project calls the standalone validator.
6. Recovery on failure shows the first 20 diagnostics with JSON Pointer paths and never deletes the stored record (R-028).

## Technical justification

- The schema compiles under Ajv strict mode (VERIFIED, Ajv 8.20.0). Three examples pass; 12 broken variants fail in the expected pass (VERIFIED).
- Standalone output keeps the property audit X1 recorded (no `eval` in the app) and avoids the 94 ms start-up compile.
- Splitting passes keeps errors specific: a schema error names a path and pattern, a V3 error names a rule id (`V3-STRIP-SHORT`).

## Performance data

VERIFIED, Apple M4 Pro, Node 24.8.0, Ajv 8.20.0, median of 20, document shape in PROJECT_DATA_MODEL 9.6:

| Case | Validate (V2) |
|---|---|
| 500 components, 1,000 nets, 1,000 wires | 0.63 ms |
| 2,000 components, 5,000 nets, 5,000 wires (limit) | 2.14 ms |

Validator size: 925,144 bytes of source, 101,757 gzip, 54,905 brotli. Runtime compile of the same schema: 94 ms. Not measured: standalone module load and parse time in a worker on a throttled CPU (UNKNOWN), zod bundle size for comparison (UNKNOWN), the V3 pass at scale (the prototype is not optimised; UNKNOWN).

## Cost implications

Build step to compile the validator and generate types. ESTIMATED 2 to 3 person-days. No run-time cost beyond the 55 KB brotli worker download.

## Licensing

Ajv 8.20.0 MIT and ajv-formats 3.0.1 MIT (VERIFIED from package files). The type generator is not chosen (licence UNKNOWN until selected).

## Security implications

Validation happens before use for every untrusted source. Closed objects and bounded arrays limit what a hostile document can carry. Pattern checks use fixed anchored regexes; none is known to be catastrophic, but all schema patterns should be fuzzed with long inputs before release (UNKNOWN until done). Standalone code is generated from our own schema at build time, not from input.

## Reversibility

Medium. The schema is a standard; swapping Ajv for another JSON Schema engine changes the build step only. Moving to zod would mean generating zod from the schema or rewriting it, and the examples and negative tests would verify the swap.

## Migration plan

1. Add the build step and generated types.
2. Replace ad hoc checks in the stores with the validator at the boundaries (load, import, room snapshot, proposal).
3. Add V3 to V5 as a shared module used by the loader and the op batch check.
4. Add a fuzz test for the schema patterns.

## Known limitations

- The validator is 925 KB of source; the schema's `oneOf` unions (55 ops, 12 checks) account for much of it. It is loaded in a worker, not in first load. A size reduction (hoisting shared definitions) is possible but not tried.
- Error messages for `oneOf` failures are noisy; the loader reports the closest branch by discriminator (`k` or `kind`), not Ajv's raw list.
- Cross-array rules live in code, so a second implementation (for example the relay in another language) must reimplement V3 to V5. The rule table in PROJECT_DATA_MODEL 9.2 is the spec for that.
- A schema-level `uniqueItems` on large arrays is O(n squared); uniqueness is checked in V3 by id instead.
