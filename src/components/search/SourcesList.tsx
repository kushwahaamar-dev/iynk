"use client";

import { Icon, cx } from "@/components/ui";
import { useLocale } from "@/i18n/client";
import { useSearchT } from "@/lib/search/messages";
import { external, siteOf } from "./shared";

export type Citation = { title: string; url: string; snippet?: string };

/**
 * Numbered citations: where a price, a datasheet answer or a tip came from.
 * The partner panel shows these under answers grounded in search_datasheet.
 */
export function SourcesList({ sources, heading, className }: { sources: readonly Citation[]; heading?: string; className?: string }) {
  const t = useSearchT(useLocale());
  if (!t || sources.length === 0) return null;
  const title = heading ?? t("sources.heading");
  return (
    <section aria-label={title} className={cx("min-w-0", className)}>
      <h3 className="ink-kicker mb-1">{title}</h3>
      <ol className="space-y-1.5 text-sm">
        {sources.map((source, i) => {
          const site = siteOf(source.url);
          return (
            <li key={source.url} className="flex min-w-0 gap-2">
              <span aria-hidden="true" className="tabular font-ui font-bold text-muted">
                {i + 1}.
              </span>
              <div className="min-w-0">
                <a
                  href={source.url}
                  {...external}
                  aria-label={`${source.title}. ${t("sources.open", { site })}`}
                  className="inline-flex max-w-full items-baseline gap-1 font-semibold underline decoration-line underline-offset-2 hover:decoration-2 focus-visible:outline-2"
                >
                  <span className="truncate">{source.title}</span>
                  <Icon name="external" size={14} aria-hidden="true" className="shrink-0 self-center" />
                </a>
                <div className="truncate font-ui text-xs text-muted">{site}</div>
                {source.snippet ? <p className="line-clamp-2 text-muted">{source.snippet}</p> : null}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
