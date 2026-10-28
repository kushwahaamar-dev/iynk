"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { CSSProperties } from "react";
import { cx } from "@/components/ui/cx";
import { NAV, isActive, showNavEntry, type NavId } from "./nav";

type NavLinksProps = {
  lang: string;
  labels: Record<NavId, string>;
  /** "bar" is the desktop header row, "sheet" the phone menu. */
  layout: "bar" | "sheet";
  onNavigate?: () => void;
};

function Dot() {
  return <span aria-hidden="true" className="size-1 shrink-0 rounded-full bg-accent" />;
}

export function NavLinks({ lang, labels, layout, onNavigate }: NavLinksProps) {
  const pathname = usePathname() ?? "";
  const entries = NAV.filter((entry) => showNavEntry(entry, layout));

  if (layout === "sheet") {
    return (
      <ul>
        {entries.map((entry, index) => {
          const active = isActive(entry, lang, pathname);
          return (
            <li key={entry.id} className="stagger-in" style={{ "--i": index } as CSSProperties}>
              <Link
                href={`/${lang}${entry.href}`}
                aria-current={active ? "page" : undefined}
                onClick={onNavigate}
                className={cx(
                  "flex min-h-14 items-center gap-2 py-3 text-2xl font-semibold no-underline motion-fade",
                  active ? "text-ink" : "text-muted hover:text-ink",
                )}
              >
                {active && <Dot />}
                {labels[entry.id]}
              </Link>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <ul className="flex items-center">
      {entries.map((entry) => {
        const active = isActive(entry, lang, pathname);
        return (
          <li key={entry.id}>
            <Link
              href={`/${lang}${entry.href}`}
              aria-current={active ? "page" : undefined}
              onClick={onNavigate}
              className={cx(
                "nav-link flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold no-underline motion-fade",
                active ? "bg-hover text-ink" : "text-muted hover:bg-hover hover:text-ink",
              )}
            >
              {active && <Dot />}
              {labels[entry.id]}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
