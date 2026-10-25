import type { Locale } from "@/i18n/config";
import { getT } from "@/i18n/server";
import { FooterNav } from "./FooterNav";
import { Logo } from "./Logo";
import { NAV, type NavId } from "./nav";

export async function SiteFooter({ lang }: { lang: Locale }) {
  const [t, common] = await Promise.all([getT(lang, "shell"), getT(lang, "common")]);
  const labels = Object.fromEntries(NAV.map((entry) => [entry.id, t(`nav.${entry.id}`)])) as Record<NavId, string>;
  return (
    <footer className="site-footer border-t border-rule">
      <div className="shell-frame">
        <div className="grid grid-cols-1 gap-x-6 gap-y-14 pt-[clamp(56px,7vw,112px)] lg:grid-cols-12">
          <div className="min-w-0 lg:col-span-5">
            <p className="max-w-[24ch] text-[clamp(22px,2.1vw,30px)] font-medium leading-[1.18] tracking-[-0.022em] text-balance text-ink">
              {common("site.description")}
            </p>
            <p className="mt-6 max-w-[50ch] text-sm leading-relaxed text-muted">{t("footer.privacy")}</p>
          </div>
          <nav aria-labelledby={`footer-pages-${lang}`} className="min-w-0 lg:col-span-6 lg:col-start-7">
            <h2 id={`footer-pages-${lang}`} className="sr-only">
              {t("footer.pages")}
            </h2>
            <FooterNav
              lang={lang}
              labels={labels}
              headings={{ labs: t("nav.label"), site: common("site.name"), language: t("language.label") }}
            />
          </nav>
        </div>
        <div className="mt-[clamp(64px,9vw,144px)] grid grid-cols-1 items-end gap-x-6 gap-y-8 pb-[clamp(24px,3vw,40px)] lg:grid-cols-12">
          <Logo height={188} className="h-auto w-[clamp(168px,30vw,400px)] text-ink lg:col-span-5" />
          <div className="flex min-w-0 flex-col gap-2 border-t border-rule pt-4 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6 lg:col-span-6 lg:col-start-7">
            <p className="shell-meta shrink-0">{common("site.tagline")}</p>
            <a
              href="https://april-zhu.com/colorfigures"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center text-xs leading-snug text-muted underline-offset-4 hover:text-ink sm:text-end"
            >
              {t("footer.figures")}
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
