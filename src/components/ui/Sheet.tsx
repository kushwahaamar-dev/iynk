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
  /** A bottom sheet's height: as tall as its content (up to 85 %), or always 85 % so tabs switch in place. */
  height?: "auto" | "full";
  children?: ReactNode;
  className?: string;
};

const placement = {
  bottom: "inset-x-0 bottom-0 max-h-[85dvh] rounded-t-2xl animate-slide-in-bottom",
  start: "inset-y-0 start-0 w-[min(24rem,88vw)] rounded-e-2xl animate-slide-in-start",
  end: "inset-y-0 end-0 w-[min(24rem,88vw)] rounded-s-2xl animate-slide-in-end",
};

/** A drawer for phones: a modal panel along one edge of the screen. */
export function Sheet({ open, onClose, title, closeLabel, side = "bottom", height = "auto", children, className }: SheetProps) {
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
      className="fixed inset-0 z-overlay bg-(--scrim) animate-fade-in"
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
        className={cx(
          "fixed flex flex-col overflow-hidden bg-raised text-ink shadow-lg outline-none",
          placement[side],
          side === "bottom" && height === "full" && "h-[85dvh]",
          className,
        )}
      >
        {side === "bottom" ? <span aria-hidden="true" className="mx-auto mt-2 h-1 w-9 shrink-0 rounded-full bg-rule" /> : null}
        <div className="flex items-center gap-3 py-2 ps-4 pe-2">
          <h2 id={`${id}-t`} className="min-w-0 flex-1 text-lg font-semibold">
            {title}
          </h2>
          <IconButton icon="close" variant="plain" size="sm" label={closeLabel} onClick={onClose} />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4" style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}
