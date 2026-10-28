import Link from "next/link";
import { lang } from "next/root-params";
import { PageHead, Wrap } from "@/components/editorial/Editorial";
import { OpenSearchButton } from "@/components/shell/OpenSearchButton";
import { ButtonLink } from "@/components/ui/Button";
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
    <Wrap className="pb-24 md:pb-32">
      <title>{`${t("notFound.metaTitle")} · ${t("site.name")}`}</title>
      <PageHead
        label={<span className="tabular-nums">404</span>}
        title={t("notFound.title")}
        lede={
          <>
            <p>{t("notFound.body")}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink variant="primary" href={`/${locale}`}>
                {t("notFound.home")}
              </ButtonLink>
              <OpenSearchButton label={t("notFound.search")} />
            </div>
          </>
        }
        aside={
          <ul className="border-t border-rule">
            {labs.map((lab) => (
              <li key={lab.href} className="border-b border-rule">
                <Link href={lab.href} className="group flex min-h-16 items-center gap-4 text-lg font-medium text-ink no-underline">
                  <span className="flex-1">{lab.label}</span>
                  <Icon name="arrow-right" size={20} className="motion-move group-hover:translate-x-1 motion-reduce:transition-none" />
                </Link>
              </li>
            ))}
          </ul>
        }
      />
    </Wrap>
  );
}
