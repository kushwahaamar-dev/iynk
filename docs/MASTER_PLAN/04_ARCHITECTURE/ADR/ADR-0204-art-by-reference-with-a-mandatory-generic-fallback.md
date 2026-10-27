# ADR-0204: Art by reference, with a mandatory generic fallback

Status: proposed, 2026-10-27. Author: component-schema design pass.
Spec: COMPONENT_SCHEMA.md (section 12 holds the pointer table).

## Problem

80 hand-inked pages are valuable and executable; custom parts need a way to appear without art or code

## Constraints

Preserve working art; no executable content from untrusted parts (SECURITY_BASELINE X3); a part with no art must still place and wire

## Considered options

(a) require art for every part; (b) the descriptor points at a figure page, and a deterministic fallback draws from pins and dimensions; (c) generate all art from the descriptor and drop the figures

## Decision

(b); only core parts may reference figure pages or ship HTML; others use sanitised SVG or PNG, or the fallback

## Technical justification

(c) discards working art and is not measurably better (BRIEF §3.5). (a) blocks custom parts. The pin position is the shared contract, so wiring works the same with or without art

## Performance data

Figure sizes: parts 8.9 MB over 29 files, modules 3.8 MB over 12 (`figure-engine.md`). The fallback is a few SVG elements per part (not measured)

## Cost implications

Writing five generic renderers once

## Licensing

Colorfigures core is MIT (vendored, `figures/vendor/colorfigures/LICENSE`); art assets carry their own `licence` field

## Security implications

Removes the same-origin HTML path for non-core content; SVG is sanitised and shown via `img`

## Reversibility

High: fallback and art are independent

## Migration plan

`@cf data` feeds pins into figure builds; CI renders both and checks pin containment

## Known limitations

Fallback looks generic by design; a future 3D look for custom parts is not planned
