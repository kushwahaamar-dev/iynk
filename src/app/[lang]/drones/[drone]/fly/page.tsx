import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { LabRoom } from "@/components/dock/LabRoom";
import { UntranslatedNotice } from "@/components/shell";
import { loadCraft } from "@/components/dronelab/data";
import { FlyWorkspace } from "@/components/dronelab/FlyWorkspace";
import { DRONE_IDS } from "@/content/ids";
import { isLocale } from "@/i18n/config";
import { alternatesFor } from "@/i18n/seo";
import { getMessages, getT } from "@/i18n/server";

type Props = PageProps<"/[lang]/drones/[drone]/fly">;

export function generateStaticParams() {
  return DRONE_IDS.map((drone) => ({ drone }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, drone } = await params;
  if (!isLocale(lang)) return {};
  const craft = await loadCraft(lang, drone);
  if (!craft) return {};
  const t = await getT(lang, "dronelab");
  const title = typeof craft.text.title === "string" ? craft.text.title : drone;
  return {
    title: t("meta.flyTitle", { title }),
    description: t("meta.flyDescription", { title }),
    alternates: alternatesFor(lang, `/drones/${drone}/fly`),
  };
}

export default function FlyPage({ params }: Props) {
  return (
    <Suspense fallback={<div className="mx-auto min-h-[80vh] max-w-7xl px-4 sm:px-6" aria-busy="true" />}>
      <Fly params={params} />
    </Suspense>
  );
}

async function Fly({ params }: Pick<Props, "params">) {
  const { lang, drone } = await params;
  if (!isLocale(lang)) notFound();
  const [craft, messages, flight] = await Promise.all([
    loadCraft(lang, drone),
    getMessages(lang, "dronelab"),
    getMessages(lang, "flight"),
  ]);
  if (!craft) notFound();
  return (
    <>
      <UntranslatedNotice lang={lang} textLang={craft.textLang} />
      <LabRoom lab="drone" itemId={drone}>
        <FlyWorkspace lang={lang} content={craft.content} text={craft.text} messages={messages} flight={flight} />
      </LabRoom>
    </>
  );
}
