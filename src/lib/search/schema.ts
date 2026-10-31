import { z } from "zod";
import { LOCALES } from "../../i18n/config.ts";
import { NEARBY_KINDS, OFFER_SOURCES } from "./types.ts";

// Request bodies of the /api/search/* routes (HX-CONTRACT H5). The routes
// validate with these; callers import the inferred types.

const query = (max: number) => z.string().trim().min(2).max(max);

/** The page language, for engines that localise their answers (Maps hours, YouTube, Google). */
const hl = z.enum(LOCALES).optional();

export const offerPartInput = z.object({
  key: z.string().regex(/^[A-Za-z0-9:._-]{1,64}$/),
  query: query(160),
  /** Units needed. */
  qty: z.int().min(1).max(1000),
  /** Units in one listing when its title doesn't say (props come in sets of 4). */
  pack: z.int().min(1).max(100).optional(),
  /** Which stores to ask for this part; all three main stores when omitted. */
  sources: z
    .array(z.enum(OFFER_SOURCES))
    .min(1)
    .max(OFFER_SOURCES.length)
    .refine((list) => new Set(list).size === list.length, "sources must not repeat")
    .optional(),
});

export const offersInput = z.object({
  parts: z
    .array(offerPartInput)
    .min(1)
    .max(25)
    .refine((parts) => new Set(parts.map((p) => p.key)).size === parts.length, "part keys must be unique"),
  country: z.literal("us").default("us"),
});

/** "@30.2672,-97.7431,13z": what Google Maps calls `ll`. */
export const LL_PATTERN = /^@(-?\d{1,2}(?:\.\d{1,8})?),(-?\d{1,3}(?:\.\d{1,8})?),(\d{1,2}(?:\.\d{1,2})?)z$/;

export const nearbyInput = z
  .object({
    kind: z.enum(NEARBY_KINDS),
    ll: z
      .string()
      .regex(LL_PATTERN)
      .refine((ll) => {
        const [, lat, lng, zoom] = LL_PATTERN.exec(ll) ?? [];
        return Math.abs(Number(lat)) <= 90 && Math.abs(Number(lng)) <= 180 && Number(zoom) >= 3 && Number(zoom) <= 21;
      }, "ll is out of range")
      .optional(),
    near: query(120).optional(),
    hl,
  })
  .refine((input) => input.ll !== undefined || input.near !== undefined, "give ll or near");

export const eventsInput = z.object({
  q: query(120).optional(),
  near: query(120),
});

export const videosInput = z.object({ q: query(160), hl });

export const webInput = z.object({ q: query(200), extract: z.boolean().optional(), hl });

export type OfferPartInput = z.output<typeof offerPartInput>;
export type OffersInput = z.input<typeof offersInput>;
export type NearbyInput = z.output<typeof nearbyInput>;
export type EventsInput = z.output<typeof eventsInput>;
export type VideosInput = z.output<typeof videosInput>;
export type WebInput = z.output<typeof webInput>;
