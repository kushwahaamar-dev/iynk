// Telemetry event kinds and payload shapes, shared by the browser client and the
// ingest route. HX-CONTRACT H8 lists the kinds; flight.start and led.blink are
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

/** The payloads the server reads back in SQL; every other kind is free-form. */
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

/** POST /api/telemetry body. sentAt (client clock) lets the server correct clock skew. */
export type TelemetryBatch = { events: TelemetryEvent[]; sentAt?: number };

export const MAX_EVENTS_PER_BATCH = 200;
/** Bytes of JSON per event payload, and per request body (sendBeacon's own cap is 64 KiB). */
export const MAX_DATA_BYTES = 2048;
export const MAX_BODY_BYTES = 60 * 1024;

export const SESSION_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;
export const ROOM_PATTERN = /^[23456789abcdefghjkmnpqrstuvwxyz]{6}$/;
export const ITEM_PATTERN = /^[a-z0-9][a-z0-9:._-]{0,63}$/;
export const COURSE_PATTERN = /^[a-z0-9][a-z0-9-]{0,47}$/;

/** Lap times outside this range are not real laps of any iynk course. */
export const LAP_MS = { min: 1_000, max: 60 * 60 * 1000 } as const;
export const NAME_MAX = 24;
