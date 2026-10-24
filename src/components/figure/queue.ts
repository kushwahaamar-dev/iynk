import type { HostCommand } from "./protocol";

// Commands whose latest value is all that matters.
const LATEST_WINS = new Set<HostCommand["type"]>(["view", "xr", "labels", "pal", "locale", "theme", "pause", "resume"]);

/**
 * Commands sent before the figure is ready, in order. A run of `set` patches
 * merges into one, and a repeated setting replaces the one just before it,
 * so a lab streaming state at 30 Hz to a figure that is still loading does
 * not pile up thousands of messages. Order between different commands is kept.
 */
export class CommandQueue {
  private items: HostCommand[] = [];

  constructor(private readonly limit = 500) {}

  push(command: HostCommand): void {
    if (command.type === "hello") return; // the handshake sends its own
    const last = this.items[this.items.length - 1];
    if (last && last.type === "set" && command.type === "set") {
      this.items[this.items.length - 1] = { type: "set", state: { ...last.state, ...command.state } };
      return;
    }
    if (last && last.type === command.type && LATEST_WINS.has(command.type)) {
      this.items[this.items.length - 1] = command;
      return;
    }
    this.items.push(command);
    if (this.items.length > this.limit) this.items.splice(0, this.items.length - this.limit);
  }

  /** Empties the queue and returns what was in it, oldest first. */
  drain(): HostCommand[] {
    return this.items.splice(0);
  }

  get size(): number {
    return this.items.length;
  }
}
