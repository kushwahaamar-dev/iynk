# ADR-0815: The server imports and exports only .iynk and .iynkz; other formats convert in the browser

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
| A. Server accepts only `.iynk` and `.iynkz`; converters run in the browser | Chosen |
| B. Server-side converters | Rejected: attack surface and licence on the shared process |
| C. A converter microservice | Rejected: extra moving part with the same exposure |

## Decision

`POST /projects/import` takes the vendor media types only; `GET /projects/{id}/export?format=` returns the same. All other conversions return a project document and a loss report in the browser, then optionally `POST /projects`.

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

High. A converter could move server-side later behind the same endpoint.

## Migration plan

None.

## Known limitations

A person without a browser cannot convert through the API alone.
