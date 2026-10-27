# RS-06: rp2040js with stock MicroPython

> Recovery note (orchestrator, 2026-10-27): the spike agent wrote this report, but a tool guard refused the file write ("Subagents should return findings as text"). The text below is restored unchanged from the agent's transcript.

## Question

Does rp2040js boot the stock MicroPython UF2 for the Raspberry Pi Pico with a filesystem, GPIO, ADC and I2C, fast enough to run in the browser at 1x?

## Why it matters

It decides D1 (MCU execution model) for the Pico family. If rp2040js works, the Pico lessons can run real firmware instead of the TypeScript MicroPython interpreter. The effort for the rp2040js path (3 to 5 weeks, ESTIMATED in TECHNICAL_RESEARCH.md) and the "Pyodide or MicroPython WASM behind a board shim" alternative both depend on the answer.

## Exit condition (copied from TECHNICAL_RESEARCH.md section 6, row RS-06)

Pass: all four work (boot, blink, ADC, filesystem write, I2C), CPU under 60 percent of one core at 1x. Fail: filesystem writes or I2C missing and need over 2 weeks.

## Environment

| Item | Value |
|---|---|
| Machine | Apple M4 Pro, arm64, 14 cores, macOS (Darwin 27.0.0) |
| Load average during timings | 3.4 to 4.8 (never above 10). Another spike lane was running. |
| Node | v24.8.0 |
| rp2040js | 1.4.1, npm, MIT. Demo files read from GitHub wokwi/rp2040js `demo/` (`micropython-run.ts`, `load-flash.ts`, `bootrom.ts`). The B1 bootrom image is `demo/bootrom.ts`, not in the npm package; copied as `src/bootrom.mjs`. |
| MicroPython UF2 (main) | RPI_PICO-20260824-v1.29.0.uf2, https://micropython.org/resources/firmware/RPI_PICO-20260824-v1.29.0.uf2, sha256 e1160e60...efe99d4e9 (MIT) |
| MicroPython UF2 (the demo's version) | RPI_PICO-20230426-v1.20.0.uf2, https://micropython.org/resources/firmware/RPI_PICO-20230426-v1.20.0.uf2, sha256 d9d97d8b...7ce6be27 (MIT) |
| Other tools | uf2 2.0.0 (MIT), esbuild 0.28.2 (MIT), Playwright 1.64.1 (Apache-2.0) |
| Browsers | Chromium 156.0.8078.4 (headless), WebKit 27.2, both from Playwright |
| Work dir | /Users/amar/iynk-master-plan-scratch/spikes/RS-06 (nothing installed in the repo) |

The Chromebook and phone questions stay open. I have neither. CDP CPU throttling (4x, 6x) is only an approximation of a slow core; it does not model memory bandwidth, JIT tiers or thermal limits.

## Method

1. Followed the rp2040js demo: load the bootrom, copy UF2 blocks into `mcu.flash`, attach `USBCDC` to `mcu.usbCtrl`, set PC to 0x10000000, run. My harness (`src/harness.mjs`) uses the same loop as `Simulator.execute()` but runs synchronously and in slices so a script can wait for output. Every typed program goes through MicroPython paste mode (Ctrl-E, text, Ctrl-D) and ends with a marker print that the echo cannot contain.
2. Blink: `Pin(25, Pin.OUT)`, toggle and `sleep_ms(100)` six times. A listener on `mcu.gpio[25]` records transitions with the simulated clock.
3. ADC: set `mcu.adc.channelValues[0]` to 0, 1000, 2048, 4095 and read `machine.ADC(26).read_u16()`.
4. Filesystem: `open('t.txt','w')`, write, close, read back, `os.listdir()`. Then copy the flash array into a second simulator instance and read the files again.
5. I2C: a stub on the hardware peripheral (`mcu.i2c[0]`, callbacks `onStart/onConnect/onWriteByte/onReadByte/onStop`) ACKing 0x48; `readfrom_mem`, `writeto`, `readfrom`, and a NACK on 0x49. For `scan()`, an open-drain bus model on two GPIO pins plus a tiny slave (`src/i2cslave.mjs`).
6. Speed: simulated time divided by wall time for REPL idle, `sleep_ms`, and a busy loop, three repeats each, with `process.cpuUsage()`. Same code in Chromium (unthrottled, 4x, 6x) and WebKit.
7. iynk comparison: ran the Pico `blink` and `i2c-mpu6050` lesson sources (from `src/content/boards/pico.ts`, default parameters, template tokens resolved) through iynk's `runHeadless` (bundled read-only with esbuild, `src/iynk_entry.ts`) and through rp2040js, and compared pin transitions and serial lines.

## Results

### Boot

| Firmware | Boot to `>>>` (simulated) | Wall (Node) | Banner |
|---|---|---|---|
| v1.29.0 | 15.1 ms | 46 ms | `MicroPython v1.29.0 on 2026-08-24; Raspberry Pi Pico with RP2040` |
| v1.20.0 | 11.0 ms | 39 ms | prompt printed, banner printed before USB attached (as in the demo) |

How boot time is counted: the "simulated" figure is not a real Pico boot time. The harness does not run the bootrom's own startup (`src/harness.mjs:24` sets `mcu.core.PC = 0x10000000` and the UF2 blocks are copied straight into `mcu.flash`), so the second-stage boot loader and bootrom flash setup that a real chip runs are skipped. The 11 to 15 ms covers only MicroPython's own start-up to the prompt, with the clock in `Simulator.execute()` at 8 ns per cycle. Do not quote it as chip boot time. The wall figure is Node time on this machine.

Both boot to the REPL. No error was logged except the "unimplemented peripheral" noise from the QSPI/SSI registers, which I silenced.

### GPIO 25 blink (v1.29.0, `sleep_ms(100)`)

| Transition | Simulated time (ms) | Interval (ms) |
|---|---|---|
| 1 | 30.197 | |
| 0 | 130.059 | 99.862 |
| 1 | 230.040 | 99.981 |
| 0 | 330.062 | 100.022 |
| 1 | 430.046 | 99.984 |
| 0 | 530.064 | 100.018 |

There is also a first event at 30.124 ms for the pin going to output low. v1.20.0 gave intervals 100.041 to 100.058 ms. The blink works and the timing is correct to well under 0.1 ms.

### ADC

| Injected (12 bit) | `read_u16()` |
|---|---|
| 0 | 0 |
| 1000 | 16003 |
| 2048 | 32776 |
| 4095 | 65535 |

Works. The 12-bit value is shifted left 4 and a few low bits are filled in by MicroPython's scaling (1000 gives 16003, not 16000). The temperature channel (ADC 4) also reads.

### Filesystem

| Case | Result |
|---|---|
| Stock rp2040js, nothing added | FAILS. `open('t.txt','w')` raises `OSError: [Errno 19] ENODEV`. Mounting the flash raises `OSError(84)` and `VfsLfs2.mkfs` raises `OSError(28)`. |
| With a 30-line program-counter hook (`src/flashhook.mjs`) | WORKS. `wrote 10`, `read hello iynk`, `['t.txt']`, size 10. First boot auto-formats the filesystem (2 erases, 2 programs). |
| Persistence | Copying the flash array into a fresh simulator brings back `['log.csv', 't.txt']`, `persist me`, and a 1200-byte file. Firmware area unchanged (0 bytes differ). |

Cause: the bootrom routines `flash_range_erase` and `flash_range_program` drive the QSPI flash chip through SSI and IO_QSPI registers, which rp2040js does not model (the log shows "Unimplemented peripheral" for them). The demo avoids this by loading a prebuilt `littlefs.img` and only reading it. My hook finds `RE` and `RP` in the bootrom function table, and when the PC reaches them it erases or programs `mcu.flash` in JavaScript and returns to LR. Writing it took well under an hour. Whether the hook is robust (partial-page programs, erase size, a second core, writes during XIP) is not tested beyond the cases above.

### I2C

| Case | Result |
|---|---|
| Hardware peripheral, stub at 0x48: `readfrom_mem(0x48,0,3)` | `b'\x124V'` correct |
| `writeto(0x48, b'\x01')` then `readfrom(0x48,2)` | returns 1, then `b'4V'` correct |
| `readfrom(0x49,1)` (no device) | `OSError: [Errno 5] EIO` correct |
| `I2C.scan()` with only the peripheral stub | FAILS: returns `[]` after 5.6 s simulated (112 probes, 50 ms timeout each) |
| `I2C.scan()` plus pins pulled up and a GPIO-level slave at 0x48 | WORKS: `[72]`, 27 ms simulated, for both `SoftI2C` and hardware `I2C(1)` |

Cause of the scan failure: MicroPython probes with a zero-length write, which the RP2040 I2C block cannot do, so the port bit-bangs it on the pins. The register trace showed no access to the I2C block and 50,001 reads of SIO GPIO_IN. The bit-bang needs SCL and SDA to read high when released (an external pull-up) and needs something pulling SDA low during the ACK bit. rp2040js has no pull-up model and the peripheral callbacks never see the probe. In a circuit simulator the pull-ups and the slave belong to the circuit, so the GPIO-level route is the natural one; the data transfers (reads, writes, register access) can still use the peripheral callbacks. Both routes on the same pins worked in the lesson run below.

### Speed and CPU (the failing part)

Node, v1.29.0, simulated ms divided by wall ms. CPU was 100 percent of one core in every row (`process.cpuUsage`).

| Workload | Sim ms | Wall ms (3 runs) | Speed (x real chip) | Load |
|---|---|---|---|---|
| REPL idle, plain | 1000 | 1495 to 1507 | 0.66 to 0.67 | 4.0 |
| `sleep_ms(1000)`, plain | 1004 | 1450 to 1473 | 0.68 to 0.69 | 4.0 |
| Busy loop 100k iterations, plain | 3679 | 5927 to 6082 | 0.61 to 0.62 | 4.0 to 4.2 |
| REPL idle, with flash hook | 1000 | 1555 to 1579 | 0.63 to 0.64 | 3.9 |
| `sleep_ms(1000)`, with flash hook | 1005 | 1515 to 1525 | 0.66 | 3.9 |
| Busy loop, with flash hook | 3679 to 3685 | 6068 to 6254 | 0.59 to 0.61 | 4.0 |

The CPU never sleeps. In 200 simulated ms of REPL idle the core executed 13.2 million instructions and sat in a waiting state for only 8 ms (4 percent). MicroPython's USB and event polling keep it running, so `time.sleep` costs as much as real work. About 66 million simulated instructions per wall second at idle.

Browser (same loop, bundled with esbuild, page main thread):

| Browser | CPU throttle | Boot wall (ms) | REPL idle speed | Blink loop speed | Load |
|---|---|---|---|---|---|
| Chromium 156 | none | 29 | 0.77x | 0.78x (re-run by the checker: 0.79x) | 4.2 |
| Chromium 156 | 4x | 81 | 0.18x | 0.19x | 4.2 |
| Chromium 156 | 6x | 119 | 0.13x | 0.13x | 4.2 |
| WebKit 27.2 | none | 35 | 0.54x | 0.56x | 4.1 |

At 1x the emulator would need more than one core on this machine, so CPU at 1x is above 100 percent, not under 60. At 4x throttle it runs at about a fifth of real time.

### Comparison with iynk's own interpreter (two Pico lessons, default parameters)

| | iynk `runHeadless` | rp2040js + MicroPython 1.29.0 |
|---|---|---|
| blink, GP25 | 1 at 0.024 ms, then toggles every 500.0 ms (500.04, 1000.06, ...) | 1 at 14.9 ms, then toggles every 500.0 ms (514.9, 1014.95, ...); the 14.9 ms is paste and compile time |
| blink, GP15 | 0, 1 at 0.028, then every 500 ms | 0, 1 at 14.93, then every 500 ms |
| blink, 4000 virtual ms | 4.9 ms wall | 4300 sim ms in 6621 ms wall |
| i2c-mpu6050 serial | `found [104]`, `who am i 0x68`, `accel z 1.0 g` every 500 ms from t=0 | identical lines; first accel at 45 ms, then every 500 ms |
| i2c-mpu6050, 2000 virtual ms | 2.1 ms wall | 2300 sim ms in 3419 to 3532 ms wall |

The output matches on both lessons: same pin levels in the same order at the same 500 ms spacing, same serial text. The MPU6050 stub I wrote for rp2040js has three registers (0x75, 0x3F, 0x40 and a writable 0x6B). iynk's interpreter is about 800 to 1000 times faster in wall time for the same virtual time.

## Verdict

**Pass clause (CPU under 60 percent of a core at 1x) NOT MET; Fail clause (missing features needing over 2 weeks) NOT TRIGGERED; for the stock rp2040js loop; idle-skip untested.**

- Boot, blink, ADC, filesystem write and I2C all work (filesystem and `scan()` need small additions of my own, 30 lines and 60 lines, both done within this spike). So the "Fail: filesystem writes or I2C missing and need over 2 weeks" clause is not triggered. The outcome sits between the two clauses: the exit condition has no literal result for it, so the decision stays open and this report does not call it a Fail.
- The pass clause "CPU under 60 percent of a core at 1x" is not met. rp2040js runs MicroPython at 0.54x to 0.79x on an Apple M4 Pro, using 100 percent of a core, and 0.13x to 0.19x under 4x to 6x CPU throttling. Real-time 1x is not reachable on this machine, let alone on a Chromebook.
- Scope: this verdict is for the stock rp2040js execution loop as published. An idle-skip or WFI fast-forward on MicroPython's poll loop could change it; that was not tested.

## Caveats

- One machine, one run set per row (three repeats for the Node table, one for the browser table). Load was 3.4 to 4.8 throughout.
- Throttling is an approximation. No Chromebook, phone or Safari on iOS was measured. The device question stays open.
- Browser numbers are main-thread. A Worker was not tested; it would remove UI jank but not change the instruction rate, though throttling may not apply to workers the same way.
- Speed was measured with the 125 MHz clock assumption in `Simulator.execute()` (8 ns per cycle). I did not check that the 66 MIPS figure corresponds to the real chip's instruction rate.
- The flash hook is a minimal implementation. Not tested: erase of sizes other than 4096, writes while another routine runs, XIP cache effects.
- The GPIO I2C slave handles address match, write bytes and ACK; it does not send data bits (reads go through the peripheral stub). It is a spike, not a bus model.
- I did not test PWM, UART, PIO, Wi-Fi (Pico W), or MicroPython `network`. The iynk `wifi` lesson cannot run on this chip in any case.
- I did not look for speed-ups inside rp2040js (JIT-friendly decode, skipping the USB poll loop, batching clock ticks). The 0.6x figure is for the code as published.
- CircuitPython and the Pico 2 (RP2350) were not tried; the npm package models the RP2040 only.

## What this means for the architecture

HYPOTHESIS. rp2040js can run the real Pico firmware correctly, but at roughly 0.54x to 0.79x on a fast laptop, so it is not a drop-in replacement for the TypeScript interpreter as the default path. Two uses look viable, neither tested here. (1) Virtual time instead of real time: the lessons only need the simulated clock to drive the world model, so running at 0.2x to 0.7x just stretches a 4 s lesson to 6 to 30 s, which is bad for blink-and-see feedback but fine for a "Run on the real firmware" button. (2) Keep the TypeScript interpreter as the default and the live path (it ran the same two lessons identically, about 800x faster), and offer rp2040js as an opt-in "real firmware" mode in a Worker, with the check path left on the interpreter. Cost to reach a polished opt-in mode is not settled by this spike: the filesystem hook and the pull-up and bit-bang I2C model are small, but wiring them to `world.ts` (not checked) and the persistence of the flash image to IndexedDB are extra work, and the speed problem needs either a profiling pass on rp2040js or an idle-skip hook on MicroPython's poll loop (both untested). The 3 to 5 week estimate for D1 on rp2040js should not be shortened on the strength of this spike; the speed risk is now measured and is real.

## How to reproduce

```
mkdir -p /Users/amar/iynk-master-plan-scratch/spikes/RS-06 && cd /Users/amar/iynk-master-plan-scratch/spikes/RS-06
npm init -y && npm i rp2040js@1.4.1 uf2 esbuild playwright
cp <repo>/docs/MASTER_PLAN/08_RESEARCH_SPIKES/RS-06-rp2040js-micropython/src/* .
mkdir fw && curl -o fw/RPI_PICO-20260824-v1.29.0.uf2 https://micropython.org/resources/firmware/RPI_PICO-20260824-v1.29.0.uf2
curl -o fw/RPI_PICO-20230426-v1.20.0.uf2 https://micropython.org/resources/firmware/RPI_PICO-20230426-v1.20.0.uf2
node features.mjs fw/RPI_PICO-20260824-v1.29.0.uf2     # boot, blink, ADC, filesystem, I2C, scan
node persist.mjs fw/RPI_PICO-20260824-v1.29.0.uf2      # filesystem survives a reboot
node speed2.mjs fw/RPI_PICO-20260824-v1.29.0.uf2 plain # headline speed number (also: hook)
node idle.mjs fw/RPI_PICO-20260824-v1.29.0.uf2         # share of time the core is idle
node lessons.mjs fw/RPI_PICO-20260824-v1.29.0.uf2 blink   # and: i2c
npx esbuild iynk_entry.ts --bundle --platform=node --format=esm --alias:@=<repo>/src --outfile=iynk_bundle.mjs && node iynk_bundle.mjs
npx playwright install webkit
mkdir www && npx esbuild browser_entry.js --bundle --format=iife --outfile=www/bundle.js && cp fw/RPI_PICO-20260824-v1.29.0.uf2 www/fw.uf2 && echo '<!doctype html><script src="bundle.js"></script>' > www/index.html
node browser_run.mjs
```

`src/t4_fs.mjs` is the filesystem failure and fix probe. `src/micropython-run.ts` and `src/load-flash.ts` are the unmodified upstream demo files, kept for reference (they import from the rp2040js source tree and do not run as is). Edit the hardcoded repo path in `iynk_entry.ts` if the repo moves. `src/iynk_out.json` holds the interpreter's output used in the comparison.

## Independent check (2026-10-27)

The checker re-ran the headline measurement. The orchestrator wrote this section from the checker's returned findings. Items already addressed by the review fixes at the end of this file are marked.

- Reproduced: yes
- Verdict holds: yes

Numbers from the re-run:

- Node, plain, v1.29.0 UF2, speed2.mjs, 3 reps each. REPL idle 1000 sim ms: 0.67, 0.68, 0.67x (wall 1481 to 1502 ms), CPU 100 to 105 percent, load 3.7 to 4.2.
- Node: time.sleep_ms(1000): 0.61, 0.67, 0.66x, CPU 97 to 101 percent, load 4.2 to 4.6.
- Node: busy loop 100k iterations: 3679 sim ms in 6031 to 6548 wall ms, 0.56 to 0.61x, CPU 95 to 100 percent, load 4.6 to 5.4.
- features.mjs: boot to '>>>' OK (MicroPython v1.29.0, RP2040); blink-done OK; ADC OK; LittleFS write/read/list OK ('read hello iynk', ['t.txt']); I2C hardware read/write plus NACK (EIO) OK; I2C soft scan [72] OK; hardware scan [72] OK; errs [] . Load 7.5 during this run.
- browser_run.mjs Chromium 156.0.8078.4, no throttle: idle 0.78x, blink 0.79x, 17 toggles, load 7.0.
- Chromium 4x throttle: idle 0.17x, blink 0.19x, 6 toggles, load 6.8.
- Chromium 6x throttle: idle 0.12x, blink 0.13x, 6 toggles, load 6.8.
- WebKit 27.2 no throttle: idle 0.54x, blink 0.57x, 17 toggles, load 7.1.
- Tolerance I would use: within 15 percent for speed ratios at similar load, because another lane shares the machine. The report's numbers (written after the check) agree within this tolerance: idle 0.67 vs 0.66 to 0.67, sleep 0.61 to 0.67 vs 0.68 to 0.69, busy loop 0.56 to 0.61 vs 0.61 to 0.62, Chromium 0.78 and 0.79 vs 0.77 and 0.78, WebKit 0.54 and 0.57 vs 0.54 and 0.56. Every measured value is below 1x, so the conclusion is not sensitive to this tolerance (the best case, 0.79x, is 21 percent under the 1x bar).

Problems found:

- Verdict wording: the exit condition (TECHNICAL_RESEARCH.md row 12) is 'Pass: all four work, CPU under 60 percent of a core. Fail: filesystem writes or I2C missing and need over 2 weeks'. All four features work (blink, ADC, LittleFS, I2C), so the literal Fail clause is not met. The Pass clause is missed on speed (0.54 to 0.79x, not 1x) and CPU (about 100 percent of a core, not under 60). The outcome sits between the two clauses. The report now says: Pass not met on speed and CPU; Fail clause not triggered, features all work.
- The fast and cheap fix is not tested: speed is bounded by the emulator on one core with no idle skip (REPL idle runs at 0.67x using 100 percent CPU). The report should say the verdict is for the stock rp2040js loop as written, and that an idle-skip or WFI fast-forward could change it. I did not test this. The Verdict now states the scope.
- Device question stays open: 4x and 6x throttling is a proxy for a Chromebook or phone, not a measurement of one. Unthrottled Apple-silicon Chromium and WebKit already fail 1x, so more throttling only widens the gap to the Pass clause.
- Load during my runs was 3.7 to 7.5 (another lane active), mostly below 10. Numbers were not retried under lower load.
- Odd detail: bootSimMs is about 14 to 15 sim ms in every run, which looks short for a MicroPython boot. It reaches the '>>>' prompt, so the boot text is real, but the report should say how sim time is counted (the bootrom shortcut in bootrom.mjs) so readers do not take it as real boot time. Addressed in the Boot section.

## Review fixes (2026-10-27)

| # | Issue | What I did |
|---|---|---|
| 1 | Verdict said FAIL, but the literal Fail clause (filesystem or I2C missing, over 2 weeks) is not met | Replaced the Verdict heading with: Pass clause NOT MET; Fail clause NOT TRIGGERED; for the stock rp2040js loop; idle-skip untested. Added a line that the result sits between the clauses and a Scope line on idle-skip. Checked against TECHNICAL_RESEARCH.md row 12 as quoted in the checker notes. |
| 2 | Speed range 0.54 to 0.78 vs checker best case 0.79 | Verdict and architecture text now say 0.54 to 0.79x. The Chromium table row keeps the original 0.78x and notes the checker's 0.79x. The Caveats bullet "0.6x" for the stock code is kept, as it describes the Node figure. |
| 3 | Independent-check section said REPORT.md did not exist | Removed that problem bullet and the sentence in the section intro. Replaced "numbers not available to compare" with a comparison showing the report and the re-run agree within 15 percent. |
| 4 | Boot time 15.1 ms unexplained | Added a "How boot time is counted" note in the Boot section. Verified in `src/harness.mjs:24` that the PC is set to 0x10000000 with UF2 blocks copied directly into flash, so the bootrom and second-stage startup are skipped. I describe this as skipped startup, not as a specific "shortcut" inside bootrom.mjs, because bootrom.mjs is only the B1 image. |
