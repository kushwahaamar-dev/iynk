import { utf8Length } from "../core/canonical.ts";

export const ART_LIMITS = {
  svgBytes: 262144,
  pngBytes: 524288,
  pngMaxPx: 2048,
  depth: 32,
  elements: 2000,
  attributesPerElement: 24,
} as const;

export type ArtError =
  | "too-big"
  | "not-xml"
  | "doctype"
  | "entity"
  | "cdata"
  | "processing-instruction"
  | "depth"
  | "too-many-elements"
  | "root-not-svg"
  | "no-viewbox"
  | "empty"
  | "png-signature"
  | "png-header"
  | "png-too-large"
  | "png-truncated";

export type SanitizeSvgResult =
  | { ok: true; svg: string; removed: { elements: string[]; attributes: string[] } }
  | { ok: false; error: ArtError };

export type PngCheck = { ok: true; width: number; height: number } | { ok: false; error: ArtError };

const SVG_NS = "http://www.w3.org/2000/svg";
const TEXT_CHARS = 2000;

const ELEMENTS = new Set([
  "svg", "g", "path", "rect", "circle", "ellipse", "line", "polyline", "polygon", "text", "tspan", "title", "desc",
  "defs", "linearGradient", "radialGradient", "stop",
]);
const TEXT_ELEMENTS = new Set(["text", "tspan", "title", "desc"]);
const DRAWN = new Set(["path", "rect", "circle", "ellipse", "line", "polyline", "polygon", "text"]);

const NUM = "[-+]?(?:[0-9]+\\.?[0-9]*|\\.[0-9]+)(?:[eE][-+]?[0-9]+)?";
const ID = "[A-Za-z][A-Za-z0-9_-]{0,63}";
const NUMBER = new RegExp(`^${NUM}$`);
const COORD = new RegExp(`^${NUM}%?$`);
const VIEWBOX = new RegExp(`^${NUM}(?:[ ,]+${NUM}){3}$`);
const PAINT = new RegExp(
  `^(?:none|currentColor|[A-Za-z]{3,20}|#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})|rgba?\\([0-9., %]{1,40}\\)|url\\(#${ID}\\))$`,
);
const ID_ONLY = new RegExp(`^${ID}$`);
const TRANSFORM = /^\s*(?:(?:matrix|translate|scale|rotate|skewX|skewY)\([-+.0-9eE\s,]{0,200}\)[\s,]*){0,16}$/;
const PATH_DATA = /^[MmLlHhVvCcSsQqTtAaZz0-9eE.,+\-\s]*$/;
const POINTS = /^[0-9eE.,+\-\s]*$/;
const FONT_FAMILY = /^[A-Za-z0-9 ,_-]{1,100}$/;
const oneOf = (...words: string[]): RegExp => new RegExp(`^(?:${words.join("|")})$`);

const ATTRIBUTES: Readonly<Record<string, RegExp>> = {
  viewBox: VIEWBOX,
  width: NUMBER,
  height: NUMBER,
  x: COORD,
  y: COORD,
  x1: COORD,
  y1: COORD,
  x2: COORD,
  y2: COORD,
  cx: COORD,
  cy: COORD,
  r: COORD,
  rx: COORD,
  ry: COORD,
  d: PATH_DATA,
  points: POINTS,
  transform: TRANSFORM,
  fill: PAINT,
  stroke: PAINT,
  "stroke-width": NUMBER,
  "stroke-linecap": oneOf("butt", "round", "square"),
  "stroke-linejoin": oneOf("miter", "round", "bevel"),
  opacity: NUMBER,
  "fill-opacity": NUMBER,
  "stroke-opacity": NUMBER,
  offset: COORD,
  "stop-color": PAINT,
  "stop-opacity": NUMBER,
  gradientUnits: oneOf("userSpaceOnUse", "objectBoundingBox"),
  id: ID_ONLY,
  "font-size": NUMBER,
  "font-family": FONT_FAMILY,
  "text-anchor": oneOf("start", "middle", "end"),
};

const FORBIDDEN_OUTPUT = /<script|\bon\w+=|javascript:|foreignObject|<iframe|<object|<embed|<image|<use|<style|href/i;
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/;
const LONE_SURROGATE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g;
const NAME = /^[A-Za-z][A-Za-z0-9:_.-]*$/;
const WHITESPACE = /\s/;
const BLANK = /^\s*$/;

const ENTITIES: Readonly<Record<string, string>> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

const fail = (error: ArtError): { ok: false; error: ArtError } => ({ ok: false, error });

const escapeText = (s: string): string => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Decodes the five predefined entities; any other `&...;` returns null. */
function decodeText(raw: string): string | null {
  if (!raw.includes("&")) return raw;
  let out = "";
  let at = 0;
  for (let amp = raw.indexOf("&"); amp !== -1; amp = raw.indexOf("&", at)) {
    const semi = raw.indexOf(";", amp);
    const decoded = semi === -1 ? undefined : ENTITIES[raw.slice(amp + 1, semi)];
    if (decoded === undefined) return null;
    out += raw.slice(at, amp) + decoded;
    at = semi + 1;
  }
  return out + raw.slice(at);
}

function clipText(text: string): string {
  const clean = text.replace(LONE_SURROGATE, "�");
  if (clean.length <= TEXT_CHARS) return clean;
  const high = clean.charCodeAt(TEXT_CHARS - 1);
  return clean.slice(0, high >= 0xd800 && high <= 0xdbff ? TEXT_CHARS - 1 : TEXT_CHARS);
}

interface Tag {
  name: string;
  attrs: Map<string, string>;
  droppedAttrs: string[];
  selfClosing: boolean;
  end: number;
}

/** Reads the open tag that starts at `start` (the `<`). Attribute values must be quoted. */
function readOpenTag(src: string, start: number): Tag | ArtError {
  let i = start + 1;
  while (i < src.length && !WHITESPACE.test(src[i]) && src[i] !== "/" && src[i] !== ">") i++;
  const name = src.slice(start + 1, i);
  if (!NAME.test(name)) return "not-xml";
  const attrs = new Map<string, string>();
  const droppedAttrs: string[] = [];
  const seen = new Set<string>();
  let count = 0;
  for (;;) {
    while (i < src.length && WHITESPACE.test(src[i])) i++;
    if (i >= src.length) return "not-xml";
    if (src[i] === ">") return { name, attrs, droppedAttrs, selfClosing: false, end: i + 1 };
    if (src[i] === "/") return src[i + 1] === ">" ? { name, attrs, droppedAttrs, selfClosing: true, end: i + 2 } : "not-xml";
    const nameStart = i;
    while (i < src.length && !WHITESPACE.test(src[i]) && src[i] !== "=" && src[i] !== ">" && src[i] !== "/") i++;
    const attr = src.slice(nameStart, i);
    if (!NAME.test(attr) || seen.has(attr)) return "not-xml";
    seen.add(attr);
    if (++count > ART_LIMITS.attributesPerElement) return "too-many-elements";
    while (i < src.length && WHITESPACE.test(src[i])) i++;
    if (src[i] !== "=") return "not-xml";
    i++;
    while (i < src.length && WHITESPACE.test(src[i])) i++;
    const quote = src[i];
    if (quote !== '"' && quote !== "'") return "not-xml";
    const close = src.indexOf(quote, i + 1);
    if (close === -1) return "not-xml";
    const value = src.slice(i + 1, close);
    if (value.includes("<")) return "not-xml";
    i = close + 1;
    const pattern = Object.hasOwn(ATTRIBUTES, attr) ? ATTRIBUTES[attr] : undefined;
    if (pattern?.test(value)) attrs.set(attr, value);
    else droppedAttrs.push(attr);
  }
}

const isTag = (r: Tag | ArtError): r is Tag => typeof r !== "string";

function noteRemoved(into: string[], name: string): void {
  if (!into.includes(name)) into.push(name);
}

/**
 * Re-serialises an SVG from an allow-list of elements and attributes. Nothing is copied through from the input:
 * every token that survives is rebuilt, so a construct the tokenizer does not know cannot reach the output.
 */
export function sanitizeSvg(input: string): SanitizeSvgResult {
  if (input.length > ART_LIMITS.svgBytes || utf8Length(input) > ART_LIMITS.svgBytes) return fail("too-big");
  if (CONTROL_CHARS.test(input)) return fail("not-xml");
  if (BLANK.test(input)) return fail("empty");

  const removed = { elements: [] as string[], attributes: [] as string[] };
  const out: string[] = [];
  const stack: { name: string; kept: boolean }[] = [];
  let skipping = 0;
  let elements = 0;
  let sawRoot = false;
  let drawn = 0;
  let at = input.charCodeAt(0) === 0xfeff ? 1 : 0;

  const leading = /^\s*<\?xml[\s?][^]*?\?>/.exec(input.slice(at, at + 1024));
  if (leading) at += leading[0].length;

  while (at < input.length) {
    const lt = input.indexOf("<", at);
    const text = input.slice(at, lt === -1 ? input.length : lt);
    if (!BLANK.test(text)) {
      const top = stack[stack.length - 1];
      if (!top) return fail("not-xml");
      if (skipping === 0 && TEXT_ELEMENTS.has(top.name)) {
        const decoded = decodeText(text);
        if (decoded === null) return fail("entity");
        out.push(escapeText(clipText(decoded)));
      } else if (skipping === 0 && text.includes("&") && decodeText(text) === null) {
        return fail("entity");
      }
    }
    if (lt === -1) break;
    at = lt;

    if (input.startsWith("<!--", at)) {
      const close = input.indexOf("-->", at + 4);
      if (close === -1) return fail("not-xml");
      at = close + 3;
      continue;
    }
    const upper = input.slice(at, at + 9).toUpperCase();
    if (upper.startsWith("<!DOCTYPE")) return fail("doctype");
    if (upper.startsWith("<!ENTITY")) return fail("entity");
    if (upper.startsWith("<![CDATA[")) return fail("cdata");
    if (input.startsWith("<?", at)) return fail("processing-instruction");
    if (input.startsWith("<!", at)) return fail("not-xml");

    if (input.startsWith("</", at)) {
      const close = input.indexOf(">", at);
      if (close === -1) return fail("not-xml");
      const open = stack.pop();
      if (!open || input.slice(at + 2, close).trim() !== open.name) return fail("not-xml");
      if (open.kept) out.push(`</${open.name}>`);
      else skipping--;
      at = close + 1;
      continue;
    }

    const tag = readOpenTag(input, at);
    if (!isTag(tag)) return fail(tag);
    at = tag.end;
    if (++elements > ART_LIMITS.elements) return fail("too-many-elements");
    if (stack.length === 0) {
      if (sawRoot) return fail("not-xml");
      sawRoot = true;
      if (tag.name !== "svg") return fail("root-not-svg");
      if (!tag.attrs.has("viewBox")) return fail("no-viewbox");
    }
    if (!tag.selfClosing && stack.length >= ART_LIMITS.depth) return fail("depth");

    const kept = skipping === 0 && ELEMENTS.has(tag.name);
    if (kept) {
      for (const a of tag.droppedAttrs) noteRemoved(removed.attributes, a);
      if (DRAWN.has(tag.name)) drawn++;
      const attrs = [...tag.attrs].map(([k, v]) => ` ${k}="${v}"`).join("");
      const ns = stack.length === 0 ? ` xmlns="${SVG_NS}"` : "";
      out.push(`<${tag.name}${ns}${attrs}${tag.selfClosing ? "/>" : ">"}`);
    } else {
      if (skipping === 0) noteRemoved(removed.elements, tag.name);
      if (!tag.selfClosing) skipping++;
    }
    if (!tag.selfClosing) stack.push({ name: tag.name, kept });
  }

  if (stack.length > 0 || !sawRoot) return fail("not-xml");
  if (drawn === 0) return fail("empty");
  const svg = out.join("");
  if (FORBIDDEN_OUTPUT.test(svg)) return fail("not-xml");
  return { ok: true, svg, removed };
}

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function chunkType(b: Uint8Array, at: number): string {
  return String.fromCharCode(b[at], b[at + 1], b[at + 2], b[at + 3]);
}

/** Checks the signature, the IHDR size and that the chunk list ends with IEND. The bytes are not decoded. */
export function checkPng(bytes: Uint8Array): PngCheck {
  if (bytes.length > ART_LIMITS.pngBytes) return fail("too-big");
  if (bytes.length < 8 || PNG_SIGNATURE.some((v, i) => bytes[i] !== v)) return fail("png-signature");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.length < 33 || view.getUint32(8) !== 13 || chunkType(bytes, 12) !== "IHDR") return fail("png-header");
  const width = view.getUint32(16);
  const height = view.getUint32(20);
  if (width === 0 || height === 0) return fail("png-header");
  if (width > ART_LIMITS.pngMaxPx || height > ART_LIMITS.pngMaxPx) return fail("png-too-large");
  let at = 8;
  while (at + 12 <= bytes.length) {
    const next = at + 12 + view.getUint32(at);
    if (next > bytes.length) return fail("png-truncated");
    if (chunkType(bytes, at + 4) === "IEND") return next === bytes.length ? { ok: true, width, height } : fail("png-truncated");
    at = next;
  }
  return fail("png-truncated");
}

export function svgToDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
