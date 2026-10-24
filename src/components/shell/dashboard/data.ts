// What the dashboard needs from the content registry: every progress key each
// lab can record, in teaching order, with where it leads and what to call it.

import { BOARD_IDS, DRONE_IDS, ROBOTICS_IDS } from "@/content/ids";
import { AVAILABLE, loadBoard, loadDrone, loadRobotics } from "@/content/index.generated";
import type { Locale } from "@/i18n/config";
import type { ContentLab } from "@/i18n/namespaces";
import { getContentText } from "@/i18n/server";
import { progressKey, type ProgressLab } from "@/lib/progress/keys";

export type EntryKind = "lesson" | "assembly" | "step" | "task" | "quiz" | "build" | "test" | "course";

export type DashEntry = { key: string; kind: EntryKind; href: string; label?: string };

export type DashItem = { lab: ProgressLab; id: string; title: string; href: string; entries: DashEntry[] };

export type LabSummary = { lab: ProgressLab; path: "boards" | "robotics" | "drones"; itemCount: number; items: DashItem[] };

function textAt(tree: unknown, path: string): string | undefined {
  let node: unknown = tree;
  for (const part of path.split(".")) {
    if (typeof node !== "object" || node === null) return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === "string" ? node : undefined;
}

// An item whose prose is not in this language yet is left out rather than
// shown in another language.
async function prose(lang: Locale, lab: ContentLab, id: string): Promise<unknown> {
  try {
    return await getContentText(lang, lab, id);
  } catch {
    return null;
  }
}

async function boardItems(lang: Locale): Promise<DashItem[]> {
  const items = await Promise.all(
    AVAILABLE.board.map(async (id): Promise<DashItem | null> => {
      const [content, text] = await Promise.all([loadBoard(id), prose(lang, "boards", id)]);
      const title = content && textAt(text, content.title);
      if (!content || !title) return null;
      const base = `/${lang}/boards/${id}`;
      const lessons = [...content.lessons].sort((a, b) => a.n - b.n);
      return {
        lab: "board",
        id,
        title,
        href: base,
        entries: [
          ...lessons.map((lesson) => ({
            key: progressKey.boardLesson(id, lesson.id),
            kind: "lesson" as const,
            href: `${base}/${lesson.id}`,
            label: textAt(text, lesson.title),
          })),
          ...(content.assembly.length > 0 ? [{ key: progressKey.boardAssembly(id), kind: "assembly" as const, href: base }] : []),
        ],
      };
    }),
  );
  return items.filter((item): item is DashItem => item !== null);
}

async function roboticsItems(lang: Locale): Promise<DashItem[]> {
  const items = await Promise.all(
    AVAILABLE.robotics.map(async (id): Promise<DashItem | null> => {
      const [content, text] = await Promise.all([loadRobotics(id), prose(lang, "robotics", id)]);
      const title = content && textAt(text, content.title);
      if (!content || !title) return null;
      const href = `/${lang}/robotics/${id}`;
      return {
        lab: "robotics",
        id,
        title,
        href,
        entries: [
          ...content.steps.map((step) => ({ key: progressKey.roboticsStep(id, step.id), kind: "step" as const, href })),
          ...content.tasks.map((task) => ({ key: progressKey.roboticsTask(id, task.id), kind: "task" as const, href })),
          ...content.quizzes.map((quiz) => ({ key: progressKey.roboticsQuiz(id, quiz.id), kind: "quiz" as const, href })),
        ],
      };
    }),
  );
  return items.filter((item): item is DashItem => item !== null);
}

async function droneItems(lang: Locale): Promise<DashItem[]> {
  const items = await Promise.all(
    AVAILABLE.drone.map(async (id): Promise<DashItem | null> => {
      const [content, text] = await Promise.all([loadDrone(id), prose(lang, "drones", id)]);
      const title = content && textAt(text, content.title);
      if (!content || !title) return null;
      const href = `/${lang}/drones/${id}`;
      return {
        lab: "drone",
        id,
        title,
        href,
        entries: [
          ...(content.build.length > 0 ? [{ key: progressKey.droneBuild(id), kind: "build" as const, href }] : []),
          ...content.tests.map((test) => ({ key: progressKey.droneTest(id, test.id), kind: "test" as const, href })),
          ...content.quizzes.map((quiz) => ({ key: progressKey.droneQuiz(id, quiz.id), kind: "quiz" as const, href })),
          ...content.courses.map((course) => ({ key: progressKey.droneCourse(id, course.id), kind: "course" as const, href: `${href}/fly` })),
        ],
      };
    }),
  );
  return items.filter((item): item is DashItem => item !== null);
}

export async function loadLabs(lang: Locale): Promise<LabSummary[]> {
  const [boards, robotics, drones] = await Promise.all([boardItems(lang), roboticsItems(lang), droneItems(lang)]);
  return [
    { lab: "board", path: "boards", itemCount: BOARD_IDS.length, items: boards },
    { lab: "robotics", path: "robotics", itemCount: ROBOTICS_IDS.length, items: robotics },
    { lab: "drone", path: "drones", itemCount: DRONE_IDS.length, items: drones },
  ];
}
