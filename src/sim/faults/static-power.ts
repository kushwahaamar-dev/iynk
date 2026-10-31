import type { Descriptor } from "../../parts/descriptor.ts";
import type { Rating } from "../../parts/generated/types.ts";
import { evidence, isSupply, make, pinsOfPart, pinTarget } from "./static.ts";
import type { Finding, NetView, PinInfo, Rule } from "./types.ts";

const ledElement = (d: Descriptor | undefined) =>
  d?.behaviour.layers.map((l) => l.model).find((m) => m.kind === "element" && m.element === "led");

/** The anode and cathode pins of an LED, read from its element and checked against the pin polarity. */
function ledPins(view: NetView, part: string): { anode: PinInfo; cathode: PinInfo } | undefined {
  const model = ledElement(view.descriptor(part));
  if (model?.kind !== "element") return undefined;
  const anode = view.pin(part, model.terminals.anode ?? "");
  const cathode = view.pin(part, model.terminals.cathode ?? "");
  return anode?.polarity === "anode" && cathode?.polarity === "cathode" ? { anode, cathode } : undefined;
}

/** True when the LED module carries a resistor of its own: a resistance rating that its LED element does not use. */
function hasOwnResistor(d: Descriptor): boolean {
  const model = ledElement(d);
  const used = new Set(
    model?.kind === "element" ? Object.values(model.params ?? {}).map((v) => (typeof v === "object" ? v?.from_rating : undefined)) : [],
  );
  return Object.entries(d.ratings).some(([key, r]) => r?.measure === "resistance" && r.role === "characteristic" && !used.has(key));
}

/** A pin that can push current into an LED: a supply, a driver pin, or any digital I/O pin of a board. */
const isSource = (view: NetView, p: PinInfo): boolean =>
  isSupply(view, p) || p.type === "digital_out" || (p.type === "digital_io" && view.isBoard(p.part));

const ledSeries = make(
  { id: "rule:led-series@1", causeId: "led-no-series-resistor", symptomId: "led-burnt", needs: ["descriptors"] },
  ({ view, skipped }, finding) => {
    const out: Finding[] = [];
    for (const part of view.parts()) {
      const d = view.descriptor(part);
      if (!d) {
        skipped.add("rule:led-series@1", "undescribed-part");
        continue;
      }
      const led = ledPins(view, part);
      if (!led || led.anode.net === null || led.cathode.net === null) continue;
      if (hasOwnResistor(d)) {
        skipped.add("rule:led-series@1", "on-board-resistor");
        continue;
      }
      if (view.netClass(led.cathode.net) !== "ground") continue;
      const here = view.pinsOn(led.anode.net).filter((p) => p.part !== part);
      const source = here.find((p) => isSource(view, p));
      if (!source || here.some((p) => p.part !== source.part)) continue;
      out.push(
        finding({
          targets: [{ kind: "part", id: part }, pinTarget(source)],
          evidence: [evidence(`pin:${led.anode.part}.${led.anode.pin}`, `${source.part}.${source.pin} drives the LED with nothing in series`)],
          messageKey: "check.led-series",
          args: { led: part, source: `${source.part}.${source.pin}` },
        }),
      );
    }
    return out;
  },
);

const ledPolarity = make(
  { id: "rule:led-polarity@1", causeId: "led-reversed", symptomId: "led-dark", needs: ["descriptors"] },
  ({ view, skipped }, finding) => {
    const out: Finding[] = [];
    for (const part of view.parts()) {
      if (!view.descriptor(part)) {
        skipped.add("rule:led-polarity@1", "undescribed-part");
        continue;
      }
      const led = ledPins(view, part);
      const [a, k] = [led?.anode.net, led?.cathode.net];
      if (!led || a == null || k == null || a === k) continue;
      const [va, vk] = [view.nominalVolts(a), view.nominalVolts(k)];
      const reversed =
        (view.netClass(a) === "ground" && view.pinsOn(k).some((p) => p.part !== part && isSource(view, p))) ||
        (va !== undefined && vk !== undefined && va < vk);
      if (!reversed) continue;
      out.push(
        finding({
          targets: [{ kind: "part", id: part }, pinTarget(led.anode), pinTarget(led.cathode)],
          evidence: [evidence(`pin:${part}.${led.anode.pin}`, `anode on ${a}, cathode on ${k}`)],
          messageKey: "check.led-polarity",
          args: { led: part },
        }),
      );
    }
    return out;
  },
);

const supplyPolarity = make(
  { id: "rule:supply-polarity@1", causeId: "reverse-polarity", symptomId: "part-hot", needs: ["descriptors"] },
  ({ view, skipped }, finding) => {
    const out: Finding[] = [];
    for (const part of view.parts()) {
      if (view.isBoard(part)) continue;
      if (!view.descriptor(part)) {
        skipped.add("rule:supply-polarity@1", "undescribed-part");
        continue;
      }
      const pins = pinsOfPart(view, part);
      const netClass = (p: PinInfo) => (p.net === null ? undefined : view.netClass(p.net));
      const supply = pins.find((p) => p.type === "power_in" && netClass(p) === "ground");
      const ground = pins.find((p) => p.cls === "ground" && netClass(p) === "power");
      const plus = pins.find((p) => p.polarity === "positive");
      const minus = pins.find((p) => p.polarity === "negative");
      const [vp, vm] = [plus?.net ? view.nominalVolts(plus.net) : undefined, minus?.net ? view.nominalVolts(minus.net) : undefined];
      const culprits = supply && ground ? [supply, ground] : plus && minus && vp !== undefined && vm !== undefined && vp < vm ? [plus, minus] : [];
      const [first, second] = culprits;
      if (!first || !second) continue;
      out.push(
        finding({
          targets: [{ kind: "part", id: part }, pinTarget(first), pinTarget(second)],
          evidence: [evidence(`pin:${first.part}.${first.pin}`, `${first.pin} on net ${first.net}, ${second.pin} on net ${second.net}`)],
          messageKey: "check.supply-polarity",
          args: { part, pin: first.pin, other: second.pin },
        }),
      );
    }
    return out;
  },
);

/** The lowest voltage a rating gives, from the slot a model reads (the stated one when none does). */
function lowestVolts(rating: Rating | undefined): number | undefined {
  if (rating?.measure !== "voltage") return undefined;
  const slot = rating.used_by_model === "none" ? rating.manufacturer : rating[rating.used_by_model];
  return slot?.unit === "V" ? (slot.min ?? slot.value) : undefined;
}

/** A net feeds a pin when a source is on it, or when something that could carry a supply to it is. */
const isFed = (view: NetView, pin: PinInfo, net: string): boolean =>
  view.netClass(net) === "power" ||
  view.pinsOn(net).some((p) => p !== pin && (p.cls === "passive" || p.type === "digital_out" || p.type === "digital_io"));

const partSupply = make(
  { id: "rule:part-supply@1", causeId: "part-not-powered", symptomId: "part-dead", needs: ["descriptors"] },
  ({ view, skipped }, finding) => {
    const out: Finding[] = [];
    for (const part of view.parts()) {
      if (view.isBoard(part)) continue;
      const d = view.descriptor(part);
      if (!d) {
        skipped.add("rule:part-supply@1", "undescribed-part");
        continue;
      }
      for (const pin of pinsOfPart(view, part)) {
        if (pin.type !== "power_in" || pin.net === null) continue;
        const targets = [pinTarget(pin), { kind: "net" as const, id: pin.net }];
        if (!isFed(view, pin, pin.net)) {
          out.push(
            finding({
              targets,
              evidence: [evidence(`net:${pin.net}`, "no supply on the net")],
              messageKey: "check.part-supply",
              args: { part, pin: pin.pin, net: pin.net },
            }),
          );
          continue;
        }
        const volts = view.nominalVolts(pin.net);
        if (volts === undefined) continue;
        const input = d.power?.inputs?.find((i) => i.pins.includes(pin.pin));
        const min = input ? lowestVolts(d.ratings[input.voltage]) : undefined;
        if (min === undefined) {
          skipped.add("rule:part-supply@1", "no-voltage-rating");
          continue;
        }
        if (volts >= min) continue;
        out.push(
          finding({
            targets,
            evidence: [evidence(`net:${pin.net}`, `${volts} V on the net, the part needs at least ${min} V`)],
            messageKey: "check.part-supply-low",
            args: { part, pin: pin.pin, net: pin.net, volts, min },
          }),
        );
      }
    }
    return out;
  },
);

export const POWER_RULES: readonly Rule[] = [ledSeries, ledPolarity, supplyPolarity, partSupply];
