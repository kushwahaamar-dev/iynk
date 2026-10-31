import Link from "next/link";
import type { Locale } from "@/i18n/config";
import { templateIdFor } from "@/studio/fork";

type Props = { lang: Locale; board: string; lesson?: string; label: string; note: string };

/** The way from an old board page to the same lesson, or the board's tour, in Studio. */
export function OpenInStudio({ lang, board, lesson, label, note }: Props) {
  return (
    <p className="mx-auto flex w-full flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 text-sm text-muted">
      <span>{note}</span>
      <Link
        href={`/${lang}/studio#/t/${templateIdFor(board, lesson ?? "tour")}`}
        prefetch={false}
        className="rounded-sm font-semibold text-ink underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        {label}
      </Link>
    </p>
  );
}
