"use client";

import { useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cx } from "./cx";
import { IconButton } from "./IconButton";
import { useIsClient, useModal } from "./useModal";

type DialogProps = {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  closeLabel: string;
  children?: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
};

const widths = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-3xl" };

/** A modal dialog: focus is trapped inside, Escape or the backdrop closes it. */
export function Dialog({ open, onClose, title, description, closeLabel, children, footer, size = "md" }: DialogProps) {
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
      className="fixed inset-0 z-overlay flex items-end justify-center bg-(--scrim) p-3 animate-fade-in sm:items-center sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-t`}
        aria-describedby={description ? `${id}-d` : undefined}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        className={cx("flex max-h-[90dvh] w-full flex-col rounded-2xl bg-raised text-ink shadow-lg outline-none animate-rise-in", widths[size])}
      >
        <div className="flex items-start gap-3 p-4 pb-0 sm:p-6 sm:pb-0">
          <div className="min-w-0 flex-1 pt-2">
            <h2 id={`${id}-t`} className="text-lg font-semibold">
              {title}
            </h2>
            {description ? (
              <p id={`${id}-d`} className="mt-1 text-sm text-muted">
                {description}
              </p>
            ) : null}
          </div>
          <IconButton icon="close" variant="plain" size="sm" label={closeLabel} onClick={onClose} />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">{children}</div>
        {footer ? <div className="flex flex-wrap justify-end gap-2 p-4 pt-0 sm:p-6 sm:pt-0">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  );
}
