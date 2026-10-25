import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CraftProgress } from "@/components/dronelab/CraftProgress";
import { loadCards, type CraftCard } from "@/components/dronelab/data";
import { formatNumber } from "@/components/dronelab/text";
import { FigureStill } from "@/components/figure";
import { Card } from "@/components/ui/Card";
import { Chip, type ChipTone } from "@/components/ui/Chip";
import { DRONE_IDS } from "@/content/ids";
import { isLocale, type Locale } from "@/i18n/config";
import { alternatesFor } from "@/i18n/seo";
import { getMessages, getT } from "@/i18n/server";
import type { Translate } from "@/i18n/translate";
import type { Messages } from "@/i18n/namespaces";

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
    <Suspense fallback={<div className="frame min-h-[70vh]" aria-busy="true" />}>
      <DronesIndex params={params} />
    </Suspense>
  );
}

const BAND: Record<CraftCard["palette"], string> = {
  tomato: "bg-tomato",
  mustard: "bg-mustard",
  mint: "bg-mint",
  cobalt: "bg-cobalt",
  blush: "bg-blush",
  mono: "bg-sunken",
};

const TONE: Record<CraftCard["palette"], ChipTone> = {
  tomato: "tomato",
  mustard: "mustard",
  mint: "mint",
  cobalt: "cobalt",
  blush: "blush",
  mono: "plain",
};

async function DronesIndex({ params }: Pick<Props, "params">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const [t, messages, cards] = await Promise.all([getT(lang, "dronelab"), getMessages(lang, "dronelab"), loadCards(lang)]);
  const headingId = `drones-title-${lang}`;

  return (
    <div className="frame pb-16 pt-8 sm:pt-12">
      <header className="max-w-[68ch]">
        <p className="ink-kicker">{t("index.count", { count: DRONE_IDS.length })}</p>
        <h1 id={headingId} className="mt-3">
          {t("index.title")}
        </h1>
        <p className="mt-4 text-lg leading-relaxed">{t("index.lede")}</p>
      </header>

      <ul aria-labelledby={headingId} className="mt-10 grid grid-cols-[repeat(auto-fill,minmax(min(17.5rem,100%),1fr))] gap-4 lg:gap-6">
        {cards.map((card) => (
          <li key={card.id} className="row-span-5 grid grid-rows-subgrid gap-y-0">
            <CraftCardView card={card} lang={lang} t={t} messages={messages} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function CraftCardView({
  card,
  lang,
  t,
  messages,
}: {
  card: CraftCard;
  lang: Locale;
  t: Translate<Messages["dronelab"]>;
  messages: Messages["dronelab"];
}) {
  const fig = String(card.fig).padStart(2, "0");
  const titleId = `drone-card-${card.id}-${lang}`;
  const craft = card.craft;
  return (
    <Card
      as="article"
      padding="none"
      // a subgrid of the list's rows: band, picture, title, chips and numbers line up across every card of a row
      className="group relative row-span-5 grid grid-rows-subgrid gap-y-0 overflow-hidden focus-within:outline-[2.5px] focus-within:outline-offset-2 focus-within:outline-(--focus)"
      aria-labelledby={titleId}
    >
      <div className={`flex items-center justify-between gap-3 border-b-2 border-line px-4 py-1.5 text-on-color sm:py-2 ${BAND[card.palette]}`}>
        <span className="font-ui text-xs font-bold uppercase tracking-wider">{t("index.fig", { n: fig })}</span>
        <span className="font-ui text-xs font-bold uppercase tracking-wider">{t(`firmware.${card.firmware}`)}</span>
      </div>
      <FigureStill item={`drones/${card.id}`} className="px-3 pt-3 sm:px-4 sm:pt-4" />
      {craft ? (
        <>
          <div className="px-3 pt-3 sm:px-4 sm:pt-4">
            <h2 id={titleId} className="font-head text-xl leading-tight">
              <Link href={`/${lang}/drones/${card.id}`} className="no-underline after:absolute after:inset-0 group-hover:underline focus-visible:outline-none">
                {craft.title}
              </Link>
            </h2>
            <p className="mt-1 text-sm text-muted max-sm:hidden">{craft.sub}</p>
          </div>
          <ul className="flex flex-wrap content-start gap-1.5 px-3 pt-2 max-sm:hidden sm:px-4 sm:pt-3">
            <li>
              <Chip tone={TONE[card.palette]}>{t(`classes.${craft.class}`)}</Chip>
            </li>
            <li>
              <Chip>{t("index.motors", { count: card.motors })}</Chip>
            </li>
            <li>
              <Chip>{t("index.size", { mm: craft.sizeMm })}</Chip>
            </li>
          </ul>
          <dl className="mx-3 mb-4 mt-2 grid grid-cols-3 gap-2 border-t-[1.5px] border-rule pt-2 sm:mx-4 sm:mb-5 sm:mt-3 sm:pt-3">
            <div className="min-w-0">
              <dt className="ink-label truncate">{t("index.statAuw")}</dt>
              <dd className="tabular font-ui text-sm font-semibold">{t("design.units.g", { value: formatNumber(lang, craft.auw, 0) })}</dd>
            </div>
            <div className="min-w-0">
              <dt className="ink-label truncate">{t("index.statTw")}</dt>
              <dd className="tabular font-ui text-sm font-semibold">{t("design.units.tw", { value: formatNumber(lang, craft.tw, 1) })}</dd>
            </div>
            <div className="min-w-0">
              <dt className="ink-label truncate">{craft.wing ? t("index.statCruise") : t("index.statTime")}</dt>
              <dd className="tabular font-ui text-sm font-semibold">
                {t("design.units.min", { value: formatNumber(lang, craft.wing ? craft.hoverMin : craft.flyMin, 1) })}
              </dd>
            </div>
          </dl>
          {/* a line along the card's bottom edge, outside the rows */}
          <CraftProgress
            keys={craft.keys}
            label={t("index.progress")}
            countTemplate={messages.index.progressValue}
            valueTemplate={messages.index.progressLabel}
            line
          />
        </>
      ) : (
        <div className="row-span-3 px-3 pb-4 pt-3 sm:px-4 sm:pb-5 sm:pt-4">
          <h2 id={titleId} className="font-head text-xl">
            {t("index.fig", { n: fig })}
          </h2>
          <p className="mt-2 text-sm text-muted">{t("index.notReady")}</p>
        </div>
      )}
    </Card>
  );
}
