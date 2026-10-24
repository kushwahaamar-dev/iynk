// The message protocol between the SimLab host and a Colorfigures figure
// running in an iframe (colorfigures-guide 2.3, decisions D6 and D11, and the
// bridge contract in docs/FIGURES.md). Host -> figure messages carry
// `source: "simlab"`; the figure answers with `source: "simlab-figure"`. Both
// carry `v: 1`.

export const PROTOCOL_VERSION = 1;
export const HOST_SOURCE = "simlab";
export const FIGURE_SOURCE = "simlab-figure";

type Empty = Record<never, never>;

export type FigureTheme = "light" | "dark";

export type HostMessages = {
  /** Ask the figure to announce itself; it answers `ready`. */
  hello: Empty;
  /** The host hid the figure (Activity); stop animating until `resume`. */
  pause: Empty;
  resume: Empty;
  /** Click a figure button by its stable id; `choice` picks a picker chip. */
  press: { id: string; choice?: string };
  /** Run one of the figure's acts on the part whose data-* match `data`. */
  act: { name: string; data?: Record<string, string | number> };
  /** A state patch, validated by the figure's `embed.accept`. */
  set: { state: Record<string, unknown> };
  view: { yaw: number; pitch?: number; ms?: number };
  xr: { on: boolean };
  labels: { on: boolean };
  pal: { key: string };
  locale: { lang: string; strings?: Record<string, string> };
  theme: { mode: FigureTheme };
  flash: { text: string; ms?: number };
  /** Ask for the current reported state; the figure answers `state` and `labels`. */
  query: Empty;
};

export type HostMessageType = keyof HostMessages;

export type FigureButton = { id: string; label: string; en?: string; picker: boolean };
export type FigureSwitch = { id: string; label: string; on: boolean };
/** A pressable part of the drawing, driven with `act`. */
export type FigurePart = { act: string; id: string | null; label: string; en?: string };
export type FigureLabel = { n: number | string; text: string; en?: string; on: boolean };

export type FigureMessages = {
  ready: {
    fig: string;
    title: string;
    en?: string;
    lang: string;
    buttons: FigureButton[];
    switches: FigureSwitch[];
    acts: string[];
    parts: FigurePart[];
    pals: string[];
    pal?: string;
    view?: { yaw: number; pitch: number };
    state?: Record<string, unknown>;
    readout?: unknown;
    embedded?: boolean;
  };
  part: { act: string; id: string | null; data: Record<string, string>; by: "user" | "host" };
  button: { id: string; choice?: string; on?: boolean; by: "user" | "host" };
  state: { state: Record<string, unknown>; changed: string[]; readout?: unknown; parts?: FigurePart[] };
  labels: { items: FigureLabel[] };
  flash: { text: string; en?: string };
  focus: { on: boolean };
  error: { message: string };
  /** A named sound effect for the host's sound engine (S10). */
  sfx: { name: string };
};

export type FigureMessageType = keyof FigureMessages;

/**
 * Any other event a figure sends with CF_BRIDGE.send(type, data). It arrives
 * as `{ type: "custom", name: type, payload: data }` so the known events keep
 * their exact types.
 */
export type CustomFigureEvent = { type: "custom"; name: string; payload: Record<string, unknown> };

/** A figure -> host message as `onEvent` receives it: `{ type, ...payload }`. */
export type FigureEvent =
  | {
      [T in FigureMessageType]: { type: T } & FigureMessages[T];
    }[FigureMessageType]
  | CustomFigureEvent;

/** A command a figure registered with CF_BRIDGE.on(name, fn). */
export type CustomHostCommand = { type: "custom"; name: string; payload: Record<string, unknown> };

/** A host -> figure message: `{ type, ...payload }`. */
export type HostCommand =
  | {
      [T in HostMessageType]: { type: T } & HostMessages[T];
    }[HostMessageType]
  | CustomHostCommand;

/** Arguments of `send`: the payload is optional when the message has none. */
export type SendArgs<T extends HostMessageType> = keyof HostMessages[T] extends never
  ? [payload?: HostMessages[T]]
  : [payload: HostMessages[T]];

/** Everything that crosses the bridge, for observers (rooms, replays, the AI partner). */
export type FigureTraffic =
  | { dir: "out"; message: HostCommand; at: number }
  | { dir: "in"; message: FigureEvent; at: number };

export type FigureHandle = {
  /** Post a host -> figure message; queued until the figure is ready. */
  send<T extends HostMessageType>(type: T, ...args: SendArgs<T>): void;
  /** Post a command the figure registered itself (CF_BRIDGE.on); queued like the others. */
  sendCustom(name: string, payload?: Record<string, unknown>): void;
  /** Watch every message in both directions. Returns an unsubscribe function. */
  observe(listener: (traffic: FigureTraffic) => void): () => void;
  /** True between the figure's `ready` and the next hide. */
  isReady(): boolean;
  /** The last `ready` payload, or null before the first one. */
  info(): FigureMessages["ready"] | null;
  /** Move keyboard focus into the figure. */
  focus(): void;
};

export function envelope(command: HostCommand) {
  if (command.type === "custom") {
    return { ...command.payload, source: HOST_SOURCE, v: PROTOCOL_VERSION, type: command.name };
  }
  return { source: HOST_SOURCE, v: PROTOCOL_VERSION, ...command };
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isString = (value: unknown): value is string => typeof value === "string";
const isBool = (value: unknown): value is boolean => typeof value === "boolean";
const optString = (value: unknown) => (isString(value) ? value : undefined);

function stringRecord(value: unknown): Record<string, string> {
  if (!isRecord(value)) return {};
  const out: Record<string, string> = {};
  for (const [key, item] of Object.entries(value)) {
    if (item !== undefined && item !== null) out[key] = String(item);
  }
  return out;
}

function list<T>(value: unknown, read: (item: Record<string, unknown>) => T | null): T[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!isRecord(item)) return [];
    const parsed = read(item);
    return parsed === null ? [] : [parsed];
  });
}

const parseButtons = (value: unknown) =>
  list<FigureButton>(value, (item) =>
    isString(item.id) && item.id
      ? { id: item.id, label: isString(item.label) && item.label ? item.label : item.id, en: optString(item.en), picker: item.picker === true }
      : null,
  );

const parseSwitches = (value: unknown) =>
  list<FigureSwitch>(value, (item) =>
    isString(item.id) && item.id ? { id: item.id, label: isString(item.label) ? item.label : item.id, on: item.on === true } : null,
  );

export const parseParts = (value: unknown) =>
  list<FigurePart>(value, (item) =>
    isString(item.act) && item.act
      ? {
          act: item.act,
          id: isString(item.id) ? item.id : null,
          label: isString(item.label) && item.label ? item.label : item.act,
          en: optString(item.en),
        }
      : null,
  );

const parseLabels = (value: unknown) =>
  list<FigureLabel>(value, (item) =>
    isString(item.text) && (typeof item.n === "number" || isString(item.n))
      ? { n: item.n, text: item.text, en: optString(item.en), on: item.on !== false }
      : null,
  );

const RESERVED = new Set(["source", "v", "type"]);

/**
 * Validates a figure -> host message. Returns null for anything that is not a
 * well-formed message of this protocol; the caller has already checked the
 * event's origin and source window.
 */
export function parseFigureMessage(data: unknown): FigureEvent | null {
  if (!isRecord(data)) return null;
  // D6 names "simlab" as the envelope; the bridge answers with "simlab-figure".
  // The window and origin checks upstream are what make this safe.
  if (data.source !== FIGURE_SOURCE && data.source !== HOST_SOURCE) return null;
  if (data.v !== PROTOCOL_VERSION || !isString(data.type) || !data.type) return null;

  switch (data.type) {
    case "ready":
      return {
        type: "ready",
        fig: isString(data.fig) ? data.fig : "",
        title: isString(data.title) ? data.title : "",
        en: optString(data.en),
        lang: isString(data.lang) ? data.lang : "",
        buttons: parseButtons(data.buttons),
        switches: parseSwitches(data.switches),
        acts: Array.isArray(data.acts) ? data.acts.filter(isString) : [],
        parts: parseParts(data.parts),
        pals: Array.isArray(data.pals) ? data.pals.filter(isString) : [],
        pal: optString(data.pal),
        view:
          isRecord(data.view) && typeof data.view.yaw === "number" && typeof data.view.pitch === "number"
            ? { yaw: data.view.yaw, pitch: data.view.pitch }
            : undefined,
        state: isRecord(data.state) ? data.state : undefined,
        readout: data.readout,
        embedded: isBool(data.embedded) ? data.embedded : undefined,
      };
    case "part":
      if (!isString(data.act)) return null;
      return {
        type: "part",
        act: data.act,
        id: isString(data.id) ? data.id : null,
        data: stringRecord(data.data),
        by: data.by === "host" ? "host" : "user",
      };
    case "button":
      if (!isString(data.id)) return null;
      return {
        type: "button",
        id: data.id,
        choice: optString(data.choice),
        on: isBool(data.on) ? data.on : undefined,
        by: data.by === "host" ? "host" : "user",
      };
    case "state":
      if (!isRecord(data.state)) return null;
      return {
        type: "state",
        state: data.state,
        changed: Array.isArray(data.changed) ? data.changed.filter(isString) : Object.keys(data.state),
        readout: data.readout,
        parts: Array.isArray(data.parts) ? parseParts(data.parts) : undefined,
      };
    case "labels":
      return { type: "labels", items: parseLabels(data.items) };
    case "flash":
      if (!isString(data.text)) return null;
      return { type: "flash", text: data.text, en: optString(data.en) };
    case "focus":
      if (!isBool(data.on)) return null;
      return { type: "focus", on: data.on };
    case "error":
      return { type: "error", message: isString(data.message) ? data.message : "unknown figure error" };
    case "sfx":
      if (!isString(data.name) || !data.name) return null;
      return { type: "sfx", name: data.name };
    case "custom":
      // "custom" is this host's wrapper name; a figure cannot claim it.
      return null;
    default: {
      const payload: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(data)) if (!RESERVED.has(key)) payload[key] = value;
      return { type: "custom", name: data.type, payload };
    }
  }
}
