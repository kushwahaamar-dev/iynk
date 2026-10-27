# RS-01 Editor rendering

Run date: 2026-10-27. Status: done within the time box. All numbers below are from this one machine.

## Question

Does an SVG editor hold 60 fps at 500 parts and 1,000 wires with real iynk part artwork, pan and zoom? How do vanilla SVG, React 19 SVG and Canvas 2D compare? Is `@xyflow/react` or a thin custom core smaller?

## Why it matters

It unblocks decision D4 (editor rendering: "SVG in React with a thin custom editor core, xyflow only if its handles fit") and every UI built on it. It also tells us whether the fail trigger (Canvas or Pixi for wires) is the right fallback.

## Exit condition (copied from TECHNICAL_RESEARCH.md section 6)

"Pass: p95 frame time under 20 ms on both [phone and Chromebook]. Fail trigger: p95 over 33 ms on either, then Canvas/Pixi for wires only. Prototype under 400 lines in 3 days either way; choose the smaller."

## Environment

| Item | Value |
|---|---|
| Machine | Apple M4 Pro, 14 cores, arm64, macOS 27.0.1 (Darwin 27.0.0) |
| Node | v24.8.0 |
| Chromium | Playwright build 156.0.8078.4. Two modes: headless shell (software raster, WebGL renderer is SwiftShader, display 60 Hz) and headed (GPU raster, ANGLE Metal on the M4 Pro, display 120 Hz, rAF interval 8.33 ms) |
| WebKit | Playwright WebKit 27.2 (build 2370), headless, rAF interval about 10 ms |
| playwright 1.64.1 (Apache-2.0), react and react-dom 19.3.1 (MIT), @xyflow/react 12.12.0 (MIT), esbuild 0.28.2 (MIT) | all from npm into scratch, never into the repo |
| Viewport | 1280 x 800 CSS px, device pixel ratio 1 (one extra run at 2) |
| Load | `uptime` 1-minute load average is stored with every row (column load1m in the JSON). Range over the runs was 2.7 to 12.4. The only rows above 10 were the first five headless svg-plain rows at 1x; an earlier run of the same three prototypes at load 3 gave the same p50, p95 and max (results/early is not shipped, see Caveats). |

## Method

1. Artwork. The repo has no ready SVG files for parts. `public/figures/parts/*.html` are generated pages. I loaded each of 29 pages in Chromium, took the group for the part (not the breadboard, not the label tag), and saved its `path`, `circle`, `rect` and `ellipse` elements with attributes (`src/extract.mjs`, output `src/parts.json`). I skipped breadboard, wire and multimeter. 26 parts remain. They have 12 to 687 elements each, mean 93.6, median 74. The "hand-drawn" displacement filter that the real pages apply to the whole art group was NOT applied (see Caveats). Text labels were dropped.
2. Scene (`src/scene.js`). 500 parts on a 25 by 20 grid, 90 world units per cell, each scaled to 50 units. Parts picked at random from the 26. 47,097 art elements in total. Four pins per part. 1,000 wires in 403 nets of 2 to 5 pins (a chain per net, pins taken from parts within 3 cells, so wires are local, not random across the board). Wires are orthogonal polylines (horizontal, vertical, horizontal) with a per-wire jitter on the middle leg. Same seeded scene for every prototype.
3. Prototypes (about 260 lines in total, all in `src/`).
   - `svg-plain`: vanilla SVG, one `<g>` with `transform=matrix(...)` for pan and zoom, one `<g>` per part, one `<polyline>` per wire. Built with one `innerHTML`.
   - Vanilla variants I added because an editor would do them: `svg-cull` (set `display:none` on parts and wires outside the viewport), `svg-use` (artwork once in `<defs>`, one `<use>` per part), `svg-lod` (cull, plus below zoom 0.7 swap the art for one outline rectangle per part).
   - `react`: React 19.3.1, `memo` on Part, Art and Wire. Viewport state and scene state live in two separate components so a pan re-renders only the transform group and a drag or hover re-renders only the changed parts and wires. `flushSync` is used so the React work happens inside the frame callback and shows in the timing.
   - `canvas`: Canvas 2D. One `Path2D` per art element built once; parts culled to the viewport; normal wires batched into one stroke; the hot net drawn after. Full redraw on every frame. Parts are not cached as bitmaps.
4. Interactions (`src/bench.js`), each 5 s after a 0.5 s warm-up: `pan-1x` (zoom 1, centre moves about 700 by 450 units, shows about 130 parts), `pan-fit` (zoom 0.4, all 500 parts and all wires on screen, small wiggle), `zoom` (zoom 0.4 to 2.5 to 0.4 in one smooth cycle), `drag` (the centre part moves on a circle of radius 80 units, its wires re-route, about 4 wires), `hover` (every 6th frame a different net of the first 60 nets is highlighted).
5. Timing. Frame time is the difference between successive `requestAnimationFrame` timestamps. I also record the JS time of the per-frame update call (`jsP95`). CPU throttle is `Emulation.setCPUThrottlingRate` 4 and 6, applied after the scene is mounted. DOM node count is `querySelectorAll('*')` on the page root (light DOM only; `<use>` shadow trees are not counted, so svg-use shows 4,465 but renders the same 47k elements).
6. Bundle comparison (`src/uno/`). An Uno (a plain 140 by 360 box with 20 pin handles, not the real Uno art), an LED box and a resistor box with 20 wires, built twice: a vanilla core (`vanilla.js`: pan, wheel zoom about the cursor, node drag, orthogonal wire re-routing, drag from a pin to make a wire) and an `@xyflow/react` app (custom node with Handles, `step` edges, `Background`). Both bundled with esbuild, minified, gzip level 9. Scene data is shared. Both were opened in Chromium to check that they work: vanilla shows 20 wires, a node drag re-routes, wheel zoom changes k from 1 to 1.82; xyflow shows 3 nodes, 20 edges, 24 handles.

## Results

### 1. Frame times, 500 parts and 1,000 wires, Chromium headed (GPU raster, 120 Hz display), milliseconds

Each cell is p50 / p95 / max (frames over 33 ms out of frames recorded). Throttle is CPU throttle. Because the display is 120 Hz, frames come at 8.3 ms steps; 25 ms means three display frames.

| proto | interaction | 1x p50/p95/max (>33ms frames) | 4x p50/p95/max (>33ms frames) | 6x p50/p95/max (>33ms frames) |
|---|---|---|---|---|
| svg-plain | pan-1x | 8.3 / 9.0 / 9.4 (0/600) | 16.9 / 25.2 / 26.0 (0/266) | 25.9 / 34.2 / 41.7 (31/173) |
| svg-plain | pan-fit | 25.0 / 25.8 / 33.6 (2/216) | 24.9 / 25.9 / 33.4 (1/212) | 33.3 / 34.2 / 41.8 (58/156) |
| svg-plain | zoom | 8.4 / 25.0 / 33.4 (1/461) | 34.1 / 42.4 / 42.6 (94/136) | 57.7 / 66.6 / 67.5 (92/92) |
| svg-plain | drag | 8.3 / 8.8 / 16.6 (0/600) | 17.5 / 25.8 / 26.0 (0/243) | 33.1 / 34.2 / 42.6 (49/163) |
| svg-plain | hover | 8.3 / 8.8 / 9.3 (0/600) | 8.4 / 16.7 / 17.6 (0/518) | 8.4 / 25.3 / 33.3 (0/450) |
| svg-cull | pan-1x | 8.3 / 9.1 / 9.4 (0/600) | 8.5 / 17.4 / 25.4 (0/460) | 16.7 / 25.7 / 34.0 (2/292) |
| svg-cull | pan-fit | 25.0 / 25.2 / 33.3 (0/214) | 25.2 / 34.1 / 42.3 (25/181) | 41.7 / 57.9 / 83.0 (112/115) |
| svg-cull | zoom | 8.3 / 25.0 / 41.7 (3/478) | 25.5 / 49.9 / 65.8 (48/170) | 42.1 / 75.9 / 108.3 (83/101) |
| svg-cull | drag | 8.3 / 8.9 / 9.4 (0/601) | 9.1 / 17.4 / 25.6 (0/421) | 17.5 / 25.8 / 33.7 (1/247) |
| svg-cull | hover | 8.3 / 8.7 / 9.4 (0/601) | 8.3 / 9.2 / 9.4 (0/602) | 8.3 / 16.7 / 17.5 (0/544) |
| svg-lod | pan-1x | 10.0 / 10.4 / 11.0 (0/500) | 8.4 / 16.9 / 17.7 (0/515) | 16.6 / 25.0 / 34.0 (1/317) |
| svg-lod | pan-fit | 10.0 / 10.6 / 11.0 (0/501) | 8.3 / 9.2 / 9.4 (0/601) | 8.3 / 9.2 / 9.4 (0/601) |
| svg-lod | zoom | 10.0 / 10.7 / 20.0 (0/495) | 25.0 / 34.1 / 109.0 (23/190) | 41.0 / 58.2 / 184.1 (82/121) |
| svg-lod | drag | 10.0 / 10.3 / 10.9 (0/501) | 9.3 / 17.3 / 24.9 (0/404) | 17.0 / 25.8 / 41.7 (3/254) |
| svg-lod | hover | 10.0 / 10.6 / 11.1 (0/500) | 8.3 / 9.2 / 9.4 (0/600) | 8.4 / 16.7 / 17.7 (0/537) |
| svg-use | pan-1x | 10.0 / 10.7 / 30.1 (0/498) | 25.0 / 83.4 / 116.6 (48/126) | 33.2 / 34.2 / 41.3 (53/162) |
| svg-use | pan-fit | 20.0 / 30.4 / 40.0 (1/214) | 83.3 / 108.5 / 133.3 (63/63) | 33.4 / 42.0 / 49.1 (70/144) |
| svg-use | zoom | 10.0 / 20.3 / 30.7 (0/415) | 158.3 / 541.6 / 1158.3 (24/24) | 66.6 / 75.6 / 75.9 (77/77) |
| svg-use | drag | 10.0 / 10.5 / 11.0 (0/501) | 58.5 / 83.3 / 83.4 (78/79) | 33.3 / 40.7 / 42.3 (58/154) |
| svg-use | hover | 10.0 / 10.5 / 11.1 (0/500) | 8.4 / 66.7 / 91.8 (46/275) | 8.4 / 25.2 / 34.1 (1/451) |
| react | pan-1x | 8.3 / 8.8 / 9.3 (0/601) | 17.1 / 25.3 / 25.9 (0/262) | 25.9 / 34.1 / 42.5 (36/172) |
| react | pan-fit | 25.0 / 25.3 / 34.2 (2/217) | 24.9 / 31.1 / 34.0 (5/215) | 33.3 / 41.1 / 41.8 (57/153) |
| react | zoom | 8.4 / 25.0 / 41.7 (1/457) | 33.6 / 42.3 / 42.6 (87/140) | 57.9 / 64.1 / 67.6 (90/90) |
| react | drag | 8.3 / 8.5 / 9.4 (0/601) | 17.6 / 25.8 / 26.0 (0/241) | 33.7 / 42.4 / 74.1 (87/138) |
| react | hover | 8.3 / 8.7 / 16.7 (0/597) | 8.4 / 16.9 / 17.6 (0/521) | 8.4 / 25.3 / 34.1 (2/444) |
| canvas | pan-1x | 8.3 / 8.7 / 9.3 (0/601) | 16.6 / 24.9 / 33.4 (0/322) | 25.0 / 33.4 / 50.0 (11/202) |
| canvas | pan-fit | 25.0 / 33.6 / 41.8 (18/208) | 50.1 / 58.8 / 59.1 (96/96) | 83.5 / 100.1 / 100.7 (59/59) |
| canvas | zoom | 8.3 / 25.0 / 41.7 (4/478) | 8.5 / 49.3 / 58.4 (33/361) | 8.8 / 74.2 / 84.3 (33/279) |
| canvas | drag | 8.3 / 8.5 / 9.3 (0/600) | 16.9 / 25.5 / 26.0 (0/259) | 32.7 / 34.2 / 42.2 (43/166) |
| canvas | hover | 8.3 / 9.1 / 9.4 (0/601) | 8.4 / 16.8 / 17.6 (0/516) | 8.4 / 25.3 / 34.1 (4/446) |

### 2. Same scene, Chromium headless shell (software raster, 60 Hz display)

Frame times are multiples of 16.7 ms here, so p95 is coarse (16.7, 33.3, 50 and so on).

| proto | interaction | 1x p50/p95/max (>33ms frames) | 4x p50/p95/max (>33ms frames) | 6x p50/p95/max (>33ms frames) |
|---|---|---|---|---|
| svg-plain | pan-1x | 16.7 / 16.7 / 16.8 (0/301) | 16.7 / 33.3 / 33.4 (5/275) | 33.3 / 33.4 / 33.5 (37/178) |
| svg-plain | pan-fit | 16.7 / 33.4 / 33.4 (10/241) | 16.7 / 33.4 / 50.1 (14/215) | 33.3 / 50.0 / 50.1 (40/154) |
| svg-plain | zoom | 16.7 / 16.8 / 33.4 (4/293) | 33.3 / 50.0 / 50.1 (31/141) | 50.0 / 66.7 / 66.8 (90/90) |
| svg-plain | drag | 16.7 / 16.8 / 16.8 (0/301) | 16.7 / 33.3 / 33.4 (4/269) | 33.3 / 33.4 / 50.1 (29/170) |
| svg-plain | hover | 16.7 / 16.7 / 33.3 (0/300) | 16.7 / 16.7 / 16.8 (0/301) | 16.7 / 16.7 / 33.3 (0/299) |
| svg-cull | pan-1x | 16.7 / 16.8 / 16.8 (0/301) | 16.7 / 16.7 / 16.8 (0/302) | 16.7 / 33.3 / 33.5 (6/284) |
| svg-cull | pan-fit | 16.7 / 33.4 / 33.5 (13/236) | 33.3 / 33.4 / 50.0 (20/181) | 33.4 / 50.0 / 50.1 (52/133) |
| svg-cull | zoom | 16.7 / 16.8 / 33.4 (1/290) | 33.3 / 50.1 / 66.7 (35/175) | 33.4 / 83.3 / 83.4 (56/108) |
| svg-cull | drag | 16.7 / 16.7 / 16.8 (0/301) | 16.7 / 16.7 / 16.8 (0/301) | 16.7 / 16.8 / 33.3 (0/299) |
| svg-cull | hover | 16.7 / 16.7 / 33.3 (0/300) | 16.7 / 16.7 / 16.8 (0/301) | 16.7 / 16.7 / 16.8 (0/301) |
| svg-use | pan-1x | 16.7 / 16.7 / 16.8 (0/301) | 16.7 / 33.3 / 33.4 (7/257) | 33.3 / 33.4 / 50.0 (34/168) |
| svg-use | pan-fit | 16.7 / 33.4 / 33.4 (6/256) | 16.7 / 33.5 / 50.1 (14/206) | 33.3 / 50.0 / 50.1 (18/151) |
| svg-use | zoom | 16.7 / 16.8 / 33.4 (2/292) | 49.9 / 50.1 / 50.1 (65/120) | 66.7 / 66.8 / 83.3 (77/77) |
| svg-use | drag | 16.7 / 16.8 / 16.8 (0/301) | 16.7 / 33.4 / 33.4 (5/260) | 33.3 / 33.4 / 50.1 (25/159) |
| svg-use | hover | 16.7 / 16.7 / 16.8 (0/301) | 16.7 / 16.8 / 16.8 (0/301) | 16.7 / 33.3 / 33.4 (7/279) |
| react | pan-1x | 16.7 / 16.8 / 16.8 (0/301) | 16.7 / 33.3 / 33.4 (4/266) | 33.3 / 33.4 / 50.1 (23/176) |
| react | pan-fit | 16.7 / 33.4 / 33.4 (6/251) | 16.7 / 33.4 / 50.1 (11/211) | 33.3 / 50.0 / 50.1 (34/153) |
| react | zoom | 16.7 / 16.8 / 33.4 (0/295) | 33.4 / 50.0 / 50.1 (34/138) | 50.0 / 66.7 / 66.8 (90/90) |
| react | drag | 16.7 / 16.7 / 16.8 (0/301) | 16.7 / 33.4 / 33.4 (12/243) | 33.3 / 33.4 / 50.0 (35/158) |
| react | hover | 16.7 / 16.8 / 16.8 (0/301) | 16.7 / 16.7 / 16.8 (0/301) | 16.7 / 16.8 / 33.4 (2/292) |
| canvas | pan-1x | 16.7 / 16.8 / 16.8 (0/301) | 50.0 / 66.7 / 66.8 (91/96) | 83.3 / 100.0 / 100.1 (62/62) |
| canvas | pan-fit | 33.3 / 50.0 / 50.1 (36/139) | 150.0 / 166.7 / 166.7 (34/34) | 233.3 / 250.1 / 266.6 (22/22) |
| canvas | zoom | 16.7 / 33.4 / 50.1 (8/245) | 33.3 / 150.0 / 166.6 (34/125) | 33.4 / 233.2 / 250.0 (35/84) |
| canvas | drag | 16.7 / 16.8 / 16.8 (0/301) | 66.6 / 66.7 / 66.8 (83/83) | 83.4 / 100.0 / 100.1 (57/57) |
| canvas | hover | 16.7 / 16.8 / 33.4 (1/298) | 16.7 / 50.0 / 66.7 (37/225) | 16.7 / 83.4 / 83.4 (30/182) |
| svg-lod | pan-1x | 16.7 / 16.7 / 16.8 (0/301) | 16.7 / 16.7 / 16.8 (0/301) | 16.7 / 33.3 / 33.5 (7/270) |
| svg-lod | pan-fit | 16.7 / 16.8 / 16.8 (0/301) | 16.7 / 16.7 / 16.8 (0/301) | 16.7 / 16.7 / 16.8 (0/301) |
| svg-lod | zoom | 16.7 / 16.8 / 33.4 (0/300) | 16.7 / 33.4 / 116.8 (15/199) | 50.0 / 66.8 / 183.3 (71/102) |
| svg-lod | drag | 16.7 / 16.7 / 16.8 (0/301) | 16.7 / 16.7 / 16.8 (0/301) | 16.7 / 33.3 / 33.5 (10/263) |
| svg-lod | hover | 16.7 / 16.7 / 16.8 (0/301) | 16.7 / 16.8 / 33.3 (0/299) | 16.7 / 16.7 / 33.3 (0/299) |

### 3. Same scene, Playwright WebKit 27.2, 1x only, headless

| proto | interaction | 1x p50/p95/max (>33ms frames) |
|---|---|---|
| svg-plain | pan-1x | 13.0 / 20.0 / 25.0 (0/359) |
| svg-plain | pan-fit | 61.0 / 63.0 / 64.0 (82/82) |
| svg-plain | zoom | 10.0 / 51.0 / 63.0 (31/330) |
| svg-plain | drag | 10.0 / 11.0 / 11.0 (0/501) |
| svg-plain | hover | 10.0 / 11.0 / 11.0 (0/501) |
| svg-cull | pan-1x | 16.0 / 20.0 / 23.0 (0/312) |
| svg-cull | pan-fit | 60.0 / 62.0 / 63.0 (84/84) |
| svg-cull | zoom | 14.0 / 55.0 / 61.0 (32/267) |
| svg-cull | drag | 10.0 / 11.0 / 11.0 (0/501) |
| svg-cull | hover | 10.0 / 11.0 / 12.0 (0/501) |
| svg-use | pan-1x | 13.0 / 20.0 / 22.0 (0/361) |
| svg-use | pan-fit | 61.0 / 65.0 / 68.0 (82/82) |
| svg-use | zoom | 10.0 / 53.0 / 62.0 (32/330) |
| svg-use | drag | 10.0 / 11.0 / 11.0 (0/500) |
| svg-use | hover | 10.0 / 11.0 / 12.0 (0/501) |
| react | pan-1x | 13.0 / 20.0 / 28.0 (0/357) |
| react | pan-fit | 60.0 / 64.0 / 66.0 (84/84) |
| react | zoom | 10.0 / 53.0 / 70.0 (31/324) |
| react | drag | 10.0 / 11.0 / 11.0 (0/500) |
| react | hover | 10.0 / 11.0 / 12.0 (0/500) |
| canvas | pan-1x | 13.0 / 20.0 / 26.0 (0/348) |
| canvas | pan-fit | 47.0 / 49.0 / 51.0 (106/106) |
| canvas | zoom | 10.0 / 47.0 / 48.0 (37/328) |
| canvas | drag | 20.0 / 20.0 / 21.0 (0/271) |
| canvas | hover | 10.0 / 11.0 / 21.0 (0/500) |
| svg-lod | pan-1x | 13.0 / 20.0 / 26.0 (0/357) |
| svg-lod | pan-fit | 22.0 / 22.0 / 23.0 (0/232) |
| svg-lod | zoom | 10.0 / 23.0 / 150.0 (3/364) |
| svg-lod | drag | 10.0 / 11.0 / 11.0 (0/500) |
| svg-lod | hover | 10.0 / 11.0 / 11.0 (0/501) |

### 4. Scene size and pixel ratio (Chromium headed, throttle 1x)

Rows with 500/1000 and dpr 1 repeat the table 1 numbers.

5
| parts/wires | dpr | proto | interaction | p50 / p95 / max |
|---|---|---|---|---|
| 100/200 | 1 | svg-plain | pan-fit | 8.3 / 9.0 / 16.2 |
| 100/200 | 1 | svg-plain | zoom | 8.3 / 8.9 / 9.4 |
| 100/200 | 1 | react | pan-fit | 10.0 / 10.7 / 11.0 |
| 100/200 | 1 | react | zoom | 10.0 / 10.3 / 11.0 |
| 100/200 | 1 | canvas | pan-fit | 8.3 / 8.9 / 9.4 |
| 100/200 | 1 | canvas | zoom | 8.3 / 8.8 / 9.3 |
| 250/500 | 1 | svg-plain | pan-fit | 8.4 / 16.7 / 33.4 |
| 250/500 | 1 | svg-plain | zoom | 8.3 / 16.7 / 17.5 |
| 250/500 | 1 | react | pan-fit | 8.4 / 16.8 / 33.4 |
| 250/500 | 1 | react | zoom | 8.3 / 16.6 / 17.3 |
| 250/500 | 1 | canvas | pan-fit | 9.1 / 41.7 / 58.3 |
| 250/500 | 1 | canvas | zoom | 8.4 / 33.4 / 49.9 |
| 500/1000 | 1 | svg-plain | pan-fit | 25.0 / 25.8 / 33.6 |
| 500/1000 | 1 | svg-plain | zoom | 8.4 / 25.0 / 33.4 |
| 500/1000 | 1 | react | pan-fit | 25.0 / 25.3 / 34.2 |
| 500/1000 | 1 | react | zoom | 8.4 / 25.0 / 41.7 |
| 500/1000 | 1 | canvas | pan-fit | 25.0 / 33.6 / 41.8 |
| 500/1000 | 1 | canvas | zoom | 8.3 / 25.0 / 41.7 |
| 500/1000 | 2 | svg-plain | pan-1x | 8.4 / 33.4 / 58.3 |
| 500/1000 | 2 | svg-plain | pan-fit | 25.1 / 33.6 / 65.8 |
| 500/1000 | 2 | svg-plain | zoom | 50.8 / 66.4 / 75.1 |
| 500/1000 | 2 | svg-lod | pan-1x | 8.3 / 9.2 / 9.4 |
| 500/1000 | 2 | svg-lod | pan-fit | 8.3 / 9.2 / 9.4 |
| 500/1000 | 2 | svg-lod | zoom | 8.3 / 9.2 / 24.6 |
| 500/1000 | 2 | canvas | pan-1x | 8.3 / 8.8 / 9.4 |
| 500/1000 | 2 | canvas | pan-fit | 25.0 / 40.8 / 42.6 |
| 500/1000 | 2 | canvas | zoom | 8.4 / 25.1 / 41.7 |

### 5. DOM and scene size

| Prototype | DOM elements in page | Notes |
|---|---|---|
| svg-plain, svg-cull, react | 48,601 (47,097 art elements, 1,000 wire polylines, 500 part groups, 4 wrappers) | svg-lod: 49,601 (adds 500 outline rectangles) |
| svg-use | 4,465 in the light DOM | the browser still instantiates about 47k shadow elements |
| canvas | 1 canvas element | 47,097 `Path2D` objects held in JS |
| Scene build and first paint | 95.6 ms for the headless svg-plain mount (single sample) | |

### 6. Bundle size (gzip level 9, minified, esbuild 0.28.2)

| Build | JS min | JS gzip | JS brotli | CSS gzip |
|---|---|---|---|---|
| Scene data only (shared by both) | 767 B | 392 B | 355 B | 0 |
| Vanilla core + scene | 3,417 B | 1,609 B | 1,442 B | 0 |
| `@xyflow/react` app: xyflow + React + ReactDOM + scene | 410,367 B | 130,940 B | 112,405 B | 2,656 B |
| `@xyflow/react` only (React and ReactDOM external) | 184,804 B | 61,581 B | 53,713 B | 2,656 B |
| React + ReactDOM alone (`createRoot` only) | 222,718 B | 68,848 B | 59,322 B | 0 |

The vanilla core is 53 physical lines (dense, about 3.4 KB) and the xyflow entry is 15 lines. The whole benchmark harness with three prototypes and the scene model is 261 lines, under the 400 line budget.

## Verdict: INCONCLUSIVE

The exit condition is p95 under 20 ms on a mid-range Android phone and on a school-grade Chromebook. I had neither, so the condition cannot be judged as written. What the proxies say:

- On this M4 Pro at 1x with GPU raster, vanilla SVG and React SVG meet p95 under 20 ms in pan at zoom 1, drag and hover (p95 8.5 to 9.0 ms). They miss it in the fit-everything view and in zoom: svg-plain pan-fit p95 25.8 ms, zoom 25.0 ms; react pan-fit 25.3 ms, zoom 25.0 ms. Both stay under the 33 ms fail trigger at 1x, with a few frames over 33 ms (1 of 461 in zoom, 2 of 216 in pan-fit).
- With CPU throttle 4x, plain SVG and React reach p95 42 ms in zoom, over the 33 ms fail trigger. At 6x, p95 is 34 ms or more in every interaction except hover, and 66 ms in zoom. Throttle is a rough stand-in only: it slows JS and layout but not the GPU or memory bandwidth, and it says nothing about a phone GPU.
- At device pixel ratio 2 (a phone-like ratio), plain SVG at 1x already has p95 33.4 ms in pan and 66.4 ms in zoom.
- Level of detail (svg-lod) changes the result most: headed 1x p95 10.3 to 10.7 ms in all five interactions, headed 4x p95 under 20 ms except zoom (34.1 ms), DPR 2 p95 9.2 ms in pan, pan-fit and zoom (max 24.6 ms in zoom). At 6x it still fails in zoom (58 ms) and pan (25 ms).
- Canvas 2D as built (full redraw, no bitmap cache) was worse than SVG in the fit view and in zoom at every setting: headed 1x p95 33.6 ms in pan-fit, headless 1x 50 ms, and 167 to 250 ms per frame in pan-fit at 4x and 6x headless. On the GPU its zoom median at 4x and 6x was better (p50 8.5 and 8.8 ms against 34 and 58 ms) but its p95 was not (49 and 74 ms against 42 and 67 ms).
- WebKit 1x: svg-plain p95 20 ms in pan at zoom 1, 63 ms in pan-fit (all 82 frames over 33 ms), 51 ms in zoom; drag and hover are fine (11 ms). svg-lod brings pan-fit to 22 ms. Canvas in WebKit is no better (pan-fit 49 ms).

So the answer is conditional, not yes or no. A full-detail 500 part scene on screen at once is not safe for plain SVG or React SVG on a throttled CPU, a high pixel ratio or WebKit. The same scene passes at 1x on this machine in Chromium with level of detail. Whether it passes on real devices stays open.

## Caveats

- Real phones and Chromebooks were NOT tested. CPU throttling at 4x and 6x is an approximation of a slower CPU only. It does not model the GPU, memory, thermal limits or the compositor of a real device. The device question stays open.
- Safari on iOS and Chrome on ChromeOS were not run. WebKit here is the Playwright desktop build, headless, at one pixel ratio, with the rAF interval at about 10 ms. Its `performance.now` resolution is 1 ms, so its jsP95 reads 0 to 1.
- The real figure pages apply a hand-drawn SVG filter (feTurbulence plus feDisplacementMap, with a 580 KB data URL per page). I dropped it. Filters on 500 parts are likely much slower than anything measured here. If the product keeps that look in the editor, this spike understates the cost. A flat, filter-free part style (or the filter only on a hover or selection) is a precondition for these numbers.
- Part art is the "figure" version: an isometric drawing with 12 to 687 elements, not an editor-specific schematic symbol. The mean (93.6) is a little above the 40 to 80 the spike asked for for generated parts. The editor may use simpler art.
- rAF deltas capture main-thread work and compositor back-pressure, but they do not directly show GPU raster time. The headless shell rasterises on the CPU. Headed Chromium is the better proxy for a GPU browser, but a window on a 120 Hz display can still be affected by the system. The two modes disagree in places (for example svg-use at 4x is much worse headed).
- Load average was 2.7 to 12.4 because another spike lane ran at the same time. Numbers above 20 ms at 1x could move by a frame in either direction. Each configuration was measured once (one 5 s run per cell), so small differences (for example svg-plain against react at 1x) are noise.
- Wires are local (within 3 cells) and drawn as 1,000 separate polylines. Long wires across the board or wire crossings are not modelled. The drag moves one part with about 4 wires.
- Canvas was implemented once, in the straightforward way. A tuned version (parts cached as bitmaps, or WebGL via Pixi) was not built and could beat these numbers. The comparison shows only that naive full-redraw Canvas 2D is not an easy win.
- The xyflow comparison covers bundle size only, with a 3-node scene. I did not measure xyflow frame times at 500 nodes and 1,000 edges. The vanilla core has far fewer features than xyflow (no selection box, minimap, keyboard handling, undo, edge labels, accessibility, connection validation). Its size is a floor, not a like-for-like replacement.
- `@xyflow/react` needed `connectionMode="loose"` for edges between two handles of the same type.

## What this means for the architecture

HYPOTHESIS: keep D4 (SVG with a thin custom core) but add three rules before more UI work. First, treat the number of drawn art elements as the budget, not the number of parts: 47k elements in view is what hurts. Second, ship level of detail from the start (outline rectangles when zoomed out, plus viewport culling); in this spike LOD turned p95 25 ms into 10 ms in the fit view and the DPR 2 case, with wires still as 1,000 SVG polylines, so the wires are not the first problem and the "Canvas for wires only" fallback would not have helped here. Third, do not use the hand-drawn filter in the editor canvas. React SVG with memoised parts tracked vanilla SVG closely at 1x in every interaction (drag and hover JS cost 0.4 to 1.9 ms), so the choice between them can be made on team and tooling grounds, not frame rate. On size, the custom core is about 1.6 KB gzipped against 131 KB gzipped for xyflow with React (62 KB for xyflow alone), and the prototype is far under 400 lines, so the "choose the smaller" rule favours the custom core unless xyflow's built-in features are worth about 60 KB. Real device measurement (a mid-range Android phone, a school Chromebook, iOS Safari) is still required before D4 is closed.

## How to reproduce

Needs Node 20 or later, the Playwright Chromium and WebKit browsers, and the iynk repo at `/Users/amar/Codes/ak/simlab` for the artwork pages. Port 4517 is used by the local server.

```
mkdir -p ~/iynk-master-plan-scratch/spikes/RS-01 && cd ~/iynk-master-plan-scratch/spikes/RS-01
cp -R <this folder>/src/* . && mkdir -p public results && cp parts.json public/
npm init -y && npm i playwright@latest react@19 react-dom@19 esbuild @xyflow/react
# extract artwork (optional, parts.json is included): node extract.mjs
node build.mjs && (node server.mjs &)
HEADED=1 node run.mjs chromium 1 svg-plain,svg-cull,svg-lod,svg-use,react,canvas 500 1000 1   # args: browser throttle protos parts wires dpr [interactions]
node run.mjs chromium 4 svg-plain,react,canvas 500 1000 1
PLAYWRIGHT_BROWSERS_PATH=$PWD/browsers npx playwright install webkit && PLAYWRIGHT_BROWSERS_PATH=$PWD/browsers node run.mjs webkit 1 svg-plain,react,canvas 500 1000 1
node table2.mjs headed-chromium      # prints tables like the ones above
node sizes.mjs                       # bundle sizes
node unotest.mjs                     # builds and smoke-tests the Uno scenes
```

`matrix.sh`, `matrix2.sh` and `matrix3.sh` are the exact batches I ran. Raw per-row results (with load1m) are in `results/*.json`; logs in `results/*.log`. Screenshots of the vanilla and xyflow Uno scenes and of three prototypes at 500 parts are in `results/*.png`. Kill the server with `pkill -f server.mjs` when done.

## Independent check (2026-10-27)

Checker: a second agent, same machine (Apple M4 Pro, 14 cores, arm64, Node v24.8.0), same scratch folder `~/iynk-master-plan-scratch/spikes/RS-01/`. I diffed the scratch sources against `src/` first: build.mjs, run.mjs, server.mjs, table2.mjs, sizes.mjs, scene.js, bench.js, proto-*.js(x) and index.html are identical.

What I ran (new runs, one 5 s run per cell, written to new result files; I tabulated only my own files):

- `node build.mjs`, `node server.mjs`
- `HEADED=1 node run.mjs chromium 1 svg-plain,svg-cull,svg-lod,svg-use,react,canvas 500 1000 1` (all 30 cells)
- `HEADED=1 node run.mjs chromium 4 svg-plain,react,canvas,svg-lod 500 1000 1` (20 cells; I skipped svg-cull and svg-use at 4x)
- `node sizes.mjs`
- Not re-run: headless shell, WebKit, 6x throttle, DPR 2, the 100 and 250 part scenes, the Uno smoke test.
- Load (1-minute average) was 3.1 to 5.0 during the runs. The per-row load1m values were 2.9 to 8.0. Never above 10. The server was killed afterwards (port 4517 free).

### Tolerance

Headed Chromium on a 120 Hz display quantises frames to 8.3 ms steps, so p95 moves in steps of one display frame. I called a number a match if p50 and p95 are within one display frame (about 8.3 ms) of the report and on the same side of the 20 ms and 33 ms thresholds, and counted the over-33 ms frame share as a match if it is within about 5 points of the report's. Single 5 s runs and a concurrent lane make a tighter tolerance meaningless.

### Numbers (p50 / p95 / max, ms; mine against the report)

| proto | interaction | 1x mine | 1x report | 4x mine | 4x report |
|---|---|---|---|---|---|
| svg-plain | pan-1x | 8.3 / 9.4 / 10.3 | 8.3 / 9.0 / 9.4 | 24.8 / 27.0 / 35.0 | 16.9 / 25.2 / 26.0 |
| svg-plain | pan-fit | 25.0 / 25.9 / 33.6 | 25.0 / 25.8 / 33.6 | 25.1 / 33.7 / 35.1 | 24.9 / 25.9 / 33.4 |
| svg-plain | zoom | 8.4 / 25.0 / 42.6 | 8.4 / 25.0 / 33.4 | 41.6 / 49.6 / 50.3 | 34.1 / 42.4 / 42.6 |
| svg-plain | drag | 8.3 / 9.9 / 18.0 | 8.3 / 8.8 / 16.6 | 25.1 / 33.3 / 34.4 | 17.5 / 25.8 / 26.0 |
| svg-plain | hover | 8.3 / 9.7 / 10.4 | 8.3 / 8.8 / 9.3 | 8.4 / 16.9 / 18.5 | 8.4 / 16.7 / 17.6 |
| react | pan-1x | 8.3 / 9.3 / 10.3 | 8.3 / 8.8 / 9.3 | 24.8 / 31.9 / 43.2 | 17.1 / 25.3 / 25.9 |
| react | pan-fit | 25.0 / 26.2 / 34.3 | 25.0 / 25.3 / 34.2 | 25.1 / 34.0 / 35.1 | 24.9 / 31.1 / 34.0 |
| react | zoom | 8.4 / 25.0 / 33.4 | 8.4 / 25.0 / 41.7 | 41.6 / 49.6 / 51.6 | 33.6 / 42.3 / 42.6 |
| react | drag | 8.3 / 9.5 / 10.3 | 8.3 / 8.5 / 9.4 | 25.1 / 33.6 / 35.2 | 17.6 / 25.8 / 26.0 |
| react | hover | 8.3 / 10.1 / 10.4 | 8.3 / 8.7 / 16.7 | 8.4 / 17.5 / 18.7 | 8.4 / 16.9 / 17.6 |
| svg-lod | pan-1x | 8.3 / 10.2 / 10.4 | 10.0 / 10.4 / 11.0 | 9.8 / 18.0 / 25.7 | 8.4 / 16.9 / 17.7 |
| svg-lod | pan-fit | 8.3 / 10.2 / 10.4 | 10.0 / 10.6 / 11.0 | 8.3 / 10.0 / 10.3 | 8.3 / 9.2 / 9.4 |
| svg-lod | zoom | 8.3 / 10.0 / 18.6 | 10.0 / 10.7 / 20.0 | 23.9 / 34.7 / 108.0 | 25.0 / 34.1 / 109.0 |
| svg-lod | drag | 8.3 / 9.5 / 10.3 | 10.0 / 10.3 / 10.9 | 9.5 / 17.9 / 18.5 | 9.3 / 17.3 / 24.9 |
| svg-lod | hover | 8.3 / 9.6 / 10.4 | 10.0 / 10.6 / 11.1 | 8.3 / 10.1 / 10.4 | 8.3 / 9.2 / 9.4 |
| canvas | pan-1x | 8.3 / 10.2 / 10.4 | 8.3 / 8.7 / 9.3 | 16.6 / 24.5 / 34.6 | 16.6 / 24.9 / 33.4 |
| canvas | pan-fit | 24.8 / 40.1 / 42.8 | 25.0 / 33.6 / 41.8 | 51.2 / 58.7 / 60.1 | 50.1 / 58.8 / 59.1 |
| canvas | zoom | 8.4 / 25.1 / 35.3 | 8.3 / 25.0 / 41.7 | 8.9 / 49.2 / 59.7 | 8.5 / 49.3 / 58.4 |
| canvas | drag | 8.3 / 10.2 / 10.4 | 8.3 / 8.5 / 9.3 | 17.5 / 26.0 / 26.9 | 16.9 / 25.5 / 26.0 |
| canvas | hover | 8.3 / 10.1 / 10.3 | 8.4 / 9.1 / 9.4 | 8.4 / 17.1 / 24.8 | 8.4 / 16.8 / 17.6 |

svg-cull and svg-use at 1x also reproduce: pan-1x p95 9.5 and 9.4 (report 9.1 and 10.7), pan-fit p95 26.8 and 25.8 (report 25.2 and 30.4), zoom p95 25.0 and 25.0 (report 25.0 and 20.3). Bundle sizes from `sizes.mjs` are byte-identical to section 6 (vanilla 1,609 B gzip, xyflow app 130,940 B, xyflow alone 61,581 B, React and ReactDOM 68,848 B).

### Does it match

- 1x: yes. All 30 cells are within the tolerance, and every pass/fail reading against 20 ms and 33 ms is the same. The one cell that crosses a step is canvas pan-fit p95 (40.1 against 33.6; 24 against 18 frames over 33 ms of about 207), which stays "worse than SVG in the fit view" as the report says.
- 4x: the pattern matches, the values run higher. Mine is one display frame slower on p95 in about half the cells (for example svg-plain pan-1x 27.0 against 25.2, react pan-1x 31.9 against 25.3, drag 33 against 26). The main claim, "plain SVG and React reach p95 over 33 ms in zoom at 4x", holds (49.6 against 42.4), and so does "LOD stays under 20 ms at 4x except zoom (34.7)". In my runs svg-plain and react pan-fit and drag at 4x also sit at or just over 33 ms (33.3 to 34.0), where the report had 26 to 31. So the report's 4x table is, if anything, slightly kind to plain SVG and React. Load was lower in my run than in the report's (3 to 8 against up to 12), so this is run-to-run spread under CPU throttle, not a load effect I can explain.
- Not re-checked: 6x, headless, WebKit, DPR 2, scene-size sweep. I make no claim about them.

### Is the verdict right

INCONCLUSIVE follows from the exit condition. The condition is written for a phone and a Chromebook; neither was tested, and a throttled M4 Pro is not either device (no phone GPU, memory or thermal model). It is not generous: the report does not say PASS anywhere and states that full-detail plain SVG and React miss 20 ms (p95 about 25 ms) in the fit view and in zoom even on the fast machine at 1x. I confirmed that.

One point I would tighten. The report says the answer is conditional. On the evidence, the full-art, no-LOD configuration (plain SVG or React) is not a PASS candidate: it misses 20 ms on the M4 Pro itself in two of five interactions, and at 4x it is over the 33 ms fail trigger in zoom in both runs. Only the LOD variant is a plausible PASS candidate. So the sharper reading is "full art on screen: likely FAIL on real devices; LOD: untested on real devices". The verdict label can stay INCONCLUSIVE, but the architecture paragraph should not be read as "SVG is fine".

### Is the method sound and fair

- It measures the stated question only partly. rAF deltas in headed Chromium capture main-thread and compositor stalls, but 4x and 6x CPU throttle is a proxy for a phone, and the exit condition is about devices. The report says so.
- Same scene and same seed for all prototypes: yes, confirmed in `scene.js` and the shared bench. The svg-plain, svg-cull, svg-use and react comparisons are like for like.
- svg-lod is not the same input. Below zoom 0.7 it draws 500 outline rectangles instead of 47k art elements, so its low numbers measure a different (cheaper) picture. The report presents it as a technique, not as a like-for-like row, which is fair, but "LOD turned p95 25 ms into 10 ms" compares different workloads. The editor must accept that parts look like boxes when zoomed out.
- Canvas is not a fair rival to svg-lod. It has part culling but no LOD, no bitmap cache and full redraw of 47k paths. The report says this. The conclusion that "Canvas for wires only would not have helped" is supported only for this scene, where wires are 1,000 polylines.
- The hand-drawn filter was dropped. This is the largest threat to the numbers (a feDisplacementMap on 500 parts), and the report flags it as a precondition. I agree it is the main caveat.
- Each cell is one 5 s run. Differences under about one display frame, and svg-plain against react at 1x, are noise. My second run agrees with that.
- The 500-part drag moves one part with about 4 wires and hover highlights one net, so those interactions are cheap by design and should not be read as "editing is fine at 500 parts".

### Corrections

No change to the verdict. Two additions to the caveats: (1) the 4x throttle results vary by about one display frame between runs, and plain SVG and React pan-fit and drag at 4x can land on either side of 33 ms; (2) the fit-view and zoom cases of full-detail SVG fail the 20 ms bar on the M4 Pro with no throttle, which makes a pass on a real phone or Chromebook unlikely for that configuration.
