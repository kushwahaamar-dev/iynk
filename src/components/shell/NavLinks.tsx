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

/** The current page is marked as the wordmark marks its i: a lit LED in the accent. */
function Led({ on, className }: { on: boolean; className?: string }) {
  return <span aria-hidden="true" className={cx("size-[5px] shrink-0 rounded-full", on ? "bg-[var(--accent)]" : "bg-transparent", className)} />;
}

export function NavLinks({ lang, labels, layout, onNavigate }: NavLinksProps) {
  const pathname = usePathname() ?? "";
  const { features } = useFeatures();
  const entries = NAV.filter((entry) => showNavEntry(entry, features, layout));

  if (layout === "sheet") {
    return (
      <ul>
        {entries.map((entry, index) => {
          const active = isActive(entry, lang, pathname);
          return (
            <li key={entry.id} className="border-b border-rule">
              <Link
                href={`/${lang}${entry.href}`}
                aria-current={active ? "page" : undefined}
                onClick={onNavigate}
                className="flex min-h-14 items-center gap-4 py-2 text-[22px] font-medium leading-tight tracking-[-0.02em] text-ink no-underline"
              >
                <span aria-hidden="true" className="w-6 shrink-0 font-ui text-[11px] font-medium tracking-[0.08em] text-muted tabular">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0 flex-1">{labels[entry.id]}</span>
                <Led on={active} />
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
                "relative flex min-h-11 items-center whitespace-nowrap rounded-md px-2.5 text-sm font-medium tracking-[-0.005em] no-underline transition-colors xl:px-3.5",
                active ? "text-ink" : "text-muted hover:text-ink",
              )}
            >
              {labels[entry.id]}
              <Led on={active} className="absolute bottom-0.5 start-1/2 -translate-x-1/2" />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
