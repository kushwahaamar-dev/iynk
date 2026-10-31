const PLACEHOLDER = "[redacted-secret]";

const STRING = String.raw`"(?:[^"\\\n]|\\.)*"`;
const NAMED_SECRET = String.raw`(?:password|passwd|secret|token|apikey)`;

// Longest and most specific first, so a shorter pattern never leaves half of a key behind.
const WHOLE: readonly RegExp[] = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----(?:[\s\S]{0,4096}?-----END [A-Z ]*PRIVATE KEY-----|[\s\S]{0,4096})/g,
  /(?<![A-Za-z0-9])sk-ant-[A-Za-z0-9_-]{20,}/g,
  /(?<![A-Za-z0-9])sk-[A-Za-z0-9_-]{20,}/g,
  /(?<![A-Za-z0-9])AIza[0-9A-Za-z_-]{35}/g,
  /(?<![A-Za-z0-9])gh[pousr]_[A-Za-z0-9]{36,}/g,
  /(?<![A-Za-z0-9])xox[abpr]-[A-Za-z0-9-]{10,}/g,
  /Bearer [A-Za-z0-9._~+/=-]{20,}/g,
  /(?<![0-9A-Za-z])[0-9a-f]{32,}(?![0-9A-Za-z])/g,
];

// Firmware habits: the part after the captured prefix is the secret.
const TAIL: readonly RegExp[] = [
  new RegExp(String.raw`(WiFi\.begin\(\s*${STRING}\s*,\s*)(?!"\[redacted-secret\]")${STRING}`, "g"),
  new RegExp(String.raw`(\b[\w.]*${NAMED_SECRET}\w*"?\s*[=:]\s*)(?!"\[redacted-secret\]")${STRING}`, "gi"),
];

export function redactSecrets(text: string): { text: string; count: number } {
  let count = 0;
  let out = text;
  for (const pattern of WHOLE) {
    out = out.replace(pattern, () => {
      count++;
      return PLACEHOLDER;
    });
  }
  for (const pattern of TAIL) {
    out = out.replace(pattern, (_match, prefix: string) => {
      count++;
      return `${prefix}"${PLACEHOLDER}"`;
    });
  }
  return { text: out, count };
}

export function hasPlaceholder(text: string): boolean {
  return text.includes(PLACEHOLDER);
}
