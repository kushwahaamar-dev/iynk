import { Fragment, type ComponentProps, type CSSProperties } from "react";
import { Wrap, typeClass } from "@/components/editorial/Editorial";
import { HeroActions } from "@/components/shell/dashboard/DashboardProgress";
import { cx } from "@/components/ui/cx";
import type { Messages } from "@/i18n/namespaces";
import type { Translate } from "@/i18n/translate";
import { HeroFigure } from "./HeroFigure";
import "./hero.css";

type HeroActionProps = ComponentProps<typeof HeroActions>;

type HeroProps = {
  t: Translate<Messages["home"]>;
  counts: { boards: number; benches: number; drones: number };
  startHref: string;
  browseHref: string;
  /** What `HeroActions` reads to tell a returning visitor where to carry on. */
  progress: Omit<HeroActionProps, "start" | "browse">;
};

const step = (i: number) => ({ "--i": i }) as CSSProperties;

export function Hero({ t, counts, startHref, browseHref, progress }: HeroProps) {
  const lines = t("hero.title").split("\n");
  return (
    <section aria-labelledby="hero-title" className="pt-12 md:pt-16 lg:pt-24">
      <Wrap className="grid grid-cols-12 gap-6">
        <div className="col-span-12 flex flex-col lg:col-span-6">
          <p style={step(0)} className={cx(typeClass.eyebrow, "stagger-in")}>
            {t("hero.kicker")}
          </p>
          <h1
            id="hero-title"
            style={step(1)}
            className="hero-title stagger-in mt-4 max-w-[680px] text-5xl font-semibold tracking-tight text-balance lang-air"
          >
            {lines.map((line, i) => (
              <Fragment key={line}>
                {i > 0 && <br />}
                {line}
              </Fragment>
            ))}
          </h1>
          <p style={step(2)} className="stagger-in mt-6 max-w-[680px] text-lg text-muted">
            {t("hero.lede")}
          </p>
          <div style={step(3)} className="stagger-in mt-8">
            <HeroActions
              {...progress}
              start={{ href: startHref, label: t("hero.cta") }}
              browse={{ href: browseHref, label: t("hero.browse") }}
            />
            <p className="mt-4 text-sm text-muted">{t("hero.reassure")}</p>
            <p className="mt-2 text-sm text-muted tabular">{t("hero.proof", counts)}</p>
          </div>
        </div>
        <div style={step(4)} className="stagger-in col-span-12 flex min-w-0 flex-col lg:col-span-6">
          <HeroFigure label={t("hero.figure")} />
        </div>
      </Wrap>
    </section>
  );
}
