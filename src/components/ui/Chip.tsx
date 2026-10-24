import type { ComponentProps } from "react";
import { cx } from "./cx";

export type ChipTone = "plain" | "ink" | "tomato" | "mustard" | "mint" | "cobalt" | "blush";

const tones: Record<ChipTone, string> = {
  plain: "bg-surface text-ink",
  ink: "bg-ink text-paper",
  tomato: "bg-tomato text-on-color",
  mustard: "bg-mustard text-on-color",
  mint: "bg-mint text-on-color",
  cobalt: "bg-cobalt text-on-color",
  blush: "bg-blush text-on-color",
};

type ChipProps = ComponentProps<"span"> & { tone?: ChipTone; dot?: boolean };

/** A small ink-outlined tag: a pin name, a state, a protocol. */
export function Chip({ tone = "plain", dot, className, children, ...rest }: ChipProps) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 rounded-lg border-[1.5px] border-line px-2 py-0.5 font-ui text-xs font-bold leading-5 tracking-wide",
        tones[tone],
        className,
      )}
      {...rest}
    >
      {dot ? <span aria-hidden="true" className="size-2 rounded-full border border-current bg-current" /> : null}
      {children}
    </span>
  );
}
