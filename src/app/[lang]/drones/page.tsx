import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CatalogueCard, CatalogueGrid, CatalogueHead, CataloguePage, eyebrow } from "@/components/catalogue/Catalogue";
import { CraftProgress } from "@/components/dronelab/CraftProgress";
import { loadCards } from "@/components/dronelab/data";
import { formatNumber } from "@/components/dronelab/text";
import { PageSkeleton } from "@/components/ui";
import { cx } from "@/components/ui/cx";
import { DRONE_IDS } from "@/content/ids";
import { htmlLang, isLocale } from "@/i18n/config";
import { alternatesFor } from "@/i18n/seo";
import { getMessages, getT } from "@/i18n/server";

type Props = PageProps<"/[lang]/drones">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = await getT(lang, "dronelab");
  return {
    title: t("meta.indexTitle"),
    description: t("meta.indexDescription"),
    alternates: alternatesFor(lang, "/drones"),
  };
}

export default function DronesPage({ params }: Props) {
  return (
    <Suspense fallback={<PageSkeleton kind="list" />}>
      <DronesIndex params={params} />
    </Suspense>
  );
}

async function DronesIndex({ params }: Pick<Props, "params">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const [t, messages, cards] = await Promise.all([getT(lang, "dronelab"), getMessages(lang, "dronelab"), loadCards(lang)]);
  const headingId = `drones-title-${lang}`;

  return (
    <CataloguePage>
      <CatalogueHead
        ordinal="03"
        kicker={t("index.kicker")}
        title={t("index.title")}
        titleId={headingId}
        lede={t("index.lede")}
        count={DRONE_IDS.length}
        countText={t("index.count", { count: DRONE_IDS.length })}
        numberLocale={htmlLang(lang)}
      />
      <div className="mt-12 md:mt-24">
        <CatalogueGrid labelledBy={headingId}>
          {cards.map((card) => {
            const fig = t("index.fig", { n: String(card.fig).padStart(2, "0") });
            const craft = card.craft;
            const common = {
              data: { "data-craft": card.id },
              item: `drones/${card.id}`,
              fig,
              meta: t(`firmware.${card.firmware}`),
              heading: "h2",
              titleId: `drone-card-${card.id}-${lang}`,
            } as const;
            if (!craft) return <CatalogueCard key={card.id} {...common} name={fig} sub={t("index.notReady")} />;
            const stats = [
              { label: t("index.statAuw"), value: t("design.units.g", { value: formatNumber(lang, craft.auw, 0) }) },
              { label: t("index.statTw"), value: t("design.units.tw", { value: formatNumber(lang, craft.tw, 1) }) },
              {
                label: craft.wing ? t("index.statCruise") : t("index.statTime"),
                value: t("design.units.min", { value: formatNumber(lang, craft.wing ? craft.hoverMin : craft.flyMin, 1) }),
              },
            ];
            return (
              <CatalogueCard
                key={card.id}
                {...common}
                name={craft.title}
                href={`/${lang}/drones/${card.id}`}
                sub={craft.sub}
                specs={
                  <ul className={cx(eyebrow, "flex flex-wrap gap-x-3 gap-y-1")}>
                    <li className="text-ink">{t(`classes.${craft.class}`)}</li>
                    <li className="tabular">{t("index.motors", { count: card.motors })}</li>
                    <li className="tabular">{t("index.size", { mm: craft.sizeMm })}</li>
                  </ul>
                }
                tags={
                  <dl className="grid grid-cols-3 gap-3">
                    {stats.map(({ label, value }) => (
                      <div key={label} className="min-w-0">
                        <dt className="truncate text-xs leading-4 text-muted">{label}</dt>
                        <dd className="tabular mt-1 text-base font-medium leading-6">{value}</dd>
                      </div>
                    ))}
                  </dl>
                }
                progress={
                  <CraftProgress
                    keys={craft.keys}
                    label={t("index.progress")}
                    countTemplate={messages.index.progressValue}
                    valueTemplate={messages.index.progressLabel}
                    size="sm"
                  />
                }
              />
            );
          })}
        </CatalogueGrid>
      </div>
    </CataloguePage>
  );
}
