// The /api/search/* response shapes (HX-CONTRACT H5), shared by the server
// normalisers, the route handlers and the panels. Types only: nothing here
// ships to the browser.

export const OFFER_SOURCES = ["google_shopping", "amazon", "ebay", "walmart"] as const;
export type OfferSource = (typeof OFFER_SOURCES)[number];

export type Offer = {
  source: OfferSource;
  title: string;
  /** Price of one listing, in `currency`. */
  price: number;
  currency: string;
  url: string;
  /** The store (Google Shopping) or seller (eBay, Walmart). */
  seller?: string;
  rating?: number;
  /** False only when the listing says it is out of stock; unknown stays undefined. */
  inStock?: boolean;
  thumbnail?: string;
  /** Units in one listing when the title says so ("4pcs", "2 pairs"). */
  pack?: number;
};

export type PartOffers = {
  key: string;
  offers: Offer[];
  /** Index into `offers` of the cheapest relevant listing in stock. */
  best?: number;
};

/** Why some prices are missing: the search budget ran out, or an upstream call failed. */
export type OffersGap = "quota" | "upstream";

export type OffersResponse = { parts: PartOffers[]; fetchedAt: string; partial?: OffersGap };

export const NEARBY_KINDS = ["makerspace", "electronics", "hobby", "flying-field"] as const;
export type NearbyKind = (typeof NEARBY_KINDS)[number];

export type Place = {
  title: string;
  address: string;
  rating?: number;
  reviews?: number;
  hours?: string;
  url?: string;
  mapsUrl: string;
  distanceKm?: number;
};

export type NearbyResponse = { places: Place[] };

export type MakerEvent = {
  title: string;
  when: string;
  venue: string;
  address?: string;
  url: string;
  thumbnail?: string;
};

export type EventsResponse = { events: MakerEvent[] };

export type Video = {
  title: string;
  channel: string;
  duration?: string;
  url: string;
  thumbnail: string;
};

export type VideosResponse = { videos: Video[] };

export type WebResult = { title: string; url: string; snippet: string };

export type PageExtract = { url: string; title: string; text: string };

export type WebResponse = { results: WebResult[]; extracts?: PageExtract[] };

/** Error codes the search routes answer with, besides the shared ones (bad_request, rate_limited). */
export type SearchErrorCode = "not_configured" | "quota_exhausted" | "upstream_failed" | "upstream_timeout";
