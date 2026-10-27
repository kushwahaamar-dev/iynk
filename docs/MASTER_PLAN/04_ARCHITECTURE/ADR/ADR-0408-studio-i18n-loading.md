# ADR-0408: Studio strings as props from the static page; heavy text on demand

Status: proposed, 2026-10-27, revised after review the same day. Author: frontend and backend architecture seat.
Upstream: K-I18N, A9, `src/i18n/server.ts`, COMPONENT_SCHEMA Text type. Downstream: F-171, F-172, F-173, R-068. Spec: FRONTEND_ARCHITECTURE section 12.

## Problem

Strings load on the server by language and namespace and reach client components as props. Studio is a client app addressed by a fragment, and parts bring their own text.

## Constraints

1. Six languages with a parity test (0 missing keys today).
2. Per-language dictionaries are 95 to 104 KB gzip and must stay lazy.
3. Layout survives 40 percent longer text.
4. Right-to-left is not in the first release.

## Considered options

| Option | Summary | Verdict |
|---|---|---|
| A. Client i18n library | New dependency | Rejected: `createTranslator` exists |
| B. Fetch all strings on mount | One large JSON | Rejected: budget |
| C. Props for chrome, on-demand JSON for parts and lessons | Existing pattern extended | **Chosen** |

## Decision

1. New namespace `studio` loaded by the static page and passed down.
2. `loadPartText(lang, ids)` loads `src/i18n/content/<lang>/parts/*.json` on demand; fallback `en`, then id.
3. Project text uses `LocalizedText` inside the document.
4. No sentence is built by concatenating translated pieces; a lint rule enforces it.

## Technical justification

The server-side `import()` per language and namespace is already how 11 namespaces load, and its output passes through a static page unchanged. Per-part JSON keeps text for parts the person never places out of the bundle. ICU-style parameters let word order differ by language, which concatenation cannot.

## Performance data

MEASURED: a one-language dictionary is 284,000 to 402,000 B raw and 95,000 to 104,000 B gzip for hi, fr, es, de, zh (PERFORMANCE_BASELINE B4). ESTIMATED: the `studio` namespace adds about 15 KB gzip to the Studio shell (FRONTEND section 11.2); the 120 KB per route group ceiling gives 15 percent headroom. Part-text chunk size: UNKNOWN until the catalogue exists.

## Cost implications

No dependency. Translation effort grows with the `studio` namespace and part text across six languages; the parity test only checks keys exist, not quality. Effort is not estimated.

## Licensing

Strings written for iynk are covered by the licence decided later (D-017). Part names and lesson prose copied from the three third-party sites must be checked or rewritten before publishing (D-017). Nothing is added as a dependency.

## Security implications

Strings are data, rendered by React as text; no string is inserted as HTML. Project text and part text can come from a buddy or an import, so they are never trusted as markup and are length-limited by the data model (PROJECT_DATA_MODEL 5.13). The fallback chain logs a miss to the local error log only.

## Reversibility

High. A namespace and one loader function. Moving to a client library later does not change document fields.

## Migration plan

Add `src/i18n/messages/<lang>/studio.json` and register it in `NAMESPACES`; the parity test covers it from the first commit. Part text moves out of descriptors into per-language files as the catalogue is converted (SYSTEM 15.1). A language switch is a page navigation with a `pagehide` flush.

## Known limitations

- Right-to-left is LATER (F-179); only the canvas geometry is already direction independent.
- Machine-written translations of technical terms may be wrong; the parity test cannot see that.
- A language switch reloads the page, so unsaved transient state (a drag in progress) is lost; committed edits are flushed first.
