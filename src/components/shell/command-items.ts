import type { IconName } from "@/components/ui/icons";

export type CommandItem = {
  id: string;
  label: string;
  icon?: IconName;
  onSelect: () => void;
};

/** Lower case with accents folded, so "robotica" finds "Robótica" and "Espanol" finds "Español". */
export function normalise(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

function rank(label: string, query: string): number {
  const at = normalise(label).indexOf(query);
  if (at < 0) return -1;
  if (at === 0) return 0;
  return /[\s\p{P}]/u.test(normalise(label)[at - 1]) ? 1 : 2;
}

/**
 * The items that match `query`: a label that starts with it first, then one with a word that starts with it,
 * then any that contains it. Items of equal rank keep their order, and an empty query keeps all of them.
 */
export function rankCommands<T extends { label: string }>(items: readonly T[], query: string): T[] {
  const needle = normalise(query.trim());
  if (!needle) return [...items];
  return items
    .map((item) => ({ item, score: rank(item.label, needle) }))
    .filter((entry) => entry.score >= 0)
    .sort((a, b) => a.score - b.score)
    .map((entry) => entry.item);
}
