# ADR-0102: Prefixed random identifiers; refdes, pin ids and part ids are separate

Status: proposed, 2026-10-27. Author: project-data-model seat.
Upstream: BRIEF 8.3 ("stable IDs"); audit A1 (closed id unions); R-030; RS-09 (duplicate-id rejections). Downstream: every op, wire, check and room message. Spec: PROJECT_DATA_MODEL 3.

## Problem

Ids are the thing everything else points at: nets are referenced by wires and checks, components by placements and faults, sources by firmware bindings. Today ids are catalogue strings in closed unions (`BoardId`, `PartId`, five `as const` arrays in `src/content/ids.ts`, and a second `BoardId` in `src/lib/interp/profiles.ts:6-18`, VERIFIED) and the figure's own part designators. R-031's draft derives net ids from "the smallest pin key". A project editor needs ids that two offline buddies can generate without clashing, that never change meaning, and that are readable enough to review in a diff.

## Constraints

1. Created on the client with no server round trip (D-015).
2. Unique in the document across entity kinds, so an op can say `id` without a type.
3. Immutable; never reused; no meaning in the value (a rename or a move must not change it).
4. Safe in URLs, file names, JSON keys and the component spec's pin id pattern.
5. Readable ids must be possible for templates and converted catalogue items.

## Considered options

| Option | Summary | Verdict |
|---|---|---|
| A. Prefixed random token (prefix + 80 random bits in base32), ULID for the project | Self-describing, collision-resistant, URL safe | Chosen |
| B. UUID v4 | Standard | Rejected: 36 characters in every reference; no kind prefix, so mistakes between kinds are not visible |
| C. Sequential counters per kind (`cmp_1`) | Short, readable | Rejected: two offline buddies both create `cmp_7`. RS-09's client reuses ids on purpose 1 in 30 times and the server rejected each (`duplicate_id`, VERIFIED) |
| D. Server-assigned ids | No clashes | Rejected: needs a server; breaks offline |
| E. Derived ids (smallest pin key, content hash) | Deterministic | Rejected for nets and parts: changes when members change, so checks and ops would dangle (R-031 draft) |
| F. Refdes as the id (`R1`, `U1`) | Readable | Rejected: editable, reused after deletion, collides across buddies |

## Decision

1. Entity ids are `<prefix>_<token>`; the prefix names the kind (`cmp`, `net`, `wir`, `src`, ...; 20 prefixes in PROJECT_DATA_MODEL 3.2); the token is 1 to 64 characters of `[a-z0-9_-]`. Maximum 72 characters. Unique across all kinds in the document.
2. Generated ids are 16 random base32 characters (80 bits) from `crypto.getRandomValues`. The project id is `prj_` plus a lowercase ULID.
3. Readable tokens (`cmp_led1`, `net_gnd`) are valid and used by templates and the converter.
4. *Local ids* (`[A-Za-z0-9][A-Za-z0-9_-]{0,47}`) are allowed only where nothing outside the parent collection points at the item: world inputs, tests, checks, quiz questions.
5. Part ids, part versions, pin ids and parameter keys are those the component schema defines. A pin address is `{c, p}`. The printed label of a pin is its `designator`.
6. Refdes (`R1`) is a human label, unique across boards and components, editable, never used as a reference.
7. Rule C-PIN gives deterministic pin ids to the 12 catalogue boards (PROJECT_DATA_MODEL 3.4).

## Technical justification

- Birthday bound for 80 bits: about 4 in 10^13 for a million ids (ESTIMATED by arithmetic; honest clients only).
- Readable ids keep diffs reviewable: `net_gnd` loses nothing against `net_8k3f...`, and the converter output is stable between runs.
- The prefix lets a validator catch "a net id used where a component id is expected" with a regex.
- Rule C-PIN was run over all 12 board pinouts (VERIFIED in scratch): no collision. Uno R3: 44 rows, 44 ids; Nucleo F401RE 114 rows with 27 groups; DE10-Lite 144 rows.

## Performance data

Id checks are regex matches inside the schema; they are part of the 0.63 ms validate time at 500 components (VERIFIED). Id length cost: 72 characters at most; the examples average well under that.

## Cost implications

None at run time. Engineering: a small id module and a lint that forbids ids built from positions or counters.

## Licensing

ULID is an open specification (EXTERNAL); the generator is a few lines and can be written in house, so no package is required. Base32 alphabet is lowercase and avoids visually confusable letters in the Crockford variant.

## Security implications

Random ids do not leak creation order except the project ULID's timestamp prefix, which is also in `createdAt`. Ids are never trusted for authorisation. Matching ids across a document are checked (V3-ID-DUP) so a hostile duplicate cannot alias another entity. Free-key objects are checked for prototype keys (V5), and ids cannot be `__proto__` because they must match the prefix pattern.

## Reversibility

High while no document is public. After release, changing the id pattern is a MAJOR schema bump with a migration that rewrites ids and every reference (mechanical and test-covered, but touches every file).

## Migration plan

1. The id module and the schema patterns ship with CORE.
2. The converter produces readable ids from catalogue ids and refdes.
3. Closed unions in `ids.ts` stay for figure-bound catalogue items only; the part registry takes over for new work (R-030).

## Known limitations

- Random ids are unreadable in logs; the editor shows refdes and net names instead.
- Two buddies who fork the same template get identical readable ids (`cmp_led1`) in their copies. This is harmless inside one document and the fork records its origin; a merge between forks is not supported (there is no document merge, only an ordered op log).
- The component schema's pin id pattern (letter first, no punctuation) forced `P5V` and `POWER_6` for some Uno pins; if the component spec changes its rule, only rule C-PIN changes.
