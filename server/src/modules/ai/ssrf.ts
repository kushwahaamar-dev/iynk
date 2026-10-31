import { isIPv4, isIPv6 } from "node:net";

export type AddressClass = "public" | "loopback" | "private" | "link-local" | "metadata" | "multicast" | "unspecified" | "reserved" | "unique-local";

export type Resolver = (host: string) => Promise<{ address: string; family: 4 | 6 }[]>;

type Policy = { allowPrivate: boolean; hostAllowed: boolean };

const ALWAYS_REFUSED = new Set<AddressClass>(["link-local", "metadata", "multicast", "unspecified", "reserved"]);

function classifyV4(a: number, b: number, c: number, d: number): AddressClass {
  if (a === 0) return "unspecified";
  if (a === 10) return "private";
  if (a === 100 && b >= 64 && b <= 127) return "private";
  if (a === 127) return "loopback";
  if (a === 169 && b === 254) return c === 169 && d === 254 ? "metadata" : "link-local";
  if (a === 172 && b >= 16 && b <= 31) return "private";
  if (a === 192 && b === 0 && c === 0) return "reserved";
  if (a === 192 && b === 168) return "private";
  if (a === 198 && (b === 18 || b === 19)) return "reserved";
  if (a >= 224 && a <= 239) return "multicast";
  if (a >= 240) return "reserved";
  return "public";
}

function parseV6(text: string): number[] | null {
  const bare = text.split("%")[0] ?? "";
  let source = bare;
  const lastColon = bare.lastIndexOf(":");
  const tail = bare.slice(lastColon + 1);
  if (tail.includes(".")) {
    const parts = tail.split(".").map(Number);
    if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return null;
    const high = ((parts[0] as number) << 8) | (parts[1] as number);
    const low = ((parts[2] as number) << 8) | (parts[3] as number);
    source = `${bare.slice(0, lastColon + 1)}${high.toString(16)}:${low.toString(16)}`;
  }
  const halves = source.split("::");
  if (halves.length > 2) return null;
  const head = halves[0] === "" ? [] : (halves[0] as string).split(":");
  const rest = halves.length === 2 ? (halves[1] === "" ? [] : (halves[1] as string).split(":")) : [];
  const missing = 8 - head.length - rest.length;
  if (halves.length === 1 ? missing !== 0 : missing < 1) return null;
  const groups = [...head, ...Array<string>(halves.length === 2 ? missing : 0).fill("0"), ...rest].map((group) => (/^[0-9a-f]{1,4}$/i.test(group) ? parseInt(group, 16) : NaN));
  return groups.length === 8 && groups.every((group) => !Number.isNaN(group)) ? groups : null;
}

function classifyV6(text: string): AddressClass {
  const g = parseV6(text);
  if (g === null) return "reserved";
  const embedded = (): AddressClass => classifyV4((g[6] as number) >> 8, (g[6] as number) & 255, (g[7] as number) >> 8, (g[7] as number) & 255);
  const first = g[0] as number;
  const zeroPrefix = g.slice(0, 5).every((group) => group === 0);
  if (zeroPrefix && g[5] === 0 && g[6] === 0 && g[7] === 0) return "unspecified";
  if (zeroPrefix && g[5] === 0 && g[6] === 0 && g[7] === 1) return "loopback";
  if (zeroPrefix && g[5] === 0xffff) return embedded();
  if (zeroPrefix && g[5] === 0) return "reserved";
  if (first === 0x64 && g[1] === 0xff9b && g.slice(2, 6).every((group) => group === 0)) return embedded();
  if ((first & 0xfe00) === 0xfc00) return "unique-local";
  if ((first & 0xffc0) === 0xfe80) return "link-local";
  if ((first & 0xff00) === 0xff00) return "multicast";
  return "public";
}

export function classifyAddress(ip: string): AddressClass {
  if (isIPv4(ip)) {
    const [a, b, c, d] = ip.split(".").map(Number) as [number, number, number, number];
    return classifyV4(a, b, c, d);
  }
  return isIPv6(ip.split("%")[0] ?? "") ? classifyV6(ip) : "reserved";
}

export function checkAddresses(
  addrs: { address: string }[],
  policy: Policy,
): { ok: true; pick: { address: string; family: 4 | 6 } } | { ok: false; code: "address_not_allowed" } {
  const refused = { ok: false, code: "address_not_allowed" } as const;
  const first = addrs[0];
  if (first === undefined) return refused;
  for (const { address } of addrs) {
    const kind = classifyAddress(address);
    if (kind === "public") continue;
    if (ALWAYS_REFUSED.has(kind)) return refused;
    if (!(policy.allowPrivate && policy.hostAllowed)) return refused;
  }
  return { ok: true, pick: { address: first.address, family: isIPv4(first.address) ? 4 : 6 } };
}
