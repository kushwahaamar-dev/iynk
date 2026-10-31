import type { Project } from "./generated/types.ts";

export type SecretHit = { field: string; rule: string };

const KEY_RULES: readonly { rule: string; pattern: RegExp }[] = [
  { rule: "api-key", pattern: /\bsk-[A-Za-z0-9_-]{20,}/ },
  { rule: "google-key", pattern: /\bAIza[0-9A-Za-z_-]{35}\b/ },
  { rule: "private-key", pattern: /-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----/ },
];

const HEX_KEY = /(?<![0-9A-Za-z])[0-9a-fA-F]{64}(?![0-9A-Za-z])/;
const COMMENTS = /\/\*[\s\S]*?\*\/|\/\/[^\n]*|#[^\n]*/g;

function scanText(text: string, field: string, hits: SecretHit[], commentsOnly: boolean): void {
  for (const { rule, pattern } of KEY_RULES) if (pattern.test(text)) hits.push({ field, rule });
  const comments = commentsOnly ? (text.match(COMMENTS) ?? []).join("\n") : text;
  if (HEX_KEY.test(comments)) hits.push({ field, rule: "hex-key" });
}

/** Names the free-text fields of a document that look like a secret: never the value. Hashes and ids are not free text and are not scanned. */
export function scanSecrets(doc: Project): SecretHit[] {
  const hits: SecretHit[] = [];
  const text = (value: unknown, field: string): void => {
    if (typeof value === "string") scanText(value, field, hits, false);
  };
  text(doc.meta?.title, "/meta/title");
  text(doc.meta?.description, "/meta/description");
  doc.meta?.tags?.forEach((tag, i) => text(tag, `/meta/tags/${i}`));
  doc.boards?.forEach((board, i) => text(board.label, `/boards/${i}/label`));
  doc.components?.forEach((part, i) => text(part.label, `/components/${i}/label`));
  doc.views?.forEach((view, v) => view.labels?.forEach((label, i) => text(label.text, `/views/${v}/labels/${i}/text`)));
  doc.sources?.forEach((source, i) => {
    if (typeof source.content === "string") scanText(source.content, `/sources/${i}/content`, hits, true);
  });
  return hits;
}
