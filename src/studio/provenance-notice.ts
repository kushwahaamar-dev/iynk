import type { Project } from "../project/generated/types.ts";

export type NoticeAction = "export" | "share-beyond-buddies";

export function uncheckedCount(project: Project): number {
  return (project.provenance.thirdParty ?? []).filter((row) => row.review === "unchecked").length;
}

export function noticeFor(project: Project, _action: NoticeAction): { show: boolean; count: number } {
  const count = uncheckedCount(project);
  return { show: count > 0 && project.provenance.origin.kind !== "blank", count };
}
