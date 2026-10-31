"use client";

import { useRoomHandle, type StudioRoomsT } from "./RoomDock";

/** Where the people, baton and chat panels go; each later task fills in its part here. */
export function SidePanel({ t }: { t: StudioRoomsT }) {
  const handle = useRoomHandle();
  if (!handle) return null;
  return <aside aria-label={t("members.title")} data-testid="room-side-panel" />;
}
