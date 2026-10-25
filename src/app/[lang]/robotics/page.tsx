import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { FigureStill } from "@/components/figure";
import { BenchProgress } from "@/components/robotics/BenchProgress";
import { Chip } from "@/components/ui/Chip";
import { ROBOTICS, ROBOTICS_IDS, type RoboticsId } from "@/content/ids";
import { isLocale, type Locale } from "@/i18n/config";
import { alternatesFor } from "@/i18n/seo";
import { getT } from "@/i18n/server";
import { benchesByMonth, benchKeys, boardProduct, type BenchKeys } from "@/lib/robotics/catalog";
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
    <Suspense fallback={<div className="frame min-h-[70vh]" aria-busy="true" />}>
      <RoboticsIndex params={params} />
    </Suspense>
  );
}

async function benchKeysFor(lang: Locale, id: RoboticsId): Promise<BenchKeys | null> {
  const loaded = await loadBench(lang, id);
  return loaded ? benchKeys(loaded.bench) : null;
}

const allKeys = (keys: BenchKeys) => [...keys.steps, ...keys.tasks, ...keys.quizzes];

// "Month 1 · electronics" is a kicker and a title; "Start here" is a title alone.
function monthParts(label: string): { kicker: string | null; title: string } {
  const at = label.indexOf(" · ");
  if (at === -1) return { kicker: null, title: label };
  const title = label.slice(at + 3);
  return { kicker: label.slice(0, at), title: title.charAt(0).toLocaleUpperCase() + title.slice(1) };
}

async function RoboticsIndex({ params }: Pick<Props, "params">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = await getT(lang, "robotics");
  const ready = new Map<RoboticsId, BenchKeys | null>(
    await Promise.all(ROBOTICS_IDS.map(async (id) => [id, await benchKeysFor(lang, id)] as const)),
  );
  const progress = {
    label: t("index.progressName"),
    countTemplate: t("index.progress", { done: "{done}", total: "{total}" }),
    valueTemplate: t("index.progressLabel", { done: "{done}", total: "{total}" }),
  };

  return (
    <div className="frame pb-16 pt-8 sm:pt-12">
      <header>
        <p className="ink-kicker">{t("index.kicker")}</p>
        <h1 className="mt-3">{t("index.title")}</h1>
        <p className="mt-5 max-w-[68ch] text-lg leading-relaxed">{t("index.lede")}</p>
      </header>

      <div className="mt-10 lg:mt-14">
        {benchesByMonth().map(({ month, ids }) => {
          const { kicker, title } = monthParts(t(`index.months.m${month}`));
          const monthKeys = ids.flatMap((id) => {
            const keys = ready.get(id);
            return keys ? allKeys(keys) : [];
          });
          return (
            <section
              key={month}
              aria-labelledby={`robotics-month-${month}`}
              className="grid grid-cols-1 gap-x-8 gap-y-4 border-t-[1.5px] border-rule py-8 lg:grid-cols-[13.75rem_minmax(0,1fr)] lg:py-10"
            >
              <div className="flex flex-col gap-3 lg:sticky lg:top-[calc(var(--header-h)+1.5rem)] lg:self-start">
                <h2 id={`robotics-month-${month}`} className="font-head text-2xl leading-tight">
                  {kicker ? <span className="ink-kicker mb-1 block">{kicker}</span> : null}
                  {title}
                </h2>
                {monthKeys.length > 0 ? <BenchProgress keys={monthKeys} {...progress} idle={null} className="max-w-56" /> : null}
              </div>
              <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
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
                        className="ink-card group relative flex h-full flex-col overflow-hidden p-0 transition-transform duration-150 focus-within:outline-2 focus-within:outline-offset-4 focus-within:outline-ink has-[a:hover]:-translate-y-0.5"
                      >
                        <div className={`h-2 border-b-[1.5px] border-line ${BAND[meta.palette] ?? "bg-mono-300"}`} aria-hidden="true" />
                        <div className="flex flex-1 flex-col gap-2.5 p-5">
                          <FigureStill item={`robotics/${id}`} className="-mx-1 -mt-1 mb-1" />
                          <p className="ink-kicker tabular">{t("index.fig", { n: String(meta.fig).padStart(2, "0") })}</p>
                          <h3 className="text-xl leading-snug">
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
                          <p className="flex-1 text-sm leading-relaxed">{t(`benches.${id}.teaches`)}</p>
                          <p className="text-sm text-muted">{board ? t("index.onMat", { board }) : t("index.ownSupply")}</p>
                          <ul className="flex flex-wrap gap-1.5" aria-label={t("index.tagsLabel")}>
                            {meta.tags.map((tag) => (
                              <li key={tag}>
                                <Chip>{t(`tags.${tag as TagKey}`)}</Chip>
                              </li>
                            ))}
                          </ul>
                          {keys ? (
                            <div className="relative mt-1 min-h-6 border-t-[1.5px] border-rule pt-3">
                              <BenchProgress
                                keys={allKeys(keys)}
                                {...progress}
                                idle={
                                  <p className="tabular text-sm text-muted">
                                    {[
                                      keys.steps.length > 0 ? t("index.steps", { count: keys.steps.length }) : null,
                                      keys.tasks.length > 0 ? t("index.tasks", { count: keys.tasks.length }) : null,
                                      keys.quizzes.length > 0 ? t("index.quizzes", { count: keys.quizzes.length }) : null,
                                    ]
                                      .filter(Boolean)
                                      .join(" · ")}
                                  </p>
                                }
                              />
                            </div>
                          ) : null}
                        </div>
                      </article>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}

type TagKey = keyof (typeof import("@/i18n/messages/en/robotics.json"))["tags"];
