import { describe, expect, test } from "vitest";
import esp32 from "@/content/robotics/esp32-s3-build";
import ledResistor from "@/content/robotics/led-resistor";
import l298n from "@/content/robotics/l298n";
import unoBuild from "@/content/robotics/uno-r3-build";
import { benchChrome } from "./chrome";

const sorted = (ids: string[]) => [...ids].sort();

describe("benchChrome", () => {
  test("hides Break it and every button a step's Do it sends", () => {
    expect(sorted(benchChrome(ledResistor, false))).toEqual(["break", "place", "power", "solder", "strip", "upload"]);
    expect(sorted(benchChrome(l298n, false))).toEqual(["break", "mat", "place", "pnp", "power", "solder", "strip", "upload"]);
  });

  test("keeps the board's own buttons, Remove a part and View", () => {
    for (const bench of [ledResistor, l298n, unoBuild, esp32]) {
      const hidden = benchChrome(bench, false);
      expect(hidden.filter((id) => id.startsWith("ctl-"))).toEqual([]);
      expect(hidden).not.toContain("remove");
      expect(hidden).not.toContain("view");
    }
  });

  test("keeps BOOT and RESET for the step that is done by hand in the figure", () => {
    expect(esp32.steps.some((step) => step.id === "download-mode" && step.action === null)).toBe(true);
    expect(benchChrome(esp32, true)).not.toContain("ctl-sw1");
    expect(benchChrome(esp32, true)).not.toContain("ctl-sw2");
  });

  test("hides the HUD on a phone only", () => {
    expect(benchChrome(unoBuild, false)).not.toContain("stats");
    expect(benchChrome(unoBuild, true)).toContain("stats");
  });
});
