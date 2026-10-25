"use client";

import { useEffect, useId, useRef, useState, type ComponentProps } from "react";
import { cx } from "./cx";
import { Icon, type IconName } from "./icons";
import { Kbd } from "./Kbd";

type IconButtonProps = Omit<ComponentProps<"button">, "children" | "aria-label"> & {
  /** Accessible name; also shown as the tooltip. */
  label: string;
  icon: IconName;
  variant?: "plain" | "raised";
  /** "sm" is 36 px with a fine pointer and still 44 px on touch screens. */
  size?: "sm" | "md";
  /** A key that does the same thing, shown in the tooltip. */
  shortcut?: string;
  tooltipSide?: "top" | "bottom";
};

/**
 * A square button with an icon, an accessible name and a tooltip that shows the
 * name on hover and keyboard focus. `title` (if passed) replaces the tooltip text.
 */
export function IconButton({
  label,
  icon,
  variant = "plain",
  size = "md",
  shortcut,
  tooltipSide = "bottom",
  className,
  type = "button",
  title,
  onPointerEnter,
  onPointerLeave,
  onPointerDown,
  onFocus,
  onBlur,
  ...rest
}: IconButtonProps) {
  const tipId = useId();
  const [tip, setTip] = useState(false);
  const delay = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const described = [rest["aria-describedby"], tipId].filter(Boolean).join(" ");

  useEffect(() => () => clearTimeout(delay.current), []);
  useEffect(() => {
    if (!tip) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setTip(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [tip]);

  const hide = () => {
    clearTimeout(delay.current);
    setTip(false);
  };

  return (
    <button
      type={type}
      aria-label={label}
      {...rest}
      aria-describedby={described}
      onPointerEnter={(event) => {
        onPointerEnter?.(event);
        if (event.pointerType === "touch") return;
        clearTimeout(delay.current);
        delay.current = setTimeout(() => setTip(true), 400);
      }}
      onPointerLeave={(event) => {
        onPointerLeave?.(event);
        hide();
      }}
      onPointerDown={(event) => {
        onPointerDown?.(event);
        hide();
      }}
      onFocus={(event) => {
        onFocus?.(event);
        if (event.currentTarget.matches(":focus-visible")) setTip(true);
      }}
      onBlur={(event) => {
        onBlur?.(event);
        hide();
      }}
      className={cx(
        "relative inline-flex shrink-0 items-center justify-center rounded-full border-2 text-ink transition-[transform,box-shadow,background-color] duration-100",
        "disabled:cursor-not-allowed disabled:text-muted disabled:opacity-60 aria-pressed:border-line aria-pressed:bg-ink aria-pressed:text-paper",
        size === "sm" ? "size-9 [@media(pointer:coarse)]:size-11" : "size-11",
        variant === "raised"
          ? "border-line bg-surface shadow-ink-sm hover:-translate-x-px hover:-translate-y-px hover:shadow-ink active:translate-0.5 active:shadow-none"
          : "border-transparent bg-transparent hover:bg-sunken",
        className,
      )}
    >
      <Icon name={icon} size={size === "sm" ? 18 : 20} />
      <span
        id={tipId}
        role="tooltip"
        hidden={!tip}
        className={cx(
          "pointer-events-none absolute start-1/2 z-40 flex w-max max-w-64 -translate-x-1/2 items-center gap-1.5 rounded-lg border-[1.5px] border-line bg-ink px-2.5 py-1 font-body text-xs font-semibold leading-snug text-paper shadow-ink-sm",
          tooltipSide === "top" ? "bottom-full mb-2" : "top-full mt-2",
        )}
      >
        {title ?? label}
        {shortcut ? <Kbd className="text-ink">{shortcut}</Kbd> : null}
      </span>
    </button>
  );
}
