# Colorfigures authoring guide for iynk

How to build iynk's figures with the Colorfigures skill: the engine API (every global), what `build.py` adds, how a
built page behaves inside an `<iframe>` and how to run it embedded in the Next.js host, how the two originals stretched
one engine across many figures and how iynk's Board Bench and Drone engines should be shaped, a verification recipe
that works on this machine, and the 25 pitfalls that cost the most time.

Everything marked **tested** was run on this machine (Playwright 1.58 with its cached Chromium 145, macOS) while writing
this guide. The tools and the embed bridge are listed in full in the appendices because the scratchpad copies are
temporary.

## Contents

0. [Sources and conventions](#0-sources-and-conventions)
1. [core.js API reference](#1-corejs-api-reference)
2. [build.py, the page inside an iframe, and embedded mode](#2-buildpy-the-page-inside-an-iframe-and-embedded-mode)
3. [Engine pattern: the originals, and iynk's Board Bench and Drone engines](#3-engine-pattern)
4. [Verification recipe (tested here)](#4-verification-recipe-tested-on-this-machine)
5. [Top 25 pitfalls and their fixes](#5-top-25-pitfalls-and-their-fixes)
- Appendix A: `cfshoot.py` (screenshots and error checks)
- Appendix B: `cfbuild.py` (multi-script builder)
- Appendix C: `embed.js` (iynk embed bridge)
- Appendix D: host-side sketch (React `FigureFrame` v2) and the plain test host
- Appendix E: defects found in the skill examples and in the iynk baseline

---

## 0. Sources and conventions

| Short name | Path |
|---|---|
| `SKILL.md` | `~/.claude/skills/colorfigures/SKILL.md` |
| `core.js` | `~/.claude/skills/colorfigures/assets/core.js` (641 lines) |
| `build.py` | `~/.claude/skills/colorfigures/scripts/build.py` (25 lines; lines 14 and 15 are the long `HEAD` and `TAIL` strings) |
| `toaster.html`, `lamp.html`, `claw.html` | `~/.claude/skills/colorfigures/assets/examples/` |
| `R/…` | Robotics Bench original scripts: `/private/tmp/claude-501/-Users-amar-Codes-ak-simlab/327c458a-8849-435d-a3e9-20eb9855a68f/scratchpad/orig/robotics/` (`R/00-core.js`, `R/01-.js` engine, `R/02-…` to `R/14-…` Figs 01 to 13) |
| `D/…` | Drone Lab original scripts, same folder `…/orig/drone/` (`D/00-core.js`, `D/01-…` shared pieces, `D/02-…` frames, `D/03-…` lab engine, `D/04-.js` range, `D/05-…` to `D/17-…` Figs 01 to 13) |
| baseline | the current iynk tree, e.g. `figures/src/board.html`, `src/components/FigureFrame.tsx` (commit `245763f`) |
| sibling research | `docs/research/robotics-bench-a.md`, `robotics-bench-b.md`, `drone-lab-a.md` (content catalogues; this guide links to them instead of repeating them) |

References are `file:line`. UI strings are quoted verbatim in "double quotes" or `code`.

**Important version note.** The originals do **not** run on the skill's current `core.js`. `R/00-core.js` and
`D/00-core.js` are an older core: the object turns in fixed 90° `VIEW` steps (`R/00-core.js:28-40`), there is no
camera drag, no `camTo`, no see-through kit, no `mountKeypad`, no `bakeNoise`, `byDepth` sorts by centre point only
(`R/00-core.js:42`), shading has hard steps (`R/00-core.js:71-72`), and `animate` is a per-call 16 ms `setTimeout`
loop (`R/00-core.js:327-330`). iynk builds on the skill's free-camera core, so the originals' draw order tricks
(things drawn "last" because the view never turns) do not carry over. Section 3.2 lists the full difference.

---

## 1. core.js API reference

### 1.1 Loading model, units, coordinates

- `core.js` is a classic script. Every top-level `const`/`let` in it becomes a global lexical binding and every
  top-level `function` a global var binding. The figure's own `<script>` runs after it, in the same global scope.
- An `error` listener (`core.js:305`) appends each uncaught error message plus `;` to `<html data-errors="…">`.
  `?press=` problems are appended there too (`core.js:488`).
- **Axes**: `x` = depth (the front face sits at `x = W` and faces viewer-right at the default view), `y` = width
  (`+y` goes viewer-left), `z` = up, ground at `z = 0` (`core.js:24`, `SKILL.md:56-59`).
- **Scale**: model units are free; the skill suggests about 1 unit per cm, small objects modelled larger (60-100 units).
  At the default view one model unit along x, y or z projects to exactly 1.0 viewBox unit (`CAM_K·|R|`, checked
  numerically). The frame is fitted to `size` at mount and line weights follow `INK_K` (§1.8), so absolute units never
  show.
- **Angles**: degrees for `YAW`, `PITCH`, `setCam`, `camTo`, `arcUV`, `nearHalf`/`farHalf`, `setLight`; radians
  inside your own trig.
- **Colours**: `mix()` and `matOf()` parse `#rrggbb` only (`core.js:104-105`). `#abc`, `red` or `rgb()` produce
  `#NaNNaNNaN`.
- **Materials** are `{l, m, d}` objects (light, mid, dark tones). Functions that shade (`box`, `extrude`, `cyl`,
  `cylX`, `rod`, `board`, `tone`, `toneI`) take a material; `fill`, `face`, `shape`, `ink` take a colour string.

### 1.2 Palettes and materials (`core.js:10-23`, `:193`)

| Name | Value |
|---|---|
| `PALS.mustard` | `{ l:'#f4b829', m:'#d49c1f', d:'#4e4a18' }` |
| `PALS.tomato` | `{ l:'#ef6a4c', m:'#cf5038', d:'#4a2219' }` |
| `PALS.mint` | `{ l:'#93d3b0', m:'#71b693', d:'#1f4034' }` |
| `PALS.cobalt` | `{ l:'#76a0e2', m:'#5a82c6', d:'#1c2948' }` |
| `PALS.blush` | `{ l:'#f3a6bb', m:'#d8869c', d:'#4b2430' }` |
| `METAL` / `CLEAR` / `CERAMIC` / `DARK` | `{#eef0f0,#c6ccce,#8f989b}` / `{#e4f2f4,#c4dfe4,#97b9c0}` / `{#fbfaf3,#e3e0d2,#bdb8a6}` / `{#55504a,#3d3935,#272421}` |
| `INK` | `'#231e16'` (the only dark stroke colour) |
| `SHADOW` | `'#41538f'` (cast shadows; `build.py` treats this fill specially, pitfall 16) |
| `BOARD` / `WOOD` | `{#e6e1d4,#cfc8b8,#aaa293}` / `{#d9a86c,#bf8a4f,#8e6236}` |

`st.pal` must always be a `PALS` key: `ui.render` reads `PALS[st.pal].l` (`core.js:397`) and throws on anything else.
Keep custom body materials in your own state, not in `st.pal`.

### 1.3 Camera and projection (`core.js:24-53`)

| Global | Kind | Meaning, units | Ref |
|---|---|---|---|
| `C`, `S` | const | `cos 30°`, `sin 30°` (0.866, 0.5) | :25 |
| `OX`, `OY` | let | screen offset of the drawing (set by framing) | :26, :388 |
| `VIEW` | let | legacy 90° view index, reset to 0 at mount, unused | :32, :380 |
| `RC`, `RCZ` | let | rotation centre `[x, y]` (from `cfg.center` or `size/2`) and `z` (always `H/2`) | :32, :379 |
| `VIEW_NAMES`, `TURNS` | const | legacy, unused | :33-34 |
| `YAW0`, `PITCH0` | const | 45°, 35.264° (`atan(1/√2)`, true isometric) | :35 |
| `CAM_K` | const | `√1.5`; **not** in SKILL.md's reserved list but clashes (tested) | :35 |
| `YAW`, `PITCH` | let | current camera, degrees; readable any time | :36 |
| `CAM_R`, `CAM_U`, `CAM_V`, `CAM_D` | let | unit vectors: screen right, screen up, toward the viewer, screen down | :36 |
| `camBasis(yaw, pitch)` | fn | `{R:[sin t,−cos t,0], U:[−sin p cos t,−sin p sin t,cos p], V:[cos p cos t,cos p sin t,sin p]}` | :37-38 |
| `CAM_B0` | const | the basis at the default view | :39 |
| `CAM_LIM` | let | `null` = turns all the way; `60` = ±60° around `YAW0`; set at mount from `turn:'full'` or `?free=1` | :41, :372 |
| `setCam(yaw, pitch)` | fn | clamps then rebuilds the basis. Free: pitch 6..78°. Limited: yaw `[−15°, 105°]`, pitch 15..62°. Yaw is never wrapped | :42-43 |
| `camDot(a, b)` | fn | dot product | :45 |
| `rotV(n)` | fn | maps a world direction into the default view's frame, so "is this toward the viewer" stays `sum > 0` at every angle | :46 |
| `yawTurn([x, y])` | fn | turns a ground vector by `YAW − YAW0` (the shadow direction follows the yaw only) | :48 |
| `rotXY(x, y)` | fn | identity, kept for old callers | :49 |
| `P0(x, y, z)` | fn | raw isometric `[(x−y)C+OX, (x+y)S−z+OY]`, ignores the camera; only for 2D overlays tied to the default view | :50 |
| `P(x, y, z)` | fn | the projection: rotate about `RC/RCZ`, then `[CAM_K·q·R + …, CAM_K·q·D + …]`. Returns screen `[X, Y]` in viewBox units | :51-52 |
| `Dv(x, y, z)` | fn | screen delta of a 3D direction (text matrices, arrows) | :53 |
| `depthOf(p)` | fn | `p·CAM_V`: larger is nearer, draw smaller first | :55 |
| `ui.camTo(yaw, pitch, ms = 700)` | method | eased move, shortest way round in yaw, cancels a running `camTo` or drag. Not a global (it lives on `ui`) | :427-429 |

At the default view `P` equals the old isometric `P0` exactly (checked: `CAM_K·R = (0.866, −0.866, 0)`,
`CAM_K·D = (0.5, 0.5, −1)`).

### 1.4 Depth sorting (`core.js:56-67`)

| Global | Signature | Behaviour |
|---|---|---|
| `boxMid(b)` | `b = [[x0,y0,z0],[x1,y1,z1]]` | centre point |
| `sepOrder(p, q)` | items | if both have `box` and they are separated along x, y or z (touching counts, `1e-6`), the one on the viewer's side of that axis (sign of `CAM_V[k]`) sorts later; else 0 |
| `byDepth(parts)` | `[{at?, box?, svg}]` → string | drops falsy entries, sorts by `sepOrder`, ties by `depthOf` of `at` (or `boxMid(box)` when there is no `at`), joins `svg` |
| `nearHalf()`, `farHalf()` | → `[from, to]` degrees | the near and far half of a ring around a vertical axis (0° = +x, 90° = +y), for `arcUV` |
| `openShell(A, B, colour, contents = '')` | rings, colour **function** | far inner wall (`loft(…, true)`), then `contents`, then the near outer wall |

What the comparator does and does not do:

- The axes are tested in the order x, y, z and the first separating axis decides. Boxes that overlap on all three
  axes fall back to centre depth. The comparator is not transitive, so with three or more mutually overlapping items
  the result depends on input order (pitfall 3).
- `at`, if given, is used for the tie-break even when `box` is present. A wrong `at` mis-orders overlapping boxes.
- The camera never looks from below (pitch ≥ 6°), so "higher in z" always sorts later when z separates.
- A nested `byDepth` returns one string: its inside order is fixed relative to everything outside it (pitfall 4).

### 1.5 Paths, 2D profiles, planes (`core.js:68-80`)

| Global | Signature | Notes |
|---|---|---|
| `f(v)` | number → string | `toFixed(1)`: every coordinate is rounded to 0.1 viewBox unit |
| `pd(pts3, close = true)` | 3D points → path `d` | projects through `P`; `false` for an open line |
| `sp(pts2)` | screen points → closed `d` | for hulls of projected points |
| `arcUV(cu, cv, r, a0, a1, n = 7)` | degrees | `n + 1` points, both ends included |
| `rrUV(u0, v0, u1, v1, r, n = 7)` | rounded rect | `r ≤ 0` gives `rectUV`; starts bottom-right, counter-clockwise |
| `rectUV(u0, v0, u1, v1)` | 4 points | |
| `ellUV(cu, cv, ru, rv, n = 24)` | `n` points | no duplicated end point |
| `PX(x)`, `PY(y)`, `PZ(z)` | plane makers | `PX`: `(u,v) → (x,u,v)` with u = y, v = z (u runs viewer-left at the default view). `PY`: u = x, v = z. `PZ`: u = x, v = y |
| `on(plane, uv)` | | `uv.map(plane)` |

`toaster.html:30-35` shows a readable "u right, v down" frame on the front face: `FL(u, v) = [W + dx, D − u, H − v]`.

### 1.6 Vectors, visibility, light, tones (`core.js:83-106`)

| Global | Meaning |
|---|---|
| `sub`, `dot`, `cross`, `norm` (safe for zero length), `avg` | 3-vectors |
| `vis(n)` / `facing(n)` | true when the outward normal `n` points toward the viewer (`rotV(n)` sums to > 1e-6, which is `n·CAM_V > 0`) |
| `SHADOW_K = .85`, `SHADOW_LEN = .45` | light slope and the shorter drawn shadow length |
| `AZ_MIN = 20`, `AZ_MAX = 160` | unused |
| `L`, `SH` | sun direction (default-view frame) and its ground component |
| `setLight(deg)` | `SH = .85·(cos, sin)(deg)`, `L = norm(−SHx, −SHy, 1)`. Called once at mount with `st.az` (default 105, `core.js:368, :496`); changing `st.az` later does nothing unless you call it |
| `LIN = norm(.6, .2, 1)` | fixed light for interiors and props |
| `SOFT = .18`, `step3(d, hi, lo, m)` | three tones with smoothstep bands `±SOFT` around each threshold, so faces fade instead of snapping while turning |
| `tone(n, m)` | exterior: `d = rotV(n)·L`, light above `−.15`, dark below `−.45` |
| `toneI(n, m)` | interior and props: `d = rotV(n)·LIN`, light above `.6`, dark below `.05` |
| `mix(a, b, t)` | hex blend, `t` not clamped |
| `matOf(hex)` | `{l: hex, m: 16 % toward black, d: 42 % toward black}` |
| `ease(t)` | ease-in-out quadratic, not clamped |

With the default light (computed): `L = (0.168, −0.626, 0.762)`. Exterior tones at the default view: top light, front
(+x) light, left side (+y) dark, far right (−y) light, back (−x) between mid and light. The light is fixed relative to
the viewer, so after turning the same screen-side faces stay lit. The shadow moves `(−0.117, +0.435)` in world x, y per
unit of height, which on screen is `(−0.48, +0.16)`: down and to the left.

### 1.7 Drawing primitives (`core.js:108-214`). All return SVG strings.

| Global | Signature | Notes and gotchas |
|---|---|---|
| `ink(d, w = 1)` | path → stroke | `INK`, round joins and caps, no fill |
| `fill(d, c, extra = '')` | path → fill | `extra` is raw attribute text (`opacity=".3"`) |
| `face(d, c)` | path → fill + same-colour 0.7 stroke | hides hairline seams between loft strips |
| `shape(pts3, c, w = .9)` | 3D points | `fill` + `ink`; `w = 0` skips the ink |
| `line(pts3, w = .9)` | 3D points | open ink line |
| `loft(A, B, colour, flip = false)` | rings, **colour function** `n → fill` | quads between equal-length closed rings; normals point away from the centroid of all points; only quads facing the viewer are drawn (back-face culling); `flip` = seen from inside. Convex profiles only |
| `hull(pts2)` | screen points | monotone-chain convex hull |
| `hullInk(pts3, w = 1.4)` | 3D points | silhouette of the convex hull, weight `min(w, .9 + 20·thick)` where `thick = 2·area/perimeter ÷ frame width`. Thin rods stay about 1 to 1.5, big bodies reach `w` |
| `box(x0,y0,z0,x1,y1,z1, m, shade = toneI, w = .9)` | | 5 faces (no bottom; the camera is never below), each outlined. **Default shade is `toneI`**: pass `tone` for an outside body |
| `extrude(profileUV, x0, x1, m, shade = tone)` | | sides only; draw caps and ink yourself (`toaster.html:158-188`) |
| `cyl(x, y, z0, z1, r, m, shade = toneI, w = 1.2, n = 24)` | upright | sides, top cap (always), silhouette, cap ink |
| `cylX(x0, x1, y, z, r, m, shade = toneI, w = 1.1, n = 20)` | along x | cap on whichever end faces the viewer |
| `rod(a, b, r, m, shade = toneI, w = 1, r1 = r, n = 16)` | any axis | `r1` tapers it (cone, lamp shade); cap on the visible end |
| `txM(o, U, V)` | | text matrix; collapses to a zero matrix when the text would read mirrored or edge-on (the 2D cross product `U×V` is at most 0.02 × length(U) × length(V)) |
| `tx(x, y, z, str, size, col = INK, weight = 700)` | front plane `x = const` | reads toward −y, centred, baseline at `z`; shows only while +x faces the viewer |
| `txY(x, y, z, str, size, …)` | side plane `y = const` | reads toward +x; shows only while +y faces the viewer |
| `castShadow(pts3, z0 = 0, clip = null)` | | convex hull of the points pushed along the light by `(z − z0)·(SHADOW_LEN/SHADOW_K)·yawTurn(SH)` onto `z0`, filled `SHADOW`; `clip` = a 3D outline such as `boardTop(…)` |
| `boardTop(x0, y0, x1, y1, h = 3, r = 5)` | | top ring of a board |
| `board(x0, y0, x1, y1, h = 3, r = 5, m = BOARD)` | | slab: sides `toneI`, top `m.l`, ink 1, silhouette 1.8. Draw first, include it in `size` |
| `act(name, inner, data = '')` | | `<g data-act="name" …>`; `data` is raw attribute text (`data-id="U1"`) |
| `tag(p3, dx, dy, text, on = false)` | | label pill: leader from the projected point to an offset `(dx, dy)·INK_K`; class `tag` (+ `on`, accent fill), `data-n`, `data-t`. Width `text.length·fs·.62 + fs·1.5` with `fs = 8.6·INK_K`. On a phone (`LBL_U() > 0`) a numbered badge instead (font 10 px, 17 px tall) |
| `clipTo(pts3, inner)` | | `<clipPath id="kN">` from a projected outline + clipped group; ids restart at `k1` every render (`core.js:397`) |

Text on other faces needs its own reading direction: the toaster's back label uses `Dv(0, 1, 0)` (`toaster.html:31`);
top-of-board silkscreen in the originals uses `txTop` (`Dv(0,−1,0)`, `Dv(1,0,0)`, with a `flip` option) and `txTopX`
(`R/01-.js:63-68`). Text is inserted raw: escape `&`, `<`, `>` and quotes yourself.

### 1.8 Constant on-screen line weight (`core.js:216-222`)

- `INK_REF_VB = 585`, `INK_K = viewBox width / 585` (set at mount, `core.js:391`).
- `inkScale(svg)` runs on every render and multiplies every `stroke-width="N"` attribute by `INK_K`.
- Not rescaled: `style="stroke-width:…"`, single-quoted attributes, CSS, dash arrays, radii, font sizes. Use the
  `style=` form when you want a stroke in model units (`toaster.html:36` `mw()`, lamp cord `lamp.html:91`).

### 1.9 Page shell (`core.js:225-288`, `:310-345`)

- `CORE_CSS` (`:225-278`): paper `--paper:#f2efe7`, `--ink:#231e16`, `--muted:#857d6e`, `--rule:#ddd6c8`; body is a
  centred flex column with padding `24px 16px 32px` (phone `14px 12px 24px`); `#fig` is `width:100%; max-width:760px;
  height:auto; overflow:visible; touch-action:pan-y`; `#readout` and `.idea` are `display:none`; phone breakpoint
  `max-width:560px`.
- `filterFor(k)` (`:280-288`): the `#hand` filter. A warp noise (`baseFrequency .045/k`, 2 octaves, seed 4) drives
  `feDisplacementMap#wob` (scale `2.4·k`); a fine grain (`.9/k`, 3 octaves, seed 11) and a coarse blot (`.012/k`,
  2 octaves, seed 7) are multiplied in; the result is masked by the displaced drawing. Region −3 % to 106 % of the
  drawing's box.
- `bakeNoise(svg)` (`:310-345`): renders each coarse noise layer once into a PNG (`feImage`) so the browser stops
  recomputing it every frame. Fine grain stays live; layers over 1200² px are skipped; failures leave the live filter.
  The base64 PNG it writes is why a whole-DOM grep for `NaN` gives false positives (pitfall 25).

### 1.10 `mountFigure(cfg)` (`core.js:346-499`)

Options (the comment at `core.js:290-304` lists most of them):

| Option | Type | Default | Effect |
|---|---|---|---|
| `fig` | string | required | header "Fig. {fig} — {title}" |
| `title` | string | required | `document.title`, header, `aria-label` on `#fig` |
| `turn` | `'full'` | ±60° | `'full'` (or `?free=1`) removes the yaw limit |
| `size` | `[W, D, H]` | required | true bounding box, used once to frame the drawing |
| `center` | `[x, y]` | `[W/2, D/2]` | rotation centre in x, y (z is always `H/2`) |
| `palette` | `PALS` key | `'mustard'` | initial `st.pal` |
| `state` | object | `{}` | kept by reference; `pal` and `az: 105` are added |
| `scene` | `(st, m) => svg` | required | called on every render with `m = PALS[st.pal]` |
| `buttons` | array | none | left column (see below); without buttons there is no `#btns`, so no keypad either |
| `stats` | `st => [{label, value, small?}]` | none | big numbers top-right; a changed value gets a 0.35 s "bump" |
| `acts` | `{ name(st, el, ui) }` | none | handlers for `act(name, …)` groups, run on **pointerdown** |
| `params` | `(st, q)` | none | runs before framing and the first render, with `URLSearchParams` |
| `readout` | `st => text` | none | `#readout` (hidden by CSS) |
| `idea` | string | none | `.idea` paragraph "The big idea" (hidden by CSS) |
| `credit` | `false` | shown | removes the "Made with Colorfigures ↗" footer |
| `hint`, `buttonsLabel` | | | ignored by this core (the old core showed them, `R/00-core.js:275, :277`) |

Buttons: `{label, onClick(st, ui)}` or a picker `{label, choices: st => [{label, onClick(st, ui), current?, disabled?,
why?}]}`. Labels are written with `innerHTML` (escape them); a picker gets the caret "▾". Chips are rebuilt from
`choices(st)` each time the picker opens and use `textContent`. A press on a `current` chip flashes
"{label} — already set"; on a `disabled` one, `why` or "{label} isn't possible right now"; any click on the document
closes open pickers (`core.js:446-470`). Buttons are created once: there is no API to relabel or disable them later.

Framing (`core.js:376-393`): the 8 corners of `size` are projected at the default view. Desktop: the object fills
about 74 % of the width and 88 % of the height of a 4:3 view, nudged right by 6 % of the width (room for the buttons)
and high by 4 %. When `window.FIG_A()` returns something other than `.75` (build.py returns `1.1` on a phone), the
aspect becomes `min(FIG_A, max(.75, objectAspect·1.08))`, centred, with the spare height mostly below. The frame is
computed **once**; nothing re-frames on resize or rotation. Shadows and other angles may spill outside (the SVG has
`overflow: visible`).

The `ui` object it returns:

| Member | Behaviour |
|---|---|
| `ui.st` | the state object (also `window.__st`, `core.js:487`) |
| `ui.render()` | `_clipN = 0`, sets `--accent` to `PALS[st.pal].l`, `#art.innerHTML = inkScale(scene(st, m))`, readout, stats |
| `ui.animate(step)` | `step(dt)` with `dt` in **seconds**, clamped to `[0, 0.05]`; keep returning anything but `false` to continue. All running steps run, then one render per frame. Driven by `requestAnimationFrame` with a 60 ms `setTimeout` fallback (headless shots, hidden tabs) |
| `ui.invalidate()` | one redraw on the next frame (used while dragging) |
| `ui.flash(text, ms = 1600)` | notice on the figure (`#toast`), then hides and re-renders |
| `ui.camTo(yaw, pitch, ms = 700)` | eased camera move |
| `ui.drawStats()` | redraws the stats (called by `render`) |

Inputs it wires up:

- **Parts**: `pointerdown` inside `[data-act]` calls `cfg.acts[name](st, el, ui)` with `preventDefault`, then renders
  (`:423-424`). It reacts on press, not click, because the element is replaced on every frame. An `act` whose name has
  no handler does nothing but still blocks orbiting over it.
- **Orbit**: drag anywhere else; `k = 300 / svg width px`, yaw += dx·0.55·k, pitch += dy·0.35·k, pointer captured
  (`:430-435`). Dragging the full width of a 760 px figure turns 165°. Double-click (not on a part) eases back to the
  front view in 700 ms (`:436`).
- **Keys** on `window`: ArrowLeft/ArrowRight turn −15°/+15°, ArrowUp/ArrowDown pitch +8°/−8°, each a 260 ms `camTo`;
  ignored when `window.GAME_KEYS` is set or the target is an input or textarea (`:437-438`).
- **Controls row**: "Hand-drawn wobble" slider `#wb` 0-7 step 0.1, default 2.4 (sets `#wob` scale = value·`INK_K`);
  "Colour" swatches, one per `PALS` key (title = the key); "View": "Front view" (also stops the turntable) and
  "Turntable" (18°/s, bouncing at the limits when limited); "Labels" "On"/"Off", shown only if a `.tag` was drawn at
  the first render (and hidden again by `xrMount`).

URL parameters read by the core: `free=1` (`:372`), `pal=<key>` (`:373`), `yaw`, `pitch` (`:445`, clamped by
`setCam`), `labels=0` (`:483`; with `xrMount`, anything but `labels=1` hides labels), `xr=1` (`xrMount`), `press`.

### 1.11 `?press=` testing and `window.__st` (`core.js:484-495`)

- `?press=Label@ms,Label@ms` clicks, `ms` after mount, the first `.act` button whose trimmed text starts with `Label`
  (case-insensitive). `Label>Choice@ms` opens a picker and clicks the first chip starting with `Choice`.
- Unknown labels add `no button "X";`, unknown choices `no choice "Y" in "X";` to `data-errors` (tested).
- The See-through and Labels switches are `.act` too, so `?press=See-through@300,Labels@400` works (tested). The
  keypad's keys are not: `?press=DROP@3000` on the claw records `no button "DROP"` (tested).
- Labels containing `,`, `@` or `>` cannot be pressed; a short prefix hits the first match in DOM order.
- Disabled chips are clicked anyway (they only carry a CSS class), so the run shows their `why` notice: useful for
  out-of-order tests.
- `window.__st` is the live state object (the same object as `cfg.state`): read it in tests.

Figure-specific params from the examples: toaster `shade`, `pos`, `heat`, `bend`, `latch`, `brown`, `bread=0`
(`toaster.html:394-398`); lamp `on=1`, `pose`, `tilt` (`lamp.html:388-393`); claw `claw=x,y`, `play=1`, `time`,
`drop=1`, `bay=n`, `flap=1`, `chute=z`, `open`, `cz` (`claw.html:953-962`).

### 1.12 See-through kit (`core.js:501-588`)

| Global | Signature | What it draws |
|---|---|---|
| `xrCallouts(items, B)` | `items = [{at:[x,y,z], text, on}]`, `B = [x0, x1, y0, y1, z0, z1]` (note: not the `box` format) | pills in two columns either side of the projected bounds, each column sorted by screen y and pushed apart (`gap = height + 3·INK_K`), the left column starting below the buttons, leaders with an elbow `4·INK_K` before the pill; badges on a phone. Draw last, only when `k > .6` |
| `xrGhost(body, mech, k, OUTp, x0, x1, m)` | profile `OUTp` in (y, z), extruded from `x0` to `x1` | far inside walls at opacity `.5k` (inner tones mixed 55 % toward paper), `mech`, the case at `1 − .8k`, a silhouette at `.6k` (weight 2.8). Pass `mech = ''` and draw the parts after it, over the ghost (`toaster.html:203`) |
| `xrGhostRings(body, mech, k, A, B, m)` | bottom ring `A`, top ring `B` | same for a body lofted between two rings |
| `xrUnder(svg, mech, k)` | | mechanism at opacity `k`, then the whole drawing over it at `1 − .62k` (for objects without one case) |
| `xrWrap(sceneFn, opts)` | `opts = {getSt, mech(st,k), inside(st), surface?(st), B, under?, inline?}` | wraps a scene: `under` → `xrUnder`; otherwise, unless `inline`, the drawing at `1 − .5k` with `mech` over it at `k`; then callouts from `inside` when `k > .6`, else from `surface`. There is **no** `over` option (claw.html relies on one, Appendix E) |
| `xrMount(getUI, caption, opt = {})` | call after `mountFigure`; `opt.labelsOnly` | adds `.vset` with "See-through" (`#xrb`, unless `labelsOnly`) and "Labels" (`#lblb`), both `.act` with `aria-pressed`; hides the core Labels row; labels start hidden unless `?labels=1`; `st.xr`/`st.xrT` start at 0 (1 with `?xr=1`); See-through animates `st.xr` toward `st.xrT` at 1/0.7 per second; places `.vset` under `#stats`; wraps `ui.render` to update the caption `<p class="mcap">` (which build.py hides) |

The scene pattern (`SKILL.md:121-140`, `toaster.html:202-210`): `const k = ease(st.xr || 0)`; while `k > 0` ghost the
case and draw the working parts at opacity `k` over it; labels from `xrCallouts` when `k > .6`, otherwise `tag`s on the
surface parts.

### 1.13 `mountKeypad(spec)` (`core.js:590-641`)

`spec = { rows, hub: [col, row], action: 'DROP', keys: [{ key: 'ArrowLeft', glyph: '◀', name: 'Left', at: [col, row] }] }`
(`claw.html:969-971`). It appends an inked pad (role group, aria-label "Keypad") into `#btns`; keys are 34 px (44 px on
a phone), the round action button shows `action` above a small "SPACE". Each key sends `KeyboardEvent(type, {key,
bubbles:true})` on `window` (only `key`, `code` is empty), with pointer capture, Enter for a 120 ms press, space
blocked on focused buttons (capture phase), and keys lit while held. Set `window.GAME_KEYS = true` or the core's
arrow handler also turns the camera on the same synthetic events. build.py turns it into one slim row on a phone,
keys ordered ◀ ▲ ▼ ▶ and the hub hidden.

### 1.14 Reserved names (complete, from the source)

Top-level names in `core.js`:

```
PALS METAL CLEAR CERAMIC DARK INK SHADOW C S OX OY VIEW RC RCZ VIEW_NAMES TURNS YAW0 PITCH0 CAM_K YAW PITCH
CAM_R CAM_U CAM_V CAM_D camBasis CAM_B0 CAM_LIM setCam camDot rotV yawTurn rotXY P0 P Dv depthOf boxMid sepOrder
byDepth nearHalf farHalf openShell f pd sp arcUV rrUV rectUV ellUV PX PY PZ on sub dot cross norm avg vis facing
SHADOW_K AZ_MIN AZ_MAX SHADOW_LEN L SH setLight LIN SOFT step3 tone toneI mix matOf ease ink fill face shape line
loft hull hullInk box extrude cyl cylX rod txM tx txY castShadow BOARD WOOD boardTop board act _clipN tag clipTo
INK_REF_VB INK_K inkScale CORE_CSS filterFor bakeNoise mountFigure xrCallouts xrGhost xrGhostRings xrUnder xrWrap
xrMount mountKeypad
```

SKILL.md's list (`SKILL.md:161-166`) misses `CAM_K` and `_clipN` and includes `camTo`, which is not a global.
Also avoid: `window.__st`, `window.__ln` (label numbers), `FIG_A`, `LBL_U` (build.py), `GAME_KEYS`; element ids `fig art
fdefs hand wob btns stats toast readout wb pals vreset vspin lblctl lbl xrb lblb`; clip ids `k1…kN`; classes `stage
actions stepwrap act car chips chip current off stat k v bump tag on vset vrow mcap kpad dp hub go down sw ctl row
controls made-with toast show` and build.py's `zwrap zchip zm zp zi lgd`; `html.nolabels`, `html.zoomed`.

What a clash does (**tested** with a small figure):

| Figure declares | Result |
|---|---|
| `const S = 4`, `let tag`, `const CAM_K`, `let _clipN` | `SyntaxError: Identifier 'X' has already been declared`; the figure script never runs; blank page; the message is in `data-errors` |
| `function loft(){…}` (any core `function`: `setCam setLight loft hull box extrude cyl cylX rod board tag bakeNoise mountFigure xrCallouts xrGhost xrMount xrGhostRings xrWrap mountKeypad`) | **no error**: the figure's function silently replaces core's, for core too (the test cylinder lost its sides: 10 paths instead of 22) |
| a **local** `const on = …` in a function that also calls core's `on()` above it | `ReferenceError: Cannot access 'on' before initialization` (the baseline breadboard sheet, Appendix E) |

Rule: one global namespace per engine (`SL`), every figure file wrapped in an IIFE (as all original figure files
are), no short top-level names, no local names that shadow core helpers you call in the same function.

---

## 2. build.py, the page inside an iframe, and embedded mode

### 2.1 What `build.py` does (`build.py:16-24`)

It finds `<script src="core.js"></script>` (or `./core.js`), replaces it with the inlined skill `core.js` (always the
copy in the skill folder, `build.py:17`, never one next to your figure), inserts `HEAD` before `</head>` and `TAIL`
before the last `</body>`. Nothing else is inlined: any other `<script src>` stays an external reference (Appendix B
fixes that).

`HEAD` (`build.py:14`):

| Piece | Effect |
|---|---|
| `.mcap{display:none!important}` | see-through captions never show |
| phone `.stat .v{font-size:20px}` | smaller stat numbers |
| desktop `.vset{top:4px}` and `#stats{top:var(--vset-h,44px)}` | switches top-right, stats under them (`--vset-h` is never set, so 44 px) |
| phone `body > header{display:none}` | no "Fig. NN — Title" on a phone |
| `window.FIG_A = () => innerWidth <= 560 ? 1.1 : .75` | taller frame on a phone |
| `window.LBL_U = …` | drawing units per screen px on a phone (labels become numbered badges), 0 on desktop |

`TAIL` (`build.py:15`), in order:

| Piece | Effect |
|---|---|
| `@media (max-width:560px),(pointer:coarse){#art{filter:none!important}.ctl:has(#wb){display:none!important}}` | the hand-drawn filter is **off** on narrow or touch screens, always (the docstring says "a lighter filter while the figure moves", the code removes it) |
| phone keypad CSS + a script ordering keys ◀ ▲ ▼ ▶ | slim keypad row |
| `.vset` phone margin + placement script | the switches move after the zoom wrapper (after the keypad on a phone), or before `#stats` |
| `fit()` (desktop only, on load, resize and after 400 ms) | if the page is taller than the window, caps `#fig` `max-height` at `innerHeight − (everything else) − 12`, never below 320 px; the drawing then letterboxes |
| zoom | wraps `#fig` in `.zwrap` with a chip "−" / "100%" / "+" (aria "Zoom out", "Reset zoom", "Zoom in") bottom-right; 1× to 5×, ×1.5 per click; Ctrl/Cmd + wheel zooms at the pointer (a 50-unit notch is about ×1.35), plain wheel pans only while zoomed; two-finger pinch and pan on touch (the one-finger orbit waits); paper grain frequency is scaled with the zoom; `html.zoomed` stops page scrolling on desktop |
| toast restyle + script | the notice sits on the figure, centred at 6 % from the top, `#fff1bf` with a round "!" badge, first letter capitalised |
| solid shadows in see-through | every element with `fill="#41538f"` inside a translucent group is moved out, before its top-most translucent ancestor |
| phone label list `.lgd` | under the figure, two columns of numbered names (accent when `on`); tapping one highlights its badge; numbers are reset to 1..N (left column first, top to bottom) whenever the set of labels changes |

### 2.2 A built page inside an iframe (tested with the built toaster)

Measured with the page in an iframe on a dark host page (`iframe_probe.py`):

| Iframe size | What you get |
|---|---|
| 760 × 560 | header, buttons top-left, switches top-right, controls row, credit all visible; `fit()` capped the SVG box at 728 × 392 (drawing letterboxed to about 523 px wide); `INK_K .526`; filter on; nothing scrolls |
| 760 × 900 | SVG box 728 × 534 |
| 1000 × 520 | SVG box 760 × 352 (max-width 760 wins, then `fit()`) |
| 350 × 640 | the **phone** layout (the media queries see the iframe width, not the device): header hidden, buttons in a wrapping row, frame aspect 1.075 (viewBox 231.7 × 249.1), labels as badges with the list underneath, filter **off** even on a desktop browser |

Behaviour that matters for a host:

- **Keyboard focus**: arrow keys reach the figure only when the iframe's document has focus. Pressing ArrowLeft with
  the host focused left yaw at 45°; after one click on the figure it went to 30° (tested). The SVG is not focusable,
  so keyboard users cannot Tab into it unless you add `tabindex` (the bridge does).
- **Pointer capture works across the iframe edge**: a drag started on the figure kept turning it while the pointer
  left the iframe (yaw 136° inside, 202° after leaving) and ended on release outside (tested). Do not put host
  overlays on top of the iframe.
- **Touch**: `touch-action: pan-y` lets vertical swipes scroll (the iframe, then the parent), so on phones a turn
  starts with a horizontal move; two fingers zoom the figure, not the page.
- **Wheel**: inside the iframe the wheel scrolls the iframe document if it can, otherwise the parent page.
- **Layout and sizing**: `fit()` keeps the whole page inside the iframe on desktop by shrinking the SVG, so a short
  iframe gets a small drawing surrounded by chrome. The frame (viewBox) is fixed at mount, so resizing the iframe
  only rescales.
- **Credit footer** "Made with Colorfigures ↗" links to `https://april-zhu.com/colorfigures` in a new tab; `credit:
  false` removes it. The skill is MIT licensed: keep the licence and credit in the vendored copy and on an About page.
- **Errors** stay inside the iframe (`data-errors`); the host sees nothing unless the figure reports it.

### 2.3 Recommended embedded mode

Goal: inside iynk the figure is a drawing the lab controls. Keep the figure's own controls only where they help.

**URL contract.** Embedded mode is on inside any iframe (or with `?embed=1`; `?embed=0` forces it off):

| Param | Meaning |
|---|---|
| `embed=1` / `embed=0` | force embedded mode on or off |
| `bare=1` | also hide the figure's buttons, stats, switches and keypad (the host draws them) |
| `lang=xx` | initial language for every figure string (see Localisation) |
| `theme=dark` | dimmed paper for a dark host |
| `origin=https://…` | the host origin when the figure is served from another origin |
| figure params | `id`, `module`, `sheet`, the figure's own `params(st, q)` keys, `xr=1`, `labels=1`, `yaw`, `pitch` |

**Hide**: `body > header`, `.controls` (wobble, colour, view), `.made-with`, `.lgd` (the host renders the label list
from the `labels` event); with `bare=1` also `.actions`, `.vset`, `.stats`, `.kpad`. **Keep**: the zoom chip and the
toast (both sit on the figure).

**Size**: the SVG fills the iframe (`width:100%; height:100%`, `max-height:none !important` to beat `fit()`); the page
does not scroll. Give the iframe a definite box in the host: `aspect-ratio: 4 / 3` on desktop, about `10 / 11` on
phones, with a `max-height` around 80vh. Set `FIG_A` to the iframe's own shape before mount (the bridge uses
`clamp(innerHeight/innerWidth, .7501, 1.4)`: `.7501` forces the centred framing without the desktop nudge to the
right). The core never makes the frame wider than 4:3, so very wide iframes letterbox.

The CSS, as tested (`Appendix C`):

```css
html.cf-embed, html.cf-embed body { height: 100%; overflow: hidden; }
html.cf-embed body { padding: 0; display: block; }
html.cf-embed body > header, html.cf-embed .controls, html.cf-embed .made-with, html.cf-embed .lgd { display: none !important; }
html.cf-embed .stage { max-width: none; height: 100%; display: flex; flex-direction: column; }
html.cf-embed .zwrap { flex: 1 1 auto; min-height: 0; }
html.cf-embed #fig { max-width: none; width: 100%; height: 100% !important; max-height: none !important; margin: 0; }
html.cf-embed #fig:focus-visible { outline: 2px solid var(--ink); outline-offset: -3px; }
@media (min-width: 561px){ html.cf-embed .actions { left: 12px; top: 10px; } html.cf-embed .vset { right: 12px; top: 10px !important; }
  html.cf-embed #stats { right: 12px; } }
@media (max-width: 560px){ html.cf-embed .stage { padding: 8px 10px 0; } }
html.cf-bare .actions, html.cf-bare .vset, html.cf-bare .stats, html.cf-bare .kpad { display: none !important; }
html.cf-dark { --paper: #e4ddcf; --rule: #cbc2b1; --muted: #6a6357; }
```

**Messages.** Envelope `{ source: 'iynk', v: 1, type, … }` from host to figure and `{ source: 'iynk-figure',
v: 1, type, … }` back. Implemented and tested in `embed.js` (Appendix C):

| Host → figure | Payload | Does |
|---|---|---|
| `hello` | | figure answers `ready` (idempotent) |
| `press` | `id`, `choice?` | clicks a button by stable id (`id` defaults to a slug of the English label, e.g. `push-the-lever`); `choice` picks a picker chip by id |
| `act` | `name`, `data?` | runs `cfg.acts[name]` as if that part was pressed |
| `set` | `state` | passes the patch to the figure's `cfg.embed.accept(st, patch)`, which validates it; nothing else in the state can be written |
| `view` | `yaw`, `pitch?`, `ms?` | `ui.camTo` |
| `xr`, `labels` | `on` | flips the See-through or Labels switch if it differs |
| `pal` | `key` | palette, only `PALS` keys |
| `locale` | `lang`, `strings?` | swaps the dictionary, relabels buttons and switches, re-renders the drawing |
| `theme` | `mode` | `'dark'` dims the paper |
| `flash` | `text`, `ms?` | shows a notice |
| `query` | | figure answers `state` |

| Figure → host | Payload | When |
|---|---|---|
| `ready` | `fig`, `title`, `lang`, `buttons [{id, label, picker}]`, `acts` | at mount and after every `hello` |
| `part` | `act`, `id`, `data` (all `data-*`) | a part was pressed (pointerdown on `[data-act]`) |
| `button` | `id`, `choice?`, `by: 'user' \| 'host'` | a button, chip or switch was clicked |
| `state` | `state`, `changed` | after a render in which `cfg.embed.report(st)` changed (pins, power, phase…) |
| `labels` | `items [{n, text, on}]` | the visible labels changed (for a host-drawn label list) |
| `flash` | `text`, `en` | a notice was shown (mirror it into the lab log) |
| `focus` | `on` | the figure gained or lost keyboard focus |
| `error` | `message` | uncaught errors, unknown ids |

Tested results (`embed_probe.py`): `ready`, `state`, `labels` arrive on load; `press push-the-lever` produced `button
(by host)`, `flash`, `state phase:'toast'`; a real click on the lever part produced `part act:'lever'` and `state
phase:'pop'` then `'cool'`; `view 200/50` moved the camera to 200°/50°; `xr` + `labels` turned both on and the label
event listed the nine mechanism labels; `press nope` and `act ghost` returned `error`; `set {shade:0, pal:'nonsense'}`
only applied the shade; a message posted by the iframe to itself was ignored; `locale es` relabelled to "Elige el
tostado▾", "Baja la palanca", "Saca la tostada", "Por dentro", "Etiquetas"; a disabled picker choice flashed the
translated `why` text.

Rules that came out of the testing:

- **`report(st)` must return discrete values** (phase, power, pins, fault). The bridge posts on every change, so a
  value that moves every frame (the toaster's `brown`) posts 60 messages a second. Round or omit continuous values;
  the host can `query`.
- **Handshake**: the host posts `hello` on the iframe's `load` event and queues commands until it sees `ready`; the
  figure posts `ready` at mount and answers every `hello`. Never reset readiness in `onLoad`: under CPU throttling the
  figure's `ready` arrives **before** `load` (measured on the baseline pages: board.html at 12× throttle, `ready-msg`
  450 ms then `iframe-load` 454 ms; at 20×, 726 / 734 ms), and the baseline `FigureFrame` then drops every later
  patch (Appendix E).
- **Origins**: same-origin hosting (`public/figures/…` served by Next.js) posts with `location.origin` and checks
  `ev.source === window.parent` and `ev.origin`. Under `file://`, `location.origin` reports `"file://"` while the real
  origin is opaque (`null`), and a message aimed at `"file://"` is dropped with only a console warning, so file tests
  must use `'*'` (tested; the bridge does this).
- **No raw patches**: never `Object.assign(st, msg.patch)`. Every write goes through `accept`, which checks types,
  ranges and the current phase.
- **Sandbox**: the figure is first-party code. `sandbox="allow-scripts allow-same-origin"` gives no real isolation; a
  sandbox without `allow-same-origin` gives an opaque origin (targetOrigin must then be `'*'`). Prefer no sandbox plus
  strict message checks. Do not ship `X-Frame-Options: DENY` or a `frame-ancestors 'none'` CSP for `/figures/`.

**Localisation.**

- Every figure string goes through one function, `CF_T(englishText)`, which looks up `CF_STRINGS[lang]` (keys are the
  English source strings, so untranslated text still reads). The bridge translates button labels and chip labels
  itself; figures call `CF_T` for label pills, on-face text and `ui.flash` messages (the bridge also translates
  flashes that match a key).
- The host stays the single source of truth for translations (`src/lib/i18n.tsx`): it sends `locale {lang, strings}`
  after `ready` and on every language change. Pass `?lang=xx` as well so the first paint is not English.
- Give every button a stable `id` (`{id:'lever', label:'Push the lever'}`); `?press=` matches visible text, so test
  runs use English or the bridge's `press` by id.
- Core strings that cannot be translated without a patch: "— already set", "isn't possible right now", the controls
  row, the credit and the keypad's "SPACE". The first two appear in notices (translate them with a pattern in the
  bridge); the rest are hidden in embedded mode.
- **Pill widths assume Latin monospace** (`text.length·fs·.62`, `core.js:208, :513, :526`). Measured with core's own
  `tag()`: English "BIMETAL STRIP" text 37.6 in a 43.2 pill; German "BIMETALLSTREIFEN" 46.2 in 51.6; Chinese "双金属片"
  **19.1 in an 18.0 pill (overflows)**; Hindi "द्विधातु पट्टी" 21.4 in a 46.0 pill (twice too wide, because UTF-16
  length counts combining marks). Fix in iynk's vendored core: replace `text.length*fs*.62` with a measured width
  (`CanvasRenderingContext2D.measureText` in the same font, cached per string), three places.
- Write labels in capitals only for Latin, Greek and Cyrillic scripts; escape `& < > "` (they go into SVG text and the
  `data-t` attribute).

**Dark mode.** Keep the figure a paper plate in both themes: its colours, ink, cream label pills, the ghost tint
(hard-coded toward `#f2efe7` in `xrGhost`, `core.js:539`) and the blue shadow are designed for paper, and inverting
them breaks the look. In a dark host, frame the plate and dim the paper: `theme: 'dark'` (or `?theme=dark`) sets
`--paper:#e4ddcf`, `--rule:#cbc2b1`, `--muted:#6a6357` (tested: the body background became `rgb(228, 221, 207)`). Give
the iframe element the same background and `color-scheme: light` so there is no white flash and form controls stay
light. `prefers-color-scheme` inside the iframe follows the OS, not the host's toggle, so the host must send `theme`.

**Focus and keys.** The bridge adds `tabindex="0"` and a focus ring to `#fig` and reports `focus`. If the host wants
keys to work without a click, it can forward them by dispatching the same `KeyboardEvent` on the iframe's window (the
keypad already does this internally), or call `iframe.contentWindow.focus()` when the user starts using the lab.

**Hidden iframes.** A hidden or background iframe gets no animation frames and throttled timers. The core's 60 ms
timer fallback keeps animations stepping, slowly (`dt` is clamped to 50 ms, so time stretches); figure clocks based on
`performance.now()` (the toaster's) jump instead. Prefer `dt` from `animate`, and let the host send a pause if
needed.

---

## 3. Engine pattern

### 3.1 How the originals share one engine across many figures

Both labs are one HTML page holding many figures. `shell.html` is a list of classic scripts (16 for Robotics Bench,
19 for Drone Lab) run in order:

```
Robotics Bench:  00-core.js  01-.js (engine)  02..14 (one board each)  15: startBench();
Drone Lab:       00-core.js  01 shared pieces  02 oriented frames  03 lab engine  04 range + FPV  05..17 (one craft each)  18: startLab();
```

| Mechanism | Robotics Bench | Drone Lab |
|---|---|---|
| Registry | `BOARDS`, `defineBoard(d)` pushes and sorts by `fig` (`R/01-.js:597-598`) | `DRONES`, `defineDrone(d)` (`D/03-…:40-42`) |
| API documentation | header comment listing every field (`R/01-.js:14-31`) | header comment (`D/03-…:9-35`), range API (`D/04-.js:6-20`) |
| Figure file | IIFE calling `defineBoard({...})`; Fig 01 is "the reference board: copy its shape" (`R/02-…:2-3`) | IIFE calling `defineDrone({...})`; Fig 01 is "the template craft" (`D/05-…:2-3`) |
| Part drawings | `KINDS[name](r, z, p, c)` → SVG string; `r` footprint, `z` base, `p` part record, `c = {st, orient, lit, hot, pop, o}` (`R/01-.js:94-356`, about 30 kinds) | per craft `draw(F, add, opt)` with oriented frames `FR`, `obox`, `ocyl`, `odisc`, `otext` (`D/02-…:4-51`) |
| Things around the figure | `PERIPH.nano/battery/motor/servo/stepper/block/meter/screen/strip` return `{bb, svg, …anchors}` (`R/01-.js:361-462`) | range primitives `box/house/cyl/tree/pole/gate/flat/disc` (`D/04-.js:24-46`) |
| Global engine state | `B` (current board), `st`, `ui`, `G` (mat geometry), `PART` (`R/01-.js:57, :599`) | `DR`, `D`, `dui`, `BATTS`, `MOTORS`, `PROPS`, `FIXED`, `PARTS`, `MPOS` (`D/03-…:40, :77`) |
| Mount | `mountBoard(key)` resets globals, removes every `<style>`, calls `mountFigure`, then `shell()` (`R/01-.js:1031-1088`); `hashchange` remounts (`:1089`) | `mountDrone(key)` likewise (`D/03-…:638-706`, `:708`) |
| Animation | one `kick()`/`tick(dt)` loop guarded by `looping` and a generation counter `GEN` (`R/01-.js:757-791`) plus a 90 ms interval that renders while powered and emits serial lines once a second (`:792-797`) | `dkick()`/`dtick(dt)` with `DGEN` (`D/03-…:301-324`) |
| Build state | `st.placed[id] = {t, orient, sold, leave}`; `isIn/isSet/isSold` (`R/01-.js:600-602`); groups `g` 0 SMD, 1 low THT, 2 tall THT, 3 last; exploded lift `[6,12,18,24]` mm (`:603-606`) | `D.placed[id] = {t, orient}`; `after` prerequisites; explode layer `z`; `isOn/inPl` (`D/03-…:84-87`) |
| Programs / modes | `modes:{key:{title, code, bytes, instant, out(st,t), serial(k,st), fault(st)}}`; `out` returns `o` with `o.leds` and anything the board needs (`R/01-.js:24-31, :607-617`) | `modes` (alt, angle, acro, race, + range) with CLI text (`D/03-…:427-449`) |
| Faults | derived from data: `polar:true` parts placed with orient 1 → `pop` (electrolytic), `dark` (LED) or `hot` (anything else) (`R/01-.js:801-811`) | `orient('FC')`, `orient('PROPS')`, `orient('XT60')`, untested motor direction, KV × cells too high (`D/03-…:173-175`, `:403`) |
| Lesson shell | `shell()` builds the left nav (grouped by month), "Meet the board", "Selected part", "Parts on this board", code, "Serial monitor", "Check yourself" quiz, "Practice task" (`R/01-.js:946-1028`) | `dshell()` adds "Design it" (selects + calculator), wiring sheet, controls, CLI, log, quiz (`D/03-…:541-635`) |
| Sound | all synthesised (lofi loop + named `sfx`) (`R/01-.js:464-567`, `D/01-…:66-166`) | same, plus a motor hum (`D/03-…:288-298`) |
| Tracking | beacons to `/api/track` (`R/01-.js:569-592`) | same (`D/01-…:168-191`) |

The full field-by-field catalogues, messages, timings and sounds are in `robotics-bench-a.md` §2 and `drone-lab-a.md`
§2-§7.

**What this pattern does well (keep it)**

- A figure is mostly data: parts with footprints, kinds, build groups, polarity and text, plus a few small hooks
  (`out`, `serial`, `periph`, `wires`, `after`, `signals`, `stats`, `working`). Fig 01 Uno is 144 lines including code,
  quiz and lesson text (`R/02-…`); a module figure is 160 (`R/06-…`).
- Shared part drawings (`KINDS`) give every board the same look and fix bugs once.
- The real build order is generic: group rules and `after` prerequisites, each refusal a teaching sentence
  (`R/01-.js:839-846`, `D/03-…:364-378`).
- Faults come from data (`polar`, `fault`, `faultMsg`), not per-board code.
- Programs are functions of time (`out(st, t)`) plus a once-a-second serial generator: deterministic and
  screenshot-friendly.
- One state object, one loop, a generation counter to kill stale loops.
- Test hooks as URL params (`bare=1`, `ex=1`, `flip=…`, `sel=…`, `mode=…`, `usb=0`; drone `fly`, `fpv`, `pose`,
  `auto`).
- A template figure to copy.

**What to change for iynk**

| Original | Problem | iynk |
|---|---|---|
| Old 90° core | draw order "wires last", centre-only sorting and fixed-side text only work at the front view | free-camera core; every item boxed; wires in short boxed pieces |
| Globals `B`, `st`, `ui`, `G`, `bx`, `by`, `PART`, `DR`, `D`… | collision risk with core and between files | one namespace `SL`; figure files are IIFEs |
| Remount on `hashchange` in one document | with the skill core, each `mountFigure` adds another `window` keydown and `document` click listener and keeps its old frame driver; after N remounts one arrow key starts N camera animations, N − 1 of them rendering into detached elements | one figure per document; switching boards changes the iframe `src` |
| `sortItems` (`R/01-.js:624-636`) | O(n³) worst case, every frame | `byDepth` with tight boxes, layers, cut insertion |
| 90 ms global interval rendering while powered | renders even when nothing changes | render from `animate` only while something moves; serial from the run clock |
| Lesson HTML built inside the figure | not translatable, not accessible, duplicates the host | lessons, quiz, code and logs live in the Next.js host; the figure reports events |
| `Object.assign` patches (baseline) | any key can be overwritten | `accept(st, patch)` validators |
| Tracking beacons | privacy, noise | drop |
| Text interpolated raw into HTML and SVG | breaks with `&`, `<`, quotes and translations | escape at the edge |

### 3.2 The originals' core versus the skill core (for porting code)

| Feature | `R/00-core.js` / `D/00-core.js` | skill `core.js` |
|---|---|---|
| Camera | `VIEW` 0-3 in 90° steps, `rotV` permutes axes (`R/00-core.js:28-40`) | free yaw/pitch camera, drag, keys, double-click, turntable |
| `byDepth` | centre point only (`:42`) | `box` separation first |
| Shading | hard thresholds (`:71-72`) | smoothstep bands (`SOFT`) |
| `txM` | no mirror test (`:146`) | hides mirrored or edge-on text |
| `tag` | pill only (`:173-179`) | pill or numbered badge, `data-n`/`data-t` |
| Header | shows `hint`; buttons get a caption from `buttonsLabel`, default "Try it" (`:275, :277`) | neither |
| Controls row | wobble, colour, labels (`:284-288`) | + "View": "Front view", "Turntable" |
| `ui.animate` | a separate 16 ms `setTimeout` loop and render per call (`:327-330`) | one shared frame driver, one render per frame; `invalidate`, `camTo` |
| Framing | fixed 4:3; `D/00-core.js:305-309` adds `cfg.frame {fill, left}` | `FIG_A` hook; no `frame` option |
| Extras | none | see-through kit, `mountKeypad`, `bakeNoise` |

### 3.3 iynk architecture shared by both engines

**File layout** (all under `figures/`; the built pages go to `public/figures/`):

```
figures/
  vendor/colorfigures/        core.js + build.py copied from the skill, VERSION (skill date + sha256), LICENSE, PATCHES.md
  tools/cfbuild.py            builder: inlines every local <script src>, adds build.py's HEAD/TAIL (Appendix B)
  tools/cfshoot.py            verification suite (Appendix A)
  lib/embed.js                embed bridge: embedded CSS, postMessage, CF_T (Appendix C)
  lib/sl.js                   the SL namespace: materials, txTop, tube/jumper, wireParts, boxOf, FR frames,
                              byDepthIn(V), layers(), say(), sfx() (synthesised sounds), clock helpers
  engines/bench/bench.js      Board Bench: state machine, build flow, faults, scene assembly, see-through, sheets
  engines/bench/kinds/*.js    part drawings (smd.js, tht.js, connectors.js, modules.js), each registers SL.bench.kind(...)
  engines/bench/periph.js     things on the mat (Nano, battery, motors, servo, stepper, meter, screen, line strip)
  engines/bench/breadboard.js breadboard grid, rails, component placement on holes, jumpers, connectivity
  engines/drone/drone.js      Drone engine: parts, build steps, tests, faults, scene, wiring data
  engines/drone/frames.js     parametric frames (x, stretch-x, h, plus, tri, hex, octo, whoop, wing)
  engines/drone/pieces.js     motors, props, stack boards, battery, XT60 + capacitor, camera, VTX, RX, GPS
  data/boards/<id>.json       pure data shared with the host: parts (ids, names), pins, nets, modes list, i18n keys
  data/drones/<id>.json
  boards/<id>.js              per board: drawing details, modes' out()/serial(), custom faults
  drones/<id>.js
  pages/board-<id>.html       a shell like the originals': the script list for one figure page
  pages/drone-<id>.html
```

**Build**: `python3 -I figures/tools/cfbuild.py figures/pages/board-uno-r3.html public/figures/board-uno-r3.html` per
page (a 10-line loop over `figures/pages/*.html`). Script order in every page: `core.js`, `lib/embed.js` (it must wrap
`mountFigure` before anything calls it), `lib/sl.js`, the engine files, the figure file, then one line that starts it.
`cfbuild.py` refuses inlined code containing `</script` and fails on a missing file.

**One page per board** rather than one page with every board: smaller pages (about 150 kB: core 56 kB, build extras
14 kB, engine 60-80 kB, board 10-15 kB), no remounting, a broken board cannot break the others, and the host switches
boards by changing `src`. Bust caches with `?v=<build hash>`.

**One source of truth**: part ids, pin names, nets and the list of modes live in `data/*.json`, which the host imports
for lessons, schematic, sketch runner and translations, and the builder inlines into the page (as
`SL.data = {...}`). Prose (`what`, overview, quiz, practice) lives only in the host.

**Actions are functions of the state**: `SL.bench.actions.place(st, id, orient)` and friends are the only way the state
changes. Buttons, `acts`, keys and bridge commands all call them, and they all speak through one `say(msg, ms, sfx)`.

**Sorting at every angle**: every item has a tight box; long things are cut into pieces (wires every 3-7 units like
`lamp.html:227-237` and `claw.html:766-776`); parts that rest on a base are sorted in layers when the camera always
looks down (`lamp.html:343-345`); a big block that every small item lies wholly to one side of is inserted after the
last item behind it (`claw.html:244-251`). For an assembly turned by a rotation `R` (a tilted drone, a turned
module), sort its local boxes with the camera direction in local coordinates, `V_local = Rᵀ·CAM_V`: separation along
a local axis is a separating plane, so the test stays exact where axis-aligned boxes of rotated parts would overlap.

```js
// SL.byDepthIn(V, items): byDepth for boxes in a local frame whose viewer direction is V (= transpose(R) * CAM_V)
SL.byDepthIn = (V, items) => items.filter(Boolean).sort((p, q) => {
  for (let k = 0; k < 3; k++){
    if (p.box[1][k] <= q.box[0][k] + 1e-6) return V[k] >= 0 ? -1 : 1;
    if (q.box[1][k] <= p.box[0][k] + 1e-6) return V[k] >= 0 ? 1 : -1;
  }
  const m = b => [0, 1, 2].map(k => (b[0][k] + b[1][k]) / 2), d = b => m(b).reduce((s, v, k) => s + v * V[k], 0);
  return d(p.box) - d(q.box);
}).map(p => p.svg).join('');
```

### 3.4 Board Bench engine (boards, modules, breadboard, build flow, faults, see-through, sheets)

**Public API** (namespace `SL.bench`):

```js
SL.bench.kind(name, { draw(ctx), xr?(ctx), pins?(part) })   // register a part drawing
SL.bench.periph(name, fn)                                   // register a thing on the mat
SL.bench.component(name, { legs, draw(ctx) })               // breadboard component (resistor, LED, button, pot, servo...)
SL.bench.fault(kind, { check?(st), apply?(st, o), draw?(ctx), msg, fix })
SL.bench.defineBoard(def)                                   // board files call this once
SL.bench.start(id)                                          // mounts the figure (called by the page's last script)
SL.bench.actions                                            // strip, pickAndPlace, place, solder, plug, unplug, upload,
                                                            // explode, select, sheet, setPins, pressInput, setFault
```

`ctx` for a kind: `{ r:{x0,x1,y0,y1}, z, p, st, o, orient, lit, hot, pop, k (see-through ease), put(box, svg), T }`.
A kind may `put` several boxed items (a header's plastic and its pins, a DIP body and its legs) instead of returning
one string, so it sorts correctly against neighbours from every side.

**Board definition** (data from `data/boards/<id>.json`, merged with the behaviour in `boards/<id>.js`):

| Field | Type | Notes |
|---|---|---|
| `id`, `fig`, `name`, `sub` | strings | `name`/`sub` are English source strings for `CF_T` |
| `pcb` | `{w, d, r, pal, thick, standoff, mat:{back, front, right, left}}` | mm; mat margins as `R/02-…:17` |
| `holes`, `silk`, `copper` | `[[u,v]]`, `[[u,v,text,size,flip]]`, `{deco:[...], nets:{up, pwr, …}}` | `u` from the left edge, `v` from the front edge, as the originals (`R/01-.js:8-12`) |
| `pins` | `{ D13:{at:[u,v], net:'D13'}, … }` | headers and castellations: anchors for jumpers, breadboard legs, schematic |
| `nets` | `{ D13:['U1.17','H1.6','LL.A'], GND:[…] }` | connectivity, shared with the host's schematic |
| `parts` | `[{id, kind, group:'smd'\|'low'\|'tall'\|'last', uv:[u0,v0,u1,v1], h, polar?:{options:[ok, wrong], fault}, short, …kind params}]` | `group` replaces the numeric `g` 0-3 |
| `power` | `{inputs:{usb:{part:'J1', plug:'b'\|'c'\|'micro'}, jack:{part:'J2', volts:[7,12]}}, needs:[…], run:[…], upload:[…]}` | as `power/needs/run/uploadNeeds` (`R/02-…:81`) |
| `modes` | `{key:{title, bytes, instant?, out(st,t) → {pins, leds, …}, serial?(k, st)}}` | sketch text lives in the host; the host's sketch runner can drive pins instead (`set {pins}`) |
| `faults` | `['reverse-barrel', 'brownout', 'cold:LL', …]` | opt-in to engine faults, plus custom ones |
| `xr` | `{parts:[…], extras(ctx)}` | see-through recipe: die and bond wires, crystal can, USB bridge, polyfuse |
| `tags` | `[[id, [fx, fy, fz], dx, dy]]` | surface labels: anchor as a fraction of the footprint and height, screen offset (`R/02-…:131`) |
| `modules` | `['tb6612', …]` | modules that may sit on the mat beside it |
| `report(st)`, `accept(st, patch)` | | embed traffic: discrete values only |

**Build flow** (keeps the originals' order and teaching messages, `R/01-.js:825-899`; full catalogue in
`robotics-bench-a.md` §2.7-2.9):

```
 BARE ──Pick & place SMD──▶ parts drop in, 0.22 s apart ──all SMD set──▶ reflow 1.3 s ──▶ SMD SOLDERED
   │ (board without SMD parts skips this)                                                     │
   ▼                                                                                           ▼
 Place a part: low THT first ──▶ tall THT ──Solder joints (iron visits each joint)──▶ THT SOLDERED
                                                                                               │
                                      Place a part: 'last' group (chip into socket, module) ──▶ ASSEMBLED
 Plug USB / power ──▶ evaluate: supply part unsoldered or a `needs` part missing ──▶ "No power: …"
                                polar part reversed ─────────────────────────────▶ FAULT pop | hot | dark
                                a `run` part missing ────────────────────────────▶ POWERED, nothing runs
                                otherwise ───────────────────────────────────────▶ RUNNING (default mode)
 Upload sketch ──▶ UPLOADING 2.2 s ──▶ RUNNING new mode   ('instant' modes switch at once)
 Exploded view: unplugs, lifts each group (6 / 12 / 18 / 24 mm).   Strip to bare PCB: tall parts leave first.
```

Refusals to keep verbatim (`R/01-.js:799, :828, :842-844`): "Unplug the power first: never work on a live board",
"Close the exploded view first", "SMD parts first: run pick and place + reflow. The oven would melt plastic parts",
"Low parts first: with tall parts on, the board rocks and loose parts fall out when you flip it to solder", "Solder
everything first. Never heat a chip sitting in its socket" / "Solder everything first: this part goes on last".

**Faults** (engine registry; the first three come from the original, the rest from the iynk brief in `README.md`):

| Kind | Trigger | Shows | Fix |
|---|---|---|---|
| `pop` | electrolytic placed reversed, powered | vented top, smoke, "pop" + "sizzle"; stops | unplug, flip |
| `hot` | IC or regulator reversed | pulsing red tint, smoke, "buzz" + "sizzle"; stops | unplug, turn round |
| `dark` | LED reversed | runs, LED stays dark, "error" | unplug, flip |
| `reverse-barrel` | jack polarity wrong (host or button) | polyfuse or protection open, no power | swap |
| `brownout` | motor or servo on the 5 V pin | resets: the setup banner repeats, ON LED dips | separate supply |
| `cold:<part>` | a cold joint on a part or pin | intermittent signal (flicker, noisy reads) | reflow the joint |
| `short` | solder bridge or wiring short | current limit, smoke stopper lamp | find and clear |

Each fault: `check(st)` or a host trigger, `apply(st, o)` to bend the outputs, `draw(ctx)` for its visual, a message
and its fix, so the lesson can explain it.

**See-through**: per kind an `xr(ctx)` drawing (die with bond wires inside a QFP/DIP, the crystal can's quartz blank,
the USB bridge, the polyfuse), drawn with `xrUnder` over a ghosted board, plus `xrCallouts` labels that light while
that part works (the baseline already draws "DIE", "CRYSTAL", "REGULATOR"/"3V3 REG", the USB bridge and "POLYFUSE",
`figures/src/board.html:640-646`).

**Sheets**: `st.sheet = 'board' | 'breadboard' | 'schematic'`.

- `board`: the iso PCB on its mat.
- `breadboard`: a real iso scene (Colorfigures is good at this): a breadboard on the mat, the board or module in its
  strips, components on named holes (`'e12'`), jumpers from pins to holes. The engine derives connectivity from the
  strips (5-hole columns, the rails), so it can check what is actually wired (LED polarity, a missing resistor, a short
  between rails) and feed faults.
- `schematic`: 2D and text-heavy, so render it in the host (React SVG) from `nets` and `pins`; the figure can highlight
  the hovered net on the board (`set {highlightNet}`). If it must live in the figure, draw it in viewBox units without
  `P()` and stop orbiting while it shows with a capture-phase `pointerdown` listener on `.stage` that calls
  `stopPropagation()` (the core's own listener is on `#fig`).

**Adding a board in about 200-400 lines** (`boards/pico.js`, plus its JSON). The line budget:

| Section | Lines |
|---|---|
| header: how the real board works, parts list grouped (truth first, `SKILL.md:38-54`) | 25-40 |
| data in JSON: `pcb`, `holes`, `silk`, `copper`, `pins`, `nets`, parts with footprints | 60-120 |
| modes: `out(st, t)` and `serial(k)` per program | 30-60 |
| board-specific drawing (a kind the library lacks, see-through extras) | 30-100 |
| `tags`, `report`, `accept`, faults opted in | 15-30 |

Skeleton (positions are placeholders to be measured from the datasheet drawing; the facts in the comment are the
public Pico specs):

```js
/* Raspberry Pi Pico: RP2040 (QFN-56, 7 x 7 mm), 2 MB QSPI flash, 12 MHz crystal, buck-boost to 3.3 V, LED on GP25,
   BOOTSEL button, micro-USB, 40 pins at 2.54 mm on a 51 x 21 mm board.
   Power: VBUS 5 V -> VSYS -> buck-boost -> 3V3. Upload: hold BOOTSEL, plug USB, it mounts as a drive. */
(() => {
const D = SL.data.boards.pico, T = CF_T;
const led = (st, t) => st.mode === 'blink' ? t % 1 < .5 : st.mode === 'pwm' ? (t % 2) / 2 : 0;
SL.bench.defineBoard({ ...D,
  modes: {
    blink: { title: 'Blink', bytes: 2048, out: (st, t) => ({ pins: { GP25: led(st, t) ? 1 : 0 }, leds: { LED: led(st, t) > .5 } }) },
    pwm:   { title: 'Fade on GP25', bytes: 2304, out: (st, t) => ({ pins: { GP25: led(st, t) }, bright: { LED: led(st, t) } }) },
    hello: { title: 'Serial hello', bytes: 4096, out: () => ({ pins: {} }), serial: k => 'hello from the Pico #' + k },
  },
  faults: ['brownout', 'cold:LED'],
  xr: { parts: ['U1', 'U2', 'Y1'], extras: ctx => SL.bench.xrBondWires(ctx, 'U1', 14) },
  tags: [['U1', [0, 0, 1], 30, -40], ['J1', [0, -1, .5], -40, -10], ['SW1', [0, 0, 1], 24, -30]],
  report: st => ({ power: st.power, running: st.running, mode: st.mode, fault: st.fault && st.fault.kind, GP25: st.pins.GP25 | 0 }),
  accept: (st, p) => { if (p.pins && typeof p.pins === 'object') SL.bench.actions.setPins(st, p.pins); },
});
})();
```

### 3.5 Drone engine (frame, arms, motors, props, stack, battery, build steps, wiring sheet, safety tests)

**Public API** (namespace `SL.drone`):

```js
SL.drone.frame(spec)      // spec -> { mpos:[[x, y, 'M1', 'CW'], …], arms:[…boxes], plates:[…], stack:{x, y, size} }
SL.drone.piece(name, fn)  // register a drawing: motor, prop, stack board, battery, xt60, camera, vtx, rx, gps…
SL.drone.defineCraft(def)
SL.drone.start(id)
SL.drone.actions          // strip, addPart, buildAll, smokeTest, motorTest, calibrate, plug, explode, select
```

**Craft definition**:

| Field | Notes |
|---|---|
| `id`, `fig`, `name`, `sub`, `noun`, `palette` | as `defineDrone` (`D/03-…:10-35`) |
| `frame` | `{layout:'x'\|'stretch-x'\|'h'\|'plus'\|'tri'\|'hex'\|'octo'\|'whoop'\|'wing', wheelbase (mm, motor to motor diagonal), arm:{w, t, from, to}, plate:{w, d, t}, top:{w, d, t, standoff}, stack:30.5\|25.5\|20\|16}` |
| `motors`, `props` | positions from the frame (or explicit `mpos`); size codes: "2306" is a 23 mm × 6 mm stator; "5x4.3x3" is 5 in diameter, 4.3 in pitch, 3 blades |
| `catalogue`, `design` | `batts`, `motors`, `props`, `fixed`, default picks (`D/05-…:4-23, :43`) |
| `calc(design)?`, `warnings(design, c)?` | override the generic calculator (below) |
| `parts` | `[{id, short, z (explode layer), after, polar?:{options:[ok, wrong]}}]`; keep the engine's ids `FRAME MOTORS ESC WIRES FC XT60 CAM RX VTX TOP BATT PROPS` (the tests and faults key off them, `D/03-…:17-19`) |
| `tests` | `{smoke:{needs:['XT60','ESC']}, motors:{needs:['WIRES','FC'], wrong:2}, calibrate:{needs:['FC']}}` |
| `draw` | per-part overrides; defaults from `pieces.js` |
| `wiring` | `{nodes, edges, legend}` data, rendered by the host |
| `report`, `accept` | embed traffic |

Motor order and spin for a quad X, Betaflight "props in" (`D/05-…:38`, `+x` = nose, `+y` = left): M1 rear-right CW,
M2 front-right CCW, M3 rear-left CCW, M4 front-left CW.

**Build steps and safety tests** (`D/03-…:364-426`, full rules and messages in `drone-lab-a.md` §4): each part goes on
only after its `after` parts; the battery cannot be worked on live ("Unplug the battery first: never work on a live
quad"); props go on last, only after the smoke stopper test and the motor direction check ("Props go on LAST: run the
smoke stopper test and the motor direction check first"); the smoke stopper (2.2 s) catches a reversed XT60 capacitor;
the motor check spins each motor 1.2 s with props off and fixes the wrong one in software; accelerometer calibration
unlocks arming. Faults: FC arrow backwards or props swapped flip the craft on take-off; a reversed capacitor pops on
the first plug without a smoke test; KV × cells above `maxKvCells` overheats and desyncs.

**Generic calculator** (`D/03-…:43-58`):

```
V        = cells × 3.7
krpm     = kv × V / 1000
thrust   = kThrust × prop.pf × krpm²                       grams per motor at full throttle (kThrust default 1.06)
auw      = Σ fixed grams + n × (motor g + prop g) + battery g
T:W      = n × thrust / auw
hoverW   = auw / (gPerW × prop.eff)                         gPerW default 5.4 g per W
hoverA   = hoverW / V
hoverMin = (mAh / 1000 × 0.8) / hoverA × 60      flyMin = hoverMin × 0.42
maxA     = n × thrust / (2.0 × prop.eff) / V
over     = kv × cells > maxKvCells (default 1750 × 6 × 1.15 = 12075)      weak = T:W < minTW (default 5)
hoverThr = √(auw / (n × thrust))
cost     = Σ fixed by category + n × motor price + battery price (Electrical); prop price × ceil(n/2) (Mechanical)
```

Worked example, Fig 01 defaults (6S 1100 mAh 178 g, 2306 1750KV 32 g, 5x4.3x3 pf 1.00 eff 1.00 4.4 g, fixed parts
190 g): V 22.2, krpm 38.85, thrust 1600 g per motor, auw 513.6 g, T:W 12.46, hover throttle 28 %, hover 95.1 W and
4.28 A, hover time 12.3 min, freestyle time 5.2 min, max current 144 A, not over-spun (10500 < 12075), not weak.

**Wiring sheet**: the original draws it as a separate SVG under the figure (`D/03-…:463-477`): a 760 × 340 canvas,
blocks 150 × 56 (radius 10) with an 8 px colour strip, title 12.5 px weight 800, subtitle 10.5 px, clickable to select
the part; legend at y 330: `#e2483d` "power", `#43a35a` "data / signal", `#f2c230` "video", `#f08a2b` "motor phases".
In iynk render it in the host from `wiring` data (it is a diagram, not an object) and keep selection in sync with
the figure through `part` events and `set {sel}`.

**Flight**: keep the simulator outside the Colorfigures page (the baseline already has `src/components/FlightSim.tsx`).
The original drives the iso figure as a moving world map by rewriting `OX`, `OY`, `INK_K` and the viewBox every frame
(`D/03-…:246-254`), rebuilding the filter when the zoom changes (`:243-244`) and pinning the filter region because
WebKit silently skips a filter over a huge region (`:238-242`); the core's camera, framing and filter are built for one
object, so this fights the engine. Physics and range details: `drone-lab-a.md` §7.

---

## 4. Verification recipe (tested on this machine)

### 4.1 What works here

| Tool | Result |
|---|---|
| Python Playwright 1.58, `p.chromium.launch()` | uses cache revision 1208 (Chrome for Testing 145.0.7632.6); works, and its paused fake clock (`page.clock`) makes timing deterministic |
| `~/Library/Caches/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-mac-arm64/chrome-headless-shell` (156.0.8078.4; the `ls … \| tail -1` in §4.4 picks it) | the SKILL's CLI recipe works: `--screenshot --virtual-time-budget=3000` in 1.0 s; the §4.4 loop ran verbatim (7 shots at 1800 × 1600 in 4.7 s); `--dump-dom` works |
| `…/chromium-1248/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing` (156) | `--headless=new --screenshot` in 1.5 s |
| Brave 1.97 (`/Applications/Brave Browser.app`) | `--headless=new` and `--headless=old` with `--screenshot` both hung; killed at 40 s. Do not use |
| Google Chrome | not installed |
| `timeout` command | not on macOS; use Python `subprocess.run(…, timeout=40)` |

Run Python with `-I` and keep scripts outside the folders they read.

### 4.2 Build

```bash
# a figure that loads only core.js:
python3 ~/.claude/skills/colorfigures/scripts/build.py figures/src/board.html public/figures/board.html
# a figure page with several local scripts (engine, bridge, board file):
python3 -I figures/tools/cfbuild.py figures/pages/board-uno-r3.html public/figures/board-uno-r3.html
python3 -I figures/tools/cfbuild.py SRC.html OUT.html --check   # also proves identical output to build.py for core-only pages
```

Tested: `cfbuild.py --check` on `toaster.html` printed `check: same as build.py` and the output was byte-identical to
`build.py`'s.

### 4.3 The full suite: `cfshoot.py` (Appendix A)

```bash
SP=/private/tmp/claude-501/-Users-amar-Codes-ak-simlab/327c458a-8849-435d-a3e9-20eb9855a68f/scratchpad
python3 ~/.claude/skills/colorfigures/scripts/build.py ~/.claude/skills/colorfigures/assets/examples/toaster.html $SP/cf-test/toaster.html
python3 -I cfshoot.py $SP/cf-test/toaster.html $SP/shots/colorfigures-guide/toaster \
  --press "Choose shade>dark@300,Push the lever@600,Choose shade>light@1500" --at 1700,5200,7000
```

Every shot runs in a fresh browser context with the fake clock installed and paused before navigation, so nothing
moves until `clock.run_for(budget)`; then 350 ms of real time for CSS transitions. It shoots:

| Set | URL added | Files |
|---|---|---|
| 7 angles, closed | `free=1&yaw=45`, `110`, `170`, `230`, `300`, `yaw=20&pitch=62`, `yaw=200&pitch=70` | `angle-*.png` |
| 7 angles, see-through | the same plus `&xr=1&labels=1` | `xr-*.png` |
| press run | `press=…` at each `--at` budget: default view, from behind (`--behind 225`), see-through | `press-front-*`, `press-behind-*`, `press-xr-*` |
| phone | 390 × 844, `xr=1&labels=1`, full page (badges and the label list) | `phone-xr.png` |
| close-up | device scale 4, see-through, crop `--zoom 0.3,0.25,0.4,0.45` of the figure box | `zoom-xr.png` |

For each shot `report.json` records `data-errors`; counts of `NaN`, `Infinity` and `undefined` **inside `#art` only**;
console errors and page errors; label pills that overlap each other or leave the viewBox; horizontal page scroll; the
active toast; a state snapshot from `window.__st`. `contact.png` puts every shot on one sheet, so you open one image
and only zoom into the shots that look wrong. Exit code 1 on any error.

Toaster result: 25 shots, 0 errors, 9 see-through labels with no overlaps and none off-frame at every angle; toasts
captured ("The metal strip warms up and starts to bend.", "It bends far enough to unlock the spring. POP!"); about
57 s. Negative run (`--press "…,Pull the lever@2600,Choose shade>burnt@2700" --at 2800`): every shot flagged `no
button "Pull the lever"; no choice "burnt" in "Choose shade";`, exit code 1, and the out-of-order "light" choice
showed "The shade is set before toasting".

Timing facts for press runs: the press clock starts at mount; a later notice replaces an earlier one (at 1500 ms the
toaster's own "The metal strip…" notice replaced the out-of-order one, so space out-of-order presses from the figure's
own notices).

### 4.4 CLI fallback (no Python)

```bash
SHELL_BIN=$(ls -d ~/Library/Caches/ms-playwright/chromium_headless_shell-*/chrome-headless-shell-mac-arm64/chrome-headless-shell | tail -1)
for v in "yaw=45" "yaw=110" "yaw=170" "yaw=230" "yaw=300" "yaw=20&pitch=62" "yaw=200&pitch=70"; do
  "$SHELL_BIN" --hide-scrollbars --force-device-scale-factor=2 --window-size=900,800 --virtual-time-budget=3000 \
    --screenshot="shot-${v//[&=]/_}.png" "file://$PWD/OUT.html?free=1&$v&xr=1&labels=1"
done
"$SHELL_BIN" --virtual-time-budget=6000 --dump-dom "file://$PWD/OUT.html?press=Push%20the%20lever@300" > dom.html
grep -o 'data-errors="[^"]*"' dom.html
python3 -I -c "import re,sys; s=open('dom.html').read(); m=re.search(r'<g id=\"art\"[^>]*>(.*?)</g></svg>', s, re.S); print('NaN in #art:', m.group(1).count('NaN'))"
```

Do not `grep NaN dom.html`: the dump contains `bakeNoise`'s base64 PNG, which held "NaN" twice in the toaster run
(false positives, pitfall 25).

### 4.5 Iframe and embed checks

`iframe_probe.py` (iframe layout at 760 × 560, 760 × 900, 1000 × 520, 350 × 640; keyboard focus; pointer capture past
the iframe edge) and `embed_probe.py` (every bridge command and event) ran against `cf-test/host.html` and
`cf-test/host-embed.html` (Appendix D). Results are in §2.2 and §2.3.

### 4.6 What to look for in the shots

1. Every angle, closed and see-through, at 2-3× crops: nothing painted over a nearer part, no missing face, nothing
   floating, no mirrored text, nothing visible through a solid wall, a believable back and underside.
2. The press run at the default view, from behind and in see-through, plus one out-of-order press that answers with a
   notice.
3. The 4× close-up: every part held by something, every drive touching what it drives, wires port to port.
4. The phone shot: badges readable, the label list present, nothing cut off, no horizontal scroll.
5. `report.json`: no errors, no NaN/undefined in `#art`, no overlapping pills.
6. Only then add `turn:'full'`.

---

## 5. Top 25 pitfalls and their fixes

| # | Pitfall | Fix |
|---|---|---|
| 1 | **Fixed draw order.** "Body, then lever" is right for one view only; a helper that concatenates several parts is a fixed order too. | Every separate part goes through `byDepth` as an item; helpers return items, not strings (`SKILL.md:70-74`). |
| 2 | **Items without `box`** sort by centre point: long or wrapping parts (a pole beside keys, a spout past a cup, a jumper over a chip) come out wrong. | Give every item a tight box; split long parts into pieces no longer than the things beside them (`SKILL.md:82-83`). |
| 3 | **`byDepth` is not transitive.** Boxes that overlap on every axis fall back to centre depth, and three such items can order differently depending on input order. | Make boxes disjoint along some axis (split parts); sort per layer when the camera always looks down (`lamp.html:343-345`); insert a big block after the last item wholly behind it (`claw.html:244-251`); sort rotated assemblies in local coordinates (`SL.byDepthIn`, §3.3). |
| 4 | **Nested `byDepth`**: the inner result is one string with a fixed position among the outer items. | Sort once, at the level where the items interleave; nest only groups that are wholly on one side of everything else. |
| 5 | **Faces drawn when turned away**, or things mounted on a face drawn regardless of it (buttons, decals, displays, knobs, their labels). | Test `vis(n)` for every face and its contents; draw mounted things after the body while the face is toward you and before it when it turns away (`toaster.html:204`). |
| 6 | **Wrong light**: `box` defaults to `toneI` (interior light), `extrude`/`tone` follow the sun; mixing them makes a body's faces disagree. | Pass `tone` for outside surfaces, `toneI` for insides and props, consistently. |
| 7 | **Concave profiles in `loft`/`extrude`**: normals come from the centroid, so concave strips flip and vanish. | Build concave parts from convex pieces, each with its own ink, no ink on the joins (`SKILL.md:87-88`). |
| 8 | **Missing ends and caps**: `extrude` draws sides only, `cylX` caps only the visible end, a flat disc has no thickness. | Draw caps for the visible end, give plates and wheels thickness and a rim, open tubes a dark bore (`SKILL.md:84-86`, `toaster.html:158-188`). |
| 9 | **Text on the wrong face**: `tx` works only on +x faces and `txY` only on +y faces; text drawn before its face is covered; top text turns upside down from behind. | For other faces build the matrix with `Dv` (`toaster.html:31`); draw text after its face; use a `flip` for top text that must stay readable (`R/01-.js:63-65`). |
| 10 | **Unescaped text**: `&`, `<` or `"` in a label, a translation or a button label breaks the SVG or the `data-t` attribute (button labels are `innerHTML`). | Escape at the point of insertion; the bridge escapes button labels. |
| 11 | **Pill widths for other scripts**: Chinese overflows its pill (19.1 in 18.0), Hindi pills are twice too wide (tested). | Patch the three width formulas in the vendored core to measure text; keep labels short. |
| 12 | **Reserved names**: a top-level `const`/`let` that core already has blanks the page; `CAM_K` and `_clipN` are missing from SKILL.md's list; redeclaring a core `function` silently replaces it for core too; a local `const on` breaks core `on()` calls above it in the same function (tested, and in the baseline). | One namespace, IIFE-wrapped files, prefixed helpers; `cfshoot.py` catches the blank page through `data-errors`. |
| 13 | **Colours and materials**: `mix`/`matOf` need `#rrggbb`; passing a colour string where a `{l,m,d}` material is expected (`rod(…, INK, …)`) throws inside `mix` (the baseline schematic sheet, Appendix E). | Six-digit hex only; materials via `matOf('#hex')`. The probe flags `NaN`/`undefined` in `#art`. |
| 14 | **Line weights that do not scale**: only `stroke-width="N"` attributes go through `inkScale`. | Use attribute strokes for ink; use `style="stroke-width:…"` only when you mean model units (glows, cords). |
| 15 | **Clip and def ids**: `clipTo` ids are `k1…kN` and restart every render; your own `clipPath`/gradient/filter ids must not collide; two figures in one document collide. | Unique, prefixed ids (`claw.html` uses `cChute`, `sp${id}`); one figure per document (an iframe each). |
| 16 | **`#41538f` is special**: build.py moves every element with that fill out of translucent groups, and out of its clip group, so a clipped shadow inside a ghosted group spills off its board, and a blue part in that colour jumps to full opacity. | Use `SHADOW` only for cast shadows; draw shadows first, at top level (`toaster.html:144`). |
| 17 | **Shadows as one hull**: `castShadow` takes the convex hull of all points, so separate parts and concave objects become one blob. | One call per part or support, clipped to the board top (`lamp.html:146-156`); see-through cages at opacity .45 (`SKILL.md:110-111`). |
| 18 | **Clicks on drawn parts**: `addEventListener` on SVG elements dies with the next frame; an `act` name with no handler swallows the drag; a big `act` area blocks orbiting. | Only `act(name, …)` + `cfg.acts`; keep hit areas small (transparent push zones, `claw.html:461-465`); give every act an equivalent button for keyboard users. |
| 19 | **Animation state**: two loops on one state, `dt` in the wrong unit, physics at frame rate. | One state object and a running flag per loop (`toaster.html:310-343`); `dt` is seconds clamped to 0.05 s, so sub-step physics at 10 ms (`D/03-…:318`). |
| 20 | **`?press=` limits**: prefix matching, first DOM match, no `,`/`@`/`>`, keypad keys are not pressable (tested), translated labels break test URLs. | Stable button ids via the bridge; English for test runs; figure params for keypad-only states (`claw.html:953-962`). |
| 21 | **Frame fixed at mount** from `size` at the default view: lifted lids, exploded stacks, cords and other angles spill out; resizing the iframe never re-frames; `FIG_A` is read once. | Put the extremes in `size` (`SKILL.md:64-65`); give the iframe a fixed aspect; set `FIG_A` before mount. |
| 22 | **Turn limit**: without `turn:'full'` or `?free=1`, `?yaw=200` is silently clamped to 105°, so a "from behind" shot is a front view. | `cfshoot.py` always adds `free=1`; ship with `turn:'full'` after every angle passes (`SKILL.md:62-63`). |
| 23 | **Performance with many parts**: the whole SVG string is rebuilt and parsed every frame. Measured here: about 0.7 ms per render at 106 paths (toaster closed), 2.7 ms at 491 (toaster see-through), 3.2 ms at 526 (claw); the hand filter's raster cost on phones dwarfs that, which is why build.py drops it there. | Stop loops when idle; cache item strings that do not change for the current camera; fewer ring segments (`n`) on small parts; few `clipPath`s; no O(n³) sorts (`R/01-.js:624-636`); no layout reads per frame. |
| 24 | **Using the figure as a world view**: huge drawings make WebKit skip the filter (`D/03-…:238-242`), the filter is tuned to one `INK_K` (`:243-244`), and the camera fights the scene. | One object per figure; the flight range is a separate component. |
| 25 | **Host and test traps**: remounting `mountFigure` in one document stacks listeners and loops; the baseline `FigureFrame` resets readiness on `load` although `ready` can arrive first (measured); `file://` origin quirk; a whole-DOM `NaN` grep hits `bakeNoise` base64. | One mount per document; the hello/ready handshake (§2.3); `'*'` only for file tests; check `#art` only. |

Also worth knowing: `xrCallouts` bounds are `[x0, x1, y0, y1, z0, z1]`, not a `box`; `openShell` and `loft` take a
colour **function**; `shape` takes 3D points while `fill`/`face`/`ink` take path strings; a scene that reads `ui`
during the first render hits the TDZ when the figure wrote `const ui = mountFigure(…)` (the lamp guards it with
`try`, `lamp.html:349`); `xrMount` must run after `ui` exists.

---

## Appendix A: `cfshoot.py`

Tested version (scratchpad copy: `/private/tmp/claude-501/-Users-amar-Codes-ak-simlab/327c458a-8849-435d-a3e9-20eb9855a68f/scratchpad/cf-tools/cfshoot.py`).
Copy to `figures/tools/cfshoot.py`.

```python
#!/usr/bin/env python3
"""cfshoot.py: screenshot and error-check a built Colorfigures page with Playwright's cached Chromium.

    python3 -I cfshoot.py PAGE.html OUTDIR [options]

Shoots, each in a fresh browser context with a paused fake clock (deterministic timing):
  1. the 7 standard angles, closed                       angle-<view>.png
  2. the same 7 angles with &xr=1&labels=1               xr-<view>.png
  3. a ?press= run at each --at budget, at the default
     view, from behind, and in see-through               press-<where>-<ms>.png
  4. a phone shot (390 x 844) with &xr=1&labels=1        phone-xr.png (full page, so the label list shows)
  5. a 4x close-up of the mechanism in see-through       zoom-xr.png
and writes report.json (data-errors, NaN / Infinity / undefined in the drawing, console + page errors, label pills
that overlap or leave the frame, horizontal page scroll, a state snapshot) plus contact.png (all shots on one sheet).
Exit code 1 when any shot has an error.

Options:
  --press "Label@ms,Label>Choice@ms"   the ?press= sequence (labels match the start of a button's text)
  --at 1500,4000                       fake-clock budgets in ms after load for the press shots (default 3000)
  --budget 3000                        budget for the angle / phone / zoom shots (default 3000)
  --q "k=v&k2=v2"                      extra query for every shot (the figure's own params(st, q) keys)
  --behind 225                         yaw for the "from behind" press shots
  --zoom 0.3,0.25,0.4,0.45             close-up crop of the figure box as fractions x,y,w,h
  --only angles,xr,press,phone,zoom    run a subset
"""
import argparse, asyncio, json, pathlib, sys
from playwright.async_api import async_playwright

ANGLES = ["yaw=45", "yaw=110", "yaw=170", "yaw=230", "yaw=300", "yaw=20&pitch=62", "yaw=200&pitch=70"]
T0 = 1_700_000_000_000          # fake epoch; the clock is paused right after it, so nothing moves until run_for()

PROBE = r"""() => {
  const art = document.getElementById('art'), svg = document.getElementById('fig');
  const html = art ? art.innerHTML : '';
  const n = re => (html.match(re) || []).length;
  const out = { errors: document.documentElement.dataset.errors || '', nan: n(/NaN/g), inf: n(/Infinity/g),
    undef: n(/undefined/g), svgChars: html.length, paths: art ? art.querySelectorAll('path').length : 0,
    clipPaths: art ? art.querySelectorAll('clipPath').length : 0, texts: art ? art.querySelectorAll('text').length : 0,
    labelsOn: !document.documentElement.classList.contains('nolabels'), tags: 0, overlaps: [], offFrame: [],
    hScroll: document.documentElement.scrollWidth > innerWidth + 1, title: document.title };
  if (svg && out.labelsOn){
    const vb = svg.viewBox.baseVal, rs = [...svg.querySelectorAll('.tag')].map(g => {
      const r = g.querySelector('rect'); if (!r) return null; const b = r.getBBox();
      return { t: g.dataset.t || '', x: b.x, y: b.y, w: b.width, h: b.height }; }).filter(Boolean);
    out.tags = rs.length;
    for (let i = 0; i < rs.length; i++){ const a = rs[i];
      if (a.x < vb.x - .5 || a.y < vb.y - .5 || a.x + a.w > vb.x + vb.width + .5 || a.y + a.h > vb.y + vb.height + .5) out.offFrame.push(a.t);
      for (let j = i + 1; j < rs.length; j++){ const b = rs[j];
        if (a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h) out.overlaps.push(a.t + ' / ' + b.t); } }
  }
  try { const seen = new WeakSet();
    out.st = JSON.stringify(window.__st, (k, v) => { if (typeof v === 'object' && v){ if (seen.has(v)) return '[loop]'; seen.add(v);
      if (Array.isArray(v) && v.length > 12) return `[${v.length} items]`; } return typeof v === 'number' ? +v.toFixed(3) : v; }).slice(0, 700);
  } catch (e) { out.st = 'unreadable: ' + e.message; }
  return out; }"""


async def shot(browser, url, path, *, budget, viewport=(900, 800), dsf=2, full_page=False, zoom=None):
    ctx = await browser.new_context(viewport={"width": viewport[0], "height": viewport[1]}, device_scale_factor=dsf)
    page = await ctx.new_page()
    console, pageerr = [], []
    page.on("console", lambda m: console.append(m.text) if m.type == "error" else None)
    page.on("pageerror", lambda e: pageerr.append(str(e)))
    await page.clock.install(time=T0)
    await page.clock.pause_at(T0 + 1000)
    await page.goto(url, wait_until="load")
    await page.clock.run_for(budget)
    await page.wait_for_timeout(350)        # real time: CSS transitions (toast fade, stat bump) and the baked noise image
    clip = None
    if zoom:
        box = await page.locator("#fig").bounding_box()
        fx, fy, fw, fh = zoom
        clip = {"x": box["x"] + box["width"] * fx, "y": box["y"] + box["height"] * fy,
                "width": box["width"] * fw, "height": box["height"] * fh}
    await page.screenshot(path=str(path), full_page=full_page, clip=clip)
    info = await page.evaluate(PROBE)
    toast = await page.evaluate("() => { const t = document.getElementById('toast'); return t && t.classList.contains('show') ? t.textContent : ''; }")
    await ctx.close()
    info.update(url=url, file=path.name, console=console, pageErrors=pageerr, toast=toast)
    info["ok"] = not (info["errors"].strip() or info["nan"] or info["inf"] or info["undef"] or console or pageerr)
    return info


def contact_sheet(rows, out, thumb=360):
    from PIL import Image, ImageDraw
    ims = []
    for r in rows:
        im = Image.open(out / r["file"]).convert("RGB")
        im.thumbnail((thumb, thumb * 1.4))
        ims.append((im, r["file"] + ("" if r["ok"] else "  ERR")))
    cols = 4
    rows_ = [ims[i:i + cols] for i in range(0, len(ims), cols)]
    heights = [max(im.height for im, _ in r) + 18 for r in rows_]
    sheet = Image.new("RGB", (thumb * cols, sum(heights)), "white")
    d = ImageDraw.Draw(sheet)
    y = 0
    for r, h in zip(rows_, heights):
        for i, (im, cap) in enumerate(r):
            sheet.paste(im, (i * thumb, y + 16))
            d.text((i * thumb + 4, y + 2), cap, fill=(200, 30, 30) if cap.endswith("ERR") else (40, 30, 20))
        y += h
    sheet.save(out / "contact.png")


async def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("page"); ap.add_argument("out")
    ap.add_argument("--press", default=""); ap.add_argument("--at", default="3000")
    ap.add_argument("--budget", type=int, default=3000); ap.add_argument("--q", default="")
    ap.add_argument("--behind", default="225"); ap.add_argument("--zoom", default="0.3,0.25,0.4,0.45")
    ap.add_argument("--only", default="angles,xr,press,phone,zoom")
    a = ap.parse_args()
    base = pathlib.Path(a.page).resolve().as_uri()
    out = pathlib.Path(a.out); out.mkdir(parents=True, exist_ok=True)
    only = set(a.only.split(","))
    extra = ("&" + a.q) if a.q else ""
    url = lambda q: f"{base}?free=1{extra}&{q}"
    rows = []
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        name = lambda v: v.replace("&", "_").replace("=", "")
        if "angles" in only:
            for v in ANGLES:
                rows.append(await shot(browser, url(v), out / f"angle-{name(v)}.png", budget=a.budget))
        if "xr" in only:
            for v in ANGLES:
                rows.append(await shot(browser, url(v + "&xr=1&labels=1"), out / f"xr-{name(v)}.png", budget=a.budget))
        if "press" in only and a.press:
            for ms in [int(x) for x in a.at.split(",")]:
                for where, q in [("front", "yaw=45"), ("behind", f"yaw={a.behind}"), ("xr", "yaw=45&xr=1&labels=1")]:
                    rows.append(await shot(browser, url(f"{q}&press={a.press}"), out / f"press-{where}-{ms}.png", budget=ms))
        if "phone" in only:
            rows.append(await shot(browser, url("xr=1&labels=1"), out / "phone-xr.png", budget=a.budget,
                                   viewport=(390, 844), dsf=2, full_page=True))
        if "zoom" in only:
            rows.append(await shot(browser, url("yaw=45&xr=1&labels=1"), out / "zoom-xr.png", budget=a.budget, dsf=4,
                                   zoom=[float(x) for x in a.zoom.split(",")]))
        await browser.close()
    (out / "report.json").write_text(json.dumps(rows, indent=1))
    contact_sheet(rows, out)
    bad = [r for r in rows if not r["ok"]]
    for r in rows:
        flags = [k for k in ("nan", "inf", "undef") if r[k]] + (["errors"] if r["errors"].strip() else []) \
            + (["console"] if r["console"] else []) + (["pageErrors"] if r["pageErrors"] else [])
        lbl = f" tags={r['tags']} overlaps={len(r['overlaps'])} off={len(r['offFrame'])}" if r["labelsOn"] else ""
        print(f"{'OK ' if r['ok'] else 'ERR'} {r['file']:<34} paths={r['paths']:<5} svg={r['svgChars']:<7}{lbl}"
              + (f" toast={r['toast']!r}" if r["toast"] else "") + (f" FLAGS={flags} {r['errors']}" if flags else ""))
    print(f"{len(rows)} shots, {len(bad)} with errors -> {out}/report.json, {out}/contact.png")
    sys.exit(1 if bad else 0)

asyncio.run(main())
```

## Appendix B: `cfbuild.py`

Tested version (`…/scratchpad/cf-tools/cfbuild.py`). Copy to `figures/tools/cfbuild.py`; point `--core` and
`--skill-build` at `figures/vendor/colorfigures/` once the core is vendored.

```python
#!/usr/bin/env python3
"""cfbuild.py: build one self-contained Colorfigures page from a figure that loads several local scripts.

    python3 -I cfbuild.py SRC.html OUT.html [--core CORE.js] [--skill-build BUILD.py] [--check]

The skill's build.py inlines core.js only. This does the same job for a page like
    <script src="core.js"></script><script src="engine/bench.js"></script><script src="embed.js"></script><script>...</script>
by inlining every local <script src> (paths relative to SRC; core.js falls back to --core), then adding the same
HEAD and TAIL as build.py. HEAD/TAIL are read out of build.py with ast (it is parsed, never run), so a new skill
version is picked up without copying its strings. --check also builds SRC with the skill's own build.py logic
(core.js only) and confirms the two agree when SRC loads nothing but core.js.
"""
import argparse, ast, os, re, sys

SKILL = os.path.expanduser('~/.claude/skills/colorfigures')
TAG = re.compile(r'<script\s+src=["\'](?!https?:|//|data:)([^"\']+)["\']\s*>\s*</script>')


def head_tail(build_py):
    tree = ast.parse(open(build_py, encoding='utf-8').read())
    vals = {}
    for node in tree.body:
        if isinstance(node, ast.Assign) and isinstance(node.value, ast.Constant):
            for t in node.targets:
                if isinstance(t, ast.Name) and t.id in ('HEAD', 'TAIL'):
                    vals[t.id] = node.value.value
    if set(vals) != {'HEAD', 'TAIL'}:
        sys.exit(f'HEAD/TAIL not found in {build_py}')
    return vals['HEAD'], vals['TAIL']


def finish(page, head, tail):
    page = page.replace('</head>', head + '</head>', 1) if '</head>' in page else head + page
    i = page.rfind('</body>')
    return page[:i] + tail + page[i:] if i >= 0 else page + tail


def build(src, core, head, tail):
    page, base = open(src, encoding='utf-8').read(), os.path.dirname(os.path.abspath(src))
    if not TAG.search(page):
        sys.exit(f'no local <script src> in {src}')

    def inline(m):
        rel = m.group(1)
        path = os.path.join(base, rel)
        if not os.path.exists(path) and os.path.basename(rel) == 'core.js':
            path = core
        if not os.path.exists(path):
            sys.exit(f'{src}: script not found: {rel}')
        code = open(path, encoding='utf-8').read()
        if '</script' in code.lower():
            sys.exit(f'{path} contains "</script": it would end the inline script early')
        return '<script>\n' + code + '\n</script>'

    return finish(TAG.sub(inline, page), head, tail)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('src'); ap.add_argument('out')
    ap.add_argument('--core', default=os.path.join(SKILL, 'assets', 'core.js'))
    ap.add_argument('--skill-build', default=os.path.join(SKILL, 'scripts', 'build.py'))
    ap.add_argument('--check', action='store_true')
    a = ap.parse_args()
    head, tail = head_tail(a.skill_build)
    page = build(a.src, a.core, head, tail)
    if a.check:
        raw = open(a.src, encoding='utf-8').read()
        m = re.search(r'<script\s+src=["\'](?:\./)?core\.js["\']\s*>\s*</script>', raw)
        if m and len(TAG.findall(raw)) == 1:
            ref = raw[:m.start()] + '<script>\n' + open(a.core, encoding='utf-8').read() + '\n</script>' + raw[m.end():]
            print('check:', 'same as build.py' if finish(ref, head, tail) == page else 'DIFFERS from build.py')
    open(a.out, 'w', encoding='utf-8').write(page)
    print('wrote', a.out, f'({len(page)} chars)')


main()
```

## Appendix C: `embed.js`

Tested version (`…/scratchpad/cf-test/src/embed.js`, built into `…/cf-test/toaster-embed.html`). Copy to
`figures/lib/embed.js`. Load it right after `core.js`. The toaster copy used for testing added this to its
`mountFigure` call:

```js
embed: { report: st => ({ phase: st.phase, shade: SHADES[st.shade].name, bread: st.bread, brown: +st.brown.toFixed(2) }),
         accept: (st, p) => { if ([0, 1, 2].includes(p.shade) && (st.phase === 'idle' || st.phase === 'cool')) st.shade = p.shade; } },
```

(`brown` is the continuous value that showed why `report` must stay discrete.)

```js
/* iynk embed bridge for Colorfigures pages. Load after core.js and before the figure's own script.

   Always: CF_T(text) translates a string from CF_STRINGS[lang] (lang from ?lang=, default 'en'); figures pass every
   button label, label text and flash message through it. Button labels are translated by the bridge itself.

   Embedded (inside an iframe, or ?embed=1; ?embed=0 forces it off):
     - the page chrome goes (header, wobble / colour / view controls, credit, phone label list) and the drawing fills
       the iframe; ?bare=1 also hides the figure's own buttons, stats, switches and keypad (the host draws those)
     - commands from the parent:  { source:'iynk', v:1, type, ... }
         hello | press {id, choice?} | act {name, data?} | set {state} | view {yaw, pitch, ms?} | xr {on} | labels {on}
         | pal {key} | locale {lang, strings?} | theme {mode:'light'|'dark'} | flash {text, ms?} | query
     - events to the parent:      { source:'iynk-figure', v:1, type, ... }
         ready {fig, title, buttons, acts, lang} | part {act, id, data} | button {id, choice?, by} | state {state, changed}
         | labels {items} | flash {text, en} | focus {on} | error {message}
   A figure opts in to state traffic with cfg.embed = { report(st) -> plain object, accept(st, patch) -> applies a
   checked patch }. Nothing else in the state can be written from outside. */
(() => {
  const q = new URLSearchParams(location.search);
  let lang = q.get('lang') || 'en';
  window.CF_STRINGS = window.CF_STRINGS || {};
  window.CF_T = s => { const d = CF_STRINGS[lang]; return (d && d[s] != null) ? d[s] : s; };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const slug = s => String(s).toLowerCase().replace(/<[^>]*>/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const inFrame = window.parent !== window;
  const embedded = q.get('embed') === '1' || (inFrame && q.get('embed') !== '0');
  const html = document.documentElement, host = window.parent;
  // same-origin hosting (Next.js public/) posts to our own origin. A file:// page reports location.origin 'file://'
  // but its real origin is opaque ('null'), and a message aimed at 'file://' is silently dropped, so tests use '*'
  const opaque = location.protocol === 'file:' || location.origin === 'null';
  const target = q.get('origin') || (opaque ? '*' : location.origin);
  const send = (type, data) => { if (embedded) try { host.postMessage({ source: 'iynk-figure', v: 1, type, ...data }, target); } catch (e) {} };

  if (embedded){
    html.classList.add('cf-embed');
    if (q.get('bare') === '1') html.classList.add('cf-bare');
    if (q.get('theme') === 'dark') html.classList.add('cf-dark');
    const css = document.createElement('style');
    css.textContent = `
      html.cf-embed, html.cf-embed body { height: 100%; overflow: hidden; }
      html.cf-embed body { padding: 0; display: block; }
      html.cf-embed body > header, html.cf-embed .controls, html.cf-embed .made-with, html.cf-embed .lgd { display: none !important; }
      html.cf-embed .stage { max-width: none; height: 100%; display: flex; flex-direction: column; }
      html.cf-embed .zwrap { flex: 1 1 auto; min-height: 0; }
      html.cf-embed #fig { max-width: none; width: 100%; height: 100% !important; max-height: none !important; margin: 0; }
      html.cf-embed #fig:focus-visible { outline: 2px solid var(--ink); outline-offset: -3px; }
      @media (min-width: 561px){ html.cf-embed .actions { left: 12px; top: 10px; } html.cf-embed .vset { right: 12px; top: 10px !important; }
        html.cf-embed #stats { right: 12px; } }
      @media (max-width: 560px){ html.cf-embed .stage { padding: 8px 10px 0; } }
      html.cf-bare .actions, html.cf-bare .vset, html.cf-bare .stats, html.cf-bare .kpad { display: none !important; }
      html.cf-dark { --paper: #e4ddcf; --rule: #cbc2b1; --muted: #6a6357; }`;
    document.head.appendChild(css);
    // core reads FIG_A once, at mount: frame the drawing to the iframe's own shape (never wider than core's 4:3)
    window.FIG_A = () => Math.max(.7501, Math.min(1.4, innerHeight / Math.max(1, innerWidth)));
    addEventListener('error', e => send('error', { message: e.message }));
    addEventListener('focus', () => send('focus', { on: true }));
    addEventListener('blur', () => send('focus', { on: false }));
  }

  const mount0 = mountFigure;
  mountFigure = cfg => {
    const buttons = cfg.buttons || [];
    for (const b of buttons){
      b.id = b.id || slug(b.label); b.en = b.en || b.label; b.label = esc(CF_T(b.en));
      if (b.choices){ const pick = b.choices;
        b.choices = st => pick(st).map(c => ({ ...c, id: c.id || slug(c.label), en: c.en || c.label, label: CF_T(c.en || c.label) })); }
    }
    const ui = mount0(cfg), E = cfg.embed || {}, svg = document.getElementById('fig');
    const els = [...document.querySelectorAll('#btns > .stepwrap > .act')];
    buttons.forEach((b, i) => { if (els[i]) els[i].dataset.id = b.id; });
    const flash0 = ui.flash;
    ui.flash = (text, ms) => { const t = CF_T(text); send('flash', { text: t, en: text }); return flash0(t, ms); };
    if (!embedded) return ui;

    svg.setAttribute('tabindex', '0');                        // keyboard users can reach the arrows-turn-it figure
    let byHost = false;
    const relabel = () => {
      buttons.forEach((b, i) => { const el = els[i]; if (el && el.firstChild) el.firstChild.textContent = CF_T(b.en); });
      for (const [id, en] of [['xrb', 'See-through'], ['lblb', 'Labels']]){ const el = document.getElementById(id); if (el) el.textContent = CF_T(en); }
    };
    const press = (id, choice) => {
      const i = buttons.findIndex(b => b.id === id), b = buttons[i], el = els[i];
      if (!b || !el) return send('error', { message: `no button "${id}"` });
      byHost = true;
      try {
        if (choice == null) return el.click();
        const list = b.choices ? b.choices(ui.st) : [], k = list.findIndex(c => c.id === choice || c.en === choice);
        if (k < 0) return send('error', { message: `no choice "${choice}" in "${id}"` });
        if (!el.parentElement.classList.contains('open')) el.click();
        const chip = el.parentElement.querySelectorAll('.chip')[k]; if (chip) chip.click();
      } finally { byHost = false; }
    };
    // events: parts pressed, buttons and chips clicked (by a person or by the host)
    svg.addEventListener('pointerdown', e => { const a = e.target.closest('[data-act]');
      if (a) send('part', { act: a.dataset.act, id: a.dataset.id || '', data: { ...a.dataset } }); }, true);
    document.querySelector('.stage').addEventListener('click', e => {
      const by = byHost ? 'host' : 'user', ch = e.target.closest('.chip'), a = e.target.closest('.act');
      if (ch){ const w = ch.closest('.stepwrap'), i = [...document.querySelectorAll('#btns > .stepwrap')].indexOf(w), b = buttons[i];
        const k = [...w.querySelectorAll('.chip')].indexOf(ch), list = b && b.choices ? b.choices(ui.st) : [];
        send('button', { id: b ? b.id : '', choice: list[k] ? list[k].id : ch.textContent, by }); }
      else if (a) send('button', { id: a.dataset.id || a.id || slug(a.textContent), by });
    }, true);
    // after every render: the figure's reported state (only what changed) and the visible labels
    let last = {}, lastTags = '';
    const r0 = ui.render;
    ui.render = () => { r0();
      if (E.report){ const now = E.report(ui.st), changed = Object.keys(now).filter(k => JSON.stringify(now[k]) !== JSON.stringify(last[k]));
        if (changed.length){ last = now; send('state', { state: now, changed }); } }
      const tags = [...svg.querySelectorAll('.tag')].map(g => ({ n: +g.dataset.n, text: g.dataset.t, on: g.classList.contains('on') }));
      const sig = JSON.stringify(tags); if (sig !== lastTags){ lastTags = sig; send('labels', { items: tags }); } };
    const xm0 = xrMount;
    xrMount = (...args) => { const r = xm0(...args); relabel(); return r; };

    addEventListener('message', ev => {
      if (ev.source !== host || (target !== '*' && ev.origin !== target)) return;
      const m = ev.data; if (!m || m.source !== 'iynk') return;
      const st = ui.st;
      switch (m.type){
        case 'hello': return ready();
        case 'press': return press(m.id, m.choice);
        case 'act': { const f = cfg.acts && cfg.acts[m.name]; if (!f) return send('error', { message: `no act "${m.name}"` });
          f(st, { dataset: m.data || {} }, ui); return ui.render(); }
        case 'set': if (E.accept){ E.accept(st, m.state || {}); ui.render(); } return;
        case 'view': return ui.camTo(+m.yaw, m.pitch == null ? PITCH : +m.pitch, m.ms == null ? 600 : +m.ms);
        case 'xr': { const b = document.getElementById('xrb'); if (b && !!st.xrT !== !!m.on) b.click(); return; }
        case 'labels': { const b = document.getElementById('lblb'); if (b && html.classList.contains('nolabels') === !!m.on) b.click(); return; }
        case 'pal': if (PALS[m.key]){ st.pal = m.key; ui.render(); } return;
        case 'locale': lang = m.lang || lang; if (m.strings) CF_STRINGS[lang] = { ...(CF_STRINGS[lang] || {}), ...m.strings }; relabel(); return ui.render();
        case 'theme': return html.classList.toggle('cf-dark', m.mode === 'dark');
        case 'flash': return ui.flash(String(m.text || ''), m.ms);
        case 'query': return send('state', { state: E.report ? E.report(st) : {}, changed: [] });
      }
    });
    const ready = () => send('ready', { fig: cfg.fig, title: cfg.title, lang, acts: Object.keys(cfg.acts || {}),
      buttons: buttons.map(b => ({ id: b.id, label: CF_T(b.en), picker: !!b.choices })) });
    ready(); ui.render();                                   // the first state + labels events follow ready
    return ui;
  };
})();
```

Known gaps to close when porting: translate core's two notice patterns ("— already set", "isn't possible right now")
in the `flash` wrapper; drop or round continuous `report` values; add a `pause`/`resume` command if hidden iframes
must stop animating.

## Appendix D: host side

**Plain test host** (what the probes used; `…/scratchpad/cf-test/host-embed.html`):

```html
<iframe id="fr" title="Toaster figure"></iframe>
<script>
const fr = document.getElementById('fr'); window.LOG = [];
addEventListener('message', ev => { if (ev.source !== fr.contentWindow) return; const m = ev.data;
  if (!m || m.source !== 'iynk-figure') return; LOG.push(m); });
fr.addEventListener('load', () => fr.contentWindow.postMessage({ source:'iynk', v:1, type:'hello' }, '*'));
window.cmd = m => fr.contentWindow.postMessage({ source:'iynk', v:1, ...m }, '*');
fr.src = 'toaster-embed.html?bare=1';
</script>
```

**React sketch** for `src/components/FigureFrame.tsx` v2 (not compiled in this research; the same handshake was tested
in the plain host above). It fixes the baseline's three problems: readiness reset on `load`, duplicate sends, and
`'*'` target origins.

```tsx
"use client";
import { useCallback, useEffect, useRef } from "react";

export type FigureEvent = { type: string; [k: string]: unknown };
export type FigureCommand = { type: string; [k: string]: unknown };

export function useFigure(src: string, onEvent: (e: FigureEvent) => void) {
  const frame = useRef<HTMLIFrameElement>(null);
  const ready = useRef(false);
  const queue = useRef<FigureCommand[]>([]);
  const handler = useRef(onEvent);
  useEffect(() => { handler.current = onEvent; });

  const post = useCallback((cmd: FigureCommand) => {
    const win = frame.current?.contentWindow;
    if (!win || (!ready.current && cmd.type !== "hello")) { queue.current.push(cmd); return; }
    win.postMessage({ source: "iynk", v: 1, ...cmd }, window.location.origin);
  }, []);

  useEffect(() => {
    ready.current = false;
    queue.current = [];
    const onMsg = (ev: MessageEvent) => {
      if (ev.source !== frame.current?.contentWindow || ev.origin !== window.location.origin) return;
      const m = ev.data as { source?: string; v?: number } & FigureEvent;
      if (!m || m.source !== "iynk-figure" || m.v !== 1) return;
      if (m.type === "ready") {                 // every ready (first load or a reload) flushes the queue
        ready.current = true;
        for (const c of queue.current.splice(0)) post(c);
      }
      handler.current(m);
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [src, post]);

  const onLoad = useCallback(() => post({ type: "hello" }), [post]);   // never reset readiness here
  return { frame, post, onLoad };
}
// <iframe ref={frame} src={src} title={title} onLoad={onLoad} className="figure-frame"
//         style={{ aspectRatio: "4 / 3", background: "#f2efe7", colorScheme: "light" }} />
```

## Appendix E: defects found while testing

| Where | Defect | Evidence |
|---|---|---|
| `claw.html:905-906, :932` | `XR_OPTS` passes the whole gantry/board/chute mechanism as `over`, an option `xrWrap` does not have (`core.js:579-588`), and `mech: () => ''`. See-through shows only the ghosted cabinet and ten labels pointing at nothing | tested: no gearmotor or PCB colours in `#art` in see-through, SVG grows only by the pills (124.6 kB to 127.7 kB); fix: `mech: (st, k) => clawMech(st)` |
| `SKILL.md:161-166` | reserved list misses `CAM_K`, `_clipN`; lists `camTo`, which is not global | tested clashes (§1.14) |
| `build.py:2-10` | docstring says "a lighter filter while the figure moves on touch screens"; the code removes the filter on narrow or touch screens at all times | `build.py:15` first rule |
| `toaster.html:378-385`, `lamp.html:377`, `claw.html:939` | `readout` strings, `hint`, `idea`, `buttonsLabel` are never shown by this core | `core.js:235`, cfg handling |
| `src/components/FigureFrame.tsx:75-77` | `onLoad` sets `ready = false`; the figure's `ready` can arrive before `load`, after which no patch is ever sent | measured: board.html 12× throttle `ready-msg` 450 ms, `iframe-load` 454 ms; 20× 726/734 ms; drone.html 20× 573/579 ms |
| `src/components/FigureFrame.tsx:35-40, :65-67` | two effects both post on every patch change; `'*'` target origin | read |
| `figures/src/board.html:788`, `figures/src/drone.html:255` | `Object.assign(st, msg.patch)`: any key from the parent overwrites state (`pal:'x'` would crash `render`) | read |
| `figures/src/board.html:564`, `:523` | `rod(…, INK, tone, …)` passes a colour string as the material; `?sheet=schematic` throws `TypeError: Cannot read properties of undefined (reading 'substr')` | tested |
| `figures/src/board.html:576` with `:572` | local `const on = …` shadows core `on()`, called four lines earlier; `?sheet=breadboard` throws `ReferenceError: Cannot access 'on' before initialization` | tested |
| `figures/src/board.html:806`, `figures/src/drone.html:267` | `ready` is sent from a 60/40 ms timer instead of from mount, which is what makes the race above possible | read + measured |
