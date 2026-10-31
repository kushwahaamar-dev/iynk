import { gunzipSync, gzipSync } from "node:zlib";
import { CAPS } from "../../../src/protocol/frames.ts";
import type { ServerFrame } from "../../../src/protocol/frames.ts";
import { CLOSE } from "../../../src/protocol/close-codes.ts";

const GZIP_MARK = 0x01;

export type Decoded =
  | { ok: true; text: string }
  | { ok: false; code: "bad_frame" | "too_large"; close: number | null };

const TOO_LARGE: Decoded = { ok: false, code: "too_large", close: CLOSE.tooLarge };
const BAD_FRAME: Decoded = { ok: false, code: "bad_frame", close: null };

export function encodeFrame(f: ServerFrame, gzipOk: boolean): string | Buffer {
  const text = JSON.stringify(f);
  if (!gzipOk || Buffer.byteLength(text) <= CAPS.gzipAbove) return text;
  return Buffer.concat([Buffer.from([GZIP_MARK]), gzipSync(text)]);
}

export function decodeFrame(data: Buffer | string, isBinary: boolean): Decoded {
  if (!isBinary) {
    const text = typeof data === "string" ? data : data.toString("utf8");
    return Buffer.byteLength(text) > CAPS.clientWire ? TOO_LARGE : { ok: true, text };
  }
  if (typeof data === "string" || data[0] !== GZIP_MARK) return BAD_FRAME;
  try {
    return { ok: true, text: gunzipSync(data.subarray(1), { maxOutputLength: CAPS.clientInflated }).toString("utf8") };
  } catch (error) {
    return error instanceof RangeError ? TOO_LARGE : BAD_FRAME;
  }
}
