import Link from "next/link";
import { lang } from "next/root-params";
import { buttonClass } from "@/components/ui/Button";
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
    <section className="mx-auto max-w-2xl px-4 py-16 sm:py-24">
      <title>{`${t("notFound.metaTitle")} · ${t("site.name")}`}</title>
      <div className="ink-card p-6 sm:p-10">
        <p className="ink-kicker">404</p>
        <h1 className="mt-2">
          {t("notFound.title")}
        </h1>
        <p className="mt-4 text-muted">{t("notFound.body")}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href={`/${locale}`} className={buttonClass("primary")}>
            {t("notFound.home")}
          </Link>
          {labs.map((lab) => (
            <Link key={lab.href} href={lab.href} className={buttonClass("secondary")}>
              {lab.label}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
