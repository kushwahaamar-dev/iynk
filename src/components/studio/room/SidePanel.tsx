"use client";

import { useState } from "react";
import { Tabs } from "@/components/ui";
import { Chat, useChatSnapshot } from "./Chat";
import { Members } from "./Members";
import { useRoomHandle, type StudioRoomsT } from "./RoomDock";

type PanelId = "members" | "chat";

/** The people and chat panels; the baton and host controls join them in the toolbar. */
export function SidePanel({ t }: { t: StudioRoomsT }) {
  const handle = useRoomHandle();
  const { lines } = useChatSnapshot();
  const [tab, setTab] = useState<PanelId>("members");
  const [seen, setSeen] = useState<string | null>(null);
  if (!handle) return null;

  const last = lines.at(-1)?.id ?? null;
  const lastSeen = tab === "chat" ? last : seen;
  const from = lastSeen === null ? 0 : lines.findIndex((line) => line.id === lastSeen) + 1;
  const unread = lines.slice(from).filter((line) => !line.mine).length;

  return (
    <aside aria-label={t("members.title")} data-testid="room-side-panel">
      <Tabs
        label={t("members.title")}
        value={tab}
        onChange={(id) => {
          setTab(id as PanelId);
          if (tab === "chat") setSeen(last);
        }}
        tabs={[
          { id: "members", label: t("members.title"), content: <Members t={t} /> },
          { id: "chat", label: t("chat.title"), badge: unread > 0 && tab !== "chat" ? t("chat.new", { count: unread }) : undefined, content: <Chat t={t} /> },
        ]}
      />
    </aside>
  );
}
