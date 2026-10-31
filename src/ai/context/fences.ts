/** Who wrote the text: A authority (never fenced), R reference data, S search result, P project content, L learner text, X other. */
export type TrustClass = "A" | "R" | "S" | "P" | "L" | "X";

const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const NONCE_LENGTH = 8;
const MAX_REDRAWS = 8;
const FIELD_UNSAFE = /[^A-Za-z0-9_.:-]/g;

function drawNonce(random: () => number): string {
  let nonce = "";
  for (let i = 0; i < NONCE_LENGTH; i++) nonce += CROCKFORD[Math.floor(random() * CROCKFORD.length) % CROCKFORD.length];
  return nonce;
}

/**
 * A fresh fence nonce. Make it after the data is collected and pass that data as `avoid`, so the nonce never
 * appears inside it.
 */
export function makeNonce(random: () => number, avoid = ""): string {
  for (let attempt = 0; attempt <= MAX_REDRAWS; attempt++) {
    const nonce = drawNonce(random);
    if (!avoid.includes(nonce)) return nonce;
  }
  throw new Error("no fence nonce found that is absent from the data");
}

/** Wraps untrusted text in a nonce fence. Inner lines that could pass for a fence line or a tag get a leading backslash. */
export function fence(label: string, cls: Exclude<TrustClass, "A">, text: string, nonce: string): string {
  if (text.includes(nonce)) throw new Error("the fence nonce appears in the data");
  const body = text
    .split(/\r\n|\r|\n/)
    .map((line) => (line.startsWith("<<<") || line.startsWith("[") ? `\\${line}` : line))
    .join("\n");
  return `<<<DATA nonce=${nonce} label=${label.replace(FIELD_UNSAFE, "_")} class=${cls}>>>\n${body}\n<<<END nonce=${nonce}>>>`;
}

export function containsFence(text: string): boolean {
  return /<<<(?:DATA|END)\b/.test(text);
}
