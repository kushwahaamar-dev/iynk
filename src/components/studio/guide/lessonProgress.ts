"use client";

import { useSyncExternalStore } from "react";
import { learnStore } from "@/lib/learn/facade";
import type { LearnerRecord } from "@/project/guided/record";
import type { LessonProgress } from "../TemplateGallery";

type Snapshot = ReadonlyMap<string, LearnerRecord>;

const NONE: Snapshot = new Map();

/** The learner records, which change as lessons are worked on and when the old progress is imported. */
export function useLearnSnapshot(): Snapshot {
  return useSyncExternalStore(
    (listener) => learnStore().subscribe(listener),
    () => learnStore().snapshot(),
    () => NONE,
  );
}

/** Records of one template: the learner's forks, and the imported record that is keyed by the template itself. */
function recordsOf(snapshot: Snapshot, templateId: string): LearnerRecord[] {
  return [...snapshot.values()].filter((record) => (record.templateId ?? record.projectId) === templateId);
}

export function progressOf(snapshot: Snapshot, templateId: string): LessonProgress {
  const done = recordsOf(snapshot, templateId).filter((record) => record.completion);
  if (done.length === 0) return "none";
  return done.some((record) => !record.completion?.legacy) ? "done" : "legacy";
}

export function tierOf(snapshot: Snapshot, templateId: string): string | undefined {
  return recordsOf(snapshot, templateId).find((record) => record.completion && !record.completion.legacy)?.completion?.tier;
}

/** The projects the learner made from this template, newest record first. */
export function forksOf(snapshot: Snapshot, templateId: string): string[] {
  return recordsOf(snapshot, templateId)
    .filter((record) => record.templateId === templateId)
    .sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1))
    .map((record) => record.projectId);
}
