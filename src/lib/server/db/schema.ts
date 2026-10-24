import "server-only";
import { z } from "zod";
import { LOCALES } from "@/i18n/config";
import {
  COURSE_PATTERN,
  ITEM_PATTERN,
  LAP_MS,
  MAX_DATA_BYTES,
  MAX_EVENTS_PER_BATCH,
  NAME_MAX,
  ROOM_PATTERN,
  SESSION_PATTERN,
  TELEMETRY_KINDS,
  type TelemetryKind,
} from "@/lib/telemetry/kinds";

/** Self-chosen display names: no control, format or bidi characters, at most 24 code points. */
export function cleanName(raw: string): string {
  const cleaned = raw.normalize("NFC").replace(/[\p{Cc}\p{Cf}]/gu, "").replace(/\s+/g, " ").trim();
  return Array.from(cleaned).slice(0, NAME_MAX).join("");
}

const encoder = new TextEncoder();
const jsonBytes = (value: unknown) => encoder.encode(JSON.stringify(value)).length;

const payload = z
  .record(z.string(), z.unknown())
  .refine((data) => jsonBytes(data) <= MAX_DATA_BYTES, { message: `data is over ${MAX_DATA_BYTES} bytes` });

const lapPayload = z.looseObject({
  course: z.string().regex(COURSE_PATTERN),
  timeMs: z.number().int().min(LAP_MS.min).max(LAP_MS.max),
  name: z.string().max(200).transform(cleanName).optional(),
});

const countPayload = z.looseObject({ count: z.number().int().min(1).max(100_000) });

const strictPayloads: Partial<Record<TelemetryKind, z.ZodType<Record<string, unknown>>>> = {
  "flight.lap": lapPayload,
  "led.blink": countPayload,
};

export const telemetryEvent = z
  .object({
    ts: z.union([z.number().int().positive(), z.iso.datetime({ offset: true }).transform((iso) => Date.parse(iso))]),
    kind: z.enum(TELEMETRY_KINDS),
    session: z.string().regex(SESSION_PATTERN),
    room: z.string().regex(ROOM_PATTERN).optional(),
    item: z.string().regex(ITEM_PATTERN).optional(),
    data: payload.default({}),
  })
  .transform((event, ctx) => {
    const strict = strictPayloads[event.kind];
    if (!strict) return event;
    const parsed = strict.safeParse(event.data);
    if (!parsed.success) {
      ctx.addIssue({ code: "custom", message: `data does not fit ${event.kind}`, path: ["data"] });
      return z.NEVER;
    }
    return { ...event, data: parsed.data };
  });

/** The envelope is checked as a whole; each event on its own, so one bad event doesn't sink a batch. */
export const telemetryBatch = z.object({
  events: z.array(z.unknown()).min(1).max(MAX_EVENTS_PER_BATCH),
  sentAt: z.number().int().positive().optional(),
});

export const leaderboardQuery = z.object({
  course: z.string().regex(COURSE_PATTERN),
  session: z.string().regex(SESSION_PATTERN).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

const progressKey = z.string().regex(/^[a-z0-9][a-z0-9:._-]{0,95}$/);

export const profile = z.object({
  id: z.string().regex(SESSION_PATTERN),
  name: z.string().max(200).transform(cleanName).pipe(z.string().min(1)),
  lang: z.enum(LOCALES),
  interests: z.array(z.string().trim().min(1).max(40)).max(12).default([]),
  built: z.array(progressKey).max(64).default([]),
  wants: z.string().trim().max(280).default(""),
});

export type Profile = z.output<typeof profile>;

const token = z.string().min(16).max(128);

export const buddyPost = z.object({ profile, token });
export const buddyDelete = z.object({ id: z.string().regex(SESSION_PATTERN), token });
export const buddyQuery = z.object({
  exclude: z.string().regex(SESSION_PATTERN).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(50),
});
