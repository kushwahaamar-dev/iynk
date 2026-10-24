import "server-only";

// Loads one bench for one language on the server: its content module and every text it shows.
// A bench whose module or prose is not complete in that language is not shown (no other-language
// fallback, no raw keys), so the build stays green while items are still being written.

import type { RoboticsId } from "@/content/ids";
import { loadRobotics } from "@/content/index.generated";
import type { RoboticsContent } from "@/content/schema";
import type { Locale } from "@/i18n/config";
import { getContentText } from "@/i18n/server";
import { renderCode, resolveBenchTexts, type BenchTexts } from "./text";

export type LoadedBench = {
  bench: RoboticsContent;
  texts: BenchTexts;
  starters: Record<string, string>;
  solutions: Record<string, string>;
};

export async function loadBench(lang: Locale, id: RoboticsId): Promise<LoadedBench | null> {
  const bench = await loadRobotics(id);
  if (!bench) return null;
  let tree: unknown;
  try {
    tree = await getContentText(lang, "robotics", id);
  } catch {
    return null;
  }
  const { texts, missing } = resolveBenchTexts(bench, tree);
  if (missing.length > 0) {
    console.warn(`robotics: ${lang}/robotics/${id}.json lacks ${missing.length} keys (first: ${missing[0]}); the bench is hidden in ${lang}.`);
    return null;
  }
  const starters = Object.fromEntries(bench.tasks.map((task) => [task.id, renderCode(task.starter.source, texts)]));
  const solutions = Object.fromEntries(bench.tasks.map((task) => [task.id, renderCode(task.solution, texts)]));
  return { bench, texts, starters, solutions };
}
