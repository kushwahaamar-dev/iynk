"use client";

import { ProgressBadge } from "@/components/ui/ProgressBadge";
import { useSaved } from "@/lib/progress/hooks";
import type { Saved } from "@/lib/progress/storage";

// A quiz counts once it has a recorded attempt, everything else once marked done (as on the dashboard).
function complete(saved: Saved, key: string): boolean {
  return saved.done[key] === true || saved.quiz[key] !== undefined;
}

function fill(template: string, params: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, name: string) => String(params[name] ?? ""));
}

/** "done/total" over a craft's progress keys (build, tests, quizzes, courses). */
export function CraftProgress({
  keys,
  label,
  countTemplate,
  valueTemplate,
  size = "md",
  className,
}: {
  keys: readonly string[];
  label: string;
  /** "{done}/{total}" */
  countTemplate: string;
  /** "{done} of {total} done" */
  valueTemplate: string;
  size?: "sm" | "md";
  className?: string;
}) {
  const saved = useSaved();
  const done = keys.filter((key) => complete(saved, key)).length;
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
