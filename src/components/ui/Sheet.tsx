"use client";

import { useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cx } from "./cx";
import { IconButton } from "./IconButton";
import { useIsClient, useModal } from "./useModal";

type SheetProps = {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  closeLabel: string;
  /** Which edge it slides from. Bottom suits phones; start/end suit menus. */
  side?: "bottom" | "start" | "end";
  children?: ReactNode;
  className?: string;
};

const placement = {
  bottom: "inset-x-0 bottom-0 max-h-[85dvh] rounded-b-none border-b-0 animate-ink-rise",
  start: "inset-y-0 start-0 w-[min(22rem,88vw)] rounded-s-none border-s-0 animate-ink-from-start",
  end: "inset-y-0 end-0 w-[min(22rem,88vw)] rounded-e-none border-e-0 animate-ink-from-end",
};

/** A drawer for phones: a modal panel along one edge of the screen. */
export function Sheet({ open, onClose, title, closeLabel, side = "bottom", children, className }: SheetProps) {
  const id = useId();
  const layerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const isClient = useIsClient();
  const shown = open && isClient;
  const onKeyDown = useModal(shown, layerRef, panelRef, onClose);
  if (!shown) return null;

  return createPortal(
    <div
      ref={layerRef}
      className="fixed inset-0 z-50 bg-[rgb(20_17_12/0.55)] animate-ink-fade"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-t`}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        className={cx("ink-card fixed flex flex-col overflow-hidden outline-none", placement[side], className)}
      >
        <div className="flex items-center gap-3 border-b-2 border-line py-2 ps-4 pe-2">
          <h2 id={`${id}-t`} className="min-w-0 flex-1 font-ui text-sm font-extrabold uppercase tracking-wider">
            {title}
          </h2>
          <IconButton icon="close" label={closeLabel} onClick={onClose} />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
