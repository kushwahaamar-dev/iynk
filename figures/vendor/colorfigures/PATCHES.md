# Vendored Colorfigures core: SimLab patches

`core.js` here is the Colorfigures skill's `assets/core.js` (MIT, April Zhu; see `LICENSE`) with the patches below.
`build.py` is the skill's `scripts/build.py`, copied unchanged; `figures/tools/cfbuild.py` reads its `HEAD` and `TAIL`
as data and applies fixes B1-B2 to them.

| File | Upstream sha256 |
|---|---|
| `core.js` (before patching) | `a78aab94ab7396b99080bf72673d5d4d689d771764d76cb08f1a0d28033f7fc3` |
| `build.py` | `364b3028aed6980811ad49ac3c39725c4b901ef85dc0aa6b778fe612ae104ee4` |

Do not edit `core.js` by hand. Change `vendor.py` and run it again:

```bash
python3 -I figures/vendor/colorfigures/vendor.py            # reads ~/.claude/skills/colorfigures
```

It refuses a different upstream core, and it fails if any patch no longer matches exactly once.

## Core patches

Section numbers refer to `docs/research/colorfigures-guide.md`.

| Id | What | Why (guide) |
|---|---|---|
| P0 | One SimLab block after the colour constants. It defines every `CF_*` name below. | n/a |
| P1 | `CF_TW(text, fs)` measures label text with `CanvasRenderingContext2D.measureText` in the pill's own font (`800 ui-monospace,Menlo,monospace`), adds the `.04em` letter-spacing per grapheme and caches each string. It replaces `text.length*fs*.62` in `tag()` and in both width computations of `xrCallouts()`. | 2.3 Localisation: Chinese pills overflowed and Hindi pills came out twice too wide |
| P2 | `CF_T(english, vars?)` looks a string up in the current dictionary (the keys are English, so a missing entry still reads) and fills `{name}` placeholders. `CF_SETLOCALE(lang, strings)` swaps the dictionary, sets `<html lang>` (`zh` becomes `zh-Hans`), relabels every `[data-cft]` / `[data-cft-aria]` element and redraws. Translated: label pills and their `data-t` (`data-en` keeps the English), see-through callouts, the title (document, header, SVG `aria-label`), buttons, picker chips, the "— already set" / "isn't possible right now" notices (now the keys `{label} — already set` and `{label} isn't possible right now`), every `ui.flash` text, the See-through and Labels switches, the caption, the controls row, the On/Off switch, the credit, and the keypad's names and `SPACE`. Text that goes into SVG or attributes is escaped (`CF_ESC`). Buttons and chips get stable `data-id`s (`b.id` or a slug of the English label); the switches are `xr` and `labels`. | 2.3 Localisation, Messages (`press` by id) |
| P3 | Embedded mode: `CF_EMBED` is on inside any iframe or with `?embed=1`, off with `?embed=0`; it sets `html.cf-embed` (and `html.cf-bare` with `?bare=1`). `CF_CSS` hides the header, controls row, credit, phone legend and caption, lets the SVG fill the iframe (beating build.py's `fit()`), and keeps the zoom chip and toast. The frame shape follows the iframe (`CF_FRAME_A`, `clamp(innerHeight/innerWidth, .7501, 1.4)`). `CF_MOUNT_HOOKS` run at the end of `mountFigure(cfg)` with `(cfg, ui)`; `figures/engine/embed.js` uses it. `?lang=xx` sets the first language. | 2.3 URL contract, CSS, Size |
| P4 | Dark host: `html.cf-dark` (from `?theme=dark` or `CF_THEME('dark')`) sets `--paper:#e4ddcf; --rule:#cbc2b1; --muted:#6a6357`. The page is always `color-scheme: light`, and `#fig` gets a focus ring. | 2.3 Dark mode (the paper-plate rule), Focus and keys |
| P5 | Defects from Appendix E. (a) A material passed as a colour string (`'#rrggbb'`) is turned into a material; anything else is reported on `data-errors` and drawn dark. Before, `?sheet=schematic` crashed with `Cannot read properties of undefined (reading 'substr')`. (b) `xrWrap` checks its options and reports unknown or missing ones (claw.html passed `over`, which does not exist, so see-through showed nothing). (c) The frame driver sets `html.cf-moving` while frames are drawn and clears it 220 ms after the last one, for fix B1. | Appendix E rows 1, 3 and 8 |

## Build fixes (applied by `cfbuild.py` to build.py's `HEAD`/`TAIL`)

| Id | What | Why |
|---|---|---|
| B1 | build.py's first `TAIL` rule removed the hand-drawn filter on narrow or touch screens at all times. Now it is removed only while `html.cf-moving` is set, so phones keep the inked look at rest. | Appendix E row 3: the docstring promised "a lighter filter while the figure moves"; S4 asks for the Colorfigures look everywhere |
| B2 | Focus rings for the zoom chip's buttons, the only build.py control left in embedded mode. | keyboard access |

## Handled outside the core

These Appendix E defects are fixed in the SimLab bridge and host, not in `core.js`:

- `ready` came from a 40-60 ms timer and raced the iframe's `load` event. `embed.js` sends `ready` at
  `DOMContentLoaded` after mount and answers every `hello`. The host must never reset readiness on `load` (FigureFrame).
- `Object.assign(st, msg.patch)` let any key overwrite the state. A `set` message goes only through
  `cfg.embed.accept(st, patch)`, and a figure without `accept` refuses every `set`.
- `readout`, `hint` and `idea` are never shown by this core. The bridge sends the translated `readout(st)` in `ready`
  and `state`, so the host can show it. Prose such as hints and ideas belongs in the host.
- SKILL.md's reserved-name list is incomplete. `docs/FIGURES.md` has the full list, and `cfbuild.py` rejects
  unindented redeclarations of core globals and warns about locals that shadow core helpers.
