import Link from "next/link";
import { lang } from "next/root-params";
import { buttonClass } from "@/components/ui/Button";
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
    <section className="frame flex min-h-[60svh] flex-col justify-center py-16">
      <title>{`${t("notFound.metaTitle")} · ${t("site.name")}`}</title>
      <p className="ink-kicker">404</p>
      <h1 className="mt-3 max-w-[20ch]">{t("notFound.title")}</h1>
      <p className="mt-4 max-w-[52ch] text-lg text-muted">{t("notFound.body")}</p>
      <div className="mt-8">
        <Link href={`/${locale}`} className={buttonClass("primary", "lg")}>
          {t("notFound.home")}
        </Link>
      </div>
      <ul className="-ms-2 mt-6 flex flex-wrap gap-x-2 gap-y-1">
        {labs.map((lab) => (
          <li key={lab.href}>
            <Link href={lab.href} className="inline-flex min-h-11 items-center gap-1 rounded-full px-2 font-body text-sm font-semibold no-underline hover:bg-sunken">
              {lab.label}
              <Icon name="chevron-right" size={16} />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
