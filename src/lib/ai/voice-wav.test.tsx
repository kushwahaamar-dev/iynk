import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { VoiceButton } from "@/components/realtime/VoiceButton";
import type { TogetherT } from "@/components/realtime/messages";
import { transcribe } from "./client";
import { startRecording } from "./recorder";

const t = ((key: string) => key) as unknown as TogetherT;

class FakeMediaRecorder extends EventTarget {
  state = "inactive";
  mimeType: string;
  stream = { getTracks: () => [{ stop() {} }] };
  ondataavailable: ((event: Event) => void) | null = null;
  onstop: (() => void) | null = null;

  static isTypeSupported(type: string) {
    return type.startsWith("audio/webm");
  }

  constructor(_stream: MediaStream, opts?: { mimeType?: string }) {
    super();
    this.mimeType = opts?.mimeType ?? "audio/webm";
  }

  start() {
    this.state = "recording";
    const event = new Event("dataavailable");
    Object.defineProperty(event, "data", {
      value: new Blob([Uint8Array.from([1, 2, 3, 4])], { type: "audio/webm" }),
    });
    this.ondataavailable?.(event);
    this.dispatchEvent(event);
  }

  stop() {
    this.state = "inactive";
    this.onstop?.();
    this.dispatchEvent(new Event("stop"));
  }
}

class FakeAudioContext {
  decodeAudioData() {
    const frames = 4800;
    const channel = new Float32Array(frames).fill(0.5);
    return Promise.resolve({
      length: frames,
      numberOfChannels: 2,
      sampleRate: 48000,
      getChannelData: () => channel,
    });
  }

  close() {
    return Promise.resolve();
  }
}

function installRecording() {
  vi.stubGlobal("MediaRecorder", FakeMediaRecorder);
  vi.stubGlobal("AudioContext", FakeAudioContext);
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia: vi.fn(async () => ({ getTracks: () => [{ stop() {} }] })) },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  Reflect.deleteProperty(navigator, "mediaDevices");
});

function wavHeader(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const tag = (at: number) => String.fromCharCode(bytes[at]!, bytes[at + 1]!, bytes[at + 2]!, bytes[at + 3]!);
  return {
    riff: tag(0),
    wave: tag(8),
    format: view.getUint16(20, true),
    channels: view.getUint16(22, true),
    rate: view.getUint32(24, true),
    bits: view.getUint16(34, true),
  };
}

async function expectVoiceWav(init: RequestInit | undefined) {
  const form = init?.body as FormData;
  const file = form.get("audio") as File;
  expect(file.name).toBe("voice.wav");
  expect(file.type).toBe("audio/wav");
  const bytes = new Uint8Array(await file.arrayBuffer());
  expect(wavHeader(bytes)).toEqual({ riff: "RIFF", wave: "WAVE", format: 1, channels: 1, rate: 16000, bits: 16 });
}

describe("recorded voice", () => {
  test("a recorded clip reaches /api/ai/transcribe as audio/wav", async () => {
    installRecording();
    const recording = await startRecording(() => {});
    const clip = await recording.stop();
    expect(clip).not.toBeNull();
    expect(clip!.type).toContain("webm");

    const fetch = vi.fn(async () => Response.json({ text: "the led is off", lang: "en" }));
    await expect(transcribe(clip!, "es", { fetch })).resolves.toEqual({ text: "the led is off", lang: "en" });
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/ai/transcribe");
    expect(init.method).toBe("POST");
    expect((init.body as FormData).get("lang")).toBe("es");
    await expectVoiceWav(init);
  });

  test("a room voice note reaches /api/ai/transcribe as audio/wav", async () => {
    installRecording();
    const fetch = vi.fn(async () => Response.json({ text: "the resistor is backwards", lang: "en" }));
    vi.stubGlobal("fetch", fetch);
    const onText = vi.fn();
    render(<VoiceButton t={t} lang="en" enabled onText={onText} />);

    fireEvent.click(screen.getByRole("button", { name: "chat.voice.start" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "chat.voice.stop" })).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: "chat.voice.stop" }));

    await waitFor(() => expect(fetch).toHaveBeenCalled());
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/ai/transcribe");
    await expectVoiceWav(init);
    await waitFor(() => expect(onText).toHaveBeenCalledWith("the resistor is backwards", "en"));
  });
});
