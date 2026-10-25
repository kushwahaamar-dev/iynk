# Hardware twin (HX-CONTRACT H9, Best Hardware Hack)

Code running in the iynk sim drives a real Arduino Uno over Web Serial, and the real board's inputs drive the
sim. The board runs the stock StandardFirmata sketch, so nothing custom is ever flashed: any Uno, Nano or Uno R4
from the hardware lab works.

Owner: hx:hw. Code: `src/lib/hw/**` (transport, codec, board client, bridge, session), `src/components/hw/**`
(the LabDock "Hardware" panel), strings `src/i18n/messages/*/hw.json`.

## 1. The demo in 60 seconds

1. Flash StandardFirmata once (section 2) and plug the Uno in.
2. Open a Board Lab lesson for the Uno R3, open the Hardware tab of the LabDock, press **Connect a board** and pick
   the Uno in Chrome's chooser. The board resets (the L LED blinks twice, then five times: that is Firmata
   reporting version 2.5) and the panel shows "Arduino Uno R3, StandardFirmata 2.5, 20 pins, 6 analog inputs".
3. Run Blink in the lab. The virtual LED and the real LED on pin 13 blink together.
4. Turn the real potentiometer on A0. The lesson's knob in the inspector and in the 3D figure turns with it.

After a page reload the button reads **Connect Arduino Uno R3** and skips the chooser (the browser remembers the
permission).

## 2. Flashing StandardFirmata

1. Install the Arduino IDE (2.x) from arduino.cc.
2. Plug the Uno in. Choose **Tools › Board › Arduino AVR Boards › Arduino Uno** and the port under **Tools › Port**.
3. Open **File › Examples › Firmata › StandardFirmata**. If Firmata isn't listed, install it with
   **Tools › Manage Libraries…**, search "Firmata", install the library by Firmata Developers, then reopen the menu.
4. Press **Upload** and wait for "Done uploading".
5. Close the IDE's **Serial Monitor**: a port can only be open in one program at a time.

StandardFirmata talks at **57600 baud**, which is what the twin opens the port with. StandardFirmataPlus and
ConfigurableFirmata also work for digital, PWM, servo and analog; other sketches are detected and refused with
"The board didn't answer in Firmata".

## 3. Demo wiring

| Part | Wiring | Notes |
|---|---|---|
| LED | pin 13 → 220 Ω resistor → LED long leg (anode); LED short leg → GND | Or just watch the on-board L LED, which is also on pin 13. Never wire an LED without the resistor. |
| Potentiometer (10 kΩ) | outer legs to 5V and GND, middle leg (wiper) to A0 | Gives 0–5 V on A0, read as 0–1023. |
| Button (optional) | one side to D2, other side to GND | For lessons that use `INPUT_PULLUP` (the twin enables the pull-up). For lessons with an external pull-down, wire the button to 5V and a 10 kΩ resistor from D2 to GND, exactly as the lesson's circuit shows. |

Wire the real board the way the lesson's circuit is drawn: the twin maps pins by number (D13 is D13, A0 is pin 14).

## 4. How it works

```
lab store (state.run.pins, world inputs) ──▶ TwinSim adapter (sim.ts)
                                                 │
            TwinSession (session.ts, one per tab, survives tab and lesson switches)
                                                 │
   TwinBridge (twin.ts): sim pins ─diff, ≤ 30 Hz─▶ Firmata writes
                         real inputs ─≤ 10 Hz analog / 25 ms digital─▶ dispatch({type:'world/input'})
                                                 │
   FirmataBoard (board.ts): handshake, pin state, port writes ◀▶ FirmataParser / encode (firmata.ts)
                                                 │
   SerialTransport (serial.ts): Web Serial at 57600, read loop, writes, disconnects
```

- **Handshake.** Opening the port asserts DTR, which resets an Uno. StandardFirmata then sends its protocol
  version (`F9 02 05`) and firmware report (`F0 79 02 05 "StandardFirmata.ino" F7`) after its boot blink. The
  client listens for 3 s; if the board stays quiet (no auto-reset, or a Nano clone that was already running) it
  sends `F9` and `F0 79 F7` itself, and gives up after 8 s with "no-firmata". It then sends the capability query
  (`F0 6B F7`) and the analog-mapping query (`F0 69 F7`) and keeps the per-pin modes, resolutions and channels.
- **Outputs.** Digital outputs go out as whole-port messages (`0x90|port, bits 0-6, bit 7`) that only ever carry
  a 1 for pins in OUTPUT mode: StandardFirmata turns the pull-up on for an INPUT pin whose bit is 1. PWM duty is
  `analogWrite` (`0xE0|pin, LSB, MSB`, 8-bit on an Uno; EXTENDED_ANALOG `F0 6F` above pin 15). Servos get
  `SERVO_CONFIG` (`F0 70 pin min max F7`, 544–2400 µs), which also sets SERVO mode, then the pulse width in µs
  as an analog write (the Servo library treats values ≥ 544 as microseconds). Only changes are sent, at most
  30 times a second, the rate the figure gets `set {pins}`.
- **Inputs.** Lesson inputs on analog pins are put in ANALOG mode with `REPORT_ANALOG` on, sampled every 40 ms
  (`SAMPLING_INTERVAL`); digital ones in INPUT or PULLUP mode with `REPORT_DIGITAL` for their port. A reading
  becomes the lesson's own world-input value by inverting the device model: potentiometer = fraction of the
  range, linear sensor = its volts-to-value line, TMP36 = (V − 0.5) × 100 °C, button = pressed when the level
  equals the pressed level of its pull, switch = level. It reaches the lab as the same action the inspector
  slider dispatches, so rooms and replays see it. Analog goes out at most every 100 ms, and a change under 3
  counts waits 400 ms to settle, so noise doesn't flood the store; digital edges go out at most every 25 ms.
- **Session.** The connection lives in `twinSession`, not in the panel, so switching LabDock tabs or lessons
  doesn't drop it. Each mounted panel attaches its lab; with none attached the board idles safely.

## 5. Safety guard

- On connect every free digital pin is switched to INPUT (high impedance). StandardFirmata boots them as
  OUTPUT LOW, which would short a button wired to 5V.
- Pins the lesson wires to a button or sensor (`lesson.world.inputs[].pins`) are only ever read. If the sketch
  writes to one, the pin shows "input only" and the real pin stays an input.
- Pins 0 and 1 are the USB serial link Firmata itself uses and are never touched.
- Nothing is driven until the lesson's inputs have loaded, so the guard always knows them first.
- `tone()` stays in the sim (StandardFirmata has no tone). Pins the real board lacks show "not on this board".
- Turning "Drive the real board" off, stopping the run, leaving the page or disconnecting writes every driven
  pin LOW and returns it to INPUT. Unplugging the cable is safe at any time.
- The panel shows the board's per-pin limit from the board profile (40 mA absolute maximum on an Uno, 8 mA on an
  Uno R4) and says to use a 220 Ω–1 kΩ resistor with every LED and never to power motors, servos or relays
  from a pin.

## 6. Browser support

| Browser | Works |
|---|---|
| Chrome, Edge (89+), Opera (76+) on Windows, macOS, Linux, ChromeOS | Yes |
| Firefox | Only versions that ship Web Serial; the panel checks `navigator.serial`, not the browser name |
| Safari (macOS, iOS) | No |
| Chrome on Android | Recent versions expose Web Serial; wired USB boards are untested here |

Web Serial needs a secure context: `https://` or `http://localhost`. On a plain-http LAN address the panel says
"Needs a secure page". Browsers without the API get a short explanation; the rest of iynk is unaffected.

## 7. Troubleshooting

| Symptom | Fix |
|---|---|
| The chooser lists no board | Use a data USB cable (charge-only cables are common). The chooser only lists Arduino, CH340, FTDI and CP210x devices; older macOS and Windows need the CH340 driver for clone boards. On Linux, add yourself to the `dialout` group and log in again. |
| "The port is busy" | Close the Arduino IDE Serial Monitor or Serial Plotter, and any other tab or app (Cura, a terminal) holding the port. |
| "The board didn't answer in Firmata" | StandardFirmata isn't on the board (another sketch is running). Upload it (section 2). |
| The L LED blinks and the panel waits a few seconds | Normal: the board resets on connect and blinks its Firmata version before it answers. |
| "The board was unplugged" | Plug it back in and press **Connect** again; the permission is remembered. |
| The real LED doesn't light | Long leg to the resistor and pin 13, short leg to GND. "Drive the real board" must be on and the sketch running. |
| The real knob doesn't move the sim | "Real sensors into the sim" must be on, the pot's wiper must go to A0, and the lesson must have a potentiometer input on A0 (the pin table shows "sensor to sim"). |
| A pin shows "input only" | The lesson wires a button or sensor there, so the twin won't drive it. Check the sketch's pin numbers. |

## 8. Sources (read 2026-10-24)

- Firmata protocol 2.8.0, `protocol.md`: message types, sysex framing, capability and analog-mapping queries, pin
  state, sampling interval: https://github.com/firmata/protocol/blob/master/protocol.md
- Firmata servo feature, `servos.md`: SERVO_CONFIG and servo writes: https://github.com/firmata/protocol/blob/master/servos.md
- StandardFirmata 2.5 and the Firmata library (behaviour checked: boot reports from `Firmata.begin`, version blink,
  reset to OUTPUT/ANALOG, port writes enabling pull-ups on INPUT pins, analog reporting turned on by ANALOG mode,
  capability response layout): https://github.com/firmata/arduino (`examples/StandardFirmata/StandardFirmata.ino`,
  `Firmata.cpp`, `FirmataConstants.h`)
- Web Serial API specification (WICG): transient activation and `NotFoundError` for `requestPort`, `SerialOptions`
  defaults, recoverable read errors (`BufferOverrunError`, `BreakError`, `FramingError`, `ParityError`) versus the
  fatal `NetworkError` on disconnect, `disconnect` events that bubble: https://wicg.github.io/serial/
- MDN, Web Serial API (read loop that survives non-fatal errors, connect/disconnect events, secure context,
  `serial` permissions policy): https://developer.mozilla.org/en-US/docs/Web/API/Web_Serial_API
- MDN, `SerialPort.close()` (cancel the reader and release both locks first):
  https://developer.mozilla.org/en-US/docs/Web/API/SerialPort/close
- Browser support: https://caniuse.com/web-serial and the Chromium blink-dev "Intent to Ship: Web serial over
  Bluetooth on Android".

No third-party npm packages: the transport, codec and bridge are written for iynk against the documents above.

## 9. Tests

`npx vitest run src/lib/hw src/components/hw` (60 tests). The fake serial port in `src/lib/hw/testing.ts` is a
real `ReadableStream`/`WritableStream` pair with a StandardFirmata stand-in that answers like an Uno; the tests
cover every encoder and the streaming parser byte for byte, the handshake with and without boot reports, busy
ports, unplugging mid-handshake and mid-run, recoverable line errors, close and reopen, the bridge's rates, dead
band and safety guard, the panel's support states, the connect flow and the string parity of all six locales.

## 10. Open items

- The board lab store must expose `state.run.pins` and accept `{type: 'world/input', id, value}`
  (docs/requests/hx-hw.md). Until then the panel connects and shows the real board, and says "Run the sketch in
  the lab to drive the real board".
- Light-dependent dividers, force sensors and thermistors stay virtual: their device curves live in the
  interpreter, and real readings for them need its forward model to invert.
- I2C (optional in H9) is not implemented.
- Telemetry `hw.connect` (H8) can be sent once `src/lib/telemetry` lands.
