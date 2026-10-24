"use client";

import { Dialog } from "@/components/ui/Dialog";
import { Kbd } from "@/components/ui/Kbd";
import { SHORTCUTS } from "./shortcuts";
import { useText } from "./text";

export function ShortcutsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useText();
  return (
    <Dialog open={open} onClose={onClose} title={t("keys.title")} description={t("keys.ignored")} closeLabel={t("keys.close")}>
      <dl className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-2" data-testid="shortcuts">
        {SHORTCUTS.map((s) => (
          <div key={s.id} className="contents">
            <dt className="flex gap-1">
              {s.keys.map((k) => (k === "…" ? <span key={k}>…</span> : <Kbd key={k}>{k}</Kbd>))}
            </dt>
            <dd>{t(`keys.${s.id}`)}</dd>
          </div>
        ))}
      </dl>
    </Dialog>
  );
}
