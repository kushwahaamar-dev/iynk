import { InterpError } from './errors';
import type { World } from './world';
import type { StatementDebugger } from '@/sim/debug/breakpoints';

/** Yielded by a program generator when it must hand control back to the host. */
export const PREEMPT = -1;

/** Yielded when the debugger stops the program before a statement; the host holds time until resume. */
export const PAUSE = -2;

/**
 * A program is a generator that yields either PREEMPT or the simulated time
 * (µs) it wants to sleep until. Statement code is generator based so delay()
 * and friends suspend without blocking the tab.
 */
export type Program = Generator<number, void, void>;
export type Gen<T> = Generator<number, T, void>;

/** Hard cap for code that runs to completion inside one expression or ISR. */
const SYNC_LIMIT = 5_000_000;

/**
 * Shared machinery for the C++ and Python interpreters: virtual time per
 * statement, interrupt delivery between statements, idle-loop skipping and the
 * per-step instruction budget.
 */
export class Exec {
  readonly world: World;
  /** Statements executed so far. */
  ops = 0;
  /** Simulated µs one statement costs on this target. */
  readonly opUs: number;
  /** Simulated time at which the current host step ends. */
  target = 0;
  /** Statement budget for the current host step. */
  opBudget = Infinity;
  inIsr = false;
  /** How many runSync calls are active; a statement inside one cannot pause. */
  syncDepth = 0;
  /** Attached debugger; null costs one check per statement. */
  dbg: StatementDebugger | null = null;
  /** Bumped whenever a store changes a value; with world.version it detects idle loops. */
  fx = 0;
  /** Set when the code reads a fine-grained clock (micros, ticks_us). */
  fineClock = 0;
  /** Queued handlers that are not hardware interrupts (Python Timer callbacks...). */
  readonly softQueue: Array<() => Gen<unknown>> = [];

  constructor(world: World, opUs: number) {
    this.world = world;
    this.opUs = opUs;
  }

  /** Charge one statement; returns true when the program should yield to the host. */
  tick(): boolean {
    this.ops++;
    const c = this.world.clock;
    c.now += this.opUs;
    if (c.next() <= c.now) c.fireDue();
    if ((this.world.irqQueue.length || this.softQueue.length) && !this.inIsr) this.serviceIrqs();
    return c.now >= this.target || this.ops >= this.opBudget;
  }

  /** Charge extra simulated time for one call; returns true when the program should yield to the host. */
  chargeUs(us: number): boolean {
    if (us <= 0) return false;
    const c = this.world.clock;
    c.now += us;
    if (c.next() <= c.now) c.fireDue();
    if ((this.world.irqQueue.length || this.softQueue.length) && !this.inIsr) this.serviceIrqs();
    return c.now >= this.target;
  }

  /** Run interrupt handlers queued by pin edges and timers. */
  serviceIrqs(): void {
    if (this.inIsr) return;
    const w = this.world;
    while ((w.irqQueue.length && w.interruptsEnabled) || this.softQueue.length) {
      this.inIsr = true;
      try {
        if (w.irqQueue.length && w.interruptsEnabled) w.irqQueue.shift()!();
        else this.runSync(this.softQueue.shift()!());
      } finally {
        this.inIsr = false;
      }
    }
  }

  /** Advance simulated time to `t`, firing timers and running interrupts on the way. */
  advance(t: number): void {
    const c = this.world.clock;
    while (true) {
      const n = c.next();
      if (n > t) break;
      if (n > c.now) c.now = n;
      c.fireDue();
      this.serviceIrqs();
    }
    if (t > c.now) c.now = t;
    this.serviceIrqs();
  }

  /**
   * One iteration of a polling loop changed nothing: jump ahead to the next
   * millisecond (or 4 µs when the loop reads micros()), stopping early for timers
   * and the end of the host step. Real hardware would spin; the result is the same.
   */
  idle(fine: boolean): void {
    const c = this.world.clock;
    const q = fine ? 4 : 1000;
    let t = (Math.floor(c.now / q) + 1) * q;
    t = Math.min(t, c.next(), Math.max(this.target, c.now));
    if (t > c.now) this.advance(t);
  }

  /** Wait (yielding) until simulated time `until`. */
  *sleepUntil(until: number): Gen<void> {
    if (this.inIsr) return;
    while (this.world.now < until) yield until;
  }

  /** Wait until `cond()` holds or `deadline` passes; returns cond(). */
  *waitFor(cond: () => boolean, deadline: number): Gen<boolean> {
    while (!cond()) {
      if (this.world.now >= deadline) return false;
      yield Math.min(deadline, this.world.clock.next());
    }
    return true;
  }

  /**
   * Drive a generator to completion right now (a function called from inside an
   * expression, or an interrupt handler). Sleeps advance the clock directly.
   */
  runSync<T>(g: Gen<T>): T {
    const limit = this.ops + SYNC_LIMIT;
    this.syncDepth++;
    try {
      return this.drive(g, limit);
    } finally {
      this.syncDepth--;
    }
  }

  private drive<T>(g: Gen<T>, limit: number): T {
    let r = g.next();
    while (!r.done) {
      const t = r.value;
      if (t !== PREEMPT && t > this.world.now) {
        if (t === Infinity) throw new InterpError('limit', 'this code waits for ever inside a function used in an expression', null);
        this.advance(t);
      }
      if (this.ops > limit) {
        throw new InterpError('limit', 'a function never returned (an endless loop inside an expression or interrupt handler)', null, 'move the loop into loop() or add a way out');
      }
      r = g.next();
    }
    return r.value;
  }
}
