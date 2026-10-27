# ADR-0305: MCU execution: interpreters by default, avr8js as an opt-in firmware mode

Status: proposed, 2026-10-27. Author: simulation architecture seat.
Upstream: RS-03 PASS on desktop; RS-06 FAIL on the CPU clause; RS-12; `TECHNICAL_RESEARCH.md` D1. Spec: SIMULATION_ARCHITECTURE.md sections 4.2, 8.1 to 8.4.
Downstream: ADR-0013 (compile); ADR-0307; SA-01, SA-14, SA-15; F-039, F-040, F-048, F-055; R-102, R-106.

## Problem

The TypeScript interpreters run beginner sketches and lessons well, but they are a subset of Arduino C++, with flat per-statement cost and no registers or timers. A real compiled binary on a chip emulator exists for AVR (avr8js) and for RP2040 (rp2040js). Which runs by default, and what do the other boards do?

## Constraints

1. Works on low-end devices (D-011); RS-03 had no phone or Chromebook run.
2. 102 lesson references stay green.
3. ESP32, STM32, Uno R4 and Pi have no browser emulator that models their I2C, SPI and Wi-Fi (Espressif QEMU lacks all four, EXTERNAL).
4. Honest labels (ADR-0302).

## Considered options

| Option | Verdict |
|---|---|
| A. Emulators only | Rejected: no engine for most boards; compile needed for every click |
| B. Interpreters only | Rejected: no real timers, ISRs or libraries; no oracle for the cost table |
| C. Interpreters by default (T1); avr8js opt-in for Uno and Nano (T3); rp2040js test oracle only | Chosen |
| D. rp2040js for Pico by default | Rejected: 0.54 to 0.79 times real time on an M4 Pro (RS-06) |

## Decision

The interpreters stay the default path and are labelled T1 ("Arduino C++ subset", never "Arduino toolchain"). avr8js runs compiled Uno and Nano firmware as an opt-in mode in the worker (T3) behind the `McuEngine` interface. rp2040js is a CI oracle for the Pico interpreter (REF-7). ESP32, STM32, Uno R4, Pi, micro:bit and NodeMCU stay T1 or T0 and say what is mocked (8.2). The interpreter cost table is accepted when avr8js on the same sketch is within 15 percent (SA-14), which makes avr8js the T1 gate.

## Technical justification

RS-03: serial text equal on 80 of 80 lines and PWM duty within 0.4 points against the interpreter on three sketches; 6.1 to 6.5 times real time in Node with listeners, 7.3 to 7.5 in a Chromium Worker. The adapter binds ports, USART, ADC, TWI and SPI to the bus models of ADR-0307.

## Performance data

RS-03: about 100 million AVR cycles per wall second on one M4 Pro core; main-thread throttle proxy 1.6 to 1.8 times at 4x and 1.1 to 1.2 at 6x. Device speed on a phone is INCONCLUSIVE (no run). RS-06: rp2040js 0.13 to 0.19 times under throttle.

## Cost implications

Adapter 2 to 4 person-weeks plus 2 to 3 for I2C and SPI device models (dossier estimate, ESTIMATED).

## Licensing

avr8js is MIT, rp2040js is MIT (RS-03, RS-06 reports). Compiled-firmware tools are covered by ADR-0013.

## Security implications

A hex or ELF import is untrusted input: size, section, DWARF and parse-time caps and a 1,000-file fuzz gate (8.8, SA-22).

## Reversibility

Reverse if a Chromebook run is below 1 times real time: avr8js becomes desktop only, the interpreter remains the default everywhere.

## Migration plan

SIM-0 wraps the interpreters; SIM-6 adds avr8js, hex import, the differential suite and the debugger.

## Known limitations

avr8js state serialisation is unknown (6.7). Behaviour of `Servo`, `tone`, `pulseIn`, interrupts and I2C against the interpreter was not tested by RS-03.
