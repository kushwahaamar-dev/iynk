import type { Level } from "../hints.ts";
import type { Mode } from "../modes.ts";

export type GuidedFlag = "code_withheld";
export type GuidedResult = { text: string; flags: GuidedFlag[] };

const MAX_FENCE_LINES = 6;
const MIN_CHANGE_RUN = 4;
const MAX_HELD_BYTES = 8 * 1024;

const isFence = (line: string) => /^\s*```/.test(line);
const isChange = (line: string) => /^[+-] /.test(line);
const isDiffHeader = (line: string) => /^(@@|\+\+\+ |--- )/.test(line);

export class GuidedStream {
  private readonly active: boolean;
  private partial = "";
  private out = "";
  private flagged = false;
  private lastWasNote = false;
  private fence: { lines: string[]; bytes: number; withholding: boolean } | null = null;
  private run: string[] = [];
  private runWithholding = false;

  constructor(
    ctx: { mode: Mode; level: Level },
    private readonly note: string,
  ) {
    this.active = (ctx.mode === "socratic" || ctx.mode === "beginner") && ctx.level < 3;
  }

  push(chunk: string): string {
    if (!this.active) return chunk;
    this.partial += chunk;
    let newline = this.partial.indexOf("\n");
    while (newline !== -1) {
      this.line(this.partial.slice(0, newline + 1));
      this.partial = this.partial.slice(newline + 1);
      newline = this.partial.indexOf("\n");
    }
    if (this.partial.length > MAX_HELD_BYTES) {
      this.line(this.partial);
      this.partial = "";
    }
    return this.take();
  }

  end(): GuidedResult {
    if (this.active) {
      if (this.partial) this.line(this.partial);
      this.partial = "";
      if (this.fence && !this.fence.withholding) this.emit(this.fence.lines.join(""));
      this.fence = null;
      this.flushRun();
    }
    return { text: this.take(), flags: this.flagged ? ["code_withheld"] : [] };
  }

  private take(): string {
    const text = this.out;
    this.out = "";
    return text;
  }

  private emit(text: string): void {
    this.out += text;
    this.lastWasNote = false;
  }

  private withhold(line: string): void {
    this.flagged = true;
    if (this.lastWasNote) return;
    this.out += this.note + (line.endsWith("\n") ? "\n" : "");
    this.lastWasNote = true;
  }

  private flushRun(): void {
    if (!this.runWithholding) this.emit(this.run.join(""));
    this.run = [];
    this.runWithholding = false;
  }

  private line(line: string): void {
    if (this.fence) {
      this.inFence(this.fence, line);
      return;
    }
    if (isFence(line)) {
      this.flushRun();
      this.fence = { lines: [line], bytes: line.length, withholding: false };
      return;
    }
    if (isDiffHeader(line)) {
      this.flushRun();
      this.withhold(line);
      return;
    }
    if (isChange(line)) {
      this.change(line);
      return;
    }
    this.flushRun();
    this.emit(line);
  }

  private change(line: string): void {
    if (this.runWithholding) {
      this.withhold(line);
      return;
    }
    this.run.push(line);
    if (this.run.length < MIN_CHANGE_RUN) return;
    this.run = [];
    this.runWithholding = true;
    this.withhold(line);
  }

  private inFence(fence: NonNullable<GuidedStream["fence"]>, line: string): void {
    if (fence.withholding) {
      if (isFence(line)) this.fence = null;
      return;
    }
    fence.lines.push(line);
    fence.bytes += line.length;
    if (isFence(line)) {
      this.emit(fence.lines.join(""));
      this.fence = null;
      return;
    }
    if (fence.lines.length - 1 > MAX_FENCE_LINES || fence.bytes > MAX_HELD_BYTES) {
      fence.withholding = true;
      fence.lines = [];
      this.withhold(line);
    }
  }
}

export function checkGuidedOutput(text: string, ctx: { mode: Mode; level: Level }, note: string): GuidedResult {
  const stream = new GuidedStream(ctx, note);
  const head = stream.push(text);
  const tail = stream.end();
  return { text: head + tail.text, flags: tail.flags };
}
