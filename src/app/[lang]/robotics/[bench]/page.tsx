import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/ui";
import { LabHost } from "@/components/studio/lab/LabHost";
import { ServicesProvider } from "@/components/studio/wiring/services";
import { ROBOTICS_IDS, isRoboticsId } from "@/content/ids";
import { isLocale } from "@/i18n/config";
import { alternatesFor } from "@/i18n/seo";
import { STUDIO_NAMESPACES, type StudioMessages } from "@/i18n/namespaces";
import { getMessages, getT } from "@/i18n/server";
import { loadBench } from "@/lib/robotics/load";

type Props = PageProps<"/[lang]/robotics/[bench]">;

// Bottom up: this page lists [bench]; [lang] comes from the root layout. A bench whose content or English
// prose is not written (or whose prose is incomplete) answers 404 there and is not linked from the index.
export function generateStaticParams() {
  return ROBOTICS_IDS.map((bench) => ({ bench }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, bench } = await params;
  if (!isLocale(lang) || !isRoboticsId(bench)) return {};
  const [t, loaded] = await Promise.all([getT(lang, "robotics"), loadBench(lang, bench)]);
  const name = loaded ? loaded.texts[loaded.bench.title] : t(`benches.${bench}.name`);
  return {
    title: name,
    description: t("meta.benchDescription", { name, teaches: t(`benches.${bench}.teaches`) }),
    alternates: alternatesFor(lang, `/robotics/${bench}`),
  };
}

export default function BenchPage({ params }: Props) {
  return (
    <Suspense fallback={<PageSkeleton kind="workspace" />}>
      <Bench params={params} />
    </Suspense>
  );
}

async function Bench({ params }: Pick<Props, "params">) {
  const { lang, bench: id } = await params;
  if (!isLocale(lang) || !isRoboticsId(id)) notFound();
  const loaded = await loadBench(lang, id);
  if (!loaded) notFound();
  const files = await Promise.all(STUDIO_NAMESPACES.map((ns) => getMessages(lang, ns)));
  const messages = Object.fromEntries(STUDIO_NAMESPACES.map((ns, i) => [ns, files[i]])) as StudioMessages;
  return (
    <div data-bench-page={id}>
      <ServicesProvider>
        <LabHost templateId={`prj_robotics-${id}`} lang={lang} messages={messages} />
      </ServicesProvider>
    </div>
  );
}
