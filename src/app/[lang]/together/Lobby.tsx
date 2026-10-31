"use client";

import { useTogetherT } from "@/components/realtime/messages";

/** The lobby's lede. */
export function LobbyLede({ className }: { className?: string }) {
  const t = useTogetherT()!;
  return <p className={className}>{t("lobby.ledePlain")}</p>;
}
