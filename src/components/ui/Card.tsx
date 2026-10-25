import type { ComponentProps, ElementType, ReactNode } from "react";
import { cx } from "./cx";

export type Tone = "surface" | "plate" | "tomato" | "mustard" | "mint" | "cobalt" | "blush" | "sunken" | "flat";

const tones: Record<Tone, string> = {
  surface: "ink-card",
  plate: "ink-plate",
  sunken: "rounded-ink border-2 border-dashed border-rule bg-sunken",
  flat: "",
  tomato: "ink-card bg-tomato text-on-color",
  mustard: "ink-card bg-mustard text-on-color",
  mint: "ink-card bg-mint text-on-color",
  cobalt: "ink-card bg-cobalt text-on-color",
  blush: "ink-card bg-blush text-on-color",
};

type CardProps<T extends ElementType> = {
  as?: T;
  tone?: Tone;
  padding?: "none" | "sm" | "md" | "lg";
  className?: string;
  children?: ReactNode;
} & Omit<ComponentProps<T>, "as" | "className" | "children">;

const pads = { none: "", sm: "p-3", md: "p-4 sm:p-5", lg: "p-5 sm:p-7" };

/**
 * An ink-bordered card. `plate` keeps paper and dark ink in both themes, for
 * figures and inked drawings; palette tones always use dark ink text; `flat`
 * is the same spacing with no box at all.
 */
export function Card<T extends ElementType = "div">({ as, tone = "surface", padding = "md", className, children, ...rest }: CardProps<T>) {
  const Tag: ElementType = as ?? "div";
  return (
    <Tag className={cx(tones[tone], pads[padding], className)} {...rest}>
      {children}
    </Tag>
  );
}
