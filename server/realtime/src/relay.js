import { createHash, randomBytes } from "node:crypto";
import { createServer, STATUS_CODES } from "node:http";
import { WebSocket, WebSocketServer } from "ws";
import { TokenBucket } from "./bucket.js";
import { originAllowed, resolveConfig } from "./config.js";
import { createLogger } from "./log.js";
import { parseClientFrame } from "./protocol.js";
import { Room } from "./room.js";

/**
 * @typedef {import('./room.js').Peer} Peer
 * @typedef {import('./room.js').Sync} Sync
 * @typedef {import('./protocol.js').PresenceUpdate} PresenceUpdate
 * @typedef {{
 *   ws: WebSocket, ip: string, tag: string, lastSeen: number, lastPing: number,
 *   room: Room | null, peer: Peer | null,
 *   frames: TokenBucket, cursor: TokenBucket, pose: TokenBucket,
 *   limitedAt: number, floodStart: number, floodDrops: number,
 *   joinTimer: NodeJS.Timeout | null, doomed: boolean,
 * }} Conn
 * @typedef {ReturnType<typeof createRelay>} Relay
 */

const PONG = JSON.stringify({ t: "pong" });
const now = () => performance.now();

/**
 * The room relay (HX-CONTRACT H7): an HTTP server with /healthz and /metrics that upgrades
 * `config.path` to WebSocket rooms. Nothing is stored outside memory.
 * @param {import('./config.js').RelayOptions & { logger?: import('./log.js').Logger }} [options]
 */
export function createRelay(options = {}) {
  const config = resolveConfig(options);
  const { limits } = config;
  const log = options.logger ?? createLogger(config.logLevel);
  /** @type {Map<string, Room>} */
  const rooms = new Map();
  /** @type {Set<Conn>} */
  const conns = new Set();
  /** @type {Map<string, number>} */
  const perIp = new Map();
  const salt = randomBytes(16);
  const startedAt = now();
  /** @type {{ in: number, out: number }[]} frames per second over the last 10 s */
  const rates = [];
  const stats = { framesIn: 0, framesOut: 0, dropped: 0, prevIn: 0, prevOut: 0 };
  let draining = false;
  /** @type {Promise<void> | null} */
  let closing = null;
  /** @type {(() => void) | null} */
  let onDrained = null;

  const http = createServer(onRequest);
  // closeTimeout is in ws 8.22 but not yet in @types/ws.
  const wss = new WebSocketServer(
    /** @type {import('ws').ServerOptions} */ ({
      noServer: true,
      clientTracking: false,
      perMessageDeflate: false,
      maxPayload: limits.maxPayloadBytes,
      closeTimeout: 5_000,
    }),
  );
  http.on("upgrade", onUpgrade);

  const timers = [
    setInterval(heartbeat, Math.max(10, Math.floor(limits.heartbeatMs / 3))),
    setInterval(sweep, Math.max(10, Math.min(60_000, Math.floor(limits.roomTtlMs / 4)))),
    setInterval(sample, 1_000),
  ];
  for (const timer of timers) timer.unref();

  /** A salted hash, so logs can tell abusive clients apart without holding their addresses. @param {string} ip */
  const tagOf = (ip) => createHash("sha256").update(salt).update(ip).digest("base64url").slice(0, 10);

  /** @param {import('node:http').IncomingMessage} req */
  function clientIp(req) {
    if (config.trustProxy) {
      // Caddy appends the address it saw; anything to the left of it came from the client.
      const header = req.headers["x-forwarded-for"];
      const last = (Array.isArray(header) ? header.at(-1) : header)?.split(",").at(-1)?.trim();
      if (last) return last;
    }
    return req.socket.remoteAddress ?? "unknown";
  }

  /** @param {import('node:http').IncomingMessage} req @param {import('node:stream').Duplex} socket @param {Buffer} head */
  function onUpgrade(req, socket, head) {
    socket.on("error", () => socket.destroy());
    if (draining) return refuseUpgrade(socket, 503, "The relay is restarting.");
    if ((req.url ?? "/").split("?")[0] !== config.path) return refuseUpgrade(socket, 404, "Not found.");
    const origin = req.headers.origin;
    if (!originAllowed(config.origins, origin)) {
      log.warn("origin_refused", { origin });
      return refuseUpgrade(socket, 403, "Origin not allowed.");
    }
    const ip = clientIp(req);
    if (conns.size >= limits.maxConnections) {
      log.warn("connections_full", { connections: conns.size });
      return refuseUpgrade(socket, 503, "The relay is full.");
    }
    if ((perIp.get(ip) ?? 0) >= limits.maxConnectionsPerIp) {
      log.warn("ip_limit", { ip: tagOf(ip) });
      return refuseUpgrade(socket, 429, "Too many connections from your address.");
    }
    wss.handleUpgrade(req, socket, head, (ws) => onConnection(ws, ip));
  }

  /** @param {import('node:stream').Duplex} socket @param {number} status @param {string} message */
  function refuseUpgrade(socket, status, message) {
    if (!socket.writable) return void socket.destroy();
    socket.once("finish", () => socket.destroy());
    socket.end(
      `HTTP/1.1 ${status} ${STATUS_CODES[status]}\r\nConnection: close\r\nContent-Type: text/plain; charset=utf-8\r\n` +
        `Content-Length: ${Buffer.byteLength(message)}\r\n\r\n${message}`,
    );
  }

  /** @param {WebSocket} ws @param {string} ip */
  function onConnection(ws, ip) {
    const t = now();
    /** @type {Conn} */
    const conn = {
      ws,
      ip,
      tag: tagOf(ip),
      lastSeen: t,
      lastPing: t,
      room: null,
      peer: null,
      frames: new TokenBucket(limits.framesPerSecond, limits.framesPerSecond, t),
      cursor: new TokenBucket(limits.streamHz, limits.streamBurst, t),
      pose: new TokenBucket(limits.streamHz, limits.streamBurst, t),
      limitedAt: -Infinity,
      floodStart: t,
      floodDrops: 0,
      joinTimer: null,
      doomed: false,
    };
    conn.joinTimer = setTimeout(() => {
      conn.joinTimer = null;
      if (!conn.peer) refuse(conn, "join_timeout", "Send join within 10 seconds of connecting.", 4000);
    }, limits.joinTimeoutMs);
    conns.add(conn);
    perIp.set(ip, (perIp.get(ip) ?? 0) + 1);
    ws.on("message", (data, isBinary) => onFrame(conn, /** @type {Buffer} */ (data), isBinary));
    ws.on("pong", () => {
      conn.lastSeen = now();
    });
    ws.on("close", () => onClose(conn));
    ws.on("error", (error) => log.debug("socket_error", { ip: conn.tag, error: error.message }));
  }

  /** @param {Conn} conn @param {Buffer} data @param {boolean} isBinary */
  function onFrame(conn, data, isBinary) {
    const t = now();
    conn.lastSeen = t;
    stats.framesIn += 1;
    if (!conn.frames.take(t)) return limited(conn, t);
    if (isBinary) return sendError(conn, "bad_message", "Send JSON text frames, not binary.");
    if (data.length > limits.maxStateFrameBytes) return sendError(conn, "too_large", "Frames are capped at 64 KB (state frames at 513 KB).");
    const parsed = parseClientFrame(data.toString("utf8"));
    if (!parsed.ok) {
      if (!conn.peer && parsed.t === "join") return refuse(conn, parsed.code, parsed.message, 4000);
      return sendError(conn, parsed.code, parsed.message);
    }
    const msg = parsed.msg;
    if (msg.t !== "state" && data.length > limits.maxFrameBytes) return sendError(conn, "too_large", "Frames are capped at 64 KB.");
    if (msg.t === "ping") return send(conn, PONG);
    const { peer, room } = conn;
    if (!peer || !room) {
      if (msg.t === "join") return join(conn, msg);
      return sendError(conn, "not_joined", "Send join first.");
    }
    switch (msg.t) {
      case "join":
        return sendError(conn, "already_joined", "This socket is in a room already; open another one to switch rooms.");
      case "action":
        return onAction(room, peer, msg.action);
      case "state":
        return onState(room, peer, msg, data.length);
      case "chat": {
        const frame = JSON.stringify({ t: "chat", from: peer.id, name: peer.record.name, id: msg.id, text: msg.text, lang: msg.lang, kind: msg.kind, ts: Date.now() });
        room.addChat(frame);
        return broadcast(room, frame);
      }
      case "presence":
        return onPresence(room, peer, msg.update);
      case "cursor":
        if (!conn.cursor.take(t)) return void (stats.dropped += 1);
        return broadcast(room, JSON.stringify({ t: "cursor", from: peer.id, x: msg.x, y: msg.y }), peer, true);
      case "pose":
        if (!conn.pose.take(t)) return void (stats.dropped += 1);
        return broadcast(room, JSON.stringify({ ...msg, from: peer.id }), peer, true);
      case "kick":
        return onKick(room, peer, msg.id);
    }
  }

  /** Over the frame rate: drop, say so at most once a second, and cut off a sustained flood. @param {Conn} conn @param {number} t */
  function limited(conn, t) {
    stats.dropped += 1;
    if (t - conn.floodStart > limits.floodWindowMs) {
      conn.floodStart = t;
      conn.floodDrops = 0;
    }
    conn.floodDrops += 1;
    if (conn.floodDrops > limits.floodDrops) {
      log.warn("flood", { room: conn.room?.id, peer: conn.peer?.id, ip: conn.tag });
      return refuse(conn, "rate_limited", "Too many frames; disconnected.", 1008);
    }
    if (t - conn.limitedAt >= 1_000) {
      conn.limitedAt = t;
      sendError(conn, "rate_limited", `Over ${limits.framesPerSecond} frames per second; frames are being dropped.`);
    }
  }

  /** @param {Conn} conn @param {import('./protocol.js').JoinMsg} msg */
  function join(conn, msg) {
    let room = rooms.get(msg.room);
    if (!room) {
      if (rooms.size >= limits.maxRooms) {
        log.warn("rooms_full", { rooms: rooms.size });
        return refuse(conn, "server_full", "The relay is at its room limit; try again later.", 1013);
      }
      room = new Room(msg.room, limits, now());
      rooms.set(room.id, room);
      log.info("room_open", { room: room.id });
    }
    if (room.banned.has(msg.peer.id)) return refuse(conn, "kicked", "The host removed you from this room.", 4003);
    const existing = room.peers.get(msg.peer.id) ?? null;
    if (!existing && room.peers.size >= limits.maxPeers) {
      return refuse(conn, "room_full", `This room already has ${limits.maxPeers} people.`, 4004);
    }
    if (msg.lab !== null && (room.lab !== msg.lab || room.itemId !== msg.itemId)) {
      const others = room.peers.size - (existing ? 1 : 0);
      if (room.lab !== null && others > 0) {
        return refuse(conn, "wrong_item", "This room is building another lab item.", 4009, { lab: room.lab, itemId: room.itemId });
      }
      if (room.lab !== null) room.restart();
      room.bind(msg.lab, msg.itemId);
    }
    if (conn.joinTimer) clearTimeout(conn.joinTimer);
    conn.joinTimer = null;

    /** @type {Peer} */
    let peer;
    if (existing) {
      const old = existing.conn;
      old.peer = null;
      old.room = null;
      sendError(old, "replaced", "You joined this room from another connection.");
      if (old.ws.readyState === WebSocket.OPEN) old.ws.close(4001, "replaced");
      endSync(existing);
      existing.conn = conn;
      existing.record = msg.peer;
      peer = existing;
      // Snapshot requests the old socket never answered go to the new one.
      for (const other of room.peers.values()) {
        if (other.sync?.from === peer.id) {
          resetRequest(other.sync);
          other.sync.asked.delete(peer.id);
        }
      }
    } else {
      peer = { id: msg.peer.id, record: msg.peer, conn, sync: null };
      room.peers.set(peer.id, peer);
      room.emptySince = null;
    }
    conn.peer = peer;
    conn.room = room;
    if (peer.record.baton) clearBatons(room, peer, false);
    broadcast(room, JSON.stringify({ t: "peer", peer: peer.record }), peer);

    /** @type {'none' | 'snapshot' | 'replay'} */
    let sync = "snapshot";
    if (msg.since !== null && msg.epoch === room.epoch && room.canReplayFrom(msg.since)) sync = "replay";
    else if (room.synced(peer).length === 0) sync = "none";
    send(
      conn,
      JSON.stringify({
        t: "welcome",
        you: peer.id,
        room: room.id,
        peers: room.records(),
        host: room.hostId,
        seq: room.seq,
        lab: room.lab,
        itemId: room.itemId,
        epoch: room.epoch,
        sync,
      }),
    );
    for (const frame of room.chat) send(conn, frame);
    if (sync === "replay" && msg.since !== null) for (const frame of room.actionsAfter(msg.since)) send(conn, frame);
    if (sync === "snapshot") peer.sync = { from: null, asked: new Set(), timer: null };
    log.info("join", { room: room.id, peer: peer.id, peers: room.peers.size, sync, replaced: existing !== null, ip: conn.tag });
    pump(room);
  }

  /**
   * Gets every waiting joiner a snapshot request to a peer that holds the state. With nobody
   * holding it, the earliest joiner keeps its own state and the rest are served from it.
   * @param {Room} room
   */
  function pump(room) {
    if (room.pumping) {
      room.pumpAgain = true;
      return;
    }
    room.pumping = true;
    try {
      do {
        room.pumpAgain = false;
        const waiting = room.waiting();
        if (waiting.length === 0) break;
        if (room.synced().length === 0) {
          const first = waiting[0];
          endSync(first);
          send(first.conn, JSON.stringify({ t: "state", from: first.id, snapshot: null, seq: room.seq }));
          log.info("promote", { room: room.id, peer: first.id, seq: room.seq });
        }
        const providers = room.synced();
        for (const joiner of room.waiting()) {
          const sync = joiner.sync;
          if (!sync || sync.from !== null) continue;
          const provider = providers.find((p) => !sync.asked.has(p.id));
          if (provider) ask(room, joiner, sync, provider);
          else refuse(joiner.conn, "snapshot_unavailable", "Nobody in the room sent its state; rejoin to try again.", 4010);
        }
      } while (room.pumpAgain);
    } finally {
      room.pumping = false;
    }
  }

  /** @param {Room} room @param {Peer} joiner @param {Sync} sync @param {Peer} provider */
  function ask(room, joiner, sync, provider) {
    sync.from = provider.id;
    sync.asked.add(provider.id);
    send(provider.conn, JSON.stringify({ t: "snapshot-request", from: joiner.id }));
    sync.timer = setTimeout(() => {
      if (joiner.sync !== sync || sync.from !== provider.id) return;
      sync.from = null;
      sync.timer = null;
      log.info("snapshot_timeout", { room: room.id, from: provider.id, to: joiner.id });
      pump(room);
    }, limits.snapshotTimeoutMs);
  }

  /** @param {Sync} sync */
  function resetRequest(sync) {
    if (sync.timer) clearTimeout(sync.timer);
    sync.timer = null;
    sync.from = null;
  }

  /** @param {Peer} peer */
  function endSync(peer) {
    if (peer.sync) resetRequest(peer.sync);
    peer.sync = null;
  }

  /** @param {Room} room @param {Peer} peer @param {import('./protocol.js').StateMsg} msg @param {number} size */
  function onState(room, peer, msg, size) {
    const target = room.peers.get(msg.to);
    const sync = target?.sync;
    if (!target || !sync || sync.from !== peer.id) return sendError(peer.conn, "not_asked", "Nobody asked you for that snapshot.");
    if (msg.seq > room.seq || !room.canReplayFrom(msg.seq)) {
      if (msg.seq > room.seq) sendError(peer.conn, "bad_message", "seq is ahead of the room.");
      else sendError(peer.conn, "snapshot_stale", "That snapshot is older than the relay's action log; send a fresh one.");
      resetRequest(sync);
      return pump(room);
    }
    endSync(target);
    send(target.conn, JSON.stringify({ t: "state", from: peer.id, snapshot: msg.snapshot, seq: msg.seq }));
    const replay = room.actionsAfter(msg.seq);
    for (const frame of replay) send(target.conn, frame);
    log.info("snapshot", { room: room.id, from: peer.id, to: target.id, bytes: size, seq: msg.seq, replayed: replay.length });
  }

  /** @param {Room} room @param {Peer} peer @param {import('./protocol.js').Action} action */
  function onAction(room, peer, action) {
    if (peer.sync) return sendError(peer.conn, "not_synced", "Wait for the room's state before sending actions.");
    const frame = room.appendAction(peer.id, action);
    for (const other of room.peers.values()) if (other.sync === null) send(other.conn, frame);
  }

  /** @param {Room} room @param {Peer} peer @param {PresenceUpdate} update */
  function onPresence(room, peer, update) {
    if (Object.keys(update).length === 0) return;
    const record = peer.record;
    if (update.role === null) delete record.role;
    else if (update.role !== undefined) record.role = update.role;
    if (update.status === null) delete record.status;
    else if (update.status !== undefined) record.status = update.status;
    if (update.name !== undefined) record.name = update.name;
    if (update.done !== undefined) record.done = update.done;
    if (update.baton === true) {
      record.baton = true;
      clearBatons(room, peer, true);
    } else if (update.baton === false) delete record.baton;
    broadcast(room, JSON.stringify({ t: "presence", from: peer.id, ...update }));
  }

  /** One baton per room: taking it clears everyone else's. @param {Room} room @param {Peer} holder @param {boolean} tellHolder */
  function clearBatons(room, holder, tellHolder) {
    for (const other of room.peers.values()) {
      if (other === holder || !other.record.baton) continue;
      delete other.record.baton;
      broadcast(room, JSON.stringify({ t: "presence", from: other.id, baton: false }), tellHolder ? null : holder);
    }
  }

  /** @param {Room} room @param {Peer} peer @param {string} id */
  function onKick(room, peer, id) {
    if (room.hostId !== peer.id) return sendError(peer.conn, "not_host", "Only the host can remove someone.");
    const target = room.peers.get(id);
    if (!target || target === peer) return sendError(peer.conn, "bad_target", "That person isn't in this room.");
    room.ban(target.id);
    log.info("kick", { room: room.id, by: peer.id, peer: target.id });
    refuse(target.conn, "kicked", "The host removed you from this room.", 4003);
  }

  /** Takes the connection's peer out of its room and tells the others. @param {Conn} conn @param {string} reason */
  function detach(conn, reason) {
    const { peer, room } = conn;
    conn.peer = null;
    conn.room = null;
    if (conn.joinTimer) clearTimeout(conn.joinTimer);
    conn.joinTimer = null;
    if (!peer || !room || peer.conn !== conn) return;
    const wasHost = room.hostId === peer.id;
    endSync(peer);
    room.peers.delete(peer.id);
    log.info("leave", { room: room.id, peer: peer.id, reason, peers: room.peers.size });
    if (room.peers.size === 0) {
      room.emptySince = now();
      return;
    }
    broadcast(room, JSON.stringify({ t: "leave", id: peer.id }));
    if (wasHost) broadcast(room, JSON.stringify({ t: "host", id: room.hostId }));
    for (const other of room.peers.values()) if (other.sync?.from === peer.id) resetRequest(other.sync);
    pump(room);
  }

  /** @param {Conn} conn @param {string} code @param {string} message @param {number} closeCode @param {Record<string, unknown>} [extra] */
  function refuse(conn, code, message, closeCode, extra) {
    sendError(conn, code, message, extra);
    detach(conn, code);
    if (conn.ws.readyState === WebSocket.OPEN) conn.ws.close(closeCode, code);
  }

  /** @param {Conn} conn */
  function onClose(conn) {
    conns.delete(conn);
    const count = (perIp.get(conn.ip) ?? 1) - 1;
    if (count > 0) perIp.set(conn.ip, count);
    else perIp.delete(conn.ip);
    detach(conn, "closed");
    if (draining && conns.size === 0) onDrained?.();
  }

  /** @param {Conn} conn @param {string} text @param {boolean} [lossy] cursor and pose frames, skipped under backpressure */
  function send(conn, text, lossy = false) {
    const ws = conn.ws;
    if (ws.readyState !== WebSocket.OPEN || conn.doomed) return;
    if (lossy && ws.bufferedAmount > limits.lossyBufferedBytes) return void (stats.dropped += 1);
    if (ws.bufferedAmount > limits.maxBufferedBytes) {
      // A peer this far behind can't keep the total order; cut it off and let it rejoin.
      conn.doomed = true;
      log.warn("slow_consumer", { room: conn.room?.id, peer: conn.peer?.id, buffered: ws.bufferedAmount });
      setImmediate(() => {
        detach(conn, "slow");
        ws.terminate();
      });
      return;
    }
    ws.send(text);
    stats.framesOut += 1;
  }

  /** @param {Room} room @param {string} text @param {Peer | null} [except] @param {boolean} [lossy] */
  function broadcast(room, text, except = null, lossy = false) {
    for (const peer of room.peers.values()) if (peer !== except) send(peer.conn, text, lossy);
  }

  /** @param {Conn} conn @param {string} code @param {string} message @param {Record<string, unknown>} [extra] */
  function sendError(conn, code, message, extra) {
    send(conn, JSON.stringify({ t: "error", code, message, ...extra }));
  }

  function heartbeat() {
    const t = now();
    for (const conn of conns) {
      if (t - conn.lastSeen > limits.peerTimeoutMs) {
        detach(conn, "timeout");
        conn.ws.terminate();
      } else if (t - conn.lastPing >= limits.heartbeatMs && conn.ws.readyState === WebSocket.OPEN) {
        conn.lastPing = t;
        conn.ws.ping();
      }
    }
  }

  function sweep() {
    const t = now();
    for (const room of rooms.values()) {
      if (room.peers.size === 0 && room.emptySince !== null && t - room.emptySince >= limits.roomTtlMs) {
        rooms.delete(room.id);
        log.info("room_expired", { room: room.id, seq: room.seq });
      }
    }
  }

  function sample() {
    rates.push({ in: stats.framesIn - stats.prevIn, out: stats.framesOut - stats.prevOut });
    if (rates.length > 10) rates.shift();
    stats.prevIn = stats.framesIn;
    stats.prevOut = stats.framesOut;
  }

  function metrics() {
    let peers = 0;
    let active = 0;
    for (const room of rooms.values()) {
      peers += room.peers.size;
      if (room.peers.size > 0) active += 1;
    }
    const seconds = rates.length || 1;
    const sum = rates.reduce((acc, s) => ({ in: acc.in + s.in, out: acc.out + s.out }), { in: 0, out: 0 });
    return {
      rooms: rooms.size,
      activeRooms: active,
      peers,
      connections: conns.size,
      framesPerSecond: { in: Math.round(sum.in / seconds), out: Math.round(sum.out / seconds) },
      totals: { framesIn: stats.framesIn, framesOut: stats.framesOut, dropped: stats.dropped },
      uptimeSec: Math.round((now() - startedAt) / 1000),
      memoryMB: Math.round(process.memoryUsage.rss() / (1024 * 1024)),
    };
  }

  /** @param {import('node:http').IncomingMessage} req @param {import('node:http').ServerResponse} res */
  function onRequest(req, res) {
    const path = (req.url ?? "/").split("?")[0];
    const origin = req.headers.origin;
    /** @type {Record<string, string>} */
    const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", Vary: "Origin" };
    if (origin !== undefined && originAllowed(config.origins, origin)) headers["Access-Control-Allow-Origin"] = origin;
    const head = req.method === "HEAD";
    if (req.method !== "GET" && !head) {
      return reply(res, head, 405, { ...headers, Allow: "GET, HEAD" }, { error: { code: "method_not_allowed", message: "Use GET." } });
    }
    if (path === "/healthz") return reply(res, head, draining ? 503 : 200, headers, { ok: !draining, draining, uptimeSec: Math.round((now() - startedAt) / 1000) });
    if (path === "/metrics") return reply(res, head, 200, headers, metrics());
    if (path === config.path) {
      return reply(res, head, 426, { ...headers, Upgrade: "websocket" }, { error: { code: "upgrade_required", message: "Connect with a WebSocket." } });
    }
    return reply(res, head, 404, headers, { error: { code: "not_found", message: "Not found." } });
  }

  /** @param {import('node:http').ServerResponse} res @param {boolean} head @param {number} status @param {Record<string, string>} headers @param {unknown} body */
  function reply(res, head, status, headers, body) {
    const text = JSON.stringify(body);
    res.writeHead(status, { ...headers, "Content-Type": "application/json; charset=utf-8", "Content-Length": Buffer.byteLength(text) });
    res.end(head ? undefined : text);
  }

  /** Resolves with the bound port. @param {number} [port] @param {string} [host] @returns {Promise<number>} */
  function listen(port = config.port, host = config.host) {
    return new Promise((resolve, reject) => {
      /** @param {Error} error */
      const onError = (error) => {
        http.off("listening", onListening);
        reject(error);
      };
      const onListening = () => {
        http.off("error", onError);
        const address = http.address();
        resolve(typeof address === "object" && address !== null ? address.port : port);
      };
      http.once("error", onError);
      http.once("listening", onListening);
      http.listen(port, host);
    });
  }

  /** Graceful shutdown: refuse new sockets, close every peer with 1012 (restart), wait briefly, then stop. */
  function close() {
    if (closing) return closing;
    draining = true;
    closing = (async () => {
      for (const timer of timers) clearInterval(timer);
      log.info("shutdown", { connections: conns.size, rooms: rooms.size });
      for (const room of rooms.values()) for (const peer of room.peers.values()) endSync(peer);
      rooms.clear();
      for (const conn of conns) {
        conn.peer = null;
        conn.room = null;
        if (conn.joinTimer) clearTimeout(conn.joinTimer);
        if (conn.ws.readyState === WebSocket.OPEN) conn.ws.close(1012, "restarting");
      }
      if (conns.size > 0) {
        await new Promise((resolve) => {
          onDrained = () => resolve(undefined);
          setTimeout(resolve, limits.shutdownGraceMs).unref();
        });
      }
      for (const conn of conns) conn.ws.terminate();
      await new Promise((resolve) => {
        http.close(() => resolve(undefined));
        http.closeAllConnections();
      });
      wss.close();
    })();
    return closing;
  }

  return {
    http,
    log,
    listen,
    close,
    metrics,
    get draining() {
      return draining;
    },
  };
}
