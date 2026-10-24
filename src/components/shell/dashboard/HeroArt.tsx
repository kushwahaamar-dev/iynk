import Image from "next/image";
import hero from "./hero.svg";

/**
 * The dashboard hero: an Uno-sized board, a motor driver and a quadcopter on
 * the bench, drawn by the Colorfigures engine (hero.gen.mjs writes hero.svg).
 * It loads as a cached image, so the drawing is not repeated in every page's HTML.
 * Next serves an SVG as it is, without the image optimizer.
 */
export function HeroArt({ title, className }: { title: string; className?: string }) {
  return <Image src={hero} alt={title} className={className} loading="eager" fetchPriority="high" />;
}
