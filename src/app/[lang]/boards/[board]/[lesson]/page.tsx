import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { LessonWorkspace } from "@/components/boardlab/LessonWorkspace";
import { OpenInStudio } from "@/components/boardlab/OpenInStudio";
import { UntranslatedNotice } from "@/components/shell";
import { PageSkeleton } from "@/components/ui";
import { isLocale } from "@/i18n/config";
import { alternatesFor } from "@/i18n/seo";
import { getT } from "@/i18n/server";
import { boardLabMessages, lessonModel, lessonParams, lessonText, loadBoardPage } from "../../_lib/load";

type Props = PageProps<"/[lang]/boards/[board]/[lesson]">;

// Bottom up: [board] and [lesson] here, [lang] from the root layout. Before any
// board data exists the route still lists the Uno's first lesson, which then
// answers 404, because generateStaticParams may not return an empty list.
export async function generateStaticParams() {
  const pairs = await lessonParams();
  return pairs.length ? pairs : [{ board: "uno-r3", lesson: "board" }];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, board, lesson } = await params;
  if (!isLocale(lang)) return {};
  const page = await loadBoardPage(lang, board);
  const l = page?.board.lessons.find((x) => x.id === lesson);
  if (!page || !l) return {};
  const t = await getT(lang, "boardlab");
  return {
    title: t("meta.lessonTitle", { lesson: page.tc(l.title), board: page.tc(page.board.title) }),
    description: page.tc(l.lede),
    alternates: alternatesFor(lang, `/boards/${board}/${lesson}`),
  };
}

export default function LessonPage({ params }: Props) {
  return (
    <Suspense fallback={<PageSkeleton kind="workspace" />}>
      <Lesson params={params} />
    </Suspense>
  );
}

async function Lesson({ params }: Pick<Props, "params">) {
  const { lang, board, lesson } = await params;
  if (!isLocale(lang)) notFound();
  const page = await loadBoardPage(lang, board);
  const model = page && lessonModel(page, lesson);
  if (!page || !model) notFound();
  const [messages, t] = await Promise.all([boardLabMessages(lang), getT(lang, "boardlab")]);
  return (
    <>
      <OpenInStudio lang={lang} board={board} lesson={lesson} label={t("openInStudio")} note={t("lessonView")} />
      <LessonWorkspace
        key={`${board}/${lesson}`}
        lang={lang}
        model={model}
        messages={messages}
        text={lessonText(page.text, lesson)}
        notice={<UntranslatedNotice lang={lang} textLang={page.textLang} variant="chip" />}
      />
    </>
  );
}
