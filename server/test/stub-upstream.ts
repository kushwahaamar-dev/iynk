import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { freePort } from "./helpers.ts";

export type Seen = { method: string; url: string; headers: IncomingMessage["headers"]; body: string };

export type Stub = {
  port: number;
  seen: Seen[];
  sockets: Set<import("node:net").Socket>;
  stop(): Promise<void>;
};

export async function startStub(answer: (req: IncomingMessage, res: ServerResponse, seen: Seen) => void): Promise<Stub> {
  const seen: Seen[] = [];
  const sockets = new Set<import("node:net").Socket>();
  const server: Server = createServer((req, res) => {
    const parts: Buffer[] = [];
    req.on("data", (part: Buffer) => parts.push(part));
    req.on("end", () => {
      const entry = { method: req.method ?? "", url: req.url ?? "", headers: req.headers, body: Buffer.concat(parts).toString("utf8") };
      seen.push(entry);
      answer(req, res, entry);
    });
  });
  server.on("connection", (socket) => {
    sockets.add(socket);
    socket.on("close", () => sockets.delete(socket));
  });
  const port = await freePort();
  await new Promise<void>((resolve) => server.listen(port, "127.0.0.1", resolve));
  return {
    port,
    seen,
    sockets,
    async stop() {
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    },
  };
}
