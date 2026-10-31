import type { ClientFrame, ServerFrame } from "../protocol/index.ts";
import { createListeners } from "./ws-transport.ts";
import type { CloseEvent, RoomTransport, TransportState } from "./ws-transport.ts";

export type NetworkOptions = { seed: number; latencyMs: [min: number, max: number]; dropRate: number };

/** The server's end of one connection. */
export interface MemoryConn {
  readonly id: number;
  send(frame: ServerFrame): void;
  /** Frames already sent still arrive first. */
  close(code?: number): void;
}

export interface MemoryServerPort {
  onOpen(conn: MemoryConn): void;
  onFrame(conn: MemoryConn, f: ClientFrame): void;
  onClose(conn: MemoryConn): void;
}

type Event = { at: number; order: number; run: () => void };

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function earlier(a: Event, b: Event): boolean {
  return a.at < b.at || (a.at === b.at && a.order < b.order);
}

function createHeap() {
  const items: Event[] = [];
  return {
    peek: () => items[0],
    push(item: Event) {
      items.push(item);
      let i = items.length - 1;
      while (i > 0) {
        const parent = (i - 1) >> 1;
        if (!earlier(items[i]!, items[parent]!)) break;
        [items[i], items[parent]] = [items[parent]!, items[i]!];
        i = parent;
      }
    },
    pop(): Event | undefined {
      const top = items[0];
      const last = items.pop();
      if (top && last && items.length > 0) {
        items[0] = last;
        let i = 0;
        for (;;) {
          const l = 2 * i + 1;
          const r = l + 1;
          let min = i;
          if (l < items.length && earlier(items[l]!, items[min]!)) min = l;
          if (r < items.length && earlier(items[r]!, items[min]!)) min = r;
          if (min === i) break;
          [items[i], items[min]] = [items[min]!, items[i]!];
          i = min;
        }
      }
      return top;
    },
  };
}

export function createMemoryNetwork(o: NetworkOptions) {
  const rand = mulberry32(o.seed);
  const heap = createHeap();
  const conns = new Map<RoomTransport, Conn>();
  let now = 0;
  let order = 0;
  let nextId = 1;

  function later(at: number, run: () => void) {
    heap.push({ at, order: order++, run });
  }

  function latency() {
    const [min, max] = o.latencyMs;
    return min + Math.floor(rand() * (max - min + 1));
  }

  class Conn implements MemoryConn {
    readonly id = nextId++;
    state: TransportState = "idle";
    private upAt = 0;
    private downAt = 0;
    private serverClosed = false;
    private readonly frames = createListeners<ServerFrame>();
    private readonly closes = createListeners<CloseEvent>();
    readonly client: RoomTransport;

    constructor(private readonly server: MemoryServerPort) {
      const stateOf = () => this.state;
      this.client = {
        get state() {
          return stateOf();
        },
        connect: () => this.open(),
        send: (frame) => this.sendUp(frame),
        close: (code = 1000) => this.end(code),
        onFrame: this.frames.add,
        onClose: this.closes.add,
      };
      conns.set(this.client, this);
    }

    private open() {
      if (this.state !== "idle") throw new Error("transport was already used");
      this.state = "connecting";
      this.upAt = this.downAt = now + latency();
      later(this.downAt, () => {
        if (this.state !== "connecting") return;
        this.state = "open";
        this.server.onOpen(this);
      });
    }

    private sendUp(frame: ClientFrame) {
      if (this.state !== "open") throw new Error("transport is not open");
      this.upAt = Math.max(this.upAt, now + latency());
      later(this.upAt, () => {
        if (this.state === "open") this.server.onFrame(this, frame);
      });
    }

    send(frame: ServerFrame) {
      if (this.serverClosed || this.state === "closed") return;
      this.downAt = Math.max(this.downAt, now + latency());
      later(this.downAt, () => {
        if (this.state === "open") this.frames.emit(frame);
      });
    }

    close(code = 1000) {
      if (this.serverClosed || this.state === "closed") return;
      this.serverClosed = true;
      this.downAt = Math.max(this.downAt, now + latency());
      later(this.downAt, () => this.end(code));
    }

    end(code: number) {
      if (this.state === "closed") return;
      const wasOpen = this.state === "open";
      this.state = "closed";
      conns.delete(this.client);
      if (wasOpen) this.server.onClose(this);
      this.closes.emit({ code });
    }
  }

  return {
    connect(server: MemoryServerPort): RoomTransport {
      return new Conn(server).client;
    },
    /** Moves the virtual clock forward and delivers everything that falls due, in order. */
    step(ms: number) {
      now += ms;
      for (let e = heap.peek(); e && e.at <= now; e = heap.peek()) {
        heap.pop();
        e.run();
      }
      if (o.dropRate > 0) {
        for (const conn of [...conns.values()]) {
          if (conn.state === "open" && rand() < o.dropRate) conn.end(1006);
        }
      }
    },
    drop(conn: RoomTransport) {
      conns.get(conn)?.end(1006);
    },
    dropAll() {
      for (const conn of [...conns.values()]) conn.end(1006);
    },
  };
}
