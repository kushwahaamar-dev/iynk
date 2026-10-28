"use client";

import { Dialog } from "@/components/ui/Dialog";
import { useCommonT } from "@/i18n/client";
import { KeysPanel } from "./KeysPanel";

/** Dispatched on window by anything that wants the keys dialog open (the Settings button, a "not set up" box). */
export const OPEN_KEYS_EVENT = "iynk:open-keys";

export function KeysDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useCommonT();
  return (
    <Dialog open={open} onClose={onClose} title={t("keys.title")} closeLabel={t("keys.close")} size="md">
      <KeysPanel />
    </Dialog>
  );
}
