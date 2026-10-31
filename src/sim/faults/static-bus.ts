import type { Protocol } from "../../parts/generated/types.ts";
import { evidence, make, pinsOfPart, pinTarget } from "./static.ts";
import type { Finding, NetView, PinInfo, Rule } from "./types.ts";

/**
 * Bus timing limits from the I2C specification (UM10204). EXTERNAL: the figures were not read from the document in
 * this build, and the bus capacitance `cbPf` is an ASSUMED 100 pF. They are data so that they can be changed here.
 */
export const I2C_LIMITS: Record<"standard" | "fast", { trNs: number; cbPf: number; iolA: number }> = {
  standard: { trNs: 1000, cbPf: 100, iolA: 0.003 },
  fast: { trNs: 300, cbPf: 100, iolA: 0.003 },
};

const LOW_LEVEL_V = 0.4;
const FAST_MODE_HZ = 100_000;

const maxPullup = ({ trNs, cbPf }: (typeof I2C_LIMITS)["standard"]): number => (trNs * 1e-9) / (0.8473 * cbPf * 1e-12);
const minPullup = ({ iolA }: (typeof I2C_LIMITS)["standard"], vdd: number): number => (vdd - LOW_LEVEL_V) / iolA;

interface I2cPort {
  protocol: Protocol;
  sda: PinInfo;
  scl: PinInfo;
}

function i2cPorts(view: NetView, part: string): I2cPort[] {
  return (view.descriptor(part)?.protocols ?? []).flatMap((protocol) => {
    const [sda, scl] = [protocol.pins.sda, protocol.pins.scl].map((id) => (protocol.kind === "i2c" && id ? view.pin(part, id) : undefined));
    return sda && scl ? [{ protocol, sda, scl }] : [];
  });
}

const paramOf = (protocol: Protocol | undefined, key: string): unknown => (protocol?.params as Record<string, unknown> | undefined)?.[key];

const sharesNet = (a: PinInfo, b: PinInfo): boolean => a.net !== null && a.net === b.net;

const i2cRoles = make(
  { id: "rule:i2c-roles@1", causeId: "swapped-pins", symptomId: "i2c-no-ack", needs: ["descriptors"] },
  ({ view, skipped }, finding) => {
    const out: Finding[] = [];
    const boards = view.parts().filter((part) => view.isBoard(part));
    for (const part of view.parts()) {
      if (view.isBoard(part)) continue;
      for (const device of i2cPorts(view, part)) {
        const nets = new Set([device.sda.net, device.scl.net]);
        for (const board of boards) {
          const ports = i2cPorts(view, board);
          if (ports.length === 0) {
            if (pinsOfPart(view, board).some((p) => nets.has(p.net))) skipped.add("rule:i2c-roles@1", "board-roles-unknown");
            continue;
          }
          for (const host of ports) {
            const crossed: [PinInfo, PinInfo][] = [];
            if (sharesNet(device.sda, host.scl)) crossed.push([device.sda, host.scl]);
            if (sharesNet(device.scl, host.sda)) crossed.push([device.scl, host.sda]);
            if (crossed.length === 0) continue;
            if (paramOf(host.protocol, "remappable") === true) {
              skipped.add("rule:i2c-roles@1", "remappable-pins");
              continue;
            }
            out.push(
              finding({
                targets: crossed.flatMap(([a, b]) => [{ kind: "net" as const, id: a.net ?? "" }, pinTarget(a), pinTarget(b)]),
                evidence: [
                  evidence(`pin:${part}.${device.sda.pin}`, crossed.map(([a, b]) => `${a.part}.${a.pin} is wired to ${b.part}.${b.pin}`).join("; ")),
                ],
                messageKey: "check.i2c-roles",
                args: { part, board },
              }),
            );
          }
        }
      }
    }
    return out;
  },
);

/** Every net that carries an I2C line of some part, with the line pins on it. */
function busLines(view: NetView): Map<string, PinInfo[]> {
  const lines = new Map<string, PinInfo[]>();
  for (const part of view.parts()) {
    for (const { sda, scl } of i2cPorts(view, part)) {
      for (const pin of [sda, scl]) if (pin.net !== null) lines.set(pin.net, [...(lines.get(pin.net) ?? []), pin]);
    }
  }
  return lines;
}

interface Pullup {
  /** Undefined when the part says there is a pull but not how strong. */
  ohms?: number;
  /** The net the pull ends on, when it is known. */
  rail?: string;
  /** The resistor pin that makes the pull, for an external one. */
  pin?: PinInfo;
  internal?: boolean;
}

const supplyNet = (view: NetView, part: string): string | undefined =>
  pinsOfPart(view, part).find((p) => p.type === "power_in" && p.net !== null)?.net ?? undefined;

function pullupsOn(view: NetView, net: string, lines: PinInfo[]): Pullup[] {
  const out: Pullup[] = [];
  for (const r of view.resistorsOn(net)) {
    const far = pinsOfPart(view, r.part).find((q) => q.pin !== r.pin);
    if (far?.net == null || view.netClass(far.net) !== "power") continue;
    const ohms = view.param(r.part, "ohms");
    out.push({ ...(typeof ohms === "number" ? { ohms } : {}), rail: far.net, pin: r });
  }
  for (const p of view.pinsOn(net)) {
    const d = view.descriptor(p.part);
    const pull = d?.pins.find((q) => q.id === p.pin)?.pull;
    if (!pull || pull.to !== "up") continue;
    if (pull.kind === "internal") {
      out.push({ internal: true });
      continue;
    }
    const rating = d?.ratings[pull.rating];
    const slot = rating && rating.used_by_model !== "none" ? rating[rating.used_by_model] : rating?.manufacturer;
    const ohms = slot?.unit === "ohm" ? (slot.value ?? slot.typ) : undefined;
    out.push({ ...(typeof ohms === "number" ? { ohms } : {}), rail: supplyNet(view, p.part) });
  }
  for (const part of new Set(lines.map((p) => p.part))) {
    const ohms = paramOf(view.descriptor(part)?.protocols?.find((q) => q.kind === "i2c"), "onboard_pullup_ohms");
    if (typeof ohms === "number") out.push({ ohms, rail: supplyNet(view, part) });
  }
  return out;
}

const i2cPullup = make(
  { id: "rule:i2c-pullup@1", causeId: "i2c-missing-pullup", symptomId: "i2c-no-ack", needs: ["descriptors"] },
  ({ view, skipped }, finding) => {
    const out: Finding[] = [];
    for (const [net, lines] of busLines(view)) {
      if (view.pinsOn(net).some((p) => !view.descriptor(p.part))) {
        skipped.add("rule:i2c-pullup@1", "undescribed-part");
        continue;
      }
      if (pullupsOn(view, net, lines).length > 0) continue;
      out.push(
        finding({
          targets: [{ kind: "net", id: net }, ...lines.map(pinTarget)],
          evidence: [evidence(`net:${net}`, "no resistor to a supply and no pull-up on any pin of the line")],
          messageKey: "check.i2c-pullup",
          args: { net },
        }),
      );
    }
    return out;
  },
);

const parallel = (values: number[]): number => 1 / values.reduce((sum, v) => sum + 1 / v, 0);

const i2cPullupValue = make(
  { id: "rule:i2c-pullup-value@1", causeId: "wrong-value", symptomId: "i2c-no-ack", needs: ["descriptors"] },
  ({ view, code, skipped }, finding) => {
    const out: Finding[] = [];
    const speed = (code?.wireClock?.value.hz ?? 0) > FAST_MODE_HZ ? "fast" : "standard";
    const limits = I2C_LIMITS[speed];
    for (const [net, lines] of busLines(view)) {
      const pulls = pullupsOn(view, net, lines).filter((p) => !p.internal);
      if (pulls.length === 0) continue;
      const ohms = pulls.map((p) => p.ohms);
      if (ohms.some((v) => v === undefined)) {
        skipped.add("rule:i2c-pullup-value@1", "unreadable-pullup");
        continue;
      }
      const total = parallel(ohms as number[]);
      const vdd = pulls.map((p) => (p.rail === undefined ? undefined : view.nominalVolts(p.rail))).find((v) => v !== undefined);
      if (vdd === undefined) skipped.add("rule:i2c-pullup-value@1", "unknown-voltage");
      const high = maxPullup(limits);
      const low = vdd === undefined ? undefined : minPullup(limits, vdd);
      const bound = total > high ? "high" : low !== undefined && total < low ? "low" : undefined;
      if (bound === undefined) continue;
      const limit = Math.round(bound === "high" ? high : (low ?? 0));
      out.push(
        finding({
          targets: [{ kind: "net", id: net }, ...pulls.flatMap((p) => (p.pin ? [pinTarget(p.pin)] : []))],
          evidence: [
            evidence(`net:${net}`, `pull-up ${Math.round(total)} ohm, ${bound === "high" ? "most" : "least"} ${limit} ohm at ${speed} speed`),
          ],
          messageKey: bound === "high" ? "check.i2c-pullup-high" : "check.i2c-pullup-low",
          args: { net, ohms: Math.round(total), limit, speed },
        }),
      );
    }
    return out;
  },
);

export const BUS_RULES: readonly Rule[] = [i2cRoles, i2cPullup, i2cPullupValue];
