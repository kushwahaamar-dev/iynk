"use client";

import { useEffect } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { useCommonT } from "@/i18n/client";
import { installErrorCapture } from "@/lib/telemetry";
import { KeysPanel } from "./KeysPanel";
import { LocalLog } from "./LocalLog";

/** Dispatched on window by anything that wants the keys dialog open (the Settings button, a "not set up" box). */
export const OPEN_KEYS_EVENT = "iynk:open-keys";

export function KeysDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useCommonT();
  // The dialog is rendered on every page, so errors are caught from page load, not from the first time it opens.
  useEffect(() => installErrorCapture(), []);
  return (
    <Dialog open={open} onClose={onClose} title={t("keys.title")} closeLabel={t("keys.close")} size="md">
      <div className="flex flex-col gap-4">
        <KeysPanel />
        <LocalLog />
      </div>
    </Dialog>
  );
}
