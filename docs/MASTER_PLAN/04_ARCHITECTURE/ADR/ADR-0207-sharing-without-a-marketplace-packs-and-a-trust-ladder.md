# ADR-0207: Sharing without a marketplace: packs and a trust ladder

Status: proposed, 2026-10-27. Author: component-schema design pass.
Spec: COMPONENT_SCHEMA.md (section 12 holds the pointer table).

## Problem

Amar wants to share parts with friends (F-220); a public store is out of scope (F-103); received parts are untrusted input

## Constraints

D-013, D-015; atomic import; no auto-run of code; works with the optional server relaying only

## Considered options

(a) public marketplace; (b) share files only, no process; (c) `.iynkpack` plus a trust ladder (core, local, imported) with an approval dialog and conformance run; (d) signed packs and a server registry

## Decision

(c)

## Technical justification

It covers the real use (a buddy sends a part) with the fewest moving parts. (a) and (d) need moderation, identity and server-side runners that nobody asked for

## Performance data

n/a; limits in 9.10 are proposals

## Cost implications

$0; no server execution

## Licensing

`provenance.licence` required on every part (R-138); the dialog shows it; `third_party_content` flags D-017 items

## Security implications

Pack limits, hash checks, per-hash approval, sanitised art, no `core` ids from packs

## Reversibility

High: a registry or signing can sit on top of the same pack format later

## Migration plan

Build after F-101; code packs only after ADR-0206 resolves

## Known limitations

Trust is the person's judgement of a buddy; no revocation list
