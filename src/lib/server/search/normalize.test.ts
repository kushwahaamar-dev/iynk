import { describe, expect, it } from "vitest";
import amazon from "./__fixtures__/amazon.docs.json";
import ebay from "./__fixtures__/ebay.docs.json";
import extractDoc from "./__fixtures__/extract.docs.json";
import google from "./__fixtures__/google.docs.json";
import mapsDoc from "./__fixtures__/google_maps.docs.json";
import eventsDoc from "./__fixtures__/google_events.docs.json";
import shopping from "./__fixtures__/google_shopping.docs.json";
import walmart from "./__fixtures__/walmart.docs.json";
import youtube from "./__fixtures__/youtube.docs.json";
import {
  amazonOffers,
  capBytes,
  currencyOf,
  distanceKm,
  ebayOffers,
  events,
  googleShoppingOffers,
  packSize,
  pageExtract,
  parsePrice,
  places,
  safeUrl,
  videos,
  walmartOffers,
  webResults,
} from "./normalize";

// Fixtures are the response examples from SerpApi's own docs (serpapi.com/<engine>-api.md, read 2026-10-24).

describe("offers normalisers (docs examples)", () => {
  it("maps Google Shopping results", () => {
    expect(googleShoppingOffers(shopping)).toEqual([
      {
        source: "google_shopping",
        title: "Apple iPhone 17",
        price: 829,
        currency: "USD",
        url: expect.stringMatching(/^https:\/\/www\.google\.com\/search\?ibp=oshop/),
        seller: "Apple",
        rating: 4.7,
        thumbnail: expect.stringMatching(/^https:\/\/encrypted-tbn2\.gstatic\.com\//),
      },
    ]);
  });

  it("maps Amazon organic results with the clean product link", () => {
    const [first] = amazonOffers(amazon);
    expect(first).toMatchObject({
      source: "amazon",
      title: "Amazon Fresh Colombia Ground Coffee, Medium Roast, 12 Ounce",
      price: 6.91,
      currency: "USD",
      url: "https://www.amazon.com/dp/B073CVZ9GZ/",
      seller: "Amazon",
      rating: 4.4,
    });
  });

  it("maps eBay price ranges to the lowest price and keeps the seller", () => {
    expect(ebayOffers(ebay)[0]).toMatchObject({ source: "ebay", price: 24.6, currency: "USD", seller: "vilarimports" });
  });

  it("maps Walmart's primary offer and stock flag", () => {
    expect(walmartOffers(walmart)[0]).toMatchObject({
      source: "walmart",
      title: "Bimbo Soft White Bread, 20 oz, White Bread, Bag",
      price: 1.98,
      currency: "USD",
      seller: "Walmart.com",
      inStock: true,
      rating: 4.5,
    });
  });

  it("drops listings without a price, a title or a safe link", () => {
    const raw = {
      shopping_results: [
        { title: "No price", product_link: "https://example.com/a" },
        { title: "Script link", extracted_price: 5, product_link: "javascript:alert(1)" },
        { extracted_price: 5, product_link: "https://example.com/b" },
        { title: "Good", price: "$1,299.50", product_link: "https://example.com/c" },
        "not an object",
      ],
    };
    expect(googleShoppingOffers(raw)).toEqual([
      { source: "google_shopping", title: "Good", price: 1299.5, currency: "USD", url: "https://example.com/c" },
    ]);
    expect(googleShoppingOffers(null)).toEqual([]);
    expect(amazonOffers({ organic_results: "nope" })).toEqual([]);
  });

  it("marks out-of-stock Walmart listings", () => {
    const raw = {
      organic_results: [
        { title: "SG90 servo", primary_offer: { offer_price: 3.5 }, product_page_url: "https://www.walmart.com/ip/1", out_of_stock: true },
      ],
    };
    expect(walmartOffers(raw)[0].inStock).toBe(false);
  });
});

describe("helpers", () => {
  it("parses prices", () => {
    expect(parsePrice(12.5)).toBe(12.5);
    expect(parsePrice("$1,234.99")).toBe(1234.99);
    expect(parsePrice("€7")).toBe(7);
    expect(parsePrice("free")).toBeUndefined();
    expect(parsePrice(0)).toBeUndefined();
    expect(parsePrice(Number.NaN)).toBeUndefined();
  });

  it("reads the currency from the price text", () => {
    expect(currencyOf("$5")).toBe("USD");
    expect(currencyOf("£5")).toBe("GBP");
    expect(currencyOf("CA$5")).toBe("CAD");
    expect(currencyOf(undefined)).toBe("USD");
  });

  it("reads pack sizes from titles", () => {
    expect(packSize("EMAX ECO II 2306 1700KV Brushless Motor (4pcs)")).toBe(4);
    expect(packSize("HQProp 5x4.3x3 V1S propellers 2 pairs")).toBe(4);
    expect(packSize("Gemfan 51466 props - Set of 8")).toBe(8);
    expect(packSize("SG90 micro servo, pack of 10")).toBe(10);
    expect(packSize("T-Motor F60 Pro V 1750KV x4")).toBe(4);
    expect(packSize("HQProp 5x4.3x3 tri-blade")).toBeUndefined();
    expect(packSize("6S 1100mAh 120C LiPo XT60")).toBeUndefined();
    expect(packSize("Arduino Uno R3 1pc")).toBeUndefined();
  });

  it("only lets http(s) links through", () => {
    expect(safeUrl("https://a.example/x")).toBe("https://a.example/x");
    expect(safeUrl("data:text/html,hi")).toBeUndefined();
    expect(safeUrl("/relative")).toBeUndefined();
    expect(safeUrl(42)).toBeUndefined();
  });

  it("caps text by UTF-8 bytes without splitting characters", () => {
    const text = "हिन्दी ".repeat(2000);
    const out = capBytes(text, 6144);
    expect(new TextEncoder().encode(out).byteLength).toBeLessThanOrEqual(6144);
    expect(out.endsWith("…")).toBe(true);
    expect(capBytes("short", 6144)).toBe("short");
    const emoji = capBytes("🙂".repeat(3000), 100);
    expect(emoji.includes("�")).toBe(false);
    expect(/[\uD800-\uDBFF]…$/.test(emoji)).toBe(false);
  });

  it("measures great-circle distance", () => {
    // Austin to Dallas is about 293 km in a straight line.
    expect(distanceKm({ lat: 30.2672, lng: -97.7431 }, { lat: 32.7767, lng: -96.797 })).toBeCloseTo(293, -1);
  });
});

describe("places", () => {
  it("maps the docs example with a Maps link", () => {
    const [place] = places(mapsDoc);
    expect(place).toMatchObject({
      title: "Shambhu Coffee & Gelato",
      address: "667 Grand St Unit B, Jersey City, NJ 07304",
      rating: 5,
      reviews: 26,
      // Google writes "10 PM" with a narrow no-break space.
      hours: expect.stringMatching(/^Closes soon · 10\s?PM/u),
    });
    const url = new URL(place.mapsUrl);
    expect(url.origin + url.pathname).toBe("https://www.google.com/maps/search/");
    expect(url.searchParams.get("api")).toBe("1");
    expect(url.searchParams.get("query_place_id")).toBe("ChIJC8vfEbJRwokRxWSkJ-0WeAo");
    expect(place.distanceKm).toBeUndefined();
  });

  it("adds distances and sorts nearest first when there is an origin", () => {
    const raw = {
      local_results: [
        { title: "Far", address: "B", gps_coordinates: { latitude: 30.5, longitude: -97.7 }, website: "https://far.example" },
        { title: "Near", address: "A", gps_coordinates: { latitude: 30.27, longitude: -97.74 } },
        { title: "Unknown", address: "C" },
      ],
    };
    const out = places(raw, { lat: 30.2672, lng: -97.7431 });
    expect(out.map((p) => p.title)).toEqual(["Near", "Far", "Unknown"]);
    expect(out[0].distanceKm).toBeLessThan(1);
    expect(out[1].url).toBe("https://far.example/");
  });

  it("accepts a single place_results answer", () => {
    expect(places({ place_results: { title: "Austin Makerspace", address: "1 Main St" } })).toHaveLength(1);
  });
});

describe("events, videos, web, extract", () => {
  it("maps Google Events with the ticket link", () => {
    expect(events(eventsDoc)).toEqual([
      {
        title: "ACL Live Tour",
        when: "Sep 10, 8:30 PM",
        venue: "Austin City Limits Live (ACL Live & 3TEN ACL Live)",
        url: "https://www.axs.com/events/1513751?cid=aff_google",
        thumbnail: expect.stringMatching(/^https:\/\/encrypted-tbn1\.gstatic\.com\//),
      },
    ]);
  });

  it("prefers the event's own link and drops events without a date", () => {
    const raw = {
      events_results: [
        { title: "Robot night", date: { start_date: "Oct 30" }, link: "https://ev.example/1", address: ["Hall 1", "Austin, TX"] },
        { title: "No date", link: "https://ev.example/2", address: ["Hall 2"] },
      ],
    };
    expect(events(raw)).toEqual([
      { title: "Robot night", when: "Oct 30", venue: "Hall 1", address: "Hall 1, Austin, TX", url: "https://ev.example/1" },
    ]);
  });

  it("maps YouTube video results", () => {
    expect(videos(youtube)[0]).toEqual({
      title: "Last To Leave Mansion, Keeps It",
      channel: "MrBeast",
      duration: "57:51",
      url: "https://www.youtube.com/watch?v=Af6i6ChAVTw",
      thumbnail: expect.stringMatching(/^https:\/\/i\.ytimg\.com\//),
    });
  });

  it("maps Google organic results", () => {
    expect(webResults(google)[0]).toEqual({
      title: "Coffee",
      url: "https://en.wikipedia.org/wiki/Coffee",
      snippet: expect.stringContaining("Coffee is a beverage"),
    });
  });

  it("maps an Extract API page to capped text", () => {
    const page = pageExtract(extractDoc, "https://en.wikipedia.org/wiki/Coffee");
    expect(page).toMatchObject({ url: "https://en.wikipedia.org/wiki/Coffee", title: "Coffee - Wikipedia" });
    expect(page?.text.length).toBeGreaterThan(20);
    const long = { page_information: { title: "Datasheet" }, text_content: { full: "x".repeat(20_000) } };
    expect(new TextEncoder().encode(pageExtract(long, "https://d.example/a.pdf")!.text).byteLength).toBeLessThanOrEqual(6144);
    expect(pageExtract({ page_information: {} }, "https://d.example")).toBeUndefined();
  });
});
