import type { ComponentProps } from "react";
import { cx } from "./cx";

export type ChipTone =
  | "neutral"
  | "ink"
  | "good"
  | "bad"
  | "warn"
  | "info"
  /** @deprecated Use `neutral`. */
  | "plain"
  /** @deprecated Use `bad`. */
  | "tomato"
  /** @deprecated Use `warn`. */
  | "mustard"
  /** @deprecated Use `good`. */
  | "mint"
  /** @deprecated Use `info`. */
  | "cobalt"
  /** @deprecated Use `neutral`. */
  | "blush";

const tones: Record<ChipTone, string> = {
  neutral: "bg-sunken text-ink",
  ink: "bg-ink text-paper",
  good: "bg-good-bg text-good",
  bad: "bg-bad-bg text-bad",
  warn: "bg-warn-bg text-warn",
  info: "bg-info-bg text-info",
  plain: "bg-sunken text-ink",
  tomato: "bg-bad-bg text-bad",
  mustard: "bg-warn-bg text-warn",
  mint: "bg-good-bg text-good",
  cobalt: "bg-info-bg text-info",
  blush: "bg-sunken text-ink",
};

type ChipProps = ComponentProps<"span"> & {
  tone?: ChipTone;
  dot?: boolean;
  /** Set it when the child is a pin name or a number. */
  mono?: boolean;
};

/** A small tag: a pin name, a state, a protocol. */
export function Chip({ tone = "neutral", dot, mono = false, className, children, ...rest }: ChipProps) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-2 whitespace-nowrap rounded-md px-2 py-1 text-xs font-semibold",
        mono && "font-ui tabular",
        tones[tone],
        className,
      )}
      {...rest}
    >
      {dot ? <span aria-hidden="true" className="size-2 rounded-full bg-current" /> : null}
      {children}
    </span>
  );
}
