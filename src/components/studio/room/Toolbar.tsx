"use client";

import { useRoomHandle, type StudioRoomsT } from "./RoomDock";

/** Where the room's buttons go (invite, leave, host controls); a later task fills it in. */
export function Toolbar(_: { t: StudioRoomsT }) {
  const handle = useRoomHandle();
  if (!handle) return null;
  return <div data-testid="room-toolbar" />;
}
