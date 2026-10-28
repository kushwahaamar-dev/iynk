"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cx } from "@/components/ui/cx";
import { LANG_COOKIE, LOCALES, LOCALE_NAMES, htmlLang, localizedPath, type Locale } from "@/i18n/config";
import { NAV, showNavEntry, type NavId } from "./nav";

// The labs, the pages around them and the six languages.
const GROUPS: readonly { key: "labs" | "site"; ids: readonly NavId[] }[] = [
  { key: "labs", ids: ["boards", "robotics", "drones"] },
  { key: "site", ids: ["together", "about"] },
];

const link = "inline-flex min-h-9 items-center text-[15px] text-ink no-underline transition-colors hover:text-muted [@media(pointer:coarse)]:min-h-11";

function Column({ title, brand = false, children }: { title: string; brand?: boolean; children: ReactNode }) {
  return (
    <div className="min-w-0">
      {/* The brand is lowercase in every setting, so its heading is not capitalised. */}
      <h3 className={cx("shell-meta mb-3", brand && "normal-case")}>{title}</h3>
      <ul>{children}</ul>
    </div>
  );
}

export function FooterNav({
  lang,
  labels,
  headings,
}: {
  lang: Locale;
  labels: Record<NavId, string>;
  headings: { labs: string; site: string; language: string };
}) {
  const pathname = usePathname() ?? `/${lang}`;
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3">
      {GROUPS.map((group) => (
        <Column key={group.key} title={headings[group.key]} brand={group.key === "site"}>
          {group.ids
            .map((id) => NAV.find((entry) => entry.id === id))
            .filter((entry): entry is (typeof NAV)[number] => entry !== undefined && showNavEntry(entry, "footer"))
            .map((entry) => (
              <li key={entry.id}>
                <Link href={`/${lang}${entry.href}`} className={link}>
                  {labels[entry.id]}
                </Link>
              </li>
            ))}
        </Column>
      ))}
      <Column title={headings.language}>
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
              className={cx(link, "gap-2", code === lang && "text-muted")}
            >
              {LOCALE_NAMES[code]}
              {code === lang ? <span aria-hidden="true" className="size-[5px] rounded-full bg-[var(--accent)]" /> : null}
            </Link>
          </li>
        ))}
      </Column>
    </div>
  );
}
