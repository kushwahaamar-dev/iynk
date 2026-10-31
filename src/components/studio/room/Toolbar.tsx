"use client";

import { useTogetherT } from "@/components/realtime/messages";
import { BatonControl } from "./BatonControl";
import { HostControls } from "./HostControls";
import { RoomMenu, useRoomMenuEnv } from "./RoomMenu";
import { useRoomHandle, type StudioRoomsT } from "./RoomDock";

function Menu({ t }: { t: StudioRoomsT }) {
  const tt = useTogetherT();
  return tt ? <RoomMenu t={t} tt={tt} /> : null;
}

/** The room's buttons: the room menu, who holds the keyboard and, for the host, the controls. */
export function Toolbar({ t }: { t: StudioRoomsT }) {
  const handle = useRoomHandle();
  const env = useRoomMenuEnv();
  if (!handle && !env) return null;
  return (
    <div className="mb-4 flex flex-wrap items-end gap-2" data-testid="room-toolbar">
      {env ? <Menu t={t} /> : null}
      <BatonControl t={t} />
      <HostControls t={t} />
    </div>
  );
}
