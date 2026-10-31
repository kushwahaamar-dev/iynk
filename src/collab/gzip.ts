/** Marks a binary frame as gzip. Any other first byte is a protocol error. */
export const GZIP_MARK = 0x01;

export class InflateCapError extends Error {
  constructor(readonly capBytes: number) {
    super(`inflated frame is larger than ${capBytes} bytes`);
    this.name = "InflateCapError";
  }
}

export function supportsGzip(): boolean {
  return typeof DecompressionStream === "function" && typeof CompressionStream === "function";
}

async function collect(stream: ReadableStream<Uint8Array>, capBytes: number | null): Promise<Uint8Array> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (capBytes !== null && total > capBytes) {
      await reader.cancel();
      throw new InflateCapError(capBytes);
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let at = 0;
  for (const chunk of chunks) {
    out.set(chunk, at);
    at += chunk.byteLength;
  }
  return out;
}

/** Inflates gzip bytes to text, stopping the read as soon as the output passes `capBytes`. */
export async function inflateCapped(bytes: Uint8Array, capBytes: number): Promise<string> {
  const inflated = new Blob([bytes as BlobPart]).stream().pipeThrough(new DecompressionStream("gzip"));
  return new TextDecoder().decode(await collect(inflated, capBytes));
}

/** The binary frame for a text: the gzip mark followed by the gzip stream. */
export async function deflateText(text: string): Promise<Uint8Array> {
  const deflated = new Blob([text]).stream().pipeThrough(new CompressionStream("gzip"));
  const body = await collect(deflated, null);
  const out = new Uint8Array(body.byteLength + 1);
  out[0] = GZIP_MARK;
  out.set(body, 1);
  return out;
}
