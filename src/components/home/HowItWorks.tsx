import { FigureStill } from "@/components/figure";
import { Reveal, cx } from "@/components/ui";
import { BENEFIT_STILL, type BenefitId } from "./labs-data";
import { HomeSection } from "./primitives";

type Entry = { title: string; text: string };

type HowItWorksProps = {
  benefitsTitle: string;
  benefits: readonly (Entry & { id: BenefitId })[];
  howTitle: string;
  steps: readonly Entry[];
};

const number = (n: number) => String(n).padStart(2, "0");

export function HowItWorks({ benefitsTitle, benefits, howTitle, steps }: HowItWorksProps) {
  return (
    <>
      <HomeSection id="benefits" title={benefitsTitle}>
        <ol className="mt-8 flex flex-col gap-12 md:gap-16">
          {benefits.map((benefit, i) => (
            <Reveal key={benefit.id} as="li">
              <div className="grid grid-cols-1 items-center gap-8 md:grid-cols-2 md:gap-16">
                <div className={cx("min-w-0", i % 2 === 1 && "md:order-last")}>
                  <p className="kicker tabular">{number(i + 1)}</p>
                  <h3 className="mt-2 text-2xl font-semibold">{benefit.title}</h3>
                  <p className="mt-4 max-w-prose text-base text-muted">{benefit.text}</p>
                </div>
                <FigureStill item={BENEFIT_STILL[benefit.id]} className="aspect-auto! h-48 w-full overflow-hidden rounded-2xl bg-plate p-6 md:h-64" />
              </div>
            </Reveal>
          ))}
        </ol>
      </HomeSection>
      <HomeSection id="how" title={howTitle}>
        <ol className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-3">
          {steps.map((step, i) => (
            <Reveal key={step.title} as="li" delay={i * 60}>
              <div className="flex items-center gap-4">
                <span className="tabular text-5xl font-semibold">{number(i + 1)}</span>
                {i < steps.length - 1 ? <span aria-hidden="true" className="hidden h-px flex-1 bg-rule md:block" /> : null}
              </div>
              <h3 className="mt-4 text-2xl font-semibold">{step.title}</h3>
              <p className="mt-2 max-w-prose text-base text-muted">{step.text}</p>
            </Reveal>
          ))}
        </ol>
      </HomeSection>
    </>
  );
}
