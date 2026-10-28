import { FigureFrame } from "@/components/figure";
import { HeroArt } from "@/components/shell/dashboard/HeroArt";

// the hero figure is only to look at and turn: no zoom chip, and no notes popping up over it
const HERO_CHROME = ["zoom", "toast"];

/** The Uno running Blink on its breadboard, live: drag it round. The drawing stands in until it is ready. */
export function HeroFigure({ label }: { label: string }) {
  return (
    <>
      <div className="h-[min(50svh,460px)] lg:h-auto lg:min-h-[min(72vh,700px)] lg:flex-1">
        <FigureFrame
          src="/figures/boards/uno-r3.html?bare=1&view=breadboard&circuit=blink"
          title={label}
          controls={false}
          hideChrome={HERO_CHROME}
          fill
          className="[&_.ink-plate]:rounded-xl"
          poster={<HeroArt className="h-full w-auto max-w-full object-contain p-4 sm:p-8" />}
        />
      </div>
      <p aria-hidden="true" className="mt-4 text-xs text-muted">
        {label}
      </p>
    </>
  );
}
