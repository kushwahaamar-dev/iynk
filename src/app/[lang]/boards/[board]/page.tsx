import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BoardWorkspace } from "@/components/boardlab/BoardWorkspace";
import { OpenInStudio } from "@/components/boardlab/OpenInStudio";
import { LabRoom } from "@/components/dock/LabRoom";
import { UntranslatedNotice } from "@/components/shell";
import { PageSkeleton } from "@/components/ui";
import { BOARD_IDS } from "@/content/ids";
import { AVAILABLE } from "@/content/index.generated";
import { isLocale } from "@/i18n/config";
import { alternatesFor } from "@/i18n/seo";
import { getMessages, getT } from "@/i18n/server";
import { boardLabMessages, boardModel, lessonLinks, loadBoardPage, withoutLessons } from "../_lib/load";

type Props = PageProps<"/[lang]/boards/[board]">;

// Bottom up: this page lists [board]; [lang] comes from the root layout. Until
// a board's data module exists, its id is still listed so the route builds; the
// page then answers 404.
export function generateStaticParams() {
  const ids = AVAILABLE.board.length ? AVAILABLE.board : BOARD_IDS;
  return ids.map((board) => ({ board }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, board } = await params;
  if (!isLocale(lang)) return {};
  const page = await loadBoardPage(lang, board);
  if (!page) return {};
  return { title: page.tc(page.board.title), description: page.tc(page.board.tagline), alternates: alternatesFor(lang, `/boards/${board}`) };
}

export default function BoardPage({ params }: Props) {
  return (
    <Suspense fallback={<PageSkeleton kind="workspace" />}>
      <Board params={params} />
    </Suspense>
  );
}

async function Board({ params }: Pick<Props, "params">) {
  const { lang, board: id } = await params;
  if (!isLocale(lang)) notFound();
  const page = await loadBoardPage(lang, id);
  if (!page) notFound();
  const [messages, common, t] = await Promise.all([boardLabMessages(lang), getMessages(lang, "common"), getT(lang, "boardlab")]);
  // Only the lesson titles of the prose go to the client; the bodies stay for the lesson pages.
  const lessonsText = Object.fromEntries(
    Object.entries((page.text.lessons ?? {}) as Record<string, { title?: string }>).map(([k, v]) => [k, { title: v?.title }]),
  );
  return (
    <>
      <OpenInStudio lang={lang} board={id} label={t("openInStudio")} note={t("lessonView")} />
      <LabRoom lab="board" itemId={id}>
        <BoardWorkspace
          lang={lang}
          messages={messages}
          text={{ ...page.text, lessons: lessonsText }}
          data={{ model: boardModel(page), board: withoutLessons(page.board), lessons: lessonLinks(page), progressText: { count: common.progress.count, value: common.progress.label } }}
          notice={<UntranslatedNotice lang={lang} textLang={page.textLang} variant="chip" />}
        />
      </LabRoom>
    </>
  );
}
