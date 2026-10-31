import breadboard from "./data/breadboard.component.json" with { type: "json" };
import buzzer from "./data/buzzer-piezo.component.json" with { type: "json" };
import esp32 from "./data/esp32-devkitc.component.json" with { type: "json" };
import esp32s3 from "./data/esp32-s3-devkitc-1.component.json" with { type: "json" };
import led from "./data/led-5mm.component.json" with { type: "json" };
import microbit from "./data/microbit-v2.component.json" with { type: "json" };
import nano from "./data/nano.component.json" with { type: "json" };
import nodemcu from "./data/nodemcu.component.json" with { type: "json" };
import nucleo from "./data/nucleo-f401re.component.json" with { type: "json" };
import pico from "./data/pico.component.json" with { type: "json" };
import potentiometer from "./data/potentiometer-10k.component.json" with { type: "json" };
import pushButton from "./data/push-button-6mm.component.json" with { type: "json" };
import resistor from "./data/resistor.component.json" with { type: "json" };
import ssd1306 from "./data/ssd1306.component.json" with { type: "json" };
import uno from "./data/uno-r3.component.json" with { type: "json" };
import unoR4 from "./data/uno-r4.component.json" with { type: "json" };
import { createRegistry } from "./registry.ts";
import type { PartRegistry } from "./registry.ts";

// To add a part: drop `<name>.component.json` into ./data, import it above with `with { type: "json" }` and add it
// to the list below. `builtinRegistry` refuses to build if any listed file fails validation, and `npm run schema:check`
// reads every file in ./data.
export const BUILTIN_DESCRIPTORS: readonly unknown[] = [uno, nano, unoR4, esp32, esp32s3, nodemcu, pico, microbit, nucleo, led, resistor, pushButton, buzzer, potentiometer, ssd1306, breadboard];

/** A registry holding every part that ships with iynk. A shipped file that fails validation is a build bug, so it throws. */
export function builtinRegistry(): PartRegistry {
  const registry = createRegistry();
  for (const descriptor of BUILTIN_DESCRIPTORS) {
    const added = registry.add(descriptor, { origin: "core" });
    if (!added.ok) {
      const lines = added.error.map((d) => `${d.code} ${d.path}: ${d.message}`);
      throw new Error(`a built-in part is invalid:\n${lines.join("\n")}`);
    }
  }
  return registry;
}
