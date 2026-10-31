import { CAPS, CLOSE, parseServerFrame } from "../protocol/index.ts";
import type { Challenge, ClientFrame, Hello, RoomId, ServerFrame } from "../protocol/index.ts";
import { deflateText, GZIP_MARK, inflateCapped, InflateCapError, supportsGzip } from "./gzip.ts";

export type TransportState = "idle" | "connecting" | "open" | "closed";

export type CloseEvent = { code: number; retryAfterMs?: number; error?: Error };

export interface RoomTransport {
  readonly state: TransportState;
  connect(): void;
  /** Throws unless the transport is open. Large frames go out as gzip when the connection negotiated it. */
  send(frame: ClientFrame): void;
  close(code?: number): void;
  onFrame(h: (f: ServerFrame) => void): () => void;
  onClose(h: (e: CloseEvent) => void): () => void;
}

export type HelloSigner = (c: Challenge, room: RoomId | null) => Promise<Hello>;

export class BadBinaryFrame extends Error {
  constructor() {
    super("binary frame does not start with the gzip mark");
    this.name = "BadBinaryFrame";
  }
}

const HELLO_TIMEOUT_MS = 10000;

export function createListeners<T>() {
  const set = new Set<(value: T) => void>();
  return {
    add(h: (value: T) => void) {
      set.add(h);
      return () => {
        set.delete(h);
      };
    },
    emit(value: T) {
      for (const h of [...set]) h(value);
    },
  };
}

/** Runs jobs one after another, so a frame that needs gzip never overtakes the ones around it. */
function createLane() {
  let tail: Promise<void> = Promise.resolve();
  let busy = 0;
  return {
    get idle() {
      return busy === 0;
    },
    push(job: () => Promise<void>) {
      busy++;
      tail = tail.then(job).finally(() => {
        busy--;
      });
    },
  };
}

type Options = {
  url: string;
  room: RoomId | null;
  sign: HelloSigner;
  WebSocketCtor?: typeof WebSocket;
};

export function createWsTransport(o: Options): RoomTransport {
  const Ctor = o.WebSocketCtor ?? WebSocket;
  const frames = createListeners<ServerFrame>();
  const closes = createListeners<CloseEvent>();
  const inbound = createLane();
  const outbound = createLane();
  const warned = new Set<string>();
  let state: TransportState = "idle";
  let socket: WebSocket | null = null;
  let helloTimer: ReturnType<typeof setTimeout> | undefined;
  let helloStarted = false;
  let gzip = false;
  let retryAfterMs: number | undefined;
  let failure: Error | undefined;

  function shut(code: number, error?: Error) {
    if (error) failure = error;
    if (state === "closed") return;
    state = "closed";
    clearTimeout(helloTimer);
    socket?.close(code);
  }

  function warnUnknown(text: string) {
    if (text.length > CAPS.snapshotInflated) return;
    let type = "?";
    try {
      const t = (JSON.parse(text) as { t?: unknown }).t;
      if (typeof t === "string") type = t;
    } catch {
      return;
    }
    if (warned.has(type)) return;
    warned.add(type);
    console.warn(`rooms: ignoring server frame "${type}"`);
  }

  function deliver(text: string) {
    const frame = parseServerFrame(text);
    if (!frame) {
      warnUnknown(text);
      return;
    }
    if (frame.t === "error") retryAfterMs = frame.retryAfterMs;
    if (frame.t === "challenge") {
      if (!helloStarted) void handshake(frame);
      return;
    }
    if (helloStarted) frames.emit(frame);
  }

  async function handshake(challenge: Challenge) {
    helloStarted = true;
    try {
      const hello = await o.sign(challenge, o.room);
      if (state !== "connecting" || !socket) return;
      gzip = supportsGzip();
      const caps = gzip && !hello.caps.includes("gzip") ? [...hello.caps, "gzip"] : hello.caps;
      socket.send(JSON.stringify({ ...hello, caps }));
      clearTimeout(helloTimer);
      state = "open";
    } catch (e) {
      shut(CLOSE.unauthorized, e instanceof Error ? e : new Error(String(e)));
    }
  }

  async function deliverBinary(data: ArrayBuffer) {
    const bytes = new Uint8Array(data);
    if (bytes[0] !== GZIP_MARK) {
      shut(CLOSE.tooLarge, new BadBinaryFrame());
      return;
    }
    if (bytes.byteLength > CAPS.snapshotWire) {
      shut(CLOSE.tooLarge, new InflateCapError(CAPS.snapshotInflated));
      return;
    }
    try {
      deliver(await inflateCapped(bytes.subarray(1), CAPS.snapshotInflated));
    } catch (e) {
      shut(CLOSE.tooLarge, e instanceof Error ? e : new Error(String(e)));
    }
  }

  function onMessage(data: unknown) {
    if (state === "closed") return;
    if (typeof data === "string") {
      if (inbound.idle) deliver(data);
      else inbound.push(async () => deliver(data));
    } else if (data instanceof ArrayBuffer) {
      inbound.push(() => deliverBinary(data));
    }
  }

  return {
    get state() {
      return state;
    },
    connect() {
      if (state !== "idle") throw new Error("transport was already used");
      state = "connecting";
      const ws = new Ctor(o.url);
      socket = ws;
      ws.binaryType = "arraybuffer";
      ws.onopen = () => {
        helloTimer = setTimeout(() => shut(CLOSE.helloTimeout), HELLO_TIMEOUT_MS);
      };
      ws.onmessage = (e) => onMessage(e.data);
      ws.onclose = (e) => {
        state = "closed";
        clearTimeout(helloTimer);
        closes.emit({ code: e.code, ...(retryAfterMs !== undefined && { retryAfterMs }), ...(failure && { error: failure }) });
      };
    },
    send(frame) {
      if (state !== "open" || !socket) throw new Error("transport is not open");
      const ws = socket;
      const text = JSON.stringify(frame);
      if (gzip && text.length > CAPS.gzipAbove) {
        outbound.push(async () => {
          try {
            const bytes = await deflateText(text);
            if (state === "open") ws.send(bytes as Uint8Array<ArrayBuffer>);
          } catch (e) {
            shut(CLOSE.tooLarge, e instanceof Error ? e : new Error(String(e)));
          }
        });
      } else if (outbound.idle) {
        ws.send(text);
      } else {
        outbound.push(async () => {
          if (state === "open") ws.send(text);
        });
      }
    },
    close(code = 1000) {
      shut(code);
    },
    onFrame: frames.add,
    onClose: closes.add,
  };
}
