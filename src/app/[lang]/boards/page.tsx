import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BoardProgress } from "@/components/boardlab/BoardProgress";
import { CatalogueCard, CatalogueGrid, CatalogueHead, CataloguePage, SpecLine, TagLine } from "@/components/catalogue/Catalogue";
import { PageSkeleton } from "@/components/ui";
import { htmlLang, isLocale } from "@/i18n/config";
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
    <Suspense fallback={<PageSkeleton kind="list" />}>
      <Boards params={params} />
    </Suspense>
  );
}

const MB = 1024 * 1024;

async function Boards({ params }: Pick<Props, "params">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const [t, common, boards] = await Promise.all([getT(lang, "boardlab"), getMessages(lang, "common"), availableBoards(lang)]);
  const fmt = new Intl.NumberFormat(htmlLang(lang), { maximumFractionDigits: 1 });
  const labels = {
    lessons: t("index.lessons"),
    count: common.progress.count,
    value: common.progress.label,
    assembly: t("index.assemblyTodo"),
    assemblyDone: t("index.assemblyDone"),
  };

  return (
    <CataloguePage>
      <CatalogueHead
        ordinal="01"
        kicker={t("index.kicker")}
        title={t("index.title")}
        lede={t("index.lede")}
        count={boards.length}
        countText={t("index.count", { count: boards.length })}
        numberLocale={htmlLang(lang)}
      />
      <div className="mt-12 md:mt-24">
        <CatalogueGrid testId="board-grid">
          {boards.map(({ id, board, meta, tc }, i) => {
            const mcu = board.mcu;
            const clock = (mcu.fpga ? mcu.fpga.clockHz : mcu.clockHz) / 1e6;
            const flash = mcu.flashBytes ? (mcu.flashBytes >= MB ? t("board.mib", { n: fmt.format(mcu.flashBytes / MB) }) : t("board.kib", { n: fmt.format(mcu.flashBytes / 1024) })) : null;
            // The chip (without its module in brackets), clock, logic level, flash.
            const specs = [
              mcu.part.replace(/\s*\(.*\)$/, ""),
              clock >= 1000 ? t("index.ghz", { ghz: fmt.format(clock / 1000) }) : t("index.clock", { mhz: fmt.format(clock) }),
              t("index.logic", { volts: fmt.format(board.logicVolts) }),
              flash,
            ].filter((spec): spec is string => Boolean(spec));
            const languages = meta.languages.map((l) => t(`lang.${l}`));
            const tags = meta.tags
              .map((tag) => t(`tags.${tag}` as Parameters<typeof t>[0]))
              .filter((tag) => !languages.includes(tag))
              .slice(0, 2);
            const name = tc(board.title);
            return (
              <CatalogueCard
                key={id}
                data={{ "data-board": id }}
                item={`boards/${id}`}
                fig={t("index.fig", { n: String(i + 1).padStart(2, "0") })}
                meta={board.maker.replace(/\s*\(.*\)$/, "")}
                heading="h2"
                name={name}
                href={`/${lang}/boards/${id}`}
                openLabel={t("index.open", { board: name })}
                sub={tc(board.tagline)}
                specs={<SpecLine items={specs} />}
                tags={<TagLine label={t("index.languages")} strong={languages} items={tags} />}
                progress={<BoardProgress board={id} total={board.lessons.length} hasAssembly={board.assembly.length > 0} labels={labels} size="sm" />}
              />
            );
          })}
        </CatalogueGrid>
      </div>
    </CataloguePage>
  );
}
