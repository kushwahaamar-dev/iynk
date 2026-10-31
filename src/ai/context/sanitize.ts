const DEFAULT_CAP = 120;
const ELLIPSIS = "…";

function isUnsafe(cp: number): boolean {
  return (
    (cp <= 0x1f && cp !== 0x0a && cp !== 0x09) ||
    (cp >= 0x7f && cp <= 0x9f) ||
    (cp >= 0x202a && cp <= 0x202e) ||
    (cp >= 0x2066 && cp <= 0x2069) ||
    (cp >= 0x200b && cp <= 0x200d) ||
    cp === 0xfeff ||
    (cp >= 0xd800 && cp <= 0xdfff)
  );
}

/**
 * Cleans one short field for the model: NFC, invisible and control characters shown as `\u{XXXX}`, newlines as `\n`,
 * and a length cap counted in code points of the cleaned text. `flagged` is set when something invisible was found.
 */
export function cleanField(raw: string, cap: number = DEFAULT_CAP): { text: string; flagged: boolean } {
  let flagged = false;
  const units: string[] = [];
  for (const ch of raw.normalize("NFC").replace(/\r\n/g, "\n")) {
    const cp = ch.codePointAt(0) as number;
    if (ch === "\n") {
      units.push("\\n");
    } else if (isUnsafe(cp)) {
      flagged = true;
      units.push(`\\u{${cp.toString(16).toUpperCase().padStart(4, "0")}}`);
    } else {
      units.push(ch);
    }
  }
  if (units.length === 0) return { text: "-", flagged };

  let length = 0;
  for (const unit of units) length += unit.length;
  if (length <= cap) return { text: units.join(""), flagged };

  let text = "";
  for (const unit of units) {
    if (text.length + unit.length > cap - ELLIPSIS.length) break;
    text += unit;
  }
  return { text: text + ELLIPSIS, flagged };
}

export function quoteField(raw: string, cap?: number): string {
  const { text } = cleanField(raw, cap);
  return `"${text.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}
