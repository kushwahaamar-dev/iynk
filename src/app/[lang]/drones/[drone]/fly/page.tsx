import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/ui";
import { loadCraft } from "@/components/dronelab/data";
import { LabHost } from "@/components/studio/lab/LabHost";
import { ServicesProvider } from "@/components/studio/wiring/services";
import { DRONE_IDS } from "@/content/ids";
import { isLocale } from "@/i18n/config";
import { STUDIO_NAMESPACES, type StudioMessages } from "@/i18n/namespaces";
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
    <Suspense fallback={<PageSkeleton kind="workspace" />}>
      <Fly params={params} />
    </Suspense>
  );
}

async function Fly({ params }: Pick<Props, "params">) {
  const { lang, drone } = await params;
  if (!isLocale(lang)) notFound();
  const craft = await loadCraft(lang, drone);
  if (!craft) notFound();
  const files = await Promise.all(STUDIO_NAMESPACES.map((ns) => getMessages(lang, ns)));
  const messages = Object.fromEntries(STUDIO_NAMESPACES.map((ns, i) => [ns, files[i]])) as StudioMessages;
  return (
    <ServicesProvider>
      <LabHost templateId={`prj_drone-${drone}`} lang={lang} view="fly" messages={messages} />
    </ServicesProvider>
  );
}
