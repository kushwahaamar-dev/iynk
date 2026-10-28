import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CatalogueCard, CatalogueGrid, CatalogueGroup, CatalogueHead, CataloguePage, TagLine } from "@/components/catalogue/Catalogue";
import { BenchProgress } from "@/components/robotics/BenchProgress";
import { PageSkeleton } from "@/components/ui";
import { ROBOTICS, ROBOTICS_IDS, type RoboticsId } from "@/content/ids";
import { htmlLang, isLocale, type Locale } from "@/i18n/config";
import { alternatesFor } from "@/i18n/seo";
import { getT } from "@/i18n/server";
import { benchesByMonth, benchKeys, boardProduct, type BenchKeys } from "@/lib/robotics/catalog";
import { loadBench } from "@/lib/robotics/load";

type Props = PageProps<"/[lang]/robotics">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = await getT(lang, "robotics");
  return { title: t("meta.indexTitle"), description: t("meta.indexDescription"), alternates: alternatesFor(lang, "/robotics") };
}

export default function RoboticsIndexPage({ params }: Props) {
  return (
    <Suspense fallback={<PageSkeleton kind="list" />}>
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
    <CataloguePage>
      <CatalogueHead
        ordinal="02"
        kicker={t("index.kicker")}
        title={t("index.title")}
        lede={t("index.lede")}
        count={ROBOTICS_IDS.length}
        countText={t("index.count", { count: ROBOTICS_IDS.length })}
        numberLocale={htmlLang(lang)}
      />

      <div className="mt-12 md:mt-24">
        {benchesByMonth().map(({ month, ids }) => {
          const { kicker, title } = monthParts(t(`index.months.m${month}`));
          const monthKeys = ids.flatMap((id) => {
            const keys = ready.get(id);
            return keys ? allKeys(keys) : [];
          });
          return (
            <CatalogueGroup
              key={month}
              id={`robotics-month-${month}`}
              kicker={kicker}
              title={title}
              aside={monthKeys.length > 0 ? <BenchProgress keys={monthKeys} {...progress} idle={null} className="max-w-56" /> : null}
            >
              <CatalogueGrid wide={false}>
                {ids.map((id) => {
                  const meta = ROBOTICS[id];
                  const name = t(`benches.${id}.name`);
                  const board = boardProduct(id);
                  const keys = ready.get(id) ?? null;
                  return (
                    <CatalogueCard
                      key={id}
                      data={{ "data-bench": id }}
                      item={`robotics/${id}`}
                      fig={t("index.fig", { n: String(meta.fig).padStart(2, "0") })}
                      heading="h3"
                      name={name}
                      href={keys ? `/${lang}/robotics/${id}` : undefined}
                      openLabel={t("index.open", { name })}
                      sub={t(`benches.${id}.teaches`)}
                      specs={<p className="text-xs leading-5">{board ? t("index.onMat", { board }) : t("index.ownSupply")}</p>}
                      tags={<TagLine label={t("index.tagsLabel")} items={meta.tags.map((tag) => t(`tags.${tag as TagKey}`))} />}
                      progress={
                        keys ? (
                          <BenchProgress
                            keys={allKeys(keys)}
                            {...progress}
                            idle={
                              <p className="tabular font-ui text-xs leading-5 text-muted">
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
                        ) : null
                      }
                    />
                  );
                })}
              </CatalogueGrid>
            </CatalogueGroup>
          );
        })}
      </div>
    </CataloguePage>
  );
}

type TagKey = keyof (typeof import("@/i18n/messages/en/robotics.json"))["tags"];
