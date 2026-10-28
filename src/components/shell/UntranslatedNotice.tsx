import { Callout } from "@/components/ui/Callout";
import { Icon } from "@/components/ui/icons";
import type { Locale } from "@/i18n/config";
import { getT } from "@/i18n/server";

type UntranslatedNoticeProps = {
  lang: Locale;
  textLang: Locale;
  /** "block" is a callout above the page; "chip" a one-line tag for a workspace bar, its sentence shown on hover and focus. */
  variant?: "block" | "chip";
};

// Marks a board, bench or craft page whose prose is still English in this language
// (getContentProse). Renders nothing once the translation exists.
export async function UntranslatedNotice({ lang, textLang, variant = "block" }: UntranslatedNoticeProps) {
  if (textLang === lang) return null;
  const t = await getT(lang, "common");

  if (variant === "chip") {
    const id = `untranslated-${lang}`;
    return (
      <span
        role="note"
        tabIndex={0}
        aria-describedby={id}
        className="group relative inline-flex min-h-7 items-center gap-2 whitespace-nowrap rounded-full border border-rule bg-surface px-3 font-body text-xs font-semibold"
      >
        <Icon name="globe" size={16} />
        {t("untranslated.title")}
        <span
          id={id}
          className="pointer-events-none absolute start-0 top-full z-tooltip mt-2 hidden w-72 whitespace-normal rounded-lg bg-raised px-3 py-2 font-normal leading-snug text-ink shadow-md group-hover:block group-focus-visible:block"
        >
          {t("untranslated.body")}
        </span>
      </span>
    );
  }

  return (
    <div className="frame pt-4">
      <Callout title={t("untranslated.title")}>{t("untranslated.body")}</Callout>
    </div>
  );
}
