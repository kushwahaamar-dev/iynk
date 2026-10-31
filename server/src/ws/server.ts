import type { IncomingMessage } from "node:http";
import type { Duplex } from "node:stream";
import { WebSocketServer } from "ws";
import type { RawData, WebSocket } from "ws";
import type { RoomCore } from "../rooms/core.ts";
import type { Outbound } from "../rooms/types.ts";
import { addressKey } from "../http/limits.ts";
import { addressTag } from "./auth.ts";
import { emitToRoom, SocketSession } from "./dispatch.ts";
import type { WsDeps } from "./dispatch.ts";

const WS_PATH = "/ws";
const MAX_SOCKETS = 200;
const MAX_SOCKETS_PER_ADDRESS = 16;
const REFUSALS = { 403: "Forbidden", 404: "Not Found", 429: "Too Many Requests", 503: "Service Unavailable" } as const;

const toBuffer = (data: RawData): Buffer => (Buffer.isBuffer(data) ? data : Array.isArray(data) ? Buffer.concat(data) : Buffer.from(data));

function refuse(socket: Duplex, status: keyof typeof REFUSALS): void {
  socket.end(`HTTP/1.1 ${status} ${REFUSALS[status]}\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`);
}

export function createWsServer(d: WsDeps): {
  upgrade(req: IncomingMessage, socket: Duplex, head: Buffer): void;
  emit(core: RoomCore, out: Outbound[]): void;
  sockets(): number;
  drain(retryAfterMs: number): Promise<void>;
  close(): Promise<void>;
} {
  const wss = new WebSocketServer({ noServer: true, perMessageDeflate: false, maxPayload: 131072 });
  const sessions = new Map<WebSocket, SocketSession>();
  const perAddress = new Map<string, number>();
  let draining = false;

  const admit = (req: IncomingMessage): { tag: string } | keyof typeof REFUSALS => {
    if (new URL(req.url ?? "/", "http://localhost").pathname !== WS_PATH) return 404;
    const origin = req.headers.origin;
    if (origin === undefined || !d.origins.allows(origin)) return 403;
    if (draining) return 503;
    const ip = addressKey(req.socket.remoteAddress ?? "", (req.headers["x-forwarded-for"] as string | undefined) ?? null, d.trustProxy);
    const tag = addressTag(d.salt, ip);
    if (d.limiter.blocked(tag)) return 429;
    if (sessions.size >= MAX_SOCKETS || (perAddress.get(tag) ?? 0) >= MAX_SOCKETS_PER_ADDRESS) return 503;
    return { tag };
  };

  const track = (tag: string, delta: 1 | -1): void => {
    const next = (perAddress.get(tag) ?? 0) + delta;
    if (next <= 0) perAddress.delete(tag);
    else perAddress.set(tag, next);
  };

  return {
    upgrade(req, socket, head) {
      const admitted = admit(req);
      if (typeof admitted === "number") {
        refuse(socket, admitted);
        return;
      }
      const { tag } = admitted;
      wss.handleUpgrade(req, socket, head, (ws) => {
        const session = new SocketSession(ws, { tag }, d);
        sessions.set(ws, session);
        track(tag, 1);
        d.metrics.sockets(sessions.size);
        d.log.info("ws.open", { tag });
        ws.on("message", (data, isBinary) => session.onMessage(toBuffer(data), isBinary));
        ws.on("pong", () => session.onPong());
        ws.on("error", () => ws.terminate());
        ws.on("close", (code) => {
          session.onClose(code);
          sessions.delete(ws);
          track(tag, -1);
          d.metrics.sockets(sessions.size);
        });
      });
    },

    emit: (core, out) => emitToRoom(d, core, out),

    sockets: () => sessions.size,

    async drain(retryAfterMs) {
      draining = true;
      for (const core of d.registry.live()) emitToRoom(d, core, core.flush());
      for (const session of sessions.values()) session.restart(retryAfterMs);
    },

    async close() {
      draining = true;
      for (const ws of sessions.keys()) ws.terminate();
      await new Promise<void>((resolve) => wss.close(() => resolve()));
    },
  };
}
