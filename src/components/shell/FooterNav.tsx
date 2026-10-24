"use client";

import Link from "next/link";
import { useFeatures } from "@/lib/features";
import { NAV, showNavEntry, type NavId } from "./nav";

/** Footer links follow the same feature flags as the header. Passport and Verify stay out while Solana is off. */
export function FooterNav({ lang, labels, aboutLabel }: { lang: string; labels: Record<NavId, string>; aboutLabel: string }) {
  const { features } = useFeatures();
  const entries = NAV.filter((entry) => showNavEntry(entry, features, "footer"));
  return (
    <ul className="grid grid-cols-2 gap-x-4 text-sm">
      {entries.map((entry) => (
        <li key={entry.id}>
          <Link href={`/${lang}${entry.href}`} className="inline-flex min-h-11 items-center">
            {entry.id === "about" ? aboutLabel : labels[entry.id]}
          </Link>
        </li>
      ))}
    </ul>
  );
}
