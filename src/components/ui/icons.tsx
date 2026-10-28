import type { SVGProps } from "react";
import { ICON_PATHS } from "./icon-paths.generated";

export type IconName = keyof typeof ICON_PATHS;

export type IconSize = 16 | 20 | 32;

export function Icon({ name, size = 20, ...rest }: { name: IconName; size?: IconSize } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 256 256"
      fill="currentColor"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {ICON_PATHS[name].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
