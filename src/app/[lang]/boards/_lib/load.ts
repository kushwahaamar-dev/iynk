import "server-only";

import { BOARDS, isBoardId, type BoardId, type BoardMeta } from "@/content/ids";
import { AVAILABLE, loadBoard } from "@/content/index.generated";
import type { BoardContent, Lesson } from "@/content/schema";
import type { Locale } from "@/i18n/config";
import { getContentProse, getMessages, type ContentProse } from "@/i18n/server";
import { createTranslator } from "@/i18n/translate";
import type { BoardModel, LessonLink, LessonModel } from "@/components/boardlab/model";
import { resolveText } from "@/lib/boardlab/template";
import { getProfile, resolvePin, type BoardId as InterpBoardId } from "@/lib/interp/profiles";

export type ContentText = Record<string, unknown>;

export type BoardPage = {
  id: BoardId;
  board: BoardContent;
  meta: BoardMeta;
  /** The board's prose (src/i18n/content/<textLang>/boards/<id>.json). */
  text: ContentText;
  /** The page's language, or English while that translation is not written (the page says so). */
  textLang: Locale;
  /** t() over that prose; a missing key throws, so no raw key reaches the page. */
  tc: (key: string, params?: Record<string, string | number>) => string;
};

/** A board whose data and English prose both exist, or null (the page then 404s). */
export async function loadBoardPage(lang: Locale, id: string): Promise<BoardPage | null> {
  if (!isBoardId(id) || !AVAILABLE.board.includes(id)) return null;
  const board = await loadBoard(id);
  if (!board) return null;
  let prose: ContentProse<ContentText>;
  try {
    prose = await getContentProse<ContentText>(lang, "boards", id);
  } catch {
    // Not even the English prose is written yet (npm run content:check reports it).
    return null;
  }
  const tc = createTranslator(prose.lang, prose.text, `${prose.lang}/boards/${id}`) as unknown as BoardPage["tc"];
  return { id, board, meta: BOARDS[id], text: prose.text, textLang: prose.lang, tc };
}

/** Every board that has a data module today, in figure order. */
export async function availableBoards(lang: Locale): Promise<BoardPage[]> {
  const pages = await Promise.all(AVAILABLE.board.map((id) => loadBoardPage(lang, id)));
  return pages.filter((p): p is BoardPage => p !== null);
}

export const sortedLessons = (board: BoardContent): Lesson[] => [...board.lessons].sort((a, b) => a.n - b.n);

/** Board × lesson pairs for generateStaticParams. */
export async function lessonParams(): Promise<{ board: string; lesson: string }[]> {
  const boards = await Promise.all(AVAILABLE.board.map((id) => loadBoard(id)));
  return boards.flatMap((b) => (b ? b.lessons.map((l) => ({ board: b.id, lesson: l.id })) : []));
}

/**
 * The prose a lesson page needs: everything but the other lessons' bodies
 * (their titles stay, for the lessons strip).
 */
export function lessonText(text: ContentText, lessonId: string): ContentText {
  const lessons = (text.lessons ?? {}) as Record<string, Record<string, unknown>>;
  const kept: Record<string, unknown> = {};
  for (const [id, body] of Object.entries(lessons)) kept[id] = id === lessonId ? body : { title: body?.title };
  return { ...text, lessons: kept };
}

/** The lesson template with its {{t:}} comments translated; {{p:}} slots stay for the chips. */
export function lessonTemplate(page: BoardPage, lesson: Lesson): string {
  return resolveText(lesson.code.source, (key) => page.tc(key));
}

export const boardLabMessages = (lang: Locale) => getMessages(lang, "boardlab");

/** Interpreter pin numbers for the pinout's nets, so pin changes reach the figure under the right name. */
function netMap(board: BoardContent): Record<number, string> {
  const nets: Record<number, string> = {};
  let profile;
  try {
    profile = getProfile(board.id as InterpBoardId);
  } catch {
    return nets;
  }
  for (const row of board.pinout) {
    if (row.caps.includes("power") || row.caps.includes("gnd") || row.caps.includes("nc")) continue;
    const plain = /^(?:D|GP|GPIO|P|IO)(\d+)$/.exec(row.label) ?? /^(?:D|GP|GPIO|P|IO)(\d+)$/.exec(row.net);
    const n = resolvePin(profile, row.label) ?? resolvePin(profile, row.net) ?? (plain ? Number(plain[1]) : undefined);
    if (n !== undefined && nets[n] === undefined) nets[n] = row.net;
  }
  return nets;
}

export function boardModel(page: BoardPage): BoardModel {
  const { board, meta, tc } = page;
  return {
    id: board.id,
    name: tc(board.title),
    fig: meta.fig,
    logicV: board.logicVolts,
    languages: meta.languages,
    figurePage: board.figure.page,
    variants: board.variants.map((v) => ({ id: v.id, name: v.name, figureVariant: v.figureVariant })),
    nets: netMap(board),
    resetControls: board.controls.filter((c) => c.kind === "reset").map((c) => c.id),
    leds: board.leds.map((l) => ({ id: l.id, label: l.label })),
    controls: board.controls,
    parts: board.figure.parts,
    failures: board.failures,
    wireables: board.wireables,
    assembly: board.assembly,
    power: board.power.inputs.map((i) => ({ id: i.id, connector: i.connector, volts: i.volts.recommended?.[0] ?? i.volts.max })),
  };
}

export function lessonLinks(page: BoardPage): LessonLink[] {
  return sortedLessons(page.board).map((l) => ({ id: l.id, n: l.n, level: l.level, title: page.tc(l.title) }));
}

export function lessonModel(page: BoardPage, lessonId: string): LessonModel | null {
  const lessons = lessonLinks(page);
  const i = lessons.findIndex((l) => l.id === lessonId);
  const lesson = page.board.lessons.find((l) => l.id === lessonId);
  if (i < 0 || !lesson) return null;
  return {
    board: boardModel(page),
    lesson,
    template: lessonTemplate(page, lesson),
    lessons,
    prev: lessons[i - 1] ?? null,
    next: lessons[i + 1] ?? null,
  };
}

/** The board's data without its lessons (the overview page links to them instead). */
export function withoutLessons(board: BoardContent): Omit<BoardContent, "lessons"> {
  return Object.fromEntries(Object.entries(board).filter(([k]) => k !== "lessons")) as Omit<BoardContent, "lessons">;
}
