import type { SVGProps } from "react";

export type IconName =
  | "close"
  | "menu"
  | "sun"
  | "moon"
  | "system"
  | "check"
  | "copy"
  | "chevron-right"
  | "chevron-down"
  | "info"
  | "tip"
  | "warn"
  | "danger"
  | "globe"
  | "board"
  | "robot"
  | "drone"
  | "play"
  | "external"
  | "chevron-left"
  | "keyboard"
  | "settings"
  | "tools"
  | "sound-on"
  | "sound-off"
  | "rotate-left"
  | "rotate-right"
  | "target"
  | "reset"
  | "expand"
  | "lock"
  | "undo"
  | "panel-right";

// Line icons on a 24 grid, drawn with round ink strokes to match the figures.
const PATHS: Record<IconName, string> = {
  close: "M6 6l12 12M18 6L6 18",
  menu: "M4 7h16M4 12h16M4 17h16",
  sun: "M12 8.5a3.5 3.5 0 1 0 0 7a3.5 3.5 0 1 0 0-7zM12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6",
  moon: "M19.5 14.6A7.8 7.8 0 0 1 9.4 4.5a7.8 7.8 0 1 0 10.1 10.1z",
  system: "M3.5 5h17v11h-17zM9 20h6M12 16v4",
  check: "M5 12.5l4.2 4.2L19 7",
  copy: "M8.5 8.5h11v11h-11zM15.5 8.5v-4h-11v11h4",
  "chevron-right": "M9.5 5.5L16 12l-6.5 6.5",
  "chevron-down": "M5.5 9.5L12 16l6.5-6.5",
  info: "M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18zM12 10.5v6M12 7.2v.3",
  tip: "M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.4 1.1 2.2h5c0-.8.4-1.6 1.1-2.2A6 6 0 0 0 12 3z",
  warn: "M12 3.5L21.5 20h-19zM12 9.5v5M12 17.3v.3",
  danger: "M8.3 3h7.4L21 8.3v7.4L15.7 21H8.3L3 15.7V8.3zM12 7.5v6M12 16.5v.3",
  globe: "M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18zM3 12h18M12 3c2.6 2.6 3.8 5.6 3.8 9s-1.2 6.4-3.8 9M12 3C9.4 5.6 8.2 8.6 8.2 12s1.2 6.4 3.8 9",
  board: "M4 6h16v12H4zM9 9.5h6v5H9zM6.5 6V4M10 6V4M14 6V4M17.5 6V4M6.5 20v-2M10 20v-2M14 20v-2M17.5 20v-2",
  robot: "M6 8h12v10H6zM12 8V4.5M10 4.5h4M9.5 12.5v.2M14.5 12.5v.2M9.5 15.5h5M3.5 11v4M20.5 11v4",
  drone: "M9 10h6v4H9zM9 10L6 7M15 10l3-3M9 14l-3 3M15 14l3 3M3 7h6M15 7h6M3 17h6M15 17h6",
  play: "M8 5.5v13l10.5-6.5z",
  external: "M14 4h6v6M20 4l-9 9M18 14v6H4V6h6",
  "chevron-left": "M14.5 5.5L8 12l6.5 6.5",
  keyboard: "M3 6.5h18v11H3zM7 10.5h.01M10.5 10.5h.01M14 10.5h.01M17.5 10.5h.01M8 14.2h8",
  settings:
    "M12 5.5a6.5 6.5 0 1 0 0 13a6.5 6.5 0 1 0 0-13zM12 9.6a2.4 2.4 0 1 0 0 4.8a2.4 2.4 0 1 0 0-4.8zM12 2.8v2.7M12 18.5v2.7M2.8 12h2.7M18.5 12h2.7M5.5 5.5l1.9 1.9M16.6 16.6l1.9 1.9M5.5 18.5l1.9-1.9M16.6 7.4l1.9-1.9",
  tools: "M14.8 3.6a4.8 4.8 0 0 0-4.6 6.3L3.8 16.3a1.9 1.9 0 0 0 2.7 2.7l6.4-6.4a4.8 4.8 0 0 0 6.3-4.6l-2.9 2.1-2.6-.9-.9-2.6z",
  "sound-on": "M4 9.5h3.5L12 5.5v13l-4.5-4H4zM15.5 9a4.5 4.5 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11",
  "sound-off": "M4 9.5h3.5L12 5.5v13l-4.5-4H4zM16 9.5l5 5M21 9.5l-5 5",
  "rotate-left": "M5 9.2A7.6 7.6 0 1 1 6.3 17M5 4.2v5h5",
  "rotate-right": "M19 9.2A7.6 7.6 0 1 0 17.7 17M19 4.2v5h-5",
  target: "M12 4.5a7.5 7.5 0 1 0 0 15a7.5 7.5 0 1 0 0-15zM12 9.5a2.5 2.5 0 1 0 0 5a2.5 2.5 0 1 0 0-5zM12 1.8v2.7M12 19.5v2.7M1.8 12h2.7M19.5 12h2.7",
  reset: "M12 3.5v4M12 16.5v4M3.5 12h4M16.5 12h4M12 10a2 2 0 1 0 0 4a2 2 0 1 0 0-4z",
  expand: "M14 4h6v6M10 20H4v-6M20 4l-6.5 6.5M4 20l6.5-6.5",
  lock: "M6 10.5h12v10H6zM8.5 10.5V7.5a3.5 3.5 0 0 1 7 0v3M12 14.3v2.6",
  undo: "M9 6.5L4.5 11L9 15.5M4.5 11h10a5 5 0 0 1 0 10h-3",
  "panel-right": "M3.5 4.5h17v15h-17zM14.5 4.5v15",
};

export function Icon({ name, size = 20, ...rest }: { name: IconName; size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
