// @vitest-environment node
import { describe, expect, it } from "vitest";
import { decodeWav, encodeWav, resample, sniffAudio, toTranscriberWav, WavError } from "./wav";

/** A PCM WAV with `channels` interleaved channels of a 440 Hz tone. */
function tone({ rate, channels, bits, seconds }: { rate: number; channels: number; bits: 16 | 32; seconds: number }) {
  const frames = Math.round(rate * seconds);
  const width = bits / 8;
  const bytes = new Uint8Array(44 + frames * channels * width);
  const view = new DataView(bytes.buffer);
  const text = (at: number, s: string) => [...s].forEach((c, i) => view.setUint8(at + i, c.charCodeAt(0)));
  text(0, "RIFF");
  view.setUint32(4, bytes.length - 8, true);
  text(8, "WAVE");
  text(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, bits === 32 ? 3 : 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * channels * width, true);
  view.setUint16(32, channels * width, true);
  view.setUint16(34, bits, true);
  text(36, "data");
  view.setUint32(40, frames * channels * width, true);
  for (let f = 0; f < frames; f++) {
    const v = 0.5 * Math.sin((2 * Math.PI * 440 * f) / rate);
    for (let c = 0; c < channels; c++) {
      const at = 44 + (f * channels + c) * width;
      if (bits === 32) view.setFloat32(at, v, true);
      else view.setInt16(at, Math.round(v * 32767), true);
    }
  }
  return bytes;
}

describe("sniffAudio", () => {
  it("tells containers apart by their magic bytes", () => {
    expect(sniffAudio(tone({ rate: 16000, channels: 1, bits: 16, seconds: 0.01 }))).toBe("wav");
    expect(sniffAudio(new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 0, 0]))).toBe("webm");
    expect(sniffAudio(new TextEncoder().encode("OggS\0\0"))).toBe("ogg");
    expect(sniffAudio(new TextEncoder().encode("\0\0\0\x18ftypM4A "))).toBe("mp4");
    expect(sniffAudio(new TextEncoder().encode("ID3\x04"))).toBe("mp3");
    expect(sniffAudio(new Uint8Array([0xff, 0xfb, 0x90]))).toBe("mp3");
    expect(sniffAudio(new Uint8Array([1, 2, 3]))).toBe("unknown");
  });
});

describe("WAV conversion", () => {
  it("passes a transcriber-ready file through unchanged", () => {
    const ready = tone({ rate: 16000, channels: 1, bits: 16, seconds: 0.5 });
    const { wav, seconds } = toTranscriberWav(ready);
    expect(wav).toBe(ready);
    expect(seconds).toBeCloseTo(0.5, 3);
  });

  it("downmixes and resamples 48 kHz stereo float to 16 kHz mono 16-bit", () => {
    const { wav, seconds } = toTranscriberWav(tone({ rate: 48000, channels: 2, bits: 32, seconds: 1 }));
    expect(seconds).toBeCloseTo(1, 3);
    const out = decodeWav(wav);
    expect(out.sampleRate).toBe(16000);
    expect(out.samples.length).toBe(16000);
    const view = new DataView(wav.buffer);
    expect(view.getUint16(22, true)).toBe(1);
    expect(view.getUint16(34, true)).toBe(16);
    // The tone survives: peak close to the 0.5 amplitude it was written with.
    const peak = out.samples.reduce((m, s) => Math.max(m, Math.abs(s)), 0);
    expect(peak).toBeGreaterThan(0.45);
    expect(peak).toBeLessThan(0.52);
  });

  it("round-trips samples through encode and decode", () => {
    const samples = Float32Array.from([0, 0.25, -0.25, 0.999, -1]);
    const back = decodeWav(encodeWav({ samples, sampleRate: 24000 }));
    expect(back.sampleRate).toBe(24000);
    back.samples.forEach((s, i) => expect(s).toBeCloseTo(samples[i], 3));
  });

  it("upsamples by interpolation", () => {
    const up = resample({ samples: Float32Array.from([0, 1]), sampleRate: 8000 }, 16000);
    expect(Array.from(up.samples)).toEqual([0, 0.5, 1, 1]);
  });

  it("rejects files it cannot read", () => {
    expect(() => decodeWav(new TextEncoder().encode("RIFF\0\0\0\0WAVEjunk"))).toThrow(WavError);
    const adpcm = tone({ rate: 16000, channels: 1, bits: 16, seconds: 0.01 });
    new DataView(adpcm.buffer).setUint16(20, 2, true);
    expect(() => decodeWav(adpcm)).toThrow(WavError);
  });
});
