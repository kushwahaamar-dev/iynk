import type { DeviceId, ErrorFrame, RoomId } from "../../../src/protocol/frames.ts";
import { CLOSE } from "../../../src/protocol/close-codes.ts";

export interface SocketHandle {
  send(frame: ErrorFrame): void;
  close(code: number, reason?: string): void;
  readonly tag: string;
}

type Scope = RoomId | "lobby";

const SUPERSEDED: ErrorFrame = {
  t: "error",
  code: "superseded",
  message: "This device opened the same room somewhere else.",
  retryable: false,
};

export class SessionRegistry {
  private readonly scopes = new Map<Scope, Map<DeviceId, SocketHandle>>();

  attach(scope: Scope, device: DeviceId, s: SocketHandle): { superseded: SocketHandle | null } {
    let devices = this.scopes.get(scope);
    if (!devices) this.scopes.set(scope, (devices = new Map()));
    const old = devices.get(device) ?? null;
    devices.set(device, s);
    if (old) {
      old.send(SUPERSEDED);
      old.close(CLOSE.superseded);
    }
    return { superseded: old };
  }

  detach(scope: Scope, device: DeviceId, s: SocketHandle): void {
    const devices = this.scopes.get(scope);
    if (devices?.get(device) !== s) return;
    devices.delete(device);
    if (devices.size === 0) this.scopes.delete(scope);
  }

  closeDevice(device: DeviceId, code: number): number {
    let closed = 0;
    for (const [scope, devices] of this.scopes) {
      const s = devices.get(device);
      if (!s) continue;
      devices.delete(device);
      if (devices.size === 0) this.scopes.delete(scope);
      s.close(code);
      closed++;
    }
    return closed;
  }

  closeMember(room: RoomId, device: DeviceId, code: number): number {
    const devices = this.scopes.get(room);
    const s = devices?.get(device);
    if (!devices || !s) return 0;
    devices.delete(device);
    if (devices.size === 0) this.scopes.delete(room);
    s.close(code);
    return 1;
  }

  /** `poll` returns the devices revoked since its last call. Returns the stop function. */
  startRevocationWatch(poll: () => DeviceId[], everyMs: number): () => void {
    const timer = setInterval(() => {
      for (const id of poll()) this.closeDevice(id, CLOSE.unauthorized);
    }, everyMs);
    timer.unref();
    return () => clearInterval(timer);
  }
}
