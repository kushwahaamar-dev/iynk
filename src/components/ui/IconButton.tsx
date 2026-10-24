import type { ComponentProps } from "react";
import { cx } from "./cx";
import { Icon, type IconName } from "./icons";

type IconButtonProps = Omit<ComponentProps<"button">, "children" | "aria-label"> & {
  /** Accessible name; also shown as the native tooltip. */
  label: string;
  icon: IconName;
  variant?: "plain" | "raised";
};

/** A 44 px square button with an icon and an accessible name. */
export function IconButton({ label, icon, variant = "plain", className, type = "button", title, ...rest }: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={title ?? label}
      className={cx(
        "inline-flex size-11 shrink-0 items-center justify-center rounded-full border-2 text-ink transition-[transform,box-shadow,background-color] duration-100 disabled:cursor-not-allowed disabled:opacity-50 aria-pressed:bg-ink aria-pressed:text-paper",
        variant === "raised"
          ? "border-line bg-surface shadow-ink-sm hover:-translate-x-px hover:-translate-y-px hover:shadow-ink active:translate-0.5 active:shadow-none"
          : "border-transparent bg-transparent hover:border-line",
        className,
      )}
      {...rest}
    >
      <Icon name={icon} />
    </button>
  );
}
