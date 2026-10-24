// The small Markdown subset the partner writes in: paragraphs, headings (shown
// as bold lines), bullet and numbered lists, fenced code, **bold**, `code` and
// [links](https://...). It parses to a tree that React renders as elements, so
// model output never becomes HTML. A fence still streaming in renders as code.

export type Inline =
  | { t: "text"; v: string }
  | { t: "bold"; c: Inline[] }
  | { t: "code"; v: string }
  | { t: "link"; href: string; c: Inline[] };

export type Block =
  | { t: "p"; lines: Inline[][] }
  | { t: "h"; c: Inline[] }
  | { t: "ul"; items: Inline[][] }
  | { t: "ol"; start: number; items: Inline[][] }
  | { t: "code"; lang: string; v: string };

const LINK = /^\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/;

export function parseInline(source: string): Inline[] {
  const out: Inline[] = [];
  let text = "";
  const flush = () => {
    if (text) out.push({ t: "text", v: text });
    text = "";
  };
  let i = 0;
  while (i < source.length) {
    const ch = source[i];
    if (ch === "`") {
      const end = source.indexOf("`", i + 1);
      if (end > i + 1) {
        flush();
        out.push({ t: "code", v: source.slice(i + 1, end) });
        i = end + 1;
        continue;
      }
    } else if (ch === "*" && source[i + 1] === "*") {
      const end = source.indexOf("**", i + 2);
      if (end > i + 2) {
        flush();
        out.push({ t: "bold", c: parseInline(source.slice(i + 2, end)) });
        i = end + 2;
        continue;
      }
    } else if (ch === "[") {
      const match = LINK.exec(source.slice(i));
      if (match) {
        flush();
        out.push({ t: "link", href: match[2], c: parseInline(match[1]) });
        i += match[0].length;
        continue;
      }
    }
    text += ch;
    i++;
  }
  flush();
  return out;
}

const FENCE = /^\s*```\s*([\w+-]*)\s*$/;
const BULLET = /^\s*[-*•]\s+(.*)$/;
const NUMBERED = /^\s*(\d{1,3})[.)]\s+(.*)$/;
const HEADING = /^\s*#{1,6}\s+(.*)$/;

export function parseMarkdown(source: string): Block[] {
  const blocks: Block[] = [];
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  let para: Inline[][] = [];
  const endPara = () => {
    if (para.length) blocks.push({ t: "p", lines: para });
    para = [];
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const fence = FENCE.exec(line);
    if (fence) {
      endPara();
      const body: string[] = [];
      i++;
      while (i < lines.length && !/^\s*```\s*$/.test(lines[i])) body.push(lines[i++]);
      blocks.push({ t: "code", lang: fence[1].toLowerCase(), v: body.join("\n") });
      continue;
    }
    const bullet = BULLET.exec(line);
    const numbered = bullet ? null : NUMBERED.exec(line);
    if (bullet || numbered) {
      endPara();
      const last = blocks.at(-1);
      const item = parseInline(bullet ? bullet[1] : numbered![2]);
      if (bullet && last?.t === "ul") last.items.push(item);
      else if (numbered && last?.t === "ol") last.items.push(item);
      else if (bullet) blocks.push({ t: "ul", items: [item] });
      else blocks.push({ t: "ol", start: Number(numbered![1]), items: [item] });
      continue;
    }
    const heading = HEADING.exec(line);
    if (heading) {
      endPara();
      blocks.push({ t: "h", c: parseInline(heading[1]) });
      continue;
    }
    if (line.trim() === "") {
      endPara();
      continue;
    }
    // A plain line right after a list item continues that item.
    const last = blocks.at(-1);
    if (!para.length && (last?.t === "ul" || last?.t === "ol") && /^\s{2,}\S/.test(line)) {
      last.items[last.items.length - 1].push({ t: "text", v: ` ${line.trim()}` });
      continue;
    }
    para.push(parseInline(line.trim()));
  }
  endPara();
  return blocks;
}
