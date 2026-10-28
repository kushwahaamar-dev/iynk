import Link from "next/link";
import type { ComponentProps } from "react";
import { cx } from "./cx";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "danger"
  | "solid";
export type ButtonSize = "sm" | "md";

// In a ButtonGroup the radius steps down: the group's 8 px minus its 2 px padding leaves 6 px.
// max-w-full: a label longer than its row (a long translation on a phone) wraps instead of pushing the page sideways.
// Disabled looks the same in every variant and takes no hover or press, so a disabled primary stops reading as the next thing to press.
// A busy button is disabled too, but keeps its colours and breathes instead of dimming.
const base =
  "inline-flex max-w-full select-none items-center justify-center gap-2 rounded-lg in-data-[button-group]:rounded-md text-center font-semibold leading-tight no-underline motion-fade " +
  "enabled:not-aria-disabled:active:scale-98 enabled:not-aria-disabled:active:motion-press " +
  "disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:cursor-not-allowed aria-disabled:opacity-50 " +
  "aria-busy:opacity-100 aria-busy:animate-pulse motion-reduce:aria-busy:animate-none";

const live = "enabled:not-aria-disabled:hover:";

const variants: Record<ButtonVariant, string> = {
  primary: `bg-accent text-on-accent ${live}bg-accent-hover`,
  secondary: `bg-sunken text-ink ${live}bg-hover aria-pressed:bg-ink aria-pressed:text-paper`,
  ghost: `bg-transparent text-ink ${live}bg-hover aria-pressed:bg-ink aria-pressed:text-paper`,
  danger: `bg-bad-bg text-bad ${live}bg-bad/20`,
  solid: `bg-ink text-paper ${live}bg-ink/88`,
};

const sizes: Record<ButtonSize, string> = {
  sm: "px-3 py-2 text-sm [@media(pointer:coarse)]:min-h-11",
  md: "px-3 py-2 text-base [@media(pointer:coarse)]:min-h-11",
};

type StyleOptions = { outline?: boolean };

export function buttonClass(variant: ButtonVariant = "secondary", size: ButtonSize = "md", className?: string, { outline }: StyleOptions = {}) {
  const ruled = outline && (variant === "secondary" || variant === "ghost");
  return cx(base, variants[variant], sizes[size], ruled && "border border-rule", className);
}

type ButtonProps = ComponentProps<"button"> &
  StyleOptions & {
    variant?: ButtonVariant;
    size?: ButtonSize;
    /** Keeps the label, disables the button and lets the fill breathe while work is under way. */
    busy?: boolean;
  };

export function Button({ variant, size, outline, busy, className, type = "button", disabled, ...rest }: ButtonProps) {
  return <button type={type} className={buttonClass(variant, size, className, { outline })} disabled={disabled || busy} aria-busy={busy || undefined} {...rest} />;
}

type ButtonLinkProps = ComponentProps<typeof Link> & StyleOptions & { variant?: ButtonVariant; size?: ButtonSize };

/** A link that looks like a button (navigation, not an action). */
export function ButtonLink({ variant, size, outline, className, ...rest }: ButtonLinkProps) {
  return <Link className={buttonClass(variant, size, className, { outline })} {...rest} />;
}

type ButtonGroupProps = Omit<ComponentProps<"div">, "role" | "aria-label"> & {
  /** Accessible name of the group. */
  label: string;
};

/** Buttons side by side on one sunken strip, with the inner radius their outer corner leaves. */
export function ButtonGroup({ label, className, ...rest }: ButtonGroupProps) {
  return <div role="group" aria-label={label} data-button-group="" className={cx("inline-flex max-w-full gap-0.5 rounded-lg bg-sunken p-0.5", className)} {...rest} />;
}
