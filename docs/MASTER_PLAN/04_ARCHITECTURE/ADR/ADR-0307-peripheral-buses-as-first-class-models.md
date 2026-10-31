# ADR-0307: Peripheral buses are first-class models; devices are data plus registered behaviour

Status: proposed, 2026-10-27. Author: simulation architecture seat.
Upstream: Audit `interp.md` D4 (SPI stub), R-109; RS-06 (MicroPython `I2C.scan` needs a bus model). Spec: SIMULATION_ARCHITECTURE.md section 9.
Downstream: ADR-0305, 0314; COMPONENT_SCHEMA (`protocols[]`, builtin refs); SA-09, SA-23, SA-24; F-097, F-208; R-109, R-111.

## Problem

I2C costs zero virtual time, `SPI.transfer` returns 0 silently (`libs.ts:779-790`), UART is a print sink, and the device list is closed. Library `begin()` calls attach a device by themselves (`libs.ts:1054, 1117, 1180-1181, 1209`), so a sketch can "talk" to a device that is not wired. Wiring errors therefore never show.

## Constraints

1. No silent stubs (R-109).
2. The 102 lesson references still pass with timing on.
3. A new device must be addable as data (F-097) without code.
4. Devices must work for both the interpreter and avr8js.

## Considered options

| Option | Verdict |
|---|---|
| A. Keep library-attached devices | Rejected: hides wiring faults |
| B. Buses as objects with timing, ACK/NACK, pull-ups, errors; devices from the netlist; devices as data plus builtin behaviours | Chosen |
| C. Run real driver code in a sandbox | Deferred until RS-15 (extension sandbox) passes |

## Decision

Define `I2cBus`, `SpiBus`, `UartLink` and a `BusPort` that returns a result or `NotModelled` (9.1). Charge time (`9 / speedHz` per I2C byte, `8 / hz` per SPI byte, `10 / baud` per UART byte). Errors exist: NACK, missing device, stuck bus, baud mismatch. `Wire.begin(sda, scl)` binds the bus to the nets on those GPIOs; in a Studio project devices come only from the netlist. A device is a JSON descriptor of registers, inputs and `builtin` behaviours (9.2), evaluated by a small expression interpreter that never calls JavaScript. An unmodelled call raises the cause `bus-device-not-modelled`; `stubPolicy: 'fail'` is the default. First release: MPU-6050, PCA9685, SSD1306, LCD1602, generic ACK-only, and the BME280 of 9.2.1. 1-Wire, CAN, I2S, USB and BLE are "not modelled yet".

## Technical justification

The swapped-bus case of the BRIEF 30 walkthrough can only be detected if the device answers through the wired nets. RS-06 found that MicroPython's `I2C.scan()` sends zero-length writes that only a bus with pull-ups and a slave pulling SDA low in the ACK slot can answer.

## Performance data

Lesson loops are tens of milliseconds long, so charging 90 microseconds per I2C byte at 100 kHz changes little; SA-09 confirms that 102 of 102 references still pass.

## Cost implications

Each first-release device needs a descriptor with datasheet citations in the registry (ADR-0310).

## Licensing

Datasheet facts are cited, not copied. No third-party driver code is vendored.

## Security implications

Expression evaluation is a closed grammar (arithmetic, `min`, `max`, `clamp`, `round`, `abs`), so a device descriptor from a shared pack cannot execute code.

## Reversibility

Low risk; the lesson worlds keep `deviceSource: 'library'` for projects without a netlist.

## Migration plan

SIM-2 fixes the SPI stub and turns on named bus diagnostics; SIM-5 brings buses, device data, pin binding and the BME280.

## Known limitations

Clock stretching, repeated start and arbitration are not modelled in the first release. Rise-time limits cite UM10204 (EXTERNAL knowledge) and need real values in the registry.
