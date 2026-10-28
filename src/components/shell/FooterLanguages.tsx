"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "@/components/ui/cx";
import { LANG_COOKIE, LOCALES, LOCALE_NAMES, htmlLang, localizedPath, type Locale } from "@/i18n/config";

// The crawlable language switch: plain links, one per language.
export function FooterLanguages({ lang, label }: { lang: Locale; label: string }) {
  const pathname = usePathname() ?? `/${lang}`;
  return (
    <nav aria-label={label}>
      <ul className="flex flex-wrap gap-x-6 gap-y-2">
        {LOCALES.map((code) => (
          <li key={code}>
            <Link
              href={localizedPath(pathname, code)}
              lang={htmlLang(code)}
              hrefLang={htmlLang(code)}
              aria-current={code === lang ? "true" : undefined}
              // The same cookie the language picker writes, so "/" opens in this language next time.
              onClick={() => {
                document.cookie = `${LANG_COOKIE}=${code}; path=/; max-age=31536000; samesite=lax`;
              }}
              className={cx(
                "inline-flex min-h-9 items-center text-sm no-underline motion-fade hover:text-ink [@media(pointer:coarse)]:min-h-11",
                code === lang ? "font-semibold text-ink" : "text-muted",
              )}
            >
              {LOCALE_NAMES[code]}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
