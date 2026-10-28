import Link from "next/link";
import { FigureStill } from "@/components/figure";
import { LabProgress, type ProgressMessages } from "@/components/shell/dashboard/DashboardProgress";
import type { LabSummary } from "@/components/shell/dashboard/data";
import { LAB_STILL } from "@/components/shell/dashboard/labs";
import { Icon, Reveal, cx } from "@/components/ui";
import type { Locale } from "@/i18n/config";
import type { ProgressLab } from "@/lib/progress/keys";
import { LAB_ORDER } from "./labs-data";
import { HomeSection } from "./primitives";

export type LabCopy = { name: string; text: string; unit: string; progress: string };

type LabsShelfProps = {
  lang: Locale;
  title: string;
  labs: readonly LabSummary[];
  copy: Record<ProgressLab, LabCopy>;
  progressMessages: ProgressMessages;
};

export function LabsShelf({ lang, title, labs, copy, progressMessages }: LabsShelfProps) {
  const ordered = LAB_ORDER.flatMap((id) => labs.find((lab) => lab.lab === id) ?? []);
  return (
    <HomeSection id="labs" title={title}>
      <ul className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-12 lg:grid-rows-2">
        {ordered.map((lab, i) => {
          const text = copy[lab.lab];
          const keys = lab.items.flatMap((item) => item.entries.map((entry) => entry.key));
          const wide = i === 0;
          return (
            <Reveal key={lab.lab} as="li" delay={i * 60} className={cx("min-w-0", wide ? "lg:col-span-7 lg:row-span-2" : "lg:col-span-5")}>
              <article
                aria-labelledby={`lab-${lab.lab}`}
                className="group relative flex h-full flex-col rounded-2xl bg-surface p-6 has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-(--focus) has-[a:focus-visible]:outline-solid"
              >
                <FigureStill
                  item={LAB_STILL[lab.lab]}
                  className={cx("aspect-auto! w-full overflow-hidden rounded-md bg-plate", wide ? "h-64 lg:h-96" : "h-48")}
                />
                <p className="mt-6 flex items-baseline gap-3">
                  <span className="tabular text-5xl font-semibold">{lab.itemCount}</span>
                  <span className="kicker">{text.unit}</span>
                </p>
                <h3 id={`lab-${lab.lab}`} className="mt-2 text-2xl font-semibold">
                  {/* One link per lab; its ::after makes the whole cell the target. */}
                  <Link
                    href={`/${lang}/${lab.path}`}
                    prefetch={false}
                    className="no-underline after:absolute after:inset-0 after:rounded-2xl focus-visible:shadow-none focus-visible:outline-none"
                  >
                    {text.name}
                  </Link>
                </h3>
                <p className="mt-2 max-w-prose flex-1 text-base text-muted">{text.text}</p>
                {keys.length > 0 ? (
                  <div className="mt-4">
                    <LabProgress keys={keys} label={text.progress} messages={progressMessages} always={false} />
                  </div>
                ) : null}
                <Icon name="arrow-right" size={20} aria-hidden="true" className="mt-4 motion-move group-hover:translate-x-1" />
              </article>
            </Reveal>
          );
        })}
      </ul>
    </HomeSection>
  );
}
