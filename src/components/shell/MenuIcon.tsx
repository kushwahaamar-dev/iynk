import { cx } from "@/components/ui/cx";

const bar = "absolute inset-x-0 top-1/2 -mt-px h-0.5 rounded-full bg-current motion-move";

/** Three bars that turn into a cross. Only transforms and opacity move. */
export function MenuIcon({ open }: { open: boolean }) {
  return (
    <span aria-hidden="true" className="relative block h-5 w-5">
      <span className={cx(bar, open ? "transform-[translateY(0)_rotate(45deg)]" : "transform-[translateY(-6px)]")} />
      <span className={cx(bar, open ? "scale-0 opacity-0" : "scale-100 opacity-100")} />
      <span className={cx(bar, open ? "transform-[translateY(0)_rotate(-45deg)]" : "transform-[translateY(6px)]")} />
    </span>
  );
}
