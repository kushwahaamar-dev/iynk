import { Callout } from "@/components/ui/Callout";
import type { Locale } from "@/i18n/config";
import { getT } from "@/i18n/server";

// Sits above a board, bench or craft page whose prose is still English in this language
// (getContentProse). Renders nothing once the translation exists.
export async function UntranslatedNotice({ lang, textLang }: { lang: Locale; textLang: Locale }) {
  if (textLang === lang) return null;
  const t = await getT(lang, "common");
  return (
    <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6">
      <Callout title={t("untranslated.title")}>{t("untranslated.body")}</Callout>
    </div>
  );
}
