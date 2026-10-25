import type { Locale } from "@/i18n/config";
import { getT } from "@/i18n/server";
import { FooterNav } from "./FooterNav";
import { Logo } from "./Logo";
import { NAV, type NavId } from "./nav";

export async function SiteFooter({ lang }: { lang: Locale }) {
  const [t, common] = await Promise.all([getT(lang, "shell"), getT(lang, "common")]);
  const labels = Object.fromEntries(NAV.map((entry) => [entry.id, t(`nav.${entry.id}`)])) as Record<NavId, string>;
  return (
    <footer className="site-footer border-t-2 border-line">
      <div className="frame flex flex-col gap-x-8 gap-y-3 py-5 lg:flex-row lg:items-center">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <Logo size={28} className="mt-0.5 shrink-0" />
          <p className="min-w-0 text-sm text-muted">
            <span lang="en" className="me-2 font-head text-base font-bold text-ink">
              {common("site.name")}
            </span>
            {t("footer.privacy")}
          </p>
        </div>
        <nav aria-labelledby={`footer-pages-${lang}`} className="flex flex-col gap-x-4 sm:flex-row sm:items-center lg:shrink-0">
          <h2 id={`footer-pages-${lang}`} className="sr-only">
            {t("footer.pages")}
          </h2>
          <FooterNav lang={lang} labels={labels} />
          <a
            href="https://april-zhu.com/colorfigures"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 max-w-[22rem] items-center text-xs leading-snug text-muted"
          >
            {t("footer.figures")}
          </a>
        </nav>
      </div>
    </footer>
  );
}
