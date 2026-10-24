import type { NextConfig } from "next";
import { DEFAULT_LOCALE, LANG_COOKIE, LOCALES, acceptLanguagePattern } from "./src/i18n/config";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Agents build side by side with NEXT_DIST_DIR=.next-<label> (D12).
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // While ~40 agents share one tree, SIMLAB_BUILD_SKIP_TYPECHECK=1 lets one of
  // them build its routes past another's half-written file; they type-check
  // with `npm run typecheck` instead. Deploy builds always type-check.
  typescript: { ignoreBuildErrors: process.env.SIMLAB_BUILD_SKIP_TYPECHECK === "1" && !process.env.VERCEL },
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
      {
        // Figures are same-origin iframes: short cache, no framing by other sites.
        source: "/figures/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=300, must-revalidate" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
    ];
  },
  async redirects() {
    // "/" has no page: saved language cookie, then the browser's languages, then English.
    return [
      {
        source: "/",
        has: [{ type: "cookie", key: LANG_COOKIE, value: `(?<lang>${LOCALES.join("|")})` }],
        destination: "/:lang",
        permanent: false,
      },
      {
        source: "/",
        has: [{ type: "header", key: "accept-language", value: acceptLanguagePattern() }],
        destination: "/:lang",
        permanent: false,
      },
      { source: "/", destination: `/${DEFAULT_LOCALE}`, permanent: false },
    ];
  },
};

export default nextConfig;
