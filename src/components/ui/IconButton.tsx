"use client";

import { useId, type ComponentProps } from "react";
import { cx } from "./cx";
import { Icon, type IconName } from "./icons";
import { TipBubble, useTip } from "./Tooltip";

type IconButtonProps = Omit<ComponentProps<"button">, "children" | "aria-label"> & {
  /** Accessible name; also shown as the tooltip. */
  label: string;
  icon: IconName;
  variant?: "plain" | "solid";
  /** "sm" is 32 px with a fine pointer and still 44 px on touch screens. */
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
  const tip = useTip();
  const described = [rest["aria-describedby"], tipId].filter(Boolean).join(" ");

  return (
    <button
      type={type}
      aria-label={label}
      {...rest}
      aria-describedby={described}
      onPointerEnter={(event) => {
        onPointerEnter?.(event);
        tip.onPointerEnter(event);
      }}
      onPointerLeave={(event) => {
        onPointerLeave?.(event);
        tip.onPointerLeave();
      }}
      onPointerDown={(event) => {
        onPointerDown?.(event);
        tip.hide();
      }}
      onFocus={(event) => {
        onFocus?.(event);
        tip.onFocus(event);
      }}
      onBlur={(event) => {
        onBlur?.(event);
        tip.onBlur();
      }}
      className={cx(
        "relative inline-flex shrink-0 items-center justify-center rounded-lg motion-fade",
        "enabled:active:scale-98 enabled:active:motion-press disabled:cursor-not-allowed disabled:opacity-50",
        size === "sm" ? "size-8 [@media(pointer:coarse)]:size-11" : "size-10 [@media(pointer:coarse)]:size-11",
        variant === "solid"
          ? "bg-ink text-paper enabled:hover:bg-ink/88"
          : "bg-transparent text-ink enabled:hover:bg-hover aria-pressed:bg-ink aria-pressed:text-paper",
        className,
      )}
    >
      <Icon name={icon} size={size === "sm" ? 16 : 20} />
      <TipBubble id={tipId} open={tip.open} side={tooltipSide} shortcut={shortcut}>
        {title ?? label}
      </TipBubble>
    </button>
  );
}
