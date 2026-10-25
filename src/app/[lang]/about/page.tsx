import { readFileSync } from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/icons";
import { isLocale } from "@/i18n/config";
import { alternatesFor } from "@/i18n/seo";
import { getT } from "@/i18n/server";

type Props = PageProps<"/[lang]/about">;

// The vendored engine's own licence file, so the page can never drift from it.
const LICENCE = readFileSync(path.join(process.cwd(), "figures/vendor/colorfigures/LICENSE"), "utf8").trim();

const ORIGINALS = [
  { id: "arduino", url: "https://learn-arduino-red.vercel.app", band: "bg-cobalt" },
  { id: "robotics", url: "https://robotics-engineer.vercel.app", band: "bg-mint" },
  { id: "drones", url: "https://drone-engineer.vercel.app", band: "bg-tomato" },
] as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = await getT(lang, "shell");
  return { title: t("about.metaTitle"), description: t("about.metaDescription"), alternates: alternatesFor(lang, "/about") };
}

export default function AboutPage({ params }: Props) {
  return (
    <Suspense fallback={<div className="frame min-h-[70vh]" aria-busy="true" />}>
      <About params={params} />
    </Suspense>
  );
}

async function About({ params }: Pick<Props, "params">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = await getT(lang, "shell");

  return (
    <div className="frame pt-8 sm:pt-12">
      <header className="max-w-[68ch]">
        <h1>{t("about.title")}</h1>
        <p className="mt-5 text-lg leading-relaxed">{t("about.lede")}</p>
      </header>

      <div className="mt-14 grid gap-14 xl:grid-cols-[minmax(0,68ch)_minmax(0,1fr)] xl:gap-16">
        <div className="space-y-14">
          <section aria-labelledby={`about-how-${lang}`}>
            <h2 id={`about-how-${lang}`}>{t("about.howTitle")}</h2>
            <div className="ink-prose mt-4">
              <p>{t("about.how.figures")}</p>
              <p>{t("about.how.code")}</p>
              <p>{t("about.how.privacy")}</p>
            </div>
          </section>

          <section aria-labelledby={`about-built-${lang}`}>
            <h2 id={`about-built-${lang}`}>{t("about.builtWithTitle")}</h2>
            <p className="mt-4 max-w-[68ch]">{t("about.builtWith")}</p>
          </section>

          <section aria-labelledby={`about-licence-${lang}`}>
            <h2 id={`about-licence-${lang}`}>{t("about.licenceTitle")}</h2>
            <p className="mt-4 max-w-[68ch]">{t("about.licenceText")}</p>
            <p className="mt-2 text-sm text-muted">
              <a href="https://april-zhu.com/colorfigures" rel="noopener noreferrer">
                {t("about.colorfigures")}
              </a>
            </p>
            {/* The full text is there for anyone who wants it, without taking over the page. */}
            <details className="group mt-5 rounded-ink-sm border-[1.5px] border-(--card-line) bg-surface">
              <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-4 font-body text-sm font-semibold [&::-webkit-details-marker]:hidden">
                <Icon name="chevron-right" size={16} className="transition-transform duration-150 group-open:rotate-90" />
                {t("about.licenceTitle")} · MIT
              </summary>
              <div className="border-t-[1.5px] border-rule px-4 py-3">
                <pre lang="en" tabIndex={0} aria-label={t("about.licenceTitle")} className="overflow-x-auto whitespace-pre-wrap font-ui text-xs leading-relaxed">
                  {LICENCE}
                </pre>
                <p className="mt-2 text-sm text-muted">{t("about.licenceNote")}</p>
              </div>
            </details>
          </section>
        </div>

        <section aria-labelledby={`about-originals-${lang}`}>
          <h2 id={`about-originals-${lang}`}>{t("about.originalsTitle")}</h2>
          <p className="mt-4 max-w-[68ch]">{t("about.originalsLede")}</p>
          <ul className="mt-6 grid gap-4 md:grid-cols-3 xl:grid-cols-1">
            {ORIGINALS.map((site) => {
              const name = t(`about.originals.${site.id}.name`);
              return (
                <li key={site.id}>
                  <Card as="article" padding="none" className="flex h-full flex-col overflow-hidden">
                    <div className={`h-1 ${site.band}`} aria-hidden="true" />
                    <div className="flex flex-1 flex-col gap-2 p-5">
                      <h3>{name}</h3>
                      <p className="flex-1 text-base">{t(`about.originals.${site.id}.text`)}</p>
                      <a href={site.url} rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1.5 self-start font-body text-sm font-semibold">
                        {t("about.visit", { name })}
                        <Icon name="external" size={16} />
                      </a>
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </div>
  );
}
