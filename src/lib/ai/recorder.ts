// Push-to-talk recording. The browser records whatever container it can
// (webm/opus first). transcribe() decodes that clip to 16 kHz mono WAV
// before upload: /api/ai/transcribe rejects webm, ogg and mp4 with 415.

export const MAX_RECORD_MS = 60_000;

const TYPES = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4", "audio/wav"];

export function canRecord(): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.mediaDevices?.getUserMedia === "function" &&
    typeof MediaRecorder !== "undefined"
  );
}

export function pickAudioType(): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  return TYPES.find((type) => MediaRecorder.isTypeSupported(type)) ?? null;
}

export class RecorderError extends Error {
  readonly reason: "denied" | "unsupported";
  constructor(reason: "denied" | "unsupported") {
    super(reason);
    this.name = "RecorderError";
    this.reason = reason;
  }
}

export type Recording = {
  /** Stops and resolves with the audio, or null if nothing was recorded. */
  stop(): Promise<Blob | null>;
  cancel(): void;
};

/** Asks for the microphone and starts recording; `onLimit` fires when the cap stops it. */
export async function startRecording(onLimit: () => void): Promise<Recording> {
  const type = pickAudioType();
  if (!canRecord() || !type) throw new RecorderError("unsupported");
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
  } catch (error) {
    throw new RecorderError(error instanceof DOMException && error.name === "NotFoundError" ? "unsupported" : "denied");
  }
  const recorder = new MediaRecorder(stream, { mimeType: type, audioBitsPerSecond: 32_000 });
  const chunks: Blob[] = [];
  recorder.addEventListener("dataavailable", (event) => {
    if (event.data.size) chunks.push(event.data);
  });
  const release = () => {
    clearTimeout(limit);
    for (const track of stream.getTracks()) track.stop();
  };
  const finished = new Promise<Blob | null>((resolve) => {
    recorder.addEventListener("stop", () => {
      release();
      resolve(chunks.length ? new Blob(chunks, { type: type.split(";")[0] }) : null);
    });
  });
  const limit = setTimeout(onLimit, MAX_RECORD_MS);
  recorder.start(250);
  return {
    stop() {
      if (recorder.state !== "inactive") recorder.stop();
      return finished;
    },
    cancel() {
      chunks.length = 0;
      if (recorder.state !== "inactive") recorder.stop();
      else release();
    },
  };
}
