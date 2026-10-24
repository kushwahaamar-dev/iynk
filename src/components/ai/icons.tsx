// The partner's extra line icons, drawn on the same 24 grid with the same
// round ink strokes as src/components/ui/icons.tsx.

const PATHS = {
  spark: "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM18.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z",
  mic: "M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3M8.5 21h7",
  send: "M4 12L20 4l-5 16-3.5-6.5zM11.5 13.5L20 4",
  stop: "M7 7h10v10H7z",
  share: "M12 3v12M7.5 7.5L12 3l4.5 4.5M5 13v7h14v-7",
  download: "M12 3v12M7.5 10.5L12 15l4.5-4.5M5 20h14",
  link: "M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1",
  book: "M4 5.5C6.5 4 9.5 4 12 5.5 14.5 4 17.5 4 20 5.5V19c-2.5-1.5-5.5-1.5-8 0-2.5-1.5-5.5-1.5-8 0zM12 5.5V19",
  chat: "M4 5h16v11H9l-5 4z",
  refresh: "M19.5 9A8 8 0 0 0 5 7.5M4.5 15A8 8 0 0 0 19 16.5M5 3.5v4h4M19 20.5v-4h-4",
  people: "M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20c.5-3.5 3.2-6 6.5-6s6 2.5 6.5 6M16 4.2a3.5 3.5 0 0 1 0 6.6M18 14.3c2 .9 3.2 3 3.5 5.7",
} as const;

export type PartnerIconName = keyof typeof PATHS;

export function PartnerIcon({ name, size = 20 }: { name: PartnerIconName; size?: number }) {
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
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
