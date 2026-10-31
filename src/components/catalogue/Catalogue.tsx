import type { ReactNode } from "react";
import Link from "next/link";
import { FigureStill } from "@/components/figure";
import { enter, eyebrow, typeClass } from "@/components/editorial/Editorial";
import { cx } from "@/components/ui/cx";
import { Icon } from "@/components/ui/icons";

/*
  The one layout behind the three lab indexes (/boards, /robotics, /drones): an editorial head with the count as a
  big number, then the items as a grid of cells split by hairlines. Every card has the same six rows (meta, figure,
  title, specs, tags, progress) as a subgrid, so the rows line up across a whole row of cards.
*/

export { eyebrow };

export function CataloguePage({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 pb-16 pt-10 sm:px-6 md:pb-24 md:pt-16 lg:px-10 xl:px-12 [--cat-pad:--spacing(4)] lg:[--cat-pad:--spacing(6)]">
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
        <p className="mt-6 max-w-prose text-lg text-pretty text-muted sm:mt-8">{lede}</p>
      </div>
      <p className={cx("flex items-end gap-3 lg:col-span-3 lg:flex-col lg:items-end lg:gap-2 lg:text-end", enter)}>
        <span className="tabular text-7xl font-semibold leading-none tracking-tight lg:text-8xl">
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
    <section aria-labelledby={id} className="grid grid-cols-1 lg:grid-cols-12 [&+&]:mt-12 md:[&+&]:mt-24">
      <div className="border-t border-rule pb-6 pt-(--cat-pad) lg:col-span-3 lg:pe-8">
        <div className="flex flex-col gap-4 lg:sticky lg:top-[calc(var(--header-h)+1.5rem)]">
          <h2 id={id} className="text-2xl font-semibold tracking-tight text-balance lg:text-3xl">
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

/** The hairline grid. Its top rule starts at the page gutter, like the head above it. */
export function CatalogueGrid({
  wide = true,
  count,
  labelledBy,
  testId,
  children,
}: {
  wide?: boolean;
  /** How many cards the grid holds. A grid with fewer cards than columns uses only as many columns as it has cards. */
  count?: number;
  labelledBy?: string;
  testId?: string;
  children: ReactNode;
}) {
  const alone = count === 1;
  return (
    <div className="overflow-hidden">
      <ul
        aria-labelledby={labelledBy}
        data-testid={testId}
        className={cx(
          "-me-px grid grid-cols-1 border-t border-rule",
          alone ? "[&_.cat-figure]:lg:aspect-[3/1]" : "sm:grid-cols-2",
          !alone && wide && "lg:grid-cols-3 xl:grid-cols-4",
          !alone && !wide && count !== 2 && "xl:grid-cols-3",
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
          enter,
          "motion-fade has-[a:hover]:bg-surface",
          "has-[a:focus-visible]:outline-2 has-[a:focus-visible]:-outline-offset-2 has-[a:focus-visible]:outline-(--focus)",
        )}
      >
        <div className={cx(slot, eyebrow, "flex items-baseline justify-between gap-4")}>
          <span className="tabular shrink-0 text-ink">{fig}</span>
          {meta ? <span className="truncate text-end">{meta}</span> : null}
        </div>

        <div className="cat-figure relative my-4 aspect-[2/1] min-h-0 sm:my-6 sm:aspect-[5/4]">
          <FigureStill item={item} className="absolute inset-0 aspect-auto! h-full w-full" />
        </div>

        <div className={slot}>
          <Heading id={titleId} className="flex items-start justify-between gap-3 text-xl font-semibold tracking-tight text-balance">
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
        <div className={cx(slot, "relative mt-4 self-end border-t border-rule pt-3")}>{progress}</div>
      </article>
    </li>
  );
}

function Arrow() {
  return (
    <Icon
      name="arrow-right"
      size={16}
      className="mt-1 shrink-0 text-muted motion-move group-has-[a:hover]:translate-x-1 group-has-[a:hover]:text-ink"
    />
  );
}

/** One mono line of specs, joined by dots that never start a line. */
export function SpecLine({ items, label }: { items: string[]; label?: string }) {
  return (
    <div className="overflow-hidden">
      <ul aria-label={label} className="tabular -ms-4 flex flex-wrap font-ui text-xs text-ink">
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
