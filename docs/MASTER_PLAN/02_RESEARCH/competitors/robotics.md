# Robotics simulators and ROS learning environments competitors

Researcher: robotics category. Access date for every source: 2026-10-26. Labels: TESTED, EXTERNAL, ESTIMATED, HYPOTHESIS, UNKNOWN. I did not run any of these products hands-on; no cell is TESTED. Fetches were summarised by a small model, so figures are as reported by the fetch and should be rechecked before they go into a public document.

## Summary

- Almost every serious robotics simulator is a desktop install: Webots, Gazebo, CoppeliaSim, Isaac Sim, MuJoCo. None of them gives a student a no-install, no-account, shareable lab in a browser tab. [S1][S5][S14][S12][S16]
- Only two products are genuinely browser-native for learners: The Construct (a cloud desktop, paid beyond a free tier) and VEXcode VR (free, Blocks only, fixed playgrounds). [S8][S26]
- Webots can stream a simulation to a browser, but Webots itself must run on a server, and viewers cannot change the controller code. It is a viewer, not a browser lab. [S3]
- The browser building blocks exist and are open: MuJoCo has official WebAssembly bindings (Apache-2.0, still marked work in progress) and several community URDF viewers run client-side. They are libraries and demos, not learning products. [S19][S16][S27]
- Cost and hardware gates are high at the top end. Isaac Sim lists a GeForce RTX 4080 with 16 GB VRAM as the minimum. The Construct's paid plan is EUR 39.97 per month. Foxglove has a free tier and a free academic plan. [S12][S8][S20]
- Learning curve is the common complaint. Forum users call Gazebo's material outdated and say Isaac Sim is the hardest to start with. Webots is called the friendliest but its docs "felt kinda dated". [S28]
- Nobody here connects robot simulation to electronics: no MCU firmware, no analog circuit, no fault injection, no BOM. That is the gap iynk's Robotics Lab sits in. [HYPOTHESIS, based on the tables below]
- Original-robot building is possible in every desktop tool (URDF, SDF, PROTO, MJCF) but needs file-format knowledge and a CAD or text-editing workflow. A guided "build your own robot" flow in a browser has no direct competitor in this set. [HYPOTHESIS]
- Churn risk in the category: Foxglove closed its open-source Studio, and robotbenchmark.net (a Webots-based browser site) now serves gambling spam instead of robotics. Free browser robotics tools are fragile. [S22][S24][S29]
- Reusable pieces for iynk: MuJoCo WASM (Apache-2.0), Rerun web viewer (Apache-2.0), Foxglove SDK and MCAP (MIT) for log formats. Webots (Apache-2.0) and Gazebo (Apache-2.0) are reference designs, not embeddable in a browser. [S16][S25][S23][S1][S7]

## Products

### Webots (Cyberbotics)

- What it is: a desktop robot simulator for modelling, programming and simulating robots, vehicles and mechanical systems. [S1]
- Owner: Cyberbotics (company page not fetched; owner name from the GitHub org `cyberbotics`). [S1]
- Licence: Apache-2.0, repo https://github.com/cyberbotics/webots. [S1]
- Pricing as of 2026-10-26: no price found; open source, free. UNKNOWN whether Cyberbotics sells paid services. [S1]
- Version: latest GitHub release tag R2025a, published 2025-02-04. [S2] Nothing newer than R2025a exists as a stable release; GitHub shows nightly pre-release builds up to 2026-10-26, so work continues but stable releases are slow (HYPOTHESIS).
- Community signal: 4.7k stars, 2.1k forks on 2026-10-26. [S1]
- Browser: two things. (1) `webots --stream` serves the running simulation to a browser over WebSockets, in `w3d` (scene and animation sent to the client, rendered locally) or `mjpeg` (server-rendered images) mode. Webots must run on the server. Viewers can navigate the scene but the guide says they "cannot interact with the simulation". The same page shows a toolbar with play, pause, step, reset and source-editor buttons and does not explain the conflict, so exactly what a viewer can do is UNCLEAR [S3]. (2) webots.cloud hosts scenes, animations and demos; the README links to it. I could not load a usable page for it, so its features and limits are UNKNOWN. [S1][S4][S30]
- Original projects: yes, desktop worlds and PROTO robots. A hosted browser path for authoring is not evidenced. [S1][S3]
- Debugging, collaboration, LMS, export: UNKNOWN from sources fetched.
- Complaints: a ROS Discourse thread (March 2025) says the docs "felt kinda dated" and installation needs an extra PPA (a Webots maintainer replied the PPA is optional when using webots_ros2). [S28]
- Learn or reuse: the `w3d` idea (send scene once, animate on the client) is the right model for a browser robotics view. The Webots-view web component is a pattern for embedding. Licence allows study and reuse. [S3][S1]

### Gazebo (Open Robotics / OSRF)

- What it is: the default simulator of the ROS community. Current line is "Gazebo" (formerly Ignition). [S5][S28]
- Which release is current: Jetty (10th major release, announced 2025-09-30, LTS). End of life: the announcement says September 2030, but the official release table at gazebosim.org lists May 2031 for Jetty and May 2029 for Harmonic (LTS); the table is newer, so use May 2031 and May 2029 [S33]. The earlier third-party mirror figures (Harmonic September 2028) were wrong. Ionic (Sep 2024) reaches EOL in December 2026 per an official post dated 2026-09-09, which recommends Jetty, paired with ROS 2 Lyrical. [S5][S6][S33]
- Licence: Apache-2.0 for gz-sim, repo https://github.com/gazebosim/gz-sim, 1,554 stars on 2026-10-26, last push 2026-10-27 UTC. [S7]
- Pricing as of 2026-10-26: free, open source. [S7]
- Platforms: Jetty fully supports Ubuntu 24.04 amd64 only; arm, Windows and macOS are best effort. 32-bit armhf is end of life. [S5][S4b]
- Browser: no. Desktop Qt6 GUI. [S5]
- What a user can do: SDF/URDF worlds, ROS bridge, Open-RMF warehouse demo, Zenoh transport, RL tutorials (Stable Baselines3 cartpole), occupancy-grid export for Nav2. [S5]
- Original projects: yes, by writing SDF. A forum user worries about the "XML-like definition language" being "monotonous and hard to teach". [S28]
- Complaints (ROS Discourse, March 2025): a lot of online material is outdated and the Ignition migration "only made the situation worse"; no out-of-the-box reinforcement learning; Gazebo and RViz vendor OGRE versions that "collide at runtime" in one process. [S28]
- Learn or reuse: SDF as the model of "a world made of text"; auto-inertia from mass (Jetty) is the kind of default that makes original robots easier for beginners. [S5]

### The Construct (ROS Developers Academy, Robot Ignite Academy, ROSDS)

- What it is: a browser-based robotics learning platform. Courses run ROS, ROS 2, Gazebo and Isaac Lab without local setup. Vendor lists 60+ self-paced courses, 100+ robots and environments, remote real-robot labs, and masterclass tracks. [S9]
- Owner: The Construct Robotics Institute. [S9]
- Pricing as of 2026-10-26 (all EUR, per theconstruct.ai/pricing): Basic free (3 basic courses: Linux, Python 3, C++ for Robotics; first unit only of other courses; 2 GB storage; public rosjects only). Learner Monthly EUR 39.97 per user per month. Learner Yearly EUR 439 per user per year. Enterprise EUR 2,399 per user per year. ROSDS tiers: Basic 2 GB storage public projects; Learner 2 CPUs, 4 GB RAM, private projects; Enterprise 8 CPUs, 15 GB RAM. [S8]
- Names: the pricing page does not mention "Robot Ignite Academy" or "ROS Developers Academy" by name, so their current status is UNKNOWN. [S8]
- Licence: proprietary service. Open-source FastBot kit is mentioned but its licence was not checked. [S9]
- Account: yes, an account is needed (pricing page lists a free account tier; no-account use not evidenced). [S8]
- Original projects: users have "rosjects" (their own projects in the cloud IDE), private on paid plans. [S8]
- Debugging, collaboration: forum support on paid plans; real-time collaboration UNKNOWN. [S8]
- Education fit: courses, certificates, learning paths, campus and enterprise programmes. LMS integration UNKNOWN. [S8][S9]
- Community signals: vendor-stated testimonials and logos only; no independent user numbers found. An Open Robotics Discourse search found no independent reviews or Reddit reviews. [S9][S31]
- Limitations: price (EUR 439 per year) puts it out of reach for many students; free tier is small. Vendor staff said they have no career-outcome data. [S8][S31]
- Learn or reuse: nothing reusable (proprietary). The "free first unit, pay for the rest" ladder and "real robot lab at the end" are the product patterns to note.

### NVIDIA Isaac Sim and Isaac Lab

- What it is: a GPU physics and photoreal simulator on NVIDIA Omniverse (Isaac Sim) and a robot-learning framework on top (Isaac Lab). [S10][S13]
- Owner: NVIDIA.
- Licence: Isaac Sim is Apache-2.0 on GitHub (https://github.com/isaac-sim/IsaacSim), and NVIDIA's page also cites the "Isaac Sim Additional Software and Materials License" for use terms. Isaac Lab is BSD-3-Clause per its README (checked); the GitHub API reports NOASSERTION for both Isaac repos, and the README of Isaac Sim shows an Apache-2.0 badge while its LICENSE file says the repo software is Apache 2.0 but building or using it needs additional components under other licences. `isaaclab_mimic` is Apache-2.0 but needs the proprietary cuRobo (repo https://github.com/isaac-sim/IsaacLab). [S10][S11][S13]
- Pricing as of 2026-10-26: free to use. The NVIDIA FAQ states it is free and open source under Apache 2.0 and points to the "Isaac Sim Additional Software and Materials License"; AWS EC2 charges still apply. ISVs that distribute Omniverse Kit need a separate Omniverse Enterprise licence. [S11]
- Stars on 2026-10-26: Isaac Sim 4.4k; Isaac Lab 8.5k. [S10][S13]
- Hardware (requirements page, applies to a release around Isaac Sim 6.x): minimum GeForce RTX 4080, 16 GB VRAM, 32 GB RAM, 50 GB SSD; good RTX 5080 with 64 GB RAM; ideal RTX PRO 6000 Blackwell with 48 GB VRAM. GPUs without RT cores (A100, H100) are not supported. The page lists Ubuntu 22.04/24.04 and Windows 11 (Ubuntu 22.04 is deprecated); Windows 10 is not listed, and aarch64 only for DGX Spark. The statement that the container is Linux-only was not seen on the page and is UNKNOWN. [S12] The Isaac Lab README is headed 3.0.0 and needs Isaac Sim 6.2 for Isaac Sim workflows. [S13] The requirements page itself mentions Isaac Sim 6.0 (DGX Spark section). The NVIDIA product page's download links point to 5.1.0 docs and other links to /latest/, so versions in sources disagree. [S11][S12]
- Browser: no. Hardware gate rules out most students and all phones and Chromebooks. [S12]
- Original projects: yes via USD/URDF import; high effort. [UNKNOWN in detail; not fetched]
- Complaints: forum and blog comparisons rank it hardest to start with and say it needs a strong NVIDIA GPU (opinion pieces, not measured). [S28]
- Learn or reuse: scene format (USD) is not browser friendly. Not reusable in a browser; useful as the "what students graduate to" target. iynk could export to URDF so work moves on to it (HYPOTHESIS).

### CoppeliaSim (Coppelia Robotics)

- What it is: a general robot simulator with five physics engines (MuJoCo, Bullet, ODE, Newton, Vortex), kinematics, vision and proximity sensors, OMPL path planning, plugins, and APIs in Python, Lua, C/C++, Java, JavaScript, MATLAB, Octave and ROS. The site also lists a browser-based viewer. [S14]
- Version: V4.10.0 rev0 on the home page; release date not given. [S14]
- Licence: proprietary. Three tiers: Edu (students, teachers, professors at schools and universities; cannot be used commercially; companies, research institutions and non-profits excluded), Pro (commercial use), Lite (commercial plus rights for customer distribution, on request). [S14]
- Pricing as of 2026-10-26: no prices on the home page. Pro is "contact us". The home page tier table is internally inconsistent: it ticks "commercial usage" for Edu but the terms say Edu cannot be used commercially, so treat Edu as non-commercial. Lite is on request. Edu price not stated. The dedicated licensing page returned 404. UNKNOWN. [S14][S15]
- Browser: only a viewer; the simulator is desktop. [S14]
- Original projects: yes, scene editor and scripting. Detail not fetched.
- Community signals: UNKNOWN (no repo or forum numbers fetched).
- Learn or reuse: the Edu/Pro licence split is a model for iynk's own pricing (free for learners, paid for companies). [S14]

### MuJoCo (Google DeepMind) and its WASM/browser builds

- What it is: a physics engine widely used in robotics research, with first-party bindings including WebAssembly/JavaScript. [S16][S19]
- Licence: Apache-2.0 (source) and CC BY 4.0 (docs), repo https://github.com/google-deepmind/mujoco. [S16]
- Pricing as of 2026-10-26: free. [S16]
- Version and signals: latest release 3.17.0 dated 2026-10-22; 15,913 stars; last push 2026-10-26. Project aims for a release in the first week of each month. [S16][S17][S18]
- Browser: official `@mujoco/mujoco` npm package (ESM, WebAssembly, TypeScript types, Three.js demo). Single-thread build works in modern browsers with no special headers; the multi-thread build needs `SharedArrayBuffer` and cross-origin isolation headers (COOP/COEP). README says it is still work in progress, Linux with Chrome is the main target, macOS passes CI, Windows is experimental; objects must be freed by hand with `.delete()`. [S19]
- Community browser projects built on it: mjswan and muwanx (real-time policy control in the browser), zalo/mujoco_wasm (pinned to an older MuJoCo, 3.3.8 per an index summary, unverified). [S16][S32]
- Original projects: yes, by writing MJCF XML, or generating it. Education UI: none from DeepMind.
- MJX (JAX/GPU version) exists; not browser. [S16]
- Learn or reuse: this is the most realistic physics engine iynk could run in the browser for the Robotics and Drone Labs, licence permitting (Apache-2.0). Cost is bundle size and the COOP/COEP header requirement if threads are wanted (HYPOTHESIS on fit).

### Foxglove

- What it is: visualisation, logging and fleet data platform for robot data (ROS bags, MCAP). It is not a simulator. [S20][S23]
- Owner: Foxglove Technologies.
- Pricing as of 2026-10-26 (USD, dollar sign shown without a currency code): Free $0 (1 project, 10 GB storage, 3 users, 5 devices, 1 hour query time, 100 GB indexing and bandwidth; FAQ says free "forever"); Pro $20 per month plus usage (developer seats $42 per user per month beyond 3 included, devices $20 per month beyond 5 included); Enterprise custom; Academic $0 for .edu/.ac email addresses. [S20]
- Pricing change: on 2026-04-20 Foxglove cut self-service prices. Team was renamed Pro at $20 per month for 1 TB storage and 3 developer seats (previously $126 per month), unlimited basic seats on paid plans, Starter plan deprecated. [S21]
- Open source: the Foxglove 2.0 announcement discontinued the open-source Studio edition and merged it with the Data Platform; staff said MCAP stays a separate open-source project. The old repo foxglove/studio is archived (93 stars, no licence listed in the API, last push 2024-07-18). The foxglove-sdk repo is MIT, 318 stars, active. [S22][S24][S23] (Announcement dated 2024-03-11, so this is not recent churn. The original blog post was not read.)
- Browser: yes, web app. Account needed. [S20]
- Original robots: not applicable.
- Learn or reuse: MCAP and the SDK (MIT) are a ready log format if iynk records sim runs. The academic-free plan is a model for iynk's education plan.

### Rerun (discovered, not in the brief)

- What it is: open-source visualisation and data tool for multimodal robotics data, with a web viewer. "Visualize, query, and stream to train on multimodal robotics data." [S25]
- Licence: Apache-2.0, repo https://github.com/rerun-io/rerun, 11,649 stars, last push 2026-10-26. [S25]
- Pricing: UNKNOWN beyond the open-source project (commercial offering not checked).
- Learn or reuse: embeddable Apache-2.0 viewer for sensor timelines, a candidate for iynk's debug panel (HYPOTHESIS; web build features not verified).

### VEXcode VR (VEX Robotics)

- What it is: a free, browser-based coding environment where students program a virtual robot in fixed playgrounds, no physical robot needed. Works on iPad, Android tablets, Amazon Fire, Chromebook, Windows, Mac. VEX says no student accounts and no install. [S26]
- Pricing as of 2026-10-26: Free tier is Blocks only with 15 playgrounds and basic graphics. Python in the browser is part of the paid Enhanced tier, $199 per educator per year. No offline version in the free tier. A second search-result summary (2026-10-26) agrees and adds a Premium tier at $499 per educator per year (AI and data science playgrounds, competition playgrounds) and Enhanced with 18+ playgrounds and offline version. vexrobotics.com returned HTTP 403 to fetch both times, so all VEX prices stay EXTERNAL second-hand. The claim "no student accounts and no install" was not seen again and is UNCONFIRMED. [S26]
- Licence: proprietary.
- Original projects: no custom robot; the robot and the playgrounds are fixed. Coding is of your own program only. [S26]
- Education: built for classrooms, with a lessons site at education.vex.com/vr (per search results). LMS integration UNKNOWN. [S26]
- Learn or reuse: this is the closest comparison for "zero friction in a browser". Its limit (fixed robot, Blocks free) is the opening for an original-robot builder. Nothing to reuse.

### Browser URDF/SDF tools (community)

- What exists: small client-side URDF viewers and validators, for example an MIT-licensed open-source viewer (about 10 stars, supports URDF, Xacro, STL, DAE, joint sliders), robosimtools.com, and RoboInfra playground (paste URDF/Xacro, 3D preview, validation, export to Isaac Sim, MuJoCo, SDF). Both commercial-looking sites were announced in promotional forum posts and a commenter criticised the repeated posting; claims are unverified. [S27]
- ROS `web_tf_editor` needs a ROS 2 install, so it is not browser-only. [S27]
- Seeed Studio documents a web simulator for its reBot arm: a vendor demo for one robot (page seen in search only; not opened). [S27]
- Limit: they view and validate; they do not simulate dynamics, program firmware, or teach.
- Learn or reuse: a URDF import/export path in iynk's Robotics Lab is cheap to build and lets students bring robots in or out of ROS and Gazebo (HYPOTHESIS).

### Dropped or dead

- robotbenchmark.net (Webots-based browser benchmarks, historically Cyberbotics): the domain now serves gambling spam and hidden links. Treat as dead. [S29]
- Roboticsbackend: a ROS tutorial site, not a simulator; not researched further. UNKNOWN.
- foxglove/studio open-source repo: archived. [S24]

## Comparison table

Format: value, label, source. "n/a" = not applicable to this kind of product. Part 1 of 3.

| Product | Free usage | No-account entry | Browser-based | User-created projects | Circuit editor | Custom hardware models | Firmware compat (real toolchain) | MCU sim fidelity |
|---|---|---|---|---|---|---|---|---|
| Webots | Yes, Apache-2.0 EXTERNAL [S1] | Yes for local install (no login evidenced) UNKNOWN | Stream viewer only, sim runs on server EXTERNAL [S3] | Yes EXTERNAL [S1] | No UNKNOWN | PROTO robots UNKNOWN | ROS 2 controllers; MCU firmware UNKNOWN | No UNKNOWN |
| Gazebo | Yes, Apache-2.0 EXTERNAL [S7] | Yes (local) UNKNOWN | No EXTERNAL [S5] | Yes, SDF EXTERNAL [S28] | No UNKNOWN | Yes, SDF/URDF EXTERNAL [S5] | ROS 2 nodes EXTERNAL [S5] | No UNKNOWN |
| The Construct | Free tier, limited EXTERNAL [S8] | No, account tier UNKNOWN | Yes (cloud IDE) EXTERNAL [S9] | Yes, rosjects EXTERNAL [S8] | No UNKNOWN | Via ROS UNKNOWN | Real ROS code EXTERNAL [S9] | No UNKNOWN |
| Isaac Sim/Lab | Yes, free EXTERNAL [S11] | Yes (local) UNKNOWN | No EXTERNAL [S12] | Yes UNKNOWN | No UNKNOWN | USD/URDF UNKNOWN | ROS 2 bridge UNKNOWN | No UNKNOWN |
| CoppeliaSim | Edu licence, price not stated EXTERNAL [S14] | UNKNOWN | Viewer only EXTERNAL [S14] | Yes EXTERNAL [S14] | No UNKNOWN | Yes UNKNOWN | Python/C++/ROS APIs EXTERNAL [S14] | No UNKNOWN |
| MuJoCo | Yes, Apache-2.0 EXTERNAL [S16] | Yes (library) EXTERNAL [S16] | WASM bindings, WIP EXTERNAL [S19] | MJCF files EXTERNAL [S16] | No n/a | MJCF EXTERNAL [S16] | n/a | n/a |
| Foxglove | Free plan; academic free EXTERNAL [S20] | No, account UNKNOWN | Yes EXTERNAL [S20] | n/a | n/a | n/a | Reads ROS/MCAP EXTERNAL [S23] | n/a |
| Rerun | Yes, Apache-2.0 EXTERNAL [S25] | UNKNOWN | Web viewer UNKNOWN | n/a | n/a | n/a | n/a | n/a |
| VEXcode VR | Yes, Blocks only EXTERNAL [S26] | Yes EXTERNAL [S26] | Yes EXTERNAL [S26] | Own programs; fixed robot EXTERNAL [S26] | No EXTERNAL [S26] | No EXTERNAL [S26] | No UNKNOWN | No UNKNOWN |
| URDF web tools | Free viewers EXTERNAL [S27] | Yes EXTERNAL [S27] | Yes EXTERNAL [S27] | Load own URDF EXTERNAL [S27] | No UNKNOWN | URDF EXTERNAL [S27] | n/a | n/a |

Part 2 of 3.

| Product | Analog circuit fidelity | Failure modeling | Debugging tools | Robotics simulation | Drone simulation | AI guidance | Multilingual UI | Real-time collaboration |
|---|---|---|---|---|---|---|---|---|
| Webots | No UNKNOWN | UNKNOWN | Desktop debugger UNKNOWN | Yes EXTERNAL [S1] | Vehicles/drones in library UNKNOWN | No UNKNOWN | UNKNOWN | No (viewers read-only) EXTERNAL [S3] |
| Gazebo | No UNKNOWN | UNKNOWN | gz tools, RViz UNKNOWN | Yes EXTERNAL [S5] | Yes via plugins UNKNOWN | No UNKNOWN | UNKNOWN | No UNKNOWN |
| The Construct | No UNKNOWN | UNKNOWN | IDE tools UNKNOWN | Yes EXTERNAL [S9] | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN |
| Isaac Sim/Lab | No UNKNOWN | UNKNOWN | Yes UNKNOWN | Yes EXTERNAL [S10] | UNKNOWN | No UNKNOWN | UNKNOWN | No UNKNOWN |
| CoppeliaSim | No UNKNOWN | UNKNOWN | Script debug UNKNOWN | Yes EXTERNAL [S14] | UNKNOWN | No UNKNOWN | UNKNOWN | No UNKNOWN |
| MuJoCo | No n/a | No n/a | UNKNOWN (not seen in the README) | Engine only EXTERNAL [S16] | Engine only UNKNOWN | No n/a | n/a | n/a |
| Foxglove | n/a | n/a | Log playback, plots EXTERNAL [S20] | n/a | n/a | UNKNOWN | UNKNOWN | Team seats EXTERNAL [S20] |
| Rerun | n/a | n/a | Data timeline EXTERNAL [S25] | n/a | n/a | UNKNOWN | UNKNOWN | UNKNOWN |
| VEXcode VR | No EXTERNAL [S26] | No UNKNOWN | Basic UNKNOWN | Yes (fixed robot) EXTERNAL [S26] | No UNKNOWN | No UNKNOWN | UNKNOWN | No UNKNOWN |
| URDF web tools | No n/a | URDF validation only EXTERNAL [S27] | Validator EXTERNAL [S27] | Static view EXTERNAL [S27] | No n/a | No UNKNOWN | UNKNOWN | No UNKNOWN |

Part 3 of 3.

| Product | Curriculum / LMS | Community features | Physical BOM | Component purchasing | Export to real toolchains | Plugin extensibility | Pricing (2026-10-26) | Performance | Target audience | Ecosystem strength | Moat |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Webots | Docs/examples; LMS UNKNOWN | webots.cloud sharing UNKNOWN [S30] | No UNKNOWN | No UNKNOWN | ROS 2 EXTERNAL [S28] | PROTO, controllers UNKNOWN | Free EXTERNAL [S1] | Runs on ordinary GPUs UNKNOWN | Students, researchers EXTERNAL [S28] | 4.7k stars EXTERNAL [S1] | Easy start, open source (HYPOTHESIS) |
| Gazebo | Tutorials EXTERNAL [S28] | Discourse EXTERNAL [S6] | No UNKNOWN | No UNKNOWN | ROS vendor packages EXTERNAL [S5] | Plugins (Qt6 migration needed) EXTERNAL [S5] | Free EXTERNAL [S7] | UNKNOWN | ROS developers EXTERNAL [S28] | 1.6k stars; ROS default EXTERNAL [S7][S28] | ROS integration (HYPOTHESIS) |
| The Construct | Courses, certificates, campus programmes EXTERNAL [S8][S9] | Forum EXTERNAL [S8] | No UNKNOWN | Sells BotBox kit EXTERNAL [S9] | Real ROS code EXTERNAL [S9] | UNKNOWN | Free; EUR 39.97/mo; EUR 439/yr; EUR 2,399/yr EXTERNAL [S8] | Cloud, 2 CPU / 4 GB on Learner EXTERNAL [S8] | Learners, enterprise EXTERNAL [S8] | Vendor claims only EXTERNAL [S9] | Curriculum plus real robot labs (HYPOTHESIS) |
| Isaac Sim/Lab | Docs, UNKNOWN LMS | GitHub EXTERNAL [S13] | No UNKNOWN | No UNKNOWN | ROS 2 UNKNOWN | Extensions EXTERNAL [S10] | Free EXTERNAL [S11] | RTX 4080 min EXTERNAL [S12] | Researchers, AI teams EXTERNAL [S28] | 8.5k + 4.4k stars EXTERNAL [S13][S10] | NVIDIA GPU stack (HYPOTHESIS) |
| CoppeliaSim | UNKNOWN | UNKNOWN | No UNKNOWN | No UNKNOWN | ROS, many APIs EXTERNAL [S14] | Plugins EXTERNAL [S14] | Edu / Pro / Lite, prices UNKNOWN EXTERNAL [S14] | UNKNOWN | Education and industry EXTERNAL [S14] | UNKNOWN | Five engines in one tool (HYPOTHESIS) |
| MuJoCo | Colab tutorials EXTERNAL [S16] | GitHub EXTERNAL [S16] | No n/a | No n/a | MJX/Python EXTERNAL [S16] | Yes EXTERNAL [S16] | Free EXTERNAL [S16] | Fast; WASM single-thread UNKNOWN speed | Researchers EXTERNAL [S16] | 15.9k stars EXTERNAL [S17] | Research standard (HYPOTHESIS) |
| Foxglove | Academic plan EXTERNAL [S20] | Extensions EXTERNAL [S20] | No n/a | No n/a | MCAP/ROS EXTERNAL [S23] | Extensions EXTERNAL [S20] | Free; Pro $20/mo + usage; Academic $0 EXTERNAL [S20] | UNKNOWN | Robotics teams EXTERNAL [S20] | SDK 318 stars EXTERNAL [S23] | MCAP and data platform (HYPOTHESIS) |
| Rerun | UNKNOWN | GitHub EXTERNAL [S25] | No n/a | No n/a | Python/Rust SDK UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | Robotics/AI devs EXTERNAL [S25] | 11.6k stars EXTERNAL [S25] | Open-source viewer (HYPOTHESIS) |
| VEXcode VR | Classroom lessons EXTERNAL [S26] | UNKNOWN | No EXTERNAL [S26] | VEX sells physical robots (not verified) UNKNOWN | No UNKNOWN | No UNKNOWN | Free Blocks; Enhanced $199/educator/yr EXTERNAL [S26] | Runs on tablets and Chromebooks EXTERNAL [S26] | K-12 classrooms EXTERNAL [S26] | UNKNOWN | VEX hardware and school channel (HYPOTHESIS) |
| URDF web tools | No | No | No | No | Export to SDF/MuJoCo/Isaac EXTERNAL [S27] | UNKNOWN | Free EXTERNAL [S27] | Client-side EXTERNAL [S27] | ROS developers EXTERNAL [S27] | About 10 stars for the MIT viewer EXTERNAL [S27] | None |

## Where iynk could be genuinely different here

All HYPOTHESIS unless noted.

- Be the only free, no-account, browser robotics lab that joins electronics and robot behaviour. In this set no product models motor drivers, regulators, firmware and the robot body together. Evidence: no row above has a circuit editor, MCU simulation or failure modelling.
- Let a student build an original robot, not pick a fixed one. VEXcode VR fixes the robot [S26]; desktop tools need URDF/SDF/MJCF or PROTO authoring [S28][S16]. A guided builder that exports URDF would sit between them.
- Run on weak hardware. Isaac Sim starts at an RTX 4080 [S12]; Gazebo Jetty targets Ubuntu 24.04 amd64 [S5]. A browser lab on a Chromebook or phone serves users these tools exclude.
- Use MuJoCo WASM or a lighter in-house engine for rigid-body robots, and keep the circuit solver as the differentiator. MuJoCo bindings are WIP and need COOP/COEP headers for threads, so check hosting before committing [S19].
- Offer a graduation path: export to URDF/SDF and ROS 2 so work continues in Gazebo or Webots. Free tools that let you leave are easier to trust.
- Undercut paid learning platforms: The Construct charges EUR 439 per year for full access [S8]; iynk's price point should be judged against that and the free Construct tier.
- Risk: free browser robotics products have died (robotbenchmark.net [S29]) or closed their open-source parts (Foxglove [S22][S24]). A visible commitment to open formats and a sustainable plan is part of the pitch.
- Gaps in this research: I did not test any product hands-on; I did not find user counts for any vendor besides GitHub stars; Reddit threads were not reached; CoppeliaSim prices, webots.cloud features and VEXcode VR first-party page remain UNKNOWN.

## Sources

Access date for all: 2026-10-26.

- [S1] https://github.com/cyberbotics/webots , Webots Robot Simulator repo, Cyberbotics. Describes state on 2026-10-26 (Apache-2.0, 4.7k stars, 2.1k forks).
- [S2] https://api.github.com/repos/cyberbotics/webots/releases/latest , GitHub API, latest release R2025a, published 2025-02-04.
- [S3] https://raw.githubusercontent.com/cyberbotics/webots/master/docs/guide/web-streaming.md , Webots user guide, web streaming, Cyberbotics (master branch).
- [S4] Web search "Webots webots.cloud web streaming simulation in browser", results from Wikipedia and MathWorks product listing, current to 2026-10-26.
- [S4b] https://discourse.openrobotics.org/t/gazebo-ionic-reaching-end-of-life-in-december-2026/57981 and a mirror of the Gazebo releases table at https://docs.ncnynl.com/en/gazebosim/docs/ionic/releases/ (third-party mirror; Harmonic and Jetty EOL dates come from it).
- [S5] https://discourse.openrobotics.org/t/gazebo-jetty-released/50349 , Gazebo Jetty release announcement, Open Robotics, 2025-09-30.
- [S6] https://discourse.openrobotics.org/t/gazebo-ionic-reaching-end-of-life-in-december-2026/57981 , Gazebo Ionic reaching end-of-life in December 2026, Open Robotics Discourse, 2026-09-09.
- [S7] https://api.github.com/repos/gazebosim/gz-sim , GitHub API (Apache-2.0, 1,554 stars, pushed 2026-10-27).
- [S8] https://www.theconstruct.ai/pricing/ , Pricing, The Construct, as of 2026-10-26 (EUR).
- [S9] https://www.theconstruct.ai/ , The Construct home page (vendor claims).
- [S10] https://github.com/isaac-sim/IsaacSim , Isaac Sim repo, NVIDIA (Apache-2.0, 4.4k stars).
- [S11] https://developer.nvidia.com/isaac/sim , Isaac Sim product page, NVIDIA.
- [S12] https://docs.isaacsim.omniverse.nvidia.com/latest/installation/requirements.html , Isaac Sim system requirements, NVIDIA (latest docs, around 6.x).
- [S13] https://github.com/isaac-sim/IsaacLab , Isaac Lab repo, NVIDIA (BSD-3-Clause per README; 8.5k stars; 3.0.0).
- [S14] https://www.coppeliarobotics.com/ , CoppeliaSim home, Coppelia Robotics (V4.10.0 rev0).
- [S15] https://www.coppeliarobotics.com/coppeliaSim_licensing.html , returned HTTP 404 on 2026-10-26.
- [S16] https://github.com/google-deepmind/mujoco , MuJoCo repo, Google DeepMind (Apache-2.0).
- [S17] https://api.github.com/repos/google-deepmind/mujoco , GitHub API (15,913 stars, pushed 2026-10-26).
- [S18] https://github.com/google-deepmind/mujoco/releases , release 3.17.0, 2026-10-22.
- [S19] https://cdn.jsdelivr.net/npm/@mujoco/mujoco/README.md , MuJoCo JavaScript Bindings README (fetched the unversioned latest README on 2026-10-26; the Windows note in it is dated 2025-11-13; the old URL pinned 3.9.0).
- [S20] https://foxglove.dev/pricing , Foxglove pricing (USD).
- [S21] https://www.foxglove.dev/blog/reduced-self-service-pricing , Foxglove, 2026-04-20.
- [S22] https://discourse.openrobotics.org/t/foxglove-2-0-integrated-ui-new-pricing-and-open-source-changes/36583 , Foxglove 2.0 announcement thread, posted 2024-03-11 by a Foxglove staff member (checked by fetch). The thread says the open-source Studio edition is discontinued, the 1.x code stays on GitHub with future development closed, and MCAP is a separate open-source project the company stays committed to.
- [S23] https://api.github.com/repos/foxglove/foxglove-sdk , GitHub API (MIT, 318 stars).
- [S24] https://api.github.com/repos/foxglove/studio , GitHub API (archived, 93 stars, no licence listed, last push 2024-07-18).
- [S25] https://api.github.com/repos/rerun-io/rerun , GitHub API (Apache-2.0, 11,649 stars).
- [S26] Web search "VEXcode VR robot simulator free browser", citing https://www.vexrobotics.com/vr and https://www.vexrobotics.com/vexcode-vr ; direct fetch returned HTTP 403, so pricing is second-hand via search summary.
- [S27] Web search "browser robot simulator students no install URDF viewer online", citing https://discourse.openrobotics.org/t/12-free-browser-based-tools-for-urdf-and-simulation-work-validator-3d-viewer-format-converters-mesh-inertia-no-install-files-never-leave-your-browser/56379 , https://discourse.openrobotics.org/t/built-a-browser-based-urdf-playground-for-ros-developers/55049 , https://github.com/qkrdkwl9090/urdf-viewer (MIT per search summary).
- [S28] https://discourse.openrobotics.org/t/why-is-gazebo-very-famous-in-the-ros-community-what-about-webots/42459 , ROS Discourse thread, 2025-03-09 to 2025-03-11 (community opinion).
- [S29] https://robotbenchmark.net/ , fetched 2026-10-26; content is gambling spam.
- [S30] https://webots.cloud/ , fetch returned only the domain name; contents UNKNOWN. Repo https://github.com/cyberbotics/webots-cloud is Apache-2.0, 3 stars, last push 2026-09-04.
- [S31] Web search "The Construct ROS Developers Academy review reddit worth it price" (no independent reviews found; vendor-forum posts only).
- [S32] Web search "MuJoCo WebAssembly browser demo ..." citing https://github.com/zalo/mujoco_wasm , https://pypi.org/project/mjswan/ , https://pypi.org/project/muwanx/ (community projects; licences not checked).
- [S33] https://gazebosim.org/docs/all/releases/ , Gazebo releases table, Open Robotics (Jetty Sep 2025 to May 2031 LTS; Ionic Dec 2026; Harmonic May 2029 LTS). Replaces the third-party mirror in [S4b].

## Fact-check log (2026-10-26)

Checker re-opened sources with WebFetch, GitHub API and web search on 2026-10-26. Verdicts: confirmed, corrected, unconfirmed.

| # | Claim | Verdict | Source |
|---|---|---|---|
| 1 | The Construct plans: Basic free, EUR 39.97/mo, EUR 439/yr, EUR 2,399/yr, 2 CPU/4 GB on Learner, 8 CPU/15 GB Enterprise | confirmed (page lists Learner 2CPUs + 4GB, Enterprise 8CPUs + 15GB; Learner includes 24/7 TurtleBot3 real robot lab) | https://www.theconstruct.ai/pricing/ |
| 2 | Foxglove Free/Pro/Academic prices and limits, "free forever" | confirmed (Pro also lists 3 projects; Academic gives 1 TB, 10 devices, unlimited users) | https://foxglove.dev/pricing |
| 3 | Foxglove price cut 2026-04-20, Team to Pro, $126 to $20 | confirmed | https://www.foxglove.dev/blog/reduced-self-service-pricing |
| 4 | Foxglove 2.0 discontinued open-source Studio; MCAP separate | confirmed; date corrected to 2024-03-11 (was "not confirmed") | S22 |
| 5 | foxglove/studio archived, 93 stars; foxglove-sdk MIT, 318 stars | confirmed | GitHub API |
| 6 | Isaac Sim minimum RTX 4080 16 GB, 32 GB RAM, 50 GB SSD; tiers | confirmed; Windows 11 and Ubuntu 22.04/24.04 supported, "container Linux-only" not seen so marked UNKNOWN | S12 |
| 7 | Isaac Sim/Lab licences | corrected: Isaac Sim Apache-2.0 with separately licensed components; Isaac Lab BSD-3-Clause, GitHub API says NOASSERTION (not Apache-2.0 as the draft said) | S10, S13 raw README/LICENSE |
| 8 | Isaac Sim free, ISV needs Omniverse Enterprise for Kit | confirmed | S11 |
| 9 | Gazebo Jetty/Harmonic EOL dates | corrected: Jetty May 2031, Harmonic May 2029 per official table (announcement text says Sept 2030) | S33, S5 |
| 10 | Ionic EOL December 2026, Jetty recommended, ROS 2 Lyrical | confirmed | S6 |
| 11 | Jetty platform support (Ubuntu 24.04 amd64 only official) and auto inertia from mass | confirmed | S5 |
| 12 | Webots Apache-2.0, 4.7k stars, 2.1k forks, R2025a latest | confirmed (4,723 / 2,089); nightly builds noted | GitHub API |
| 13 | Webots streaming: server-run, viewers read-only | corrected: guide says cannot interact, but shows toolbar buttons; marked unclear | S3 |
| 14 | MuJoCo 3.17.0 on 2026-10-22, 15,913 stars, Apache-2.0 | confirmed | GitHub API |
| 15 | MuJoCo WASM WIP, COOP/COEP for threads, Windows experimental | confirmed; source URL changed to unpinned latest; "cross-language debugging" cell downgraded to UNKNOWN | S19 |
| 16 | CoppeliaSim V4.10.0 rev0, tiers, no prices, browser viewer | confirmed; added Edu commercial-use inconsistency | S14 |
| 17 | VEXcode VR free Blocks, 15 playgrounds, Enhanced $199/educator/yr | unconfirmed first-hand (HTTP 403); second search summary agrees; Premium $499 added; "no student accounts" unconfirmed | S26 |
| 18 | robotbenchmark.net serves gambling spam | confirmed | S29 |
| 19 | Rerun Apache-2.0, 11,649 stars | confirmed | GitHub API |
| 20 | webots-cloud Apache-2.0, 3 stars, pushed 2026-09-04 | confirmed | GitHub API |

Not rechecked: forum quotes in S28, S27 community tool claims, S31, S32, VEX education site, Rerun web viewer features (all as labelled in the body).
