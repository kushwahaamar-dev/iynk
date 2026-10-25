import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BoardProgress } from "@/components/boardlab/BoardProgress";
import { FigureStill } from "@/components/figure";
import { Chip } from "@/components/ui/Chip";
import { isLocale } from "@/i18n/config";
import { alternatesFor } from "@/i18n/seo";
import { getMessages, getT } from "@/i18n/server";
import { availableBoards } from "./_lib/load";

type Props = PageProps<"/[lang]/boards">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = await getT(lang, "boardlab");
  return { title: t("meta.indexTitle"), description: t("meta.indexDescription"), alternates: alternatesFor(lang, "/boards") };
}

export default function BoardsPage({ params }: Props) {
  return (
    <Suspense fallback={<div className="frame min-h-[70vh]" aria-busy="true" />}>
      <Boards params={params} />
    </Suspense>
  );
}

const MB = 1024 * 1024;

async function Boards({ params }: Pick<Props, "params">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const [t, common, boards] = await Promise.all([getT(lang, "boardlab"), getMessages(lang, "common"), availableBoards(lang)]);
  const fmt = new Intl.NumberFormat(lang === "zh" ? "zh-Hans" : lang, { maximumFractionDigits: 1 });
  const labels = {
    lessons: t("index.lessons"),
    count: common.progress.count,
    value: common.progress.label,
    assembly: t("index.assemblyTodo"),
    assemblyDone: t("index.assemblyDone"),
  };

  return (
    <div className="frame pb-16 pt-8 sm:pt-12">
      <header className="max-w-[68ch]">
        <p className="ink-kicker">{t("index.count", { count: boards.length })}</p>
        <h1 className="mt-3">{t("index.title")}</h1>
        <p className="mt-4 text-lg leading-relaxed">{t("index.lede")}</p>
      </header>

      <ul className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-[repeat(auto-fill,minmax(18rem,1fr))] lg:gap-6" data-testid="board-grid">
        {boards.map(({ id, board, meta, tc }) => {
          const mcu = board.mcu;
          const clock = (mcu.fpga ? mcu.fpga.clockHz : mcu.clockHz) / 1e6;
          const flash = mcu.flashBytes ? (mcu.flashBytes >= MB ? t("board.mib", { n: fmt.format(mcu.flashBytes / MB) }) : t("board.kib", { n: fmt.format(mcu.flashBytes / 1024) })) : null;
          // One line of specs: the chip (without its module in brackets), clock, logic level, flash.
          const specs = [
            mcu.part.replace(/\s*\(.*\)$/, ""),
            clock >= 1000 ? t("index.ghz", { ghz: fmt.format(clock / 1000) }) : t("index.clock", { mhz: fmt.format(clock) }),
            t("index.logic", { volts: fmt.format(board.logicVolts) }),
            flash,
          ].filter(Boolean);
          const tags = meta.tags.filter((tag) => !meta.languages.some((l) => t(`lang.${l}`) === t(`tags.${tag}` as Parameters<typeof t>[0])));
          return (
            <li key={id} className="ink-card group relative row-span-7 grid grid-rows-subgrid gap-y-3 p-5 transition-transform hover:-translate-y-0.5 has-[a:focus-visible]:outline-[2.5px] has-[a:focus-visible]:outline-offset-3 has-[a:focus-visible]:outline-(--focus) motion-reduce:hover:translate-y-0" data-board={id}>
              <FigureStill item={`boards/${id}`} className="-mx-1 -mt-1 mb-1" />
              <p className="ink-label truncate">{board.maker}</p>
              <h2 className="text-2xl leading-tight">
                <Link
                  href={`/${lang}/boards/${id}`}
                  className="no-underline after:absolute after:inset-0 hover:underline focus-visible:shadow-none focus-visible:outline-none"
                  aria-label={t("index.open", { board: tc(board.title) })}
                >
                  {tc(board.title)}
                </Link>
              </h2>
              <p className="text-sm leading-relaxed">{tc(board.tagline)}</p>
              {/* Each spec brings its own dot; the list sits one dot to the left and clips, so no line starts with one. */}
              <div className="overflow-hidden">
                <ul className="tabular -ms-4 flex flex-wrap font-ui text-xs leading-relaxed text-muted">
                  {specs.map((spec, i) => (
                    <li key={i} className="whitespace-nowrap before:inline-block before:w-4 before:text-center before:content-['·']">
                      {spec}
                    </li>
                  ))}
                </ul>
              </div>
              <ul className="flex flex-wrap gap-1.5" aria-label={t("index.languages")}>
                {meta.languages.map((l) => (
                  <li key={l}>
                    <Chip tone="cobalt">{t(`lang.${l}`)}</Chip>
                  </li>
                ))}
                {tags.slice(0, 2).map((tag) => (
                  <li key={tag}>
                    <Chip>{t(`tags.${tag}` as Parameters<typeof t>[0])}</Chip>
                  </li>
                ))}
              </ul>
              <div className="relative z-10 self-end border-t-[1.5px] border-rule pt-3">
                <BoardProgress board={id} total={board.lessons.length} hasAssembly={board.assembly.length > 0} labels={labels} size="sm" />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
