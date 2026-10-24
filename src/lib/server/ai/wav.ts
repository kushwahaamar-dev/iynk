import "server-only";

/**
 * Audio helpers for /api/ai/transcribe. Muse Voice Transcribe takes only
 * RIFF/WAVE with mono 16-bit PCM at 16 or 24 kHz, so any PCM or float WAV is
 * converted to 16 kHz mono here; other containers are recognised by their
 * magic bytes so the route can refuse them clearly.
 */

export type AudioKind = "wav" | "mp3" | "webm" | "ogg" | "mp4" | "unknown";

export function sniffAudio(bytes: Uint8Array): AudioKind {
  const ascii = (from: number, to: number) => String.fromCharCode(...bytes.subarray(from, to));
  if (bytes.length >= 12 && ascii(0, 4) === "RIFF" && ascii(8, 12) === "WAVE") return "wav";
  if (bytes.length >= 4 && bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) {
    return "webm";
  }
  if (bytes.length >= 4 && ascii(0, 4) === "OggS") return "ogg";
  if (bytes.length >= 8 && ascii(4, 8) === "ftyp") return "mp4";
  if (bytes.length >= 3 && ascii(0, 3) === "ID3") return "mp3";
  if (bytes.length >= 2 && bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0) return "mp3";
  return "unknown";
}

export type Pcm = { samples: Float32Array; sampleRate: number };

export class WavError extends Error {}

/** Decodes a PCM (8/16/24/32-bit) or IEEE float (32-bit) WAV to mono samples in [-1, 1]. */
export function decodeWav(bytes: Uint8Array): Pcm {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const tag = (at: number) => String.fromCharCode(bytes[at], bytes[at + 1], bytes[at + 2], bytes[at + 3]);
  if (bytes.length < 12 || tag(0) !== "RIFF" || tag(8) !== "WAVE") throw new WavError("not a WAV file");

  let format = 0;
  let channels = 0;
  let sampleRate = 0;
  let bits = 0;
  let data: { at: number; size: number } | null = null;
  for (let at = 12; at + 8 <= bytes.length; ) {
    const id = tag(at);
    const size = view.getUint32(at + 4, true);
    const body = at + 8;
    if (id === "fmt " && size >= 16) {
      format = view.getUint16(body, true);
      channels = view.getUint16(body + 2, true);
      sampleRate = view.getUint32(body + 4, true);
      bits = view.getUint16(body + 14, true);
      // WAVE_FORMAT_EXTENSIBLE keeps the real format in its sub-format GUID.
      if (format === 0xfffe && size >= 40) format = view.getUint16(body + 24, true);
    } else if (id === "data") {
      // Streaming encoders write 0 or 0xFFFFFFFF when they do not know the length yet.
      const available = bytes.length - body;
      data = { at: body, size: size === 0 || size > available ? available : size };
      break;
    }
    at = body + size + (size % 2);
  }
  if (!data || !channels || !sampleRate) throw new WavError("missing fmt or data chunk");
  const isFloat = format === 3 && bits === 32;
  if (!(format === 1 && [8, 16, 24, 32].includes(bits)) && !isFloat) throw new WavError("unsupported sample format");

  const width = bits / 8;
  const frames = Math.floor(data.size / (width * channels));
  const samples = new Float32Array(frames);
  for (let frame = 0; frame < frames; frame++) {
    let sum = 0;
    for (let ch = 0; ch < channels; ch++) {
      const at = data.at + (frame * channels + ch) * width;
      if (isFloat) sum += view.getFloat32(at, true);
      else if (bits === 8) sum += (view.getUint8(at) - 128) / 128;
      else if (bits === 16) sum += view.getInt16(at, true) / 32768;
      else if (bits === 24) sum += ((view.getUint8(at + 2) << 24) | (view.getUint8(at + 1) << 16) | (view.getUint8(at) << 8)) / 2147483648;
      else sum += view.getInt32(at, true) / 2147483648;
    }
    samples[frame] = sum / channels;
  }
  return { samples, sampleRate };
}

/** Resamples by averaging each output sample's source window (a box low-pass), which is plenty for speech. */
export function resample({ samples, sampleRate }: Pcm, rate: number): Pcm {
  if (sampleRate === rate) return { samples, sampleRate };
  const ratio = sampleRate / rate;
  const out = new Float32Array(Math.floor(samples.length / ratio));
  for (let i = 0; i < out.length; i++) {
    const start = i * ratio;
    if (ratio <= 1) {
      const j = Math.floor(start);
      const frac = start - j;
      out[i] = samples[j] * (1 - frac) + (samples[Math.min(j + 1, samples.length - 1)] ?? 0) * frac;
      continue;
    }
    const from = Math.floor(start);
    const to = Math.min(samples.length, Math.floor(start + ratio));
    let sum = 0;
    for (let j = from; j < to; j++) sum += samples[j];
    out[i] = sum / Math.max(1, to - from);
  }
  return { samples: out, sampleRate: rate };
}

export function encodeWav({ samples, sampleRate }: Pcm): Uint8Array {
  const bytes = new Uint8Array(44 + samples.length * 2);
  const view = new DataView(bytes.buffer);
  const write = (at: number, s: string) => [...s].forEach((c, i) => view.setUint8(at + i, c.charCodeAt(0)));
  write(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  write(8, "WAVE");
  write(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  write(36, "data");
  view.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, s < 0 ? s * 32768 : s * 32767, true);
  }
  return bytes;
}

/** True when the WAV is already what the transcriber wants: mono 16-bit PCM at 16 or 24 kHz. */
function isTranscriberReady(bytes: Uint8Array): boolean {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.length < 36) return false;
  const fmt = String.fromCharCode(bytes[12], bytes[13], bytes[14], bytes[15]);
  if (fmt !== "fmt ") return false;
  const rate = view.getUint32(24, true);
  return view.getUint16(20, true) === 1 && view.getUint16(22, true) === 1 && view.getUint16(34, true) === 16 && (rate === 16000 || rate === 24000);
}

/** Returns a WAV the transcriber accepts, plus its duration in seconds. */
export function toTranscriberWav(bytes: Uint8Array): { wav: Uint8Array; seconds: number } {
  const pcm = decodeWav(bytes);
  const seconds = pcm.samples.length / pcm.sampleRate;
  if (isTranscriberReady(bytes)) return { wav: bytes, seconds };
  return { wav: encodeWav(resample(pcm, 16000)), seconds };
}
