import type { ComponentProps } from "react";
import { cx } from "./cx";

/** A key cap, e.g. <Kbd>Space</Kbd>. */
export function Kbd({ className, ...rest }: ComponentProps<"kbd">) {
  return <kbd className={cx("inline-flex min-w-6 items-center justify-center rounded-md border border-rule bg-sunken px-1 py-0.5 font-ui text-xs font-semibold text-ink", className)} {...rest} />;
}
