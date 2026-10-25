"use client";

import { usePathname, useRouter } from "next/navigation";
import { Select } from "@/components/ui/Field";
import { LANG_COOKIE, LOCALES, LOCALE_NAMES, htmlLang, isLocale, localizedPath, type Locale } from "@/i18n/config";

/**
 * Switches the page to another language. It writes the cookie the "/" redirect
 * reads, then soft-navigates to the same path in that language. The select is
 * controlled: Activity keeps old layouts mounted, and an uncontrolled select
 * would come back from the Back button showing the language picked earlier.
 */
export function LanguagePicker({ lang, label, showLabel = false, className }: { lang: Locale; label: string; showLabel?: boolean; className?: string }) {
  const router = useRouter();
  const pathname = usePathname() ?? `/${lang}`;

  return (
    <Select
      label={label}
      hideLabel={!showLabel}
      value={lang}
      className={className}
      onChange={(event) => {
        const next = event.target.value;
        if (!isLocale(next) || next === lang) return;
        document.cookie = `${LANG_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
        router.push(`${localizedPath(pathname, next)}${window.location.search}${window.location.hash}`);
      }}
    >
      {LOCALES.map((code) => (
        <option key={code} value={code} lang={htmlLang(code)}>
          {LOCALE_NAMES[code]}
        </option>
      ))}
    </Select>
  );
}
