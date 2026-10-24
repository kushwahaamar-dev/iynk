import type { ComponentProps } from "react";

/** Text for screen readers only. */
export function VisuallyHidden({ className, ...rest }: ComponentProps<"span">) {
  return <span className={className ? `sr-only ${className}` : "sr-only"} {...rest} />;
}
