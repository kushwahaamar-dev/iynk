import type { BoardId, DroneId, RoboticsId } from "@/content/ids";
import { ROBOTICS } from "@/content/ids";
import type { DesignPick, DroneDesign } from "@/content/schema";
import type { OfferPartInput } from "./schema";
import type { OfferSource } from "./types";

// Parts lists ("bills of materials") for every item, each line mapped to a
// shopping query a store search understands. Drone lines come from the
// craft's design catalogue (src/content/drones/<id>.ts), robotics lines from
// the bench's board, modules and parts (src/content/ids.ts), board lines from
// a starter kit per board (cable types from docs/facts).

export type Slot = "batt" | "motor" | "prop";
export const SLOTS: readonly Slot[] = ["batt", "motor", "prop"];

/** How the panel names a line: a part id with a label in search.json, or literal product text. */
export type BomLabel = { part: BomPartId } | { literal: string };

export type BomLine = {
  key: string;
  query: string;
  /** Units needed. */
  qty: number;
  /** Units in one listing when its title doesn't say. */
  pack?: number;
  label: BomLabel;
  /** In the build as picked, or an alternative the optimiser may swap in. */
  inBuild: boolean;
  slot?: Slot;
  option?: string;
  /** The catalogue's price for the whole line (USD), used until a live price lands. */
  estimate?: number;
};

const LIGHT: OfferSource[] = ["google_shopping"];

/** The offers request for these lines: three stores for the build, Google Shopping for alternatives. */
export function offerParts(lines: readonly BomLine[]): OfferPartInput[] {
  return lines.map((line) => ({
    key: line.key,
    query: line.query,
    qty: line.qty,
    ...(line.pack ? { pack: line.pack } : {}),
    ...(line.inBuild ? {} : { sources: LIGHT }),
  }));
}

/* ---------- drones ---------- */

/** Fixed parts of every craft (ids as in its design catalogue) and the query that finds each. */
const DRONE_PARTS: Record<DroneId, Record<string, string>> = {
  quad5: {
    FRAME: "5 inch FPV freestyle frame 225mm carbon",
    ESC: "4-in-1 ESC 55A 30x30",
    FC: "F405 flight controller 30x30 Betaflight",
    CAM: "FPV analog camera 1200TVL",
    VTX: "5.8GHz FPV VTX 30x30",
    RX: "ExpressLRS 2.4GHz receiver",
    XT60: "XT60 pigtail 12AWG",
    TOP: "5 inch FPV frame top plate standoffs M3",
    STRAP: "LiPo battery strap 20x250mm",
  },
  whoop: {
    FRAME: "65mm tiny whoop frame",
    FC: "1S whoop AIO flight controller ELRS",
    CAM: "whoop nano FPV camera",
    VTX: "tiny whoop 5.8GHz VTX 25mW",
    RX: "ExpressLRS nano receiver",
    TOP: "tiny whoop canopy 65mm",
    SCREWS: "M1.4 whoop frame screws",
  },
  cinewhoop: {
    FRAME: "3 inch cinewhoop frame",
    DUCTS: "3 inch cinewhoop duct guards",
    ESC: "4-in-1 ESC 20x20 35A",
    FC: "F405 flight controller 20x20",
    VTX: "5.8GHz FPV VTX 20x20",
    RX: "ExpressLRS 2.4GHz receiver",
    XT60: "XT60 pigtail 14AWG",
    TOP: "cinewhoop top plate",
    STRAP: "LiPo battery strap 15x200mm",
    GOPRO: "GoPro mount TPU cinewhoop",
  },
  longrange: {
    FRAME: "7 inch long range FPV frame",
    ESC: "4-in-1 ESC 45A 30x30",
    FC: "F405 flight controller 30x30 Betaflight",
    CAM: "FPV analog camera 1200TVL",
    VTX: "5.8GHz FPV VTX 1W",
    RX: "ExpressLRS 900MHz receiver",
    GPS: "M10 GPS module FPV",
    XT60: "XT60 pigtail 12AWG",
    TOP: "7 inch FPV frame top plate",
    STRAP: "LiPo battery strap 20x250mm",
  },
  racer: {
    FRAME: "5 inch FPV racing frame",
    ESC: "4-in-1 ESC 45A 30x30",
    FC: "F722 flight controller 30x30",
    CAM: "FPV racing camera low latency",
    VTX: "5.8GHz FPV racing VTX",
    RX: "ExpressLRS 2.4GHz receiver",
    LED: "FPV race LED strip WS2812",
    XT60: "XT60 pigtail 12AWG",
    TOP: "5 inch FPV frame top plate",
    STRAP: "LiPo battery strap 20x250mm",
  },
  gpscam: {
    FRAME: "F450 quadcopter frame",
    GEAR: "F450 landing gear",
    ESC: "30A ESC quadcopter 4pcs",
    XT60: "XT60 connector pair",
    FC: "Pixhawk flight controller ArduPilot",
    GPS: "M8N GPS module Pixhawk",
    TELEM: "SiK telemetry radio 915MHz",
    RX: "RC receiver SBUS",
    GIMBAL: "2 axis brushless gimbal GoPro",
    TOP: "quadcopter top plate carbon",
    STRAP: "LiPo battery strap 20x300mm",
  },
  delivery: {
    FRAME: "heavy lift quadcopter frame 700mm",
    ESC: "40A ESC 6S heavy lift drone",
    FC: "Pixhawk 6C flight controller",
    COMP: "Raspberry Pi 5 8GB",
    DEPTH: "stereo depth camera robotics",
    GPS: "M9N GPS module drone",
    LTE: "4G LTE USB modem",
    RX: "RC receiver SBUS",
    TEL: "SiK telemetry radio 915MHz",
    XT60: "XT60 connector pair",
    TOP: "drone top plate carbon",
    CARGO: "drone payload release mechanism",
    PARCEL: "drone delivery parcel box",
  },
  agrihex: {
    FRAME: "agricultural spraying drone frame hexacopter",
    SKIDS: "agricultural drone landing skid",
    ESC: "agricultural drone ESC 80A",
    FC: "agricultural drone flight controller",
    RTK: "RTK GPS module drone",
    RADAR: "agricultural drone obstacle avoidance radar",
    RX: "RC receiver SBUS",
    XT60: "AS150 anti spark connector",
    TANK: "agricultural drone spray tank 10L",
    PUMP: "agricultural drone brushless water pump",
    BOOM: "agricultural drone spray nozzle",
  },
  wing: {
    FRAME: "FPV flying wing EPP 900mm",
    ESC: "40A ESC BEC airplane",
    FC: "INAV flight controller wing F405",
    GPS: "M10 GPS module",
    CAM: "FPV analog camera",
    VTX: "5.8GHz FPV VTX",
    RX: "ExpressLRS 2.4GHz receiver",
    SERVOS: "9g metal gear servo 2pcs",
    XT60: "XT60 connector pair",
    TOP: "flying wing hatch cover",
    WIRES: "silicone wire 22AWG",
  },
  vtol: {
    FRAME: "VTOL RC plane fuselage",
    WING: "VTOL RC plane wing",
    TAIL: "RC plane carbon tail boom",
    TILT: "VTOL tilt servo mechanism",
    ESC: "40A ESC BEC",
    FC: "ArduPilot flight controller H743",
    GPS: "M10 GPS module",
    ARSPD: "airspeed sensor pitot tube",
    CAM: "FPV analog camera",
    XT60: "XT60 connector pair",
  },
  swarm: {
    FRAME: "Crazyflie 2.1 nano quadcopter",
    FLOW: "Crazyflie Flow deck v2",
    DECKL: "Crazyflie LED ring deck",
    HDR: "Crazyflie long pin headers",
    RADIO: "Crazyradio 2.0",
    STRAP: "nano quadcopter battery strap",
  },
  tricopter: {
    FRAME: "tricopter frame",
    ESC: "4-in-1 ESC 45A 30x30",
    FC: "F405 flight controller 30x30 Betaflight",
    TAILSERVO: "tricopter tail servo metal gear",
    CAM: "FPV analog camera",
    VTX: "5.8GHz FPV VTX",
    RX: "ExpressLRS 2.4GHz receiver",
    XT60: "XT60 pigtail 12AWG",
    TOP: "tricopter top plate",
    STRAP: "LiPo battery strap 20x250mm",
  },
  octo: {
    FRAME: "octocopter frame heavy lift",
    ESC: "80A ESC heavy lift 12S",
    FC: "Pixhawk flight controller ArduPilot",
    GPS: "RTK GPS module drone",
    XT60: "XT90 anti spark connector",
    RX: "RC receiver SBUS",
    GEAR: "heavy lift drone landing gear",
    GIMBAL: "3 axis camera gimbal drone",
    CAM: "drone mapping camera",
    TOP: "drone top plate carbon",
  },
};

/** Drone part ids that have a label in search.json ("part.<id>"). */
export const DRONE_PART_IDS = [
  "FRAME", "ESC", "FC", "CAM", "VTX", "RX", "XT60", "TOP", "STRAP", "SCREWS", "DUCTS", "GOPRO", "GPS", "LED",
  "GEAR", "TELEM", "GIMBAL", "COMP", "DEPTH", "LTE", "TEL", "CARGO", "PARCEL", "SKIDS", "RTK", "RADAR", "TANK",
  "PUMP", "BOOM", "SERVOS", "WIRES", "WING", "TAIL", "TILT", "ARSPD", "FLOW", "DECKL", "HDR", "RADIO", "TAILSERVO",
] as const;

const isDronePart = (id: string): id is (typeof DRONE_PART_IDS)[number] => (DRONE_PART_IDS as readonly string[]).includes(id);

/** "6S 1100 mAh LiPo (race)" -> "6S 1100 mAh LiPo": notes in brackets don't help a store search. */
const plain = (label: string) => label.replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();

function batteryLine(label: string, liion: boolean): { query: string; qty: number } {
  // "2 x 6S 16000 mAh in series (12S)" is two 6S packs.
  const count = /^(\d+)\s*x\s+/i.exec(label);
  const pack = plain(label.replace(/^(\d+)\s*x\s+/i, "")).replace(/\bin series\b/i, "").trim();
  const chemistry = /li-?ion|lipo|smart pack/i.test(pack) ? "" : liion ? " Li-ion pack" : " LiPo";
  return { query: `${pack}${chemistry} battery`.replace(/\s+/g, " "), qty: count ? Number(count[1]) : 1 };
}

function motorQuery(label: string): string {
  const name = plain(label);
  return /coreless/i.test(name) ? `${name} motor` : `${name} brushless motor`;
}

/**
 * The drone's parts list for a pick: every fixed part, then every battery,
 * motor and prop option (the picked ones are in the build; the rest are
 * alternatives the optimiser prices too).
 */
export function droneBom(id: DroneId, design: DroneDesign, pick: DesignPick): BomLine[] {
  const queries = DRONE_PARTS[id];
  const n = design.model.motors;
  const lines: BomLine[] = design.fixed.map((part) => ({
    key: `fixed:${part.id}`,
    query: queries[part.id] ?? `${id} drone ${part.id.toLowerCase()}`,
    qty: 1,
    label: isDronePart(part.id) ? { part: part.id } : { literal: part.id },
    inBuild: true,
    estimate: part.price,
  }));

  for (const [option, b] of Object.entries(design.batts)) {
    const { query, qty } = batteryLine(b.label, b.liion === true);
    lines.push({ key: `batt:${option}`, query, qty, label: { literal: b.label }, inBuild: option === pick.batt, slot: "batt", option, estimate: b.price });
  }
  for (const [option, m] of Object.entries(design.motors)) {
    lines.push({
      key: `motor:${option}`,
      query: motorQuery(m.label),
      qty: n,
      label: { literal: m.label },
      inBuild: option === pick.motor,
      slot: "motor",
      option,
      estimate: m.price * n,
    });
  }
  const pairs = design.model.propPrice === "pair";
  for (const [option, p] of Object.entries(design.props)) {
    lines.push({
      key: `prop:${option}`,
      query: `${plain(p.label)} propellers`,
      qty: n,
      pack: pairs ? 2 : 1,
      label: { literal: p.label },
      inBuild: option === pick.prop,
      slot: "prop",
      option,
      estimate: p.price * (pairs ? Math.ceil(n / 2) : n),
    });
  }
  return lines;
}


/* ---------- robotics and boards ---------- */

/** Modules, parts and kit items that have a label in search.json ("part.<id>") and a query. */
const PART_QUERIES = {
  led: "5mm LED assortment kit",
  "rgb-led": "RGB LED common cathode 5mm",
  resistor: "resistor assortment kit 1/4W",
  "push-button": "6x6mm tactile push button",
  potentiometer: "10k potentiometer breadboard",
  ldr: "photoresistor LDR GL5528",
  "piezo-buzzer": "passive piezo buzzer 5V",
  tip120: "TIP120 Darlington transistor",
  "npn-2n2222": "2N2222 NPN transistor",
  "diode-1n4007": "1N4007 diode",
  "dc-motor": "130 DC hobby motor 3-6V",
  fan: "5V DC fan 40mm",
  tmp36: "TMP36 temperature sensor",
  fsr402: "FSR402 force sensitive resistor",
  "servo-sg90": "SG90 micro servo",
  "stepper-28byj48": "28BYJ-48 stepper motor",
  nema17: "NEMA 17 stepper motor",
  "tt-motor": "TT gear motor 3-6V",
  "lipo-2s": "2S 7.4V LiPo battery",
  "aa-holder-4": "4 AA battery holder",
  multimeter: "digital multimeter",
  tb6612fng: "TB6612FNG motor driver module",
  l298n: "L298N motor driver module",
  a4988: "A4988 stepper driver module",
  pca9685: "PCA9685 16 channel servo driver",
  mpu6050: "MPU6050 GY-521 module",
  "hc-sr04": "HC-SR04 ultrasonic sensor",
  "qtr-8rc": "Pololu QTR-8RC reflectance sensor array",
  lm2596: "LM2596 buck converter module",
  uln2003: "ULN2003 stepper driver board",
  ssd1306: "SSD1306 0.96 OLED I2C",
  "traffic-light": "traffic light LED module",
  "soil-moisture": "capacitive soil moisture sensor",
  breadboard: "830 point solderless breadboard",
  jumpers: "dupont jumper wires male to male",
  "usb-b": "USB A to B cable",
  "usb-mini-b": "USB A to Mini-B cable",
  "usb-micro-b": "USB A to Micro-B data cable",
  "usb-c": "USB-C data cable",
  "pi-psu": "Raspberry Pi 27W USB-C power supply",
  "micro-sd": "32GB microSD card A1",
  "aaa-pack": "micro:bit battery holder 2xAAA",
} as const;

export type BomPartId = keyof typeof PART_QUERIES | (typeof DRONE_PART_IDS)[number];

/** Every id the panel needs a "part.<id>" label for (search.json is checked against it). */
export const LABELLED_PARTS: readonly BomPartId[] = [...(Object.keys(PART_QUERIES) as (keyof typeof PART_QUERIES)[]), ...DRONE_PART_IDS];

type Kit = { board: string; cable: keyof typeof PART_QUERIES; extras: (keyof typeof PART_QUERIES)[] };

const STARTER: (keyof typeof PART_QUERIES)[] = ["breadboard", "jumpers", "led", "resistor"];

/** Each board's product name (literal, as the maker sells it) and the cable and parts its lessons need. */
const BOARD_KITS: Record<BoardId, Kit> = {
  "uno-r3": { board: "Arduino Uno R3", cable: "usb-b", extras: STARTER },
  nano: { board: "Arduino Nano", cable: "usb-mini-b", extras: STARTER },
  "uno-r4": { board: "Arduino UNO R4 WiFi", cable: "usb-c", extras: STARTER },
  "esp32-devkitc": { board: "ESP32-DevKitC V4", cable: "usb-micro-b", extras: STARTER },
  "esp32-s3-devkitc-1": { board: "ESP32-S3-DevKitC-1", cable: "usb-micro-b", extras: STARTER },
  nodemcu: { board: "NodeMCU ESP8266 V3", cable: "usb-micro-b", extras: STARTER },
  pico: { board: "Raspberry Pi Pico", cable: "usb-micro-b", extras: STARTER },
  "nucleo-f401re": { board: "STM32 NUCLEO-F401RE", cable: "usb-mini-b", extras: STARTER },
  "microbit-v2": { board: "BBC micro:bit V2", cable: "usb-micro-b", extras: ["aaa-pack"] },
  "pi4-pi5": { board: "Raspberry Pi 5 4GB", cable: "pi-psu", extras: ["micro-sd", ...STARTER] },
  basys3: { board: "Digilent Basys 3 FPGA board", cable: "usb-micro-b", extras: [] },
  "de10-lite": { board: "Terasic DE10-Lite FPGA board", cable: "usb-b", extras: [] },
};

const kitLine = (id: keyof typeof PART_QUERIES): BomLine => ({
  key: `part:${id}`,
  query: PART_QUERIES[id],
  qty: 1,
  label: { part: id },
  inBuild: true,
});

const boardLine = (board: BoardId, variant?: string): BomLine => {
  const kit = BOARD_KITS[board];
  const name = board === "pi4-pi5" && variant === "pi4" ? "Raspberry Pi 4 Model B 4GB" : kit.board;
  return { key: `board:${board}`, query: name, qty: 1, label: { literal: name }, inBuild: true };
};

/** The board's product name, literal ("Arduino Uno R3"). */
export const boardName = (id: BoardId): string => BOARD_KITS[id].board;

export function boardBom(id: BoardId): BomLine[] {
  const kit = BOARD_KITS[id];
  return [boardLine(id), kitLine(kit.cable), ...kit.extras.map(kitLine)];
}

export function roboticsBom(id: RoboticsId): BomLine[] {
  const meta = ROBOTICS[id];
  const lines: BomLine[] = [];
  if (meta.board) {
    const kit = BOARD_KITS[meta.board];
    lines.push(boardLine(meta.board, meta.boardVariant), kitLine(kit.cable));
  }
  for (const id of [...meta.modules, ...meta.parts]) lines.push(kitLine(id));
  if (meta.board) lines.push(kitLine("breadboard"), kitLine("jumpers"));
  // A part listed twice (a module that is also the bench) is bought once.
  return lines.filter((line, i) => lines.findIndex((l) => l.key === line.key) === i);
}
