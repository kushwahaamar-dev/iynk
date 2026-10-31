// Telemetry event kinds and payload shapes, used by the browser client. HX-CONTRACT H8 lists the kinds; flight.start and led.blink are
// hx:data's additive kinds behind the live counter ("K drones flown", "M LEDs blinked").

export const TELEMETRY_KINDS = [
  "flight.sample",
  "flight.lap",
  "flight.start",
  "lesson.attempt",
  "lesson.pass",
  "led.blink",
  "fault",
  "room.join",
  "room.action",
  "ai.call",
  "hw.connect",
  "credential.issued",
  "step.done", // { key }: a build step with a progress key (a robotics bench step, a drone's finished build)
  "search.call", // { engine }: offers | nearby | events | videos
] as const;

export type TelemetryKind = (typeof TELEMETRY_KINDS)[number];

/** JSON-safe payload. No personal data: names are self-chosen, ids are random. */
export type TelemetryData = Record<string, unknown>;

/** The payloads with a known shape; every other kind is free-form. */
export type KnownPayloads = {
  "flight.lap": { course: string; timeMs: number; name?: string };
  "led.blink": { count: number };
};

export type TelemetryEvent = {
  ts: number;
  kind: TelemetryKind;
  session: string;
  room?: string;
  item?: string;
  data: TelemetryData;
};
