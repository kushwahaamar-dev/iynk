import { makeNoise, schedule, type SoundName } from "./sounds";

type Tone = { osc: OscillatorNode; gain: GainNode; hz: number; level: number };

/** The same sound again within this many ms is one sound (a figure can name one twice in a frame). */
const REPEAT_MS = 40;
/** Sounds started within one second, at most; beyond that a burst is cut short rather than piled up. */
const PER_SECOND = 24;
const MASTER = 0.6;
const TONE_LEVEL = 0.05;

/**
 * Plays iynk's sounds on one AudioContext, made on first use. Browsers keep a
 * context suspended until a user gesture; `unlock()` from a click resumes it.
 * Without Web Audio every call does nothing.
 */
export class SoundEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private tones = new Map<string, Tone>();
  private last = new Map<SoundName, number>();
  private recent: number[] = [];

  constructor(private readonly create: () => AudioContext | null = defaultContext) {}

  private context(): AudioContext | null {
    if (this.ctx) return this.ctx;
    const ctx = this.create();
    if (!ctx) return null;
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = MASTER;
    this.master.connect(ctx.destination);
    this.noise = makeNoise(ctx);
    return ctx;
  }

  /** Call from a user gesture (the sound toggle), so the browser lets the context run. */
  unlock(): void {
    const ctx = this.context();
    if (ctx && ctx.state === "suspended") void ctx.resume().catch(() => {});
  }

  play(name: SoundName): boolean {
    const ctx = this.context();
    if (!ctx || !this.master || !this.noise) return false;
    if (ctx.state === "suspended") void ctx.resume().catch(() => {});
    const now = performance.now();
    if (now - (this.last.get(name) ?? -Infinity) < REPEAT_MS) return false;
    this.recent = this.recent.filter((t) => now - t < 1000);
    if (this.recent.length >= PER_SECOND) return false;
    this.last.set(name, now);
    this.recent.push(now);
    schedule(name, { ctx, out: this.master, noise: this.noise, at: ctx.currentTime + 0.005 });
    return true;
  }

  /**
   * A held pitch, like a buzzer driven by tone(): `hz` starts or retunes it, null stops it.
   * `loud` (0 to 1) scales it, for a buzzer the figure hears quieter off its resonance.
   */
  tone(id: string, hz: number | null, loud = 1): void {
    const current = this.tones.get(id);
    if (hz === null || !(hz > 0)) {
      if (current) this.release(id, current);
      return;
    }
    const ctx = this.context();
    if (!ctx || !this.master) return;
    const pitch = Math.min(Math.max(hz, 20), 20_000);
    const level = TONE_LEVEL * Math.min(Math.max(loud, 0.05), 1);
    if (current) {
      if (current.hz !== pitch) current.osc.frequency.setValueAtTime(pitch, ctx.currentTime);
      if (current.level !== level) current.gain.gain.setTargetAtTime(level, ctx.currentTime, 0.01);
      current.hz = pitch;
      current.level = level;
      return;
    }
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.value = pitch;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(level, ctx.currentTime + 0.01);
    osc.connect(gain).connect(this.master);
    osc.start();
    this.tones.set(id, { osc, gain, hz: pitch, level });
  }

  private release(id: string, tone: Tone) {
    this.tones.delete(id);
    const t = this.ctx?.currentTime ?? 0;
    tone.gain.gain.setTargetAtTime(0.0001, t, 0.01);
    tone.osc.stop(t + 0.06);
  }

  /** Stops every held tone (sound turned off, a run stopped, the page left). */
  silence(): void {
    for (const [id, tone] of [...this.tones]) this.release(id, tone);
  }
}

function defaultContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  try {
    return new Ctor();
  } catch {
    return null;
  }
}
