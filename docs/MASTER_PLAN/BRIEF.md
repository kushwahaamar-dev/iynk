# The founder's brief (verbatim)

Pasted by Amar into the planning session on 2026-10-26. This is the assignment the whole `docs/MASTER_PLAN/` tree answers.
It is copied word for word. Three places were garbled in the paste itself; they are marked **[paste garbled: …]** with the
most likely missing text, and nothing else is changed.

---

# iynk — MASTER AUTONOMOUS PRODUCT & ENGINEERING BLUEPRINT PROMPT
## From Hackathon Prototype to a Global Hardware Creation Platform

**Project:** iynk  
**Website:** https://iynk.tech  
**Repository:** https://github.com/kushwahaamar-dev/iynk  
**Date:** October 2026  
**Assignment type:** Independent research, product strategy, systems architecture, technical planning, and implementation handoff  
**Expected output:** A complete, evidence-backed, implementation-ready master plan that a separate autonomous engineering agent can execute.

---

# 0. THE MISSION

The hackathon is over.

We are no longer building something for judges, a pitch, or a demonstration. We are turning iynk into a real startup, a durable product, and potentially an essential part of how people learn and create hardware.

**iynk's founding mission is to make hardware experimentation accessible to anyone, anywhere, regardless of their financial resources, geographic location, language, or access to physical equipment.**

Today, learning hardware can require purchasing boards, sensors, tools, batteries, motors, laboratory equipment, and replacement parts. Experimenting is costly. Making mistakes is costly. Finding mentorship can be difficult. Hardware education is often fragmented across websites, IDEs, simulators, tutorials, datasheets, and physical workbenches.

We want iynk to eliminate as many of these barriers as realistically possible.

Our long-term vision is a universal hardware creation environment:

**Imagine → Design → Assemble → Wire → Program → Simulate → Debug → Learn → Collaborate → Optimize → Build for Real.**

A student should not be limited to choosing among demonstrations someone else has already built.

They should be able to create something that does not yet exist in our catalogue.

They should be able to choose components, define custom parts, construct circuits, build mechanisms, program controllers, simulate interactions, deliberately cause failures, understand the reasons behind those failures, improve the design, and eventually build the real project.

An educator should be able to create lessons and assignments around this environment.

A researcher or advanced maker should be able to prototype supported systems without being restricted to beginner tutorials.

A student with an inexpensive laptop and an internet connection should have a credible starting point for participating in hardware engineering.

**The product must also be scientifically and technically honest.**

We cannot promise that every physical system can be accurately simulated, that all code runs identically to physical firmware, or that a simulation guarantees real-world safety.

The task is to build the most capable and trustworthy product that the evidence, economics, and engineering constraints allow.

Our desired impact is global. Our immediate execution must be focused, measurable, and realistic.

---

# 1. YOUR ROLE: AN INDEPENDENT STARTUP AND ENGINEERING COUNCIL

You are an autonomous multidisciplinary organization, not a single developer taking feature requests.

Simulate independent reviews from:

1. Founder / CEO — vision, strategy, positioning, capital allocation.
2. Chief Product Officer — user needs, prioritization, retention.
3. CTO — technical architecture, maintainability, reliability.
4. Principal frontend engineer — browser experience, performance, interaction design.
5. Principal backend engineer — APIs, infrastructure, distributed systems.
6. Embedded systems engineer — microcontrollers, firmware, peripheral models.
7. Electrical engineer — circuit modeling, signal integrity, component behavior.
8. Robotics engineer — kinematics, control, sensors, ROS 2, dynamics.
9. Aerospace and flight simulation engineer — multicopter dynamics, flight controls, safety.
10. Simulation researcher — numerical methods, fidelity, uncertainty, validation.
11. AI systems architect — context-aware agents, tools, evaluations, inference costs.
12. Human-computer interaction researcher — workflow designarcher — pedagogy, assessments, learning outcomes.
    **[paste garbled: most likely "12. Human-computer interaction researcher — workflow design. 13. Learning scientist / education researcher — pedagogy, assessments, learning outcomes."]**
14. Security architect — abuse prevention, isolation, data protection.
15. Privacy and compliance reviewer — student data, minors, international regulations.
16. Developer ecosystem architect — SDKs, custom components, extension system.
17. Site reliability engineer — operations, observability, deployment.
18. FinOps and business analyst — unit economics and sustainable monetization.
19. Growth strategist — distribution, partnerships, communities.
20. Skeptical venture investor — defensibility, market size, growth, failure risk.

Each discipline should separately identify weaknesses and opportunities.

A good-looking feature is not evidence of product value.

A clever algorithm is not proof of technical feasibility.

A working hackathon demonstration is not proof of production readiness.

High feature counts are not proof of superiority.

You have permission to challenge every assumption, including the product strategy, current architecture, proposed business model, and founder's feature preferences.

Do not be agreeable for the sake of being agreeable.

**Your responsibility is to maximize the probability that iynk becomes a genuinely useful, technically credible, commercially sustainable platform.**

---

# 2. OPERATING RULES

Follow these rules throughout the assignment.

### 2.1 Inspect before proposing

Read the actual repository and run the application before prescribing an architecture.

Never invent the current system design from a README.

### 2.2 Distinguish claims from evidence

Every important statement must be classified as one of:

- VERIFIED — established through source inspection or reproducible testing.
- DOCUMENTED — supported by existing project documentation but not independently tested.
- EXTERNAL — supported by an identified external source.
- ESTIMATED — calculated with documented assumptions.
- HYPOTHESIS — requires validation.
- UNKNOWN — insufficient evidence.

### 2.3 Research externally

Use current sources, official documentation, academic papers, vendor specifications, actual competitor products, pricing pages, open-source repositories, and credible community feedback.

Record access dates, URLs, version numbers, and licensing constraints.

Do not fabricate competitor capabilities, benchmarks, user opinions, prices, or market data.

### 2.4 Avoid premature implementation

Your primary assignment is to deliver the master build blueprint.

You may create isolated proofs of concept or benchmarks necessary to validate decisions.

Do not rewrite production systems before completing the audit and architecture.

### 2.5 Prioritize real value

Every feature must connect to a demonstrable user need, a business objective, or a necessary technical dependency.

Do not add features solely because competitors have them.

### 2.6 Design for another agent

Assume the implementation agent has no access to this conversation, your reasoning process, or undocumented context.

The repository documentation must contain everything required for the next agent to proceed.

### 2.7 Never claim guaranteed success

Do not manufacture confidence percentages, product-market fit, engineering feasibility, or future revenue.

Use measurable hypotheses, experiments, decision criteria, and explicit risks.

---

# 3. ESTABLISH THE EXISTING PRODUCT BASELINE

iynk is currently described as:

> A free hardware lab in your browser. Wire, code, break and fly real boards, robots and drones, without buying a single part, in your own language, and never alone.

It currently claims three main labs.

## 3.1 Board Lab

The current catalogue includes families such as:

- Arduino Uno R3 and Nano.
- Arduino UNO R4 Minima and WiFi.
- ESP32 and ESP32-S3 development boards.
- ESP8266 NodeMCU.
- Raspberry Pi Pico, Pico W, and Pico 2.
- STM32 Nucleo.
- BBC micro:bit V2.
- Raspberry Pi 4 and 5.
- FPGA development boards including Basys 3 and DE10-Lite.

The programming environment claims support for bounded implementations of Arduino C++, MicroPython, Python, and Verilog.

## 3.2 Robotics Lab

The current benches include examples covering motor drivers, servo control, sensors, buck converters, ultrasonic distance measurement, line followers, and Raspberry Pi / ROS 2 concepts.

## 3.3 Drone Lab

The current environment includes different multicopter and aircraft configurations, assembly, component selection, flight-performance calculations, safety checks, and interactive flight simulation.

## 3.4 Other existing systems

Reported existing capabilities include:

- Hand-inked interactive hardware figures.
- A circuit solver and simulated damage.
- Step-by-step assembly.
- Deterministic code execution.
- Interactive lessons.
- Fault-injection exercises.
- Collaborative rooms.
- AI assistance with tool calling.
- Six-language localization.
- Translated communication.
- Build Night, Build Buddies, and Build Stories.
- Live component-price research.
- BOM optimization.
- Real-world makerspace discovery.
- Solana-based Proof of Build.
- Leaderboards.
- An MCP server.

The project description reports 38 catalogue items, 71 board lessons, 31 bench tasks, 144 board failures, 106 bench faults, 272 assembly steps, and approximately 2,800 unit tests.

**Treat these as claims requiring repository verification, not verified statistics.**

## 3.5 Existing technical stack

The provided documentation describes:

- Next.js 16 App Router.
- React and TypeScript.
- Tailwind CSS.
- CodeMirror.
- SVG rendering based partly on licensed Colorfigures work.
- Custom browser interpreters.
- Custom circuit solver.
- Drone calculations and flight model.
- Vercel functions.
- Meta AI with Gemini fallback.
- SerpApi.
- Node WebSocket relay behind Caddy.
- PostgreSQL and TimescaleDB.
- Solana / Anchor.
- Vitest and Playwright.
- An MCP integration layer.

Preserve proven working components until a replacement has measurable benefits.

---

# 4. PERFORM A FORENSIC REPOSITORY AUDIT

Inspect the entire directory tree.

Pay special attention to:

`src/app/`  
`src/components/`  
`src/content/`  
`src/lib/`  
`src/i18n/`  
`figures/`  
`server/realtime/`  
`solana/`  
`db/migrations/`  
`e2e/`  
`docs/`  
`docs/facts/`

Also inspect Git history, recent commits, deployment configuration, dependency manifests, CI workflows, environment-variable usage, tests, and any outstanding issues or unfinished code.

Do not assume the provided directory layout is complete or current.

### 4.1 Create a subsystem inventory

For every subsystem, document:

- Exact path and entry points.
- Purpose.
- Dependencies.
- Public interfaces.
- State ownership.
- Persistence mechanisms.
- Current functionality.
- Known defects.
- Technical debt.
- Test coverage.
- Performance characteristics.
- Security risks.
- Reusability.
- Required refactoring.
- Recommendation: preserve, extend, replace, deprecate, or investigate.

### 4.2 Validate the application

Execute the documented development and test commands.

At minimum, investigate:

`npm ci`  
`npm run typecheck`  
`npm run lint`  
`npm test`  
`npm run e2e`

Verify the actual package scripts before running them.

Inspect the optional integration tests and Solana tests separately.

Test the local app in a browser, including mobile viewport behavior.

Verify actual lesson completion, component interactions, simulation output, fault behavior, code execution, and save/share flows.

Test environments with and without optional API keys.

### 4.3 Investigate architecture debt

Specifically evaluate:

- Whether the labs share reusable data models.
- Whether simulation logic is coupled to UI components.
- Whether figure assets are coupled to specific lesson IDs.
- Whether coding environments can support original projects.
- Whether circuit connectivity is modeled independently from diagrams.
- Whether simulations expose stable APIs.
- Whether rooms support arbitrary project editing.
- Whether content is declarative or hardcoded.
- Whether all supported languages have complete translations.
- Whether AI responses can safely trigger changes to a circuit.
- Whether project persistence can support user-created content.
- Whether deterministic replay is truly reproducible.
- Whether current unit tests validate real hardware behavior or merely internal expectations.

### 4.4 Required audit deliverables

Create:

`docs/01_AUDIT/REPOSITORY_INVENTORY.md`  
`docs/01_AUDIT/FEATURE_VERIFICATION.md`  
`docs/01_AUDIT/TECHNICAL_DEBT.md`  
`docs/01_AUDIT/SECURITY_BASELINE.md`  
`docs/01_AUDIT/PERFORMANCE_BASELINE.md`  
`docs/01_AUDIT/TEST_COVERAGE.md`

Include file paths and reproducible evidence for significant findings.

---

# 5. CONDUCT A COMPLETE COMPETITIVE LANDSCAPE INVESTIGATION

We need to understand the existing market substantially better than a superficial feature comparison.

Research current capabilities and pricing, using official sources first.

## 5.1 Direct and adjacent competitors

Investigate at minimum:

**Circuit, electronics, and embedded simulation**

- Autodesk Tinkercad Circuits.
- Wokwi.
- Arduino Cloud and Cloud Editor.
- SimulIDE.
- Falstad CircuitJS.
- Proteus VSM.
- NI Multisim / Multisim Live where relevant.
- EasyEDA.
- KiCad and ngspice.
- Fritzing.
- PlatformIO and embedded development workflows.
- Any credible newer alternatives.

**Hardware education**

- Microsoft MakeCode.
- micro:bit educational tools.
- Arduino Education.
- Raspberry Pi learning resources.
- Brilliant and other interactive STEM learning products.
- Existing school-oriented robotics coding platforms.

**Robotics**

- Webots.
- Gazebo.
- The Construct / ROS learning environments.
- NVIDIA Isaac Sim.
- CoppeliaSim.
- Robot simulation and visualization tools suitable for students.

**Drone development and simulation**

- PX4 SITL.
- ArduPilot SITL.
- Gazebo-based flight simulation.
- FlightGear.
- FPV flight simulators.
- Drone assembly calculators.
- Drone-design and flight-control education tools.

**Creation ecosystems**

- GitHub.
- Onshape.
- Fusion.
- Instructables.
- Hackster.
- Hackaday.
- Thingiverse.
- Other project-sharing and maker communities.

Also investigate newer AI-native hardware design, circuit generation, and engineering assistant startups.

This is a research starting set, not a complete or permanently current list.

## 5.2 Benchmark real workflows

Do not merely visit landing pages.

Where access permits, actually perform a representative workflow in each product.

Use consistent tasks:

1. Create a simple LED circuit.
2. Write and execute controller code.
3. Add a sensor and inspect its response.
4. Intentionally create a wiring failure.
5. Create a custom component.
6. Save, export, and share a project.
7. Add a collaborator.
8. Debug an advanced hardware project.
9. Transition from simulation to physical implementation.

Record whether tasks are supported, how long they take, where users become stuck, and what access or payment is required.

If a task is not tested, say so.

## 5.3 Competitive matrix

Produce an evidence-backed comparison across:

- Free usage.
- No-account entry.
- Browser compatibility.
- User-created projects.
- Circuit editor.
- Custom hardware models.
- Firmware compatibility.
- MCU simulation fidelity.
- Analog circuit fidelity.
- Failure modeling.
- Debugging tools.
- Robotics simulation.
- Drone simulation.
- AI guidance.
- Multilingual accessibility.
- Real-time collaboration.
- Curriculum integration.
- Community features.
- Physical BOM generation.
- Real component purchasing.
- Export to real toolchains.
- Plugin extensibility.
- Pricing.
- Performance.
- Target audience.
- Strength of ecosystem.
- Competitive moat.

Include iynk in every comparison.

Separate functionality that has been tested from functionality described in marketing materials.

## 5.4 Determine genuine differentiation

Evaluate hypotheses such as:

- One continuous workflow from circuit design to robotics or flight simulation.
- Intelligent, explainable fault simulation.
- Learning through realistic failures.
- AI guidance grounded in real project state.
- Seamless multilingual collaboration.
- Student-authored learning and engineering projects.
- A community-built component ecosystem.
- A low-friction route to a physical prototype.
- Affordable access in underserved educational markets.

Do not assume these features are unique.

Determine which combinations are genuinely hard to replicate and which are merely convenient.

Identify at least three defensible positioning strategies.

For each strategy, provide its target customer, unique value, competitor response, monetization potential, engineering costs, risks, and evidence required.

**Select one primary market-entry strategy and explicitly reject or defer alternatives.**

---

# 6. RESEARCH REAL USERS AND THEIR NEEDS

Analyze these potential segments independently:

1. High-school students learning electronics.
2. University engineering students.
3. Computer science students entering embedded development.
4. Self-taught makers.
5. Robotics clubs.
6. Drone hobbyists.
7. Hackathon builders.
8. Educators and schools.
9. Universities and maker laboratories.
10. Advanced engineers prototyping supported systems.

Do not assume we should serve all of them immediately.

## 6.1 Jobs to be done

For each segment, identify:

- What they currently try to accomplish.
- Their current tools.
- Their most expensive frustrations.
- Why existing alternatives are insufficient.
- How frequently the problem occurs.
- Whether simulation accuracy or ease of learning is more important.
- Whether they would use iynk repeatedly.
- What would make them switch.
- Who makes purchasing decisions.
- What would make them recommend iynk.

## 6.2 User research plan

Develop an executable plan for interviews, observational usability tests, surveys, prototype experiments, and willingness-to-pay studies.

Include:

- Recruiting criteria.
- Interview questions.
- Target sample sizes with rationale.
- Bias controls.
- Experiment methodology.
- Research artifacts.
- Decision thresholds.
- How findings alter the roadmap.

Do not invent completed interviews or user demand.

## 6.3 Choose a beachhead market

Recommend the most promising first customer segment.

A good first segment must have a recurring problem that iynk can solve measurably better than available tools.

Explicitly distinguish:

- Who uses the free product.
- Who benefits financially.
- Who may eventually pay.
- Who influences adoption.
- Who can drive organic distribution.

---

# 7. DESIGN THE FUTURE PRODUCT: IYNK STUDIO

Investigate a potential central product experience called **iynk Studio**.

The name is provisional.

The central concept is that a user is no longer restricted to opening a predefined board, bench, or drone lesson.

They can create a new project from scratch.

A possible new-project workflow:

1. Start a project.
2. Select an empty canvas or template.
3. Choose a board or create a custom hardware configuration.
4. Add electronic or mechanical components.
5. Define connections and assembly relationships.
6. Write or import code.
7. Configure physical and electrical parameters.
8. Run a simulation.
9. Inspect signals, states, movement, faults, and logs.
10. Modify the design.
11. Compare revisions.
12. Collaborate with other users.
13. Export source files, diagrams, and a parts list.
14. Reproduce the design physically.

Research whether one universal workspace is appropriate or whether separate specialized editors connected by shared project data would offer better usability and fidelity.

**The ability to make original projects must become a first-class product capability, not an afterthought.**

---

# 8. SPECIFY THE UNIVERSAL PROJECT BUILDER

Produce a complete functional and technical specification for the project-building system.

## 8.1 Project lifecycle

Support or evaluate:

- Create.
- Duplicate.
- Rename.
- Edit.
- Save.
- Autosave.
- Undo/redo.
- Version.
- Fork.
- Share.
- Export.
- Import.
- Archive.
- Delete.
- Restore where supported.
- Publish to a community catalogue.

Specify local-only and cloud-backed behavior.

Keep the free, no-account experience wherever practical.

## 8.2 Interactive canvas

Investigate:

- Pan and zoom.
- Component selection.
- Drag-and-drop placement.
- Rotation and alignment.
- Snap-to-grid.
- Connection creation.
- Valid and invalid connections.
- Wire routing.
- Breadboard representation.
- Schematic representation.
- Mechanical placement.
- 2D and 3D views.
- Multiselect.
- Grouping.
- Copy/paste.
- Keyboard shortcuts.
- Component search.
- Properties inspector.
- Connection visualization.
- Error highlighting.
- Simulation overlays.
- Mobile and touch interaction.

Evaluate SVG, Canvas, WebGL, and hybrid rendering.

Do not select a technology based only on visual attractiveness.

Benchmark realistic projects.

## 8.3 Data architecture

Define a versioned canonical project format containing:

- Project identity and schema version.
- Owners and permissions.
- Board instances.
- Component instances.
- Pin definitions.
- Electrical nets.
- Mechanical relationships.
- Coordinate systems and transforms.
- Source files.
- Simulation configuration.
- Component parameters.
- Assets.
- Dependencies.
- Saved test cases.
- Revision history.
- Export metadata.
- Provenance and licensing.

Establish stable IDs, canonical units, deterministic serialization, and migration rules.

A visual position must not be confused with an electrical connection.

A rendered cable must correspond to an explicitly modeled connection.

## 8.4 Project compatibility

Design import/export approaches for suitable formats such as:

- JSON project definitions.
- Arduino sketches.
- MicroPython files.
- Python project files.
- Verilog.
- BOM CSV.
- Wiring diagrams.
- Schematics.
- Firmware binaries where meaningful.
- Compatible external simulator or CAD formats where licensed and feasible.

Document fidelity losses and unsupported features.

Never promise seamless interchange without testing it.

---

# 9. DESIGN THE COMPONENT AND HARDWARE ECOSYSTEM

The current curated catalogue cannot be the permanent limit of the platform.

Users should eventually be able to create or import reusable components.

## 9.1 Component library

Research a scalable library containing:

- Microcontrollers.
- Development boards.
- Basic electronic components.
- Sensors.
- Actuators.
- Motor drivers.
- Power components.
- Displays.
- Communication modules.
- Mechanical assemblies.
- Robotics parts.
- Drone components.
- FPGA-related components.
- Measurement instruments.
- Custom virtual components.

## 9.2 Component specifications

Every supported component needs a machine-readable model defining its capabilities.

Examples of fields include:

- Manufacturer and model.
- Source datasheet.
- Electrical pins and pin types.
- Voltage and current ratings.
- Supported protocols.
- Power consumption.
- Physical dimensions.
- Connectors.
- Electrical behavior.
- Simulation implementation.
- Failure thresholds where modeled.
- Supported programming environments.
- Compatibility rules.
- Visual assets.
- Confidence and fidelity declarations.
- Licensing and attribution.
- Version.

Distinguish manufacturer-stated ratings from simulation assumptions and experimentally validated behavior.

## 9.3 Custom component editor

Investigate two creation experiences:

**Beginner mode:** Define pins, labels, voltage limits, signal behavior, dimensions, and a visual representation without requiring advanced programming.

**Advanced mode:** Write a deterministic behavioral model using a controlled, sandboxed extension API.

Evaluate WebAssembly as one possible execution boundary, but verify the actual performance, compatibility, security, and maintenance tradeoffs.

Specify an extension SDK, component manifest, permission model, test harness, versioning, dependency rules, publishing process, and review system.

Custom components must not receive unrestricted browser or server access.

## 9.4 Community component marketplace

Research whether creators should be able to publish:

- Custom sensors.
- Custom boards.
- Virtual instruments.
- Mechanisms.
- Robotics assemblies.
- Circuit modules.
- Templates.
- Educational exercises.

Design moderation, provenance, licensing, reporting, compatibility testing, quality labels, and publisher verification.

Avoid building a marketplace before the product has enough creators and consumers to make it useful.

---

# 10. RE-ARCHITECT THE SIMULATION PLATFORM

This is one of the most important technical investigations.

A serious hardware platform cannot equate visual animation with physical correctness.

Create a rigorous simulation architecture separating independent domains while allowing controlled interaction among them.

## 10.1 Simulation layers

Evaluate a layered design with:

1. Shared model and unit system.
2. Event scheduling and simulation clock.
3. Digital signal engine.
4. Analog/electrical solver.
5. MCU / firmware runtime.
6. Peripheral protocol models.
7. Mechanical and robotics dynamics.
8. Flight dynamics.
9. Sensor and environment models.
10. Fault and degradation models.
11. Observation and instrumentation.
12. Replay and validation.

Identify which layers already exist and which are missing.

## 10.2 Simulation fidelity levels

Define explicit simulation tiers.

**Educational approximation:** Simplified behavior intended for understanding concepts.

**Component behavioral simulation:** Defined physical and logical models, with stated constraints.

**Firmware or hardware-target simulation:** Real compiled firmware or well-validated hardware behavior where actually supported.

Do not describe a hand-written Arduino C++ subset interpreter as a full Arduino toolchain.

Do not call a Raspberry Pi API mock equivalent to running a real Raspberry Pi operating system.

Do not treat browser-executed Verilog-like code as evidence of hardware-equivalent FPGA behavior.

Develop a path toward higher fidelity without requiring every device to support it.

## 10.3 Deterministic simulation

Specify:

- Simulation clock.
- Event ordering.
- Time step policies.
- Numerical integration methods.
- Deterministic random seeds.
- Event queues.
- Cross-domain synchronization.
- State snapshots.
- Replay.
- Pause and step controls.
- Execution budgets.
- Cancellation.
- Divergence detection.
- Numerical stability liel versions, inputs, and seed should produce reproducible results within defined numerical tolerances.
  **[paste garbled: most likely "- Numerical stability limits. ¶ The same model versions, inputs, and seed should produce reproducible results within defined numerical tolerances."]**

## 10.4 Circuit solver investigation

Audit the existing circuit solver thoroughly.

Research:

- DC operating points.
- Transient simulation.
- Kirchhoff's laws.
- Modified nodal analysis.
- Resistive and reactive elements.
- Semiconductor approximations.
- Nonlinear components.
- Power supplies.
- Voltage/current limits.
- Inductive behavior.
- Motor electrical models.
- Thermal effects where feasible.
- Brownouts.
- Fault conditions.
- Numerical stability.
- Solver convergence.

Evaluate whether ngspice-compatible approaches, WebAssembly, existing numerical libraries, or improvements to the current solver provide the strongest architecture.

Do not casually rewrite a working solver.

For every modeled failure, record the derivation, reference data, assumptions, and validated operating range.

## 10.5 Firmware and programming

Investigate a sustainable architecture supporting appropriate subsets or realistic implementations of:

- Arduino C++.
- MicroPython.
- Python.
- Embedded C/C++.
- Verilog/SystemVerilog subsets.
- Arduino libraries.
- Peripheral protocols.
- Real firmware binaries where possible.

For each supported board, specify the execution model and which APIs or peripherals behave realistically.

Research:

- Browser-based compilation.
- Safe server-side compilation.
- WASM runtimes.
- CPU emulation.
- Board-specific emulator integrations.
- Library compatibility.
- Source mapping.
- Breakpoints.
- Variable inspection.
- Serial debugging.
- Simulated oscilloscopes and logic analyzers.
- GPIO tracing.
- Code execution limits.
- Infinite loop handling.
- Memory isolation.

Compare performance and complexity.

## 10.6 Instrumentation

Define a virtual testing toolkit:

- Multimeter.
- Oscilloscope.
- Logic analyzer.
- Serial monitor.
- Variable inspector.
- Signal graphs.
- Current and power measurements.
- Event timeline.
- Fault trace.
- State snapshots.
- Simulation speed control.

Specify exactly which readings are computed by a physical model and which are approximations.

---

# 11. BUILD ROBOTICS AS A REAL CREATION ENVIRONMENT

Investigate how Robotics Lab can transition from a curated bench catalogue into an extensible robotics workspace.

Students should potentially be able to:

- Create robot assemblies.
- Configure joints.
- Choose motors.
- Add motor drivers.
- Wire controllers.
- Attach sensors.
- Set dimensions and masses.
- Define wheel or actuator properties.
- Write motion-control programs.
- Simulate sensor measurements.
- Visualize movement.
- Diagnose failures.
- Evaluate power and torque requirements.
- Test obstacle avoidance.
- Implement basic control algorithms.

## 11.1 Robotics technical requirements

Research:

- Kinematic trees.
- Forward/inverse kinematics.
- Joint constraints.
- Rigid-body dynamics.
- Friction.
- Collision detection.
- Motor torque and limits.
- Battery/power behavior.
- Sensor noise.
- Control loop timing.
- PID controllers.
- Coordinate transforms.
- Odometry.
- Navigation.
- Robot description formats.
- ROS 2 compatibility.
- URDF/SDF import where feasible.

Do not attempt to reproduce every capability of full desktop robotics simulators without justification.

Evaluate interoperability versus native implementation.

## 11.2 Robotics template strategy

Consider structured progressive projects:

- Line-following robot.
- Obstacle avoidance.
- Differential-drive rover.
- Robotic arm.
- Sensor-guided vehicle.
- Basic autonomous navigation.

Prioritize depth and correct behavior over adding many shallow templates.

---

# 12. EVOLVE DRONE LAB INTO A CREDIBLE DESIGN-TO-FLIGHT PLATFORM

Audit the existing drone calculator, assembly system, fault models, and flight simulator.

Evaluate a future workflow in which users can:

- Choose frame dimensions.
- Select motors and propellers.
- Select ESCs and batteries.
- Configure flight controllers.
- Estimate mass and thrust.
- Examine current draw.
- Evaluate endurance.
- Configure control parameters.
- Inspect center of mass.
- Run bench checks.
- Test supported failure conditions.
- Fly in a simulated environment.
- Analyze flight traces.
- Compare alternate configurations.
- Generate a physical BOM.

## 12.1 Simulation research

Investigate:

- Six-degree-of-freedom flight dynamics.
- Aerodynamic drag.
- Motor response.
- Thrust curves.
- Propeller models.
- Battery voltage sag.
- Power consumption.
- Flight controller behavior.
- IMU and GPS noise.
- Wind disturbances.
- Sensor failures.
- Controller tuning.
- Deterministic replay.
- Collision handling.
- Flight envelopes.
- PX4/ArduPilot SITL interoperability.

Identify whether deeper integrations are commercially and technically worthwhile.

## 12.2 Safety and responsible use

Simulation is not certification of a physical aircraft.

Provide explicit assumptions and warnings for:

- Propeller injury risks.
- High-current electrical systems.
- Lithium battery hazards.
- Flight stability.
- Physical testing.
- Operational regulations.
- Autonomous control limitations.

Avoid making unverified safety guarantees.

Research dual-use risks and appropriate restrictions for sensitive capabilities.

---

# 13. DESIGN AN INTELLIGENT AI LAB PARTNER

The AI should eventually understand the current project, not simply answer generic electronics questions.

Build on the existing AI integration rather than replacing it arbitrarily.

## 13.1 Context-aware intelligence

The assistant should be able to access authorized structured information including:

- Current project.
- Component definitions.
- Wiring graph.
- Code files.
- Simulation state.
- Errors.
- User-selected component.
- Learning objectives.
- Prior attempts within allowed retention settings.
- Component datasheets.
- Supported tool documentation.

It must distinguish verified hardware facts from inferred suggestions.

## 13.2 Agent capabilities

Research support for:

- Explaining circuits.
- Teaching concepts.
- Debugging code.
- Identifying incorrect connections.
- Explaining simulation failures.
- Recommending components.
- Generating project scaffolds.
- Suggesting test cases.
- Comparing designs.
- Helping create custom component models.
- Translating technical explanations.
- Helping teams coordinate.

## 13.3 Safe editing

AI-generated changes must be:

- Explicit.
- Reviewable.
- Reversible.
- Schema-validated.
- Permission-checked.
- Logged.
- Clearly attributed.

Use an operation proposal system rather than silently allowing the model to mutate project state.

A user should be able to preview an AI modification before applying it.

## 13.4 Educational behavior

The assistant should adapt appropriately between:

- Socratic guidance.
- Beginner explanations.
- Direct technical explanations.
- Debugging assistance.
- Advanced engineering consultation.

It should avoid unnecessarily giving full assignment solutions when the user is in a guided learning mode.

## 13.5 Model architecture and economics

Evaluate vendor-neutral model adapters, structured tool calling, retrieval, caching, routing, inference budgets, fallback models, observability, and privacy.

Develop adversarial tests for prompt injection through project names, imported files, chat messages, and tool outputs.

Do not allow models to execute arbitrary code or invoke privileged APIs without controlled authorization.

---

# 14. REBUILD COLLABORATION AROUND ORIGINAL PROJECTS

iynk already has collaborative rooms.

Determine how to extend them to arbitrary, editable projects.

Analyze:

- Shared canvas editing.
- Shared code editing.
- Participant cursors.
- Presence indicators.
- Synchronized simulator controls.
- Shared simulation state.
- Conflict resolution.
- User roles.
- Host permissions.
- Spectator access.
- Invite links.
- Team ownership.
- Reconnection.
- Network latency.
- Offline editing.
- Version conflicts.
- Audit history.

Evaluate whether the existing globally ordered WebSocket operations are sufficient or whether selected document types benefit from CRDTs or operational transformation.

Do not introduce complex distributed editing systems without evidence.

Decide which simulation state is authoritative and where it runs.

Specify what happens when users disagree over execution controls, components, or code.

Integrate with educational group assignments where useful.

---

# 15. EDUCATION, CURRICULUM, AND ASSESSMENT

Investigate whether iynk can offer superior learning outcomes compared with passive tutorials.

## 15.1 Learning architecture

Possible progression:

- Guided lessons.
- Interactive demonstrations.
- Fault diagnosis.
- Partially completed projects.
- Open-ended challenges.
- Original creations.
- Collaborative capstones.

Design assessments that reward understanding rather than memorization.

## 15.2 Educator authoring

Research:

- Custom lesson creation.
- Assignment templates.
- Hidden and visible test conditions.
- Student submissions.
- Feedback rubrics.
- Completion tracking.
- Classroom management.
- Group assignments.
- Student project galleries.
- Exportable assessment results.
- LMS integration.

## 15.3 School readiness

Investigate FERPA, COPPA, GDPR and relevant education/privacy requirements based on the jurisdictions and age groups actually served.

Pay particular attention to underage users, teacher-controlled accounts, social discovery, chat, voice, AI interactions, public profiles, and data retention.

Do not assume all educational integrations should launch simultaneously.

## 15.4 Learning effectiveness

Create measurable evaluation plans covering:

- Concept comprehension.
- Ability to transfer learning to physical hardware.
- Time to complete a working project.
- Debugging competence.
- Retention.
- Learner confidence.
- Drop-off rates.
- Long-term project completion.

Do not use engagement metrics as the sole proxy for education.

---

# 16. COMMUNITY, DISCOVERY, AND CREATOR ECONOMY

Investigate how users can learn from each other's work without turning the platform into an unmoderated social network.

Potential capabilities include:

- Public project profiles.
- Project publishing.
- Remixes and forks.
- Project galleries.
- Community templates.
- Component contributions.
- Reviews and technical feedback.
- Build challenges.
- Collaborative projects.
- Creator attribution.
- Verified project provenance.
- Educational competitions.

Analyze the current Build Night, Build Buddies, and Build Stories systems.

Determine which have evidence of real user demand.

Design moderation, privacy, age restrictions, user blocking, reporting, and abuse controls before enabling broad social discovery.

Treat blockchain credentials and bounty mechanisms as optional, evidence-dependent features.

Do not let token incentives distort learning outcomes or attract abuse.

---

# 17. CONNECT VIRTUAL DESIGN TO PHYSICAL BUILDING

The product should make it straightforward to take a supported project from simulation to real hardware.

Investigate:

- Generated BOMs.
- Manufacturer part numbers.
- Datasheet links.
- Vendor comparisons.
- Price history.
- Regional availability.
- Shipping estimates where available.
- Compatible substitutions.
- Budget optimization.
- Wiring instructions.
- Firmware export.
- Flashing instructions.
- Assembly checklists.
- Physical testing procedures.
- Real-versus-simulated behavior comparisons.

## 17.1 Reality gap

Every project should make clear:

- What has been physically validated.
- What has only been simulated.
- What assumptions were made.
- Which hardware specifications are uncertain.
- What risks remain before physical deployment.

Design a future framework for students or educators to submit measured real-world validation data with consent and provenance.

Investigate how that evidence could improve supported models over time.

## 17.2 Purchasing and affiliation

Evaluate sustainable affiliate or commerce integrations without compromising user trust.

Always distinguish sponsored placements from engineering recommendations.

Recommendations should prioritize compatibility and the user's constraints.

Do not assume live shopping results always contain current, reliable, or comparable prices.

---

# 18. DESIGN THE COMPLETE USER EXPERIENCE

The current visual identity has value.

Audit it rather than automatically replacing it with a generic SaaS dashboard.

Inspect the landing page, lab pages, figures, code editor, rooms, flight simulator, mobile layouts, and all major interaction states.

## 18.1 Principal experiences

Specify flows for:

1. First-time visitor.
2. Anonymous user completing a lesson.
3. Student starting an original project.
4. Student adding and wiring components.
5. Student writing and executing code.
6. Student encountering a simulated fault.
7. Student requesting AI assistance.
8. Student sharing a project.
9. Two students editing together.
10. Educator creating an assignment.
11. Advanced developer importing a project.
12. User exporting a physical build package.

For every flow, provide wireframes or exact interaction specifications, states, validation behavior, accessibility requirements, and success criteria.

## 18.2 Progressive complexity

Investigate interfaces for:

- Beginner.
- Intermediate.
- Advanced.

These must share compatible project data.

Users should be able to grow without being forced to abandon their work.

## 18.3 Accessibility and internationalization

Treat multilingual access as a core architectural constraint.

Evaluate:

- Existing six-language coverage.
- Complete UI localization.
- Technical terminology dictionaries.
- Right-to-left language support if expanded.
- Accessible keyboard interaction.
- Screen-reader descriptions.
- Color independence.
- Motion reduction.
- Low-bandwidth operation.
- Mobile usability.
- Low-power devices.
- Offline-capable functionality.
- Localized educational materials.

Use WCAG 2.2 AA as a target where applicable, documenting any unsupported interactive simulation controls and equivalent alternatives.

---

# 19. PRODUCE THE COMPLETE SYSTEM ARCHITECTURE

Do not stop at a high-level diagram.

Produce a concrete, justified production architecture.

Begin with the existing Next.js monorepo and consider a modular-monolith approach before proposing microservices.

Evaluate whether particular workloads justify independent services.

## 19.1 Required architecture domains

Specify boundaries for:

- Web application.
- Design editor.
- Component catalogue.
- Simulation orchestration.
- Firmware runtime.
- Circuit engine.
- Mechanical and flight simulation.
- AI services.
- Project persistence.
- Collaboration relay.
- Search.
- Community content.
- Educational content.
- Billing.
- Hardware purchasing.
- Notifications.
- Observability.
- Analytics.
- Background jobs.
- External integrations.
- Credential verification.

For every domain, define ownership, interfaces, deployment considerations, and failure behavior.

## 19.2 Required architectural diagrams

Generate:

1. Full system context diagram.
2. Container/deployment diagram.
3. Module dependency diagram.
4. Project data model diagram.
5. Simulation pipeline diagram.
6. AI tool-execution sequence diagram.
7. Collaboration synchronization sequence diagram.
8. Save/export lifecycle diagram.
9. Identity and access control diagram.
10. Physical build/BOM integration diagram.

Prefer Mermaid diagrams stored in Markdown, plus machine-readable diagram sources if another format is selected.

## 19.3 Client-side versus server-side execution

Research which workloads should execute:

- Directly on the UI thread.
- In browser Web Workers.
- In WebAssembly.
- On serverless functions.
- In CPU compute workers.
- In isolated compilation workers.
- In optional GPU workers.
- In persistent collaboration services.

Measure expected performance, memory, concurrency, infrastructure cost, and security risks.

Optimize local-first execution where justified by cost and usability.

Do not put expensive or unsafe arbitrary computation in an unrestricted shared server runtime.

## 19.4 Database and storage

Specify the role of:

- PostgreSQL.
- Existing TimescaleDB functionality.
- Object storage.
- Ephemeral caches.
- Queues.
- Search indexing.
- Browser local storage or IndexedDB.
- Project snapshots.
- Event logs.

Avoid choosing extra databases without a demonstrated need.

## 19.5 API architecture

Provide versioned API contracts, authorization requirements, rate limits, pagination, retries, error schemas, and idempotency behavior.

At minimum, evaluate endpoints or equivalent RPC interfaces for:

- Projects.
- Components.
- Simulation runs.
- Assets.
- Import/export.
- Classrooms.
- Sharing.
- Collaboration.
- AI assistance.
- User profiles.
- Community publishing.
- Billing.
- Telemetry preferences.
- Data export and deletion.

Document WebSocket message schemas and reconnection semantics separately.

## 19.6 Canonical architecture decisions

For every major technology selection create an Architecture Decision Record containing:

- Problem.
- Constraints.
- Considered options.
- Decision.
- Technical justification.
- Performance data.
- Cost implications.
- Licensing.
- Security implications.
- Reversibility.
- Migration plan.
- Known limitations.

---

# 20. ENGINEERING QUALITY AND SIMULATION VALIDATION

Design a testing strategy extending beyond the current unit-test suite.

## 20.1 Test categories

Require:

- Unit tests.
- Contract tests.
- Integration tests.
- Browser E2E tests.
- Visual regression tests.
- Accessibility tests.
- Property-based tests.
- Fuzzing.
- Deterministic replay tests.
- Numerical validation.
- Cross-browser tests.
- Performance benchmarks.
- Load testing.
- Security tests.
- Migration tests.
- Failure recovery tests.
- Multiplayer consistency tests.

## 20.2 Hardware reference validation

Build a research plan for obtaining physical reference data.

For electronics, compare appropriate measurable outputs such as voltage, current, timing, and protocol behavior.

For robotics, compare positions, velocities, controller responses, and sensor measurements.

For drones, compare supported performance estimates to trustworthy empirical measurements or reference simulators.

Document measurement uncertainty.

Do not validate the solver solely using tests generated from the same assumptions as the implementation.

## 20.3 Fidelity registry

Every supported simulation model should have:

- Model identifier.
- Version.
- Implemented phenomena.
- Unsupported phenomena.
- Parameter sources.
- Validation datasets.
- Error metrics.
- Applicable operating range.
- Known failure cases.
- Performance benchmark.

Use these records to support honest user-facing fidelity indicators.

---

# 21. SECURITY, PRIVACY, AND ABUSE RESILIENCE

Develop a production threat model.

Evaluate:

- Arbitrary code execution.
- Browser sandbox escapes.
- Malicious imported projects.
- WASM extension abuse.
- Dependency and supply-chain attacks.
- Prompt injection.
- Unauthorized AI tools.
- Project sharing permissions.
- WebSocket authentication.
- Multiplayer spam.
- Public room abuse.
- User-generated content.
- Cloud compilation risks.
- Resource exhaustion.
- Payment abuse.
- Credential fraud.
- Privacy leaks.
- Exposed API keys.
- Third-party tracking.
- Abuse of referral systems.
- Account recovery.
- Data deletion.
- Child safety.

Specify mitigations, verification procedures, incident response, and release-blocking issues.

For simulation and compilation workers, define CPU, memory, time, network, file-system, and process limits.

Do not treat a JavaScript sandbox alone as sufficient security for untrusted native code.

---

# 22. PRODUCTION INFRASTRUCTURE AND DEPLOYMENT

Analyze current deployment constraints before redesigning infrastructure.

Consider the implications of:

- Next.js / Vercel.
- Persistent WebSocket relays.
- PostgreSQL and TimescaleDB.
- Optional AI services.
- Browser-heavy simulation.
- Future server-side compilation.
- Object storage.
- Global users.
- Classroom-scale concurrent sessions.

Research infrastructure approaches including suitable managed platforms and self-hosted alternatives.

Compare cost, reliability, engineering overhead, geographic availability, and operational complexity.

## 22.1 Production requirements

Specify:

- Infrastructure as code.
- Development/staging/production environments.
- CI/CD.
- Secrets management.
- Safe schema migrations.
- Feature flags.
- Canary rollout.
- Rollback.
- Health checks.
- Monitoring.
- Tracing.
- Error reporting.
- Backups.
- Disaster recovery.
- Service-level objectives.
- Rate limits.
- Capacity planning.
- Dependency failure behavior.

## 22.2 Capacity models

Create scenarios for:

- 100 daily active users.
- 1,000 daily active users.
- 10,000 daily active users.
- 100,000 daily active users.
- 1,000,000 daily active users.

These are planning scenarios, not predictions.

For each, estimate likely workloads, concurrent active sessions, storage, bandwidth, AI costs, database demand, and infrastructure expenditure.

Use transparent assumptions.

Distinguish simulations executed locally from server-dependent activity.

Develop a strategy for remaining financially sustainable if usage grows rapidly.

---

# 23. STARTUP STRATEGY AND BUSINESS MODEL

This is not merely an engineering assignment.

We need a company that can support its users over many years.

Research monetization while preserving an accessible free core.

## 23.1 Models to compare

Evaluate:

- Free consumer access funded by institutional subscriptions.
- Educator and classroom subscriptions.
- University and departmental licenses.
- Advanced simulation or cloud compute subscriptions.
- Team collaboration plans.
- Developer/API access.
- Commercial licensing.
- Component manufacturer partnerships.
- Hardware affiliate commerce.
- Sponsored educational programs.
- Grants and nonprofit partnerships.
- Optional creator marketplace revenue.

Do not implement all these models.

Identify the simplest viable business model.

## 23.2 Financial modeling

Build transparent models for:

- Hosting cost per active user.
- AI inference cost per session.
- Storage and media cost.
- Collaboration infrastructure.
- Payment fees.
- Customer support.
- User acquisition.
- Customer conversion.
- Gross margin.
- Retention.
- Institutional sales.
- Break-even scenarios.

Estimate customer acquisition cost and lifetime value only when evidence permits.

## 23.3 Market sizing

Calculate TAM, SAM, and SOM with sourced methodology.

Do not multiply arbitrary student populations by arbitrary subscription prices and call it market research.

Separate individual users from paying institutions.

## 23.4 Business defensibility

Analyze potential moats:

- Creator-generated projects.
- Reusable component ecosystem.
- Verified simulation models.
- Education partnerships.
- Curriculum adoption.
- Real-world validation datasets.
- Collaborative learning networks.
- Product interoperability.
- User switching costs.

Assess which are realistic, ethical, and sustainable.

---

# 24. GO-TO-MARKET AND GROWTH

Construct an actionable distribution strategy.

Investigate:

- University engineering clubs.
- Robotics teams.
- Drone clubs.
- Hackathons.
- Electronics educators.
- STEM nonprofits.
- Maker communities.
- YouTube educators.
- Open-source contributors.
- Student ambassadors.
- School districts.
- International education partners.
- Hardware component manufacturers.

## 24.1 Launch strategy

Specify:

- Target launch audience.
- Core value proposition.
- Landing page positioning.
- Demonstration examples.
- Beta recruitment.
- Onboarding experiments.
- Feedback collection.
- Product analytics.
- Referral mechanisms.
- Community activation.
- Content and SEO.
- Partnerships.
- Press strategy.

## 24.2 North-star metric

Propose and justify a metric reflecting actual product value.

A candidate is:

**Weekly users completing meaningful, independently verified hardware experiments or original project milestones.**

Evaluate whether this is measurable and resistant to gaming.

Track acquisition, activation, retention, engagement, project creation, project completion, learning progress, and conversion separately.

Avoid optimizing solely for registrations, clicks, or AI messages.

---

# 25. DEVELOP A RUTHLESS FEATURE PRIORITIZATION SYSTEM

You must not conclude that everything should be built immediately.

Classify each proposed capability into:

- REQUIRED FOUNDATION.
- PRIMARY MARKET-ENTRY FEATURE.
- NEAR-TERM DIFFERENTIATOR.
- VALIDATED EXPANSION.
- LONG-TERM RESEARCH.
- DEFERRED.
- REJECTED.

Score features using evidence-based criteria:

- User value.
- Frequency of need.
- Market differentiation.
- Impact on retention.
- Technical feasibility.
- Simulation accuracy.
- Security and privacy risk.
- Infrastructure cost.
- Engineering effort.
- Dependency complexity.
- Maintenance burden.
- Monetization relevance.

Document scoring weights and uncertainty.

Provide a full feature matrix.

Choose the smallest coherent product that can deliver substantial value.

**Prioritize a deep, working original-project builder over an enormous catalogue of shallow features, unless user research shows a different priority.**

---

# 26. CREATE THE END-TO-END PHASED BUILD PLAN

Build a dependency-aware roadmap from the existing hackathon implementation to a mature platform.

Use the phases below as an initial structure. Revise them if the repository audit reveals a better sequence.

## Phase 0 — Truth and baseline

Audit the codebase, validate claims, identify risks, benchmark current functionality, and document architecture.

**Exit:** Every major existing feature has a documented verification status.

## Phase 1 — Product strategy and technical foundations

Finalize the beachhead user, primary differentiation, project data contracts, simulation boundaries, component schemas, testing approach, and architectural decisions.

**Exit:** Core system contracts are approved, testable, and implementation-ready.

## Phase 2 — Original-project creation

Implement the minimum complete workflow for creating, editing, wiring, programming, running, saving, and reopening a custom electronics project.

Preserve existing lessons.

**Exit:** A user creates and runs a project not defined in the existing lesson catalogue.

## Phase 3 — Simulation integrity and developer tools

Improve the selected simulation models, execution fidelity, instrumentation, debugger, runtime isolation, replay, and validation.

**Exit:** Supported reference projects pass independent correctness benchmarks.

## Phase 4 — Component extensibility

Implement reusable components, custom definitions, versioning, controlled behavioral models, and integration with the project editor.

**Exit:** A documented custom component can be added and simulated without hardcoding it into a particular lesson.

## Phase 5 — Collaborative creation

Extend rooms, synchronization, persistence, and sharing to arbitrary user projects.

**Exit:** Multiple users can reliably create and modify one project with defined conflict handling.

## Phase 6 — Intelligent learning assistance

Connect AI tools to authorized structured project state, diagnostics, and reviewable edits.

**Exit:** AI assistance improves measured task completion or comprehension without introducing unacceptable errors.

## Phase 7 — Robotics and drone creation

Extend project authoring and simulation architecture into carefully selected mechanical, robotics, and flight workflows.

**Exit:** At least one original, non-preset project in each approved domain can be built, tested, and evaluated reproducibly.

## Phase 8 — Education and creator ecosystem

Deploy validated classroom and project-sharing workflows, supported by moderation and student privacy controls.

**Exit:** Real educational or community groups complete projects using the platform.

## Phase 9 — Commercial and production maturity

Complete production hardening, billing where justified, customer support, backups, incident procedures, operational dashboards, and institutional requirements.

**Exit:** The service can support paying customers responsibly.

## Phase 10 — Platform and global expansion

Evaluate deeper firmware simulation, additional board families, component SDK expansion, global educational partnerships, hardware interoperability, and enterprise use cases.

**Exit:** Each expansion demonstrates adoption, technical performance, and sustainable economics before further scaling.

### Phase requirements

For every phase provide:

- Business objective.
- User-visible outcomes.
- Exact technical scope.
- Non-goals.
- Dependencies.
- Architecture changes.
- Database changes.
- APIs.
- Frontend components.
- Simulation work.
- Security requirements.
- Accessibility requirements.
- Testing.
- Documentation.
- Estimated engineering effort.
- Operational cost.
- Risks.
- Mitigations.
- Acceptance criteria.
- Rollout plan.
- Rollback plan.
- Explicit exit gate.

Use best-case, expected, and adverse estimates where reasonable, with assumptions clearly stated.

Do not fabricate precise completion dates or imply that all phases must happen.

---

# 27. CONVERT THE ROADMAP INTO ATOMIC ENGINEERING TASKS

This is the most important handoff requirement.

A different agent must be able to implement the plan without asking what a high-level feature means.

For every approved feature, create an implementation package containing:

**Identity**

- Unique task ID.
- Feature or subsystem name.
- Phase.
- Priority.
- Dependencies.
- Status.

**Intent**

- Problem being solved.
- Target user.
- User story.
- Expected behavior.
- Success metric.

**Implementation**

- Existing relevant files.
- New proposed files.
- Modules/classes/functions.
- Data model.
- Input/output schemas.
- API contracts.
- Algorithms.
- State transitions.
- Validation rules.
- Error conditions.
- Edge cases.
- Permissions.
- Performance constraints.
- Migration strategy.

**Verification**

- Unit tests.
- Integration tests.
- E2E scenarios.
- Reference fixtures.
- Acceptance criteria.
- Observability.
- Release blockers.

**Delivery**

- Definition of done.
- Documentation updates.
- Deployment steps.
- Rollback approach.
- Dependencies for subsequent tasks.

Avoid assignments such as:

"Build circuit editor."

That is not an executable task.

Instead decompose the feature into work such as:

- Define versioned component instances.
- Define pin and net schemas.
- Implement project serialization.
- Implement canvas placement.
- Implement wire connectivity validation.
- Connect netlist to the circuit solver.
- Integrate code execution.
- Add editor state history.
- Add save/load.
- Implement deterministic project tests.
- Validate a full custom-circuit workflow.

Continue decomposition until individual tasks are independently understandable and testable.

If a task requires unresolved research, create a research spike with a falsifiable question and exit condition.

---

# 28. DEFINE THE HANDOFF CONTRACT FOR AUTONOMOUS AGENTS

The plan must work across different agents, models, or engineering teams.

## 28.1 Single source of truth

Establish canonical documentation and versioned machine-readable files.

Create an implementation manifest containing:

- Project baseline commit.
- Architecture version.
- Plan version.
- Feature IDs.
- Task IDs.
- Dependencies.
- Task status.
- Acceptance criteria.
- Owners or agent responsibilities.
- Links to specifications.
- Validation commands.
- Known blockers.

## 28.2 Task execution rules

The future implementation agent must:

1. Read the relevant specifications.
2. Check repository state and task dependencies.
3. Confirm the applicable architecture decisions.
4. Implement only the approved scope.
5. Add tests.
6. Execute verification commands.
7. Record measured results.
8. Update documentation.
9. Produce reviewable commits or PRs.
10. Update the implementation manifest.
11. Identify the next unblocked task.

Do not allow the implementing agent to silently reinterpret the architecture or invent an alternative product strategy.

If evidence requires a significant deviation, it must create an Architecture Decision Record and document the change.

## 28.3 Checkpoints

Require review gates for:

- Irreversible architectural changes.
- Security-sensitive systems.
- Public publishing.
- Payment processing.
- Changes involving minors.
- Destructive database migrations.
- Deployment to production.
- Hardware-safety claims.
- Major external financial commitments.

Routine low-risk engineering decisions should not require unnecessary human approval.

---

# 29. REQUIRED OUTPUT DIRECTORY

Create a coherent documentation structure similar to:

```text
docs/MASTER_PLAN/
│
├── 00_EXECUTIVE/
│   ├── EXECUTIVE_SUMMARY.md
│   ├── VISION_AND_THESIS.md
│   ├── CRITICAL_FINDINGS.md
│   └── DECISION_REGISTER.md
│
├── 01_AUDIT/
│   ├── REPOSITORY_INVENTORY.md
│   ├── FEATURE_VERIFICATION.md
│   ├── TECHNICAL_DEBT.md
│   ├── TEST_COVERAGE.md
│   ├── SECURITY_BASELINE.md
│   └── PERFORMANCE_BASELINE.md
│
├── 02_RESEARCH/
│   ├── COMPETITOR_LANDSCAPE.md
│   ├── COMPETITOR_MATRIX.md
│   ├── USER_SEGMENTS.md
│   ├── USER_RESEARCH_PLAN.md
│   ├── MARKET_ANALYSIS.md
│   ├── TECHNICAL_RESEARCH.md
│   └── SOURCE_REGISTER.md
│
├── 03_PRODUCT/
│   ├── PRODUCT_REQUIREMENTS.md
│   ├── USER_JOURNEYS.md
│   ├── FEATURE_CATALOGUE.md
│   ├── FEATURE_PRIORITIZATION.md
│   ├── STUDIO_EDITOR.md
│   ├── COMPONENT_ECOSYSTEM.md
│   ├── EDUCATION.md
│   ├── COMMUNITY.md
│   └── UX_DESIGN_SYSTEM.md
│
├── 04_ARCHITECTURE/
│   ├── SYSTEM_ARCHITECTURE.md
│   ├── SYSTEM_DIAGRAMS.md
│   ├── FRONTEND_ARCHITECTURE.md
│   ├── BACKEND_ARCHITECTURE.md
│   ├── PROJECT_DATA_MODEL.md
│   ├── COMPONENT_SCHEMA.md
│   ├── API_CONTRACTS.md
│   ├── REALTIME_ARCHITECTURE.md
│   ├── AI_ARCHITECTURE.md
│   ├── SIMULATION_ARCHITECTURE.md
│   ├── ROBOTICS_ARCHITECTURE.md
│   ├── DRONE_ARCHITECTURE.md
│   └── ADR/
│
├── 05_ENGINEERING/
│   ├── IMPLEMENTATION_ROADMAP.md
│   ├── DEPENDENCY_GRAPH.md
│   ├── TASK_SPECIFICATIONS.md
│   ├── TEST_STRATEGY.md
│   ├── VALIDATION_BENCHMARKS.md
│   ├── PERFORMANCE_BUDGETS.md
│   ├── SECURITY_THREAT_MODEL.md
│   ├── DEPLOYMENT_ARCHITECTURE.md
│   └── OPERATIONS_RUNBOOK.md
│
├── 06_BUSINESS/
│   ├── STARTUP_STRATEGY.md
│   ├── POSITIONING.md
│   ├── PRICING_STRATEGY.md
│   ├── UNIT_ECONOMICS.md
│   ├── GROWTH_STRATEGY.md
│   ├── PARTNERSHIPS.md
│   └── FINANCIAL_SCENARIOS.md
│
├── 07_HANDOFF/
│   ├── AGENT_ONBOARDING.md
│   ├── EXECUTION_INSTRUCTIONS.md
│   ├── DEFINITION_OF_DONE.md
│   ├── OPEN_QUESTIONS.md
│   ├── RISK_REGISTER.md
│   ├── CHANGE_CONTROL.md
│   └── FIRST_30_TASKS.md
│
├── 08_RESEARCH_SPIKES/
│   └── [proof-of-concept reports]
│
├── MASTER_INDEX.md
├── implementation_manifest.json
└── feature_dependency_graph.json
```

You may reorganize this structure if there is a stronger reason, but every information category must remain discoverable.

Every document must link to relevant upstream requirements and downstream tasks.

Avoid contradictory sources of truth.

---

# 30. THE MASTER PLAN MUST INCLUDE A COMPLETE DEMONSTRATION WALKTHROUGH

Describe, in concrete technical terms, what the intended future system would do during the following example.

A student opens iynk.

They choose **New Project**.

They choose an ESP32-based environmental monitoring system.

They add a temperature sensor, display, power source, and other necessary components.

They place the components on the canvas.

They connect the pins.

They write the controller program.

They run the simulation.

The virtual display shows sensor data.

They intentionally create an incorrect connection.

The simulation either detects the error or clearly states why that failure is outside its supported modeling scope.

The student opens the AI assistant.

The assistant reads the structured circuit, relevant code, and diagnostics.

It explains the issue and offers a reviewable correction.

The student fixes the project.

They invite a collaborator.

The collaborator changes the display behavior.

Both users see a consistent shared result.

They save a version.

They export a supported firmware project, circuit description, and parts list.

They inspect the actual purchasing requirements and unresolved physical risks.

**For every step, identify the UI module, data structures, API calls, simulation engine, persistence path, security checks, validation rules, and expected results.**

Include equivalent smaller end-to-end examples for an original robotics project and an original drone configuration.

This demonstration must be supported by the proposed architecture, not merely described as a desirable user experience.

---

# 31. RED-TEAM THE ENTIRE STARTUP

Before finalizing recommendations, conduct a serious adversarial review.

Answer:

1. Why would someone use iynk instead of Wokwi?
2. Why would someone use it instead of Tinkercad?
3. What can iynk do that existing tools cannot?
4. Which advantages can competitors copy quickly?
5. Is combining three labs strategically coherent?
6. Are our simulations sufficiently accurate for the intended users?
7. Do users want custom project building enough to justify the expense?
8. Is the learning market large but difficult to monetize?
9. Could institutions adopt the product faster than consumers?
10. Are we confusing entertainment engagement with educational value?
11. Are we building too many features before validating retention?
12. Will AI inference make free access financially unsustainable?
13. Does the multilingual strategy materially improve adoption?
14. Can the existing simulation engines support custom components?
15. Which architectural assumptions are most likely to fail?
16. Is the Solana layer strategically important or distracting?
17. Does a component marketplace need network effects we do not yet have?
18. Could open-source competitors offer better simulation fidelity?
19. What legal or licensing risks are hidden in imported component data?
20. Can a small founding team realistically mainpported workflow works from beginning to end without manually editing internal files.

**[paste garbled: the end of question 20 and the start of section 32 were lost. Most likely: "20. Can a small founding team realistically maintain this scope? ¶ # 32. RELEASE GATES (or LAUNCH READINESS CRITERIA) ¶ Define gates for each release covering: ¶ **Product completeness** ¶ A supported workflow works from beginning to end without manually editing internal files." The section's remaining gates follow as pasted.]**

**Scientific correctness**

Simulation behavior falls within documented tolerances for approved validation cases.

**Reliability**

No unresolved release-blocking defects, with demonstrated recovery from expected failures.

**Security**

No known critical vulnerabilities in exposed execution, authorization, or data-processing paths.

**Performance**

Defined target devices and project sizes meet measurable interaction and execution budgets.

**Accessibility**

Critical tasks are usable through accessible interaction alternatives.

**User value**

Pilot users can successfully complete the targeted job without excessive assistance.

**Operational readiness**

Deployment, observability, incident response, backup, and rollback procedures have been tested.

**Business readiness**

The expected cost of providing the service is understood and financially acceptable for the intended launch.

Define specific numeric thresholds only after selecting meaningful workloads, baselines, and target devices.

Never invent benchmark results to satisfy a gate.

---

# 33. REQUIRED FINAL EXECUTIVE REPORT

After completing the research and architecture, provide a founder-readable final report answering:

### A. What iynk is today

What exists, what works, what is fragile, and what is missing.

### B. What iynk should become

The recommended long-term product and its market-entry strategy.

### C. Why anyone will choose it

Evidence-backed differentiation from existing competitors.

### D. What to build first

The smallest powerful next product milestone, including its exact scope.

### E. The full architecture

The recommended system, major interfaces, simulation architecture, and deployment design.

### F. The complete roadmap

All phases, dependencies, acceptance criteria, and estimated effort.

### G. The business

Target users, market assumptions, pricing hypotheses, growth strategy, and financial constraints.

### H. The main risks

The product, technical, competitive, legal, and operational issues most likely to cause failure.

### I. What not to build

Explicitly identify attractive but strategically premature features.

### J. The implementation handoff

The exact location of the implementation manifest, architecture documents, first executable tasks, validation commands, and instructions for the next agent.

### K. Confidence and unresolved assumptions

Clearly identify which conclusions are established, estimated, speculative, or blocked.

---

# 34. FINAL SUCCESS CRITERIA FOR YOUR ASSIGNMENT

Your planning assignment is complete only when:

1. The existing repository has been thoroughly audited.
2. Important claims have been verified or marked unverified.
3. The competitive landscape has been researched with traceable evidence.
4. A primary customer segment has been selected with justification.
5. The product vision has been challenged and narrowed into a plausible strategy.
6. Every approved major feature has a functional specification.
7. The original-project builder has an end-to-end design.
8. The component ecosystem has defined schemas and extension boundaries.
9. The simulation architecture clearly distinguishes approximation from validated fidelity.
10. The engineering architecture includes interfaces, data models, and failure modes.
11. The deployment architecture includes security, privacy, reliability, and cost.
12. The business strategy includes explicit testable assumptions.
13. The roadmap has dependencies and objective release gates.
14. Every near-term feature has atomic implementation tasks.
15. A separate agent can start executing without reconstructing your thinking.
16. Unresolved blockers are visible rather than silently assumed away.

The final documents must be substantial enough to support implementation, yet structured so that an engineer can locate the exact requirement needed for any particular task.

**Do not produce thousands of words of vague aspiration. Produce engineering specifications, decisions, evidence, diagrams, schemas, implementation contracts, and tests.**

---

# 35. EXECUTION INSTRUCTIONS — BEGIN NOW

Start immediately.

### Step 1

Inspect the repository.

Record the Git commit being audited.

Read the existing documentation and understand the actual application.

### Step 2

Run the test suite and inspect the product.

Identify what exists versus what the project claims.

### Step 3

Research the current competition.

Pay particular attention to original-project authoring, simulator fidelity, custom components, debugging, and educational workflows.

### Step 4

Conduct an independent technical and business critique.

Challenge the proposed vision.

Identify the strongest market entry point and the weakest assumptions.

### Step 5

Design the future product architecture.

Define data contracts and technical boundaries before specifying implementation tasks.

### Step 6

Construct the complete phased roadmap.

Every phase must produce working, verifiable outcomes.

### Step 7

Decompose the approved near-term roadmap into atomic implementation tasks.

Record dependencies and acceptance tests.

### Step 8

Create the handoff package.

Provide a `MASTER_INDEX.md` that allows a new agent to understand the entire system.

### Step 9

Conduct one final cross-disciplinary review.

Check for architectural contradictions, missing dependencies, unsupported market assumptions, incomplete workflows, safety gaps, and ambiguous instructions.

Resolve those findings or identify them explicitly as blockers.

### Step 10

Report the result and identify the exact first engineering task.

Do not begin an uncontrolled production rewrite.

If an external source is unavailable, record the limitation and proceed using transparent assumptions.

If research reveals a substantially better product strategy, recommend the change and explain why.

If the current software is stronger than expected, preserve it.

If parts are fundamentally inadequate, recommend replacements with evidence and migration plans.

---

# THE FOUNDING PRINCIPLE

We are not trying to build the largest collection of virtual Arduino boards.

We are not trying to build another decorative AI interface.

We are not trying to turn every educational feature into a subscription.

We are trying to build a platform that gives people the ability to learn, experiment, create, and collaborate with hardware in ways that would otherwise be financially or practically inaccessible to them.

The ultimate measure of success is not the number of simulated components, lines of code, AI models, or architectural services.

**It is the number of people who become capable of building something they previously could not build.**

Make iynk useful enough that students return because they are creating something of their own.

Make it credible enough that educators trust it.

Make it extensible enough that advanced creators are not trapped by the catalogue.

Make it financially sustainable enough that its accessible core can continue to exist.

And make the architecture solid enough that the next engineering agent can build it without guessing what we intended.

**Begin the repository audit and produce the complete master blueprint.**
