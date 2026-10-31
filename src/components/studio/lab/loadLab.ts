import type { BenchMessages } from "@/components/robotics/messages";
import type { DroneLabMessages } from "@/components/dronelab/text";
import { contentT } from "@/components/dronelab/text";
import type { ChallengeEntry } from "@/components/flight/DailyChallenge";
import { isDroneId, isRoboticsId, DRONE_IDS } from "@/content/ids";
import { loadDrone, loadRobotics } from "@/content/index.generated";
import type { DroneContent } from "@/content/schema";
import { DEFAULT_LOCALE, type Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/namespaces";
import { flightOf } from "@/lib/flight";
import type { BenchSetup } from "@/lib/robotics/session";
import { renderCode, resolveBenchTexts } from "@/lib/robotics/text";

export type LabData =
  | { kind: "bench"; setup: BenchSetup; messages: BenchMessages }
  | { kind: "craft"; content: DroneContent; text: Record<string, unknown>; messages: DroneLabMessages; flightMessages: Messages["flight"] };

type Craft = { content: DroneContent; text: Record<string, unknown> };

/** The item's prose in the page language, or in English while that translation is not written. */
async function proseOf(lang: Locale, lab: "robotics" | "drones", id: string): Promise<Record<string, unknown> | null> {
  for (const tryLang of lang === DEFAULT_LOCALE ? [lang] : [lang, DEFAULT_LOCALE]) {
    try {
      const mod = (await import(`../../../i18n/content/${tryLang}/${lab}/${id}.json`)) as { default: Record<string, unknown> };
      return mod.default;
    } catch {
      continue;
    }
  }
  return null;
}

async function messagesOf<K extends "robotics" | "dronelab" | "flight">(lang: Locale, ns: K): Promise<Messages[K]> {
  const mod = (await import(`../../../i18n/messages/${lang}/${ns}.json`)) as { default: Messages[K] };
  return mod.default;
}

async function loadBench(lang: Locale, id: string): Promise<LabData | null> {
  if (!isRoboticsId(id)) return null;
  const [bench, prose, all] = await Promise.all([loadRobotics(id), proseOf(lang, "robotics", id), messagesOf(lang, "robotics")]);
  if (!bench || !prose) return null;
  const { texts, missing } = resolveBenchTexts(bench, prose);
  if (missing.length > 0) return null;
  const starters = Object.fromEntries(bench.tasks.map((task) => [task.id, renderCode(task.starter.source, texts)]));
  const solutions = Object.fromEntries(bench.tasks.map((task) => [task.id, renderCode(task.solution, texts)]));
  const { bench: benchStrings, steps, faults, status, current, serial, modes, tasks, quiz, keys } = all;
  return {
    kind: "bench",
    setup: { bench, texts, starters, solutions },
    messages: { bench: benchStrings, steps, faults, status, current, serial, modes, tasks, quiz, keys },
  };
}

async function loadCraft(lang: Locale, id: string): Promise<Craft | null> {
  if (!isDroneId(id)) return null;
  const [content, text] = await Promise.all([loadDrone(id), proseOf(lang, "drones", id)]);
  return content && text ? { content, text } : null;
}

export async function loadLab(lab: "robotics" | "drone", lang: Locale, id: string): Promise<LabData | null> {
  if (lab === "robotics") return loadBench(lang, id);
  const [craft, messages, flightMessages] = await Promise.all([loadCraft(lang, id), messagesOf(lang, "dronelab"), messagesOf(lang, "flight")]);
  return craft ? { kind: "craft", ...craft, messages, flightMessages } : null;
}

const pools = new Map<Locale, Promise<ChallengeEntry[]>>();

/** Every craft that flies, with the courses the range has for it: the daily challenge picks from these. */
export function challengePool(lang: Locale): Promise<ChallengeEntry[]> {
  let pool = pools.get(lang);
  if (!pool) {
    pool = Promise.all(DRONE_IDS.map((id) => loadCraft(lang, id))).then((crafts) =>
      crafts.flatMap((craft): ChallengeEntry[] => {
        const range = craft && flightOf(craft.content);
        if (!craft || !range?.courses.length) return [];
        const { content, text } = craft;
        const ct = contentT(lang, content.id, text);
        const courses = range.courses.map((c) => ({ id: c.id, kind: c.kind }));
        const titles = content.courses.filter((c) => courses.some((x) => x.id === c.id)).map((c) => [c.id, ct(c.title)]);
        const batts = Object.entries(content.design.batts);
        return [
          {
            id: content.id,
            title: ct(content.title),
            courses,
            batts: batts.map(([key]) => key),
            courseTitles: Object.fromEntries(titles),
            battLabels: Object.fromEntries(batts.map(([key, b]) => [key, b.label])),
          },
        ];
      }),
    );
    pools.set(lang, pool);
  }
  return pool;
}
