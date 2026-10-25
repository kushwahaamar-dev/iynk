// Every sound SimLab plays, synthesized with Web Audio (no audio files to load).
// Figures name theirs in `sfx` events and state reports (docs/FIGURES.md, S10);
// the lab adds a few cues of its own for moments the figure doesn't draw.

/** The names figures send (bench.js, drone.js, src/lib/flight/sfx.ts). */
export const FIGURE_SOUNDS = ["click", "tick", "place", "pop", "plug", "unplug", "power", "ding", "sizzle", "whoosh", "spin", "buzz"] as const;

/** The lab's own cues: checks passed or failed, a build step done, a step refused, sound turned on. */
export const CUE_SOUNDS = ["pass", "fail", "step", "refused", "on"] as const;

export type FigureSound = (typeof FIGURE_SOUNDS)[number];
export type CueSound = (typeof CUE_SOUNDS)[number];
export type SoundName = FigureSound | CueSound;

const NAMES = new Set<string>([...FIGURE_SOUNDS, ...CUE_SOUNDS]);

export function isSoundName(name: unknown): name is SoundName {
  return typeof name === "string" && NAMES.has(name);
}

/** What a recipe needs: a context, where to connect, and a one-second noise buffer. */
export type Voice = { ctx: BaseAudioContext; out: AudioNode; noise: AudioBuffer; at: number };

type Recipe = (voice: Voice) => void;

/** One oscillator from `from` Hz to `to` Hz, with a quick attack and an exponential fade over `ms`. */
function blip({ ctx, out, at }: Voice, type: OscillatorType, from: number, to: number, ms: number, level: number, delay = 0) {
  const t = at + delay / 1000;
  const end = t + ms / 1000;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, t);
  if (to !== from) osc.frequency.exponentialRampToValueAtTime(to, end);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(level, t + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, end);
  osc.connect(gain).connect(out);
  osc.start(t);
  osc.stop(end + 0.02);
}

/** Filtered noise for `ms`: a click, a pop, a sizzle or a whoosh depending on the filter. */
function hiss(
  { ctx, out, noise, at }: Voice,
  filter: BiquadFilterType,
  hz: number,
  ms: number,
  level: number,
  options: { toHz?: number; q?: number; delay?: number } = {},
) {
  const t = at + (options.delay ?? 0) / 1000;
  const end = t + ms / 1000;
  const src = ctx.createBufferSource();
  src.buffer = noise;
  const shape = ctx.createBiquadFilter();
  shape.type = filter;
  shape.frequency.setValueAtTime(hz, t);
  if (options.toHz) shape.frequency.exponentialRampToValueAtTime(options.toHz, end);
  shape.Q.value = options.q ?? 1;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(level, t + Math.min(0.03, ms / 4000));
  gain.gain.exponentialRampToValueAtTime(0.0001, end);
  src.connect(shape).connect(gain).connect(out);
  src.start(t, Math.random() * 0.5);
  src.stop(end + 0.02);
}

const RECIPES: Record<SoundName, Recipe> = {
  click: (v) => hiss(v, "highpass", 2500, 12, 0.35),
  tick: (v) => blip(v, "sine", 1800, 1800, 30, 0.12),
  place: (v) => blip(v, "triangle", 520, 360, 80, 0.3),
  pop: (v) => {
    hiss(v, "bandpass", 900, 60, 0.5, { q: 0.8 });
    blip(v, "sine", 180, 60, 110, 0.4);
  },
  plug: (v) => {
    blip(v, "triangle", 330, 660, 70, 0.25);
    hiss(v, "highpass", 3000, 10, 0.25, { delay: 70 });
  },
  unplug: (v) => blip(v, "triangle", 660, 300, 90, 0.25),
  power: (v) => blip(v, "sine", 300, 900, 180, 0.2),
  ding: (v) => {
    blip(v, "sine", 1320, 1320, 650, 0.18);
    blip(v, "sine", 2640, 2640, 300, 0.05);
  },
  sizzle: (v) => hiss(v, "highpass", 3500, 480, 0.18, { q: 0.5 }),
  whoosh: (v) => hiss(v, "bandpass", 400, 360, 0.3, { toHz: 2200, q: 1.2 }),
  spin: (v) => blip(v, "sawtooth", 70, 240, 520, 0.07),
  buzz: (v) => blip(v, "square", 110, 110, 180, 0.06),
  pass: (v) => {
    blip(v, "sine", 660, 660, 140, 0.2);
    blip(v, "sine", 990, 990, 260, 0.2, 110);
  },
  fail: (v) => {
    blip(v, "triangle", 440, 440, 150, 0.18);
    blip(v, "triangle", 311, 311, 260, 0.18, 130);
  },
  step: (v) => blip(v, "sine", 880, 1175, 120, 0.16),
  refused: (v) => blip(v, "square", 150, 140, 140, 0.05),
  on: (v) => {
    blip(v, "sine", 523, 523, 90, 0.16);
    blip(v, "sine", 784, 784, 160, 0.16, 80);
  },
};

export function schedule(name: SoundName, voice: Voice): void {
  RECIPES[name](voice);
}

/** A second of white noise, made once per context. */
export function makeNoise(ctx: BaseAudioContext): AudioBuffer {
  const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
  return buffer;
}
