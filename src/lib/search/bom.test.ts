import { describe, expect, it } from "vitest";
import { BOARD_IDS, ROBOTICS, ROBOTICS_IDS } from "@/content/ids";
import type { DroneDesign } from "@/content/schema";
import { offersInput } from "./schema";
import { boardBom, droneBom, offerParts, roboticsBom } from "./bom";

const design = {
  model: { motors: 8, propPrice: "pair" },
  fixed: [
    { id: "FRAME", g: 2000, price: 400, category: "Mechanical", name: "k" },
    { id: "GIMBAL", g: 900, price: 300, category: "Electrical", name: "k" },
    { id: "WINCH", g: 300, price: 80, category: "Mechanical", name: "k" },
  ],
  batts: {
    "12s16000": { cells: 12, mah: 16000, g: 4000, price: 580, label: "2 x 6S 16000 mAh in series (12S)" },
    li: { cells: 6, mah: 8000, g: 900, price: 70, liion: true, label: "6S2P Li-ion 8000 mAh" },
    plain: { cells: 6, mah: 5000, g: 700, price: 60, label: "6S 5000 mAh" },
  },
  motors: {
    "6010-170": { kv: 170, g: 230, price: 120, label: "6010 170KV" },
    coreless: { kv: 50000, g: 3, price: 4, label: "7x16 coreless (stock)" },
  },
  props: { "2055": { pf: 1, eff: 1, g: 60, price: 85, label: "20 x 5.5 carbon folding" } },
  default: { batt: "12s16000", motor: "6010-170", prop: "2055" },
  golden: [],
} as unknown as DroneDesign;

describe("droneBom", () => {
  const lines = droneBom("octo", design, design.default);

  it("lists every fixed part and every option once", () => {
    expect(lines.map((l) => l.key)).toEqual([
      "fixed:FRAME",
      "fixed:GIMBAL",
      "fixed:WINCH",
      "batt:12s16000",
      "batt:li",
      "batt:plain",
      "motor:6010-170",
      "motor:coreless",
      "prop:2055",
    ]);
  });

  it("writes store queries from the craft and the option labels", () => {
    const byKey = Object.fromEntries(lines.map((l) => [l.key, l]));
    expect(byKey["fixed:FRAME"]).toMatchObject({ query: "octocopter frame heavy lift", qty: 1, label: { part: "FRAME" }, estimate: 400 });
    // A part the query table doesn't know still gets a usable query and its literal id.
    expect(byKey["fixed:WINCH"]).toMatchObject({ query: "octo drone winch", label: { literal: "WINCH" } });
    expect(byKey["batt:12s16000"]).toMatchObject({ query: "6S 16000 mAh LiPo battery", qty: 2, estimate: 580 });
    expect(byKey["batt:li"].query).toBe("6S2P Li-ion 8000 mAh battery");
    expect(byKey["batt:plain"].query).toBe("6S 5000 mAh LiPo battery");
    expect(byKey["motor:6010-170"]).toMatchObject({ query: "6010 170KV brushless motor", qty: 8, estimate: 960 });
    expect(byKey["motor:coreless"].query).toBe("7x16 coreless motor");
    // Eight props priced per pair: four pairs.
    expect(byKey["prop:2055"]).toMatchObject({ query: "20 x 5.5 carbon folding propellers", qty: 8, pack: 2, estimate: 340 });
  });

  it("marks the picked options as the build and the rest as alternatives", () => {
    expect(lines.filter((l) => l.inBuild).map((l) => l.key)).toEqual([
      "fixed:FRAME",
      "fixed:GIMBAL",
      "fixed:WINCH",
      "batt:12s16000",
      "motor:6010-170",
      "prop:2055",
    ]);
  });

  it("asks three stores for the build and Google Shopping for alternatives", () => {
    const parts = offerParts(lines);
    expect(parts.find((p) => p.key === "batt:li")?.sources).toEqual(["google_shopping"]);
    expect(parts.find((p) => p.key === "batt:12s16000")?.sources).toBeUndefined();
    expect(offersInput.safeParse({ parts }).success).toBe(true);
  });
});

describe("robotics and board kits", () => {
  it("gives every bench a valid offers request", () => {
    for (const id of ROBOTICS_IDS) {
      const lines = roboticsBom(id);
      const keys = lines.map((l) => l.key);
      expect(new Set(keys).size, id).toBe(keys.length);
      expect(offersInput.safeParse({ parts: offerParts(lines) }).success, id).toBe(true);
      const meta = ROBOTICS[id];
      for (const part of [...meta.modules, ...meta.parts]) expect(keys, id).toContain(`part:${part}`);
      if (meta.board) expect(keys[0]).toBe(`board:${meta.board}`);
    }
  });

  it("names the Pi 5 on the ROS 2 bench", () => {
    expect(roboticsBom("pi5-ros2")[0]).toMatchObject({ query: "Raspberry Pi 5 4GB", label: { literal: "Raspberry Pi 5 4GB" } });
  });

  it("gives every board its own cable", () => {
    for (const id of BOARD_IDS) {
      const lines = boardBom(id);
      expect(lines[0].key).toBe(`board:${id}`);
      expect(lines[1].key, id).toMatch(/^part:(usb-|pi-psu)/);
      expect(offersInput.safeParse({ parts: offerParts(lines) }).success, id).toBe(true);
    }
    expect(boardBom("uno-r3")[1].key).toBe("part:usb-b");
    expect(boardBom("nucleo-f401re")[1].key).toBe("part:usb-mini-b");
    expect(boardBom("esp32-s3-devkitc-1")[1].key).toBe("part:usb-micro-b");
  });

  it("lists what the micro:bit lessons wire from the rings: an LED and resistor, a potentiometer, a breadboard", () => {
    expect(boardBom("microbit-v2").map((l) => l.key)).toEqual([
      "board:microbit-v2",
      "part:usb-micro-b",
      "part:aaa-pack",
      "part:breadboard",
      "part:jumpers",
      "part:led",
      "part:resistor",
      "part:potentiometer",
    ]);
  });
});
