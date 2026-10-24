// MediaRecorder hands back webm, ogg or mp4. Muse Voice Transcribe takes a
// 16-bit PCM WAV, so both voice paths decode the clip in the browser and
// upload that WAV. 60 seconds of 16 kHz mono is about 1.9 MB.

export const VOICE_RATE = 16_000;

export class VoiceWavError extends Error {
  constructor() {
    super("could not decode the recording");
    this.name = "VoiceWavError";
  }
}

/** Average channels into one mono stream in the decoder's sample rate. */
export function mixToMono(buffer: AudioBuffer): Float32Array {
  const frames = buffer.length;
  const channels = buffer.numberOfChannels;
  const mixed = new Float32Array(frames);
  if (frames === 0 || channels === 0) return mixed;
  for (let channel = 0; channel < channels; channel++) {
    const data = buffer.getChannelData(channel);
    for (let i = 0; i < frames; i++) mixed[i] += data[i] / channels;
  }
  return mixed;
}

/** Box-filter resample. Speech does not need a sharper low-pass than this. */
export function resampleMono(samples: Float32Array, fromRate: number, toRate: number): Float32Array {
  if (fromRate === toRate || samples.length === 0) return samples;
  const ratio = fromRate / toRate;
  const out = new Float32Array(Math.max(0, Math.floor(samples.length / ratio)));
  for (let i = 0; i < out.length; i++) {
    const start = i * ratio;
    if (ratio <= 1) {
      const index = Math.floor(start);
      const frac = start - index;
      const left = samples[index] ?? 0;
      const right = samples[Math.min(index + 1, samples.length - 1)] ?? 0;
      out[i] = left * (1 - frac) + right * frac;
      continue;
    }
    const from = Math.floor(start);
    const to = Math.min(samples.length, Math.floor(start + ratio));
    let sum = 0;
    for (let j = from; j < to; j++) sum += samples[j];
    out[i] = sum / Math.max(1, to - from);
  }
  return out;
}

/** 16-bit mono PCM in a 44-byte RIFF/WAVE header. */
export function pcmToWav(samples: Float32Array, sampleRate: number): Blob {
  const bytes = new Uint8Array(44 + samples.length * 2);
  const view = new DataView(bytes.buffer);
  const write = (at: number, text: string) => {
    for (let i = 0; i < text.length; i++) view.setUint8(at + i, text.charCodeAt(i));
  };
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
    const sample = Math.max(-1, Math.min(1, samples[i] ?? 0));
    view.setInt16(44 + i * 2, sample < 0 ? Math.round(sample * 32768) : Math.round(sample * 32767), true);
  }
  return new Blob([bytes], { type: "audio/wav" });
}

/** Decode a MediaRecorder blob and return 16 kHz mono WAV. */
export async function blobToVoiceWav(blob: Blob): Promise<Blob> {
  if (typeof AudioContext === "undefined") throw new VoiceWavError();
  const ctx = new AudioContext();
  try {
    const copy = (await blob.arrayBuffer()).slice(0);
    const decoded = await ctx.decodeAudioData(copy);
    const mono = mixToMono(decoded);
    const speech = resampleMono(mono, decoded.sampleRate, VOICE_RATE);
    return pcmToWav(speech, VOICE_RATE);
  } catch (error) {
    if (error instanceof VoiceWavError) throw error;
    throw new VoiceWavError();
  } finally {
    try {
      await ctx.close?.();
    } catch {
      // The samples are already copied out of the decoder.
    }
  }
}
