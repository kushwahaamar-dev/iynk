import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { FigureFrame, FigureStill } from "@/components/figure";
import { HeroActions, LabProgress } from "@/components/shell/dashboard/DashboardProgress";
import { HeroArt } from "@/components/shell/dashboard/HeroArt";
import { loadLabs } from "@/components/shell/dashboard/data";
import { LAB_LOOK } from "@/components/shell/dashboard/labs";
import { Icon } from "@/components/ui/icons";
import { BOARD_IDS, DRONE_IDS, ROBOTICS_IDS } from "@/content/ids";
import { isLocale } from "@/i18n/config";
import { alternatesFor } from "@/i18n/seo";
import { getMessages, getT } from "@/i18n/server";

type Props = PageProps<"/[lang]">;

const counts = { boards: BOARD_IDS.length, benches: ROBOTICS_IDS.length, drones: DRONE_IDS.length };
// the hero figure is only to look at and turn: no zoom chip, and no notes popping up over it
const HERO_CHROME = ["zoom", "toast"];

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const [t, common] = await Promise.all([getT(lang, "shell"), getT(lang, "common")]);
  return {
    // The landing's tab reads as the product, not "Dashboard".
    title: { absolute: `${common("site.name")} · ${common("site.tagline")}` },
    description: t("dashboard.metaDescription", counts),
    alternates: alternatesFor(lang, ""),
  };
}

export default function DashboardPage({ params }: Props) {
  return (
    <Suspense fallback={<div className="frame min-h-[70vh]" aria-busy="true" />}>
      <Dashboard params={params} />
    </Suspense>
  );
}

async function Dashboard({ params }: Pick<Props, "params">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const [t, messages, labs] = await Promise.all([getT(lang, "shell"), getMessages(lang, "shell"), loadLabs(lang)]);

  const labNames = { board: t("nav.boards"), robotics: t("nav.robotics"), drone: t("nav.drones") };
  const labText = {
    board: { text: t("dashboard.board.text"), count: t("dashboard.board.count", { count: counts.boards }), progress: t("dashboard.board.progress") },
    robotics: { text: t("dashboard.robotics.text"), count: t("dashboard.robotics.count", { count: counts.benches }), progress: t("dashboard.robotics.progress") },
    drone: { text: t("dashboard.drones.text"), count: t("dashboard.drones.count", { count: counts.drones }), progress: t("dashboard.drones.progress") },
  };
  const progressMessages = { progress: messages.ui.progress, progressLabel: messages.ui.progressLabel };
  const items = labs.flatMap((lab) => lab.items);
  const uno = labs[0].items.find((item) => item.id === "uno-r3");
  const startHref = uno?.entries[0]?.href ?? `/${lang}/boards/uno-r3`;
  const features = (["see", "code", "break", "fly"] as const).map((id) => ({
    id,
    title: t(`dashboard.features.${id}.title`),
    text: t(`dashboard.features.${id}.text`),
  }));

  return (
    <div className="frame space-y-16 pt-8 sm:pt-12 lg:space-y-20">
      <section aria-labelledby={`dash-title-${lang}`} className="grid items-center gap-8 lg:grid-cols-[5fr_7fr] lg:gap-12">
        <div>
          <p className="ink-kicker">{t("dashboard.kicker")}</p>
          <h1 id={`dash-title-${lang}`} className="mt-3">
            {t("dashboard.title")}
          </h1>
          <p className="mt-5 max-w-[34rem] text-lg leading-relaxed">{t("dashboard.lede", counts)}</p>
          <div className="mt-8">
            <HeroActions
              items={items}
              messages={messages.dashboard.continue}
              progressMessages={progressMessages}
              labNames={labNames}
              start={{ href: startHref, label: t("dashboard.start") }}
              browse={{ href: `/${lang}/boards`, label: t("dashboard.browse") }}
              overallLabel={t("dashboard.overall")}
            />
          </div>
        </div>
        {/* The Uno running Blink on its breadboard, live: drag it round. The drawing stands in until it's ready. */}
        <div className="h-[min(44svh,400px)] lg:h-[min(62vh,600px)] lg:min-h-80">
          <FigureFrame
            src="/figures/boards/uno-r3.html?bare=1&view=breadboard&circuit=blink"
            title={t("dashboard.heroFigure")}
            controls={false}
            hideChrome={HERO_CHROME}
            fill
            poster={<HeroArt className="h-full w-auto max-w-full object-contain p-4 sm:p-8" />}
          />
        </div>
      </section>

      <section aria-labelledby={`labs-title-${lang}`}>
        <h2 id={`labs-title-${lang}`}>{t("dashboard.labsTitle")}</h2>
        <ul className="mt-6 grid gap-4 lg:grid-cols-3 lg:gap-6">
          {labs.map((lab) => {
            const look = LAB_LOOK[lab.lab];
            const copy = labText[lab.lab];
            const keys = lab.items.flatMap((item) => item.entries.map((entry) => entry.key));
            return (
              <li key={lab.lab}>
                <article
                  aria-labelledby={`lab-${lab.lab}-${lang}`}
                  className="ink-card group relative flex h-full flex-col overflow-hidden transition-transform duration-200 hover:-translate-y-0.5 has-[a:focus-visible]:outline-[2.5px] has-[a:focus-visible]:outline-offset-[3px] has-[a:focus-visible]:outline-(--focus) has-[a:focus-visible]:outline-solid"
                >
                  <span aria-hidden="true" className={`block h-1 ${look.band}`} />
                  <div className="flex flex-1 flex-col gap-3 p-5 sm:p-6">
                    <FigureStill item={look.still} className="-mx-1 -mt-1 mb-1" />
                    <div className="flex items-center justify-between gap-3">
                      <h3 id={`lab-${lab.lab}-${lang}`} className="text-2xl">
                        {/* One link per card; its ::after makes the whole card the target. */}
                        <Link
                          href={`/${lang}/${lab.path}`}
                          className="no-underline after:absolute after:inset-0 focus-visible:shadow-none focus-visible:outline-none"
                        >
                          {labNames[lab.lab]}
                        </Link>
                      </h3>
                      <Icon name={look.icon} size={22} className="shrink-0 text-muted" />
                    </div>
                    <p className="font-ui text-xs font-semibold text-muted">{copy.count}</p>
                    <p className="flex-1 text-base leading-relaxed">{copy.text}</p>
                    {keys.length > 0 ? <LabProgress keys={keys} label={copy.progress} messages={progressMessages} always={false} /> : null}
                    <span aria-hidden="true" className="inline-flex items-center gap-1 font-body text-sm font-semibold">
                      {t("dashboard.open", { lab: labNames[lab.lab] })}
                      <Icon name="chevron-right" size={16} className="transition-transform duration-200 group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby={`features-title-${lang}`}>
        <h2 id={`features-title-${lang}`}>{t("dashboard.features.title")}</h2>
        <ul className="mt-6 grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <li key={feature.id} className="border-t-2 border-line pt-4">
              <h3>{feature.title}</h3>
              <p className="mt-2 text-base text-muted">{feature.text}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
