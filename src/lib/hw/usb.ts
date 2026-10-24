// Names for the USB ids a board reports through SerialPort.getInfo().
// Product names are literal; the panel translates the "adapter" wording.

import type { SerialPortInfo } from "./serial";

const BOARDS: Record<string, string> = {
  "2341:0043": "Arduino Uno R3",
  "2341:0001": "Arduino Uno",
  "2a03:0043": "Arduino Uno R3",
  "2341:0243": "Arduino Uno R3",
  "2341:0069": "Arduino Uno R4 Minima",
  "2341:1002": "Arduino Uno R4 WiFi",
  "2341:0010": "Arduino Mega 2560",
  "2341:0042": "Arduino Mega 2560 R3",
  "2341:0036": "Arduino Leonardo",
  "2341:8036": "Arduino Leonardo",
};

const ADAPTERS: Record<number, string> = {
  0x1a86: "CH340",
  0x0403: "FTDI",
  0x10c4: "CP210x",
};

/** Vendors offered in the port chooser: Arduino and the USB-serial chips on Uno and Nano clones. */
export const BOARD_VENDOR_IDS = [0x2341, 0x2a03, 0x1a86, 0x0403, 0x10c4] as const;

const hex4 = (n: number) => n.toString(16).padStart(4, "0");

export type UsbIdentity = { kind: "board"; name: string; id: string } | { kind: "adapter"; chip: string; id: string } | { kind: "unknown"; id: string | null };

export function identifyUsb(info: SerialPortInfo): UsbIdentity {
  const { usbVendorId: vid, usbProductId: pid } = info;
  if (vid === undefined || pid === undefined) return { kind: "unknown", id: null };
  const id = `${hex4(vid)}:${hex4(pid)}`;
  if (BOARDS[id]) return { kind: "board", name: BOARDS[id], id };
  if (ADAPTERS[vid]) return { kind: "adapter", chip: ADAPTERS[vid], id };
  return { kind: "unknown", id };
}
