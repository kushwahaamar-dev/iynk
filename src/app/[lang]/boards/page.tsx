import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BoardProgress } from "@/components/boardlab/BoardProgress";
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
    <Suspense fallback={<div className="mx-auto min-h-[70vh] max-w-6xl px-4 sm:px-6" aria-busy="true" />}>
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
    assembly: t("index.assembly"),
    assemblyDone: t("index.assemblyDone"),
  };

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
      <header className="max-w-3xl">
        <p className="ink-kicker">{t("index.kicker")}</p>
        <h1 className="mt-3">{t("index.title")}</h1>
        <p className="mt-4 text-lg leading-relaxed">{t("index.lede")}</p>
        <p className="mt-2 text-sm text-muted">{t("index.count", { count: boards.length })}</p>
      </header>

      <ul className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3" data-testid="board-grid">
        {boards.map(({ id, board, meta, tc }) => {
          const mcu = board.mcu;
          const clock = mcu.fpga ? mcu.fpga.clockHz : mcu.clockHz;
          const flash = mcu.flashBytes ? (mcu.flashBytes >= MB ? t("board.mib", { n: fmt.format(mcu.flashBytes / MB) }) : t("board.kib", { n: fmt.format(mcu.flashBytes / 1024) })) : null;
          return (
            <li key={id} className="ink-card relative flex flex-col gap-3 p-4" data-board={id}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="ink-kicker">{t("index.fig", { n: meta.fig })}</span>
                <span className="text-xs text-muted">{board.maker}</span>
              </div>
              <h2 className="text-2xl leading-tight">
                <Link href={`/${lang}/boards/${id}`} className="no-underline after:absolute after:inset-0 hover:underline" aria-label={t("index.open", { board: tc(board.title) })}>
                  {tc(board.title)}
                </Link>
              </h2>
              <p className="text-sm leading-relaxed">{tc(board.tagline)}</p>
              <dl className="grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-md bg-sunken p-2">
                  <dt className="text-xs uppercase tracking-wide text-muted">{t("board.mcu")}</dt>
                  <dd className="font-mono text-[13px]">{mcu.part}</dd>
                </div>
                <div className="rounded-md bg-sunken p-2">
                  <dt className="text-xs uppercase tracking-wide text-muted">{t("board.clock")}</dt>
                  <dd className="tabular">{t("index.clock", { mhz: fmt.format(clock / 1e6) })}</dd>
                </div>
                <div className="rounded-md bg-sunken p-2">
                  <dt className="text-xs uppercase tracking-wide text-muted">{t("board.logic")}</dt>
                  <dd className="tabular">{t("index.logic", { volts: fmt.format(board.logicVolts) })}</dd>
                </div>
                <div className="rounded-md bg-sunken p-2">
                  <dt className="text-xs uppercase tracking-wide text-muted">{flash ? t("board.flash") : t("index.languages")}</dt>
                  <dd>{flash ?? meta.languages.map((l) => t(`lang.${l}`)).join(", ")}</dd>
                </div>
              </dl>
              <ul className="flex flex-wrap gap-1.5" aria-label={t("index.languages")}>
                {meta.languages.map((l) => (
                  <li key={l}>
                    <Chip tone="cobalt">{t(`lang.${l}`)}</Chip>
                  </li>
                ))}
                {meta.tags.slice(0, 3).map((tag) => (
                  <li key={tag}>
                    <Chip>{t(`tags.${tag}` as Parameters<typeof t>[0])}</Chip>
                  </li>
                ))}
              </ul>
              <div className="relative z-10 mt-auto">
                <BoardProgress board={id} total={board.lessons.length} hasAssembly={board.assembly.length > 0} labels={labels} size="sm" />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
