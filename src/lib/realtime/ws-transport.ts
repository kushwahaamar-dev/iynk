import {
  byteLength,
  HEARTBEAT_MS,
  MAX_FRAME_BYTES,
  MAX_SNAPSHOT_BYTES,
  parseServerMsg,
  PEER_TIMEOUT_MS,
  type ClientMsg,
  type ServerMsg,
} from "./protocol";
import { listeners, type Transport, type TransportStatus } from "./transport";

type WsOptions = {
  WebSocketImpl?: typeof WebSocket;
  /** Backoff after the n-th failed attempt: min(maxDelayMs, baseDelayMs * 2^n), with jitter. */
  baseDelayMs?: number;
  maxDelayMs?: number;
  heartbeatMs?: number;
  /** Silence after which the socket counts as dead and is replaced. */
  deadAfterMs?: number;
  random?: () => number;
};

/** The relay on Vultr (H7): JSON text frames, a ping every 15 s, reconnect with backoff. */
export function createWsTransport(url: string, options: WsOptions = {}): Transport {
  const Impl = options.WebSocketImpl ?? WebSocket;
  const baseDelay = options.baseDelayMs ?? 500;
  const maxDelay = options.maxDelayMs ?? 15_000;
  const heartbeatMs = options.heartbeatMs ?? HEARTBEAT_MS;
  const deadAfter = options.deadAfterMs ?? PEER_TIMEOUT_MS;
  const random = options.random ?? Math.random;

  const messages = listeners<ServerMsg>();
  const statuses = listeners<TransportStatus>();

  let join: (() => Extract<ClientMsg, { t: "join" }>) | null = null;
  let socket: WebSocket | null = null;
  let attempts = 0;
  let closed = false;
  let status: TransportStatus = "connecting";
  let lastHeard = 0;
  let heartbeat: ReturnType<typeof setInterval> | undefined;
  let retry: ReturnType<typeof setTimeout> | undefined;

  const setStatus = (next: TransportStatus) => {
    if (next === status) return;
    status = next;
    statuses.emit(next);
  };

  const stopTimers = () => {
    clearInterval(heartbeat);
    clearTimeout(retry);
    heartbeat = undefined;
    retry = undefined;
  };

  const scheduleReconnect = () => {
    if (closed || retry !== undefined) return;
    setStatus("reconnecting");
    const ceiling = Math.min(maxDelay, baseDelay * 2 ** attempts);
    attempts += 1;
    retry = setTimeout(() => {
      retry = undefined;
      open();
    }, ceiling / 2 + random() * (ceiling / 2));
  };

  const drop = (target: WebSocket) => {
    target.onopen = target.onmessage = target.onclose = target.onerror = null;
    try {
      target.close();
    } catch {
      // Already closing.
    }
  };

  function open() {
    if (closed || !join) return;
    if (socket) drop(socket);
    let next: WebSocket;
    try {
      next = new Impl(url);
    } catch {
      scheduleReconnect();
      return;
    }
    socket = next;
    next.onopen = () => {
      lastHeard = Date.now();
      next.send(JSON.stringify(join!()));
      clearInterval(heartbeat);
      heartbeat = setInterval(() => {
        if (Date.now() - lastHeard > deadAfter) {
          // Silent for too long: a half-open socket. Replace it.
          drop(next);
          socket = null;
          clearInterval(heartbeat);
          scheduleReconnect();
          return;
        }
        if (next.readyState === Impl.OPEN) next.send('{"t":"ping"}');
      }, heartbeatMs);
    };
    next.onmessage = (event: MessageEvent) => {
      lastHeard = Date.now();
      const msg = parseServerMsg(event.data);
      if (!msg) return;
      if (msg.t === "welcome") {
        attempts = 0;
        setStatus("open");
      }
      messages.emit(msg);
    };
    next.onclose = () => {
      if (socket !== next) return;
      socket = null;
      clearInterval(heartbeat);
      scheduleReconnect();
    };
    next.onerror = () => {
      // onclose follows and schedules the retry.
    };
  }

  const onOnline = () => {
    if (closed || status === "open") return;
    clearTimeout(retry);
    retry = undefined;
    attempts = 0;
    open();
  };

  return {
    kind: "ws",
    start(makeJoin) {
      join = makeJoin;
      if (typeof window !== "undefined") window.addEventListener("online", onOnline);
      open();
    },
    send(msg) {
      if (!socket || socket.readyState !== Impl.OPEN || status !== "open") return false;
      const text = JSON.stringify(msg);
      const limit = msg.t === "state" ? MAX_SNAPSHOT_BYTES : MAX_FRAME_BYTES;
      if (byteLength(text) > limit) return false;
      socket.send(text);
      return true;
    },
    onMessage: messages.add,
    onStatus: statuses.add,
    close() {
      if (closed) return;
      closed = true;
      stopTimers();
      if (typeof window !== "undefined") window.removeEventListener("online", onOnline);
      if (socket) drop(socket);
      socket = null;
      setStatus("closed");
      messages.clear();
      statuses.clear();
    },
  };
}
