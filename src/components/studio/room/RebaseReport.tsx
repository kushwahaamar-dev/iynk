"use client";

import { useState } from "react";
import type { RebaseReport as Report, DropReason } from "@/collab/rebase";
import { Button, Dialog, InlineStatus } from "@/components/ui";
import type { Project } from "@/project/generated/types";
import type { Member } from "@/protocol";
import type { StudioRoomsT } from "./RoomDock";

type Phase =
  | { kind: "idle" }
  | { kind: "copying" }
  | { kind: "done" }
  | { kind: "failed"; message: string };

/** Runs a copy once at a time and keeps the library's own error text when it fails. */
export function useKeepCopy(run: () => Promise<unknown>): {
  phase: Phase;
  start: () => void;
} {
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const start = () => {
    setPhase({ kind: "copying" });
    run().then(
      () => setPhase({ kind: "done" }),
      (error: unknown) =>
        setPhase({
          kind: "failed",
          message: error instanceof Error ? error.message : String(error),
        }),
    );
  };
  return { phase, start };
}

/** Names the part or the net a refused change was aimed at; null when the document no longer says. */
function nameOf(doc: Project, id: string | null): string | null {
  if (id === null) return null;
  const part = doc.components.find((c) => c.id === id);
  if (part) return part.refdes;
  return doc.nets.find((n) => n.id === id)?.name ?? null;
}

export function describeDrop(
  d: DropReason,
  doc: Project,
  members: readonly Member[],
): { code: string; who: string | null; what: string | null } {
  const who =
    d.byActor === null
      ? null
      : (members.find((m) => m.actor === d.byActor)?.name ?? null);
  return { code: d.code, who, what: nameOf(doc, d.targetId) };
}

type Props = {
  report: Report;
  members: readonly Member[];
  onKeepCopy: () => Promise<void>;
  onClose: () => void;
  t: StudioRoomsT;
};

/** After a rejoin that dropped some of the person's changes: each one in words, and a way to keep their version. */
export function RebaseReport({
  report,
  members,
  onKeepCopy,
  onClose,
  t,
}: Props) {
  const { phase, start } = useKeepCopy(onKeepCopy);
  if (report.dropped.length === 0) return null;

  return (
    <Dialog
      open
      onClose={onClose}
      title={t("rebase.title")}
      closeLabel={t("share.close")}
      footer={
        phase.kind === "done" ? null : (
          <Button busy={phase.kind === "copying"} onClick={start}>
            {t("rebase.keepCopy")}
          </Button>
        )
      }
    >
      <ul className="flex flex-col gap-2 text-base">
        {report.dropped.map(({ sub, reason }) => {
          const { who, what } = describeDrop(
            reason,
            report.localBefore,
            members,
          );
          return (
            <li key={sub}>
              {who && what
                ? t("rebase.dropped", { who, what })
                : t("rebase.droppedGeneric")}
            </li>
          );
        })}
      </ul>
      {phase.kind === "done" ? (
        <InlineStatus tone="good" live className="mt-4">
          {t("rebase.copyKept")}
        </InlineStatus>
      ) : null}
      {phase.kind === "failed" ? (
        <InlineStatus tone="bad" live className="mt-4">
          {phase.message}
        </InlineStatus>
      ) : null}
    </Dialog>
  );
}
