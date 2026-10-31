"use client";

import { useCommonT, useLocale } from "@/i18n/client";
import { termsFor, type TermId } from "@/i18n/terms";
import { useSettings } from "@/lib/settings/hooks";

/** A technical word in the page's language, with the English term beside it when "Show English terms" is on. */
export function Term({ id }: { id: TermId }) {
  const locale = useLocale();
  const { englishTerms } = useSettings();
  const { local, en } = termsFor(locale)[id];
  if (locale === "en" || !englishTerms || local === en) return <>{local}</>;
  return (
    <>
      {local}
      <span lang="en" className="text-muted">
        {" / "}
        {en}
      </span>
    </>
  );
}

/** The key words of a panel in a row, under a small label. Nothing for English readers, who already have them. */
export function TermList({ ids }: { ids: readonly TermId[] }) {
  const t = useCommonT();
  const locale = useLocale();
  const { englishTerms } = useSettings();
  if (locale === "en" || !englishTerms) return null;
  return (
    <p className="text-sm">
      <span className="kicker mr-2">{t("terms.label")}</span>
      {ids.map((id, i) => (
        <span key={id}>
          {i > 0 ? ", " : null}
          <Term id={id} />
        </span>
      ))}
    </p>
  );
}
