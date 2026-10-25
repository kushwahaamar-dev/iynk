# SimLab figures: platform guide

Every 3D figure in SimLab (boards, parts, modules, robotics benches, drones) is a self-contained Colorfigures page
built into `public/figures/<kind>/<id>.html`. The React host embeds the page in an iframe and drives it through a
postMessage bridge. This file covers the layout, the build and shoot commands, the bridge protocol and the rules
every figure follows. Background reading is `docs/research/colorfigures-guide.md`, cited below as "guide §n".

## Layout

```
figures/
  vendor/colorfigures/   core.js (vendored + patched), build.py (copy), LICENSE, PATCHES.md, vendor.py   [platform]
  engine/embed.js        figure side of the bridge, inlined into every page                            [platform]
  engine/...             the Board Bench and Drone engines                                             [engine agents]
  tools/cfbuild.py       builder                                                                       [platform]
  tools/cfshoot.py       shots + checks                                                                [platform]
  boards/<id>.js  parts/<id>.js  modules/<id>.js  robotics/<id>.js  drones/<id>.js                    [item agents]
  prompts/<id>.md        the Colorfigures prompt of every figure                                       [item agents]
  _smoke/smoke.js        platform smoke test: one box, one button
  _smoke/plain.js        platform smoke test for a page without mountFigure (CF_BRIDGE.plain)
public/figures/<kind>/<id>.html   build output; commit it (Vercel does not run Python)
```

## Writing a figure

The item file is `figures/<kind>/<id>.js`. Directives in its leading comment lines list what else goes in the page,
in order:

```js
// @cf title Arduino Uno R3                   page <title> before mount
// @cf use engine/bench/bench.list            a list of scripts, one path per line, relative to figures/ (# comments)
// @cf use engine/bench/breadboard.js         one script, relative to figures/
// @cf data SL_UNO data/boards/uno-r3.json    JSON from the repo root, inlined as window.SL_UNO
// @cf page plain                             only for pages that never call mountFigure (see CF_BRIDGE below)
(() => {
  const ui = mountFigure({ /* … */ });
})();
```

Page order: `core.js`, then `embed.js` (both in `<head>`), build.py's `HEAD`, then the `use` scripts (each file once),
the data, the item, then build.py's `TAIL` (zoom chip, toast, phone legend, solid shadows in see-through).

Rules:

1. **Mount synchronously.** Call `mountFigure(cfg)` while the page is parsing, not after a fetch or a timer. build.py's
   `TAIL` scripts look for `#fig` right after your scripts, and the bridge sends `ready` at `DOMContentLoaded`.
2. **One global per engine** (for example `SL`), and wrap every file in an IIFE. Never declare a core name (see
   Reserved names). `cfbuild.py` rejects an unindented `const|let|var|function|class` that uses a reserved name. It
   warns about a local that shadows a core helper, because calling the helper earlier in the same function throws
   (guide §1.14).
3. **Stable ids.** Give every button an `id` (`{ id: 'reset', label: 'Press RESET', onClick }`) and every picker
   choice an `id`. Without one, the id is a slug of the English label, which breaks when the label changes. Pressable
   parts are `act(name, svg, 'data-id="reset" data-label="RESET button"')`. `data-label` is the English name the host
   lists for keyboard and screen-reader users, so give every part one.
4. **State through `cfg.embed`.**
   - `accept(st, patch, ui)` validates a host patch (types, ranges, the current phase) and returns `true`, `false` or
     a reason string. Never `Object.assign(st, patch)`.
   - `report(st)` returns a small object of discrete values (mode, power, pins, fault, phase). Round or leave out
     anything that changes every frame. The bridge posts it whenever it changes, at most about 30 times a second.
5. **Every string through `CF_T`.** Write English and call `CF_T('Text')`, or `CF_T('{n} mA', { n })` for values.
   `tag()`, `xrCallouts()`, buttons, chips, switches and `ui.flash()` already translate their own text, so pass
   English to them. A button label with a live value is a template with its values,
   `label: ['Press {name}', { name: 'RESET' }]`, never a filled-in string: a button is labelled once, at mount, and a
   new dictionary relabels it from its template. Write labels in capitals only for Latin, Greek and Cyrillic text. The host sends the dictionary
   (`src/i18n/figures/<lang>.json`, keyed by the English text), so every new string needs a key there.
6. **Test parameters.** Read query parameters in `cfg.params(st, q)`:
   - `?exploded=1` sets `st.exploded = true` (cfshoot shoots the exploded set only when it does).
   - `?xr=1&labels=1` is see-through with labels, handled by `xrMount`.
   - `?yaw=…&pitch=…&free=1` sets the camera, handled by the core.
   - Figure keys such as `?mode=blink` are your own.
7. **Prompts.** Every figure writes its Colorfigures prompt (what it shows, its parts, its actions, its look) to
   `figures/prompts/<id>.md`. `figures/prompts/README.md` lists them all.

## Build

```bash
python3 -I figures/tools/cfbuild.py boards/uno-r3            # one figure -> public/figures/boards/uno-r3.html
python3 -I figures/tools/cfbuild.py boards/uno-r3 drones/quad5
python3 -I figures/tools/cfbuild.py --kind boards             # every figure of one kind
python3 -I figures/tools/cfbuild.py --all                     # everything (files starting with _ are skipped)
python3 -I figures/tools/cfbuild.py _smoke/smoke --out /tmp/x.html
```

The build fails, naming the file and line, on:

- a missing item, `use` file or data file;
- a path outside `figures/` (for `use`) or outside the repo (for `data`);
- invalid JSON;
- an unknown `@cf` directive;
- `</script` or `<!--` inside a script;
- a redeclared core name.

The page is written atomically. A failed build leaves the previous page in place.

## Shoot and check

```bash
python3 -I figures/tools/cfshoot.py boards/uno-r3 --press "Press RESET@300,Mode>Blink@900" --at 1200,4000
```

Output goes to `…/scratchpad/shots/<kind>-<id>/` (or `--out DIR`). Every shot uses a fresh context with a paused
fake clock, so runs are deterministic:

| Shots | What they show |
|---|---|
| `angle-*` | 7 angles, closed |
| `xr-*` | the same 7 angles in see-through with labels |
| `exploded-*` | 7 angles exploded, only if the figure supports it |
| `press-front-*`, `press-behind-*`, `press-xr-*` | a `?press=` run at each `--at` time (`--press` uses the English button text) |
| `phone-xr` | a 390 × 844 touch phone |
| `zoom-xr` | a 4× close-up (`--zoom x,y,w,h`) |
| `embed` | the page in an iframe host on a dark page, driven through the bridge (`hello`, `press` by id, a bad `press`, `query`) |

Also written:

- `contact.png`: every shot on one sheet. Open this first.
- `report.json`, which records per shot:
  - `data-errors`;
  - `NaN`/`Infinity`/`undefined` inside `#art`;
  - console and page errors;
  - label pills that overlap or leave the frame;
  - horizontal scroll;
  - the toast;
  - `window.__st`;
  - the bridge messages.

The exit code is 1 on any problem. `--query "mode=blink"` adds parameters to every shot. What to look for in the
shots is in guide §4.6.

## The bridge (figures/engine/embed.js)

Embedded mode is on inside any iframe. `?embed=0` turns it off and `?embed=1` forces it on.
In a frame 560 px wide or less it draws no label pills and no Labels switch: there the core draws numbered badges for
a legend under the figure, and embedded mode hides that legend.

| URL parameter | Effect |
|---|---|
| `bare=1` | also hides the figure's own buttons, stats, switches and keypad (the host draws them) |
| `lang=xx` | first language. A non-English page stays hidden until the `locale` message arrives, for 1.5 s at most |
| `theme=dark` | dimmed paper |
| `origin=https://…` | the host origin, when the figure is served from another origin |

**Envelope.** Host to figure: `{ source: 'simlab', v: 1, type, …payload }`. Figure to host:
`{ source: 'simlab-figure', v: 1, type, …payload }`. The figure accepts a message only when `event.source` is its
parent window and `event.origin` is the host origin. That is `location.origin` for same-origin hosting under
`/figures/`, and `'null'` or `'file://'` under `file://`, where it also posts to `'*'`. A message the iframe posts to
itself is ignored. Commands that arrive before the figure is ready are queued (up to 200), then run in order after
`ready`.

| Host → figure | Payload | Does |
|---|---|---|
| `hello` | | answers `ready` (idempotent, as often as you like) |
| `press` | `id`, `choice?` | clicks a button by id. With `choice`, it opens the picker and clicks that chip by id |
| `chrome` | `hide [id]` | hides what the host draws itself: the figure's own buttons with those ids (and their pickers), its switches (`xr` See-through, `labels`), `stats`, the HUD's big numbers top right, and for a figure shown on its own (the landing page) `zoom`, the zoom chip, and `toast`, the figure's notes. Hidden buttons stay pressable through `press` and hidden switches still follow `xr` and `labels`; `ready.buttons` and `ready.switches` still list them, marked `hidden: true`. Each `chrome` replaces the last one: `hide: []` shows everything again. Zoom can't be hidden. An id with nothing to hide comes back as `error` (the others are still hidden) |
| `act` | `name`, `data?` | runs `cfg.acts[name]` on the drawn part whose `data-*` match `data` (or on a stand-in) and redraws |
| `set` | `state` | `cfg.embed.accept(st, state)`. A rejection comes back as `error` |
| `view` | `yaw`, `pitch?`, `ms?` | eases the camera (the figure's turn limit applies) |
| `xr` | `on` | sets the See-through switch |
| `labels` | `on` | sets the Labels switch |
| `pal` | `key` | palette: `mustard`, `tomato`, `mint`, `cobalt` or `blush` |
| `locale` | `lang`, `strings` | swaps the dictionary (`{ English: translation }`), relabels and redraws |
| `theme` | `mode` | `'dark'` dims the paper, anything else restores it |
| `flash` | `text`, `ms?` | shows a notice on the figure (translated when `text` is a key) |
| `query` | | answers `state` and `labels` |
| `pause`, `resume` | | the host hid or showed the figure: its animation clock stops and goes on where it stopped (a hidden tab pauses it too) |

| Figure → host | Payload | When |
|---|---|---|
| `ready` | `fig`, `title`, `en`, `lang`, `buttons [{id, label, en, picker, hidden?}]`, `switches [{id, label, on}]`, `acts [name]`, `parts [{act, id, label, en}]`, `pals`, `pal`, `view {yaw, pitch}`, `state`, `readout`, `embedded` | at `DOMContentLoaded` after mount, and after every `hello` |
| `part` | `act`, `id`, `data` (all `data-*`), `by: 'user' \| 'host'` | a part was pressed, sent before the figure acts on it |
| `button` | `id`, `choice?`, `on?` (switches: the new position), `by` | a button, chip or switch was clicked, sent before its handler runs |
| `state` | `state` (the `report(st)` object), `changed [keys]`, `readout`, `parts` | after a render that changed any of them (at most about 30 per second), and on `query` |
| `labels` | `items [{n, text, en, on}]` | the visible labels changed (an empty list while labels are off) |
| `flash` | `text` (shown), `en` | a notice was shown. Mirror it into the lab log |
| `focus` | `on` | the iframe document gained or lost focus |
| `error` | `message` | uncaught errors, unknown ids, rejected `set`, bad commands |

**What the host must do.** This is the contract for FigureFrame in `src/components/figure`:

- Post `hello` on the iframe's `load` event, and again when the iframe is shown again.
- Queue commands until `ready`. Never reset readiness in `onLoad`: under CPU load, `ready` arrives before `load`
  (guide §2.3).
- Check `event.source === iframe.contentWindow`, `event.origin`, `source === 'simlab-figure'` and `v === 1`.
- Post to `location.origin`, never `'*'`.
- Send `theme` and `locale` after every `ready`. Put `?lang=` in `src` so the first paint is not English.
- Send `chrome` after every `ready` too when the host draws some of the figure's buttons itself: a reloaded page
  starts with every button shown.
- Don't use a `sandbox` attribute or `X-Frame-Options: DENY`.
- Style the iframe element with `color-scheme: light` and a paper background (`#f2efe7`, or `#e4ddcf` in dark
  mode) so there is no white flash.
- Give it a `title` and a definite box: `aspect-ratio: 4/3` on desktop, about `10/11` on phones, `max-height` about
  `80vh`. The frame shape is fixed at mount, so a resize only rescales.
- Keyboard: arrows turn the figure once the iframe has focus. `#fig` is focusable (`tabindex=0`).
- Build the accessible list of pressable parts from `ready.parts` / `state.parts` and drive them with `act`.
- Never put overlays on top of the iframe: pointer capture crosses its edge.

**Extra events, extra commands, plain pages: `CF_BRIDGE`.** `embed.js` exposes this global:

- `CF_BRIDGE.send(type, data)` posts any figure-to-host event except `ready`. For example, a figure emits sound as
  `CF_BRIDGE.send('sfx', { name: 'click' })` (S10), and the host plays it.
- `CF_BRIDGE.on(type, fn)` handles a host-to-figure command that is not in the table above. The built-in commands
  cannot be replaced.
- `CF_BRIDGE.embedded` is true when there is a host to talk to.
- A page that never calls `mountFigure` (the flight range, for example) declares `// @cf page plain`. cfbuild then
  leaves out build.py's `HEAD` and `TAIL`. The page calls `CF_BRIDGE.plain(() => readyPayload)` once it is set up.
  The bridge then sends that `ready`, answers every `hello` with it, runs the queued commands, and handles `locale`
  (`CF_T` works) and `theme` (sets `html.cf-dark`, which the page styles itself). Any other command must be
  registered with `CF_BRIDGE.on`. A plain page sends its own `state` events. `figures/_smoke/plain.js` is the
  minimal example.

**Core strings in the figure dictionary.** Besides each figure's own strings, `src/i18n/figures/<lang>.json` needs
these keys, which come from the core and build.py and show in embedded mode or to screen readers:

- `See-through`, `Labels`, `On`, `Off`
- `{label} — already set`, `{label} isn't possible right now` (keep `{label}` as it is)
- `Zoom out`, `Reset zoom`, `Zoom in`
- `Keypad`, `SPACE`

These keys only appear on standalone pages: `Hand-drawn wobble`, `Colour`, `View`, `Front view`, `Turntable`,
`Made with Colorfigures ↗`.

## Reserved names

Never declare these at the top level, and don't shadow the helpers you call. The full list is in guide §1.14;
`cfbuild.py` also reads the top-level names of the vendored core.

- **Core functions and constants:** `PALS METAL CLEAR CERAMIC DARK INK SHADOW C S OX OY VIEW RC RCZ YAW PITCH CAM_K
  CAM_LIM setCam P P0 Dv f pd sp on PX PY PZ vis facing tone toneI mix matOf ease ink fill face shape line loft hull
  box extrude cyl cylX rod tx txY castShadow board act tag clipTo _clipN INK_K mountFigure xrCallouts xrGhost xrMount
  xrWrap mountKeypad` (and the rest of §1.14).
- **SimLab patch names:** `CF_Q CF_EMBED CF_NOTE CF_LANG CF_STR CF_T CF_ESC CF_L CF_SLUG CF_TW CF_MAT CF_OPTS
  CF_FRAME_A CF_MOVE_T CF_MOVED CF_MOUNT_HOOKS CF_UI CF_CFG CF_SETLOCALE CF_THEME CF_CSS`.
- **Globals:** `window.__st`, `window.__ln`, `FIG_A`, `LBL_U`, `GAME_KEYS`.
- **Element ids:** `fig art fdefs hand wob btns stats toast readout wb pals vreset vspin lblctl lbl xrb lblb`. Clip
  ids `k1…kN` are also taken.
- **Classes:** `stage actions stepwrap act car chips chip current off stat k v bump tag on vset vrow mcap kpad dp hub
  go down sw ctl row controls made-with show`, build.py's `zwrap zchip zm zp zi lgd`, and the html classes
  `nolabels zoomed cf-embed cf-bare cf-dark cf-wait cf-moving`.

## Top pitfalls

Each has its fix in guide §5 (the full list of 25). The ones that bite first:

- **Depth sorting.** Give every item a tight box, and cut long wires into pieces (§1.4, §3.3 "Sorting at every
  angle"). For rotated assemblies, sort with `V_local = Rᵀ·CAM_V`.
- **Clicks.** Parts react on `pointerdown`, not `click`: the drawing is replaced every animation frame (§1.10).
- **Time.** Use the `dt` passed to `ui.animate` for time, not `performance.now()`: hidden iframes throttle timers
  (§2.3 Hidden iframes).
- **`turn: 'full'`.** Add it only after the shots look right from every side (§4.6). Without it, `view` is limited
  to ±60° around the front.
- **Pills.** They are measured now, but long labels still crowd. Keep labels short and check `overlaps` in
  `report.json`.
- **NaN.** Don't grep a page dump for NaN, because the baked noise PNG contains it. Use cfshoot's count inside
  `#art` (§4.4).
- **Messages.** Don't post `state` every frame (keep `report` discrete), and don't trust a patch (`accept` only).
