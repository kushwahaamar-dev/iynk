// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { boardLoaders } from "@/content/index.generated";
import type { BoardContent } from "@/content/schema";
import { BOARD_IDS, PROFILES, resolvePin } from "@/lib/interp/profiles";
import type { BoardId, BoardProfile } from "@/lib/interp/profiles";
import { BOARD_PART_IDS, boardIdForPart, boardPartId } from "@/parts/boards";
import { builtinRegistry } from "@/parts/builtin";
import type { Descriptor } from "@/parts/descriptor";
import { buildBoardDescriptor } from "@/parts/testing/board-gen";

/** Boards whose component descriptor is not written yet. A board task removes its own name when it adds the descriptor. */
const NOT_YET_BOUND: readonly BoardId[] = [
  "nano",
  "uno-r4",
  "esp32-devkitc",
  "esp32-s3-devkitc-1",
  "nodemcu",
  "pico",
  "nucleo-f401re",
  "microbit-v2",
  "pi4-pi5",
  "basys3",
  "de10-lite",
];

const registry = builtinRegistry();
const descriptorOf = (id: BoardId): Descriptor | undefined => registry.latest(PROFILES[id].partId);
const BOUND = BOARD_IDS.filter((id) => descriptorOf(id));

const RESET_NAMES = new Set(["EN", "RST", "RESET"]);
const LANGUAGE_OF = { "arduino-cpp": "arduino", micropython: "python", python: "python", verilog: "verilog" } as Record<string, string>;

function numberOf(profile: BoardProfile, pin: Descriptor["pins"][number]): number | undefined {
  for (const ref of [pin.id, pin.designator ?? ""]) {
    const n = resolvePin(profile, ref);
    if (n !== undefined) return n;
  }
  const m = /^(?:D|GPIO|GP|IO|P)?(\d+)$/.exec(pin.id);
  return m ? Number(m[1]) : undefined;
}

describe("board part ids", () => {
  it("gives every profile a unique part id that boards.ts agrees with", () => {
    const ids = BOARD_IDS.map((id) => PROFILES[id].partId);
    expect(new Set(ids).size).toBe(BOARD_IDS.length);
    expect(Object.keys(BOARD_PART_IDS).sort()).toEqual([...BOARD_IDS].sort());
    for (const id of BOARD_IDS) {
      expect(boardPartId(id), id).toBe(PROFILES[id].partId);
      expect(boardIdForPart(PROFILES[id].partId), id).toBe(id);
    }
  });

  it("resolves nothing for an unknown board or part", () => {
    expect(boardPartId("toString")).toBeUndefined();
    expect(boardIdForPart("core.nothing")).toBeUndefined();
  });
});

describe("not yet bound boards", () => {
  it("lists exactly the boards without a descriptor", () => {
    expect(BOARD_IDS.filter((id) => !descriptorOf(id))).toEqual(NOT_YET_BOUND);
  });
});

describe.each(BOUND)("descriptor of %s agrees with its profile", (id) => {
  const profile = PROFILES[id];
  const descriptor = descriptorOf(id) as Descriptor;
  const pins = descriptor.pins;
  const numbers = new Map(pins.map((p) => [p, numberOf(profile, p)] as const));
  const reached = new Set([...numbers.values()]);
  const allowed = new Set([...profile.digitalPins, ...profile.analogPins]);

  it("names the board as a legacy id and matches the languages", () => {
    expect(descriptor.identity.legacy_ids ?? []).toContain(id);
    const languages = new Set((descriptor.software?.environments ?? []).map((e) => LANGUAGE_OF[e.language]));
    expect([...languages].sort()).toEqual([...profile.languages].sort());
  });

  it("reaches every digital pin", () => {
    for (const n of profile.digitalPins) expect(reached.has(n), `${id}: digital pin ${n} has no descriptor pin`).toBe(true);
  });

  it("resolves every digital descriptor pin into the profile", () => {
    for (const pin of pins) {
      if (pin.class === "bus" || !pin.type.startsWith("digital_") || RESET_NAMES.has(pin.id) || RESET_NAMES.has(pin.designator ?? "")) continue;
      const n = numbers.get(pin);
      expect(n !== undefined && allowed.has(n), `${id}: pin ${pin.id} resolves to ${n}`).toBe(true);
    }
  });

  it("reaches every alias, LED, button and I2C pin", () => {
    for (const [alias, n] of Object.entries(profile.aliases)) expect(reached.has(n), `${id}: alias ${alias} (${n})`).toBe(true);
    for (const led of profile.leds) expect(reached.has(led.pin), `${id}: LED ${led.name} (${led.pin})`).toBe(true);
    for (const button of profile.buttons) expect(reached.has(button.pin), `${id}: button ${button.name} (${button.pin})`).toBe(true);
    if (profile.i2c) {
      expect(reached.has(profile.i2c.sda), `${id}: sda`).toBe(true);
      expect(reached.has(profile.i2c.scl), `${id}: scl`).toBe(true);
    }
  });

  it("marks input-only pins", () => {
    for (const n of [...(profile.analogOnlyPins ?? []), ...(profile.inputOnlyPins ?? [])]) {
      const pin = pins.find((p) => numbers.get(p) === n);
      expect(pin?.note?.en, `${id}: pin ${n} needs an input-only note`).toMatch(/input only/i);
    }
  });

  it("carries every FPGA port at its width", () => {
    for (const port of profile.fpga?.ports ?? []) {
      const bits = pins.filter((p) => p.id === port.name || new RegExp(`^${port.name}\\d+$`).test(p.id));
      expect(bits.length, `${id}: port ${port.name}`).toBe(port.width);
    }
  });
});

describe("builder against the worked ESP32-DevKitC descriptor", () => {
  it("gives the same pin count, ground group and pin ids", async () => {
    const golden = JSON.parse(
      readFileSync(new URL("../../../docs/MASTER_PLAN/04_ARCHITECTURE/schemas/examples/components/esp32-devkitc.component.json", import.meta.url), "utf8"),
    ) as Descriptor;
    const load = boardLoaders["esp32-devkitc"];
    if (!load) throw new Error("no esp32-devkitc content loader");
    const board: BoardContent = (await load()).default;
    const draft = buildBoardDescriptor({
      id: board.id,
      maker: board.maker,
      model: golden.identity.model,
      languages: PROFILES["esp32-devkitc"].languages,
      pinout: board.pinout,
      logicV: board.logicVolts,
    });
    expect(draft.pins).toHaveLength(golden.pins.length);
    expect(draft.groups).toHaveLength(golden.groups?.length ?? 0);
    expect(draft.pins.map((p) => p.id).sort()).toEqual(golden.pins.map((p) => p.id).sort());
  });
});
