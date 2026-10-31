import type { MetadataRoute } from "next";
import { BOARD_IDS, DRONE_IDS, ROBOTICS_IDS } from "@/content/ids";
import { LOCALES } from "@/i18n/config";
import { alternatesFor, siteUrl } from "@/i18n/seo";

const PAGES = [
  "",
  "/boards",
  "/robotics",
  "/drones",
  "/together",
  "/about",
  "/privacy",
  ...BOARD_IDS.map((id) => `/boards/${id}`),
  ...ROBOTICS_IDS.map((id) => `/robotics/${id}`),
  ...DRONE_IDS.flatMap((id) => [`/drones/${id}`, `/drones/${id}/fly`]),
];

const absolute = (path: string) => new URL(path, siteUrl()).href;

export default function sitemap(): MetadataRoute.Sitemap {
  return LOCALES.flatMap((locale) =>
    PAGES.map((path) => {
      const { canonical, languages = {} } = alternatesFor(locale, path);
      return {
        url: absolute(String(canonical)),
        alternates: { languages: Object.fromEntries(Object.entries(languages).map(([tag, href]) => [tag, absolute(String(href))])) },
      };
    }),
  );
}
