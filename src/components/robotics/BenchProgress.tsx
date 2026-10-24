"use client";

import { ProgressBadge } from "@/components/ui/ProgressBadge";
import { useSaved } from "@/lib/progress/hooks";
import type { Saved } from "@/lib/progress/storage";

/** Fills {name} placeholders in a message template that was translated on the server. */
export function fill(template: string, params: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (whole, name: string) => (params[name] === undefined ? whole : String(params[name])));
}

/** A quiz counts once it has a recorded attempt, every other key once it is marked done. */
export function countBench(saved: Saved, keys: readonly string[]): number {
  return keys.filter((key) => saved.done[key] === true || saved.quiz[key] !== undefined).length;
}

type Props = {
  keys: readonly string[];
  label: string;
  /** "{done}/{total}" */
  countTemplate: string;
  /** "{done} of {total} … done" */
  valueTemplate: string;
  size?: "sm" | "md";
  className?: string;
};

/** "done/total" for a bench: its steps, tasks and quizzes. */
export function BenchProgress({ keys, label, countTemplate, valueTemplate, size = "sm", className }: Props) {
  const saved = useSaved();
  const done = countBench(saved, keys);
  const total = keys.length;
  return (
    <ProgressBadge
      done={done}
      total={total}
      label={label}
      countText={fill(countTemplate, { done, total })}
      valueText={fill(valueTemplate, { done, total })}
      size={size}
      className={className}
    />
  );
}
