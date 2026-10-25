import type { ComponentProps } from "react";
import { cx } from "./cx";

/** A key cap, e.g. <Kbd>Space</Kbd>. */
export function Kbd({ className, ...rest }: ComponentProps<"kbd">) {
  return (
    <kbd
      className={cx(
        "inline-flex min-w-[1.75em] items-center justify-center rounded-md border-[1.5px] border-line bg-surface px-1.5 py-px font-ui text-[0.85em] font-semibold leading-tight text-ink shadow-[0_2px_0_var(--shadow-c)]",
        className,
      )}
      {...rest}
    />
  );
}
