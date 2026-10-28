import type { NextConfig } from "next";
import { buildCsp, buildFigureCsp, parseOrigins } from "./src/lib/csp";
import { DEFAULT_LOCALE, LANG_COOKIE, LOCALES, acceptLanguagePattern } from "./src/i18n/config";

const rawOrigins = process.env.IYNK_CONNECT_ORIGINS ?? "";
const connectOrigins = parseOrigins(rawOrigins);
if (connectOrigins.length < rawOrigins.split(",").filter((origin) => origin.trim()).length) {
  console.warn("IYNK_CONNECT_ORIGINS: ignored entries that are not a bare http, https, ws or wss origin");
}

// No camera or USB use anywhere: microphone, location and Web Serial are the hardware the app asks for.
const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=(self), serial=(self), usb=(), payment=()" },
  { key: "Content-Security-Policy", value: buildCsp({ dev: process.env.NODE_ENV !== "production", connectOrigins }) },
];

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  cacheComponents: true,
  partialPrefetching: true,
  // Agents build side by side with NEXT_DIST_DIR=.next-<label> (D12).
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // While ~40 agents share one tree, IYNK_BUILD_SKIP_TYPECHECK=1 lets one of
  // them build its routes past another's half-written file; they type-check
  // with `npm run typecheck` instead. Unset it for a release build.
  typescript: { ignoreBuildErrors: process.env.IYNK_BUILD_SKIP_TYPECHECK === "1" },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      { source: "/:path*", headers: SECURITY_HEADERS },
      {
        // Figures are same-origin iframes: short cache, no framing by other sites.
        source: "/figures/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=300, must-revalidate" },
          { key: "Content-Security-Policy", value: buildFigureCsp() },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
    ];
  },
  async redirects() {
    // A path with no language ("/", "/boards/uno-r3" from a pitch or a shared link): the saved language cookie, then
    // the browser's languages, then English. The query (a room link's ?room=) comes along.
    const toLanguage = (source: string, path: string) => [
      {
        source,
        has: [{ type: "cookie" as const, key: LANG_COOKIE, value: `(?<lang>${LOCALES.join("|")})` }],
        destination: `/:lang${path}`,
        permanent: false,
      },
      {
        source,
        has: [{ type: "header" as const, key: "accept-language", value: acceptLanguagePattern() }],
        destination: `/:lang${path}`,
        permanent: false,
      },
      { source, destination: `/${DEFAULT_LOCALE}${path}`, permanent: false },
    ];
    return [
      ...toLanguage("/", ""),
      ...toLanguage("/:section(boards|robotics|drones|about|together)/:rest*", "/:section/:rest*"),
    ];
  },
};

export default nextConfig;
