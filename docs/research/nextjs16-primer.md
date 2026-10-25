# Next.js 16.4.3 primer for iynk

Written on 2026-10-24 for whoever rebuilds iynk, people and agents alike. It covers only the Next.js patterns iynk needs. Every code block below was compiled with `next build`, served with `next start` (or `next dev` where it says so) and checked in headless Chromium through Playwright. Anything I did not try is marked as not tried.

**Test bed.** A throwaway app with iynk's own `package.json`, `next.config.ts`, `tsconfig.json`, `eslint.config.mjs` and `globals.css`, plus: 13 languages, 12 boards with 4 lessons each (11 for the scale test), 10 drone pages, one JSON dictionary per language with real translations, and `public/figures/probe.html`, a stand-in for a Colorfigures figure that counts timer ticks and animation frames and talks to its host over `postMessage`. Versions: next 16.4.3 (Turbopack), react 19.3.0, typescript 5.9.3, eslint 9.39.5 with eslint-config-next 16.4.3, tailwindcss 4.3.3. Machine: Apple M4 Pro (14 cores), macOS 27.0.1, Node 24.8.0, npm 11.6.0, Chromium revision 1248. The app lived in the session scratchpad and is not in the repo, so the code that matters is copied here verbatim, with its path in the app above each block.

The bundled docs that back this up, all under `node_modules/next/dist/docs/01-app/`: `03-api-reference/03-file-conventions/02-route-segment-config/ensureStatic.md` and `instant.md`, `02-guides/preserving-ui-state.md`, `02-guides/preventing-flash-before-hydration.md`, `02-guides/internationalization.md`, `03-api-reference/04-functions/next-root-params.md`, `03-api-reference/04-functions/generate-static-params.md`, `02-guides/testing/vitest.md` and `playwright.md`.

## Rules for iynk implementers

1. One root layout: `src/app/[lang]/layout.tsx`. It renders `<html lang dir>`, returns all 13 locales from `generateStaticParams` and exports `ensureStatic = "navigation"`. There is no `app/layout.tsx` and no `app/page.tsx`.
2. Everything under that layout is static. `cookies()`, `headers()`, `Date.now()`, `new Date()`, `Math.random()` and uncached async I/O in a Server Component fail the build, even inside `<Suspense>`. Read content files with `readFileSync`, `import()`, or inside a `"use cache"` function.
3. A page with its own params keeps its default export synchronous and awaits `params` in an async child inside `<Suspense>`. Only the root param `lang` may be awaited at the top level.
4. Never export `dynamicParams` or `revalidate`, and never return `[]` from `generateStaticParams`. Unknown slugs call `notFound()`; under `ensureStatic` the first request is already a 404.
5. The language comes from the URL and nothing else. Theme and progress live in `localStorage` and are read with `useSyncExternalStore` and a server snapshot that means "nothing saved".
6. `/` is redirected by `redirects()` in `next.config.ts`: cookie `iynk-lang`, then `Accept-Language`, then `/en`. No proxy, no page at `/`.
7. The language picker writes the `iynk-lang` cookie and calls `router.push`. Its `<select>` is controlled (`value`, not `defaultValue`).
8. The theme is set before paint by an inline script rendered through `InlineScript`, which must be a Client Component, with `suppressHydrationWarning` on `<html>`. `ThemeToggle` re-applies it in a `useLayoutEffect`, because switching language resets the attributes on `<html>`.
9. Treat every page the user leaves as still mounted. Activity keeps up to three routes in the DOM under `display: none !important`: effects clean up and run again, form controls keep what the user typed, ids and test selectors see duplicates, and iframes keep running or reload while hidden.
10. Figures: the host pauses the iframe on hide, posts `hello` on every show and sends its full state when the figure answers `ready`. The figure pauses itself when its own IntersectionObserver says it is off screen and treats every `ready` as a cold start. Post to `location.origin`, never `"*"`, and check `event.source`.
11. Dictionaries load on the server, one dynamic `import()` per locale. Client Components get only the strings they render, as props.
12. Every page's `generateMetadata` returns `alternates` from one helper (13 hreflang links, `x-default`, canonical). `metadataBase` is set once, in the root layout.
13. Fonts: keep the Latin `next/font` faces; add Noto Sans Hebrew and Noto Sans Devanagari with `preload: false` and swap the CSS variables for `he` and `hi`; use platform fonts for zh, ja and ko.
14. Add `src/app/[lang]/[...rest]/page.tsx` that calls `notFound()`, or mistyped URLs get Next's unstyled English 404.
15. Type-check with `next typegen && tsc --noEmit`. `PageProps` and `LayoutProps` are generated into `.next/types`, `next-env.d.ts` is gitignored, and stale generated types break `tsc` after a route is deleted.
16. Unit tests: Vitest 5 with jsdom and a setup file that mocks `server-only` and calls `cleanup()`. Pin `vite` as a direct dev dependency. End-to-end: Playwright Test against `next build && next start`, never against `next dev`.
17. Prerender all 13 languages. About 2,000 pages took 11 seconds to build here.

## (a) `[lang]` as the root segment, everything static

All pages live under `src/app/[lang]/`, and the `[lang]` layout is the root layout.

`src/app/[lang]/layout.tsx`

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { InlineScript } from "@/components/inline-script";
import { LanguageSelect } from "@/components/language-select";
import { ThemeToggle } from "@/components/theme-toggle";
import { fontVariables } from "@/lib/fonts";
import { dirOf, htmlLang, isLocale, locales } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import "../globals.css";

// Every route under this layout must be fully static; unknown params block
// until rendered instead of streaming a 200 shell first.
export const ensureStatic = "navigation";

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export const metadata: Metadata = {
  metadataBase: new URL("https://iynk.example"),
  title: { template: "%s · iynk", default: "iynk" },
};

const themeBoot = `try{var t=localStorage.getItem("iynk-theme");if(t==="dark"||t==="light")document.documentElement.dataset.theme=t}catch(e){}`;

export default async function LangLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);

  return (
    <html lang={htmlLang[lang]} dir={dirOf(lang)} className={fontVariables} suppressHydrationWarning>
      <head>
        <InlineScript html={themeBoot} />
      </head>
      <body>
        <header className="top">
          <Link href={`/${lang}`}>{dict.nav.home}</Link>
          <ThemeToggle labels={dict.client.theme} />
          <LanguageSelect current={lang} label={dict.client.language} />
        </header>
        {children}
      </body>
    </html>
  );
}
```

`ensureStatic = "navigation"` on the root layout makes every route below it fully static. Two consequences matter: a URL whose params were not listed is rendered on demand and only answered once the whole page is ready, so `notFound()` gives a real 404; and anything that needs request data fails the build. `params` arrives typed as `string`, so `isLocale` is what narrows it to `Locale`.

A page with its own params keeps the default export synchronous and does the `await params` inside a Suspense boundary. The same shape is used for the board, lesson and drone pages:

`src/app/[lang]/boards/[board]/page.tsx`

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ProgressBadge } from "@/components/progress-badge";
import { boards, findBoard } from "@/lib/content";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { alternatesFor } from "@/lib/seo";

type Props = PageProps<"/[lang]/boards/[board]">;

export function generateStaticParams() {
  return boards.map((b) => ({ board: b.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, board } = await params;
  if (!isLocale(lang) || !findBoard(board)) return {};
  return { title: board, alternates: alternatesFor(lang, `/boards/${board}`) };
}

// The page itself stays synchronous so the App Shell (shared by every board
// link) has real markup; the URL-specific part sits behind Suspense.
export default function BoardPage({ params }: Props) {
  return (
    <main>
      <Suspense fallback={<div className="skeleton" aria-busy="true" />}>
        <Board params={params} />
      </Suspense>
    </main>
  );
}

async function Board({ params }: Pick<Props, "params">) {
  const { lang, board: slug } = await params;
  const board = findBoard(slug);
  if (!isLocale(lang) || !board) notFound();
  const dict = await getDictionary(lang);

  return (
    <>
      <h1>{board.slug}</h1>
      <ProgressBadge prefix={`${board.slug}/`} total={board.lessons.length} template={dict.client.progress} />
      <ul>
        {board.lessons.map((lesson) => (
          <li key={lesson}>
            <Link href={`/${lang}/boards/${board.slug}/${lesson}`} prefetch={true}>
              {lesson}
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
```

Nested segments list only their own params; `lang` comes from the layout ("bottom up" in the `generateStaticParams` docs):

`src/app/[lang]/boards/[board]/[lesson]/page.tsx`

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { FigureHost } from "@/components/figure-host";
import { MarkDone } from "@/components/mark-done";
import { boards, findBoard } from "@/lib/content";
import { isLocale } from "@/lib/i18n/config";
import { alternatesFor } from "@/lib/seo";

type Props = PageProps<"/[lang]/boards/[board]/[lesson]">;

// Bottom up: this page lists [board] and [lesson]; [lang] comes from the root layout.
export function generateStaticParams() {
  return boards.flatMap((b) => b.lessons.map((lesson) => ({ board: b.slug, lesson })));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, board, lesson } = await params;
  if (!isLocale(lang) || !findBoard(board)?.lessons.includes(lesson)) return {};
  return { title: `${board} · ${lesson}`, alternates: alternatesFor(lang, `/boards/${board}/${lesson}`) };
}

export default function LessonPage({ params }: Props) {
  return (
    <main>
      <Suspense fallback={<div className="skeleton" aria-busy="true" />}>
        <Lesson params={params} />
      </Suspense>
    </main>
  );
}

async function Lesson({ params }: Pick<Props, "params">) {
  const { lang, board, lesson } = await params;
  if (!isLocale(lang) || !findBoard(board)?.lessons.includes(lesson)) notFound();

  return (
    <>
      <h1>
        {board} / {lesson}
      </h1>
      <MarkDone id={`${board}/${lesson}`} />
      <FigureHost src="/figures/probe.html" title={`${board}/${lesson} `} />
      <p>
        <Link href={`/${lang}/boards/${board}`}>back to {board}</Link>
      </p>
    </>
  );
}
```

What the build produced:

- `✓ Generating static pages using 9 workers (944/944) in 2.5s` for 13 languages × 71 pages plus the catch-all entries from (k), and 6.5 s for the whole `next build` from an empty `.next`. Every concrete page is `○ (Static)`.
- Without `ensureStatic` the same tree built 1,124 entries; the extra ones are App Shells for partially known params.
- Unknown slug (`/es/boards/no-such-board`):

| setup | first request | later requests |
|---|---|---|
| `next start`, no `ensureStatic` | `200` with `<html id="__next_error__">`, `noindex`, `x-nextjs-postponed: 1` and a private, no-store `Cache-Control`; the browser then renders the 404 | `404`, `x-nextjs-cache: HIT`, `s-maxage=31536000` |
| `next start` with `ensureStatic` | `404` | `404` |
| `next dev`, either way | `200` | `200` |

- An unknown language (`/xx`) is a 404 either way.

What failed:

1. Awaiting `params` at the top of an async page builds, but `next dev` logs this on every load of the route (the dev-only `instant` validation):

   ```
   Error: Route "/[lang]/boards/[board]": Next.js encountered URL data during prerendering or a navigation.

   `params` or `searchParams` accessed outside of `<Suspense>` may prevent the navigation from being instant, leading to a slower user experience.

   Ways to fix this:
     - [stream] Provide a placeholder with `<Suspense fallback={...}>` around the data access
     - [block] Set `export const instant = false` to allow a blocking route
   ```

   The bundled docs say params need a Suspense boundary "even when the values are predefined by generateStaticParams". Moving the await into the Suspense child, as above, removed it. Awaiting `params` in `generateMetadata` did not trigger it, and neither did the home page, which awaits only `lang` at the top level.

2. Each of these, put in a page under the root layout, failed `next build`:

   | code | build error |
   |---|---|
   | `export const dynamicParams = false;` | `Route segment config "dynamicParams" is not compatible with nextConfig.cacheComponents. Please remove it.` |
   | `export const revalidate = 60;` | the same for `"revalidate"` |
   | `generateStaticParams() { return []; }` | `When using Cache Components, all generateStaticParams functions must return at least one result.` |
   | `await cookies()`, with or without `<Suspense>` | `Next.js encountered uncached or runtime data on a route that must be fully static.` (`static-route-dynamic`) |
   | `await readFile(...)` from `node:fs/promises` | the same `static-route-dynamic` error |
   | `Date.now()` or `new Date()` in a Server Component | `Next.js encountered the unstable value Date.now() while prerendering.` (`blocking-prerender-current-time`) |
   | `Math.random()` in a Server Component | the same, `blocking-prerender-random` |

   These built: `readFileSync`, a dynamic `import()` of JSON, `usePathname()` in a Client Component in the root layout, and an async read inside a cached function:

   ```tsx
   import { readFile } from "node:fs/promises";
   import { cacheLife } from "next/cache";

   async function loadLesson(path: string) {
     "use cache";
     cacheLife("max");
     return readFile(process.cwd() + path, "utf8");
   }

   export default async function Page() {
     const text = await loadLesson("/package.json");
     return <p>{text.length}</p>;
   }
   ```

   Without `ensureStatic`, `cookies()` inside `<Suspense>` does build: the page becomes partly dynamic, which iynk has no use for.

## (b) Sending `/` to the right language

I tried three ways. All of them keep every language page static.

**Chosen: `redirects()` in `next.config.ts`.** This is the whole config; the `headers()` part belongs to (h).

`next.config.ts`

```ts
import type { NextConfig } from "next";
import { locales } from "./src/lib/i18n/config";

const codes = locales.join("|");

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
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
    return [
      {
        source: "/",
        has: [{ type: "cookie", key: "iynk-lang", value: `(?<lang>${codes})` }],
        destination: "/:lang",
        permanent: false,
      },
      {
        // Next anchors this as ^...$. Skip whole entries until the first
        // supported primary tag; browsers list languages by preference.
        source: "/",
        has: [{ type: "header", key: "accept-language", value: `(?:[^,]*,)*?\\s*(?<lang>${codes})(?:[-_][^,;]*)?(?:;[^,]*)?(?:,.*)?` }],
        destination: "/:lang",
        permanent: false,
      },
      { source: "/", destination: "/en", permanent: false },
    ];
  },
};

export default nextConfig;
```

How it behaved, in `next start` and `next dev`:

- The `iynk-lang` cookie wins; otherwise the first supported language in `Accept-Language`; otherwise `/en`. All three are 307s, so browsers do not cache them.
- The query string survives: `/?ref=x` from a `de-DE` browser lands on `/de?ref=x` (Playwright test in (i)).
- About 1.5 ms of server time per redirect locally. No function, nothing in the build output except the routes manifest.
- A `<Link href="/">` inside the app follows the redirect as a soft navigation, with no document request.
- Importing `locales` from `src/lib/i18n/config.ts` into `next.config.ts` works, so the list of codes has one source.

Next builds a `has` matcher as ``new RegExp(`^${hasItem.value}$`)`` (`node_modules/next/dist/shared/lib/router/utils/prepare-destination.js`, line 101), so the pattern must match the whole header, and named groups are usable in `destination`. Run through that same construction:

| `Accept-Language` | lands on |
|---|---|
| `en-US,en;q=0.9` | `/en` |
| `nl-NL,nl;q=0.9,fr;q=0.8` | `/fr` |
| `zh-TW,zh;q=0.9` | `/zh` |
| `pt-BR` | `/pt` |
| `de-CH;q=0.9, en;q=0.5` | `/de` |
| `hil,he;q=0.8` | `/he` |
| `iw-IL,en;q=0.1` | `/en` |
| `*` | `/en` (no match, last rule) |
| `en;q=0.1, fr;q=0.9` | `/en` |
| `ES-es` | `/en` (no match, last rule) |

The last rows show the limits: the leftmost supported tag wins whatever its q-value, matching is case-sensitive, and the legacy `iw` code for Hebrew is not mapped. Browsers list languages in preference order with lowercase primary tags, so this is fine in practice. If exact negotiation ever matters, use the proxy below. Note that `zh-TW` lands on `/zh`, which iynk renders as Simplified Chinese.

The cookie is written by the language picker in (d). The redirect cannot see `localStorage`, so the picker writes both.

**Alternative 1: `src/proxy.ts`.**

`src/proxy.ts`

```ts
import { NextResponse, type NextRequest } from "next/server";
import { isLocale, parseAcceptLanguage, pickLocale } from "@/lib/i18n/config";

// Only "/" reaches this function; every other URL is served statically.
export function proxy(request: NextRequest) {
  const saved = request.cookies.get("iynk-lang")?.value;
  const lang = isLocale(saved) ? saved : pickLocale(parseAcceptLanguage(request.headers.get("accept-language")));
  const url = request.nextUrl.clone();
  url.pathname = `/${lang}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: "/",
};
```

Same behaviour, and it honours q-values and `iw`, because it reuses `parseAcceptLanguage` and `pickLocale` (unit-tested in (i)). The price: the build lists `ƒ Proxy (Middleware)`, `functions-config-manifest.json` gets a `/_middleware` entry with `runtime: "nodejs"` and matcher `/`, and every visit to `/` runs a function (2 to 3 ms locally; the cost on Vercel was not measured). Other routes were not affected. The bundled internationalization guide uses this approach.

**Alternative 2: a static page at `/` that redirects from an inline script.** It needs its own root layout:

`src/app/(redirect)/layout.tsx`

```tsx
import { locales } from "@/lib/i18n/config";

// Saved choice first, then the first supported browser language, else English.
// Runs in <head>, before anything in <body> can paint.
const pickAndGo = `(function(){var l=${JSON.stringify(locales)},s=null;try{s=localStorage.getItem("iynk-lang")}catch(e){}if(l.indexOf(s)<0){s="en";var n=navigator.languages||[navigator.language];for(var i=0;i<n.length;i++){var b=String(n[i]).toLowerCase().split(/[-_]/)[0];if(b==="iw")b="he";if(l.indexOf(b)>=0){s=b;break}}}location.replace("/"+s+location.search+location.hash)})()`;

export default function RedirectLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: pickAndGo }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

`src/app/(redirect)/page.tsx`

```tsx
import type { Metadata } from "next";
import { htmlLang, locales } from "@/lib/i18n/config";

export const metadata: Metadata = {
  metadataBase: new URL("https://iynk.example"),
  title: "iynk",
  alternates: {
    canonical: "/",
    languages: Object.fromEntries([...locales.map((l) => [htmlLang[l], `/${l}`]), ["x-default", "/"]]),
  },
};

// Shown only without JavaScript; the head script has already redirected.
export default function LanguagePicker() {
  return (
    <ul>
      {locales.map((l) => (
        <li key={l}>
          <a href={`/${l}`} hrefLang={htmlLang[l]} lang={htmlLang[l]}>
            {l}
          </a>
        </li>
      ))}
    </ul>
  );
}
```

It works: `○ /` is static, it can read the saved choice from `localStorage`, it keeps `?query#hash`, and it is the only option that would survive `output: "export"`. I rejected it because:

- every visit to `/` costs two document loads (64 ms in total on localhost, plus a network round trip in real life), and the first page starts fetching the Next runtime it never uses;
- with a second root layout, a `<Link href="/">` from `/en` becomes a full page reload (documents `/`, then `/fr`);
- with two root layouts, `next typegen` printed "No root params detected" and `next/root-params` lost its types (it still worked at runtime).

## (c) `<html lang dir>` per language

The language config, which everything else imports:

`src/lib/i18n/config.ts`

```ts
export const locales = ["en", "es", "pt", "fr", "de", "it", "tr", "id", "zh", "ja", "ko", "hi", "he"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

// BCP 47 tags for <html lang> and hreflang. The URL segment stays short.
export const htmlLang: Record<Locale, string> = {
  en: "en", es: "es", pt: "pt", fr: "fr", de: "de", it: "it", tr: "tr",
  id: "id", zh: "zh-Hans", ja: "ja", ko: "ko", hi: "hi", he: "he",
};

export function isLocale(value: string | undefined): value is Locale {
  return value !== undefined && (locales as readonly string[]).includes(value);
}

export function dirOf(locale: Locale): "rtl" | "ltr" {
  return locale === "he" ? "rtl" : "ltr";
}

// First supported entry wins, the way navigator.languages is ordered.
// "iw" is the legacy code some browsers still send for Hebrew.
export function pickLocale(preferred: readonly string[]): Locale {
  for (const tag of preferred) {
    const base = tag.trim().toLowerCase().split(/[-_]/)[0];
    const code = base === "iw" ? "he" : base;
    if (isLocale(code)) return code;
  }
  return defaultLocale;
}

// Accept-Language: "fr-CH, fr;q=0.9, en;q=0.8, *;q=0.5"
export function parseAcceptLanguage(header: string | null): string[] {
  if (!header) return [];
  return header
    .split(",")
    .map((part, index) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.find((p) => p.trim().startsWith("q="));
      return { tag: tag.trim(), q: q ? Number(q.trim().slice(2)) : 1, index };
    })
    .filter((entry) => entry.tag && entry.tag !== "*" && entry.q > 0)
    .sort((a, b) => b.q - a.q || a.index - b.index)
    .map((entry) => entry.tag);
}
```

Results:

- `/he` renders `<html lang="he" dir="rtl">`, `/zh` renders `lang="zh-Hans"`, the rest `dir="ltr"` with their own code.
- No hydration warnings in `next start` or `next dev`, on any language (the e2e tests in (i) fail on any console error).
- Switching language with `<Link>` or `router.push` is a soft navigation, and React updates `lang` and `dir` on the existing `<html>` element.

Nothing failed here. The side effects of a soft language switch are in (d) and (e).

## (d) Client state from `localStorage` without a hydration mismatch

Progress:

`src/lib/progress-store.ts`

```ts
// localStorage-backed progress with a cached snapshot, so
// useSyncExternalStore gets the same object back until the raw string changes.
export type Progress = { done: string[] };

const KEY = "iynk.v1";
const EMPTY: Progress = { done: [] };
const listeners = new Set<() => void>();

let cachedRaw: string | null = null;
let cached: Progress = EMPTY;

function readRaw(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function parse(raw: string | null): Progress {
  if (!raw) return EMPTY;
  try {
    const value = JSON.parse(raw) as Partial<Progress>;
    return Array.isArray(value.done) ? { done: value.done.filter((d) => typeof d === "string") } : EMPTY;
  } catch {
    return EMPTY;
  }
}

export function getProgress(): Progress {
  const raw = readRaw();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cached = parse(raw);
  }
  return cached;
}

export function getServerProgress(): Progress {
  return EMPTY;
}

export function subscribeProgress(onChange: () => void) {
  listeners.add(onChange);
  const onStorage = (event: StorageEvent) => {
    if (event.key === KEY || event.key === null) onChange();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

export function markDone(id: string) {
  const current = getProgress();
  if (current.done.includes(id)) return;
  try {
    localStorage.setItem(KEY, JSON.stringify({ done: [...current.done, id] }));
  } catch {
    // Private mode or quota: keep going without saving.
  }
  listeners.forEach((listener) => listener());
}
```

`src/components/progress-badge.tsx`

```tsx
"use client";

import { useSyncExternalStore } from "react";
import { getProgress, getServerProgress, subscribeProgress } from "@/lib/progress-store";

export function ProgressBadge({ prefix, total, template }: { prefix: string; total: number; template: string }) {
  const progress = useSyncExternalStore(subscribeProgress, getProgress, getServerProgress);
  const done = progress.done.filter((id) => id.startsWith(prefix)).length;
  return (
    <p data-testid="progress">
      {template.replace("{done}", String(done)).replace("{total}", String(total))}
    </p>
  );
}
```

`useSyncExternalStore` with a server snapshot of "nothing done" renders `0 of N` on the server and during hydration, then React re-renders with the stored value. There is no mismatch warning, no Suspense boundary, and the page stays static. The snapshot is cached by its raw string so that `getProgress` returns the same object until storage changes, which React requires of `getSnapshot`.

Theme. The boot script and `<InlineScript html={themeBoot} />` sit in the root layout in (a):

`src/components/inline-script.tsx`

```tsx
"use client";

// Runs during HTML parsing on a hard load. It has to be a Client Component:
// on a soft navigation that renders a new layout (another language), React
// creates the element in the browser, warns about a JavaScript <script>, and
// never runs it, so the client render makes it an inert text/plain block.
export function InlineScript({ html }: { html: string }) {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
```

`src/components/theme-toggle.tsx`

```tsx
"use client";

import { useLayoutEffect, useSyncExternalStore } from "react";

type Theme = "light" | "dark";
const KEY = "iynk-theme";
const listeners = new Set<() => void>();

function readTheme(): Theme | null {
  try {
    const value = localStorage.getItem(KEY);
    return value === "dark" || value === "light" ? value : null;
  } catch {
    return null;
  }
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  const onStorage = (event: StorageEvent) => {
    if (event.key === KEY) onChange();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
}

export function ThemeToggle({ labels }: { labels: { light: string; dark: string } }) {
  const theme = useSyncExternalStore(subscribe, readTheme, () => null) ?? "light";

  // A soft navigation to another language mounts a new root layout, and React
  // resets <html> to the attributes it renders, which drops the data-theme
  // the boot script set. Put it back before paint.
  useLayoutEffect(() => {
    const stored = readTheme();
    if (stored) applyTheme(stored);
  }, []);

  const next: Theme = theme === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      data-testid="theme"
      aria-pressed={theme === "dark"}
      onClick={() => {
        try {
          localStorage.setItem(KEY, next);
        } catch {}
        applyTheme(next);
        listeners.forEach((listener) => listener());
      }}
    >
      {labels[next]}
    </button>
  );
}
```

Language picker:

`src/components/language-select.tsx`

```tsx
"use client";

import { useRouter } from "next/navigation";
import { locales, type Locale } from "@/lib/i18n/config";

const names: Record<Locale, string> = {
  en: "English", es: "Español", pt: "Português", fr: "Français", de: "Deutsch",
  it: "Italiano", tr: "Türkçe", id: "Bahasa Indonesia", zh: "中文", ja: "日本語",
  ko: "한국어", hi: "हिन्दी", he: "עברית",
};

// Reads location at event time, so no usePathname and no Suspense boundary.
// Controlled on purpose: Activity keeps the previous language's layout in
// the DOM, and an uncontrolled select would come back from Back still
// showing the language the user picked on it.
export function LanguageSelect({ current, label }: { current: Locale; label: string }) {
  const router = useRouter();
  return (
    <label>
      {label}{" "}
      <select
        data-testid="lang"
        value={current}
        onChange={(event) => {
          const next = event.currentTarget.value;
          try {
            localStorage.setItem("iynk-lang", next);
          } catch {}
          // The cookie is what the "/" redirect reads.
          document.cookie = `iynk-lang=${next}; path=/; max-age=31536000; samesite=lax`;
          const rest = location.pathname.replace(/^\/[^/]+/, "");
          router.push(`/${next}${rest}${location.search}${location.hash}`);
        }}
      >
        {locales.map((l) => (
          <option key={l} value={l} lang={l}>
            {names[l]}
          </option>
        ))}
      </select>
    </label>
  );
}
```

Where Suspense is needed, all checked with `next build` under `ensureStatic`:

| hook or API | needs `<Suspense>`? |
|---|---|
| `useSyncExternalStore` with a server snapshot | no |
| `usePathname()` in a Client Component in the root layout | no (built, no dev error) |
| `useRouter()` | no |
| `useSearchParams()` | yes. Without it: ``Next.js encountered URL data `useSearchParams()` in a Client Component outside of `<Suspense>`.`` (`blocking-prerender-client-hook`) |
| `params` in a page | yes, for anything but `lang` (dev error in (a)) |
| `cookies()`, `headers()` | not allowed at all under `ensureStatic` |

Results:

- With a saved dark theme and saved progress, `data-theme="dark"` is on `<html>` before first paint, the toggle renders pressed, the badge shows the saved count, and the console is clean (e2e test "saved theme and progress survive a reload").
- In Vitest, the badge rendered with `renderToString`, then hydrated over saved progress, produced no recoverable errors (unit test in (i)).

What failed:

1. `InlineScript` without `"use client"`. The server layout imports it, so it was a Server Component and the `typeof window` check only ever ran on the server. Hard loads were fine, but a soft switch to another language mounts a new root layout in the browser, and `next dev` logged `Encountered a script tag while rendering React component. Scripts inside React components are never executed when rendering on the client.` React skips that warning for non-JavaScript script types, which is what the `text/plain` branch is for, and that branch only runs in a Client Component. The bundled docs' example gets away without the directive because its caller is a Client Component.
2. Without the `useLayoutEffect` in `ThemeToggle`, `data-theme` was gone after a soft language switch, because React resets `<html>` to the attributes the new layout renders. With the effect, sampling every animation frame across the switch found no frame without the theme, in dev and in production.
3. With `defaultValue` (uncontrolled), the picker came back from the browser's Back button showing "Français" on the English page: Activity had kept the English layout's DOM, including the value the user picked before leaving. `value={current}` fixed it. The cost of the controlled version: while the navigation is in flight the select shows the old language. With 300 ms of extra latency on RSC requests it switched at 343 ms, at the same moment as the URL.
4. A page that Activity reveals subscribes again in an effect, so a synchronous read right after the URL changes can see old data: after marking lesson 3 done and going back to the board, a read taken as soon as the URL changed returned `2 of 4`, while the first animation frame that showed the board, about 30 ms after the click, already had `3 of 4`. Retrying assertions are fine; one-shot reads are not.
5. `location.assign()` for the language switch worked, but ESLint warns (`@next/next/no-location-assign-relative-destination`), and the full reload throws away client state. `router.push` replaced it.

## (e) Activity and the figure iframe

Measured with the probe figure in a lesson page, `next start`, headless Chromium:

| step | what happened |
|---|---|
| lesson → board (Link) | the iframe stays in the DOM; the lesson's `<main>` gets `display: none !important`; the `useLayoutEffect` and `useEffect` cleanups run; the iframe keeps the same document (same boot id) |
| 3 s on the board | inside the hidden iframe, `setInterval` kept firing 10 times a second (27 → 57 ticks) and `requestAnimationFrame` about 120 times a second (327 → 688 frames): no throttling in headless Chromium; `document.visibilityState` stayed `"visible"`; the window size did not change; the iframe's own IntersectionObserver reported not intersecting |
| `pause` posted from the layout-effect cleanup | delivered: the `contentWindow` captured when the effect ran still works while hidden |
| board → same lesson (Link) | same document, effects run again, a `hello` → `ready` handshake works |
| lesson-1 → board → lesson-2 → lesson-3 | lesson-1 was evicted (three routes kept). The hidden lesson-2 subtree was removed and re-inserted when lesson-3 mounted, and its iframe reloaded while hidden: new boot id, not paused, and its boot-time `ready` went nowhere because the host's listener was detached |
| browser Back to the board | the lesson was hidden and its iframe reloaded while hidden |
| soft language switch (board page) | the old language's whole layout, header and page, stays hidden in `<body>`; up to three languages were kept. A lesson's iframe would be kept the same way (not measured) |

So the docs' line that "the DOM node was never removed" does not hold for iframes once hidden siblings are reordered: moving an iframe in the DOM reloads it.

The host used for these measurements:

`src/components/figure-host.tsx`

```tsx
"use client";

import { useEffect, useId, useLayoutEffect, useRef } from "react";

declare global {
  interface Window {
    __hostLog?: string[];
  }
}

function log(entry: string) {
  (window.__hostLog ??= []).push(`${Math.round(performance.now())} ${entry}`);
}

type ProbeMessage = { source: "probe"; type?: "ready"; bootId: string };

// Activity hides this subtree instead of unmounting it: effects clean up on
// hide and run again on show, while the iframe and its document stay alive.
export function FigureHost({ src, title }: { src: string; title: string }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const id = useId();

  useLayoutEffect(() => {
    const target = frame.current?.contentWindow;
    target?.postMessage({ type: "resume" }, location.origin);
    log(`${title}${id} layout-effect show`);
    return () => {
      target?.postMessage({ type: "pause" }, location.origin);
      log(`${title}${id} layout-effect hide`);
    };
  }, [id, title]);

  useEffect(() => {
    const onMessage = (event: MessageEvent<ProbeMessage>) => {
      if (event.origin !== location.origin) return;
      if (event.source !== frame.current?.contentWindow) return;
      if (event.data?.source !== "probe") return;
      log(`${title}${id} msg ${event.data.type ?? "beat"} ${event.data.bootId}`);
    };
    window.addEventListener("message", onMessage);
    // Ask for state on every show; the figure does not reload, so it will
    // not announce itself again on its own.
    frame.current?.contentWindow?.postMessage({ type: "hello" }, location.origin);
    log(`${title}${id} effect show`);
    return () => {
      window.removeEventListener("message", onMessage);
      log(`${title}${id} effect hide`);
    };
  }, [id, title]);

  return (
    <iframe
      ref={frame}
      src={src}
      title={title}
      className="figure-frame"
      data-host={`${title}${id}`}
      onLoad={() => log(`${title}${id} iframe load`)}
    />
  );
}
```

The figure side of the protocol:

`public/figures/probe.html`

```html
<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>probe</title></head>
<body>
<p id="state">probe</p>
<script>
  const bootId = Math.random().toString(36).slice(2, 8);
  let ticks = 0, frames = 0, paused = false, beats = 0;
  setInterval(() => { ticks++; }, 100);
  (function loop() { frames++; requestAnimationFrame(loop); })();
  setInterval(() => {
    if (paused) return;
    beats++;
    parent.postMessage({ source: "probe", bootId, ticks, frames }, location.origin);
  }, 500);
  addEventListener("message", (event) => {
    if (event.origin !== location.origin || event.source !== parent) return;
    const type = event.data && event.data.type;
    if (type === "pause") paused = true;
    if (type === "resume") paused = false;
    if (type === "hello") parent.postMessage({ source: "probe", type: "ready", bootId }, location.origin);
  });
  parent.postMessage({ source: "probe", type: "ready", bootId }, location.origin);
  let resizes = [], io = null;
  addEventListener('resize', () => resizes.push(innerWidth + 'x' + innerHeight));
  new IntersectionObserver((entries) => { io = entries[0].isIntersecting; }).observe(document.documentElement);
  window.__probe = () => ({ size: innerWidth + 'x' + innerHeight, resizes: resizes.join(' '), io, host: frameElement && frameElement.dataset.host, bootId, ticks, frames, beats, paused });
</script>
</body>
</html>
```

What the host and the figure should do:

1. Pause on hide from a `useLayoutEffect` cleanup, using the `contentWindow` captured when the effect ran.
2. On every show, post `hello`; the figure answers `ready` with its boot id; then send the full state. Do not rely on the figure's own boot-time `ready`.
3. In the figure, also stop the animation loop when its own IntersectionObserver reports it off screen: a figure that reloaded while hidden has nobody to pause it, and `visibilitychange` never fires for a hidden iframe.
4. Filter messages with `event.source === frame.current?.contentWindow`, since two hidden copies of the same lesson can exist, and post to `location.origin` rather than `"*"`.
5. Keep any figure state the user cares about in the host or in `localStorage`; a figure can be reloaded at any time.

Applied to the current `src/components/FigureFrame.tsx` (reasoned from these results, not run): it waits for the figure's boot-time `ready`, its `onLoad` resets `ready.current` to `false`, and nothing is sent on show. A figure that reloads while hidden would therefore come back with its defaults and stay out of sync until it reloads again. It also posts to `"*"`.

## (f) Dictionaries: on the server, one language at a time

`src/lib/i18n/get-dictionary.ts`

```ts
import "server-only";
import type { Locale } from "./config";

export type Dictionary = typeof import("./dictionaries/en.json");
export type ClientDictionary = Dictionary["client"];

// One dynamic import per locale: each JSON becomes its own server chunk and
// is only loaded for pages in that language.
const loaders: Record<Locale, () => Promise<Dictionary>> = {
  en: () => import("./dictionaries/en.json").then((m) => m.default),
  es: () => import("./dictionaries/es.json").then((m) => m.default),
  pt: () => import("./dictionaries/pt.json").then((m) => m.default),
  fr: () => import("./dictionaries/fr.json").then((m) => m.default),
  de: () => import("./dictionaries/de.json").then((m) => m.default),
  it: () => import("./dictionaries/it.json").then((m) => m.default),
  tr: () => import("./dictionaries/tr.json").then((m) => m.default),
  id: () => import("./dictionaries/id.json").then((m) => m.default),
  zh: () => import("./dictionaries/zh.json").then((m) => m.default),
  ja: () => import("./dictionaries/ja.json").then((m) => m.default),
  ko: () => import("./dictionaries/ko.json").then((m) => m.default),
  hi: () => import("./dictionaries/hi.json").then((m) => m.default),
  he: () => import("./dictionaries/he.json").then((m) => m.default),
};

export function getDictionary(locale: Locale): Promise<Dictionary> {
  return loaders[locale]();
}
```

Layouts and pages call `getDictionary(lang)` and pass the strings a Client Component renders as props, as the layout in (a) does with `dict.client.theme` and `dict.client.language`.

Results:

- Each JSON file became its own server chunk (13 dictionaries, 26 files with source maps). No dictionary marker string appeared in any file under `.next/static`.
- The `/es` HTML contained the Spanish server-side marker and no other language's.
- Only the strings passed as props reached the client, inside the RSC payload.

`next/root-params` can also provide the locale (`lang()` from `next/root-params`, used by `not-found.tsx` in (k)), and the internationalization guide notes that files importing it do not need `server-only`. I kept the locale as an argument so `getDictionary` can be called from Vitest; calling `lang()` from Vitest was not tried.

## (g) Metadata and hreflang

`src/lib/seo.ts`

```ts
import type { Metadata } from "next";
import { htmlLang, locales, type Locale } from "./i18n/config";

// path is the part after the locale, "" for the home page or "/boards/uno-r3".
export function alternatesFor(locale: Locale, path: string): Metadata["alternates"] {
  const languages: Record<string, string> = {};
  for (const l of locales) languages[htmlLang[l]] = `/${l}${path}`;
  languages["x-default"] = `/en${path}`;
  return { canonical: `/${locale}${path}`, languages };
}
```

From the home page:

`src/app/[lang]/page.tsx`

```tsx
export async function generateMetadata({ params }: PageProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return { title: { absolute: `iynk · ${dict.tagline}` }, alternates: alternatesFor(lang, "") };
}
```

Results on `/he`: 13 `<link rel="alternate" hreflang>` tags plus `x-default`, all absolute through `metadataBase` (for example `hreflang="zh-Hans"` pointing at `https://iynk.example/zh`, and `x-default` at `https://iynk.example/en`), `<link rel="canonical" href="https://iynk.example/he">`, and the title `iynk · <tagline>`. Pages that return a plain `title` get the layout's template, for example `uno-r3 · lesson-1 · iynk`.

## (h) Figures in `public/figures` and their headers

The `headers()` rule is in the `next.config.ts` in (b). Measured with `next start`, and the same in `next dev`:

- `/figures/probe.html` comes back with `Cache-Control: public, max-age=300, must-revalidate`, `Content-Security-Policy: frame-ancestors 'self'`, `X-Content-Type-Options: nosniff` and `Content-Type: text/html; charset=UTF-8`. Without the rule Next sends `Cache-Control: public, max-age=0` and an ETag, and revalidation gets a `304`.
- Next sends no `X-Frame-Options` by default, so nothing blocks same-origin framing; `frame-ancestors 'self'` stops other sites from framing the figures.
- Query strings are fine (`/figures/probe.html?board=uno`). `/figures/probe` without `.html` is a 404.
- `next start` serves the files that existed when it started: a file added afterwards was a 404 (and that 404 carried `s-maxage=31536000`), while an edited existing file was served at once. `next dev` picks up new files. On Vercel the figures are part of the deployment, so this only matters for local testing.
- With the `[lang]/[...rest]` catch-all from (k) in place, public files still win over the dynamic routes: `/figures/probe.html` is 200 and `/figures/missing.html` 404.
- For comparison, prerendered pages carry `s-maxage=31536000`, and `/_next/static` chunks are immutable.

## (i) Tests: Vitest and Playwright Test

Versions that worked together (all published at least two weeks before this was written):

| package | version |
|---|---|
| vitest | 5.0.3 |
| vite | 8.3.4 (pin it, see failure 2) |
| @vitejs/plugin-react | 6.1.2 |
| jsdom | 30.1.2 |
| @testing-library/react | 16.3.3 |
| @testing-library/dom | 10.4.2 |
| @playwright/test | 1.64.0 (playwright-core 1.64.0, Chromium revision 1248) |
| @types/node | 24.19.2 (was ^20) |

The install, tried on an exact copy of the repo's `package.json`, lockfile and `node_modules`: it completed, recorded the rolldown platform packages in the lockfile, and kept them through a second `npm install`.

```sh
npm install -D --save-exact --no-audit --no-fund @types/node@24.19.2 vite@8.3.4 vitest@5.0.3 @vitejs/plugin-react@6.1.2 jsdom@30.1.2 @testing-library/react@16.3.3 @testing-library/dom@10.4.2 @playwright/test@1.64.0
```

The commands, all passing on the final app (`vitest run`: 3 files, 7 tests, about 0.55 s; `playwright test`: 8 tests in about 8 s including the production build):

```sh
./node_modules/.bin/next typegen && ./node_modules/.bin/tsc --noEmit
./node_modules/.bin/eslint . --quiet
./node_modules/.bin/vitest run
./node_modules/.bin/playwright test
```

Chromium 1248 was already in `~/Library/Caches/ms-playwright` on this machine. On a fresh machine or in CI it has to be installed with `npx playwright install chromium` (not run here).

`vitest.config.mts`

```ts
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  // Vite 8 reads tsconfig "paths" itself, so vite-tsconfig-paths is not needed.
  resolve: { tsconfigPaths: true },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    // Playwright owns e2e/*.spec.ts; keep Vitest to unit tests.
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
```

`vitest.setup.ts`

```ts
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// Next resolves "server-only" itself, so the package is not installed and
// Vite cannot find it.
vi.mock("server-only", () => ({}));

// Testing Library only registers its own cleanup when `afterEach` is a
// global, which needs `globals: true`. Explicit imports need this instead.
afterEach(() => cleanup());
```

`src/lib/i18n/config.test.ts`

```ts
import { describe, expect, test } from "vitest";
import { dirOf, parseAcceptLanguage, pickLocale } from "./config";

describe("parseAcceptLanguage", () => {
  test("sorts by q, keeps header order on ties, drops * and q=0", () => {
    expect(parseAcceptLanguage("fr-CH, fr;q=0.9, en;q=0.8, de;q=0, *;q=0.5")).toEqual(["fr-CH", "fr", "en"]);
    expect(parseAcceptLanguage("nl;q=0.5, ja;q=0.9, ko;q=0.9")).toEqual(["ja", "ko", "nl"]);
    expect(parseAcceptLanguage(null)).toEqual([]);
  });
});

describe("pickLocale", () => {
  test("first supported primary tag wins", () => {
    expect(pickLocale(["nl-NL", "pt-BR", "en"])).toBe("pt");
    expect(pickLocale(["iw-IL"])).toBe("he");
    expect(pickLocale(["zh-TW"])).toBe("zh");
    expect(pickLocale([])).toBe("en");
  });
});

test("only Hebrew is right-to-left", () => {
  expect(dirOf("he")).toBe("rtl");
  expect(dirOf("hi")).toBe("ltr");
});
```

`src/components/progress-badge.test.tsx`

```tsx
import { act, render, screen } from "@testing-library/react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, expect, test } from "vitest";
import { markDone } from "@/lib/progress-store";
import { ProgressBadge } from "./progress-badge";

const badge = <ProgressBadge prefix="uno-r3/" total={4} template="{done} of {total}" />;

beforeEach(() => {
  localStorage.setItem("iynk.v1", JSON.stringify({ done: ["uno-r3/lesson-1", "nano/lesson-1"] }));
});
afterEach(() => localStorage.clear());

test("reads saved progress and follows markDone", () => {
  render(badge);
  expect(screen.getByTestId("progress").textContent).toBe("1 of 4");
  act(() => markDone("uno-r3/lesson-2"));
  expect(screen.getByTestId("progress").textContent).toBe("2 of 4");
});

test("server HTML uses the empty snapshot and hydrates without a mismatch", async () => {
  const container = document.createElement("div");
  container.innerHTML = renderToString(badge);
  expect(container.textContent).toBe("0 of 4");

  const errors: unknown[] = [];
  await act(async () => {
    hydrateRoot(container, badge, { onRecoverableError: (error) => errors.push(error) });
  });
  expect(container.textContent).toBe("1 of 4");
  expect(errors).toEqual([]);
});

test("a second render test sees only its own badge", () => {
  render(badge);
  expect(screen.getAllByTestId("progress")).toHaveLength(1);
});
```

`src/lib/i18n/get-dictionary.test.ts`

```ts
// @vitest-environment node
import { expect, test } from "vitest";
import { getDictionary } from "./get-dictionary";

test("loads the requested language", async () => {
  const es = await getDictionary("es");
  expect(es.marker).toBe("SRVMARK_es_x9");
  expect(es.client.progress).toContain("{done}");
});
```

`playwright.config.ts`

```ts
import { defineConfig, devices } from "@playwright/test";

const port = 3410;

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  use: { baseURL: `http://localhost:${port}`, trace: "on-first-retry" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // Test the production build: dev mode compiles on demand and adds dev-only
  // checks, so timings and some behaviour differ.
  webServer: {
    command: `npm run build && npm run start -- --port ${port}`,
    url: `http://localhost:${port}/en`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
```

`e2e/smoke.spec.ts`

```ts
import { expect, test, type Page } from "@playwright/test";

function collectErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

test.describe("German browser", () => {
  test.use({ locale: "de-DE" });

  test("/ redirects to the browser language and keeps the query", async ({ page }) => {
    await page.goto("/?ref=x");
    await expect(page).toHaveURL("/de?ref=x");
  });

  test("a saved language cookie beats the browser language", async ({ page, context, baseURL }) => {
    await context.addCookies([{ name: "iynk-lang", value: "ja", url: baseURL! }]);
    await page.goto("/");
    await expect(page).toHaveURL("/ja");
  });
});

test("Hebrew renders rtl and hydrates without errors", async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto("/he");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.locator("html")).toHaveAttribute("lang", "he");
  await expect(page.getByTestId("progress")).toHaveText("הושלמו 0 מתוך 48 שיעורים");
  expect(errors).toEqual([]);
});

test("saved theme and progress survive a reload without a mismatch", async ({ page }) => {
  const errors = collectErrors(page);
  await page.addInitScript(() => {
    localStorage.setItem("iynk-theme", "dark");
    localStorage.setItem("iynk.v1", JSON.stringify({ done: ["uno-r3/lesson-1"] }));
  });
  await page.goto("/en");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.getByTestId("theme")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("progress")).toHaveText("1 of 48 lessons done");
  expect(errors).toEqual([]);
});

type Probe = { bootId: string; paused: boolean };

test("a lesson iframe keeps its document across a soft round trip", async ({ page }) => {
  const probe = () =>
    page.locator("iframe.figure-frame").evaluate((frame: HTMLIFrameElement) => {
      const win = frame.contentWindow as Window & { __probe: () => Probe };
      return win.__probe();
    });

  await page.goto("/en/boards/uno-r3/lesson-1");
  await expect.poll(async () => (await probe()).bootId).toBeTruthy();
  const first = await probe();

  await page.getByRole("link", { name: "back to uno-r3" }).click();
  await expect(page).toHaveURL("/en/boards/uno-r3");
  // Hidden by Activity, not unmounted: still in the DOM, told to pause.
  await expect(page.locator("iframe.figure-frame")).toBeHidden();
  expect((await probe()).paused).toBe(true);

  await page.getByRole("link", { name: "lesson-1", exact: true }).click();
  await expect(page).toHaveURL("/en/boards/uno-r3/lesson-1");
  await expect(page.locator("iframe.figure-frame")).toBeVisible();
  const back = await probe();
  expect(back.bootId).toBe(first.bootId);
  expect(back.paused).toBe(false);
});

test("a lesson marked done shows on the board page kept by Activity", async ({ page }) => {
  await page.goto("/en/boards/uno-r3");
  await expect(page.getByTestId("progress")).toHaveText("0 of 4 lessons done");
  await page.getByRole("link", { name: "lesson-3", exact: true }).click();
  await page.getByRole("button", { name: "Mark done" }).click();
  await page.getByRole("link", { name: "back to uno-r3" }).click();
  // The revealed page re-subscribes in an effect; the assertion retries until it has.
  await expect(page.getByTestId("progress").filter({ visible: true })).toHaveText("1 of 4 lessons done");
});

test("an unknown slug is a real 404 in its language", async ({ page }) => {
  const response = await page.goto("/es/boards/no-such-board");
  expect(response?.status()).toBe(404);
  await expect(page.locator("html")).toHaveAttribute("lang", "es");
});
```

`e2e/language.spec.ts`

```ts
import { expect, test } from "@playwright/test";

test("switching language keeps the page and the window", async ({ page, context }) => {
  // Activity keeps the previous language's header in the DOM (hidden), so
  // every locator here is scoped to the visible header.
  const header = page.locator("header.top:visible");

  await page.addInitScript(() => localStorage.setItem("iynk-theme", "dark"));
  await page.goto("/en/boards/uno-r3");
  await page.evaluate(() => ((window as Window & { marker?: number }).marker = 1));

  await header.getByTestId("lang").selectOption("fr");
  await expect(page).toHaveURL("/fr/boards/uno-r3");
  await expect(page.locator("html")).toHaveAttribute("lang", "fr");
  // The new layout's <html> drops data-theme; ThemeToggle puts it back.
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(header.getByRole("link", { name: "Accueil" })).toBeVisible();
  await expect(header.getByTestId("lang")).toHaveValue("fr");
  // Soft navigation: same window, no document load.
  expect(await page.evaluate(() => (window as Window & { marker?: number }).marker)).toBe(1);
  expect((await context.cookies()).find((c) => c.name === "iynk-lang")?.value).toBe("fr");

  await page.goBack();
  await expect(page).toHaveURL("/en/boards/uno-r3");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(header.getByRole("link", { name: "Home" })).toBeVisible();
  await expect(header.getByTestId("lang")).toHaveValue("en");
});
```

What failed:

1. `npm install` refused Vitest 5 with `ERESOLVE`: vitest 5.0.3 has an optional peer `@types/node@"^22.0.0 || >=24.0.0"` and the repo has `@types/node@^20`. Node 20 is past end of life and the runtime here is Node 24, so `@types/node` 24 is the fix. `tsc` passed with it.
2. Without `vite` as a direct dependency, Vitest failed to start: `Cannot find native binding. npm has a bug related to optional dependencies (https://github.com/npm/cli/issues/4828).` npm installed Vite only as a peer of Vitest, and the platform package `@rolldown/binding-darwin-arm64` either never made it into the lockfile or was pruned by the next `npm install` ("removed 27 packages"). Re-running `npm install` or deleting the `rolldown` lockfile entry did not help, and even a fresh `rm -rf node_modules package-lock.json && npm install` lost the binding again on the following `npm install`. With `vite@8.3.4` pinned in `devDependencies` the lockfile recorded all 15 rolldown bindings and they survived later installs.
3. npm warned `EBADENGINE` for jsdom 30.1.2 (it asks for Node `^24.15.0` on the 24 line; this machine has 24.8.0). The tests ran anyway. Use Node 24.15 or newer to make the warning go away.
4. `Cannot find package 'server-only' imported from .../get-dictionary.ts`. Next resolves `server-only` itself, so the package is not installed (the docs call installing it optional). The setup file mocks it.
5. Without `globals: true`, Testing Library does not register its own cleanup, so a second test found two badges: `expected [ Array(2) ] to have a length of 1 but got 2`. The setup file calls `cleanup()` after each test.
6. In Playwright, `getByTestId('lang')` hit a strict-mode violation after a soft language switch: `resolved to 2 elements`, one of them the hidden English header kept by Activity. Locators are scoped to `header.top:visible`, or use `.filter({ visible: true })`.
7. The Vitest guide's `vite-tsconfig-paths` is not needed. Vite 8 reads tsconfig `paths` with `resolve.tsconfigPaths: true`, and the plugin pulls in `tsconfck@3.1.6`, which npm reports as unmaintained. I installed it once, removed it, and the tests still passed.

Two more notes. Vitest cannot render async Server Components (the bundled guide says so), so those are covered by Playwright. Vitest's default `include` also matches `*.spec.ts`, which is why the config limits it to `src/**/*.test.*` and Playwright owns `e2e/`; I did not try the default.

## (j) Build time and output for about 2,000 pages

Same app with 11 lessons per board: 13 languages × 155 pages.

| build | pages | static generation | `next build` wall time | `.next/server/app` |
|---|---|---|---|---|
| all 13 languages, empty `.next` | 2,021 | 6.2 s (7 workers) | 10.7 s | 110 MB, 12,176 files |
| all 13 languages, warm cache | 2,021 | 5.8 s | 10.8 s | same |
| English only | 161 | 0.8 s | 7.3 s | 8.9 MB |

The 110 MB was 2,021 `.html` files (28.2 MB), 8,080 `.rsc` files (47.5 MB, of which 31.2 MB are the 6,063 per-segment files used for prefetching), 2,021 `.meta` files (3.1 MB) and the server bundles. One small lesson page took about 41 KB on disk across six files: `.html` 14.6 KB, `.rsc` 8.4 KB, `.meta` 1.7 KB, and the `_tree` (0.7 KB), `_full` (8.4 KB) and `__PAGE__` (7.0 KB) segment files.

With English only prerendered, the other languages rendered on their first request and were then cached: `/fr/boards/uno-r3/lesson-5` took 68 ms, then 2.6 ms; `/ja/boards/nano/lesson-2` 23 ms, then 2.7 ms; `x-nextjs-cache: MISS`, then `HIT`, with `s-maxage=31536000`. An unknown lesson in an unbuilt language was still a 404.

Recommendation: prerender every language. It costs a few seconds and gives every first visitor a static page. Revisit only if real lesson pages turn out much heavier than these test pages or the build passes a few minutes. Vercel's build machines are slower than an M4 Pro; that was not measured.

## (k) Fonts for Hebrew, Devanagari and CJK

`src/lib/fonts.ts`

```ts
import { IBM_Plex_Mono, Newsreader, Noto_Sans_Devanagari, Noto_Sans_Hebrew, Source_Sans_3 } from "next/font/google";

// The same three Latin faces as the app. `subsets` only picks which files get
// preloaded; every subset's @font-face rule is emitted either way.
export const display = Newsreader({ subsets: ["latin"], style: ["normal", "italic"], variable: "--font-display" });
export const sans = Source_Sans_3({ subsets: ["latin"], variable: "--font-sans" });
export const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono" });

// Script faces are not preloaded: the browser fetches a file only when the
// page has text in that file's unicode-range. CJK uses platform fonts, see
// globals.css.
export const hebrew = Noto_Sans_Hebrew({ subsets: ["hebrew"], variable: "--font-hebrew", preload: false });
export const devanagari = Noto_Sans_Devanagari({ subsets: ["devanagari"], variable: "--font-devanagari", preload: false });

export const fontVariables = [display, sans, mono, hebrew, devanagari].map((f) => f.variable).join(" ");
```

The end of `globals.css`:

`src/app/globals.css`

```css
/* Script fonts. next/font gives each face a metric-matched local(Arial) or
   local(Times New Roman) fallback with no unicode-range, and both have Hebrew
   glyphs: with a Latin face first, Hebrew text renders in Arial and Noto is
   never fetched. So he and hi swap the faces themselves, and CJK appends the
   platform fonts after the Latin face. */
html:lang(he) { --font-sans: var(--font-hebrew); --font-display: var(--font-hebrew); }
html:lang(hi) { --font-sans: var(--font-devanagari); --font-display: var(--font-devanagari); }
html:lang(zh-Hans) { --font-cjk: "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC"; }
html:lang(ja) { --font-cjk: "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Yu Gothic", Meiryo, "Noto Sans CJK JP"; }
html:lang(ko) { --font-cjk: "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans CJK KR"; }
html:is(:lang(zh-Hans), :lang(ja), :lang(ko)) body { font-family: var(--font-sans), var(--font-cjk), sans-serif; }
html:is(:lang(zh-Hans), :lang(ja), :lang(ko)) :is(h1, h2, h3, .brand) { font-family: var(--font-display), var(--font-cjk), serif; }
```

The layout puts `fontVariables` on `<html>`, see (a).

Measured on `next start` for each home page: the font files fetched, and the face Chromium used for the text (from DevTools' `CSS.getPlatformFontsForNode`):

| page | font files | bytes | face used |
|---|---|---|---|
| `/en` | 5, all preloaded Latin files | 168 KiB | Source Sans 3; Newsreader for headings |
| `/he` | 7 | 199 KiB | Noto Sans Hebrew for everything, Latin included |
| `/hi` | 7 | 311 KiB | Noto Sans Devanagari for everything, Latin included |
| `/zh` | 5 | 168 KiB | PingFang SC (system) for Han, Source Sans 3 for Latin |
| `/ja` | 5 | 168 KiB | Hiragino Sans (system), Source Sans 3 for Latin |
| `/ko` | 5 | 168 KiB | Apple SD Gothic Neo (system), Source Sans 3 for Latin |

The five Latin files are preloaded on every page, including he and hi where little uses them, through an HTTP `Link: <...>; rel=preload; as="font"` header rather than a `<link>` tag. The Hebrew and Devanagari files are fetched only by pages whose text needs them. The fallback list for CJK covers macOS, Windows and Android names; only macOS was checked.

What failed:

1. Latin face first and script face second (`var(--font-sans), var(--font-hebrew)`): Hebrew text rendered in Arial and Noto Sans Hebrew was never downloaded. next/font adds a metric-adjusted fallback face for each font, for example `@font-face{font-family:"Source Sans 3 Fallback";src:local(Arial);...}`, with no `unicode-range`. Arial has Hebrew glyphs, so it matched before the browser got to Noto. Devanagari happened to work in that order, because Arial has no Devanagari, but it uses the same swap so both behave alike. Turning the fallback off is not an option either: with `adjustFontFallback: false` on Source Sans 3 and Noto Sans Hebrew, a clean Turbopack build still emitted both `Fallback` faces, metrics included, and still put them in the CSS variables.
2. CJK through next/font (`Noto_Sans_SC`, `Noto_Sans_JP`, `Noto_Sans_KR`, weights 400 and 700, `preload: false`): it built, but each family added a stylesheet of 154 to 189 KB (16.5 to 20.9 KB with brotli) holding about a hundred `unicode-range` faces, linked from every page in every language, because a font imported by the root layout belongs to every route. `.next/static/media` went from 25 files (472 KB) to 374 files (14 MB). That run used only Source Sans and Plex Mono as Latin faces (2 preloaded files, 87 KiB); on top of those, the zh home page fetched 9 more files to draw one tagline (596 KiB in total), ja 8 more (280 KiB) and ko 7 more (196 KiB). Platform fonts cost nothing.
3. `subsets` does not limit what is emitted. With `subsets: ["hebrew"]` the CSS still held `@font-face` rules for all five of Noto Sans Hebrew's subsets; `subsets` only picks the preloaded files, as the font docs say.

## (k) Other gotchas

**Generated types.** `PageProps<"/[lang]/boards/[board]">` and `LayoutProps<"/[lang]">` are global types generated into `.next/types`, and the repo's `.gitignore` excludes both `.next/` and `next-env.d.ts`. On a fresh checkout `tsc --noEmit` failed with `Cannot find name 'PageProps'` (six errors). `next typegen` (0.2 s) recreated `next-env.d.ts` and the types, and `tsc` passed. After a route was deleted, the stale `.next/types/validator.ts` broke `tsc` with `Cannot find module '../../src/app/[lang]/x/mr/page.js'` until `next typegen` ran again. So the type-check command is `next typegen && tsc --noEmit`.

**Localized 404s.** Without a catch-all, `/en/no/such/route` got Next's built-in, unstyled English 404 with no `lang` and none of iynk's layout. With this file:

`src/app/[lang]/[...rest]/page.tsx`

```tsx
import { notFound } from "next/navigation";

// Sends every unmatched URL under a language to [lang]/not-found.tsx, inside
// the localized layout. Without it Next serves its own unstyled English 404.
// Cache Components refuses an empty generateStaticParams, hence the one entry.
export function generateStaticParams() {
  return [{ rest: ["not-found"] }];
}

export default function CatchAll() {
  notFound();
}
```

and the localized not-found page, which gets no props and reads the language from the root param:

`src/app/[lang]/not-found.tsx`

```tsx
import Link from "next/link";
import { lang } from "next/root-params";
import { defaultLocale, isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";

// not-found gets no props; the root param getter still knows the locale.
export default async function NotFound() {
  const value = await lang();
  const locale = isLocale(value) ? value : defaultLocale;
  const dict = await getDictionary(locale);
  return (
    <main>
      <h1>404</h1>
      <Link href={`/${locale}`}>{dict.nav.home}</Link>
    </main>
  );
}
```

| URL | status | what the browser shows |
|---|---|---|
| `/en/no/such/route` | 404 | the iynk layout in English with the 404 page, `lang="en"`, `noindex` |
| `/fr/board/uno-r3` (typo) | 404 | the same in French |
| `/en/boards` (no index page) | 404 | the same in English |
| `/xx`, `/foo/bar/baz` | 404 | Next's built-in "404: This page could not be found.", no `lang` |

The server sends an error shell for these and the browser renders the 404 content, so it needs JavaScript; the status code is right either way. An unknown first segment would need `global-not-found.tsx` (behind `experimental.globalNotFound`), which I did not try. `src/app/favicon.ico` keeps working next to `[lang]` (200).

**Prefetching.** A default `<Link>` prefetches only the App Shell (`_tree` requests). With 300 ms of extra latency on RSC requests, home → board showed the Suspense fallback at 70 ms and the content at 354 ms; without extra latency the content showed at about 75 ms. `<Link prefetch={true}>` fetched `_tree` plus the page segment for each link, two requests per link (eight for a board's four lessons), and once those had arrived board → lesson showed the content in the first sampled frame (68 ms) with no fallback. Worth it for a board's lesson list, not for long link lists.

**Duplicates in the DOM.** Because Activity keeps hidden copies of up to three routes, and after a language switch a whole hidden copy of the layout, a fixed `id` in a page or layout (a skip-link target, a portal root) can exist more than once and `getElementById` may return the hidden one. Use `useId` and refs. Selectors in tests need visibility filters, as in (i).

**Dev is not prod.** In `next dev` unknown slugs return 200 even with `ensureStatic`, the instant validation errors appear only in dev, and dev compiles on demand, so timings and some behaviour differ. Test status codes, caching and navigation against `next build && next start`.

**Turbopack and a symlinked `node_modules`.** Only relevant for scratch copies or monorepo setups: with `node_modules` symlinked from elsewhere, Turbopack stopped with `Could not find the Next.js package (next/package.json)`. `experimental.turbopackAdditionalRoots` pointing at the symlink target's `node_modules` gave 43 `Can't resolve '@swc/helpers/...'` errors; pointing it at the directory that contains that `node_modules` worked. A plain copy or an APFS clone (`cp -c -R`) needs neither.

## What this means for the current code

Read against the repo as of this writing:

- `src/app/layout.tsx` renders `<html lang="en">` for every page and its boot script rewrites `lang` from `localStorage`. That moves into `src/app/[lang]/layout.tsx` as in (a); the boot script keeps only the theme.
- `src/lib/i18n.tsx` is a Client Component holding the UI strings for every language and picks the language from `localStorage` after hydration, so the server always renders English. That becomes per-language JSON loaded on the server, as in (f).
- `src/lib/progress.tsx` already uses `useSyncExternalStore` with a cached snapshot; it does not listen to `storage` events, so other tabs do not update it.
- `src/components/FigureFrame.tsx` needs the show/hide protocol from (e).
