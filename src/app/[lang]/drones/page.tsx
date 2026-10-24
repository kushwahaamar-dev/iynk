import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CraftProgress } from "@/components/dronelab/CraftProgress";
import { loadCards, type CraftCard } from "@/components/dronelab/data";
import { formatNumber } from "@/components/dronelab/text";
import { Card } from "@/components/ui/Card";
import { Chip, type ChipTone } from "@/components/ui/Chip";
import { Icon } from "@/components/ui/icons";
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
    <Suspense fallback={<div className="mx-auto min-h-[70vh] max-w-7xl px-4 sm:px-6" aria-busy="true" />}>
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
    <div className="mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
      <header className="max-w-3xl">
        <p className="ink-kicker">{t("index.count", { count: DRONE_IDS.length })}</p>
        <h1 id={headingId} className="mt-3">
          {t("index.title")}
        </h1>
        <p className="mt-4 text-lg leading-relaxed">{t("index.lede")}</p>
        <p className="mt-2 text-muted">{t("index.how")}</p>
      </header>

      <ul aria-labelledby={headingId} className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <li key={card.id}>
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
    <Card as="article" padding="none" className="relative flex h-full flex-col overflow-hidden" aria-labelledby={titleId}>
      <div
        className={`flex items-center justify-between gap-3 border-b-2 border-line px-5 py-3 text-on-color ${BAND[card.palette]}`}
      >
        <span className="font-ui text-xs font-bold uppercase tracking-wider">{t("index.fig", { n: fig })}</span>
        <span className="font-ui text-xs font-bold uppercase tracking-wider">{t(`firmware.${card.firmware}`)}</span>
      </div>
      <div className="flex flex-1 flex-col gap-4 p-5">
        {craft ? (
          <>
            <div>
              <h2 id={titleId} className="text-xl">
                <Link href={`/${lang}/drones/${card.id}`} className="after:absolute after:inset-0 focus-visible:outline-none">
                  {craft.title}
                </Link>
              </h2>
              <p className="mt-1 text-muted">{craft.sub}</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Chip tone={TONE[card.palette]}>{t(`classes.${craft.class}`)}</Chip>
              <Chip>{t("index.motors", { count: card.motors })}</Chip>
              <Chip>{t("index.size", { mm: craft.sizeMm })}</Chip>
            </div>
            <dl className="grid grid-cols-3 gap-2 border-y-2 border-dashed border-rule py-3 text-center">
              <div>
                <dt className="ink-kicker text-[0.65rem]">{t("index.statAuw")}</dt>
                <dd className="font-ui text-sm font-bold">{t("design.units.g", { value: formatNumber(lang, craft.auw, 0) })}</dd>
              </div>
              <div>
                <dt className="ink-kicker text-[0.65rem]">{t("index.statTw")}</dt>
                <dd className="font-ui text-sm font-bold">{t("design.units.tw", { value: formatNumber(lang, craft.tw, 1) })}</dd>
              </div>
              <div>
                <dt className="ink-kicker text-[0.65rem]">{craft.wing ? t("index.statCruise") : t("index.statTime")}</dt>
                <dd className="font-ui text-sm font-bold">
                  {t("design.units.min", { value: formatNumber(lang, craft.wing ? craft.hoverMin : craft.flyMin, 1) })}
                </dd>
              </div>
            </dl>
            <TagList tags={card.tags} messages={messages} />
            <div className="relative mt-auto flex items-center justify-between gap-3">
              <CraftProgress
                keys={craft.keys}
                label={t("index.progress")}
                countTemplate={messages.index.progressValue}
                valueTemplate={messages.index.progressLabel}
                size="sm"
                className="flex-1"
              />
              <Icon name="chevron-right" size={20} />
            </div>
          </>
        ) : (
          <>
            <h2 id={titleId} className="text-xl">
              {t("index.fig", { n: fig })}
            </h2>
            <TagList tags={card.tags} messages={messages} />
            <p className="text-muted">{t("index.notReady")}</p>
          </>
        )}
      </div>
    </Card>
  );
}

function TagList({ tags, messages }: { tags: readonly string[]; messages: Messages["dronelab"] }) {
  const labels = messages.tags as Record<string, string>;
  return (
    <ul className="flex flex-wrap gap-x-2 gap-y-1">
      {tags.map((tag) => (
        <li key={tag} className="font-ui text-xs text-muted">
          #{labels[tag] ?? tag}
        </li>
      ))}
    </ul>
  );
}
