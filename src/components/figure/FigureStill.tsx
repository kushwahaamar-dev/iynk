import { cx } from "@/components/ui/cx";

type FigureStillProps = {
  /** Which catalogue picture: "boards/uno-r3", "robotics/a4988", "drones/quad5". */
  item: `${"boards" | "robotics" | "drones"}/${string}`;
  className?: string;
};

/**
 * An item's figure as a still picture on its catalogue card, drawn by the figure's own page
 * (`scripts/figure-thumbs.mjs` writes public/thumbs). Decorative: the card's title names the item.
 * The picture turns a little toward you when the card (a `group`) is hovered.
 */
export function FigureStill({ item, className }: FigureStillProps) {
  return (
    // shallower on a phone, where the cards stack in one column and the list would otherwise be mostly pictures
    <div aria-hidden="true" className={cx("pointer-events-none flex aspect-[2/1] items-center justify-center sm:aspect-[8/5]", className)}>
      {/* Already a WebP at twice the widest card: the image optimizer would add a request and nothing else. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/thumbs/${item}.webp`}
        alt=""
        width={720}
        height={450}
        loading="lazy"
        decoding="async"
        className="size-full object-contain transition-transform duration-300 ease-out group-hover:scale-[1.04] motion-reduce:transition-none"
      />
    </div>
  );
}
