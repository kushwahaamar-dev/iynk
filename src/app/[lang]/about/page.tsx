import { readFileSync } from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageHead, Section, eyebrow, page } from "@/components/editorial/Editorial";
import { FigureStill } from "@/components/figure";
import { PageSkeleton } from "@/components/ui";
import { cx } from "@/components/ui/cx";
import { Icon } from "@/components/ui/icons";
import { isLocale } from "@/i18n/config";
import { alternatesFor } from "@/i18n/seo";
import { getT } from "@/i18n/server";

type Props = PageProps<"/[lang]/about">;

// The vendored engine's own licence file, so the page can never drift from it.
const LICENCE = readFileSync(path.join(process.cwd(), "figures/vendor/colorfigures/LICENSE"), "utf8").trim();

const ORIGINALS = [
  { id: "arduino", url: "https://learn-arduino-red.vercel.app" },
  { id: "robotics", url: "https://robotics-engineer.vercel.app" },
  { id: "drones", url: "https://drone-engineer.vercel.app" },
] as const;

const HOW = ["figures", "code", "privacy"] as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = await getT(lang, "shell");
  return { title: t("about.metaTitle"), description: t("about.metaDescription"), alternates: alternatesFor(lang, "/about") };
}

export default function AboutPage({ params }: Props) {
  return (
    <Suspense fallback={<PageSkeleton kind="article" />}>
      <About params={params} />
    </Suspense>
  );
}

async function About({ params }: Pick<Props, "params">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = await getT(lang, "shell");

  return (
    <div className={cx(page, "pb-16 md:pb-24")}>
      <PageHead
        title={t("about.title")}
        lede={<p>{t("about.lede")}</p>}
        aside={<FigureStill item="boards/uno-r3" className="aspect-[4/3] sm:aspect-[4/3]" />}
      />

      <Section id={`about-how-${lang}`} index="01" title={t("about.howTitle")} wide>
        <ol className="grid grid-cols-1 gap-x-6 border-t border-rule md:grid-cols-3">
          {HOW.map((key, i) => (
            <li key={key} className="border-b border-rule py-6 md:border-s md:border-b-0 md:ps-6 md:first:border-s-0 md:first:ps-0">
              <p className={cx(eyebrow, "tabular")} aria-hidden="true">
                {String(i + 1).padStart(2, "0")}
              </p>
              <h3 className="mt-4 text-xl font-semibold tracking-tight text-balance">{t(`about.howHeads.${key}`)}</h3>
              <p className="mt-2 max-w-prose leading-relaxed">{t(`about.how.${key}`)}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section id={`about-originals-${lang}`} index="02" title={t("about.originalsTitle")} lede={<p>{t("about.originalsLede")}</p>}>
        <ul className="border-t border-rule">
          {ORIGINALS.map((site, i) => {
            const name = t(`about.originals.${site.id}.name`);
            return (
              <li key={site.id} className="grid grid-cols-1 gap-x-6 gap-y-3 border-b border-rule py-8 sm:grid-cols-[3rem_minmax(0,1fr)]">
                <p className={cx(eyebrow, "tabular sm:pt-2")} aria-hidden="true">
                  {String(i + 1).padStart(2, "0")}
                </p>
                <article>
                  <h3 className="text-2xl font-medium tracking-tight">{name}</h3>
                  <p className="mt-2 max-w-[60ch] text-muted">{t(`about.originals.${site.id}.text`)}</p>
                  <a href={site.url} rel="noopener noreferrer" className="mt-2 inline-flex min-h-11 items-center gap-2 text-sm font-semibold">
                    {t("about.visit", { name })}
                    <Icon name="external" size={16} />
                  </a>
                </article>
              </li>
            );
          })}
        </ul>
      </Section>

      <Section id={`about-built-${lang}`} index="03" title={t("about.builtWithTitle")}>
        <p className="max-w-prose text-base leading-relaxed">{t("about.builtWith")}</p>
      </Section>

      <Section id={`about-licence-${lang}`} index="04" title={t("about.licenceTitle")}>
        <p className="max-w-prose text-base leading-relaxed">{t("about.licenceText")}</p>
        <p className="mt-3 text-sm text-muted">
          <a href="https://april-zhu.com/colorfigures" rel="noopener noreferrer">
            {t("about.colorfigures")}
          </a>
        </p>
        {/* The full text is there for anyone who wants it, without taking over the page. */}
        <details className="group mt-8 border-y border-rule">
          <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 text-sm font-semibold [&::-webkit-details-marker]:hidden">
            <Icon name="chevron-right" size={16} className="motion-move group-open:rotate-90" />
            {t("about.licenceTitle")} · MIT
          </summary>
          <div className="pb-4">
            <pre lang="en" tabIndex={0} aria-label={t("about.licenceTitle")} className="overflow-x-auto whitespace-pre-wrap font-ui text-xs leading-relaxed text-muted">
              {LICENCE}
            </pre>
            <p className="mt-3 text-sm text-muted">{t("about.licenceNote")}</p>
          </div>
        </details>
      </Section>
    </div>
  );
}
