"use client";

import Link from "next/link";
import { useFeatures } from "@/lib/features";
import { NAV, showNavEntry, type NavId } from "./nav";

// The labs are in the header; the footer keeps the pages around them. Passport and Verify stay out while Solana is off.
const FOOTER_IDS: readonly NavId[] = ["about", "together", "passport", "verify"];

export function FooterNav({ lang, labels }: { lang: string; labels: Record<NavId, string> }) {
  const { features } = useFeatures();
  const entries = FOOTER_IDS.map((id) => NAV.find((entry) => entry.id === id)).filter(
    (entry): entry is (typeof NAV)[number] => entry !== undefined && showNavEntry(entry, features, "footer"),
  );
  return (
    <ul className="flex flex-wrap items-center gap-x-1">
      {entries.map((entry) => (
        <li key={entry.id}>
          <Link
            href={`/${lang}${entry.href}`}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full px-3 font-body text-sm font-semibold no-underline hover:bg-sunken"
          >
            {labels[entry.id]}
          </Link>
        </li>
      ))}
    </ul>
  );
}
