import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BenchProgress } from "@/components/robotics/BenchProgress";
import { Chip } from "@/components/ui/Chip";
import { ROBOTICS, ROBOTICS_IDS, type RoboticsId } from "@/content/ids";
import { isLocale, type Locale } from "@/i18n/config";
import { alternatesFor } from "@/i18n/seo";
import { getT } from "@/i18n/server";
import { benchesByMonth, benchKeys, boardProduct } from "@/lib/robotics/catalog";
import { loadBench } from "@/lib/robotics/load";

type Props = PageProps<"/[lang]/robotics">;

const BAND: Record<string, string> = {
  tomato: "bg-tomato",
  mustard: "bg-mustard",
  mint: "bg-mint",
  cobalt: "bg-cobalt",
  blush: "bg-blush",
  mono: "bg-mono-300",
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = await getT(lang, "robotics");
  return { title: t("meta.indexTitle"), description: t("meta.indexDescription"), alternates: alternatesFor(lang, "/robotics") };
}

export default function RoboticsIndexPage({ params }: Props) {
  return (
    <Suspense fallback={<div className="mx-auto min-h-[70vh] max-w-6xl px-4 sm:px-6" aria-busy="true" />}>
      <RoboticsIndex params={params} />
    </Suspense>
  );
}

async function benchKeysFor(lang: Locale, id: RoboticsId): Promise<string[] | null> {
  const loaded = await loadBench(lang, id);
  if (!loaded) return null;
  const keys = benchKeys(loaded.bench);
  return [...keys.steps, ...keys.tasks, ...keys.quizzes];
}

async function RoboticsIndex({ params }: Pick<Props, "params">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = await getT(lang, "robotics");
  const ready = new Map<RoboticsId, string[] | null>(
    await Promise.all(ROBOTICS_IDS.map(async (id) => [id, await benchKeysFor(lang, id)] as const)),
  );

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
      <header className="max-w-3xl">
        <p className="ink-kicker">{t("index.kicker")}</p>
        <h1 className="mt-3">{t("index.title")}</h1>
        <p className="mt-5 text-lg leading-relaxed">{t("index.lede")}</p>
      </header>

      {benchesByMonth().map(({ month, ids }) => (
        <section key={month} aria-labelledby={`robotics-month-${month}`} className="mt-12">
          <h2 id={`robotics-month-${month}`} className="ink-kicker text-base">
            {t(`index.months.m${month}`)}
          </h2>
          <ul className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {ids.map((id) => {
              const meta = ROBOTICS[id];
              const name = t(`benches.${id}.name`);
              const board = boardProduct(id);
              const keys = ready.get(id) ?? null;
              const href = `/${lang}/robotics/${id}`;
              return (
                <li key={id}>
                  <article
                    data-bench={id}
                    className="ink-card relative flex h-full flex-col overflow-hidden p-0 focus-within:outline-2 focus-within:outline-offset-4 focus-within:outline-ink"
                  >
                    <div className={`h-3 border-b-2 border-line ${BAND[meta.palette] ?? "bg-mono-300"}`} aria-hidden="true" />
                    <div className="flex flex-1 flex-col gap-3 p-5">
                      <p className="ink-kicker tabular">{t("index.fig", { n: String(meta.fig).padStart(2, "0") })}</p>
                      <h3 className="text-xl">
                        {keys ? (
                          <Link
                            href={href}
                            aria-label={t("index.open", { name })}
                            className="no-underline after:absolute after:inset-0 after:content-[''] focus-visible:outline-none"
                          >
                            {name}
                          </Link>
                        ) : (
                          name
                        )}
                      </h3>
                      <p className="flex-1 text-[0.95rem] leading-relaxed">{t(`benches.${id}.teaches`)}</p>
                      <p className="text-sm text-muted">{board ? t("index.onMat", { board }) : t("index.ownSupply")}</p>
                      <ul className="flex flex-wrap gap-1.5" aria-label={t("index.tagsLabel")}>
                        {meta.tags.map((tag) => (
                          <li key={tag}>
                            <Chip>{t(`tags.${tag as TagKey}`)}</Chip>
                          </li>
                        ))}
                      </ul>
                      {keys ? (
                        <BenchProgress
                          keys={keys}
                          label={t("index.progressName")}
                          countTemplate={t("index.progress", { done: "{done}", total: "{total}" })}
                          valueTemplate={t("index.progressLabel", { done: "{done}", total: "{total}" })}
                          className="relative mt-1"
                        />
                      ) : null}
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

type TagKey = keyof (typeof import("@/i18n/messages/en/robotics.json"))["tags"];
