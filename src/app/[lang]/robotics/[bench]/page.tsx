import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { LabRoom } from "@/components/dock/LabRoom";
import { UntranslatedNotice } from "@/components/shell";
import { Icon } from "@/components/ui/icons";
import { BenchWorkspace } from "@/components/robotics/BenchWorkspace";
import type { BenchMessages } from "@/components/robotics/messages";
import { ROBOTICS_IDS, isRoboticsId } from "@/content/ids";
import { isLocale } from "@/i18n/config";
import { alternatesFor } from "@/i18n/seo";
import { getMessages, getT } from "@/i18n/server";
import { nextBench, prevBench } from "@/lib/robotics/catalog";
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
    <Suspense fallback={<div className="min-h-[calc(100dvh-var(--header-h))]" aria-busy="true" />}>
      <Bench params={params} />
    </Suspense>
  );
}

async function Bench({ params }: Pick<Props, "params">) {
  const { lang, bench: id } = await params;
  if (!isLocale(lang) || !isRoboticsId(id)) notFound();
  const loaded = await loadBench(lang, id);
  if (!loaded) notFound();
  const [t, all] = await Promise.all([getT(lang, "robotics"), getMessages(lang, "robotics")]);
  const { bench, texts } = loaded;

  const messages: BenchMessages = {
    bench: all.bench,
    steps: all.steps,
    faults: all.faults,
    status: all.status,
    current: all.current,
    serial: all.serial,
    modes: all.modes,
    tasks: all.tasks,
    quiz: all.quiz,
    keys: all.keys,
  };

  // Neighbours are linked only when their content and prose are written.
  const [prevId, nextId] = [prevBench(id), nextBench(id)];
  const [prev, next] = await Promise.all(
    [prevId, nextId].map(async (other) => (other && (await loadBench(lang, other)) ? other : null)),
  );

  const walk =
    prev || next ? (
      <nav aria-label={t("bench.walk")} className="flex flex-wrap justify-between gap-3 border-t-[1.5px] border-rule pt-6">
        {prev ? (
          <Link href={`/${lang}/robotics/${prev}`} className="inline-flex min-h-11 items-center gap-1.5 font-body text-sm font-semibold">
            <Icon name="chevron-left" size={18} />
            {t("bench.prevBench", { name: t(`benches.${prev}.name`) })}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link href={`/${lang}/robotics/${next}`} className="inline-flex min-h-11 items-center gap-1.5 font-body text-sm font-semibold">
            {t("bench.nextBench", { name: t(`benches.${next}.name`) })}
            <Icon name="chevron-right" size={18} />
          </Link>
        ) : null}
      </nav>
    ) : null;

  return (
    <div data-bench-page={id}>
      <LabRoom lab="robotics" itemId={id}>
        <BenchWorkspace
          setup={{ bench, texts, starters: loaded.starters, solutions: loaded.solutions }}
          messages={messages}
          notice={<UntranslatedNotice lang={lang} textLang={loaded.textLang} variant="chip" />}
          walk={walk}
        />
      </LabRoom>
    </div>
  );
}
