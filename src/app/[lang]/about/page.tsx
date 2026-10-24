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
    <Suspense fallback={<div className="mx-auto min-h-[70vh] max-w-4xl px-4 sm:px-6" aria-busy="true" />}>
      <About params={params} />
    </Suspense>
  );
}

async function About({ params }: Pick<Props, "params">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const [t, common] = await Promise.all([getT(lang, "shell"), getT(lang, "common")]);

  return (
    <div className="mx-auto max-w-4xl px-4 pt-8 sm:px-6 sm:pt-12">
      <header>
        <p className="ink-kicker">{t("about.kicker")}</p>
        <h1 className="mt-3">{t("about.title")}</h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed">{t("about.lede")}</p>
      </header>

      <section aria-labelledby={`about-how-${lang}`} className="mt-12">
        <h2 id={`about-how-${lang}`}>{t("about.howTitle")}</h2>
        <div className="ink-prose mt-4">
          <p>{t("about.how.figures")}</p>
          <p>{t("about.how.code")}</p>
          <p>{t("about.how.privacy")}</p>
        </div>
      </section>

      <section aria-labelledby={`about-originals-${lang}`} className="mt-12">
        <h2 id={`about-originals-${lang}`}>{t("about.originalsTitle")}</h2>
        <p className="mt-4 max-w-2xl">{t("about.originalsLede")}</p>
        <ul className="mt-6 grid gap-5 md:grid-cols-3">
          {ORIGINALS.map((site) => {
            const name = t(`about.originals.${site.id}.name`);
            return (
              <li key={site.id}>
                <Card as="article" padding="none" className="flex h-full flex-col overflow-hidden">
                  <div className={`h-3 border-b-2 border-line ${site.band}`} aria-hidden="true" />
                  <div className="flex flex-1 flex-col gap-3 p-5">
                    <h3>{name}</h3>
                    <p className="flex-1 text-[0.95rem]">{t(`about.originals.${site.id}.text`)}</p>
                    <a href={site.url} rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1.5 self-start font-ui text-sm font-bold">
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

      <section aria-labelledby={`about-licence-${lang}`} className="mt-12">
        <h2 id={`about-licence-${lang}`}>{t("about.licenceTitle")}</h2>
        <p className="mt-4 max-w-2xl">{t("about.licenceText")}</p>
        <p className="mt-2 text-sm text-muted">
          <a href="https://april-zhu.com/colorfigures" rel="noopener noreferrer">
            {t("about.colorfigures")}
          </a>
        </p>
        <Card tone="plate" padding="md" className="mt-5">
          <pre lang="en" tabIndex={0} aria-label={t("about.licenceTitle")} className="overflow-x-auto whitespace-pre-wrap font-ui text-[0.8rem] leading-relaxed">
            {LICENCE}
          </pre>
        </Card>
        <p className="mt-2 text-sm text-muted">{t("about.licenceNote")}</p>
      </section>

      <section aria-labelledby={`about-built-${lang}`} className="mt-12">
        <h2 id={`about-built-${lang}`}>{t("about.builtWithTitle")}</h2>
        <p className="mt-4 max-w-2xl">{t("about.builtWith")}</p>
        <p className="mt-6 font-ui text-xs font-bold uppercase tracking-[0.16em] text-muted">
          {common("site.name")} · {common("site.tagline")}
        </p>
      </section>
    </div>
  );
}
