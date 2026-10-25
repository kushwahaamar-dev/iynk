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
      className="fixed inset-0 z-50 flex items-end justify-center bg-[rgb(20_17_12/0.55)] p-3 animate-ink-fade sm:items-center sm:p-6"
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
        className={cx("ink-card flex max-h-[90dvh] w-full flex-col border-line shadow-ink-lg outline-none animate-ink-rise", widths[size])}
      >
        <div className="flex items-start gap-3 border-b-[1.5px] border-rule p-4 sm:px-5">
          <div className="min-w-0 flex-1 pt-1.5">
            <h2 id={`${id}-t`} className="text-xl">
              {title}
            </h2>
            {description ? (
              <p id={`${id}-d`} className="mt-1 text-sm text-muted">
                {description}
              </p>
            ) : null}
          </div>
          <IconButton icon="close" label={closeLabel} onClick={onClose} />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">{children}</div>
        {footer ? <div className="flex flex-wrap justify-end gap-2 border-t-[1.5px] border-rule p-4 sm:px-5">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  );
}
