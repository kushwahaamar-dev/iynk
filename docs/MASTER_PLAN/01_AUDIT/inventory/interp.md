# Interpreters and virtual hardware runtime (src/lib/interp)

**Paths:** `src/lib/interp/**` (git commit bb546d6, audited 2026-10-26)   **Entry points:** `src/lib/interp/index.ts` (barrel), `run.ts:createRun` (live run, used by `src/lib/boardlab/engine.ts:264`), `headless.ts:runHeadless` + `checks.ts:evaluateChecks` (check run), `check-client.ts:startChecks` (Web Worker front door, used by `src/lib/boardlab/run.ts:358` and `src/lib/robotics/runner.ts:29`)   **LOC:** `find src/lib/interp -type f | wc -l` = 36 files; `find . -name '*.ts' ! -name '*.test.ts' | xargs wc -l | tail -1` = 11,822 source lines; tests = 1,646 lines; total 13,468 (VERIFIED)   **Owner today:** "interpreters" agent, `docs/ARCHITECTURE.md:117` (DOCUMENTED). Git history: `git log --oneline -- src/lib/interp | wc -l` = 18 commits, all dated 2026-10-24 to 2026-10-25 (the hackathon weekend).

Method: I read the entry points in full (index, run, headless, checks, check-job, check-client, check.worker, clock, exec, world, profiles, devices, lesson-world, pins), the Arduino type system and main loop, the Python tokenizer/runtime/module installers, the Verilog lexer, AST, settle/clock loop and persistence code. I did not read line by line: `arduino/parser.ts` beyond the unsupported-construct list, `arduino/libs.ts` beyond the builtin table, Serial, Wire, SPI and class registry, `python/runtime.ts` beyond the block/loop/module code, `python/modules.ts` beyond builtins/machine/time, `python/microbit.ts`, gpiozero and rclpy bodies, and the Verilog expression compiler. Probe and benchmark scripts are under `/private/tmp/claude-501/-Users-amar-Codes-ak-simlab/6a603069-dc65-486f-8236-8cec4f2cda15/scratchpad/audit/interp/` (outside the repo). Wall-clock numbers were taken on a shared Mac while other audit agents ran (load average 4 to 14), so absolute timings are noisy; I repeated the important ones.

## Purpose

A from-scratch, browser-side simulator that runs a student's source code against a modelled board and returns pin, serial, display and network behaviour on a deterministic virtual clock. It has two jobs: (1) a live run that drives the Board Lab figures frame by frame, and (2) a headless "check run" that plays a lesson's scripted world inputs against the program and produces a `RunTrace`, which `evaluateChecks` turns into pass/fail for a lesson's checks. It is not an emulator of a CPU. It executes the language source directly (VERIFIED, see Current functionality).

## Dependencies (imports in, imports out; third-party packages)

- Third-party packages: none. `grep -rhE "^import .* from '[^.@]" src/lib/interp` returns only `vitest` and `node:fs`/`node:path` in tests (VERIFIED, run on 2026-10-26). Everything (lexers, parsers, BigInt Python ints, float formatting, printf) is hand written.
- Imports out of the folder: `@/content/schema` types only (`DeviceModel`, `Check`, `RunTrace`, `WorldModel`, `BoardContent`, `Lesson`, `PracticeTask`); `world.ts:1`, `headless.ts:5`, `checks.ts:6`, `check-job.ts:5`. The tests also import `@/content/index.generated` and `@/lib/boardlab/template` (`lessons.test.ts:12-14`).
- Imports in (callers): `src/lib/boardlab/engine.ts` (createRun, live), `src/lib/boardlab/run.ts` and `src/lib/robotics/runner.ts` (startChecks), `src/lib/boardlab/inputs.ts`, `src/components/boardlab/LessonWorkspace.tsx`, and 24 content test files under `src/content/**/*.test.ts` (`grep -rlE "from '@/lib/interp" src server scripts` run on 2026-10-26). `server/` does not import it (`grep -rln "runChecks\|runHeadless\|evaluateChecks" src server scripts` shows only client code and the audit workflow script). The "verifying server" mentioned in `check-job.ts:1-2`, `headless.ts:1-3` and `checks.ts:1-3` comments does not exist yet (VERIFIED).

## Public interfaces (exported functions/types/components/messages, with path:line)

| Export | Where | What it does |
|---|---|---|
| `createRun(opts): Run`, `check(opts): Diagnostic[]` | `run.ts:95`, `run.ts:100` | Compile and build a stepped run (`start/stop/reset/step(ms)/input/analog/serialWrite/setSupply/coldJoint/attachUltrasonic/request/snapshot/on`). Interface `Run` at `run.ts:56`. |
| `RunOptions` | `run.ts:15` | `board, variant, language, source, world{seed,networks,web}, params, devices, budget` (default budget 400,000 statements per step, `run.ts:88`). |
| `runHeadless(HeadlessOptions): RunTrace` | `headless.ts:103` | Deterministic 1-ms-step run against a `WorldModel` script, records pin/serial/figure/http trace. |
| `evaluateChecks`, `evaluateCheck`, `sampleAt`, `risingEdges`, `stateMatches`, `codeOnly`, `servoDegrees` | `checks.ts` | 10 check kinds: runs, serial, pin-level, pin-toggles, pwm, tone, servo, responds, code, state (`checks.ts:122-165`). |
| `runChecks(job)`, `lessonJob`, `taskJob`, `boardNets`, `lessonVariant`, `CHECK_BUDGET_MS = 20_000` | `check-job.ts:11,24-70` | A `CheckJob` is plain data, so it can run in a worker, a test or a server. |
| `startChecks(job, onProgress, budgetMs)` | `check-client.ts:26` | Runs the job in `check.worker.ts`; falls back to in-thread `setTimeout(0)` when `Worker` is undefined; kills the worker at `budgetMs + 2000` (`check-client.ts:17,61`). |
| Worker protocol | `check.worker.ts:9-13`, `check-client.ts:8` | In `{job, budgetMs}`; out `{type:'progress',doneMs,runMs}` then `{type:'done',outcome}`. |
| `World`, `Snapshot`, `PinView`, `Rng` | `world.ts` | The electrical world (pins, ADC, PWM, tone, servo pulse, IRQ, serial, I2C map, Wi-Fi/HTTP sim, displays). |
| `Mpu6050, Pca9685, Ssd1306, Lcd1602, HcSr04, GenericI2C, I2CDevice` | `devices.ts` | Register-level I2C models and the HC-SR04 timing model. |
| `WorldBinding`, `drivesFor`, `runOptionsFor`, `qtrDarkness` | `lesson-world.ts` | Maps schema `WorldInput` devices (button, switch, pot, linear, tmp36, divider, hc-sr04, mpu6050, qtr-rc, onboard, network) onto pins/I2C/HTTP. |
| `PROFILES` (12 boards), `getProfile`, `resolvePin`, `hasPwm` | `profiles.ts:244` | Per-board facts: int/double width, ADC/PWM bits, pin lists, LEDs, buttons, aliases, `opUs`. |
| `pinNet`, `netResolver`, `pinoutNets` | `pins.ts` | Pin number to net name and back. |
| `InterpError`, `Diagnostic` | `errors.ts` | Positioned learner-facing errors with hints; kinds syntax/compile/runtime/unsupported/limit. |

## State ownership and persistence (stores, localStorage keys, server state, DB tables)

- No persistence, no localStorage, no IndexedDB, no DB, no network in this folder (VERIFIED: `grep -rn "localStorage\|indexedDB\|fetch(" src/lib/interp` returns nothing).
- All state lives in a `World` (`world.ts:137`) owned by one `RunImpl` (`run.ts:106`). `reset()` and deep-sleep wake call `boot()` which builds a fresh `World` (`run.ts:152-195`); host-driven inputs, analog volts, cold joints and ultrasonic distances are replayed from maps held in `RunImpl` (`run.ts:128-131,185-188`). RTC data survives deep sleep (`rtcSlots`).
- Pin edge trace for checks is capped at 20,000 edges (`world.ts:375`); beyond that edges are silently dropped, so a fast toggling program can lose later events from a check (VERIFIED by reading; not reproduced).
- Snapshots are emitted to the host at most 30 per simulated second (`run.ts:89`, test at `arduino.test.ts:321`).

## Current functionality (what VERIFIED works, how you know)

**Test run.** `npx vitest run src/lib/interp` on 2026-10-26: 9 files, 189 tests passed, 36.9 s (VERIFIED). `lessons.test.ts` runs every board lesson and robotics practice task: reference passes all checks 102/102 and the empty/starter program fails at least one check 102/102 (table written to scratchpad `lessons.md`).

### How each language is implemented

| Language | Front end | Execution model | Subset (VERIFIED where a probe is cited) |
|---|---|---|---|
| Arduino C++ (`arduino/`) | Hand-written lexer with `#include` and simple object/function-like `#define` (`parser.ts:25-110`), recursive-descent parser (921 lines), then a static type checker/compiler to a tree of JavaScript closures (`CE`/`CS` in `interp.ts:15-35`) | Closure tree, statement bodies are generators so `delay()` can suspend (`Gen` in `exec.ts:13`). Not a bytecode VM and not transpiled to source text. Integer widths come from the board profile (`types.ts:44-52`), so `int` wraps at 16 bits on Uno and 32 on ESP32. | No `class`, `template`, `typedef`, `goto`, `try`, `new/delete`, range-for, default arguments, struct methods, pointers (except `const char*` and library objects), `#if/#ifdef` (`parser.ts:101,432-434,498,532,643,697,700,790`; `interp.ts:243-244,980`). Probe: `class A` and `#ifdef` and `int *p` each give a clear "not supported" diagnostic. No overloading (`interp.ts:192`). |
| MicroPython and Python 3 (`python/`) | Tokenizer with INDENT/DEDENT, f-strings, recursive-descent parser (971 lines) | Tree-walking evaluator over the AST (`PyRt.stmt`/`evalG`, `runtime.ts:300+`), generator based for sleep. Python ints are BigInt, floats JS number. One runtime serves both the Pico/micro:bit "micropython" and the Pi "python" (content language `micropython` and `python` both map to interp `python`, `headless.ts:15-20`). | Classes, closures, try/except/finally, with, global/nonlocal, comprehensions, f-strings, `del`, `assert` parse. `yield`, `async`, `await`, complex numbers, `**kwargs` in a call are rejected (`parser.ts:140,457,746`). Probe: `import json`, `os`, `asyncio`, `dht`, `neopixel`, `ssd1306` give ImportError. |
| Verilog (`verilog/sim.ts`, 1,214 lines) | Hand-written lexer and parser into an AST | Cycle-based, 2-state simulator: signals compiled to closures over a `Float64Array`-like state array, one rising and one falling clock edge per cycle then combinational settle (`sim.ts:1008-1073,1128-1150`). Modules are flattened. | `always @(posedge/negedge)`, `always @*`/`always_comb`, `initial`, if/case/for, blocking and non-blocking, concat/replicate, part-selects, parameters and `#(.P(v))`, instances. Rejected: 4-state `x/z`, vectors wider than 32 bits, `function/task/generate/genvar`, memories (reg arrays), `# delays`, `inout`, `` `define/`ifdef `` (`sim.ts:63,80,82,231,270,346,483,640,772`). Probes confirm each. |

**The Verilog "execution" is not synthesis or event-driven RTL simulation.** It never builds a netlist, has no timing, no delta-cycle event queue, no X propagation, no tri-state and no `$readmem`. It is a 2-state cycle simulator: inputs are applied, one clock cycle is evaluated, outputs are sampled. It models display persistence (LED duty, 7-segment multiplexing averaged with a time constant, `sim.ts:1074-1121`) for the figure. It is a teaching simulator for clocked synchronous designs, not a substitute for Verilator/iverilog/Vivado simulation, and gives no timing-closure or resource information (VERIFIED by reading `sim.ts` and the unsupported list).

### API surface (implemented vs stub)

**Arduino builtins** (the table at `libs.ts:223-1405`, 89 entries, counted with `awk '/^export const BUILTINS/,/^};/' libs.ts | grep -cE "^  [A-Za-z_0-9]+: \{"`): pinMode, digitalWrite/Read, analogRead (+Resolution, MilliVolts, Reference), analogWrite (+Resolution, Range), delay, delayMicroseconds, millis, micros, tone/noTone, pulseIn/pulseInLong, attachInterrupt/detachInterrupt, interrupts/noInterrupts/sei/cli, math (map, constrain, trig, pow, sqrt, ...), random/randomSeed, bit ops, shiftIn/shiftOut, string helpers, printf family, ESP32 ledc*, dacWrite, touchRead, temperatureRead, deep sleep, rgbLedWrite/neopixelWrite. **Libraries** (`libs.ts:1408-1429`): Serial/Serial1, String, Wire (I2C), SPI, Servo, AccelStepper, Adafruit_NeoPixel, Adafruit_SSD1306, Adafruit_PWMServoDriver, LiquidCrystal_I2C, LiquidCrystal, MPU6050, QTRSensors, WiFi, IPAddress, WebServer/ESP8266WebServer, ArduinoLEDMatrix, ESP.
- **Stubs:** `SPI` is a stub: `begin/end/beginTransaction/endTransaction/setClockDivider` do nothing and `transfer` always returns 0 (`libs.ts:779-790`; probe: `Serial.println(SPI.transfer(0x9F))` prints `0`, no error). `Wire.begin/setClock` do nothing; I2C transfers cost zero virtual time and there is no repeated-start or clock-stretch model (`libs.ts:741-777`). `Serial.begin(baud)` stores the baud but serial output is delivered instantly with no baud-rate timing (`libs.ts:686,688-691`).
- **Missing (compile error "was not declared"/"expected a declaration"):** DHT, SoftwareSerial, EEPROM, HTTPClient/WiFiClient (no client; `world.web` is only read by Python `urequests`, `modules.ts:549`), OneWire/DallasTemperature, SD, Preferences, Ticker/hardware timers (TimerOne). Probes: `#include <DHT.h>`, `SoftwareSerial`, `EEPROM` all fail at compile.

**MicroPython / Pico** (`modules.ts:204-412`): `machine.Pin` (value/on/off/toggle/irq; IN/OUT/OPEN_DRAIN/PULL_UP/PULL_DOWN), `PWM` (freq, duty_u16, duty_ns), `ADC` (read_u16, read_uv, ADC(4) temp sensor), `I2C/SoftI2C` (scan, writeto, readfrom, writeto_mem, readfrom_mem), `Timer` (one-shot/periodic via virtual clock), `freq`, `unique_id`, `lightsleep`, `deepsleep` (just sleeps), `network.WLAN`, `urequests`/`requests.get`, `time/utime` (sleep, sleep_ms, sleep_us, ticks_*), `math`, `random`, `sys`, `struct`. **No `machine.SPI`, `machine.UART`, `rp2` (PIO), `neopixel`, `dht`, `ssd1306`, `json`, `os`, `gc`, `collections`, `_thread`, `asyncio`** (grep and probe). `machine.reset()` raises SystemExit rather than rebooting (`modules.ts:392`). `Pin(99, Pin.OUT)` is accepted without error and creates a pin `GP99` (probe `py-pin-any`).

**micro:bit** (`python/microbit.ts`, 520 lines): `microbit`, `music`, `radio` modules, 5x5 matrix, buttons, onboard sensors via world inputs. Read at the module-registration level only (`microbit.ts:345-347,485,499`); 15 tests in `microbit.test.ts`.

**Raspberry Pi** (`modules.ts:415-1007`): `gpiozero` LED, PWMLED, Buzzer, Button, Servo, AngularServo, Motor, DistanceSensor, RGBLED (`modules.ts:861`); `RPi.GPIO` (refused on Pi 5 by design, `modules.ts:408-418`); `rclpy` with Node, SingleThreadedExecutor/MultiThreadedExecutor, `geometry_msgs.msg` (Twist, Vector3), `std_msgs.msg` (String, Int32, Float32, Bool) (`modules.ts:994-1007`). ROS messages are emitted to the host through an `onRos` callback; there is no DDS, no topic graph between nodes beyond what the host wires (UNKNOWN whether two nodes in one script talk to each other; I did not test it).

### Time model

- One `VirtualClock` in microseconds with a sorted timer queue (`clock.ts`), no wall clock.
- Statements are charged a fixed `opUs` per board (`profiles.ts`): Uno 1 µs, Uno R4 0.4, ESP32 0.1, NodeMCU 0.25, Nucleo 0.25, Pico 4, micro:bit 6, Pi 0.05 (`exec.ts:51-60`). Cost does not depend on what the statement is (a `digitalWrite` costs the same as `x = 1`). So loops are "honest but cheap" in shape only, not cycle accurate. ESTIMATED: a real Uno `digitalWrite` is roughly 4 to 5 µs, here 1 µs (my recollection of AVR core timing, EXTERNAL, not measured).
- `delay`, `delayMicroseconds`, `time.sleep*` yield the wake time to the scheduler in `RunImpl.step` (`run.ts:247-282`). `delayMicroseconds` inside an ISR busy-waits (`libs.ts:315-318`).
- `millis()` is `floor(now/1000)`, `micros()` has 4 µs resolution on AVR, 1 µs elsewhere (`libs.ts:323-329`).
- **Idle-loop skipping.** If a `loop()` iteration changed no world state, no stored variable and took under 1 ms of virtual time, the interpreter jumps virtual time to the next millisecond (or 4 µs if the code read `micros()`) (`arduino/interp.ts:105-111`, `exec.ts:93-99`, same in Python `runtime.ts:307-311`). This keeps `while(!button)` polling cheap. It is a deliberate deviation from real execution: an iteration that has only invisible effects (for example a hidden counter in an unmodelled library call that is not flagged `pure`) is fine, but code that depends on how many iterations ran in a millisecond (software timing loops, `for` delays with no side effects) will see time jump. Not exercised beyond the lessons.
- Interrupts: pin edges queue handlers (`world.ts:375-392`), run between statements (`exec.ts:60-80`), honour `noInterrupts()`. Handlers run synchronously with a 5,000,000-op cap (`exec.ts:16,121-135`). Python `Timer` and `Pin.irq` callbacks go through a soft queue. There are no nested interrupts, no interrupt latency, no priority.
- PWM is stored as duty/frequency per pin; there is no waveform edge generation. Servo and tone are stored as pulse width / frequency on the pin (`world.ts:262-300`, `headless.ts:51-57`). A PWM pin read by `digitalRead` returns `duty >= 0.5` (`world.ts:235`).
- Hardware timers (Timer1 etc.) do not exist as a concept; sketches that use them via library headers fail to compile.

### Peripherals and protocols

I2C (register-level MPU-6050, PCA9685, SSD1306 command subset, 1602 LCD backlight bit, generic ACK-only device; `devices.ts`), HC-SR04 echo timing with 58.3 µs/cm and 38 ms timeout (`devices.ts:261-285`), WS2812/NeoPixel, servo, stepper (AccelStepper), 7-segment and LED matrix displays, ADC with noise on floating pins, Wi-Fi scan/connect with fixed 1.2 s DHCP, a web-server sketch that answers host-injected HTTP requests (`world.ts:268-326`), `urequests.get` against a fake web table (`world.ts:198-201`). **Not modelled:** UART as a peripheral (no second device on the other end; Serial1 is a print sink), SPI devices, 1-Wire, CAN, I2S, USB, real TCP/HTTP client, BLE, ADC sampling time, EEPROM/flash.

### Determinism

- No `Math.random`, `Date.now` or `new Date` in any runtime file (`grep -rn "Math.random\|Date.now\|performance.now\|new Date" src/lib/interp` shows only tests and the wall-clock budget check at `headless.ts:194`) (VERIFIED).
- Randomness: a seeded xorshift32 `Rng` for floating-pin noise and DHCP last octet (`world.ts:110`), default seed `0x2545f491`, overridable by `WorldOptions.seed`; Arduino `random()` is a separate Park-Miller generator seeded 1 (`arduino/interp.ts:121-132`), which the code comment says matches avr-libc (DOCUMENTED in comment, not tested against hardware).
- Reading a floating input advances the RNG (`world.ts:235-245`), so adding an extra read of an unconnected pin changes later noise; still deterministic for the same source.
- Ordering: timers sort by `(at, seq)` (`clock.ts:17-24`); world events by time then insertion (`headless.ts:87-90`); same source and world give the same `RunTrace`. The only non-deterministic factor is the wall-clock budget: a run that hits `budgetMs` stops at a machine-dependent virtual time and returns `limit` (`headless.ts:228-231`).
- Note: `headless.ts:208-230` starts the run then steps 1 ms of virtual time per outer iteration; world events with sub-ms times fire at their exact `t` through `advance(a.t)` (`headless.ts:214`).

### Budgets, infinite loops, worker

| Case | Result (VERIFIED by running `runHeadless`, runMs=5000, budgetMs=2000) |
|---|---|
| `void setup(){ while(1){} }` on Uno | no error, `trace.ms = 5000`, 6 ms wall. The loop just burns virtual time (1 µs per statement). Not flagged. |
| `void loop(){ while(true){} }` | same: no error, 3 ms wall. |
| Python `while True: pass` on Pico | no error, 11 ms wall, `trace.ms = 5000`. |
| Infinite loop inside a Python function called from a list comprehension | stops after the 5M-op sync cap: error "a function never returned (an endless loop inside an expression or interrupt handler)", 1,819 ms wall. |
| Busy loop with 1000 additions per `loop()` on Uno, 5 s virtual | 258 ms wall. |
| Verilog 100 MHz free-running counter, `budgetMs = 3000`, runMs 100,000 | stopped by `limit` at `trace.ms = 129` after 4,651 ms wall. Overshoot of the budget because the wall-clock check runs only every 64 virtual ms (`headless.ts:228`), which is 6.4M simulated cycles. |

So infinite loops are mostly bounded by virtual time, not wall time: the 5 s of virtual time a lesson asks for is the stop condition. The wall budget (`CHECK_BUDGET_MS = 20_000`, `check-job.ts:11`) matters for slow-to-simulate programs (Verilog at board clock speed, ESP32 programs that poll). In the browser the job runs in a Web Worker and the main thread kills it at budget + 2 s (`check-client.ts:61`), then returns a `limit` outcome with all checks failed (`check-client.ts:19`). In the live run the interpreter runs on the **main thread** (`boardlab/engine.ts:164` calls `run.step(dt)` per frame) with a per-step cap of 400,000 statements (`run.ts:88,262`); at the measured ~15M statements per second (Uno busy loop: 2,000,000 ops in 136 ms) a full budget step costs about 27 ms, more than a 16 ms frame (ESTIMATED).

**No memory limits.** Three of four allocation probes killed the Node process with a fatal V8 out-of-memory abort (run with `NODE_OPTIONS=--max-old-space-size=1024`): Python `x = [0] * (10**9)`, Python `while True: l.append(bytearray(10000000))`, and Arduino `int a[2000000000];`. The fourth, `String s += s` in a loop, was caught by JS ("Invalid string length") and reported. `MemoryError` is declared (`runtime.ts:152`) but never raised (VERIFIED, `grep -rn MemoryError` shows only the declaration). In a Worker this kills the worker/tab; on a server it would kill the process.

### Arbitrary sketches versus catalogue devices

- **Arbitrary pins work.** `pinMode(7,OUTPUT); digitalWrite(7,HIGH)` on an Uno runs and appears in the trace as net `D7` (probe). `Pin(99)` on Pico is accepted. `getProfile` lists digital pins but the World creates a `PinState` for any number on demand (`world.ts:166-172`). For a pin the profile does not list, only a few warnings exist (input-only pins, no PWM, interrupt-capable pins).
- **Arbitrary external devices do not.** The world only has what `DeviceModel` in `src/content/schema.ts:304-315` lists: button, switch, pot, divider (LDR/FSR/thermistor), linear, tmp36, hc-sr04, mpu6050, qtr-rc, onboard, network. A new sensor needs a TypeScript class (register map or pin timing) in `devices.ts`, a new case in `lesson-world.ts` and a new member of the schema union. There is no generic "device description" (netlist, SPICE, JSON register map, behaviour script). A user cannot attach a DHT22, an SPI flash, a UART GPS or a custom I2C chip without code changes.
- **Pin connections are by convention, not by wiring.** Which sensor is on which pin is declared per lesson in the `WorldModel` (`input.pins`). The runtime never sees a circuit; a button "on D2" is `Run.input(2, ...)`. There is no electrical simulation (no resistors, no loads, no brown-out from current draw), only the explicit rules coded in `world.ts` and `run.ts:setSupply`.

### Honest comparison with avr-gcc + simavr / Wokwi-style emulation

| Dimension | iynk interp | avr-gcc + simavr/avr8js |
|---|---|---|
| What executes | The source text, interpreted (C++ subset closures, Python subset tree-walk) | Compiled machine code of the real firmware, instruction by instruction |
| Language coverage | Subset; no classes, templates, pointers, `#if`, third-party libraries unless hand-written | Whatever the compiler accepts, including any library from the Arduino ecosystem |
| Timing | 1 fixed cost per statement; ISR and delay semantics approximate | Cycle accurate (AVR); peripherals (timers, UART baud, ADC) tick with the CPU clock |
| Registers / peripherals | None. `TCCR1A`, `PORTB`, `SREG`, `UDR0` do not exist; direct register code fails | Full register-level peripherals |
| Undefined behaviour, memory | Bounds-checked arrays with friendly errors; no stack/heap/RAM size modelling beyond a depth limit of 120 (`interp.ts:63`) | Real SRAM, stack overflow, misaligned access |
| Libraries | Each library re-implemented in TS (`libs.ts`), behaviour in the model | Real library source, any of thousands |
| Boards | 12 profiles with ESP32/Pico/Nucleo/micro:bit semantics via one interpreter | ATmega-class only for simavr/avr8js; other cores need QEMU or Renode |
| Teaching strengths | Friendly error messages with hints, instant, no compiler toolchain, no download, runs in a tab, deterministic checks | Accurate but needs a toolchain (or server compile) and gives raw compiler errors |
| Speed | ~15M statements/s measured; Uno blink 10 s virtual in 3 to 13 ms | simavr native is far faster than real time, avr8js reaches roughly real time in a browser (EXTERNAL, my recollection, not measured) |

Conclusion: this is a teaching-grade behavioural simulator with excellent error UX, not an emulator. Programs written for real hardware will often not compile here, and programs that compile here may behave differently from silicon in timing-sensitive code (EXTERNAL knowledge + VERIFIED subset limits).

## Known defects (with repro or evidence)

| # | Defect | Evidence | Severity |
|---|---|---|---|
| D1 | Memory bombs abort the whole process, no guard, `MemoryError` never raised | Repro: headless run of `x = [0] * (10**9)` (Pico), `int a[2000000000];` (Uno), or an `append(bytearray(1e7))` loop under `--max-old-space-size=1024` gives `FATAL ERROR ... JavaScript heap out of memory`. `grep -rn MemoryError src/lib/interp` shows only `runtime.ts:152`. | high for any server use, medium in the browser (tab/worker crash) |
| D2 | Budget check cadence lets Verilog overshoot the wall budget | `headless.ts:228` checks every 64 virtual ms; at 100 MHz that is 6.4M cycles, about 2 s of wall (measured: 3,000 ms budget ended at 4,651 ms). With the 20 s budget plus 2 s grace the worker is still killed, but the real stop is late. | low |
| D3 | A 100 MHz Verilog design cannot be simulated at board speed | Free-running counter on Basys 3: 10M cycles took 3.6 s, 2M cycles 0.6 s (about 2.8 to 3.3M cycles/s, `v.test.ts`). 1 s of virtual time is about 30 s of wall, over `CHECK_BUDGET_MS`. Lessons avoid this by using small divider parameters. Under heavy machine load the same 1 s run took 38 s and 133 s. | medium (limits what designs students can run) |
| D4 | SPI is a silent stub | `libs.ts:787` `transfer: ... () => 0`; probe prints `0` and no warning. A student's SPI sketch "works" with wrong data. | medium |
| D5 | Unvalidated pins in Python | `Pin(99, Pin.OUT).value(1)` accepted on Pico, trace gets net `GP99`. | low |
| D6 | Edge trace silently truncates at 20,000 edges | `world.ts:375`. A program toggling faster than that in a check run loses later edges; checks like `pin-level at 5000 ms` would read stale data. Not reproduced. | low-medium |
| D7 | Duplicate `max` builtin definition | `python/modules.ts:105` defines `max` via `minmax`, then `modules.ts:106` redefines it; the first is dead code. | low |
| D8 | Server-side verification claimed in comments is absent | Comments in `check-job.ts:1-2`, `headless.ts:1-3`, `checks.ts:1-4` refer to a verifying server; no server code imports interp. Progress and credentials computed by a browser worker can be forged. | high if checks are ever used for certification |
| D9 | `idle()` skip can hide timing bugs | `exec.ts:93-99` jumps time when a loop iteration is externally invisible; a program that calls an unmodelled-pure function in a tight loop is treated as idle. Behavioural deviation by design, not seen failing. | low |

## Technical debt (table: item, path, evidence, severity, effort guess)

| Item | Path | Evidence | Severity | Effort |
|---|---|---|---|---|
| Three monolithic files > 1,300 lines each | `arduino/libs.ts` (1,440), `python/runtime.ts` (1,361), `arduino/interp.ts` (1,353), `verilog/sim.ts` (1,214) | `wc -l` | medium | 1 to 2 weeks to split by concern |
| Libraries hand-ported one by one, no registry or plugin format | `arduino/libs.ts:1408-1440`, `python/modules.ts` | Adding DHT, SoftwareSerial, EEPROM means more TypeScript in the core | high for scaling | design needed, 2 to 4 weeks |
| Fixed per-statement time, no cost model | `profiles.ts` `opUs`, `exec.ts:51-60` | Cannot reproduce bit-banged protocols or cycle-level timing | medium | weeks (needs instruction-ish cost table) |
| `any` types as the value type | `arduino/types.ts:6` (`CValue = any` with eslint-disable), `python/runtime.ts:9` | Only 2 `eslint-disable` lines in the folder (`grep -rn eslint-disable`) | low | n/a |
| Idle skipping is a heuristic | `exec.ts:93-99`, `arduino/interp.ts:105-111`, `python/runtime.ts:307-311`, `fx` counter bumps at 8+ sites | Correctness depends on every side effect bumping `world.version` or `rt.fx` | medium | days to harden with property tests |
| Live run on the main thread | `boardlab/engine.ts:164` | Worker used only for checks | medium | 1 week to move `createRun` into a worker with message passing |
| Verilog settle is O(signals x combs) per iteration with a checksum | `sim.ts:1008-1063` | `settle()` copies `s.slice()` for every comb block; `settleFast` hashes every signal twice per iteration | medium | days; compile to sorted dataflow |
| No memory/size guards | see D1 | | high | days |
| Dead/duplicate code | `python/modules.ts:105-106` | | low | minutes |
| Board profile data embedded in code, no schema validation against `docs/facts` | `profiles.ts`, `docs/facts/*.md` | Facts live in two places | low | days |
| Cross-package coupling to content schema | `world.ts:1`, `lesson-world.ts:9`, `headless.ts:5` | `DeviceModel` union defined in `src/content/schema.ts` | medium | needed to decouple for user devices |

## Test coverage (which test files, what they really check: hardware-derived reference values vs self-consistency with the implementation)

`find src/lib/interp -name '*.test.ts'` = 9 files, 189 tests passing (VERIFIED run). Counts of `it(` per file: arduino 20, python 18, microbit 15, verilog 15, check-job 8, headless 4, lesson-world 4, lessons 2 (a loop that expands to one test per lesson/task, 102 each for reference and starter), checks.test.ts uses `describe` with its own cases (60 lines).

What they check:
- **Self-consistency, not hardware:** most tests run a snippet and assert on the simulator's own output (Blink toggles every 1 s, servo sweep, button debounce, NeoPixel, AccelStepper). The HC-SR04 test asserts `1458` µs for 25 cm (`arduino.test.ts:174`), which is exactly `25 * 2 / 0.0343` from the constant used in the implementation (`devices.ts:279`); it confirms the model matches itself, though 58.3 µs/cm is the datasheet figure.
- **Spec-derived:** MPU-6050 `WHO_AM_I = 0x68`, accel scale 16384 LSB/g, reading `16384` after wake (`arduino.test.ts:293-308`) come from the datasheet; PCA9685 prescale math and servo pulse mapping (`headless.test.ts`) are datasheet/library-derived; 16-bit overflow vs 32-bit (`arduino.test.ts:163`) is language semantics; `random()` states are claimed to match avr-libc in a comment only.
- **Lesson reference tests:** `lessons.test.ts` proves every reference solution passes its own checks and the starter fails. The checks were written alongside the simulator, so this is regression protection for content, not validation against a real board.
- **No golden comparison against a real toolchain.** `grep -rIl "simavr\|avr-gcc\|avr8js"` finds hits only in docs/MASTER_PLAN research, none in code or tests (VERIFIED). No fuzzing, no differential testing against CPython/MicroPython/Icarus Verilog. Python behaviour (BigInt ints, banker's rounding, `float` repr) is hand checked in `python.test.ts`.
- **Performance assertions exist** with loose thresholds: Blink under limits, busy-loop budget under 100 ms, Python and Verilog loops under 200 and 250 ms (`arduino.test.ts:41,314-316`, `python.test.ts:376-378`, `verilog.test.ts:152,213-215`).
- Not tested: memory exhaustion, worker kill path (the Worker branch of `check-client.ts` has no test; `check-job.test.ts` covers `runChecks` in-thread), main-thread frame time, board profile correctness beyond what lessons touch, rclpy node interplay.

## Performance characteristics (measured if you can, else ESTIMATED/UNKNOWN)

Measured with `performance.now()` around `runHeadless`/`runChecks` in a Vitest node environment (`bench.test.ts`, scratchpad), Apple silicon Mac, shared load (VERIFIED, noisy):

| Program (reference solution) | Virtual run | Wall time |
|---|---|---|
| Arduino blink, Uno, synthetic | 10,000 ms | 12.8 ms first run, then 3.8 ms and 2.7 ms |
| Lesson `uno-r3/blink` (arduino-cpp) | 8,500 ms | 7 ms (under load) |
| Lesson `pico/button` (micropython) | 4,000 ms | 35 ms |
| Lesson `pi4-pi5/blink` (python/gpiozero) | 9,000 ms | 18 ms |
| Lesson `basys3/counter` (verilog, small divider) | 3,600 ms | 353 and 383 ms unloaded (2,063 ms in the loaded full sweep) |
| Lesson `esp32-devkitc/web-switch` (Wi-Fi + web server) | 5,000 ms | 2,316 and 2,721 ms unloaded (17.3 s in the loaded full sweep) |
| Lesson `uno-r3/button` | 3,000 ms | 210 and 227 ms unloaded (1,780 ms loaded) |
| Per-language distribution over all 102 lesson/task reference runs (loaded) | | arduino n=74 median 5 ms, p90 929 ms, max 17,291 ms; micropython n=10 median 4 ms, max 35; python n=8 median 4 ms, max 18; verilog n=10 median 867 ms, max 2,063 |
| Sum of all 102 jobs | | 60.6 s loaded; about 27.8 s in the vitest lessons sweep |

Throughput: Uno busy loop 2,000,000 statements in 136 ms (about 15M statements/s); ESP32 busy loop (0.1 µs per statement) does 20,000,838 statements for 2 s of virtual time, 1,037 ms wall, so an ESP32 program that never sleeps costs about 0.5 s of wall per virtual second and Wi-Fi lessons that poll are the slowest content (2.3 to 2.7 s unloaded for 5 s virtual, 5 to 17 s loaded). The 20 s budget leaves headroom of about 7x unloaded for the slowest content, but under shared CPU load the web lessons came within 3 s of the budget (17.3 s). Verilog throughput is about 3M simulated cycles/s (D3). Cold start: first run in a process is slower (12.8 vs 2.7 ms), JIT warm-up.

UNKNOWN: browser Worker throughput versus Node (the same code in V8 but with different heap limits), memory footprint per run, and the live-run main-thread frame cost beyond the 27 ms ESTIMATE above.

## Security risks

1. **Untrusted code execution is not sandboxed by design but is contained by being an interpreter.** User source is never passed to `eval`/`Function`/dynamic `import` (`grep -rn "eval(\|new Function\|import("` finds only the interpreter's own `this.eval` method, VERIFIED). It cannot touch the DOM or network, since the host is the only sink (callbacks for serial, pins, ROS). That is a good property for client-side use.
2. **Denial of service by resource exhaustion** (D1): three trivial programs abort the process. In a Worker the damage is local to the tab. If the same job runs on a verifying server (as the comments plan) it needs an isolated process with a heap limit, a CPU/time limit (the in-thread wall budget is cooperative and checked every 64 virtual ms, so a single long interpreter step cannot be interrupted, which is why the client adds a Worker kill), and an output size cap (serial output is accumulated unbounded in `headless.ts` `trace.serial`; a program printing in a loop is only capped by virtual time).
3. **Check results are client-computed.** Anyone can post a forged `CheckOutcome`; there is no signing or server re-run (D8). This is a trust issue for badges/credentials, not a code-execution issue.
4. **Regex from content** : `serialMatches` builds `new RegExp(check.match)` from lesson content (`checks.ts:76-79`). Content is first-party today; if users author checks it is a ReDoS vector (HYPOTHESIS).
5. `world.request` parses `decodeURIComponent` on query strings from host input without try/catch (`world.ts` request); a malformed `%` throws into the run (HYPOTHESIS, not reproduced).
6. No secrets, no network, no storage in this folder.

## Reusability for an original-project builder (can this run on arbitrary user projects, or only on catalogue items? why?)

**Verdict: partially. The engine core is reusable; the device layer and the language coverage are catalogue-bound.**

What transfers today (VERIFIED): `createRun({board, source, ...})` accepts any source string for any of the 12 boards; `runHeadless` accepts any `WorldModel` (a list of inputs plus a time-ordered script) and any `Check[]`; `CheckJob` is plain JSON. A user project that is a single-board sketch within the supported language subset, using only the 12 built-in boards and the library list above, with sensors chosen from the 11 `DeviceModel` kinds, runs correctly now with no code change.

What blocks arbitrary user projects:
1. **Language/library gap.** User code that uses `class`, templates, pointers, `#ifdef`, DHT, SoftwareSerial, EEPROM, HTTPClient, `machine.SPI/UART`, `json`, generators or async fails at compile with a friendly message (probes). Real Arduino projects in the wild hit these constantly.
2. **No circuit or device description language.** Devices are TypeScript classes plus a closed schema union (`schema.ts:304-315`); there is no data-driven way to say "this I2C chip has these registers" or "this sensor outputs this waveform on pin X". A project builder needs a device definition format.
3. **No wiring/netlist input.** The runtime has no concept of connections. Pin-to-device mapping lives inside each lesson's `WorldInput.pins`. A builder must produce those per project from a canvas or netlist.
4. **Peripheral protocol gaps** (SPI data, UART to a second device, 1-Wire, interrupts from timers), no electrical model (current, voltage drop, loads).
5. **Board set is closed**: adding a board is a new `BoardProfile` entry plus alias/pin/LED data (`profiles.ts`), cheap for pin-compatible boards, expensive for a new MCU with new library semantics.
6. **Server execution safety** (D1, D8) before verifying user projects off the client.
7. Live run is main thread; a heavy user project can jank the UI.

## Required refactoring to get there

1. Define a **device-model interface** (data plus optional TS behaviour): I2C register maps, pin timing scripts, analog transfer functions, protocol endpoints (SPI/UART/1-Wire), and replace the closed `DeviceModel` union with a registry that `WorldBinding` consults. Keep the 11 existing kinds as built-ins.
2. Add a **circuit/netlist input** (parts, pins, nets) separate from lesson `WorldInput`, with an adapter that produces today's `WorldModel` for existing content.
3. **Library registry**: split `libs.ts` into one file per library with a declared header, class, board predicate and test; add the top missing ones (DHT, SoftwareSerial, EEPROM, SPI with real transfer to a device, HTTPClient/WiFiClient, Ticker), and Python `json`, `machine.SPI/UART`, `neopixel`, `collections`, generators.
4. **Language gaps** driven by a corpus: collect real beginner sketches (for example the Arduino built-in examples), measure compile success rate, and implement classes/pointers/templates in order of frequency. Decide early whether to keep extending the interpreter or compile real C++ (avr-gcc to WASM/Emscripten + avr8js/simavr or Renode); the interpreter will never reach full C++.
5. **Safety**: memory accounting (cap array length, string length, collection size, total allocated), output size cap, instruction budget enforced inside the interpreters (not only per step), run user jobs only in a Worker or isolated process.
6. Move the **live run into a Worker** with a typed message protocol that already exists for checks.
7. **Server-side verification path**: run `runChecks` in a sandboxed process, sign results, store attempts. The `CheckJob` shape already supports it.
8. Add **differential tests** against real toolchains (avr-gcc + simavr for Uno timing traces, CPython/MicroPython unix port for Python semantics, Icarus Verilog/Verilator for the Verilog subset) so "hardware-derived reference values" exist.
9. Fix D1 to D7 and split the 1,300-line files.

## Recommendation: preserve | extend | replace | deprecate | investigate (one line of reasoning)

**extend**: keep the interpreter, clock, world and check architecture (clean, deterministic, tested, zero dependencies) as the learner-facing simulator, and extend it with a device-registry and safety layer; separately investigate a real-toolchain emulation path (avr8js/simavr, Renode) for user-built projects that exceed the subset.

## Open questions

1. Is the target for original projects "learner sketches in the subset" or "arbitrary real firmware"? That decides extend versus add an emulator. UNKNOWN.
2. How should a user-defined device be expressed (JSON register map, TypeScript plugin, WASM)? UNKNOWN; none exists.
3. Is server-side verification of checks in scope, and if so what threat model (forged completions, resource abuse)? D8.
4. What is the real per-frame cost of the live run on a mid-range phone? Not measured (main-thread, up to 400k statements per frame).
5. Do Pico `PIO`, ESP32 dual-core/FreeRTOS tasks, Timer1, and software PWM matter for the target curriculum? Currently unsupported; I did not check how many lessons would want them.
6. Whether two rclpy nodes in one script exchange messages (not tested).
7. Does `Serial.println` without `Serial.begin` print here but not on hardware? Not tested (`libs.ts:686-691` shows print is unconditional).
8. How closely do `opUs` values track real instruction rates for interrupt-heavy lessons such as the reaction timer? ESTIMATED only, no hardware comparison.
