"use client";

import { Button, Callout, InlineStatus } from "@/components/ui";
import { useKeepCopy } from "./RebaseReport";
import type { StudioRoomsT } from "./RoomDock";

type Props = {
  why: "closed" | "kicked" | "unavailable";
  isCreator: boolean;
  onKeepCopy: () => Promise<string>;
  t: StudioRoomsT;
};

function text(why: Props["why"], isCreator: boolean, t: StudioRoomsT): string {
  if (why === "kicked") return t("banner.kicked");
  if (why === "unavailable") return t("banner.ended");
  return isCreator ? t("fork.closedKept") : t("banner.closed");
}

/** The room is gone: the creator keeps the project; anyone else can fork their last state into the library. */
export function RoomEndedNotice({ why, isCreator, onKeepCopy, t }: Props) {
  const { phase, start } = useKeepCopy(onKeepCopy);
  const offer = !isCreator;

  return (
    <div className="flex flex-col items-start gap-2">
      <Callout
        tone={why === "kicked" ? "danger" : "warn"}
        className="self-stretch"
      >
        {text(why, isCreator, t)}
      </Callout>
      {offer && phase.kind !== "done" ? (
        <Button
          size="sm"
          variant="secondary"
          busy={phase.kind === "copying"}
          onClick={start}
        >
          {t("fork.keepCopy")}
        </Button>
      ) : null}
      {phase.kind === "done" ? (
        <InlineStatus tone="good" live>
          {t("fork.kept")}
        </InlineStatus>
      ) : null}
      {phase.kind === "failed" ? (
        <InlineStatus tone="bad" live>
          {phase.message}
        </InlineStatus>
      ) : null}
    </div>
  );
}
