// @vitest-environment node
import { describe, expect, it } from "vitest";
import { mask, unmask } from "./translate";

describe("mask and unmask", () => {
  it("protects code, URLs, units, pins and part numbers", () => {
    const input = "Wire the HC-SR04 trig to GPIO5, 3.3V only. See https://ex.ample/ds?x=1 and run:\n```cpp\ndelay(500);\n```";
    const { text, tokens } = mask(input);
    expect(text).not.toMatch(/HC-SR04|GPIO5|3\.3V|https|delay/);
    expect(tokens).toEqual(["```cpp\ndelay(500);\n```", "https://ex.ample/ds?x=1", "3.3V", "HC-SR04", "GPIO5"]);
    expect(unmask(text, tokens)).toBe(input);
  });

  it("leaves ordinary words alone", () => {
    expect(mask("Hola, el LED no enciende").tokens).toEqual([]);
    expect(mask("I have 2 Arduinos").tokens).toEqual([]);
  });

  it("restores tokens wherever the translation moved them", () => {
    const { text, tokens } = mask("Use a 220 Ω resistor on D13");
    expect(text).toBe("Use a ⟦0⟧ resistor on ⟦1⟧");
    expect(unmask("Usa en ⟦1⟧ una resistencia de ⟦0⟧", tokens)).toBe("Usa en D13 una resistencia de 220 Ω");
  });

  it("returns null when a token was lost or invented", () => {
    const { tokens } = mask("Pin D13");
    expect(unmask("Pin", tokens)).toBeNull();
    expect(unmask("Pin ⟦0⟧ ⟦7⟧", tokens)).toBeNull();
  });
});
