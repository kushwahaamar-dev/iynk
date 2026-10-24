"use client";

import { usePathname, useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icons";
import { LANG_COOKIE, LOCALES, LOCALE_NAMES, htmlLang, isLocale, localizedPath, type Locale } from "@/i18n/config";

/**
 * Switches the page to another language. It writes the cookie the "/" redirect
 * reads, then soft-navigates to the same path in that language. The select is
 * controlled: Activity keeps old layouts mounted, and an uncontrolled select
 * would come back from the Back button showing the language picked earlier.
 */
export function LanguagePicker({ lang, label, className }: { lang: Locale; label: string; className?: string }) {
  const router = useRouter();
  const pathname = usePathname() ?? `/${lang}`;

  return (
    <label className={`relative inline-flex items-center ${className ?? ""}`}>
      <span className="sr-only">{label}</span>
      <Icon name="globe" size={18} className="pointer-events-none absolute start-3 text-ink" />
      <select
        value={lang}
        onChange={(event) => {
          const next = event.target.value;
          if (!isLocale(next) || next === lang) return;
          document.cookie = `${LANG_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
          router.push(`${localizedPath(pathname, next)}${window.location.search}${window.location.hash}`);
        }}
        className="ink-field ps-9"
      >
        {LOCALES.map((code) => (
          <option key={code} value={code} lang={htmlLang(code)}>
            {LOCALE_NAMES[code]}
          </option>
        ))}
      </select>
    </label>
  );
}
