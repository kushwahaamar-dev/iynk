# Platform options for an original-project hardware editor

Research date: 2026-10-26. Target stack: Next.js 16, React 19, TypeScript. All prices are USD and "as of 2026-10-26" unless stated.

Labels: TESTED (done hands-on here), EXTERNAL (a cited source states it), ESTIMATED (my calculation, assumptions shown), HYPOTHESIS, UNKNOWN.

## 0. Findings that change plans

| # | Finding | Label | Source |
|---|---|---|---|
| 1 | The hosted PartyKit platform stops deploys on 16 Oct and shuts down on 23 Oct 2026 (already past). Do not build on hosted PartyKit. | EXTERNAL | [S72] |
| 2 | Replicache's repo was archived by its owner on 2026-06-10. Zero (same company) is the live product. | EXTERNAL | [S73] |
| 3 | `dimforge/rapier.js` is archived and merged into `dimforge/rapier` (`typescript` dir). npm `@dimforge/rapier3d-compat` 0.21.0 was still published 2026-09-25. | EXTERNAL | [S44] [S45] |
| 4 | tldraw's SDK is source-available, not open source. Production use needs a licence key (trial, hobby or paid). Prices are not public. | EXTERNAL | [S32] [S33] [S34] |
| 5 | Vercel Functions now serve WebSockets (GA 2026-10-20). Next.js has no native upgrade API; use `upgradeWebSocket()` from `@vercel/functions` 3.10.0+. Connections end at the function max duration (300 s Hobby, 800 s Pro, 1800 s beta). The GA date is in [S18]; the `upgradeWebSocket()` and 3.10.0 detail is in [S17] (the S18 changelog does not mention it). A Vercel KB blurb linked from [S16] and [S17] still says "public beta", so the status wording is inconsistent on Vercel's side. | EXTERNAL | [S17] [S16] [S18] |
| 6 | Gemini 3.5 Flash is not on Google's pricing or models pages. The text models listed are Gemini 4 Argon ($2.00 in / $10.00 out, no free tier), 3.8 Flash, 3.6 Flash, 3.5 Flash-Lite, 3.1 Flash-Lite and 3.1 Pro Preview. Gemini 4 Argon doubles on 2026-12-01; 3.8 Flash and 3.6 Flash double on 2027-01-01. Fact-check 2026-10-26: Gemini 4 Argon was missing from the first draft. | EXTERNAL | [S4] [S5] |
| 7 | Meta's Muse Spark 1.1 API is in US-only public preview at $1.25 in / $4.25 out. I could not load Meta's own pricing page. | EXTERNAL (secondary) | [S8] [S9] |
| 8 | At 50 to 500 parts, SVG and a naive Canvas 2D both held 60 Hz in my test. SVG was faster than full-redraw Canvas at large sizes. | TESTED | [S78] |

## 1. Editor canvas

### 1.1 SVG vs Canvas 2D vs WebGL/WebGPU

| Tech | Strengths | Weak points | Evidence |
|---|---|---|---|
| SVG (DOM) | Crisp at any zoom, CSS and React-friendly, per-element events and accessibility for free, easy export | DOM size becomes the limit at a few thousand elements | A 2018 vendor article calls SVG "the best option for rendering high-quality vector graphics" and best for technical drawings and export [S37] |
| Canvas 2D | Cheap for many simple shapes, no DOM | You build hit testing, text, accessibility and dirty-rect redraw yourself | Same article: faster than SVG for very simple graphics with thousands of elements [S37] |
| WebGL | Fastest for simple polygons at scale | Poor for text and complex vector detail | Academic poster: performance losses began above about 400 nodes (about 8,000 elements) for SVG, Canvas and WebGL; WebGL stayed near 50 FPS at 400,000 nodes without text. Secondary source (search snippet, PDF would not load) [S38] |
| WebGPU | Newer, more performant than WebGL in PixiJS 8 docs ("still maturing") | Not universal | See browser support below [S70] [S71] |

Published numbers are old. The vendor tables (2018 hardware) show, for N=5k nodes on a Surface i7-6650U: simple SVG 9 fps, simple Canvas 12 fps, simple WebGL 24 fps, optimized WebGL 60 fps. The vendor sells a WebGL library, so treat it as biased [S37]. A separate render-time claim (1000 objects: SVG about 10 ms, canvas 1 ms, Chrome 73) came through a search snippet only [S38].

WebGPU browser support (caniuse, 2026-10-26): global 87.82%. Full: Chrome 113+, Edge 113+, Safari on iOS 26+. Partial: desktop Safari 26 to 27.1 (TP). Firefox desktop: disabled by default through version 161; Firefox for Android 158 disabled by default; Chrome for Android supported from 156 [S70]. MDN marks it "Limited availability", not Baseline [S71]. A WebGPU-only editor would lose Firefox users today.

### 1.2 TESTED micro-benchmark (this session)

Setup: headless Chromium 156 on an Apple M4 Pro, 1900x1100, 60 Hz vsync, node 24. Each frame moves one part and updates its connected wires, then waits for the next animation frame. Parts are groups of simple rects and circles; wires are 4-segment paths (2 wires per part). SVG updates only changed attributes. Canvas 2D is a naive full redraw with no dirty rectangles and no caching. Script: `/private/tmp/claude-501/-Users-amar-Codes-ak-simlab/6a603069-dc65-486f-8236-8cec4f2cda15/scratchpad/research/tech/bench.mjs` [S78].

| Parts | Primitives per part | Total elements | SVG median / p95 (ms/frame) | Canvas 2D median / p95 (ms/frame) |
|---|---|---|---|---|
| 50 | 10 | 600 | 16.7 / 17.5 | 16.6 / 17.5 |
| 200 | 10 | 2,400 | 16.6 / 17.5 | 16.6 / 17.6 |
| 500 | 10 | 6,000 | 16.6 / 17.6 | 16.7 / 17.3 |
| 500 | 40 | 21,000 | 16.7 / 17.5 | 17.1 / 21.0 |
| 1,500 | 10 | 18,000 | 16.7 / 17.6 | 16.7 / 17.4 |
| 1,500 | 40 | 63,000 | 16.7 / 17.2 | 38.9 / 39.8 |
| 3,000 | 40 | 126,000 | 39.7 / 49.7 | 94.4 / 121.4 |
| 6,000 | 40 | 252,000 | 53.4 / 63.5 | 164.8 / 234.8 |

16.7 ms means the 60 Hz cap was held. Reading: for the stated 50 to 500 parts, both are far from their limit on this machine. Limits of this test: one fast desktop, no phone or low-end laptop, no text, no real part artwork with filters or gradients, no pan/zoom. A phone and a school Chromebook are UNKNOWN. This is the first spike worth running (section 9).

### 1.3 Libraries

Licence and version come from the GitHub API and npm registry on 2026-10-26 [S44] [S45]. "React 19" means peer range or package name matches React 19.

| Library | Licence (SPDX) | Latest (date) | Stars | Renders with | React 19 | Fit for a part-and-wire editor |
|---|---|---|---|---|---|---|
| React Flow / xyflow `@xyflow/react` | MIT | 12.12.0 (2026-09-24) | 38.8k | DOM nodes plus SVG edges (docs do not state it; common knowledge, not verified here) [S40] | peer `>=17` | Good for node graphs. Parts with pin-accurate wiring need custom nodes and handles. `onlyRenderVisibleElements` defaults to false, adds some overhead [S40]. Docs give no node-count thresholds, only memoization advice [S39] |
| tldraw `tldraw` | Custom "tldraw license", not OSI (`SEE LICENSE IN LICENSE.md`) | 5.5.2 (2026-10-02) | 51.1k | not verified | `^18.2 \|\| ^19.2.1` | Strong whiteboard engine. Production needs a key: 100-day trial, hobby (non-commercial, watermark, discretionary), or commercial via sales, "value-based pricing", startup discount exists, no price listed [S32] [S33]. Risky for an open mission unless the budget is agreed |
| Konva `konva` / `react-konva` | MIT | 10.9.0 / 19.3.2 (2026-10-15) | 14.9k | Canvas 2D | react-konva peer `^19.3.0` | Fine. Each layer holds two canvases, about 41 MB on a 1920x1080 retina stage; Konva warns above 5 layers; iOS Safari canvas memory limit reported at 256 or 384 MB [S41] |
| PixiJS `pixi.js` | MIT | 8.22.0 (2026-10-01) | 48.5k | WebGL default, WebGPU "more performant but still maturing" [S80] | not a React lib | Best raw scale. You build text, hit testing and wiring UX. Overkill for 500 parts |
| Fabric `fabric` | MIT | 7.4.0 (2026-05-18) | 31.5k | Canvas 2D | not a React lib | Object model suits drawing apps, not graph editors |
| JointJS `@joint/core` | MPL-2.0 | 4.3.3 (2026-09-04) | n/a | SVG | not React-specific | Core is free. JointJS+ (extra UI kit) is paid per developer, perpetual, 12 months of updates, prices not listed, cannot expose its API to developers [S35] |
| maxGraph `@maxgraph/core` | Apache-2.0 | 0.25.1 (2026-10-21) | 1.2k | SVG | not React-specific | Successor line of mxGraph/draw.io. Pre-1.0 API |
| GoJS `gojs` | Commercial (`SEE LICENSE IN license.html`) | 4.0.5 (2026-10-02) | n/a | Canvas | wrapper needed | Paid per developer and per application. Price UNKNOWN: the licence page I loaded lists no amounts [S36] |
| Excalidraw `@excalidraw/excalidraw` | MIT | 0.18.1 (2026-04-20) | 134.6k | Canvas-based [S42] | peer includes 19 | A whiteboard, not an electronics editor. Useful as a model for canvas, not as a base |
| Lit web components (Wokwi) `@wokwi/elements` | MIT | repo pushed 2026-10-25 | 266 | SVG inside web components | framework-agnostic | Part artwork only, "no functional simulation code" [S43]. Proven pattern for part art |

### 1.4 How others render

| Product | Rendering | Label | Source |
|---|---|---|---|
| Wokwi | Part art is SVG wrapped as Lit web components (`wokwi-elements`, MIT). How the main diagram editor draws wires: not documented in anything I could load | EXTERNAL for parts, UNKNOWN for the editor | [S43] |
| Tinkercad Circuits | UNKNOWN. The tinkercad.com/circuits HTML mentions "webgl" twice, which is weak evidence only (TESTED fetch, not a finding) | UNKNOWN | local fetch |
| Flux | UNKNOWN. No engineering source found. Web search quota ran out before I could look | UNKNOWN | none |
| EasyEDA | UNKNOWN. easyeda.com/editor returned 403 to a plain fetch | UNKNOWN | none |
| Excalidraw | Canvas-based | EXTERNAL | [S42] |

I did not find a published editor frame-rate number for any of Wokwi, Tinkercad, Flux or EasyEDA.

## 2. Collaboration

### 2.1 Options

| Option | Licence | Version / date | Notes | Source |
|---|---|---|---|---|
| Yjs | MIT | 13.6.33 (2026-09-23) | Mature, many providers. Fastest of the tested set after Loro on the B4 trace, smallest memory shown (3.2 MB; other rows unreliable) | [S45] [S46] |
| Automerge | MIT | 3.5.0 (2026-09-16) | v3 (July 2025): memory "over 10x" lower; Moby Dick paste 700 MB to 1.3 MB; a doc that did not load in 17 h loaded in 9 s | [S45] [S47] |
| Loro | MIT | 1.17.1 (2026-10-22) | Fastest on B4 replay in the public benchmark (3,089 ms vs Yjs 5,714, Automerge 14,326) but benchmark used Loro 0.10.1 and Automerge 2.1.10, Node 20.5, i5-8400. Old; not current versions | [S45] [S46] |
| Liveblocks | Mixed: most Apache-2.0; `@liveblocks/server` and CLI are AGPL-3.0-or-later | client 3.24.5 (2026-10-23) | Hosted. Free: 3 seats, 10 connections per room, 3,000 collaboration minutes, 10 MB storage per room, branding required. Pro $30/month ($25 annual) with $30 credit; metered $0.002 per user-minute, $1 per 1M storage updates, $0.15/GB stored. Team from $600/month | [S31] [S44] |
| PartyKit (hosted) | MIT repo | npm `partykit` 0.0.115 (2025-05-21) | Hosted platform shut down 2026-10-23. Migration guide points to PartyServer. `cloudflare/partykit` repo is ISC | [S72] [S44] |
| Cloudflare Durable Objects | proprietary service | n/a | $5/month Workers Paid minimum. 1M requests included, then $0.15 per M. 400,000 GB-s included, then $12.50 per M GB-s. WebSocket incoming messages bill at 20:1. SQLite storage: 5 GB-month included, then $0.20/GB-month; 50M rows written included then $1 per M. Use the Hibernation API to avoid duration charges. Cloudflare's own example: 100 objects with 100 hibernatable sockets each, 1 msg/min per client, about $20.65/month | [S20] |
| Y-Sweet (Jamsocket) | MIT | repo | Yjs server in Rust; persists to S3-compatible storage; self-host or Jamsocket-hosted | [S74] |
| Hocuspocus (Tiptap) | MIT | repo | Yjs WebSocket server; SQLite extension shown; hosted option exists | [S75] |
| Electric | Apache-2.0 | `@electric-sql/client` 1.5.28 (2026-09-09) | Postgres read-path sync | [S44] [S45] |
| Zero (Rocicorp) | Apache-2.0 | `@rocicorp/zero` 1.11.3 (2026-10-23) | Query-driven sync into a local store. Docs I loaded do not state maturity | [S45] [S76] |
| Replicache | n/a | archived 2026-06-10 | Do not start new work | [S73] |

### 2.2 When a server-ordered op log beats a CRDT

This section is HYPOTHESIS built on the sources above.

- A hardware project is a typed graph (parts, pins, wires, params), not text. Most edits are: add or remove a node, move it, set a property, connect two pins. Few concurrent edits hit the same field.
- A server-ordered op log gives one total order, easy undo per user, easy validation (reject a wire to a nonexistent pin), easy server-side rules (permissions, quotas, moderation), and plain Postgres storage (one append-only table plus periodic snapshots).
- A CRDT wins when clients must edit offline for long periods and merge later, or when there is no authoritative server. A CRDT cannot reject an invalid merge result by itself; you must repair the graph after merge (dangling wires). That repair logic is your problem either way.
- iynk already has rooms over a WebSocket relay (task brief). Keeping a server-ordered log reuses it.
- Offline/local-first: a single-user offline editor needs only local persistence (IndexedDB) plus a queue of ops to replay. Multi-user offline merge is the case that justifies Yjs or Automerge.

### 2.3 Postgres persistence patterns

| Pattern | Cost note | Source |
|---|---|---|
| Op log table + snapshot every N ops | Fits Neon or Supabase. Neon Launch: $0.106/CU-hour, $0.35/GB-month storage, no monthly minimum. Free: 100 CU-hours and 1 GB per project | [S27] |
| Yjs binary updates in a bytea column, or S3-style object | Y-Sweet persists to S3-compatible storage; R2 is $0.015/GB-month with free egress via Workers/S3 API | [S74] [S21] |
| Supabase Postgres | Free 500 MB DB; Pro from $25/month, 8 GB DB, 250 GB egress, Realtime 5M messages and 500 concurrent connections included | [S26] |
| Tiger Data (Timescale) | Performance from $30/month, Scale from $36/month; per-GB storage rate not on the page | [S28] |

## 3. Physics and robotics

| Item | Licence | Version / date | Browser fit and notes | Source |
|---|---|---|---|---|
| Rapier (WASM) | Apache-2.0 | `@dimforge/rapier3d-compat` 0.21.0 (2026-09-25) | Async WASM load; `-compat` embeds base64 WASM and needs `await RAPIER.init()`. Docs call it "fully cross-platform deterministic" given identical setup and order; warns that `Math.sin`/`Math.cos` may differ across platforms. JS repo archived, now in the main repo | [S48] [S49] [S44] |
| MuJoCo WASM `@mujoco/mujoco` | Apache-2.0 | 3.17.0 (2026-10-22) | Official bindings, README says "still a WIP"; single-thread build needs no headers; multithread needs COOP/COEP and SharedArrayBuffer; no benchmark numbers published in README | [S50] [S45] |
| Jolt Physics | MIT | repo pushed 2026-10-26 | Deterministic simulation claimed. WASM comes from JoltPhysics.js (MIT, npm `jolt-physics` 1.1.1, 2026-10-23); cross-platform determinism needs `-DCROSS_PLATFORM_DETERMINISTIC=ON`; no benchmark numbers on the pages | [S51] [S52] [S45] |
| Ammo.js (Bullet) | zlib (licence text read; GitHub reports NOASSERTION) | repo pushed 2026-09-22 | Old Bullet port; no reason to pick over Rapier or Jolt for a new build | [S44] |
| cannon-es | MIT | 0.20.0 (2022-08-12); repo last push 2024-01-06 | Stale | [S45] [S44] |
| urdf-loader (three.js) | Apache-2.0 | 0.13.1 (2026-07-08) | Loads URDF into three.js, with example models. The README I loaded does not mention xacro, IK or React | [S53] [S45] |
| rosbridge_suite | BSD (README: "BSD license") | ROS 2 Humble, Jazzy, Rolling | JSON over WebSocket/TCP, v2 protocol | [S69] |
| roslibjs `roslib` | BSD-2-Clause (npm) | 2.1.0 (2026-03-03) | Browser client for rosbridge; GitHub reports no licence file | [S45] [S44] |
| Foxglove SDK | MIT | repo pushed 2026-10-26 | Rust core, Python and C++ bindings, `foxglove_bridge` for ROS 2 (Humble, Jazzy, Kilted, Lyrical, Rolling). Old `foxglove/ws-protocol` repo is archived (2025-08-05) | [S68] [S44] |
| Kinematics libraries | UNKNOWN | n/a | I did not research a specific IK library. Open item | none |

Fit notes (HYPOTHESIS): a robotics lab with real ROS 2 concepts only needs a browser physics engine for visual realism (line follower, arm). Rapier or Jolt both fit; Rapier has a smaller path to Rust-side custom solvers; Jolt has a bigger feature list (vehicles, constraints, ragdolls). The decision needs a spike (section 9). ROS 2 in the browser is best done by a real server-side bridge only for opt-in power users; for the free tier, simulate the ROS graph in TypeScript.

## 4. Flight

| Option | Licence | Fit | Source |
|---|---|---|---|
| JSBSim | LGPL-2.1 (core, Python module) | C++ 6-DoF flight dynamics. The README does not mention a WebAssembly build. Multirotor examples are third-party (Project AirSim, PteroSim). Binaries only for Windows, Ubuntu 22.04/24.04, Python wheels. WASM port: UNKNOWN, would be your own Emscripten build, LGPL obligations apply | [S54] |
| ArduPilot SITL | GPL-3.0 | Native executable on Linux/Windows. Each vehicle has built-in physics; JSBSim and Gazebo are optional externals. Resource needs and any web option: not on the page | [S55] [S44] |
| PX4 SIH / Gazebo | BSD-3-Clause | SIH runs physics inside PX4 as a C++ module, no external dependencies, headless by default; Quad, Hex, Plane, VTOL, Rover. No WASM/browser mention | [S56] [S44] |
| Betaflight SITL | GPL-3.0 | README lists "SITL for simulation". Build details not loaded | [S77] |
| Own 6-DoF multirotor in TypeScript | n/a | See below | papers |

Published multirotor simulation speed (EXTERNAL, from abstracts):

| Paper | Claim | Source |
|---|---|---|
| Flightmare (Song et al., CoRL 2020, arXiv 2009.00563) | Rendering up to 230 Hz; "physics simulation of up to 200,000 Hz on a laptop"; hundreds of quadrotors in parallel | [S57] |
| Learning to Fly in Seconds (Eschmann et al., RA-L, arXiv 2311.13081) | 18 s training on a laptop; simulator open-sourced; about 5 months of flight per second on a laptop GPU | [S59] |
| gym-pybullet-drones (Panerati et al., IROS 2021, arXiv 2103.02142) | PyBullet-based quadcopter env with collisions and aerodynamic effects; abstract gives no speed number | [S58] |

Reading: a rigid-body multirotor model with motor thrust, drag and a PID cascade is cheap enough to run in a browser worker at 1 kHz; the papers show physics at 200 kHz native. This is ESTIMATED by inference, not tested. The Drone Lab already has a flight sim, so the question is whether SITL fidelity (real PX4 or ArduPilot firmware) justifies a server.

Cost of SITL per session (ESTIMATED). CPU load of a SITL process is UNKNOWN (not on loaded pages); I assume one shared vCPU and 1 GB RAM and a 30-minute session.

| Host | Rate source | Cost for 30 min |
|---|---|---|
| Fly Machine shared-cpu-1x 1 GB, billed per second while running | $6.70/month assumes 30 days continuous [S24] | $6.70 / (30*24*3600 s) * 1,800 s = about $0.0047 |
| E2B sandbox 2 vCPU 4 GiB | $0.000014 per vCPU-s, $0.0000045 per GiB-s [S30] | 1,800 * (2*0.000014 + 4*0.0000045) = about $0.083 |
| Vercel Sandbox, Pro, 2 vCPU 4 GB, 100% CPU | $0.128/h CPU, $0.0212/GB-h, $0.60 per M creations [S19] | about $0.128 + $0.042 = about $0.17 (their own example assumes only 10% CPU use, which does not hold for a physics loop) |

A browser-side physics loop costs the platform $0 per session. A server SITL at Fly rates is cheap per session but needs a queue, a WebSocket per session, a security story and cold-start handling. HYPOTHESIS: use a TypeScript 6-DoF model for the free product; offer SITL only as a later "real firmware" mode.

## 5. Sandboxing untrusted extensions

### 5.1 In-browser / in-process

| Option | Licence | Isolation strength | Limits | Source |
|---|---|---|---|---|
| iframe `sandbox` without `allow-same-origin`, plus `postMessage` | browser feature | Opaque origin, no cookies or storage of the parent. `allow-scripts` + `allow-same-origin` on same-origin content is "strongly discouraged": the frame can remove its own sandbox | No CPU or memory caps by itself. Serve from a separate origin too | [S63] |
| Web Worker | browser feature | No DOM; a Worker can be killed by `terminate()` | Same-process memory; not a security boundary against engine bugs. Specific limits not researched: UNKNOWN | none |
| SES / Hardened JS (Endo) | Apache-2.0, `ses` 2.3.0 (2026-08-13) | Object-capability model; lockdown freezes intrinsics; Compartments have no ambient authority | Cannot stop infinite loops or unbounded memory; `Math.random` shared state; timing channels via SharedArrayBuffer; the audits cited date from 2021 | [S62] [S45] |
| QuickJS in WASM (`quickjs-emscripten`) | MIT | A separate JS engine inside WASM memory; host decides what to expose | 0.32.0 (2026-02-16). No speed number gathered. The upstream engine `quickjs-ng/quickjs` is MIT | [S45] [S44] |
| Extism | BSD-3-Clause | Wasm plug-ins with host-controlled HTTP, runtime limiters and timers; host SDK for web, Node, Deno, Bun; plug-in languages Rust, JS, Python, Go and more | npm `extism` is at 2.0.0-rc13 (2025-05-14): a release candidate, 17 months old | [S60] [S45] |
| WASM component model / wasmtime / jco | Apache-2.0 (wasmtime), Apache-2.0 WITH LLVM-exception (jco) | WASI 0.2.0 stable since 2024-01-25 | `@bytecodealliance/jco` 1.39.0 (2026-10-16) transpiles components for the browser. WASI 0.3 status: not on the page I loaded | [S61] [S45] |

### 5.2 Server-side compile and run isolation

| Option | Licence | Facts | Source |
|---|---|---|---|
| Firecracker microVM | Apache-2.0 | Boot to guest init `<= 125 ms`, VMM memory overhead `<= 5 MiB` on a stated test setup (bare metal) | [S65] |
| gVisor | Apache-2.0 | CPU and memory-access workloads show little overhead; syscall-heavy and file-heavy workloads pay most. Docs give no numbers in text | [S64] |
| nsjail | Apache-2.0 | Namespaces, cgroups, rlimits, seccomp-bpf. "Not an official Google product". No overhead figures | [S66] |
| Docker rootless | Apache-2.0 (Moby; not verified in this session) | Daemon and containers run unprivileged in a user namespace. The page I loaded does not say whether it is a sandbox for untrusted code | [S67] |
| Managed sandboxes | proprietary | Vercel Sandbox is Firecracker-based per Vercel's own KB listing ("Firecracker" appears in a related page title) and E2B bills per second | [S19] [S30] |

Cost per compile (ESTIMATED). Assumption: one compile takes 10 s wall-clock on 2 vCPU / 4 GB at full CPU. I did not measure a real Arduino or ESP-IDF compile (arduino-cli is not installed here), so compile duration is UNKNOWN. Note that iynk's interpreters avoid compiling at all for the current catalogue.

| Host | Calculation | Result |
|---|---|---|
| E2B | 10 * (2*0.000014 + 4*0.0000045) | $0.00046 |
| Cloudflare Containers standard-3 (2 vCPU, 8 GiB, 16 GB disk) | 10*(2*0.000020 + 8*0.0000025 + 16*0.00000007) | $0.00061 |
| Vercel Sandbox, Pro, iad1 | 10/3600*2*0.128 + 4*10/3600*0.0212 + 0.60/1e6 | $0.00095 |
| Fly shared-cpu-1x 1 GB | $6.70/month prorated per second, 10 s | $0.000026 (but 1 shared vCPU, so likely slower) |

Even at $0.001 per compile, 100,000 compiles cost about $100. Compile cost is not the constraint; abuse control and isolation are.

## 6. Infra and cost

### 6.1 Vercel (current host)

| Item | Hobby | Pro | Source |
|---|---|---|---|
| Plan price | $0 | $20/month (includes a $20 usage credit) | [S14] |
| Active CPU | 4 h/month | from $0.128/h (iad1, pdx1, cle1; up to $0.221/h in São Paulo) | [S14] [S15] |
| Provisioned memory | 360 GB-h/month | from $0.0106/GB-h (up to $0.0183 São Paulo) | [S14] [S15] |
| Invocations | 1M/month | from $0.60 per M | [S14] |
| Fast Data Transfer | 100 GB/month | 1 TB/month included, then from $0.15/GB | [S14] |
| Fast Origin Transfer | 10 GB/month | from $0.06/GB | [S14] |
| Max function duration | 300 s | 300 s default, 800 s max, 1800 s beta | [S16] |
| Memory / CPU | 2 GB, 1 vCPU | up to 4 GB, 2 vCPU | [S16] |
| Body size | 4.5 MB request or response | same | [S16] |
| Concurrency | auto-scales to 30,000 | same | [S16] |
| Sandbox | 5 h CPU, 5,000 creations, 10 concurrent, 45 min session | $0.128/h CPU, $0.0212/GB-h memory, 24 h session, 10,000 concurrent | [S19] |
| WebSockets | all plans, GA 2026-10-20, billed as normal Function usage plus data transfer; connection closes at max duration; no in-memory shared state | same | [S17] [S18] |

Hobby commercial use: the Vercel pricing page FAQ describes Hobby as "personal, non-commercial use" and says Hobby accounts cannot buy extra usage (fact-check 2026-10-26, EXTERNAL [S14]). A startup product needs Pro.

### 6.2 Other hosts

| Service | Prices | Source |
|---|---|---|
| Cloudflare Workers Paid | $5/month; 10M requests included then $0.30 per M; 30M CPU-ms included then $0.02 per M; no duration charge; WebSocket upgrade counts as one request, messages through the Worker do not count | [S22] |
| Cloudflare R2 | $0.015/GB-month; Class A $4.50 per M, Class B $0.36 per M; egress free via Workers/S3 API/r2.dev; free tier 10 GB, 1M Class A, 10M Class B | [S21] |
| Cloudflare Containers | CPU $0.000020 per vCPU-s (active only); memory $0.0000025 per GiB-s; disk $0.00000007 per GB-s; egress $0.025/GB NA/EU with 1 TB included; also needs Workers Paid and bills the Worker and Durable Object separately | [S23] |
| Fly.io | shared-cpu-1x 256 MB $2.19/month, 1 GB $6.70/month, per-second billing; stopped rootfs $0.15/GB-month; volumes $0.15/GB-month; egress $0.02/GB NA/EU, $0.04 APAC/SA, $0.12 Africa/India; no free tier for new orgs (a trial of up to 2 hours of Machine runtime or 7 days, whichever is first; a card is required afterwards) | [S24] |
| Railway | Hobby $5/month ($5 credit), Pro $20/month ($20 credit); RAM $10/GB-month, CPU $20/vCPU-month, egress $0.05/GB, volume $0.15/GB-month | [S25] |
| Supabase | Free; Pro from $25/month; Team from $599/month; compute add-ons Micro $10 to 16XL $3,730 per month; Pro file storage $0.0213/GB beyond 100 GB | [S26] |
| Neon | Launch $0.106/CU-hour; Scale $0.222/CU-hour; storage $0.35/GB-month; object storage $0.023/GB-month; egress 500 GB per project then $0.10/GB; no monthly minimum | [S27] |
| Tiger Data | Performance $30/month; Scale $36/month; storage metered hourly, rate not listed | [S28] |
| AWS S3 | The loaded page gave only a GET rate ($0.0004 per 1,000) and a free 100 GB transfer; S3 Standard storage rate: UNKNOWN | [S29] |

### 6.3 WebSocket hosting options

| Option | Fit | Source |
|---|---|---|
| Vercel Functions WebSocket | Same deploy as the app. State must live outside the instance (Redis or Postgres). Max 800 s per connection on Pro, so clients must reconnect | [S17] |
| Cloudflare Durable Object per room | One object per room gives built-in single-writer ordering, which matches a server-ordered op log. Costs scale with hibernation use | [S20] |
| Fly Machine running a Node WebSocket server | Cheapest always-on at $2.19 to $6.70/month; you operate it | [S24] |
| Railway container | $5 to $20/month plans plus usage | [S25] |
| Supabase Realtime | Pro includes 5M messages and 500 concurrent connections; $2.50 per M more | [S26] |
| Liveblocks | Hosted rooms, see section 2 | [S31] |

## 7. AI economics

### 7.1 List prices (USD per million tokens, as of 2026-10-26)

| Provider / model | Input | Cached input (read) | Output | Notes | Source |
|---|---|---|---|---|---|
| Claude Fable 5.1 (`claude-fable-5-1`) | 10 | 0.25 | 50 | 1M context; 5m write 12.50, 1h write 20 | [S1] [S2] |
| Claude Opus 5.5 (`claude-opus-5-5`) | 4 | 0.20 | 20 | 5m write 5, 1h write 8; batch 2 / 10 | [S1] [S2] |
| Claude Sonnet 5.5 (`claude-sonnet-5-5`) | 2 | 0.10 | 10 | 5m write 2.50, 1h write 4; batch 1 / 5 | [S1] [S2] |
| Claude Haiku 5.5 (`claude-haiku-5-5`), prompt up to 100k | 0.10 | 0.01 | 0.50 | over 100k tokens: 0.50 / 0.05 / 2.50 | [S1] [S2] |
| OpenAI gpt-5.5 | 5 | 0.50 | 30 | 1.05M context; over 272K input costs 2x input, 1.5x output | [S6] [S7] |
| OpenAI gpt-5.6-terra / gpt-5.6-sol | 2 / 4 | 0.20 / 0.40 | 12 / 20 | | [S6] |
| OpenAI gpt-6.1-terra / gpt-6.1-sol | 1 / 2 | 0.05 / 0.10 | 5 / 10 | | [S6] |
| OpenAI gpt-5.4-mini | 0.75 | 0.075 | 4.50 | | [S6] |
| OpenAI gpt-5.6-luna / gpt-6-luna | 0.20 / 0.10 | 0.02 / 0.01 | 1.20 / 0.50 | | [S6] |
| OpenAI gpt-5-nano | 0.05 | 0.005 | 0.40 | | [S6] |
| Gemini 3.8 Flash | 0.75 (1.50 from 2027-01-01) | 0.075 (0.15) | 3.75 (7.50) | free tier yes | [S4] |
| Gemini 3.6 Flash | 0.75 (1.50 from 2027-01-01) | 0.075 (0.15) | 3.75 (7.50) | free tier yes | [S4] |
| Gemini 3.5 Flash-Lite | 0.30 | 0.03 | 2.50 | free tier yes | [S4] |
| Gemini 3.1 Flash-Lite | 0.25 (text) | 0.025 | 1.50 | | [S4] |
| Gemini 4 Argon | 2.00 (4.00 from 2026-12-01) | 0.10 (0.20), implicit only | 10.00 (20.00) | no free tier. Added in fact-check | [S4] |
| Gemini 3.1 Pro Preview | 2.00 (<=200k); 4.00 (>200k) | 0.20 | 12.00 (<=200k); 18.00 (>200k) | no free tier | [S4] |
| Gemini "3.5 Flash" | not listed | not listed | not listed | Name does not appear on Google's pricing or models pages. UNKNOWN whether it exists | [S4] [S5] |
| Meta Muse Spark 1.1 (Meta Model API, public preview, US developers) | 1.25 | not stated | 4.25 | $20 free credit per new account; OpenAI Chat Completions and Anthropic Messages formats; 1M context per the article. Pricing is from CNBC via AI Weekly; Meta's blog post I loaded had no price | [S8] [S9] |
| Muse Spark "Contributor" tier | 0.10 | n/a | 0.20 | Aggregator claim only, unverified against Meta. Do not use | [S10] |
| Fireworks: Muse Spark Open | 1.25 | 0.15 | 4.25 | Batch is 50%. Open-weight licence of this model: UNKNOWN | [S11] |
| Fireworks: DeepSeek V4.1 Flash | 0.30 | 0.006 | 1.20 | | [S11] |
| Fireworks: gpt-oss-120B | 0.15 | 0.015 | 0.60 | | [S11] |
| Fireworks: GLM 5.3 Flash | 0.15 | 0.03 | 0.50 | | [S11] |
| Together: DeepSeek V4.1 Flash | 0.30 | 0.006 | 1.20 | | [S12] |
| Together: Qwen3.8 Flash | 0.15 | n/a | 0.47 | | [S12] |
| Together: gpt-oss-120B | 0.15 | n/a | 0.60 | | [S12] |
| Groq: gpt-oss-120B | 0.15 | n/a | 0.60 | Secondary source only; Groq's own pricing pages did not load | [S13] |
| Groq: Llama 3.3 70B | 0.59 | n/a | 0.79 | Secondary source only | [S13] |

Caching and batch rules. Claude: 5-minute cache write is 1.25x input, 1-hour write 2x, read 0.1x for most models, 0.05x on Opus 5.5 and Sonnet 5.5, 0.025x on Fable 5.1; minimum cacheable prompt is 512 tokens on the 5.5 models; up to 4 explicit breakpoints; Batch API is 50% off [S3] [S2] [S1]. OpenAI and Fireworks batch is 50% [S6] [S11].

### 7.2 Worked ESTIMATED cost of one tutoring session

Assumptions (all mine, not measured):
- 12 turns per session.
- System prompt plus lab rules and part catalogue: 6,000 tokens, identical every turn (cacheable).
- Each turn adds 1,000 new input tokens (300 for the learner's question, 700 for a snapshot of the circuit and code).
- Each turn produces 600 output tokens including any thinking tokens. Prior answers stay in history, adding 600 tokens per turn.
- Total over the session: 189,600 input tokens read or billed, 7,200 output tokens.
- Cache model: every cached prefix hits (no 5-minute gaps). Claude cache writes are charged at 1.25x on new tokens; OpenAI, Gemini and Fireworks are modelled with no write fee (implicit caching). Muse Spark 1.1 on Meta's API has no published cache price, so it is shown uncached in both columns.
- Script: `/private/tmp/claude-501/-Users-amar-Codes-ak-simlab/6a603069-dc65-486f-8236-8cec4f2cda15/scratchpad/research/tech/cost.py` [S79].

| Model | No caching | With caching | Per 1,000 sessions (cached) |
|---|---|---|---|
| Claude Opus 5.5 | $0.90 | $0.27 | $268 |
| Claude Sonnet 5.5 | $0.45 | $0.13 | $134 |
| Claude Haiku 5.5 | $0.023 | $0.008 | $7.60 |
| OpenAI gpt-5.5 | $1.16 | $0.36 | $365 |
| OpenAI gpt-5.4-mini | $0.17 | $0.055 | $55 |
| OpenAI gpt-5.6-luna | $0.047 | $0.015 | $15 |
| Gemini 3.8 Flash (price now) | $0.17 | $0.049 | $49 |
| Gemini 3.8 Flash (price from 2027-01-01) | $0.34 | $0.099 | $99 |
| Gemini 3.5 Flash-Lite | $0.075 | $0.027 | $27 |
| Muse Spark 1.1 (Meta API) | $0.27 | $0.27 (no cache price) | $268 |
| Muse Spark Open (Fireworks) | $0.27 | $0.072 | $72 |
| DeepSeek V4.1 Flash (Fireworks) | $0.066 | $0.013 | $13 |
| gpt-oss-120B (Fireworks) | $0.033 | $0.009 | $8.80 |

Reading: input dominates because history is re-sent; caching cuts cost 3x to 5x. A routing design (small model for most turns, a stronger model only for hard debugging) is cheaper than any single flagship. Quality per model for hardware tutoring was not tested here, so the table is price only. A free product serving 100,000 sessions a month, cached, would cost about $13,400 on Sonnet 5.5, about $4,900 on Gemini 3.8 Flash at today's price and about $9,900 after the 2027-01-01 rise, and about $760 on Haiku 5.5. ESTIMATED, same assumptions. Gemini and Groq free tiers are rate-limited and unsuitable for a production plan.

## 8. Ranked recommendations (all HYPOTHESIS)

| Block | Rank 1 | Rank 2 | Rank 3 | Avoid / why |
|---|---|---|---|---|
| Editor canvas | SVG in React with a thin custom editor core (or xyflow if its handle model fits), parts as SVG components | Konva (MIT, Canvas 2D) if SVG fails the phone spike | PixiJS (WebGL) only if parts exceed several thousand | tldraw unless a licence budget is agreed; GoJS and JointJS+ (paid, per developer); WebGPU-only (Firefox gap) |
| Collaboration | Server-ordered op log over the existing relay, Postgres for log + snapshots | Yjs (MIT) with Hocuspocus or Y-Sweet if offline multi-user merge becomes a requirement | Cloudflare Durable Object per room if the relay moves off Vercel | Hosted PartyKit (shut down), Replicache (archived), Liveblocks server (AGPL parts) |
| Physics (robotics) | Rapier 0.21 (Apache-2.0, deterministic) | Jolt via JoltPhysics.js (MIT) | MuJoCo WASM (Apache-2.0) for arm and contact-rich robots once its bindings leave WIP | cannon-es (stale), Ammo.js |
| Flight | Own 6-DoF multirotor model in a Web Worker | PX4 SIH in a Fly Machine as an opt-in "real firmware" mode | ArduPilot SITL (GPL-3.0, check obligations) | JSBSim WASM (no known build; LGPL) |
| Sandboxing | Opaque-origin iframe + Worker + capability API over postMessage, no `allow-same-origin` | QuickJS-in-WASM for extension code that needs CPU/memory caps | Component model/Extism when stable (Extism is still an RC on npm) | SES alone (cannot stop loops or memory use) |
| Server isolation | Managed microVM sandbox (E2B, Vercel Sandbox) for the few real compiles | Self-run Firecracker or gVisor later | nsjail only as a layer inside a VM | Docker rootless as the only boundary |
| Hosting | Keep Vercel for the app; add Fly Machines or a Cloudflare Durable Object for WebSockets and rooms | All-Cloudflare later | | Hobby limits (45-minute sandbox, 10 concurrent) for production |
| Database | Neon (usage-based, no minimum) | Supabase Pro ($25) if auth and storage are wanted together | Tiger Data only for time-series telemetry | |
| Object storage | Cloudflare R2 ($0.015/GB-month, free egress) | Neon object storage ($0.023) | | |
| AI | Tiered routing: Haiku 5.5 or Gemini Flash-Lite for routine turns, Sonnet 5.5 for hard ones, prompt caching on | Open-weight on Fireworks or Together (gpt-oss-120B, DeepSeek V4.1 Flash) for the free tier | Muse Spark 1.1 only once Meta publishes cache pricing and non-US access | Fable 5.1 or gpt-5.5 for every turn |

## 9. Spikes worth running

| # | Question | Exit condition |
|---|---|---|
| 1 | Does an SVG editor hold 60 fps on a phone and a school-grade Chromebook at 500 parts and 1,000 wires, with real part artwork, pan and zoom? (Section 1.2 covered only a fast desktop.) | Pass: p95 frame time under 20 ms on both devices, or drop to Canvas/Pixi for wires only. Fail trigger: p95 over 33 ms on either device |
| 2 | Can xyflow carry pin-accurate parts and orthogonal wires, or is a custom core smaller? | Decide by day 3: working prototype of an Uno + LED + resistor board with 20 wires in under 400 lines either way. Choose the smaller and faster one |
| 3 | Does a server-ordered op log on the existing relay handle 5 editors in one room with undo, reconnect and an invalid-wire rejection? | Pass: no divergence after 10,000 randomized ops with dropped connections (property test), reconnect under 2 s |
| 4 | Is Yjs worth adding for offline merge? | Only run if product requires multi-user offline. Exit: a merge of two 1-hour offline sessions leaves no dangling wires after the repair pass |
| 5 | Does a Vercel Function WebSocket survive 800 s and a deploy, and what does a 30-minute room cost? | Measure Active CPU and memory-hours for 5 clients over 30 minutes. Pass: cost under $0.01 per room-hour and clean reconnect |
| 6 | Rapier vs Jolt WASM for a line-follower and a 4-wheel robot: size, step time, determinism across Chrome and Safari | Pass: identical snapshot hash on two browsers after 10,000 steps; step under 1 ms at 20 bodies; WASM under an agreed size budget |
| 7 | Is a TypeScript quadrotor model good enough versus PX4 SIH, for the 13 craft? | Compare step response (rise time, overshoot) to PX4 SIH in a Fly Machine for 3 craft. Pass: within 15% on both metrics |
| 8 | What does SITL really cost per session? | Run PX4 SIH headless on a shared-cpu-1x for 30 minutes; record CPU%. Pass: under 50% of one shared vCPU, otherwise move to a larger machine and recompute |
| 9 | Can an opaque-origin iframe + Worker run a hostile extension without hurting the host? | Red-team: infinite loop, 2 GB allocation, postMessage flood, `fetch` to the parent origin. Pass: host UI stays responsive, no cookie or storage access, worker killed in under 2 s |
| 10 | What is the real compile time and cost for an Arduino sketch and an ESP32 sketch in a managed sandbox? | Install arduino-cli in a sandbox image; measure 20 compiles. Pass: median under 30 s, cost under $0.005 each, isolation confirmed |
| 11 | Which model is good enough for tutoring at the lowest price? | Run 50 scripted lab-debug conversations through Haiku 5.5, Sonnet 5.5, Gemini 3.8 Flash and gpt-oss-120B; rubric-score. Pass: pick the cheapest with at least 90% of the top score |
| 12 | Does prompt caching hit as modelled? | Log cache read and write tokens for 100 real sessions. Pass: at least 80% of prefix tokens read from cache |
| 13 | Is the Meta Muse Spark API usable (cache price, non-US access, rate limits)? | Read Meta's developer pricing page when reachable. Pass: published cache price and access for our users' countries |

## 10. Gaps

- Web search quota ran out partway. I could not look up how Flux, EasyEDA and Tinkercad render, a second source for Loro/Automerge/Yjs current benchmarks, Web Worker limits, or kinematics libraries.
- Groq's own pricing pages, OpenAI's pricing at openai.com, and Meta's pricing page did not load; Groq figures are from secondary sources, Meta's from news.
- GoJS and tldraw prices, JointJS+ prices, S3 Standard rates, Tiger Data per-GB rates are not public on the pages loaded.
- The Horak 2018 PDF could not be fetched (connection refused); its figures come via a search-result summary.
- The CRDT benchmark in [S46] uses old library versions and a 2018-class CPU.
- No hands-on test of any physics engine, SITL, sandbox or model.

## Sources

All accessed 2026-10-26. "Describes" gives the version or date of the content.

| ID | URL | Title | Publisher | Describes |
|---|---|---|---|---|
| S1 | https://platform.claude.com/docs/en/about-claude/pricing | Pricing | Anthropic | Current page, Fable 5.1 / Opus 5.5 / Sonnet 5.5 / Haiku 5.5 |
| S2 | https://platform.claude.com/docs/en/about-claude/models/overview | Models overview | Anthropic | Current lineup, retirement dates |
| S3 | https://platform.claude.com/docs/en/build-with-claude/prompt-caching | Prompt caching | Anthropic | Current page (first 100,000 of 162,264 characters read) |
| S4 | https://ai.google.dev/gemini-api/docs/pricing | Gemini API pricing | Google | Current, with price changes on 2026-12-01 and 2027-01-01 |
| S5 | https://ai.google.dev/gemini-api/docs/models | Gemini models | Google | Current model list |
| S6 | https://developers.openai.com/api/docs/pricing | API pricing | OpenAI | Current |
| S7 | https://developers.openai.com/api/docs/models/gpt-5.5.md | GPT-5.5 model page | OpenAI | Current |
| S8 | https://aiweekly.co/alerts/meta-prices-muse-spark-11-api-at-125425-per-m-tokens | Meta prices Muse Spark 1.1 API at $1.25/$4.25 per M tokens | AI Weekly (citing CNBC) | 2026-07-09, updated 07-10 |
| S9 | https://ai.meta.com/blog/introducing-muse-spark-meta-model-api/ | Introducing Muse Spark 1.1 | Meta | 2026-07-09; page had no price |
| S10 | https://anotherwrapper.com/llm-pricing/muse-spark-1.1 | Muse Spark pricing aggregator (via search result list) | AnotherWrapper | Unverified third party; page returned 403 |
| S11 | https://docs.fireworks.ai/serverless/pricing | Serverless pricing | Fireworks AI | Current |
| S12 | https://www.together.ai/pricing | Pricing | Together AI | Current |
| S13 | https://eesel.ai/blog/groq-pricing | Groq pricing in 2026 | eesel AI | Secondary, prices marked verified April to August 2026 |
| S14 | https://vercel.com/pricing | Pricing | Vercel | Current |
| S15 | https://vercel.com/docs/functions/usage-and-pricing | Fluid compute pricing | Vercel | Last updated 2026-06-16 |
| S16 | https://vercel.com/docs/functions/limitations | Vercel Functions Limits | Vercel | Last updated 2026-08-24 |
| S17 | https://vercel.com/docs/functions/websockets | WebSockets | Vercel | Last updated 2026-08-10 |
| S18 | https://vercel.com/changelog/websocket-support-is-now-generally-available | WebSocket support is now generally available | Vercel | 2026-10-20 |
| S19 | https://vercel.com/docs/vercel-sandbox/pricing (fetched page url: /docs/sandbox/pricing) | Vercel Sandbox pricing and quotas | Vercel | Last updated 2026-09-10 |
| S20 | https://developers.cloudflare.com/durable-objects/platform/pricing/ | Durable Objects pricing | Cloudflare | Current |
| S21 | https://developers.cloudflare.com/r2/pricing/ | R2 pricing | Cloudflare | Current |
| S22 | https://developers.cloudflare.com/workers/platform/pricing/ | Workers pricing | Cloudflare | Current |
| S23 | https://developers.cloudflare.com/containers/pricing/ | Containers pricing | Cloudflare | Current |
| S24 | https://docs.fly.io/about/pricing | Fly.io resource pricing | Fly.io | Current |
| S25 | https://docs.railway.com/reference/pricing/plans | Pricing plans | Railway | Current |
| S26 | https://supabase.com/pricing | Pricing | Supabase | Current |
| S27 | https://neon.com/pricing | Pricing | Neon | Current |
| S28 | https://www.tigerdata.com/pricing | Pricing | Tiger Data | Current |
| S29 | https://aws.amazon.com/s3/pricing/ | Amazon S3 pricing | AWS | Current; no S3 Standard rate extracted |
| S30 | https://e2b.dev/pricing | Pricing | E2B | Current |
| S31 | https://liveblocks.io/pricing | Pricing | Liveblocks | Current |
| S32 | https://tldraw.dev/community/license | tldraw SDK license | tldraw | Current |
| S33 | https://tldraw.dev/pricing | Pricing | tldraw | Current, no amounts |
| S34 | https://raw.githubusercontent.com/tldraw/tldraw/main/LICENSE.md | tldraw license | tldraw Inc. | main branch |
| S35 | https://www.jointjs.com/license | JointJS license | Client IO | Current |
| S36 | https://www.gojs.net/latest/doc/license.html | GoJS Software License Agreement | Northwoods Software | Current, no prices |
| S37 | https://www.yworks.com/blog/svg-canvas-webgl | SVG, Canvas, WebGL? Visualization options for the web | yWorks | 2018-03-28 |
| S38 | https://mt.inf.tu-dresden.de/cnt/uploads/Horak-2018-Graph-Performance-Poster.pdf | Horak et al. graph performance poster (via search-result summary; PDF fetch failed) | TU Dresden | 2018 |
| S39 | https://reactflow.dev/learn/advanced-use/performance | Performance | xyflow | Current |
| S40 | https://reactflow.dev/api-reference/react-flow | ReactFlow component | xyflow | Current |
| S41 | https://konvajs.org/docs/performance/All_Performance_Tips.html | All Performance Tips | Konva | Current |
| S42 | https://github.com/excalidraw/excalidraw | excalidraw README | Excalidraw | Current |
| S43 | https://www.smashingmagazine.com/2020/01/recreating-arduino-pushbutton-svg/ | Recreating The Arduino Pushbutton Using SVG And lit-element | Smashing Magazine | 2020-01; plus https://github.com/wokwi/wokwi-elements |
| S44 | https://api.github.com/repos/{owner}/{repo} for each repo named | GitHub repository metadata (licence SPDX, stars, last push, archived flag) | GitHub | Queried 2026-10-26 |
| S45 | https://registry.npmjs.org/{package} for each package named | npm registry metadata (latest version, date, licence, peer range) | npm | Queried 2026-10-26 |
| S46 | https://github.com/dmonad/crdt-benchmarks | crdt-benchmarks | Kevin Jahns (dmonad) | Yjs 13.6.11, Loro 0.10.1, Automerge 2.1.10, Node 20.5, i5-8400 |
| S47 | https://automerge.org/blog/automerge-3/ | Automerge 3.0 | Automerge | July 2025 |
| S48 | https://rapier.rs/docs/user_guides/javascript/getting_started_js | Getting started (JavaScript) | Dimforge | Current |
| S49 | https://rapier.rs/docs/user_guides/javascript/determinism | Determinism | Dimforge | Current |
| S50 | https://github.com/google-deepmind/mujoco/tree/main/wasm | MuJoCo WASM bindings | Google DeepMind | README, notes dated 2025-11-13 |
| S51 | https://github.com/jrouwe/JoltPhysics | JoltPhysics README | Jorrit Rouwe | Current |
| S52 | https://github.com/jrouwe/JoltPhysics.js | JoltPhysics.js README | Jorrit Rouwe | Current |
| S53 | https://github.com/gkjohnson/urdf-loaders | urdf-loaders README | gkjohnson | Current |
| S54 | https://github.com/JSBSim-Team/jsbsim | JSBSim README | JSBSim Team | v1.3.3 referenced |
| S55 | https://ardupilot.org/dev/docs/sitl-simulator-software-in-the-loop.html | SITL Simulator (Software in the Loop) | ArduPilot | Current dev docs |
| S56 | https://docs.px4.io/main/en/simulation/ | Simulation | PX4 | main branch |
| S57 | https://arxiv.org/abs/2009.00563 | Flightmare: A Flexible Quadrotor Simulator | arXiv (Song et al.) | v2, 2021-05-09 |
| S58 | https://arxiv.org/abs/2103.02142 | Learning to Fly: a Gym Environment with PyBullet Physics | arXiv (Panerati et al.) | v3, 2021-07-25 |
| S59 | https://arxiv.org/abs/2311.13081 | Learning to Fly in Seconds | arXiv (Eschmann et al.) | v2, 2024-04-08 |
| S60 | https://github.com/extism/extism | Extism README | Extism | Current |
| S61 | https://component-model.bytecodealliance.org/ | The WebAssembly Component Model | Bytecode Alliance | WASI 0.2.0 (2024-01-25) |
| S62 | https://github.com/endojs/endo/tree/master/packages/ses | SES README | Endo / Agoric | Current; audits cited 2021 |
| S63 | https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe | iframe element, sandbox attribute | MDN | Current |
| S64 | https://gvisor.dev/docs/architecture_guide/performance/ | Performance Guide | gVisor | Current |
| S65 | https://github.com/firecracker-microvm/firecracker/blob/main/SPECIFICATION.md | Firecracker specification | AWS / Firecracker | main branch |
| S66 | https://github.com/google/nsjail | nsjail README | Google (not official product) | Current |
| S67 | https://docs.docker.com/engine/security/rootless/ | Rootless mode | Docker | Current |
| S68 | https://github.com/foxglove/foxglove-sdk | Foxglove SDK | Foxglove | Current |
| S69 | https://github.com/RobotWebTools/rosbridge_suite | rosbridge_suite | Robot Web Tools | Current |
| S70 | https://caniuse.com/webgpu | WebGPU | Can I use | Chrome 159 / Safari 27.2 era data |
| S71 | https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API | WebGPU API | MDN | Current |
| S72 | https://docs.partykit.io/ | PartyKit docs | PartyKit | Notice: deploys stop 16 Oct, shutdown 23 Oct 2026 |
| S73 | https://github.com/rocicorp/replicache | Replicache | Rocicorp | Archived 2026-06-10 |
| S74 | https://github.com/jamsocket/y-sweet | Y-Sweet | Jamsocket | Current |
| S75 | https://github.com/ueberdosis/hocuspocus | Hocuspocus | Tiptap | Current |
| S76 | https://zero.rocicorp.dev/docs/introduction | Zero introduction | Rocicorp | Current |
| S77 | https://github.com/betaflight/betaflight | Betaflight | Betaflight | Current |
| S78 | local file /private/tmp/claude-501/-Users-amar-Codes-ak-simlab/6a603069-dc65-486f-8236-8cec4f2cda15/scratchpad/research/tech/bench.mjs (+ bench.html) | SVG vs Canvas 2D micro-benchmark | this research | Run 2026-10-26, Chromium 156 headless, Apple M4 Pro |
| S80 | https://pixijs.com/8.x/guides/components/renderers | Renderers | PixiJS | v8 (via search-result summary; not fetched) |
| S79 | local file /private/tmp/claude-501/-Users-amar-Codes-ak-simlab/6a603069-dc65-486f-8236-8cec4f2cda15/scratchpad/research/tech/cost.py | Tutoring session cost model | this research | Run 2026-10-26 |

## Fact-check log (2026-10-26)

All sources re-opened on 2026-10-26. Verdicts: confirmed (source says it), corrected (file changed), unconfirmed (source did not load or does not state it).

| # | Claim | Verdict | Source |
|---|---|---|---|
| 1 | PartyKit hosted: deploys stop 16 Oct, shutdown 23 Oct 2026 | confirmed (year only on the shutdown date) | [S72] |
| 2 | Replicache archived 2026-06-10 | confirmed | [S73] |
| 3 | Vercel WebSockets GA 2026-10-20; `upgradeWebSocket()` needs @vercel/functions 3.10.0+; 300/800/1800 s | confirmed, with a correction: the changelog [S18] does not mention the API or durations; they come from [S17] and [S16]. Vercel's own pages still carry "public beta" wording in places | [S18] [S17] [S16] |
| 4 | Claude prices: Fable 5.1 10/50, Opus 5.5 4/20, Sonnet 5.5 2/10, Haiku 5.5 0.10/0.50 (0.50/2.50 over 100k); cache and batch rates; 0.05x read on Opus/Sonnet 5.5 | confirmed | [S1] |
| 5 | Claude minimum cacheable prompt 512 tokens, 4 breakpoints, write 1.25x / 2x | confirmed (first 100,000 of 162,264 characters of the page read) | [S3] |
| 6 | Gemini price table, free tiers, 2027-01-01 rises | corrected: Gemini 4 Argon ($2.00/$10.00, no free tier, doubles 2026-12-01) was missing and is added; 3.1 Pro >200k prices added. Gemini 3.5 Flash still absent from the page | [S4] |
| 7 | Meta Muse Spark 1.1 API $1.25 / $4.25, US-only public preview, $20 credit | confirmed as a secondary report (AI Weekly citing CNBC); Meta's own page still shows no price | [S8] |
| 8 | Liveblocks Free and Pro limits, metered rates, Team from $600 | confirmed | [S31] |
| 9 | Cloudflare Durable Objects prices, 20:1 WebSocket ratio, $20.65 example | confirmed | [S20] [S22] |
| 10 | Fly.io shared-cpu-1x $2.19 / $6.70, egress, volume, no free tier | confirmed; trial detail added (2 h or 7 days, card needed after) | [S24] |
| 11 | Neon Free 100 CU-hours, Launch $0.106, Scale $0.222, $0.35/GB-month, no minimum | confirmed | [S27] |
| 12 | Supabase Pro from $25, Team from $599, 8 GB, 250 GB egress, Realtime 5M / 500 | confirmed | [S26] |
| 13 | Vercel Hobby and Pro plan prices and included usage; limits (2 GB/1 vCPU, 4 GB/2 vCPU, 4.5 MB, 30,000) | confirmed. "Hobby commercial use UNKNOWN" corrected: pricing FAQ says personal, non-commercial | [S14] [S16] |
| 14 | Vercel Sandbox Hobby/Pro quotas and rates | confirmed | [S19] |
| 15 | tldraw is source-available, key needed, 100-day trial, hobby watermark, no public price | confirmed | [S32] |
| 16 | WebGPU 87.82% global; Chrome/Edge 113+, Safari iOS 26+, Firefox disabled through 161 | confirmed; Android data added | [S70] |
| 17 | dimforge/rapier.js archived; rapier3d-compat 0.21.0 Apache-2.0; Jolt MIT; tldraw NOASSERTION; Yjs 13.6.33; xyflow 12.12.0; MuJoCo 3.17.0; Extism 2.0.0-rc13 (2025-05-14); partykit 0.0.115; Zero 1.11.3; Liveblocks client 3.24.5 | confirmed via GitHub API and npm registry | [S44] [S45] |
| 18 | Automerge 3: over 10x memory, 700 MB to 1.3 MB, 17 h to 9 s | confirmed | [S47] |
| 19 | CRDT benchmark B4: Yjs 5,714 ms / 3.2 MB, Loro 3,089 ms, Automerge 14,326 ms; old versions | confirmed | [S46] |
| 20 | OpenAI list prices (gpt-5.5, 5.6, 6.1, 5.4-mini, luna, nano) | confirmed | [S6] |

Not re-checked (reason): Fireworks, Together and Groq prices, Cloudflare R2 and Containers, Railway, Tiger Data, AWS S3, E2B, the physics, flight and sandbox library claims (S48 to S69), and the local tests [S78] [S79]. Their status is as stated in the body of the file, not independently confirmed in this pass.

Counts: 20 claims checked, 3 corrected (items 3, 6, 13), 0 unconfirmed beyond the caveats noted, 17 confirmed.
