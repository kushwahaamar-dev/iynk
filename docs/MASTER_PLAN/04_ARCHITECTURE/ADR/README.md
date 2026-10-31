# ADR index

Status: specification, 2026-10-27. Owner: this file is the single index of architecture decision records (ADRs). Only one editor changes it; the other design seats change their own documents and ask for a row here.
Upstream: BRIEF 19.6 (the twelve-field ADR template); D-013 to D-017. Downstream: every document in `03_PRODUCT/` and `04_ARCHITECTURE/` that cites an `ADR-NNNN`.

## 1. Rules

1. An id means one decision in the whole plan. A bare `ADR-NNNN` is never reused by a second document.
2. Each range below belongs to one seat. A seat numbers its decisions only inside its own range.
3. Where a record is a file, the file is `ADR/ADR-NNNN-slug.md` and follows the BRIEF 19.6 template. Required fields: Problem, Considered options, Decision, Technical justification, Reversibility, Known limitations. Constraints, Performance data, Cost, Licensing, Security and Migration plan are included when they apply (RC-63). Where a record has no file yet, the row names the host document and section.
4. A renumbered id is never reused for its old meaning. The old id is listed once in section 5 so old text can be fixed by search.
5. A cross-reference to a decision in another document uses the new id and, the first time in a section, the document name (for example "ADR-0824 in EDUCATION 8.3").
6. Status values: `proposed` (written, not yet accepted by Amar), `accepted` (only Amar accepts), `superseded` (names its replacement), `pointer` (a number kept so citations resolve; the decision lives elsewhere), `pending RS-xx` (the choice waits for that spike; see TECHNICAL_RESEARCH section 6).

## 2. Ranges

| Range | Seat and host document | Form | Ids in use |
|---|---|---|---|
| 0001 to 0014 | System architecture, `SYSTEM_ARCHITECTURE.md` | files | 0001 to 0014 |
| 0100 to 0110 | Project data model, `PROJECT_DATA_MODEL.md` | files | 0100 to 0110 |
| 0200 to 0208 | Component schema, `COMPONENT_SCHEMA.md` section 12 | files | 0200 to 0208 |
| 0300 to 0315 | Simulation architecture, `SIMULATION_ARCHITECTURE.md` sections 1 and 20 | files | 0300 to 0315 |
| 0400 to 0409 | Frontend architecture, `FRONTEND_ARCHITECTURE.md` | files | 0400 to 0409 |
| 0420 to 0430 | Backend architecture, `BACKEND_ARCHITECTURE.md` | files | 0420 to 0430 |
| 0500 to 0511 | Realtime architecture, `REALTIME_ARCHITECTURE.md` | files | 0500 to 0511 |
| 0600 to 0613 | AI architecture, `AI_ARCHITECTURE.md` | files | 0600 to 0613 |
| 0700 to 0707 | Robotics architecture, `ROBOTICS_ARCHITECTURE.md` | files | 0700 to 0707 |
| 0710 to 0716 | Drone architecture, `DRONE_ARCHITECTURE.md` | files | 0710 to 0716 |
| 0800 to 0809 | Studio editor, `03_PRODUCT/STUDIO_EDITOR.md` section 21 | files | 0800 to 0808 (0809 free) |
| 0810 to 0819 | API contracts, `04_ARCHITECTURE/API_CONTRACTS.md` | files | 0810 to 0819 |
| 0820 to 0829 | Community, `03_PRODUCT/COMMUNITY.md` section 14 | proposed | 0820 to 0827 |
| 0830 to 0839 | Education, `03_PRODUCT/EDUCATION.md` section 15 | proposed | 0830 to 0835 |
| 0850 to 0859 | UX design system, `03_PRODUCT/UX_DESIGN_SYSTEM.md` section 21 | proposed | 0850 to 0857 |

No file is renamed to fit these ranges. The ranges follow what the owner documents and files already use (RC-61).

## 3. Index

### Files that exist in `ADR/`

### System architecture, 0001 to 0014

| ID | Title | Host document | Status | Owner |
|---|---|---|---|---|
| ADR-0001 | [A modular monolith in the existing repository, with enforced module boundaries](ADR-0001-modular-monolith-and-module-boundaries.md) | SYSTEM_ARCHITECTURE | proposed | system architecture |
| ADR-0002 | [Local-first, with a capability probe instead of a hosted status route](ADR-0002-local-first-and-capability-probe.md) | SYSTEM_ARCHITECTURE | proposed | system architecture |
| ADR-0003 | [The optional server is one separate Node process, not Next route handlers](ADR-0003-optional-server-as-a-separate-node-process.md) | SYSTEM_ARCHITECTURE | proposed | system architecture |
| ADR-0004 | [SQLite as the server store, behind a port](ADR-0004-sqlite-as-the-server-store.md) | SYSTEM_ARCHITECTURE | proposed | system architecture |
| ADR-0005 | [Execution placement and worker topology](ADR-0005-execution-placement-and-worker-topology.md) | SYSTEM_ARCHITECTURE | proposed | system architecture |
| ADR-0006 | [Packaging, and how the app runs with no server](ADR-0006-packaging-and-no-server-mode.md) | SYSTEM_ARCHITECTURE | proposed | system architecture |
| ADR-0007 | [Device identity without accounts](ADR-0007-device-identity-without-accounts.md) | SYSTEM_ARCHITECTURE | proposed | system architecture |
| ADR-0008 | [AI access with keys the user brings](ADR-0008-ai-access-with-user-keys.md) | SYSTEM_ARCHITECTURE | proposed | system architecture |
| ADR-0009 | [Search, MCP and other external services](ADR-0009-search-mcp-and-external-services.md) | SYSTEM_ARCHITECTURE | proposed | system architecture |
| ADR-0010 | [Observability for a self-hoster](ADR-0010-observability-for-a-self-hoster.md) | SYSTEM_ARCHITECTURE | proposed | system architecture |
| ADR-0011 | [Background jobs as in-process timers](ADR-0011-background-jobs-without-a-queue.md) | SYSTEM_ARCHITECTURE | proposed | system architecture |
| ADR-0012 | [Offline application shell with an explicit update flow](ADR-0012-offline-application-shell.md) | SYSTEM_ARCHITECTURE | proposed | system architecture |
| ADR-0013 | [Compile service deployment shape](ADR-0013-compile-service-deployment-shape.md) | SYSTEM_ARCHITECTURE | pending RS-04, RS-05, RS-17 | system architecture |
| ADR-0014 | [Repository layout and the portable-code toolchain](ADR-0014-repository-layout-and-portable-code-toolchain.md) | SYSTEM_ARCHITECTURE | proposed | system architecture |

### Project data model, 0100 to 0110

| ID | Title | Host document | Status | Owner |
|---|---|---|---|---|
| ADR-0100 | [The project is one JSON document, defined by one JSON Schema](ADR-0100-canonical-project-document.md) | PROJECT_DATA_MODEL | proposed | project data model |
| ADR-0101 | [Nets are the electrical truth; wires and breadboard holes are layout](ADR-0101-net-first-connectivity.md) | PROJECT_DATA_MODEL | proposed | project data model |
| ADR-0102 | [Prefixed random identifiers; refdes, pin ids and part ids are separate](ADR-0102-identifiers.md) | PROJECT_DATA_MODEL | proposed | project data model |
| ADR-0103 | [Base units with named exceptions; RFC 8785 canonical JSON and one state hash](ADR-0103-units-and-canonical-bytes.md) | PROJECT_DATA_MODEL | proposed | project data model |
| ADR-0104 | [One operation vocabulary and one pure apply function for edits, rooms, undo, AI proposals and replay](ADR-0104-operation-log.md) | PROJECT_DATA_MODEL | proposed | project data model |
| ADR-0105 | [MAJOR.MINOR schema versions with a chain of pure migrations; newer files are refused](ADR-0105-schema-versions-and-migrations.md) | PROJECT_DATA_MODEL | proposed | project data model |
| ADR-0106 | [IndexedDB for the working copy, `.iynk` and `.iynkz` files for the copy you own](ADR-0106-local-storage-and-files.md) | PROJECT_DATA_MODEL | proposed | project data model |
| ADR-0107 | [Parts are referenced by `{ref, version}` and the project pins an interface snapshot](ADR-0107-part-references-and-pinned-interfaces.md) | PROJECT_DATA_MODEL | proposed | project data model |
| ADR-0108 | [The 38 catalogue items become 12 part descriptors and 140 projects, by a script, and the TypeScript ](ADR-0108-catalogue-conversion.md) | PROJECT_DATA_MODEL | proposed | project data model |
| ADR-0109 | [Each external format is a small converter that returns a loss report; no format is promised to round](ADR-0109-import-export-and-loss-reports.md) | PROJECT_DATA_MODEL | proposed | project data model |
| ADR-0110 | [Validate with JSON Schema through standalone-compiled Ajv, then plain-code passes for what a schema ](ADR-0110-validation-engine.md) | PROJECT_DATA_MODEL | proposed | project data model |

### Component schema, 0200 to 0208

| ID | Title | Host document | Status | Owner |
|---|---|---|---|---|
| ADR-0200 | [Part descriptor format and location](ADR-0200-part-descriptor-format-and-location.md) | COMPONENT_SCHEMA | proposed | component schema |
| ADR-0201 | [Ratings with manufacturer, simulation and measured slots](ADR-0201-ratings-with-manufacturer-simulation-and-measured-slots.md) | COMPONENT_SCHEMA | proposed | component schema |
| ADR-0202 | [Layered behaviour with named model kinds](ADR-0202-layered-behaviour-with-named-model-kinds.md) | COMPONENT_SCHEMA | proposed | component schema |
| ADR-0203 | [Failure modes as data, with derivation and implementation status](ADR-0203-failure-modes-as-data.md) | COMPONENT_SCHEMA | proposed | component schema |
| ADR-0204 | [Art by reference, with a mandatory generic fallback](ADR-0204-art-by-reference-with-a-mandatory-generic-fallback.md) | COMPONENT_SCHEMA | proposed | component schema |
| ADR-0205 | [Versioning, pinning and immutability](ADR-0205-versioning-pinning-and-immutability.md) | COMPONENT_SCHEMA | proposed | component schema |
| ADR-0206 | [Extension boundary: API first, container pending RS-15](ADR-0206-extension-boundary-api-first-container-pending-rs-15.md) | COMPONENT_SCHEMA | proposed | component schema |
| ADR-0207 | [Sharing without a marketplace: packs and a trust ladder](ADR-0207-sharing-without-a-marketplace-packs-and-a-trust-ladder.md) | COMPONENT_SCHEMA | proposed | component schema |
| ADR-0208 | [The descriptor is the authored source for part-model and failure-model registry entries](ADR-0208-descriptor-is-source-for-registry-entries.md) | COMPONENT_SCHEMA | proposed | component schema |

### Frontend architecture, 0400 to 0409

| ID | Title | Host document | Status | Owner |
|---|---|---|---|---|
| ADR-0400 | [Frontend code uses the SYSTEM module map and import matrix, enforced by lint and a test](ADR-0400-module-layers.md) | FRONTEND_ARCHITECTURE | proposed | frontend and backend architecture |
| ADR-0401 | [Studio is a static client page; the project is chosen by the URL fragment](ADR-0401-studio-static-client-page.md) | FRONTEND_ARCHITECTURE | proposed | frontend and backend architecture |
| ADR-0402 | [Three stores by lifetime, DocStore as the adapter over ProjectSession, and one command layer](ADR-0402-three-stores-and-commands.md) | FRONTEND_ARCHITECTURE | proposed | frontend and backend architecture |
| ADR-0403 | [An imperative editor engine behind an interface, fed by a pure DrawList](ADR-0403-editor-engine-boundary.md) | FRONTEND_ARCHITECTURE | proposed | frontend and backend architecture |
| ADR-0404 | [One RPC envelope for every worker; WASM engines as verified static files](ADR-0404-workers-rpc-and-wasm-engines.md) | FRONTEND_ARCHITECTURE | proposed | frontend and backend architecture |
| ADR-0405 | [CSP by hashes from Next's SRI, not nonces](ADR-0405-csp-hashes-not-nonces.md) | FRONTEND_ARCHITECTURE | proposed | frontend and backend architecture |
| ADR-0406 | [A hand-written service worker; `useOffline` not enabled](ADR-0406-offline-service-worker.md) | FRONTEND_ARCHITECTURE | proposed | frontend and backend architecture |
| ADR-0407 | [Bundle and idle-CPU budgets as numbers that fail CI](ADR-0407-bundle-and-cpu-budgets-in-ci.md) | FRONTEND_ARCHITECTURE | proposed | frontend and backend architecture |
| ADR-0408 | [Studio strings as props from the static page; heavy text on demand](ADR-0408-studio-i18n-loading.md) | FRONTEND_ARCHITECTURE | proposed | frontend and backend architecture |
| ADR-0409 | [Injected interfaces for time, ids, workers, storage, transports and engines](ADR-0409-testing-seams.md) | FRONTEND_ARCHITECTURE | proposed | frontend and backend architecture |

### Backend architecture, 0420 to 0430

| ID | Title | Host document | Status | Owner |
|---|---|---|---|---|
| ADR-0420 | [The server is a separate Node process; the web app has no API routes](ADR-0420-server-process.md) | BACKEND_ARCHITECTURE | proposed | frontend and backend architecture |
| ADR-0421 | [Device keys, short-lived signed tokens, invite and pairing enrolment](ADR-0421-device-identity.md) | BACKEND_ARCHITECTURE | superseded by ADR-0007 and ADR-0502 | frontend and backend architecture |
| ADR-0422 | [One SQLite file behind a ServerStore interface with forward-only migrations](ADR-0422-sqlite-store.md) | BACKEND_ARCHITECTURE | superseded by ADR-0004 | frontend and backend architecture |
| ADR-0423 | [Server-ordered rooms with durable op log, snapshots and server-enforced authority](ADR-0423-server-ordered-rooms.md) | BACKEND_ARCHITECTURE | proposed | frontend and backend architecture |
| ADR-0424 | [In-process token buckets keyed by device, trusted-proxy hop count, persisted usage](ADR-0424-rate-limits-and-abuse.md) | BACKEND_ARCHITECTURE | proposed | frontend and backend architecture |
| ADR-0425 | [Keys in the browser; direct, proxy and operator transports; SSRF-guarded proxy](ADR-0425-bring-your-own-keys.md) | BACKEND_ARCHITECTURE | proposed | frontend and backend architecture |
| ADR-0426 | [Share links are capability ids to stored snapshots; no library sync](ADR-0426-share-links.md) | BACKEND_ARCHITECTURE | proposed | frontend and backend architecture |
| ADR-0427 | [The compile service is an interface and a disabled route until the spikes report](ADR-0427-compile-service-slot.md) | BACKEND_ARCHITECTURE | proposed | frontend and backend architecture |
| ADR-0428 | [Environment-only configuration, refuse unsafe values, secrets never in the database](ADR-0428-secrets-and-configuration.md) | BACKEND_ARCHITECTURE | proposed | frontend and backend architecture |
| ADR-0429 | [Structured logs, minimal health, separate metrics listener, redacted diagnostics](ADR-0429-observability-for-self-hosters.md) | BACKEND_ARCHITECTURE | proposed | frontend and backend architecture |
| ADR-0430 | [Share `core` and `protocol` source with the server through Node type stripping](ADR-0430-shared-code-and-build.md) | BACKEND_ARCHITECTURE | superseded by ADR-0014 | frontend and backend architecture |

### Realtime architecture, 0500 to 0511

| ID | Title | Host document | Status | Owner |
|---|---|---|---|---|
| ADR-0500 | [Rooms use the server-ordered operation log; no CRDT for the graph; a text CRDT is held in reserve](ADR-0500-server-ordered-op-log-for-rooms.md) | REALTIME_ARCHITECTURE | proposed | realtime architecture |
| ADR-0501 | [Wire protocol version 2: JSON frames, gzip above 4 KiB, closed frame set, versions and codes](ADR-0501-wire-protocol-v2.md) | REALTIME_ARCHITECTURE | proposed | realtime architecture |
| ADR-0502 | [Sockets are authenticated by a device key; the server derives the member identity](ADR-0502-device-key-socket-authentication.md) | REALTIME_ARCHITECTURE | proposed | realtime architecture |
| ADR-0503 | [Rooms are created, never implied; invites are capabilities; a stranger learns nothing](ADR-0503-rooms-created-not-implied-invites-as-capabilities.md) | REALTIME_ARCHITECTURE | proposed | realtime architecture |
| ADR-0504 | [Roles, host, baton and spectators are enforced inside the apply path](ADR-0504-roles-host-baton-spectators.md) | REALTIME_ARCHITECTURE | proposed | realtime architecture |
| ADR-0505 | [One SQLite file holds the room log, checkpoints, ACL, invites and audit](ADR-0505-room-store-sqlite.md) | REALTIME_ARCHITECTURE | proposed | realtime architecture |
| ADR-0506 | [Simulation in rooms: the server orders, the runner clocks, peers mirror](ADR-0506-simulation-authority-in-rooms.md) | REALTIME_ARCHITECTURE | proposed | realtime architecture |
| ADR-0507 | [Presence, cursors and chat are ephemeral channels, batched by the server](ADR-0507-presence-cursors-chat-ephemeral.md) | REALTIME_ARCHITECTURE | proposed | realtime architecture |
| ADR-0508 | [Offline edits are rebased by replay; when that is not wanted the work becomes a fork](ADR-0508-offline-edits-rebase-and-fork.md) | REALTIME_ARCHITECTURE | proposed | realtime architecture |
| ADR-0509 | [An audit trail and host controls replace public moderation](ADR-0509-audit-trail-and-host-controls.md) | REALTIME_ARCHITECTURE | proposed | realtime architecture |
| ADR-0510 | [Server-enforced limits and a named hostile-client suite](ADR-0510-limits-and-hostile-client-suite.md) | REALTIME_ARCHITECTURE | proposed | realtime architecture |
| ADR-0511 | [The room host is a module of the single self-hosted server](ADR-0511-room-host-in-the-self-hosted-server.md) | REALTIME_ARCHITECTURE | proposed | realtime architecture |

### AI architecture, 0600 to 0613

| ID | Title | Host document | Status | Owner |
|---|---|---|---|---|
| ADR-0600 | [The partner runs in the browser; the model call is browser to provider with the user's key, or throu](ADR-0600-ai-runs-in-the-browser.md) | AI_ARCHITECTURE | proposed | AI architecture |
| ADR-0601 | [The model reads a context pack: typed sources, four trust classes, one text serialisation, a token b](ADR-0601-context-pack.md) | AI_ARCHITECTURE | proposed | AI architecture |
| ADR-0602 | [Tools in three kinds of power: read, propose, effect; op schemas come from the project schema](ADR-0602-tool-set.md) | AI_ARCHITECTURE | proposed | AI architecture |
| ADR-0603 | [AI changes are operation proposals: validated, dry-run, previewed, accepted by a person, applied as ](ADR-0603-operation-proposals.md) | AI_ARCHITECTURE | proposed | AI architecture |
| ADR-0604 | [Prompt-injection defence assumes a compromised model: capability gating, taint, nonce fences, render](ADR-0604-injection-defence.md) | AI_ARCHITECTURE | proposed | AI architecture |
| ADR-0605 | [Modes are enforced by tool gating and context exclusion, not only by the prompt; the hint ladder is ](ADR-0605-pedagogical-modes.md) | AI_ARCHITECTURE | proposed | AI architecture |
| ADR-0606 | [One adapter interface with a capability descriptor; two families cover the field; local models are f](ADR-0606-provider-adapters.md) | AI_ARCHITECTURE | proposed | AI architecture |
| ADR-0607 | [Routing is data: three tiers mapped by the user, explicit escalation rules, a user-chosen fallback l](ADR-0607-routing-and-fallback.md) | AI_ARCHITECTURE | proposed | AI architecture |
| ADR-0608 | [Cache-friendly request layout: stable prefix, volatile tail, canonical bytes; a local memo for read ](ADR-0608-prompt-caching.md) | AI_ARCHITECTURE | proposed | AI architecture |
| ADR-0609 | [A local ledger with day, month and session caps checked before every call with a worst-case estimate](ADR-0609-spend-cap-and-ledger.md) | AI_ARCHITECTURE | proposed | AI architecture |
| ADR-0610 | [Local observability: one log row per call without content, an activity panel, opt-in expiring conten](ADR-0610-observability-and-preview.md) | AI_ARCHITECTURE | proposed | AI architecture |
| ADR-0611 | [The adversarial suite and the evaluation set are CI gates in different ways](ADR-0611-adversarial-and-eval-suites.md) | AI_ARCHITECTURE | proposed | AI architecture |
| ADR-0612 | [The relay is stateless, authenticated, allowlisted and does not log bodies](ADR-0612-ai-relay.md) | AI_ARCHITECTURE | proposed | AI architecture |
| ADR-0613 | [Threads, attempts and the learner digest are stored locally per project under a retention setting an](ADR-0613-threads-memory-retention.md) | AI_ARCHITECTURE | proposed | AI architecture |

### Robotics, 0700 to 0707, and drones, 0710 to 0716

| ID | Title | Host document | Status | Owner |
|---|---|---|---|---|
| ADR-0700 | [Robot physics runs on Rapier, one engine for planar and 3D robots](ADR-0700-robot-physics-engine.md) | ROBOTICS_ARCHITECTURE | proposed | robotics architecture |
| ADR-0701 | [A robot is a Studio project; its physics data lives in `domains.robotics.data`](ADR-0701-robot-in-project-document.md) | ROBOTICS_ARCHITECTURE | proposed | robotics architecture |
| ADR-0702 | [Motors, servos, steppers and drivers are coupled to joints by torque impulses; PWM uses a closed for](ADR-0702-actuators-and-pwm.md) | ROBOTICS_ARCHITECTURE | proposed | robotics architecture |
| ADR-0703 | [Robot sensors read the physics world through five query types](ADR-0703-robot-sensors.md) | ROBOTICS_ARCHITECTURE | proposed | robotics architecture |
| ADR-0704 | [Robot code runs on the board runtime; the plant steps at 240 Hz; encoder edges are timestamped insid](ADR-0704-control-timing.md) | ROBOTICS_ARCHITECTURE | proposed | robotics architecture |
| ADR-0705 | [A tf tree from the document, odometry with ground truth beside it, and a navigation ladder that stop](ADR-0705-transforms-odometry-navigation.md) | ROBOTICS_ARCHITECTURE | proposed | robotics architecture |
| ADR-0706 | [A native ROS-like graph, URDF import and export for a stated subset, and a real ROS 2 bridge only as](ADR-0706-ros2-urdf-interop.md) | ROBOTICS_ARCHITECTURE | proposed | robotics architecture |
| ADR-0707 | [Seven robot templates, finished one at a time, reusing the electronics benches](ADR-0707-robot-templates.md) | ROBOTICS_ARCHITECTURE | proposed | robotics architecture |
| ADR-0710 | [Drone parts are data in descriptors; the legacy calculator remains only for the 13 migrated crafts](ADR-0710-drone-parts-as-data.md) | DRONE_ARCHITECTURE | proposed | drone architecture |
| ADR-0711 | [Propulsion is a closed-form motor and propeller solve with a datasheet fit and an error band](ADR-0711-propulsion-model.md) | DRONE_ARCHITECTURE | proposed | drone architecture |
| ADR-0712 | [Two flight models behind one interface, the preserved game model and a new 6-DoF rigid-body model](ADR-0712-flight-models.md) | DRONE_ARCHITECTURE | proposed | drone architecture |
| ADR-0713 | [The flight controller is iynk's own cascaded PID, and CLI settings bind to its parameters](ADR-0713-flight-controller.md) | DRONE_ARCHITECTURE | proposed | drone architecture |
| ADR-0714 | [Drone faults come from the dynamics; wind, noise and failures are seeded and recorded; traces are co](ADR-0714-faults-environment-replay.md) | DRONE_ARCHITECTURE | proposed | drone architecture |
| ADR-0715 | [PX4 SIH as an offline oracle first; a local bridge to SITL only on a stated need; nothing hosted](ADR-0715-sitl-option.md) | DRONE_ARCHITECTURE | proposed | drone architecture |
| ADR-0716 | [Safety notices and the dual-use content rule are data with tests](ADR-0716-drone-safety-and-dual-use.md) | DRONE_ARCHITECTURE | proposed | drone architecture |

### Studio editor, 0800 to 0808

| ID | Title | Host document | Status | Owner |
|---|---|---|---|---|
| ADR-0800 | [One Studio workspace; views are lenses over one document; domain tools are tool packs](ADR-0800-one-studio-workspace-with-tool-packs.md) | STUDIO_EDITOR | proposed | Studio editor |
| ADR-0801 | [The canvas is an SVG scene core behind a Renderer interface, with level of detail and culling from t](ADR-0801-canvas-renderer-svg-scene-core.md) | STUDIO_EDITOR | proposed | Studio editor |
| ADR-0802 | [Tools are pure functions from document and gesture to a batch of ops; net operations come from helpe](ADR-0802-tools-are-pure-functions-to-op-batches.md) | STUDIO_EDITOR | proposed | Studio editor |
| ADR-0803 | [Refuse only what has no physical meaning; flag everything electrical through the shared static rules](ADR-0803-connection-rules-refuse-little-flag-much.md) | STUDIO_EDITOR | proposed | Studio editor |
| ADR-0804 | [Unplaced parts: a tray in the breadboard view, computed auto layout elsewhere, frozen on first manua](ADR-0804-unplaced-parts-tray-and-computed-layout.md) | STUDIO_EDITOR | proposed | Studio editor |
| ADR-0805 | [Undo is per author, in memory, built from apply inverses, with two scopes (canvas and code)](ADR-0805-per-author-undo-two-scopes.md) | STUDIO_EDITOR | proposed | Studio editor |
| ADR-0806 | [Lifecycle: IndexedDB library plus files, one writer tab by Web Lock, fork-on-open for templates and ](ADR-0806-project-lifecycle-fork-on-open-and-tab-lock.md) | STUDIO_EDITOR | proposed | Studio editor |
| ADR-0807 | [An outline pane is the accessible twin of the canvas; every canvas action has a list-based keyboard ](ADR-0807-outline-pane-as-accessible-twin.md) | STUDIO_EDITOR | pending RS-16 | Studio editor |
| ADR-0808 | [Edits during a run: every op kind has one class; circuit and program changes mark the run stale; lay](ADR-0808-edits-during-a-run-op-classes.md) | STUDIO_EDITOR | proposed | Studio editor |

### Simulation architecture, 0300 to 0315

All sixteen files exist (RC-62). ADR-0306 is a pointer to ADR-0013.

| ID | Title | Host document | Status | Owner |
|---|---|---|---|---|
| ADR-0300 | [One layered model; one orchestrator owns the clock in a dedicated Worker](ADR-0300-one-layered-model-and-orchestrator.md) | SIMULATION_ARCHITECTURE | proposed | simulation architecture |
| ADR-0301 | [One simulation clock in integer nanoseconds](ADR-0301-integer-nanosecond-simulation-clock.md) | SIMULATION_ARCHITECTURE | proposed | simulation architecture |
| ADR-0302 | [Fidelity tiers T0 to T3 plus a separate "bench-checked" mark, never "validated"](ADR-0302-fidelity-tiers-and-bench-checked-mark.md) | SIMULATION_ARCHITECTURE | proposed | simulation architecture |
| ADR-0303 | [Determinism classes B, N, D and the `dmath` module](ADR-0303-determinism-classes-and-dmath.md) | SIMULATION_ARCHITECTURE | proposed | simulation architecture |
| ADR-0304 | [Circuit solver: keep and extract the MNA core; ngspice WASM as oracle](ADR-0304-circuit-solver-keep-and-extract.md) | SIMULATION_ARCHITECTURE | proposed | simulation architecture |
| ADR-0305 | [MCU execution: interpreters default, avr8js opt-in, rp2040js as oracle](ADR-0305-mcu-execution-interpreters-default-avr8js-opt-in.md) | SIMULATION_ARCHITECTURE | proposed | simulation architecture |
| ADR-0306 | [Compile path for real firmware (points to ADR-0013)](ADR-0306-compile-path-pointer-to-adr-0013.md) | SIMULATION_ARCHITECTURE | pointer | simulation architecture |
| ADR-0307 | [Peripheral buses as first-class models](ADR-0307-peripheral-buses-as-first-class-models.md) | SIMULATION_ARCHITECTURE | proposed | simulation architecture |
| ADR-0308 | [Rigid-body physics: Rapier behind a `PhysicsBackend` interface](ADR-0308-rigid-body-physics-rapier-behind-an-interface.md) | SIMULATION_ARCHITECTURE | proposed | simulation architecture |
| ADR-0309 | [Flight dynamics: split by craft class; `flight-game@1` and `multirotor-rigid@1`](ADR-0309-flight-dynamics-split-by-craft-class.md) | SIMULATION_ARCHITECTURE | proposed | simulation architecture |
| ADR-0310 | [The fidelity registry is data under version control](ADR-0310-fidelity-registry-as-data.md) | SIMULATION_ARCHITECTURE | proposed | simulation architecture |
| ADR-0311 | [Execution budgets and isolation](ADR-0311-execution-budgets-and-isolation.md) | SIMULATION_ARCHITECTURE | proposed | simulation architecture |
| ADR-0312 | [Snapshots, replay and divergence detection](ADR-0312-snapshots-replay-and-divergence-detection.md) | SIMULATION_ARCHITECTURE | proposed | simulation architecture |
| ADR-0313 | [Instrumentation through a probe tap with provenance on every reading](ADR-0313-probe-tap-with-provenance.md) | SIMULATION_ARCHITECTURE | proposed | simulation architecture |
| ADR-0314 | [Faults are operations on the model; failures are derived](ADR-0314-faults-as-operations-and-derived-failures.md) | SIMULATION_ARCHITECTURE | proposed | simulation architecture |
| ADR-0315 | [Verilog: TypeScript simulator stays; Yosys is an optional Inspect mode](ADR-0315-verilog-typescript-simulator-stays-yosys-inspect.md) | SIMULATION_ARCHITECTURE | proposed | simulation architecture |

### Records still inline (no file in `ADR/` yet)

#### Education, 0830 to 0835 (host: `EDUCATION.md` section 15, "Decisions (ADRs) and how they were reached")

| ID | Title | Old id | Status | Owner |
|---|---|---|---|---|
| ADR-0830 | The guided plan lives in `ext["x-iynk-guided"]`, evaluated by a pure engine; progress is outside the document | ADR-0800 | proposed | education |
| ADR-0831 | Meaningful pass = gates `edit` + `quiz` + `checks`, plus an optional goal test; legacy completions imported as `legacy` | ADR-0801 | proposed | education |
| ADR-0832 | A diagnose item is a project with one materialised fault, a sealed answer, and the D-010 record unchanged | ADR-0802 | proposed | education |
| ADR-0833 | Hint ladder of three levels, opened in order, logged | ADR-0803 | proposed | education |
| ADR-0834 | Challenge results are verified by re-running the original tests on the submission in the receiver's app | ADR-0804 | proposed | education |
| ADR-0835 | Third-party clearance per project `thirdParty` rows; English rewritten from fact sheets | ADR-0805 | proposed | education |

#### Community, 0820 to 0827 (host: `COMMUNITY.md` section 14, "Decisions as ADRs (summaries)")

| ID | Title | Old id | Status | Owner |
|---|---|---|---|---|
| ADR-0820 | Buddy identity and pairing without accounts | ADR-0800 | proposed | community |
| ADR-0821 | Server-side visibility from the live pair table | ADR-0801 | proposed | community |
| ADR-0822 | Shares are signed immutable snapshots | ADR-0802 | proposed | community |
| ADR-0823 | Attribution through existing provenance fields | ADR-0803 | proposed | community |
| ADR-0824 | Leaderboard counts personal bests per subject | ADR-0804 | proposed | community |
| ADR-0825 | Build inputs in `ext["iynk.build"]`; outputs derived | ADR-0805 | proposed | community |
| ADR-0826 | Flashing recipes as companion files | ADR-0806 | proposed | community |
| ADR-0827 | Live prices only with the user's key, on request, with a stated cost | ADR-0807 | proposed | community |

#### API contracts, 0810 to 0819

Host: `API_CONTRACTS.md` section 17. All ten files exist.

| ID | Title | Host document | Status | Owner |
|---|---|---|---|---|
| ADR-0810 | [REST and JSON under /v1 with one error envelope, cursor pages, idempotency keys and ETags](ADR-0810-rest-json-v1-contract.md) | API_CONTRACTS | proposed | API contracts |
| ADR-0811 | [Sign-in by challenge and signature, with an opaque 12-hour bearer token](ADR-0811-sign-in-by-challenge-and-opaque-bearer-token.md) | API_CONTRACTS | proposed | API contracts |
| ADR-0812 | [Every shared secret is a capability: 128 random bits, shown once, stored as a hash, with expiry and use count](ADR-0812-secrets-are-capabilities.md) | API_CONTRACTS | proposed | API contracts |
| ADR-0813 | [Idempotency keys on creating POSTs, ETag and If-Match on documents, no merge, explicit overwrite](ADR-0813-idempotency-etag-and-explicit-overwrite.md) | API_CONTRACTS | proposed | API contracts |
| ADR-0814 | [Keyset cursors signed by the server, limit up to 200, no totals](ADR-0814-signed-keyset-cursors.md) | API_CONTRACTS | proposed | API contracts |
| ADR-0815 | [The server imports and exports only .iynk and .iynkz; other formats convert in the browser](ADR-0815-server-handles-only-iynk-files.md) | API_CONTRACTS | proposed | API contracts |
| ADR-0816 | [One stateless AI relay and typed search routes; provider keys travel in a header and are never stored](ADR-0816-ai-relay-and-search-proxy-keys-by-header.md) | API_CONTRACTS | proposed | API contracts |
| ADR-0817 | [A share link is an immutable read-only snapshot, served as an anonymised copy](ADR-0817-share-links-are-anonymised-snapshots.md) | API_CONTRACTS | proposed | API contracts |
| ADR-0818 | [No telemetry, counter or public read endpoint exists](ADR-0818-no-telemetry-or-public-read-endpoints.md) | API_CONTRACTS | proposed | API contracts |
| ADR-0819 | [openapi.yaml is the contract, served at /v1/openapi.json](ADR-0819-openapi-file-is-the-contract.md) | API_CONTRACTS | proposed | API contracts |

#### UX design system, 0850 to 0857 (host: `UX_DESIGN_SYSTEM.md` section 21)

| ID | Title | Old id | Status | Owner |
|---|---|---|---|---|
| ADR-0850 | Keep the paper and ink identity; Plate and Bench registers | ADR-0500 | proposed | UX design |
| ADR-0851 | Three-layer CSS tokens with a contrast gate | ADR-0501 | proposed | UX design |
| ADR-0852 | Level (beginner, intermediate, advanced) is a per-viewer view setting | ADR-0502 | proposed | UX design |
| ADR-0853 | DOM structure tree beside the canvas; list-based wiring | ADR-0503 | proposed | UX design |
| ADR-0854 | Language as a layout constraint; glossary as data | ADR-0504 | proposed | UX design |
| ADR-0855 | One performance ladder: `full`, `light`, `minimal` | ADR-0505 | proposed | UX design |
| ADR-0856 | Motion contract and flash limit | ADR-0506 | proposed | UX design |
| ADR-0857 | Tabs and sheets on phone | ADR-0507 | proposed | UX design |

## 4. Known overlaps inside the files (not renumbered)

| Pair | Relationship | Rule |
|---|---|---|
| ADR-0007 and ADR-0421 | 0421 is `superseded` by ADR-0007 (enrolment, token) and ADR-0502 (socket); 0422 by ADR-0004; 0430 by ADR-0014 | Cite the replacement, never the superseded id |
| ADR-0003 and ADR-0420 | Both say the server is a separate Node process | ADR-0003 is the decision; 0420 is the backend detail. Cite both when the layout matters |
| ADR-0004 and ADR-0505 | Both choose one SQLite file | ADR-0004 decides the store, ADR-0505 the room tables |
| ADR-0002 and ADR-0012 and ADR-0406 | Local-first, offline shell, service worker | ADR-0002 policy, ADR-0012 flow, ADR-0406 implementation (0406 wins) |
| ADR-0819 vs ADR-0420 to 0430 | API reconciles with the backend range | See API_CONTRACTS "Cross-document alignment" |

These pairs are consistent decisions at different levels. If a later review finds a real conflict, supersede one by status rather than renumbering.

## 5. Renumber map (old id to new id)

Search each document for the old id in the listed places only; the same bare id may be correct elsewhere. No file is renamed (RC-61).

| Document | Old id | New id | Notes |
|---|---|---|---|
| EDUCATION | ADR-0800 to ADR-0805 | ADR-0830 to ADR-0835 | Education decisions only. Challenge verification is ADR-0834 |
| COMMUNITY | ADR-0800 to ADR-0807 | ADR-0820 to ADR-0827 | Community decisions only |
| COMMUNITY | ADR-0804 meaning challenge verification | ADR-0834 | COMMUNITY lines that cite EDUCATION 8.3 |
| UX_DESIGN_SYSTEM | ADR-0500 to ADR-0507 | ADR-0850 to ADR-0857 | UX decisions only |
| API_CONTRACTS | first draft ADR-0800 to ADR-0809 | ADR-0810 to ADR-0819 | Files exist under these numbers; the 0840 to 0849 range is withdrawn |
| DECISION_REGISTER | ADR-0801, ADR-0806, ADR-0807 (D-018, D-020, D-021) | ADR-0811, ADR-0816, ADR-0817 | Per RC-61 |
| Any document | bare ADR-0500 to ADR-0511 | no change | They mean the realtime decisions |
| Any document | ADR-0800 to ADR-0808 | no change | They mean the Studio editor decisions only |

Mapping rule: new = old + 30 for EDUCATION, + 20 for COMMUNITY, + 350 for UX (0500 becomes 0850).

Checks to run after the renumber (all must print nothing unexpected):

```
grep -rnE 'ADR-0(84[0-9])' 03_PRODUCT 04_ARCHITECTURE                                                           # none: the 0840 range is withdrawn
grep -nE 'ADR-05[0-9]{2}' 03_PRODUCT/UX_DESIGN_SYSTEM.md                                                         # none, unless a realtime cite
grep -rnoE 'ADR-0[0-9]{3}' 03_PRODUCT 04_ARCHITECTURE | awk -F: '{print $NF}' | sort -u                          # each id appears in this index
```

## 6. Open points

| Id | Point | Owner |
|---|---|---|
| O-1 | The 0820 to 0827, 0830 to 0835 and 0850 to 0857 records are table rows. Decide whether each becomes a file at its phase gate (Amar's OK per D-014). | each seat |

## Review fixes (2026-10-27)

| # | Issue | Verdict | What I did |
|---|---|---|---|
| 1 | ADR numbering collisions (0800 to 0809 claimed by four documents; 0500 to 0507 shared with realtime; inline 0200s and 0300s without files) | Applied, with three corrections to the stated facts | Created this index and assigned 0820s education, 0830s community, 0840s API, 0850s UX; Studio keeps 0800 to 0809. Listed every id with file or host section, status and owner (sections 2 and 3). Gave exact old-to-new maps and grep checks (section 5). |
| 1a | "ADR-0200 to 0208 have no file" | Wrong now | All nine exist in `ADR/`. They are listed as files. Superseded by RC-62: 0300 to 0315 are files too (all sixteen listed with links). Only the 0830, 0820 and UX table-row records remain without a file. |
| 1b | API_CONTRACTS uses ADR-0800 to 0809 | Partly stale | The file already moved to 0810 to 0819 (line 3, 984 to 993) and links files that do not exist. I mapped from the current ids and also recorded the first-draft ids. I reserved 0810 to 0819 so any leftover hit is flagged. |
| 1c | UX ADR-0500 "paper and ink identity" collides with realtime 0500 to 0507 | Correct | Realtime keeps 0500 to 0511 (12 files exist); UX takes 0850 to 0857. UX has eight records (0500 to 0507). |
| 1d | "ADR-0310 referenced from five documents as if it exists" | Correct as to the file, fine as to the decision | ADR-0310 was an inline decision in SIMULATION_ARCHITECTURE section 1 and 16; superseded by RC-62, it is now a file (ADR-0310-fidelity-registry-as-data.md). It is now listed with host section. No renumber needed. |
| 2 | Each document renumbers its own block and cross-references | Not done here | This task allows editing only `ADR/README.md`. Section 5 gives the line-level list for the owners of the four documents. I did not edit them. |

Evidence read: the ADR directory listing (105 files), the first line and status of each, the ADR tables in SIMULATION_ARCHITECTURE, COMPONENT_SCHEMA, STUDIO_EDITOR, EDUCATION, COMMUNITY, API_CONTRACTS and UX_DESIGN_SYSTEM, and a grep of `ADR-0[0-9]{3}` across `03_PRODUCT` and `04_ARCHITECTURE`. VERIFIED by those reads. Line numbers in section 5 come from the review text and the greps and will drift as the owners edit.

## Reconcile and spike fold-in (2026-10-27)

| Id | Change |
|---|---|
| RC-61 | Section 2 ranges: STUDIO 0800-0809, API 0810-0819 (files exist), COMMUNITY 0820-0829 (0820-0827 in use), EDUCATION 0830-0839 (0830-0835 in use), UX 0850-0859 (0850-0857 in use). Removed the "reserved 0810-0819" note and the 0840-0849 API range. Section 3 tables for education, community and API renumbered; API rows now link the ten files. Section 5 rewritten. Open points O-2 and O-3 deleted (the API files exist; ADR-0809 is simply free, and a phase gate is Amar's OK, not a market gate). |
| RC-62 | 0300-0315 form is files, all sixteen listed with links. ADR-0306 is `pointer`. ADR-0421, 0422, 0430 are `superseded` (by 0007/0502, 0004, 0014). Rule 6 vocabulary is proposed, accepted, superseded, pointer, pending RS-xx; `inline` dropped, so remaining table-row records read `proposed`. Section 4 precedence is ADR-0002 policy, ADR-0012 flow, ADR-0406 implementation (0406 wins); the 0004/0422/0505 row is now "ADR-0004 decides the store, ADR-0505 the room tables". |
| RC-63 | Rule 3 now lists the six required fields and the six that are included when they apply. |
| RS-04, RS-05, RS-17 | ADR-0013 status is `pending RS-04, RS-05, RS-17`. None ran; RS-03 measured only local arduino-cli compile times (0.33 to 1.40 s) and the GPL-3.0 licence (docs/MASTER_PLAN/08_RESEARCH_SPIKES/RS-03-avr8js-differential/REPORT.md). The choice stays reversible behind the `CompileService` port. |
| RS-09 | ADR-0505 and ADR-0506 had "pending spike" but RS-09 passed for convergence (40 runs, no divergence). Their own files wait on RT-1, RT-2, DET-2 and SA-12, not an RS spike, so the index says `proposed`. |
| RS-16 | ADR-0807 status is `pending RS-16`. RS-16 never ran. The screen-reader pass is For Amar (Q-13); the Studio build does not wait for it, per D-014. |
| Not changed | RS-01, RS-03, RS-06, RS-08, RS-12, RS-13 decisions live in their ADR files (0801, 0305, 0304, 0315, 0308); this index only holds status. The line 88 mention of ADR-0207 (sharing without a marketplace) needed no change. |

## Reconcile, second pass (2026-10-27)

| Id | Change |
|---|---|
| RC-02 | Index title of ADR-0422 (line 111) now says "behind a ServerStore interface", matching the ADR-0422 file title. |
| RC-62 | Review-log rows 1a and 1d no longer say 0300 to 0315 or ADR-0310 are inline. Both rows now point to RC-62: all sixteen are files. The line 214 heading ("Records still inline") is correct for the 0830, 0820 and UX table-row records only, so it was left unchanged. |
