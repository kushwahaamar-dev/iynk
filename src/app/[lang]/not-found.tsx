import Link from "next/link";
import { lang } from "next/root-params";
import { eyebrow, page } from "@/components/editorial/Editorial";
import { buttonClass } from "@/components/ui/Button";
import { cx } from "@/components/ui/cx";
import { Icon } from "@/components/ui/icons";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/i18n/config";
import { getT } from "@/i18n/server";

async function pageLocale(): Promise<Locale> {
  const value = await lang();
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

// Rendered inside the language's layout for unknown slugs and mistyped URLs.
// It gets no props; the root param still knows the language.
export default async function NotFound() {
  const locale = await pageLocale();
  const t = await getT(locale, "common");
  const labs = [
    { href: `/${locale}/boards`, label: t("notFound.boards") },
    { href: `/${locale}/robotics`, label: t("notFound.robotics") },
    { href: `/${locale}/drones`, label: t("notFound.drones") },
  ];

  // not-found.tsx cannot export metadata; React 19 hoists this <title> into <head>.
  return (
    <section className={cx(page, "grid grid-cols-1 gap-x-6 gap-y-12 pt-[clamp(40px,7vw,112px)] pb-[clamp(72px,10vw,160px)] lg:grid-cols-12")}>
      <title>{`${t("notFound.metaTitle")} · ${t("site.name")}`}</title>
      <div className="min-w-0 lg:col-span-7">
        <p className={cx(eyebrow, "tabular")}>404</p>
        <h1 className="mt-5 font-body text-[clamp(44px,7vw,104px)] leading-[0.95] font-semibold tracking-[-0.035em] text-balance">{t("notFound.title")}</h1>
        <p className="mt-7 max-w-[52ch] text-[17px] leading-[1.55] text-muted">{t("notFound.body")}</p>
        <div className="mt-10">
          <Link href={`/${locale}`} className={buttonClass("primary", "lg")}>
            {t("notFound.home")}
          </Link>
        </div>
      </div>
      <ul className="self-end border-t border-rule lg:col-span-4 lg:col-start-9">
        {labs.map((lab, i) => (
          <li key={lab.href} className="border-b border-rule">
            <Link href={lab.href} className="group flex min-h-16 items-center gap-4 font-body text-lg font-semibold no-underline">
              <span className={cx(eyebrow, "tabular")} aria-hidden="true">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="flex-1">{lab.label}</span>
              <Icon name="chevron-right" size={18} className="transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transition-none" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
