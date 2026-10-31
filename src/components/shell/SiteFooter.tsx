import Link from "next/link";
import type { Locale } from "@/i18n/config";
import { getT } from "@/i18n/server";
import { Icon } from "@/components/ui/icons";
import { FooterLanguages } from "./FooterLanguages";
import { Logo } from "./Logo";
import { NAV } from "./nav";

const REPO_URL = "https://github.com/kushwahaamar-dev/iynk";
const COLORFIGURES_URL = "https://april-zhu.com/colorfigures";

const link = "inline-flex min-h-9 items-center gap-1 text-sm text-muted no-underline motion-fade hover:text-ink [@media(pointer:coarse)]:min-h-11";
const row = "flex flex-wrap gap-x-6 gap-y-2";

export async function SiteFooter({ lang }: { lang: Locale }) {
  const [t, common] = await Promise.all([getT(lang, "shell"), getT(lang, "common")]);
  const pages = NAV.filter((entry) => entry.id !== "dashboard");
  return (
    <footer className="site-footer border-t border-rule">
      <div className="shell-frame flex flex-col gap-8 py-12 md:py-16">
        <div className="flex flex-col gap-4">
          <Logo height={24} className="w-auto self-start text-ink" />
          <p className="max-w-prose text-sm text-muted">{common("site.description")}</p>
        </div>
        <nav aria-label={t("footer.pages")}>
          <ul className={row}>
            {pages.map((entry) => (
              <li key={entry.id}>
                <Link href={`/${lang}${entry.href}`} className={link}>
                  {t(`nav.${entry.id}`)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <ul className={row}>
          <li>
            <Link href={`/${lang}/privacy`} className={link}>
              {t("footer.privacyLink")}
            </Link>
          </li>
          <li>
            <Link href={`/${lang}/about#about-licence-${lang}`} className={link}>
              {t("footer.licenceLink")}
            </Link>
          </li>
          <li>
            <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className={link}>
              {t("footer.sourceLink")}
              <Icon name="external" size={16} />
            </a>
          </li>
          <li>
            <a href={COLORFIGURES_URL} target="_blank" rel="noopener noreferrer" className={link}>
              {t("footer.figures")}
              <Icon name="external" size={16} />
            </a>
          </li>
        </ul>
        <FooterLanguages lang={lang} label={t("language.label")} />
        <div className="flex max-w-prose flex-col gap-2 text-sm text-muted">
          <p>{t("footer.privacy")}</p>
          <p>{t("footer.licence")}</p>
        </div>
      </div>
    </footer>
  );
}
