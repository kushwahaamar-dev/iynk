import { describe, expect, it, vi } from "vitest";
import { FirmataBoard, HwError } from "./board";
import { PinMode } from "./firmata";
import { attachFakeUno, FakeSerialPort, firmwareReport } from "./testing";

const fast = { quietMs: 30, identifyMs: 200, replyMs: 100 };
const hex = (bytes: number[]) => bytes.map((b) => b.toString(16).padStart(2, "0")).join(" ");
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

async function connectedUno(options: { bootReport?: boolean } = {}) {
  const port = new FakeSerialPort();
  attachFakeUno(port, options);
  const board = await FirmataBoard.connect(port, fast);
  port.takeWritten();
  return { port, board };
}

describe("FirmataBoard.connect", () => {
  it("listens for the boot reports, then asks for capabilities and the analog mapping", async () => {
    const port = new FakeSerialPort();
    attachFakeUno(port);
    const board = await FirmataBoard.connect(port, fast);
    expect(port.baudRate).toBe(57600);
    expect(hex(port.written)).toBe("f0 6b f7 f0 69 f7");
    const snap = board.getSnapshot();
    expect(snap.status).toBe("ready");
    expect(snap.firmware).toEqual({ name: "StandardFirmata", major: 2, minor: 5 });
    expect(snap.protocol).toEqual({ major: 2, minor: 5 });
    expect(snap.usb).toEqual({ usbVendorId: 0x2341, usbProductId: 0x0043 });
    expect(snap.pins).toHaveLength(20);
    expect(board.pin(14)?.analogChannel).toBe(0);
    expect(board.pin(13)?.analogChannel).toBeNull();
    expect(board.pin(9)?.modes.get(PinMode.PWM)).toBe(8);
    await board.close();
  });

  it("asks for the version and firmware when the board stays quiet (no auto-reset)", async () => {
    const port = new FakeSerialPort();
    attachFakeUno(port, { bootReport: false });
    const board = await FirmataBoard.connect(port, fast);
    expect(hex(port.written)).toBe("f9 f0 79 f7 f0 6b f7 f0 69 f7");
    expect(board.getSnapshot().firmware?.name).toBe("StandardFirmata");
    await board.close();
  });

  it("gives up with no-firmata and releases the port when another sketch is running", async () => {
    const port = new FakeSerialPort();
    port.onHostWrite = () => port.deviceSend([0x48, 0x69, 0x0a]); // "Hi\n" from some other sketch
    const error = await FirmataBoard.connect(port, fast).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(HwError);
    expect((error as HwError).code).toBe("no-firmata");
    expect(port.isOpen).toBe(false);
  });

  it("reports a busy port (the Arduino IDE serial monitor holds it)", async () => {
    const port = new FakeSerialPort();
    port.openError = new DOMException("Failed to open serial port.", "NetworkError");
    const error = await FirmataBoard.connect(port, fast).catch((e: unknown) => e);
    expect((error as HwError).code).toBe("busy");
  });

  it("fails with disconnected when the cable is pulled during the handshake", async () => {
    const port = new FakeSerialPort();
    const pending = FirmataBoard.connect(port, fast);
    await tick();
    port.unplug();
    const error = await pending.catch((e: unknown) => e);
    expect((error as HwError).code).toBe("disconnected");
  });
});

describe("FirmataBoard writes", () => {
  it("sets modes once and writes whole ports with only OUTPUT pins high", async () => {
    const { port, board } = await connectedUno();
    board.setMode(13, PinMode.OUTPUT);
    board.setMode(13, PinMode.OUTPUT);
    board.setMode(12, PinMode.OUTPUT);
    board.setMode(8, PinMode.INPUT);
    board.digitalWrite(13, 1);
    board.digitalWrite(13, 1);
    board.digitalWrite(12, 1);
    board.digitalWrite(8, 1); // an input: refused, so its pull-up never switches on
    board.digitalWrite(13, 0);
    await tick();
    expect(hex(port.takeWritten())).toBe("f4 0d 01 f4 0c 01 f4 08 00 91 20 00 91 30 00 91 10 00");
    expect(board.pin(12)?.value).toBe(1);
    await board.close();
  });

  it("a mode change forgets the last port value, so the next write always goes out", async () => {
    const { port, board } = await connectedUno();
    board.setMode(11, PinMode.OUTPUT);
    board.digitalWrite(11, 1);
    board.setMode(11, PinMode.PWM); // the board drops the pin to 0 here
    board.setMode(11, PinMode.OUTPUT);
    board.digitalWrite(11, 1);
    await tick();
    expect(hex(port.takeWritten())).toBe("f4 0b 01 91 08 00 f4 0b 03 f4 0b 01 91 08 00");
    await board.close();
  });

  it("PWM and servo writes", async () => {
    const { port, board } = await connectedUno();
    board.setMode(9, PinMode.PWM);
    board.analogWrite(9, 127.6);
    board.analogWrite(9, 128);
    board.servoAttach(10, 544, 2400);
    board.analogWrite(10, 1500);
    board.analogWrite(13, 10); // not a PWM or servo pin: ignored
    await tick();
    expect(hex(port.takeWritten())).toBe("f4 09 03 e9 00 01 f0 70 0a 20 04 60 12 f7 ea 5c 0b");
    await board.close();
  });

  it("reporting toggles and the sampling interval", async () => {
    const { port, board } = await connectedUno();
    board.reportAnalog(14, true);
    board.reportAnalog(13, true); // no analog channel: ignored
    board.reportDigitalPort(0, true);
    board.setSamplingInterval(50);
    await tick();
    expect(hex(port.takeWritten())).toBe("c0 01 d0 01 f0 7a 32 00 f7");
    await board.close();
  });
});

describe("FirmataBoard reports", () => {
  it("digital port reports reach input listeners per pin, only on change", async () => {
    const { port, board } = await connectedUno();
    board.setMode(2, PinMode.INPUT);
    board.setMode(3, PinMode.PULLUP);
    const seen: [number, number][] = [];
    board.onInput((pin, value) => seen.push([pin, value]));
    port.deviceSend([0x90, 0b0000_1100, 0x00]); // pins 2 and 3 high
    port.deviceSend([0x90, 0b0000_1000, 0x00]); // pin 2 low
    port.deviceSend([0x90, 0b0000_1000, 0x00]); // no change
    await tick();
    expect(seen).toEqual([
      [2, 1],
      [3, 1],
      [2, 0],
    ]);
    expect(board.pin(3)?.value).toBe(1);
    await board.close();
  });

  it("analog reports arrive by channel and land on the mapped pin", async () => {
    const { port, board } = await connectedUno();
    board.setMode(14, PinMode.ANALOG);
    board.setMode(15, PinMode.OUTPUT);
    const listener = vi.fn();
    board.onInput(listener);
    port.deviceSend([0xe0, 0x00, 0x04, 0xe1, 0x10, 0x00]); // A0 = 512; A1 is not in ANALOG mode
    await tick();
    expect(listener).toHaveBeenCalledExactlyOnceWith(14, 512);
    await board.close();
  });

  it("notices the board resetting itself (RESET button) and forgets every pin mode", async () => {
    const { port, board } = await connectedUno();
    board.setMode(13, PinMode.OUTPUT);
    const reset = vi.fn();
    board.onReset(reset);
    port.deviceSend([0xf9, 2, 5, ...firmwareReport()]);
    await tick();
    expect(reset).toHaveBeenCalledOnce();
    expect(board.pin(13)?.mode).toBeNull();
    await board.close();
  });

  it("keeps the last firmware string message as a note", async () => {
    const { port, board } = await connectedUno();
    port.deviceSend([0xf0, 0x71, 0x4f, 0x00, 0x4b, 0x00, 0xf7]);
    await tick();
    expect(board.getSnapshot().note).toBe("OK");
    await board.close();
  });

  it("survives a framing error and keeps reading", async () => {
    const { port, board } = await connectedUno();
    board.setMode(14, PinMode.ANALOG);
    port.lineError("FramingError");
    await tick();
    port.deviceSend([0xe0, 0x7f, 0x07]);
    await tick();
    expect(board.getSnapshot().status).toBe("ready");
    expect(board.pin(14)?.value).toBe(1023);
    await board.close();
  });
});

describe("FirmataBoard disconnects", () => {
  it("an unplugged cable ends the link once, notifies, and turns writes into no-ops", async () => {
    const { port, board } = await connectedUno();
    const listener = vi.fn();
    board.subscribe(listener);
    port.unplug();
    await tick();
    expect(board.getSnapshot().status).toBe("disconnected");
    expect(listener).toHaveBeenCalled();
    board.setMode(13, PinMode.OUTPUT);
    board.digitalWrite(13, 1);
    await tick();
    expect(port.takeWritten()).toEqual([]);
    await board.close();
  });

  it("close() releases both locks and closes the port", async () => {
    const { port, board } = await connectedUno();
    await board.close();
    expect(board.getSnapshot().status).toBe("closed");
    expect(port.isOpen).toBe(false);
    expect(port.readable).toBeNull();
    await board.close();
  });

  it("the port can be opened again after close()", async () => {
    const { port, board } = await connectedUno();
    await board.close();
    const again = await FirmataBoard.connect(port, fast);
    expect(again.getSnapshot().status).toBe("ready");
    await again.close();
  });
});
