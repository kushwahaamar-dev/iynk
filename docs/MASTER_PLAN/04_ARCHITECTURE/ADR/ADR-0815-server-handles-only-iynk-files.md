# ADR-0815: The server does not import or export projects; all formats convert in the browser

Status: proposed, 2026-10-27. Author: API contracts design seat.
Refines: ADR-0109 (import and export with loss reports). Upstream: R-037, PROJECT_DATA_MODEL 12.2 and 13. Downstream: AC-API-13, F-090, F-091. Spec: API_CONTRACTS sections 7 Data, 8.4.

## Problem

Third-party formats (`.ino`, KiCad netlists, SPICE, Wokwi diagrams) each need a parser, each parser is an attack surface, and each carries a licence question (Wokwi and KiCad UNKNOWN in PROJECT_DATA_MODEL 12.2).

## Constraints

1. A hostile file must hit one browser tab, not the friends' server.
2. Zip bombs must be refused while streaming.

## Considered options

| Option | Verdict |
|---|---|
| A. The server imports and exports nothing; `.iynk`, `.iynkz` and all converters run in the browser | Chosen |
| B. Server-side converters | Rejected: attack surface and licence on the shared process |
| C. A converter microservice | Rejected: extra moving part with the same exposure |

## Decision

Import and export of vendor media types run locally in the browser (ProjectWorker), with no server route. The server accepts a `.iynk` body only inside `POST /shares` and `POST /rooms`. All other conversions return a project document and a loss report in the browser, then the project is saved locally.

## Technical justification

The server already validates a document (V2 to V5) and caps container size, entries, entry size and ratio (PROJECT_DATA_MODEL 12.1). Keeping parsers out keeps that list short.

## Performance data

PROJECT_DATA_MODEL 9.6 measured 159 KB gzip for a 1.6 MB document; AC-API-20 uses it. No import timing is claimed.

## Cost implications

None on the server.

## Licensing

Converter licences are the browser side's question (ADR-0109); the server links none.

## Security implications

Container caps are enforced while streaming (134,217,728 bytes total, 1,000 entries, 16 MiB per entry, 100 to 1 ratio; the total is itself ESTIMATED in PROJECT_DATA_MODEL 12.1).

## Reversibility

High. A converter could move server-side later behind a new endpoint.

## Migration plan

None.

## Known limitations

A person without a browser cannot convert through the API alone.

## Reconcile, second pass (2026-10-27)

| Id | Change |
|---|---|
| RC-24 | Decision section: removed the struck routes `POST /projects/import` and `GET /projects/{id}/export`. Import and export now run locally in the browser (ProjectWorker); the server accepts a `.iynk` body only inside `POST /shares` and `POST /rooms`. |

## Reconcile, final nits (2026-10-27)

| Id | Change |
|---|---|
| RC-24 | Title and option A now match API_CONTRACTS 8.4: the server does not import or export projects, and `.iynk` and `.iynkz` open and save in the browser like every other format. The old wording said the server handled `.iynk`. The "endpoint" in Reversibility is now "a new endpoint", since no import or export route exists. The file name keeps its old slug so links still work. |
