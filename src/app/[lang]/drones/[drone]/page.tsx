import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { LabRoom } from "@/components/dock/LabRoom";
import { UntranslatedNotice } from "@/components/shell";
import { loadCraft } from "@/components/dronelab/data";
import { DroneWorkspace } from "@/components/dronelab/DroneWorkspace";
import { DRONE_IDS } from "@/content/ids";
import { isLocale } from "@/i18n/config";
import { alternatesFor } from "@/i18n/seo";
import { getMessages, getT } from "@/i18n/server";

type Props = PageProps<"/[lang]/drones/[drone]">;

// Bottom up: [lang] comes from the root layout. Every craft id is listed; one whose data module or English
// prose is not written yet renders the 404 page.
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
    title: t("meta.craftTitle", { title }),
    description: t("meta.craftDescription", { title, cli: craft.content.firmware.cliName }),
    alternates: alternatesFor(lang, `/drones/${drone}`),
  };
}

export default function DronePage({ params }: Props) {
  return (
    <Suspense fallback={<div className="min-h-[calc(100dvh-var(--header-h))]" aria-busy="true" />}>
      <Drone params={params} />
    </Suspense>
  );
}

async function Drone({ params }: Pick<Props, "params">) {
  const { lang, drone } = await params;
  if (!isLocale(lang)) notFound();
  const [craft, messages] = await Promise.all([loadCraft(lang, drone), getMessages(lang, "dronelab")]);
  if (!craft) notFound();
  return (
    <LabRoom lab="drone" itemId={drone}>
      <DroneWorkspace
        lang={lang}
        content={craft.content}
        text={craft.text}
        messages={messages}
        notice={<UntranslatedNotice lang={lang} textLang={craft.textLang} variant="chip" />}
      />
    </LabRoom>
  );
}
