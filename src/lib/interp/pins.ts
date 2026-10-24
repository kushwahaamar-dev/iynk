// Pin numbers <-> the net names content, figures and checks use ("D13", "GPIO2", "GP25", "A0").

import { resolvePin, type BoardProfile } from './profiles';

/**
 * Net name for a pin number: first the board's pinout (`nets`), then the interpreter's own aliases
 * (A0, GP25...), then the board family's plain naming (D13 on Arduino headers, GPIO2 on ESP boards).
 */
export function pinNet(profile: BoardProfile, n: number, nets?: Record<number, string>): string {
  const fromPinout = nets?.[n];
  if (fromPinout) return fromPinout;
  for (const [name, pin] of Object.entries(profile.aliases)) {
    if (pin === n && /^(A\d+|GP\d+|P\d+|GPIO\d+|P[A-H]\d+)$/.test(name)) return name;
  }
  switch (profile.id) {
    case 'uno-r3':
    case 'nano':
    case 'uno-r4':
      return `D${n}`;
    case 'pico':
      return `GP${n}`;
    case 'microbit-v2':
      return `P${n}`;
    default:
      return `GPIO${n}`;
  }
}

/**
 * Resolves a net name to what Run.input()/analog() take: a pin number, or for FPGA designs a port
 * or port bit ("sw", "sw[3]") through the lesson's port map.
 */
export function netResolver(profile: BoardProfile, opts: { nets?: Record<number, string>; ports?: Record<string, string[]> } = {}): (net: string) => number | string | undefined {
  const netToPin = new Map<string, number>();
  for (const [pin, net] of Object.entries(opts.nets ?? {})) netToPin.set(net, Number(pin));
  return (net: string) => {
    if (opts.ports) {
      for (const [port, nets] of Object.entries(opts.ports)) {
        const bit = nets.indexOf(net);
        if (bit >= 0) return nets.length === 1 ? port : `${port}[${bit}]`;
      }
    }
    const known = netToPin.get(net);
    if (known !== undefined) return known;
    const alias = resolvePin(profile, net);
    if (alias !== undefined) return alias;
    const m = /^(?:D|GP|GPIO|P|IO)(\d+)$/i.exec(net.trim());
    return m ? Number(m[1]) : undefined;
  };
}

/** Interpreter pin numbers for a board's pinout nets (what Board Lab passes as `nets`). */
export function pinoutNets(profile: BoardProfile, pinout: readonly { label: string; net: string; caps: readonly string[] }[]): Record<number, string> {
  const nets: Record<number, string> = {};
  for (const row of pinout) {
    if (row.caps.includes('power') || row.caps.includes('gnd') || row.caps.includes('nc')) continue;
    const plain = /^(?:D|GP|GPIO|P|IO)(\d+)$/.exec(row.label) ?? /^(?:D|GP|GPIO|P|IO)(\d+)$/.exec(row.net);
    const n = resolvePin(profile, row.label) ?? resolvePin(profile, row.net) ?? (plain ? Number(plain[1]) : undefined);
    if (n !== undefined && nets[n] === undefined) nets[n] = row.net;
  }
  return nets;
}
