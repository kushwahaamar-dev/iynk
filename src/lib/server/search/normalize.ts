import "server-only";
import type { MakerEvent, Offer, OfferSource, PageExtract, Place, Video, WebResult } from "@/lib/search/types";

// Pure mappers from SerpApi's JSON (docs/hacktx/SEARCH.md lists the fields
// each one reads) to the H5 shapes. Upstream JSON is untrusted: every field
// is checked, and a result without the fields we need is dropped.

type Json = Record<string, unknown>;

const obj = (v: unknown): Json | undefined => (v && typeof v === "object" && !Array.isArray(v) ? (v as Json) : undefined);
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const str = (v: unknown): string | undefined => (typeof v === "string" && v.trim() ? v.trim() : undefined);
const num = (v: unknown): number | undefined => (typeof v === "number" && Number.isFinite(v) ? v : undefined);

/** Only absolute http(s) links reach the page (no javascript: or data: URLs). */
export function safeUrl(v: unknown): string | undefined {
  const s = str(v);
  if (!s) return undefined;
  try {
    const url = new URL(s);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

/** "$1,299.99" -> 1299.99 when SerpApi gave no extracted number. */
export function parsePrice(v: unknown): number | undefined {
  const direct = num(v);
  if (direct !== undefined) return direct > 0 ? direct : undefined;
  const s = str(v);
  if (!s) return undefined;
  const match = /(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d{1,2}))?/.exec(s);
  if (!match) return undefined;
  const value = Number(`${match[1].replace(/,/g, "")}.${match[2] ?? "0"}`);
  return value > 0 ? value : undefined;
}

const SYMBOLS: [string, string][] = [
  ["US$", "USD"],
  ["CA$", "CAD"],
  ["A$", "AUD"],
  ["€", "EUR"],
  ["£", "GBP"],
  ["₹", "INR"],
  ["¥", "JPY"],
  ["$", "USD"],
];

export function currencyOf(price: unknown, fallback = "USD"): string {
  const s = str(price);
  if (!s) return fallback;
  return SYMBOLS.find(([symbol]) => s.includes(symbol))?.[1] ?? fallback;
}

/** Units in one listing from its title: "4pcs", "Pack of 2", "2 pairs" (4 props), "x4". */
export function packSize(title: string): number | undefined {
  const t = title.toLowerCase();
  const pairs = /(\d{1,2})\s*(?:pairs|pair|prs)\b/.exec(t);
  if (pairs) return Number(pairs[1]) * 2;
  const pack =
    /(\d{1,3})\s*(?:pcs|pc|pieces|piece|pack|pk|count|ct|sets?)\b/.exec(t) ??
    /\b(?:pack|set|lot)\s+of\s+(\d{1,3})\b/.exec(t) ??
    /(?:^|\s)x\s?(\d{1,2})\b|\b(\d{1,2})\s?x(?:\s|$)/.exec(t);
  const n = pack ? Number(pack[1] ?? pack[2]) : NaN;
  return Number.isInteger(n) && n >= 2 && n <= 200 ? n : undefined;
}

function offer(source: OfferSource, fields: {
  title: unknown;
  price: unknown;
  priceText?: unknown;
  url: unknown;
  seller?: unknown;
  rating?: unknown;
  inStock?: boolean;
  thumbnail?: unknown;
}): Offer | undefined {
  const title = str(fields.title);
  const price = parsePrice(fields.price) ?? parsePrice(fields.priceText);
  const url = safeUrl(fields.url);
  if (!title || price === undefined || !url) return undefined;
  const out: Offer = { source, title, price, currency: currencyOf(fields.priceText), url };
  const seller = str(fields.seller);
  if (seller) out.seller = seller;
  const rating = num(fields.rating);
  if (rating !== undefined && rating >= 0 && rating <= 5) out.rating = rating;
  if (fields.inStock !== undefined) out.inStock = fields.inStock;
  const thumbnail = safeUrl(fields.thumbnail);
  if (thumbnail) out.thumbnail = thumbnail;
  const pack = packSize(title);
  if (pack) out.pack = pack;
  return out;
}

const defined = <T>(list: (T | undefined)[]): T[] => list.filter((x): x is T => x !== undefined);

export function googleShoppingOffers(raw: unknown): Offer[] {
  return defined(
    arr(obj(raw)?.shopping_results).map((r) => {
      const o = obj(r);
      return o
        ? offer("google_shopping", {
            title: o.title,
            price: o.extracted_price,
            priceText: o.price,
            url: o.link ?? o.product_link,
            seller: o.source,
            rating: o.rating,
            thumbnail: o.thumbnail,
          })
        : undefined;
    }),
  );
}

export function amazonOffers(raw: unknown): Offer[] {
  return defined(
    arr(obj(raw)?.organic_results).map((r) => {
      const o = obj(r);
      return o
        ? offer("amazon", {
            title: o.title,
            price: o.extracted_price,
            priceText: o.price,
            url: o.link_clean ?? o.link,
            seller: "Amazon",
            rating: o.rating,
            thumbnail: o.thumbnail,
          })
        : undefined;
    }),
  );
}

export function ebayOffers(raw: unknown): Offer[] {
  return defined(
    arr(obj(raw)?.organic_results).map((r) => {
      const o = obj(r);
      if (!o) return undefined;
      const price = obj(o.price);
      const from = obj(price?.from);
      return offer("ebay", {
        title: o.title,
        price: price?.extracted ?? from?.extracted,
        priceText: price?.raw ?? from?.raw,
        url: o.link,
        seller: obj(o.seller)?.username,
        thumbnail: o.thumbnail,
      });
    }),
  );
}

export function walmartOffers(raw: unknown): Offer[] {
  return defined(
    arr(obj(raw)?.organic_results).map((r) => {
      const o = obj(r);
      if (!o) return undefined;
      return offer("walmart", {
        title: o.title,
        price: obj(o.primary_offer)?.offer_price,
        url: o.product_page_url,
        seller: o.seller_name,
        rating: o.rating,
        inStock: typeof o.out_of_stock === "boolean" ? !o.out_of_stock : undefined,
        thumbnail: o.thumbnail,
      });
    }),
  );
}

const EARTH_KM = 6371;

export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** A Google Maps link that opens the place itself (Maps URLs, api=1). */
export function mapsLink(title: string, address: string, placeId?: string): string {
  const url = new URL("https://www.google.com/maps/search/");
  url.searchParams.set("api", "1");
  url.searchParams.set("query", address ? `${title}, ${address}` : title);
  if (placeId) url.searchParams.set("query_place_id", placeId);
  return url.toString();
}

export function places(raw: unknown, origin?: { lat: number; lng: number }): Place[] {
  const root = obj(raw);
  // One exact match comes back as place_results instead of a list.
  const list = root?.local_results !== undefined ? arr(root.local_results) : root?.place_results ? [root.place_results] : [];
  const out = defined(
    list.map((r) => {
      const o = obj(r);
      const title = str(o?.title);
      if (!o || !title) return undefined;
      const address = str(o.address) ?? "";
      const place: Place = { title, address, mapsUrl: mapsLink(title, address, str(o.place_id)) };
      const rating = num(o.rating);
      if (rating !== undefined) place.rating = rating;
      const reviews = num(o.reviews);
      if (reviews !== undefined) place.reviews = reviews;
      const hours = str(o.hours) ?? str(o.open_state);
      if (hours) place.hours = hours;
      const website = safeUrl(o.website);
      if (website) place.url = website;
      const gps = obj(o.gps_coordinates);
      const lat = num(gps?.latitude);
      const lng = num(gps?.longitude);
      if (origin && lat !== undefined && lng !== undefined) {
        place.distanceKm = Math.round(distanceKm(origin, { lat, lng }) * 10) / 10;
      }
      return place;
    }),
  );
  return origin ? out.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity)) : out;
}

export function events(raw: unknown): MakerEvent[] {
  return defined(
    arr(obj(raw)?.events_results).map((r) => {
      const o = obj(r);
      const title = str(o?.title);
      if (!o || !title) return undefined;
      const date = obj(o.date);
      const when = str(date?.when) ?? str(date?.start_date);
      const address = arr(o.address).map(str).filter(Boolean).join(", ");
      const venue = str(obj(o.venue)?.name) ?? str(arr(o.address)[0]);
      const tickets = arr(o.ticket_info).map(obj);
      const url = safeUrl(o.link) ?? safeUrl(tickets[0]?.link) ?? safeUrl(obj(o.venue)?.link);
      if (!when || !venue || !url) return undefined;
      const event: MakerEvent = { title, when, venue, url };
      if (address && address !== venue) event.address = address;
      const thumbnail = safeUrl(o.thumbnail) ?? safeUrl(o.image);
      if (thumbnail) event.thumbnail = thumbnail;
      return event;
    }),
  );
}

export function videos(raw: unknown): Video[] {
  return defined(
    arr(obj(raw)?.video_results).map((r) => {
      const o = obj(r);
      const title = str(o?.title);
      const url = safeUrl(o?.link);
      const thumbs = obj(o?.thumbnail);
      const thumbnail = safeUrl(thumbs?.static) ?? safeUrl(o?.thumbnail);
      const channel = str(obj(o?.channel)?.name);
      if (!o || !title || !url || !thumbnail || !channel) return undefined;
      const video: Video = { title, channel, url, thumbnail };
      const duration = str(o.length);
      if (duration) video.duration = duration;
      return video;
    }),
  );
}

export function webResults(raw: unknown): WebResult[] {
  return defined(
    arr(obj(raw)?.organic_results).map((r) => {
      const o = obj(r);
      const title = str(o?.title);
      const url = safeUrl(o?.link);
      if (!title || !url) return undefined;
      return { title, url, snippet: str(o?.snippet) ?? "" };
    }),
  );
}

export const EXTRACT_MAX_BYTES = 6 * 1024;

/** Cuts text to at most `maxBytes` of UTF-8 without splitting a character. */
export function capBytes(text: string, maxBytes: number): string {
  const encoder = new TextEncoder();
  if (encoder.encode(text).byteLength <= maxBytes) return text;
  let lo = 0;
  let hi = text.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (encoder.encode(text.slice(0, mid)).byteLength <= maxBytes - 3) lo = mid;
    else hi = mid - 1;
  }
  // Don't leave half of a surrogate pair at the end.
  const end = /[\uD800-\uDBFF]/.test(text.charAt(lo - 1)) ? lo - 1 : lo;
  return `${text.slice(0, end).trimEnd()}…`;
}

export function pageExtract(raw: unknown, requested: string): PageExtract | undefined {
  const root = obj(raw);
  const info = obj(root?.page_information);
  const content = obj(root?.text_content);
  const text = str(content?.markdown) ?? str(content?.full) ?? str(content?.excerpt);
  if (!text) return undefined;
  return {
    url: safeUrl(info?.final_url) ?? safeUrl(info?.url) ?? requested,
    title: str(info?.title) ?? requested,
    text: capBytes(text.replace(/\s+\n/g, "\n").replace(/[ \t]{2,}/g, " "), EXTRACT_MAX_BYTES),
  };
}
