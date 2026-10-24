import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { LabRoom } from "@/components/dock/LabRoom";
import { UntranslatedNotice } from "@/components/shell";
import { BenchProgress } from "@/components/robotics/BenchProgress";
import { BenchWorkspace } from "@/components/robotics/BenchWorkspace";
import type { BenchMessages } from "@/components/robotics/messages";
import { ROBOTICS, ROBOTICS_IDS, isRoboticsId } from "@/content/ids";
import { isLocale } from "@/i18n/config";
import { alternatesFor } from "@/i18n/seo";
import { getMessages, getT } from "@/i18n/server";
import { benchKeys, boardProduct, nextBench, prevBench } from "@/lib/robotics/catalog";
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
    <Suspense fallback={<div className="mx-auto min-h-[80vh] max-w-7xl px-4 sm:px-6" aria-busy="true" />}>
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

  const keys = benchKeys(bench);
  const meta = ROBOTICS[id];
  // Neighbours are linked only when their content and prose are written.
  const [prevId, nextId] = [prevBench(id), nextBench(id)];
  const [prev, next] = await Promise.all(
    [prevId, nextId].map(async (other) => (other && (await loadBench(lang, other)) ? other : null)),
  );

  return (
    <>
      <UntranslatedNotice lang={lang} textLang={loaded.textLang} />
      <div className="mx-auto max-w-7xl px-4 pb-16 pt-6 sm:px-6 sm:pt-10" data-bench-page={id}>
        <nav aria-label={t("bench.back")} className="text-sm">
          <Link href={`/${lang}/robotics`} className="inline-flex min-h-11 items-center font-ui font-bold">
            ← {t("bench.back")}
          </Link>
        </nav>

        <header className="mt-2 grid gap-4 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <p className="ink-kicker tabular">{t("bench.kicker", { n: String(meta.fig).padStart(2, "0") })}</p>
            <h1 className="mt-2">{texts[bench.title]}</h1>
            <p className="mt-2 text-lg">{texts[bench.sub]}</p>
            <p className="mt-1 text-muted">{texts[bench.hint]}</p>
          </div>
          <div className="flex flex-col justify-end gap-3 lg:col-span-4">
            <BenchProgress
              keys={[...keys.steps, ...keys.tasks, ...keys.quizzes]}
              label={t("bench.progressName")}
              countTemplate={t("bench.progress", { done: "{done}", total: "{total}" })}
              valueTemplate={t("bench.progressLabel", { done: "{done}", total: "{total}" })}
              size="md"
            />
            {bench.board ? (
              <Link href={`/${lang}/boards/${bench.board}`} className="inline-flex min-h-11 items-center font-ui text-sm font-bold">
                {t("bench.boardLink", { board: boardProduct(id) ?? bench.board })}
              </Link>
            ) : null}
          </div>
        </header>

        <section aria-labelledby={`bench-${id}-overview`} className="mt-6 max-w-3xl">
          <h2 id={`bench-${id}-overview`} className="sr-only">
            {t("bench.overview")}
          </h2>
          <p className="leading-relaxed">{texts[bench.overview]}</p>
        </section>

        <div className="mt-8">
          <LabRoom lab="robotics" itemId={id}>
            <BenchWorkspace setup={{ bench, texts, starters: loaded.starters, solutions: loaded.solutions }} messages={messages} />
          </LabRoom>
        </div>

        {bench.sources.length > 0 ? (
          <section aria-labelledby={`bench-${id}-sources`} className="mt-12">
            <h2 id={`bench-${id}-sources`} className="text-xl">
              {t("bench.sources")}
            </h2>
            <ul className="mt-3 flex flex-col gap-1 text-sm">
              {bench.sources.map((source) => (
                <li key={source.url}>
                  <a href={source.url} rel="noopener noreferrer" className="inline-flex min-h-11 items-center">
                    {source.title}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <nav aria-label={t("bench.walk")} className="mt-12 flex flex-wrap justify-between gap-3 border-t-2 border-rule pt-6">
          {prev ? (
            <Link href={`/${lang}/robotics/${prev}`} className="inline-flex min-h-11 items-center font-ui text-sm font-bold">
              ← {t("bench.prevBench", { name: t(`benches.${prev}.name`) })}
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link href={`/${lang}/robotics/${next}`} className="inline-flex min-h-11 items-center font-ui text-sm font-bold">
              {t("bench.nextBench", { name: t(`benches.${next}.name`) })} →
            </Link>
          ) : null}
        </nav>
      </div>
    </>
  );
}
