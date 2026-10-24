"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "@/components/ui/cx";
import { useFeatures } from "@/lib/features";
import { NAV, isActive, showNavEntry, type NavId } from "./nav";

type NavLinksProps = {
  lang: string;
  labels: Record<NavId, string>;
  /** "bar" is the desktop header row, "sheet" the phone menu. */
  layout: "bar" | "sheet";
  onNavigate?: () => void;
};

export function NavLinks({ lang, labels, layout, onNavigate }: NavLinksProps) {
  const pathname = usePathname() ?? "";
  const { features } = useFeatures();
  const entries = NAV.filter((entry) => showNavEntry(entry, features, layout));
  return (
    <ul className={layout === "bar" ? "flex items-center gap-1" : "flex flex-col gap-2"}>
      {entries.map((entry) => {
        const active = isActive(entry, lang, pathname);
        return (
          <li key={entry.id}>
            <Link
              href={`/${lang}${entry.href}`}
              aria-current={active ? "page" : undefined}
              onClick={onNavigate}
              className={cx(
                "flex min-h-11 items-center rounded-full border-2 font-ui font-bold no-underline transition-colors",
                layout === "bar" ? "px-3.5 text-sm" : "px-4 text-base",
                active ? "border-line bg-ink text-paper" : "border-transparent text-ink hover:border-line",
              )}
            >
              {labels[entry.id]}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
