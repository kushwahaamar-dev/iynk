import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ContinueCard, LabProgress } from "@/components/shell/dashboard/DashboardProgress";
import { HeroArt } from "@/components/shell/dashboard/HeroArt";
import { loadLabs } from "@/components/shell/dashboard/data";
import { LAB_LOOK } from "@/components/shell/dashboard/labs";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/icons";
import { BOARD_IDS, DRONE_IDS, ROBOTICS_IDS } from "@/content/ids";
import { isLocale } from "@/i18n/config";
import { alternatesFor } from "@/i18n/seo";
import { getMessages, getT } from "@/i18n/server";

type Props = PageProps<"/[lang]">;

const counts = { boards: BOARD_IDS.length, benches: ROBOTICS_IDS.length, drones: DRONE_IDS.length };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = await getT(lang, "shell");
  return {
    title: t("dashboard.metaTitle"),
    description: t("dashboard.metaDescription", counts),
    alternates: alternatesFor(lang, ""),
  };
}

export default function DashboardPage({ params }: Props) {
  return (
    <Suspense fallback={<div className="mx-auto min-h-[70vh] max-w-7xl px-4 sm:px-6" aria-busy="true" />}>
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
  const allKeys = items.flatMap((item) => item.entries.map((entry) => entry.key));
  const features = (["see", "code", "break", "fly"] as const).map((id) => ({
    id,
    title: t(`dashboard.features.${id}.title`),
    text: t(`dashboard.features.${id}.text`),
  }));

  return (
    <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 sm:pt-12">
      <section aria-labelledby={`dash-title-${lang}`} className="grid items-center gap-8 lg:grid-cols-[1.05fr_1fr]">
        <div>
          <p className="ink-kicker">{t("dashboard.kicker")}</p>
          <h1 id={`dash-title-${lang}`} className="mt-3">
            {t("dashboard.title")}
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed">{t("dashboard.lede", counts)}</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <ButtonLink href={startHref} variant="primary" size="lg">
              {t("dashboard.start")}
            </ButtonLink>
            <ButtonLink href={`/${lang}/boards`} size="lg">
              {t("dashboard.browse")}
            </ButtonLink>
          </div>
        </div>
        <Card tone="plate" padding="sm" className="overflow-hidden">
          <HeroArt title={t("dashboard.heroAlt")} className="h-auto w-full" />
        </Card>
      </section>

      <section aria-labelledby={`labs-title-${lang}`} className="mt-14">
        <h2 id={`labs-title-${lang}`}>{t("dashboard.labsTitle")}</h2>
        <ul className="mt-5 grid gap-5 md:grid-cols-3">
          {labs.map((lab) => {
            const look = LAB_LOOK[lab.lab];
            const copy = labText[lab.lab];
            const keys = lab.items.flatMap((item) => item.entries.map((entry) => entry.key));
            return (
              <li key={lab.lab}>
                <Card as="article" padding="none" className="flex h-full flex-col overflow-hidden" aria-labelledby={`lab-${lab.lab}-${lang}`}>
                  <div className={`flex items-center gap-3 border-b-2 border-line px-5 py-4 text-on-color ${look.band}`}>
                    <span className="flex size-11 items-center justify-center rounded-full border-2 border-[var(--color-ink-fixed)] bg-[var(--color-paper-fixed)]">
                      <Icon name={look.icon} size={24} />
                    </span>
                    <div className="min-w-0">
                      <h3 id={`lab-${lab.lab}-${lang}`} className="text-xl">
                        {labNames[lab.lab]}
                      </h3>
                      <p className="font-ui text-xs font-bold uppercase tracking-wider">{copy.count}</p>
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col gap-4 p-5">
                    <p className="flex-1">{copy.text}</p>
                    {keys.length > 0 ? <LabProgress keys={keys} label={copy.progress} messages={progressMessages} /> : null}
                    <Link
                      href={`/${lang}/${lab.path}`}
                      className="inline-flex min-h-11 items-center gap-1.5 self-start font-ui text-sm font-bold"
                    >
                      {t("dashboard.open", { lab: labNames[lab.lab] })}
                      <Icon name="chevron-right" size={18} />
                    </Link>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-label={t("dashboard.continue.title")} className={`mt-10 grid gap-5 ${allKeys.length > 0 ? "lg:grid-cols-[1.4fr_1fr]" : ""}`}>
        <Card padding="lg">
          <ContinueCard items={items} labNames={labNames} startHref={startHref} messages={messages.dashboard.continue} />
        </Card>
        {allKeys.length > 0 ? (
          <Card tone="sunken" padding="lg" className="flex flex-col justify-center">
            <LabProgress keys={allKeys} label={t("dashboard.overall")} messages={progressMessages} />
          </Card>
        ) : null}
      </section>

      <section aria-labelledby={`features-title-${lang}`} className="mt-14">
        <h2 id={`features-title-${lang}`}>{t("dashboard.features.title")}</h2>
        <ul className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <li key={feature.id} className="border-t-2 border-line pt-4">
              <h3>{feature.title}</h3>
              <p className="mt-2 text-[0.95rem] text-muted">{feature.text}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
