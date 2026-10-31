export type NavItem = { label: string; disabled?: boolean };

export type NavKey = "ArrowDown" | "ArrowUp" | "Home" | "End";

function enabledFrom<T extends NavItem>(items: readonly T[], start: number, step: 1 | -1): number {
  for (let i = 0; i < items.length; i++) {
    const index = (((start + step * i) % items.length) + items.length) % items.length;
    if (!items[index].disabled) return index;
  }
  return -1;
}

/** The item a navigation key lands on, wrapping at the ends and skipping disabled ones; -1 when nothing can be focused. `current` is -1 when no item has focus. */
export function nextIndex<T extends NavItem>(items: readonly T[], current: number, key: NavKey): number {
  if (items.length === 0) return -1;
  if (key === "Home") return enabledFrom(items, 0, 1);
  if (key === "End") return enabledFrom(items, items.length - 1, -1);
  if (key === "ArrowDown") return enabledFrom(items, current + 1, 1);
  return enabledFrom(items, current < 0 ? items.length - 1 : current - 1, -1);
}

/**
 * The item a typed string jumps to. One letter typed again and again steps
 * through the items that start with it; a longer string finds the first item
 * that starts with all of it, beginning at the current one.
 */
export function typeahead<T extends NavItem>(items: readonly T[], current: number, typed: string): number {
  const needle = typed.toLowerCase();
  if (!needle || items.length === 0) return -1;
  const cycling = [...needle].every((ch) => ch === needle[0]);
  const prefix = cycling ? needle[0] : needle;
  const first = cycling ? current + 1 : Math.max(current, 0);
  for (let i = 0; i < items.length; i++) {
    const index = (first + i) % items.length;
    const item = items[index];
    if (!item.disabled && item.label.toLowerCase().startsWith(prefix)) return index;
  }
  return -1;
}
