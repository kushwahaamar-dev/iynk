import type { MetadataRoute } from "next";
import { DEFAULT_LOCALE } from "@/i18n/config";
import { getT } from "@/i18n/server";
import { PAPER_LIGHT } from "@/lib/theme-colors";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const t = await getT(DEFAULT_LOCALE, "common");
  const name = t("site.name");
  return {
    name,
    short_name: name,
    description: t("site.description"),
    start_url: "/",
    display: "standalone",
    theme_color: PAPER_LIGHT,
    background_color: PAPER_LIGHT,
    icons: [
      { src: "/icon.svg", type: "image/svg+xml", sizes: "any" },
      { src: "/apple-icon.png", type: "image/png", sizes: "180x180" },
    ],
  };
}
