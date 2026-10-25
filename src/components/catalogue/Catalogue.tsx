import type { ReactNode } from "react";
import Link from "next/link";
import { FigureStill } from "@/components/figure";
import { typeClass } from "@/components/marketing";
import { cx } from "@/components/ui/cx";

/*
  The one layout behind the three lab indexes (/boards, /robotics, /drones): an editorial head with the count as a
  big number, then the items as a grid of cells split by hairlines. Every card has the same six rows (meta, figure,
  title, specs, tags, progress) as a subgrid, so the rows line up across a whole row of cards.
*/

// Enter motion: an 8px rise and a fade, once. The global reduced-motion rule cuts the transition to nothing.
const enter = "transition-[opacity,translate] duration-400 ease-out starting:translate-y-2 starting:opacity-0 motion-reduce:transition-none";

export const eyebrow = "font-ui text-[11px] font-medium uppercase leading-4 tracking-[0.08em] text-muted sm:text-xs";

export function CataloguePage({ children }: { children: ReactNode }) {
  return (
    <div
      className="mx-auto w-full max-w-[1440px] px-[clamp(16px,4vw,56px)] pb-[clamp(72px,10vw,160px)] pt-[clamp(40px,6vw,96px)] [--cat-pad:clamp(16px,1.6vw,24px)]"
    >
      {children}
    </div>
  );
}

/** The count's own words with the number taken out: "12 boards" → "boards". */
function countWords(text: string, count: number): string {
  return text.replace(String(count), "").trim() || text;
}

export function CatalogueHead({
  ordinal,
  kicker,
  title,
  titleId,
  lede,
  count,
  countText,
  numberLocale,
}: {
  /** "01": the lab's place among the three. */
  ordinal: string;
  kicker: string;
  title: string;
  titleId?: string;
  lede: string;
  count: number;
  /** The translated count, "12 boards"; the number is drawn big and the words sit under it. */
  countText: string;
  numberLocale: string;
}) {
  return (
    <header className="grid grid-cols-1 gap-x-6 gap-y-10 lg:grid-cols-12 lg:items-end">
      <div className={cx("lg:col-span-9", enter)}>
        <p className={cx(eyebrow, "flex items-center gap-3")}>
          <span className="tabular text-ink">{ordinal}</span>
          <span aria-hidden="true" className="h-px w-8 bg-current opacity-40" />
          <span>{kicker}</span>
        </p>
        <h1
          id={titleId}
          className={cx(typeClass.display, "mt-6 max-w-[16ch] sm:mt-8")}
        >
          {title}
        </h1>
        <p className="mt-6 max-w-[62ch] text-base leading-[1.55] text-muted sm:mt-8 sm:text-[17px]">{lede}</p>
      </div>
      <p className={cx("flex items-end gap-3 lg:col-span-3 lg:flex-col lg:items-end lg:gap-2 lg:text-end", enter)}>
        <span className="tabular font-body text-[clamp(64px,9vw,152px)] font-light leading-[0.78] tracking-[-0.05em]">
          {new Intl.NumberFormat(numberLocale).format(count)}
        </span>
        <span className={eyebrow}>{countWords(countText, count)}</span>
      </p>
    </header>
  );
}

/**
 * A section of the index under its own heading on the left (the robotics months). Without a heading the grid runs
 * the full width.
 */
export function CatalogueGroup({ id, kicker, title, aside, children }: { id: string; kicker: string | null; title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="grid grid-cols-1 lg:grid-cols-12 [&+&]:mt-[clamp(48px,6vw,96px)]">
      <div className="border-t border-rule pb-6 pt-(--cat-pad) lg:col-span-3 lg:pe-8">
        <div className="flex flex-col gap-4 lg:sticky lg:top-[calc(var(--header-h)+1.5rem)]">
          <h2 id={id} className="font-body text-[clamp(24px,2.2vw,32px)] font-medium leading-[1.05] tracking-[-0.02em]">
            {kicker ? <span className={cx(eyebrow, "mb-3 block")}>{kicker}</span> : null}
            {title}
          </h2>
          {aside}
        </div>
      </div>
      <div className="lg:col-span-9">{children}</div>
    </section>
  );
}

/** The hairline grid. The wrapper reaches a card's padding into the gutter so card text lines up with the head. */
export function CatalogueGrid({ wide = true, labelledBy, testId, children }: { wide?: boolean; labelledBy?: string; testId?: string; children: ReactNode }) {
  return (
    <div className="-mx-(--cat-pad) overflow-hidden">
      <ul
        aria-labelledby={labelledBy}
        data-testid={testId}
        className={cx(
          "-me-px grid grid-cols-1 border-t border-rule sm:grid-cols-2",
          wide ? "lg:grid-cols-3 xl:grid-cols-4" : "xl:grid-cols-3",
        )}
      >
        {children}
      </ul>
    </div>
  );
}

type CardProps = {
  /** Spread on the article: data-board, data-bench, data-craft. */
  data: Record<`data-${string}`, string>;
  item: Parameters<typeof FigureStill>[0]["item"];
  /** "Fig. 01" */
  fig: string;
  /** The maker or firmware, top right. */
  meta?: ReactNode;
  heading: "h2" | "h3";
  titleId?: string;
  name: string;
  /** No href: the item is not written yet and the card links nowhere. */
  href?: string;
  /** The link's accessible name when it should say more than the name. */
  openLabel?: string;
  sub?: ReactNode;
  specs?: ReactNode;
  tags?: ReactNode;
  progress?: ReactNode;
};

const slot = "min-w-0";

export function CatalogueCard({ data, item, fig, meta, heading: Heading, titleId, name, href, openLabel, sub, specs, tags, progress }: CardProps) {
  return (
    <li className="row-span-6 grid grid-rows-subgrid border-b border-e border-rule">
      <article
        {...data}
        aria-labelledby={titleId}
        className={cx(
          "group relative row-span-6 grid grid-rows-subgrid gap-y-0 p-(--cat-pad)",
          "transition-[opacity,translate,background-color] duration-400 ease-out starting:translate-y-2 starting:opacity-0 motion-reduce:transition-none",
          "has-[a:hover]:bg-surface has-[a:hover]:duration-150",
          "has-[a:focus-visible]:outline-2 has-[a:focus-visible]:-outline-offset-2 has-[a:focus-visible]:outline-(--focus)",
        )}
      >
        <div className={cx(slot, eyebrow, "flex items-baseline justify-between gap-4")}>
          <span className="tabular shrink-0 text-ink">{fig}</span>
          {meta ? <span className="truncate text-end">{meta}</span> : null}
        </div>

        <div className="relative my-4 aspect-[2/1] min-h-0 sm:my-5 sm:aspect-[5/4]">
          <FigureStill item={item} className="absolute inset-0 aspect-auto! h-full w-full" />
        </div>

        <div className={slot}>
          <Heading id={titleId} className="flex items-start justify-between gap-3 font-body text-[19px] font-medium leading-[1.2] tracking-[-0.015em]">
            {href ? (
              <Link
                href={href}
                aria-label={openLabel}
                className="no-underline decoration-1 underline-offset-4 after:absolute after:inset-0 after:content-[''] hover:underline hover:decoration-1 focus-visible:shadow-none focus-visible:outline-none"
              >
                {name}
              </Link>
            ) : (
              <span>{name}</span>
            )}
            {href ? <Arrow /> : null}
          </Heading>
          {sub ? <div className="mt-2 text-sm leading-[1.5] text-muted">{sub}</div> : null}
        </div>

        <div className={cx(slot, "pt-4")}>{specs}</div>
        <div className={cx(slot, "pt-3")}>{tags}</div>
        <div className={cx(slot, "relative z-10 mt-5 self-end border-t border-rule pt-3")}>{progress}</div>
      </article>
    </li>
  );
}

function Arrow() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className="mt-[0.2em] size-4 shrink-0 text-muted transition-[translate,color] duration-200 ease-out group-has-[a:hover]:translate-x-0.5 group-has-[a:hover]:-translate-y-0.5 group-has-[a:hover]:text-ink"
    >
      <path d="M4.5 11.5l7-7M6 4.5h5.5V10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** One mono line of specs, joined by dots that never start a line. */
export function SpecLine({ items, label }: { items: string[]; label?: string }) {
  return (
    <div className="overflow-hidden">
      <ul aria-label={label} className="tabular -ms-4 flex flex-wrap font-ui text-xs leading-5 text-ink">
        {items.map((spec, i) => (
          <li key={i} className="whitespace-nowrap before:inline-block before:w-4 before:text-center before:text-muted before:content-['·']">
            {spec}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Tags as small uppercase mono words; `strong` ones (a board's languages) in ink, the rest muted. */
export function TagLine({ label, strong = [], items }: { label: string; strong?: string[]; items: string[] }) {
  return (
    <ul aria-label={label} className={cx(eyebrow, "flex flex-wrap gap-x-3 gap-y-1")}>
      {strong.map((tag) => (
        <li key={`s-${tag}`} className="text-ink">
          {tag}
        </li>
      ))}
      {items.map((tag) => (
        <li key={tag}>{tag}</li>
      ))}
    </ul>
  );
}
