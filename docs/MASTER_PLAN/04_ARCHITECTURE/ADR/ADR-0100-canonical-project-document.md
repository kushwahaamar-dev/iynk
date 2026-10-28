# ADR-0100: The project is one JSON document, defined by one JSON Schema

Status: proposed, 2026-10-27, for the CORE gate (D-014). Author: project-data-model seat.
Upstream: BRIEF 8.3, 19.6; D-010, D-013, D-015; audit A1, A8, A11, change D1; R-025. Downstream: F-076, F-077, F-087, F-092, F-200, F-201. Spec: `04_ARCHITECTURE/PROJECT_DATA_MODEL.md`; schema: `04_ARCHITECTURE/schemas/project.schema.json`.

## Problem

There is no project object. Work is scattered: `iynk:v1` in `localStorage` holds done flags and settings keyed by catalogue ids, learner code is not persisted at all, circuits live inside figure files, and content is TypeScript modules with closed id unions (audit A1, A8, A11; walk step 14, VERIFIED). Everything planned next (a blank project, wiring, saving, sharing, rooms, AI edits, replay) needs one thing that can be saved, copied, diffed, validated and sent.

## Constraints

1. Local first, offline, no server needed (D-015). Works from IndexedDB and from a file.
2. Reuse the working catalogue types where they fit: `Check`, `WorldModel`, `CodeTemplate`, `FailureMode`, `BuildStep` (audit D1).
3. The same definition must serve the browser, a worker, the self-hosted server, the AI adapter and external tools (MCP and OpenAPI, F-167).
4. No `eval` or `new Function` in the app (audit X1 holds today).
5. Opens a 500-part, 1,000-wire project well inside the BUD-08 and BUD-09 proposals (50 ms autosave, 1 s open).
6. The part descriptor and the robotics and drone specs are owned by other seats; the document must carry their data without owning it.

## Considered options

| Option | Summary | Verdict |
|---|---|---|
| A. One JSON document, JSON Schema 2020-12 as the definition, generated TypeScript types | Plain text, diffable, validated by a language-neutral schema | Chosen |
| B. Folder of files (`project.json` plus real source files) | Git friendly | Rejected as the primary form: two things to keep in step; a single file is atomic. Kept as an export (PROJECT_DATA_MODEL 12.1) |
| C. Relational model in the browser (SQLite WASM on OPFS) | Query power | Rejected: heavy download, no file you can send, more moving parts for a document that is hundreds of KB |
| D. CRDT document (Yjs or Automerge) as the primary store | Offline multi-writer merge | Rejected for the graph: a CRDT cannot reject an invalid merge; RS-09 showed Yjs left a dangling wire and silently lost a duplicate id and a concurrent move (VERIFIED, RS-09 report). See ADR-0104 |
| E. Zod schema as the definition (R-025 text) | Already in the repo (4.6.7) | Rejected as the definition, kept for HTTP bodies: see ADR-0110 and Objection O-2 |
| F. Binary format (Protobuf, CBOR) | Smaller, faster | Rejected: no demand for it, loses diffability; a 500-part document is 340 KB canonical, 36 KB gzipped (VERIFIED) |

## Decision

A project is one JSON document, `format: "iynk.project"`, `schemaVersion: "1.1"`. Its shape is defined by `project.schema.json` (draft 2020-12); TypeScript types are generated from that file. The document is complete without a server. The same file defines the op, proposal, replay-log and file-envelope shapes as `$defs`. Part descriptors, robotics data and drone data are referenced or carried as opaque envelopes, not redefined.

## Technical justification

- One document holds everything the brief lists in 8.3 (coverage table in PROJECT_DATA_MODEL 2.1) and every field is reachable from one validator.
- The catalogue types listed above carry over with small, documented changes (PROJECT_DATA_MODEL 11.3), so the 461 existing checks run unchanged against converted projects.
- Three complete examples validate against the schema in strict Ajv mode, and 12 deliberately broken variants are rejected (VERIFIED, PROJECT_DATA_MODEL 9.6).
- Closed objects (`additionalProperties: false`) with a namespaced `ext` keep the format honest and extensible.

## Performance data

VERIFIED on Apple M4 Pro, Node 24.8.0, median of 20; not measured on any phone or Chromebook (UNKNOWN; scaling by 4x is ESTIMATED).

| Components / nets | Canonical bytes | gzip | JSON.parse | Ajv validate | Canonicalise + hash |
|---|---|---|---|---|---|
| 500 / 1,000 | 340,175 | 35,898 | 1.29 ms | 0.63 ms | 3.84 ms |
| 2,000 / 5,000 (limit) | 1,642,929 | 158,789 | 6.07 ms | 2.14 ms | 18.50 ms |

Starter projects are small: 8.9 KB canonical for the Uno blink, 13.7 KB for the ESP32 monitor, 32.9 KB for a converted lesson with six-language text. For comparison RS-09 measured a 14 KB state for 83 parts and 1 wire.

## Cost implications

No hosting cost; everything runs in the browser. Engineering: schema, generated types, validator build step, store and file code. ESTIMATED 2 to 3 person-weeks for one engineer, assuming the editor and solver are separate work (no measurement behind it).

## Licensing

JSON Schema is an open specification (EXTERNAL). Ajv 8.20.0 and ajv-formats 3.0.1 are MIT (VERIFIED from the installed `package.json` files). The type generator is not chosen; `json-schema-to-typescript` is the common one (licence UNKNOWN until checked at install). The document format itself is ours; the project licence is undecided (D-017) and each document carries its own `license` field with a placeholder.

## Security implications

Closed schema, size and depth limits checked before parsing, forbidden prototype keys, paths treated as labels, no secrets in documents, ACL advisory only (PROJECT_DATA_MODEL 13). Loading validates before use; nothing in a document is evaluated.

## Reversibility

Medium to high. All mutation goes through one `apply` function (ADR-0104), so the storage representation can change behind it. The schema is versioned with a migration chain (ADR-0105). Swapping JSON for another encoding would be a MAJOR version with one migration. Swapping the definition language back to zod would mean generating zod from the schema or the reverse (EXTERNAL tools exist; none tried).

## Migration plan

1. Land schema, generated types, the standalone validator and the three examples (this work).
2. Land the store and file code (ADR-0106) behind the existing lab stores, with the 140 converted projects as the corpus (ADR-0108).
3. Move each lab's code onto the document through ops; delete the lab stores once parity tests pass (R-152).
4. Remove the old `iynk:v1` progress shape after one release (PROJECT_DATA_MODEL 11.6).

## Known limitations

- Source files live inside the JSON as strings, so diffs of the pretty form show escaped newlines. The folder export is the git-friendly form.
- Every save rewrites the whole document (3.4 ms of serialisation at 500 parts; IndexedDB write time not measured, UNKNOWN).
- A reader needs the schema version it was written for; a newer file is refused, not partly opened (ADR-0105).
- The schema file is large (64 KB minified, 79 definitions); its standalone validator is 925 KB of source, 55 KB brotli (ADR-0110).

## Reconcile and spike fold-in (2026-10-27)

| Id | Change |
|---|---|
| RC-34 | Line 32: a new project is `schemaVersion: "1.1"` (was `"1.0"`), matching `project.schema.json` and `opSchema` 1.1. Domain data keeps its own `schemaVersion "1.0"`. |
