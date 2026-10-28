"use client";

import { Dialog } from "@/components/ui/Dialog";
import { useCommonT } from "@/i18n/client";
import { KeysPanel } from "./KeysPanel";
import { LocalLog } from "./LocalLog";

export function KeysDialogContent({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useCommonT();
  return (
    <Dialog open={open} onClose={onClose} title={t("keys.title")} closeLabel={t("keys.close")} size="md">
      <div className="flex flex-col gap-4">
        <KeysPanel />
        <LocalLog />
      </div>
    </Dialog>
  );
}
