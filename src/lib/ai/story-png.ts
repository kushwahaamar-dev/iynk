// Draws a Build Story card onto a canvas for the PNG download and for sharing
// as a file: warm paper, an ink-bordered card on its offset shadow, the
// mustard title band, the cover, the story and who helped whom.

export type StoryPicture = {
  title: string;
  /** The story with its Markdown marks already removed. */
  text: string;
  cover: HTMLImageElement | null;
  credits: string[];
  footer: string;
};

const W = 1080;
const H = 1350;
const PAD = 72;
const INK = "#231e16";
const PAPER = "#f2efe7";
const SURFACE = "#faf8f2";
const MUSTARD = "#f4b829";
const MUTED = "#625b4f";

/** Plain text of the story's Markdown subset, for the canvas and share text. */
export function plainStory(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?(```|$)/g, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^\s*#{1,6}\s+/gm, "")
    .replace(/^\s*[-*•]\s+/gm, "• ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// CJK characters wrap one by one; other scripts wrap at spaces.
const TOKENS = /[\u3000-\u9fff\uff00-\uffef]|[^\s\u3000-\u9fff\uff00-\uffef]+|\s+/g;

export function wrapText(measure: (text: string) => number, text: string, width: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    let line = "";
    const push = () => {
      lines.push(line.trimEnd());
      line = "";
    };
    for (const token of paragraph.match(TOKENS) ?? []) {
      if (/^\s+$/.test(token)) {
        if (line) line += " ";
      } else if (measure(line + token) <= width) {
        line += token;
      } else {
        if (line.trim()) push();
        if (measure(token) <= width) {
          line = token;
        } else {
          // A word wider than the line is cut by characters.
          for (const ch of token) {
            if (line && measure(line + ch) > width) push();
            line += ch;
          }
        }
      }
    }
    push();
  }
  return lines;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export async function storyPng(story: StoryPicture, fonts: { body: string; head: string }): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas unavailable");

  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, W, H);
  const card = { x: 48, y: 48, w: W - 108, h: H - 108 };
  ctx.fillStyle = INK;
  roundRect(ctx, card.x + 12, card.y + 12, card.w, card.h, 34);
  ctx.fill();
  ctx.fillStyle = SURFACE;
  roundRect(ctx, card.x, card.y, card.w, card.h, 34);
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = INK;
  ctx.stroke();

  // Title band
  ctx.font = `800 54px ${fonts.head}`;
  const inner = card.w - PAD * 2 + 48;
  const title = wrapText((s) => ctx.measureText(s).width, story.title, inner).slice(0, 2);
  const band = 60 + title.length * 64;
  ctx.save();
  roundRect(ctx, card.x, card.y, card.w, card.h, 34);
  ctx.clip();
  ctx.fillStyle = MUSTARD;
  ctx.fillRect(card.x, card.y, card.w, band);
  ctx.restore();
  ctx.beginPath();
  ctx.moveTo(card.x, card.y + band);
  ctx.lineTo(card.x + card.w, card.y + band);
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.textBaseline = "top";
  title.forEach((line, i) => ctx.fillText(line, card.x + 48, card.y + 34 + i * 64));

  let y = card.y + band + 40;
  const left = card.x + 48;
  const width = card.w - 96;
  if (story.cover) {
    const h = Math.round(width * 0.5);
    const scale = Math.max(width / story.cover.naturalWidth, h / story.cover.naturalHeight);
    const sw = width / scale;
    const sh = h / scale;
    ctx.save();
    roundRect(ctx, left, y, width, h, 22);
    ctx.clip();
    ctx.drawImage(story.cover, (story.cover.naturalWidth - sw) / 2, (story.cover.naturalHeight - sh) / 2, sw, sh, left, y, width, h);
    ctx.restore();
    roundRect(ctx, left, y, width, h, 22);
    ctx.lineWidth = 5;
    ctx.stroke();
    y += h + 36;
  }

  const footerTop = card.y + card.h - 70;
  const creditLines = story.credits.slice(0, 3);
  const creditsTop = footerTop - creditLines.length * 38 - (creditLines.length ? 18 : 0);
  ctx.font = `400 30px ${fonts.body}`;
  const measure = (s: string) => ctx.measureText(s).width;
  const lines = wrapText(measure, story.text, width);
  const room = Math.max(0, Math.floor((creditsTop - y - 12) / 42));
  const shown = lines.slice(0, room);
  if (lines.length > room && shown.length) shown[shown.length - 1] = `${shown[shown.length - 1].replace(/\s*\S{0,3}$/, "")}…`;
  ctx.fillStyle = INK;
  shown.forEach((line, i) => ctx.fillText(line, left, y + i * 42));

  ctx.font = `700 28px ${fonts.body}`;
  creditLines.forEach((line, i) => ctx.fillText(wrapText(measure, line, width)[0] ?? "", left, creditsTop + i * 38));

  ctx.font = `700 24px ${fonts.body}`;
  ctx.fillStyle = MUTED;
  ctx.fillText(story.footer, left, footerTop + 12);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))), "image/png");
  });
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image failed to load"));
    img.src = src;
  });
}
