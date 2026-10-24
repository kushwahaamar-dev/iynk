"use client";

import { Dialog } from "@/components/ui/Dialog";
import { Kbd } from "@/components/ui/Kbd";
import type { BenchT } from "./messages";

export const SHORTCUTS = [
  { keys: ["?"], what: "help" },
  { keys: ["N"], what: "next" },
  { keys: ["F"], what: "figure" },
  { keys: ["Esc"], what: "escape" },
  { keys: ["Q"], what: "quiz" },
  { keys: ["S"], what: "serial" },
  { keys: ["T"], what: "tasks" },
  { keys: ["Ctrl", "Enter"], what: "run" },
] as const;

export function KeyHelp({ open, onClose, t }: { open: boolean; onClose: () => void; t: BenchT }) {
  return (
    <Dialog open={open} onClose={onClose} title={t("keys.heading")} description={t("keys.intro")} closeLabel={t("keys.close")} size="sm">
      <dl className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-2">
        {SHORTCUTS.map((shortcut) => (
          <div key={shortcut.what} className="contents">
            <dt className="flex gap-1">
              {shortcut.keys.map((key) => (
                <Kbd key={key}>{key}</Kbd>
              ))}
            </dt>
            <dd className="text-sm">{t(`keys.list.${shortcut.what}`)}</dd>
          </div>
        ))}
      </dl>
    </Dialog>
  );
}
