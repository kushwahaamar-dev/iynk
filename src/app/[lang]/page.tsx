import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Faq, FinalCta, Hero, HowItWorks, LabsShelf, OpenSource, Proof, TaglineReveal, workbenchHref } from "@/components/home";
import { BENEFIT_IDS } from "@/components/home/labs-data";
import { loadLabs } from "@/components/shell/dashboard/data";
import { PageSkeleton } from "@/components/ui";
import { BOARD_IDS, DRONE_IDS, ROBOTICS_IDS } from "@/content/ids";
import { isLocale } from "@/i18n/config";
import { alternatesFor } from "@/i18n/seo";
import { getMessages, getT } from "@/i18n/server";

type Props = PageProps<"/[lang]">;

const counts = { boards: BOARD_IDS.length, benches: ROBOTICS_IDS.length, drones: DRONE_IDS.length };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = await getT(lang, "home");
  return {
    title: { absolute: t("meta.title") },
    description: t("meta.description"),
    alternates: alternatesFor(lang, ""),
  };
}

export default function HomePage({ params }: Props) {
  return (
    <Suspense fallback={<PageSkeleton kind="list" />}>
      <Home params={params} />
    </Suspense>
  );
}

async function Home({ params }: Pick<Props, "params">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const [t, shell, shellMessages, labs] = await Promise.all([
    getT(lang, "home"),
    getT(lang, "shell"),
    getMessages(lang, "shell"),
    loadLabs(lang),
  ]);

  const labNames = { board: shell("nav.boards"), robotics: shell("nav.robotics"), drone: shell("nav.drones") };
  const progressMessages = { progress: shellMessages.ui.progress, progressLabel: shellMessages.ui.progressLabel };
  const labCopy = {
    board: { name: labNames.board, text: t("labs.boards.text"), unit: t("labs.boards.unit"), progress: shell("dashboard.board.progress") },
    robotics: { name: labNames.robotics, text: t("labs.robotics.text"), unit: t("labs.robotics.unit"), progress: shell("dashboard.robotics.progress") },
    drone: { name: labNames.drone, text: t("labs.drones.text"), unit: t("labs.drones.unit"), progress: shell("dashboard.drones.progress") },
  };
  const benefits = BENEFIT_IDS.map((id) => ({ id, title: t(`benefits.${id}.title`), text: t(`benefits.${id}.text`) }));
  const steps = (["1", "2", "3"] as const).map((n) => ({ title: t(`how.${n}.title`), text: t(`how.${n}.text`) }));
  const items = labs.flatMap((lab) => lab.items);
  const startHref = workbenchHref(lang, labs[0].items.find((item) => item.id === "uno-r3"));

  return (
    <>
      <Hero
        t={t}
        counts={counts}
        startHref={startHref}
        browseHref={`/${lang}/boards`}
        progress={{
          items,
          messages: shellMessages.dashboard.continue,
          progressMessages,
          labNames,
          overallLabel: shell("dashboard.overall"),
        }}
      />
      <TaglineReveal text={t("tagline.text")} locale={lang} />
      <LabsShelf lang={lang} title={t("labs.title")} labs={labs} copy={labCopy} progressMessages={progressMessages} />
      <HowItWorks benefitsTitle={t("benefits.title")} benefits={benefits} howTitle={t("how.title")} steps={steps} />
      <Proof t={t} />
      <Faq t={t} />
      <OpenSource lang={lang} />
      <FinalCta lang={lang} href={startHref} />
    </>
  );
}
