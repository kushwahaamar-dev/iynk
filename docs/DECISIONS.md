# Decisions

One line each: the decision, then why. Newest sections last. Corrections to the originals' golden calculator rows
are listed here too (calc agent: docs/requests/calc.md and src/lib/drone/__fixtures__).

## Architect (13:45 CDT Oct 24)

- A1 Content modules are TypeScript data (`satisfies XContent`) with only `import type`: one typed source, and Node 24's type stripping lets scripts and the figure build read them without a bundler.
- A2 Text fields hold TextKeys into per-item JSON, recognised by section prefix (`lessons.`, `parts.` …): literals (pin names, part numbers, code) stay literal and `--check` can find every missing key mechanically.
- A3 Code comments translate through `{{t:key}}` tokens and chips through `{{p:id}}`: identifiers stay real Arduino/Python/Verilog while every word a learner reads is translated.
- A4 Geometry, build groups, polarity, removability, lesson circuits, built-in demo modes, drone build rules and the drone wiring sheet live in the figure file (FIGURES-BENCH/FIGURES-DRONE); the content module holds what the host shows or checks; shared ids must match and the verify agent tests it. Avoids two copies of the same data while engines and items are built in parallel.
- A5 Lessons reference a figure circuit by key (= lesson id), because the Board Bench engine solves and draws circuits; the interpreter gets pins through `WorldInput.pins` + `DeviceModel`, so it needs no breadboard data.
- A6 Lesson and task completion = every `Check` passes on a headless deterministic run with the world script (D14c); the Learn Arduino rule "done when the upload finishes" is too weak for "lessons that work".
- A7 Practice tasks carry a reference `solution`, so a unit test proves each task is solvable with its own checks.
- A8 Bench and drone steps name the exact bridge command that performs them (`BridgeCommand`) and the figure state that marks them done (`StateCond`, dot paths): the host never guesses figure internals, and LabDock/replays can drive the same messages.
- A9 `Mcu.target` fixes the interpreter's int width and API shims (16-bit `int` on avr, 32-bit elsewhere), so per-target behaviour is data, not code branches.
- A10 Palette lives only in ids.ts metadata (index cards and figures read it there): one source.
- A11 Robotics bench ids name the subject (`tb6612fng`, `hc-sr04`, `pi5-ros2`; the two board builds `uno-r3-build`, `esp32-s3-build`), distinct from board ids so routes and progress keys never collide in reading.
- A12 Module ids (breakout boards incl. ULN2003, SSD1306, traffic-light, soil sensor) and part ids (components and mat peripherals) are listed from the 16 Learn Arduino lessons and the 13 benches; agents add more only additively.
- A13 Drone design types reuse src/lib/drone/calc's own types (`CalcModel`, `CalcBattery`…), and the catalogue keys equal the figure's design keys: the calculator consumes content directly (`designInput`) with no mapping layer.
- A14 Drone palettes follow the originals (quad5 tomato, whoop/cinewhoop/longrange mint, racer mustard, gpscam cobalt, delivery mustard, agrihex mint, wing blush, vtol cobalt, swarm mint, tricopter mint, octo cobalt).
- A15 Board card progress counts lessons only (Uno R3 reads `0/16` like the original) with assembly as its own tick, matching the brief's "identical in spirit".
- A16 The generator writes index.generated.ts only when its text changes (no dev-server reload loops) and never fails the build for an item in progress; `--check` is the strict mode for item agents and CI.
- A17 Content JSON is nested (dot paths), matching the shared `t()` in src/i18n/translate.ts.
