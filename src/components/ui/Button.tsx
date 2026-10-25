import Link from "next/link";
import type { ComponentProps } from "react";
import { cx } from "./cx";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "ink";
export type ButtonSize = "sm" | "md" | "lg";

// max-w-full: a label longer than its row (a long translation on a phone) wraps instead of pushing the page sideways.
// Disabled looks the same in every variant, so a disabled primary stops reading as the next thing to press.
const base =
  "inline-flex max-w-full select-none items-center justify-center gap-2 text-center rounded-full border-2 font-body font-semibold leading-tight no-underline transition-[transform,box-shadow,background-color] duration-100 " +
  "disabled:cursor-not-allowed disabled:border-rule disabled:bg-sunken disabled:text-muted disabled:shadow-none disabled:translate-0 " +
  "aria-disabled:cursor-not-allowed aria-disabled:border-rule aria-disabled:bg-sunken aria-disabled:text-muted aria-disabled:shadow-none aria-disabled:translate-0";

// Raised buttons sit on an offset ink shadow and press down into it.
const raised = "shadow-ink-sm hover:-translate-x-px hover:-translate-y-px hover:shadow-ink active:translate-x-0.5 active:translate-y-0.5 active:shadow-none";

const variants: Record<ButtonVariant, string> = {
  primary: `border-line bg-mustard text-on-color ${raised}`,
  secondary: "border-line bg-surface text-ink hover:bg-sunken aria-pressed:bg-ink aria-pressed:text-paper",
  ghost: "border-transparent bg-transparent text-ink hover:bg-sunken aria-pressed:bg-ink aria-pressed:text-paper",
  danger: `border-line bg-tomato text-on-color ${raised}`,
  ink: `border-line bg-ink text-paper ${raised}`,
};

const sizes: Record<ButtonSize, string> = {
  sm: "min-h-9 px-3 text-sm [@media(pointer:coarse)]:min-h-11",
  md: "min-h-11 px-4 text-sm",
  lg: "min-h-13 px-6 text-base",
};

export function buttonClass(variant: ButtonVariant = "secondary", size: ButtonSize = "md", className?: string) {
  return cx(base, variants[variant], sizes[size], className);
}

type ButtonProps = ComponentProps<"button"> & { variant?: ButtonVariant; size?: ButtonSize };

export function Button({ variant, size, className, type = "button", ...rest }: ButtonProps) {
  return <button type={type} className={buttonClass(variant, size, className)} {...rest} />;
}

type ButtonLinkProps = ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: ButtonSize };

/** A link that looks like a button (navigation, not an action). */
export function ButtonLink({ variant, size, className, ...rest }: ButtonLinkProps) {
  return <Link className={buttonClass(variant, size, className)} {...rest} />;
}
