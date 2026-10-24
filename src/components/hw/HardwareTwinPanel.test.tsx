import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { LabStore } from "@/components/dock/types";
import type { WorldInput } from "@/content/schema";
import { I18nProvider } from "@/i18n/client";
import common from "@/i18n/messages/en/common.json";
import en from "@/i18n/messages/en/hw.json";
import { twinSession } from "@/lib/hw/session";
import { attachFakeUno, FakeSerialPort } from "@/lib/hw/testing";
import { HardwareTwinPanel } from "./HardwareTwinPanel";

const pot: WorldInput = {
  id: "pot",
  quantity: "voltage",
  device: { kind: "pot", ohms: 10_000 },
  pins: ["A0"],
  part: "R1",
  min: 0,
  max: 5,
  step: 0.01,
  default: 2.5,
  gesture: "knob",
  label: "lessons.pot-dimmer.world.pot",
};

const track = vi.hoisted(() => vi.fn());
vi.mock("@/lib/telemetry", () => ({ track }));

vi.mock("@/content/index.generated", () => ({
  loadBoard: async () => ({ lessons: [{ id: "pot-dimmer", world: { inputs: [pot], script: [] } }] }),
}));

function makeStore(state: unknown) {
  const listeners = new Set<() => void>();
  const dispatch = vi.fn();
  const store: LabStore = {
    getState: () => state,
    subscribe: (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    dispatch,
  };
  return {
    store,
    dispatch,
    set(next: unknown) {
      state = next;
      for (const l of listeners) l();
    },
  };
}

function renderPanel(store: LabStore, lab: "board" | "drone" = "board", itemId = "uno-r3") {
  return render(
    <I18nProvider locale="en" messages={common.client}>
      <HardwareTwinPanel lab={lab} itemId={itemId} store={store} figure={null} />
    </I18nProvider>,
  );
}

class FakeSerial extends EventTarget {
  next: FakeSerialPort | null = null;
  ports: FakeSerialPort[] = [];
  async requestPort() {
    if (!this.next) throw new DOMException("No port selected by the user.", "NotFoundError");
    this.ports = [this.next];
    return this.next;
  }
  async getPorts() {
    return this.ports;
  }
}

let serial: FakeSerial;

beforeEach(async () => {
  serial = new FakeSerial();
  Object.defineProperty(navigator, "serial", { value: serial, configurable: true });
  // The session outlives panels by design; forget the ports an earlier test granted.
  await twinSession.refreshKnown();
});

afterEach(async () => {
  await act(() => twinSession.disconnect());
  Reflect.deleteProperty(navigator, "serial");
});

describe("HardwareTwinPanel", () => {
  it("explains why other browsers can't connect", async () => {
    Reflect.deleteProperty(navigator, "serial");
    renderPanel(makeStore({}).store);
    expect(await screen.findByText(en.support.unsupportedTitle)).toBeTruthy();
    expect(screen.queryByRole("button", { name: en.connect })).toBeNull();
  });

  it("says when the lab has nothing to mirror", async () => {
    renderPanel(makeStore({}).store, "drone", "quad5");
    expect(await screen.findByText(en.lab.unsupportedTitle)).toBeTruthy();
  });

  it("connects, shows the board and mirrors the running sketch on the real pins", async () => {
    const port = new FakeSerialPort();
    attachFakeUno(port);
    serial.next = port;
    const lab = makeStore({
      board: "uno-r3",
      lesson: "pot-dimmer",
      run: { status: "running", id: 1, error: null, vt: 0 },
      pins: { D13: { mode: "output", value: 1, pwm: false } },
    });
    renderPanel(lab.store);

    fireEvent.click(await screen.findByRole("button", { name: en.connect }));
    expect(await screen.findByText(en.board.title)).toBeTruthy();
    expect(screen.getByText("Arduino Uno R3")).toBeTruthy();
    expect(screen.getByText("StandardFirmata 2.5")).toBeTruthy();
    expect(screen.getByRole("switch", { name: en.toggles.drive }).getAttribute("aria-checked")).toBe("true");
    expect(track).toHaveBeenCalledWith("hw.connect", { firmware: "StandardFirmata 2.5", board: "Arduino Uno R3", pins: 20 });

    const table = screen.getByRole("table");
    await waitFor(() => expect(within(table).getByRole("rowheader", { name: "D13" })).toBeTruthy());
    const row = within(table).getByRole("rowheader", { name: "D13" }).closest("tr")!;
    await waitFor(() => expect(within(row).getAllByText(en.pins.high)).toHaveLength(2));
    expect(within(row).getByText(en.status.mirrored)).toBeTruthy();
    expect(within(table).getByRole("rowheader", { name: "A0" })).toBeTruthy();
    expect(port.written.join(",")).toContain([0xf4, 13, 1, 0x91, 0x20, 0].join(","));

    // A real knob turn reaches the store as the lesson's world input.
    act(() => port.deviceSend([0xe0, 0x00, 0x04]));
    await waitFor(() => expect(lab.dispatch).toHaveBeenCalledWith({ type: "input/set", id: "pot", value: 2.5 }));

    fireEvent.click(screen.getByRole("switch", { name: en.toggles.drive }));
    await waitFor(() => expect(within(row).getByText(en.status.paused)).toBeTruthy());
  });

  it("reports an unplugged board and offers to connect again", async () => {
    const port = new FakeSerialPort();
    attachFakeUno(port);
    serial.next = port;
    renderPanel(makeStore({}).store);
    fireEvent.click(await screen.findByRole("button", { name: en.connect }));
    await screen.findByText(en.board.title);
    act(() => port.unplug());
    expect(await screen.findByText(en.errors.disconnected)).toBeTruthy();
    // Unplugged, the granted port isn't offered; plugged back in, it connects in one click.
    expect(await screen.findByRole("button", { name: en.connect })).toBeTruthy();
    port.connected = true;
    await act(() => twinSession.refreshKnown());
    expect(screen.getByRole("button", { name: "Connect Arduino Uno R3" })).toBeTruthy();
  });

  it("tells the learner to close the Serial Monitor when the port is busy", async () => {
    const port = new FakeSerialPort();
    port.openError = new DOMException("Failed to open serial port.", "NetworkError");
    serial.next = port;
    renderPanel(makeStore({}).store);
    fireEvent.click(await screen.findByRole("button", { name: en.connect }));
    expect(await screen.findByText(en.errors.busy)).toBeTruthy();
  });

  it("stays quiet when the chooser is closed without a board", async () => {
    renderPanel(makeStore({}).store);
    fireEvent.click(await screen.findByRole("button", { name: en.connect }));
    await act(async () => {});
    expect(screen.queryByText(en.errors.title)).toBeNull();
  });
});
