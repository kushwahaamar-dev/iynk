import Image from "next/image";
import hero from "./hero.svg";

/**
 * The landing page's poster: an Uno-sized board, a motor driver and a quadcopter
 * on the bench, drawn by the Colorfigures engine (hero.gen.mjs writes hero.svg).
 * It shows while the live figure loads (and stays if it never does), so it is
 * decorative: the figure's frame carries the name. Next serves an SVG as it is,
 * without the image optimizer.
 */
export function HeroArt({ className }: { className?: string }) {
  return <Image src={hero} alt="" className={className} loading="eager" fetchPriority="high" />;
}
