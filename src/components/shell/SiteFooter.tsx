import Link from "next/link";
import type { Locale } from "@/i18n/config";
import { getT } from "@/i18n/server";
import { Logo } from "./Logo";
import { NAV } from "./nav";

export async function SiteFooter({ lang }: { lang: Locale }) {
  const [t, common] = await Promise.all([getT(lang, "shell"), getT(lang, "common")]);
  return (
    <footer className="mt-16 border-t-2 border-line">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.4fr_1fr]">
        <div className="flex gap-4">
          <Logo size={44} className="shrink-0" />
          <div className="min-w-0 space-y-2 text-sm">
            <p className="font-head text-lg font-bold leading-tight">{common("site.name")}</p>
            <p className="ink-kicker">{common("site.tagline")}</p>
            <p>{t("footer.summary")}</p>
            <p className="text-muted">{t("footer.privacy")}</p>
            <p className="text-muted">
              <a href="https://april-zhu.com/colorfigures" rel="noopener noreferrer">
                {t("footer.figures")}
              </a>
            </p>
          </div>
        </div>
        <nav aria-labelledby={`footer-pages-${lang}`}>
          <h2 id={`footer-pages-${lang}`} className="ink-kicker mb-2">
            {t("footer.pages")}
          </h2>
          <ul className="grid grid-cols-2 gap-x-4 text-sm">
            {NAV.map((entry) => (
              <li key={entry.id}>
                <Link href={`/${lang}${entry.href}`} className="inline-flex min-h-11 items-center">
                  {entry.id === "about" ? t("footer.about") : t(`nav.${entry.id}`)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  );
}
