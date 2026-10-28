import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { FigureFrame, FigureStill } from "@/components/figure";
import { Accent, ArrowLink, CtaLink, SectionHead, Wrap, riseDelay, typeClass } from "@/components/marketing";
import { HeroActions, LabProgress } from "@/components/shell/dashboard/DashboardProgress";
import { HeroArt } from "@/components/shell/dashboard/HeroArt";
import { loadLabs } from "@/components/shell/dashboard/data";
import { LAB_STILL } from "@/components/shell/dashboard/labs";
import { cx } from "@/components/ui/cx";
import { BOARD_IDS, DRONE_IDS, ROBOTICS_IDS } from "@/content/ids";
import { LOCALES, LOCALE_NAMES, htmlLang, isLocale } from "@/i18n/config";
import { alternatesFor } from "@/i18n/seo";
import { getMessages, getT } from "@/i18n/server";

type Props = PageProps<"/[lang]">;

const REPO_URL = "https://github.com/kushwahaamar-dev/iynk";
const counts = { boards: BOARD_IDS.length, benches: ROBOTICS_IDS.length, drones: DRONE_IDS.length };
// the hero figure is only to look at and turn: no zoom chip, and no notes popping up over it
const HERO_CHROME = ["zoom", "toast"];
const SECTION = "mt-[clamp(72px,10vw,160px)]";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const [t, common] = await Promise.all([getT(lang, "shell"), getT(lang, "common")]);
  return {
    // The landing's tab reads as the product, not "Dashboard".
    title: { absolute: `${common("site.name")} · ${common("site.tagline")}` },
    description: t("dashboard.metaDescription"),
    alternates: alternatesFor(lang, ""),
  };
}

export default function DashboardPage({ params }: Props) {
  return (
    <Suspense fallback={<div className="min-h-[70vh]" aria-busy="true" />}>
      <Dashboard params={params} />
    </Suspense>
  );
}

async function Dashboard({ params }: Pick<Props, "params">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const [t, messages, labs] = await Promise.all([
    getT(lang, "shell"),
    getMessages(lang, "shell"),
    loadLabs(lang),
  ]);

  const labNames = { board: t("nav.boards"), robotics: t("nav.robotics"), drone: t("nav.drones") };
  const labText = {
    board: { text: t("dashboard.board.text"), unit: t("dashboard.board.unit"), count: counts.boards, progress: t("dashboard.board.progress") },
    robotics: { text: t("dashboard.robotics.text"), unit: t("dashboard.robotics.unit"), count: counts.benches, progress: t("dashboard.robotics.progress") },
    drone: { text: t("dashboard.drones.text"), unit: t("dashboard.drones.unit"), count: counts.drones, progress: t("dashboard.drones.progress") },
  };
  const progressMessages = { progress: messages.ui.progress, progressLabel: messages.ui.progressLabel };
  const items = labs.flatMap((lab) => lab.items);
  const uno = labs[0].items.find((item) => item.id === "uno-r3");
  const startHref = uno?.entries[0]?.href ?? `/${lang}/boards/uno-r3`;
  const start = { href: startHref, label: t("dashboard.start") };
  const browse = { href: `/${lang}/boards`, label: t("dashboard.browse") };
  const features = (["see", "code", "break", "fly"] as const).map((id) => ({
    id,
    title: t(`dashboard.features.${id}.title`),
    text: t(`dashboard.features.${id}.text`),
  }));
  const sourceLinks = [
    { id: "readme", href: `${REPO_URL}#readme`, label: t("dashboard.openSource.readme") },
    { id: "selfHost", href: `${REPO_URL}/blob/main/docs/SELF_HOSTING.md`, label: t("dashboard.openSource.selfHost") },
    { id: "contribute", href: `${REPO_URL}/blob/main/CONTRIBUTING.md`, label: t("dashboard.openSource.contribute") },
  ];
  const ids = { hero: `dash-title-${lang}`, labs: `labs-title-${lang}`, features: `features-title-${lang}`, open: `open-title-${lang}`, end: `end-title-${lang}` };

  return (
    <div className="pb-[clamp(48px,6vw,96px)]">
      <section aria-labelledby={ids.hero} className="pt-[clamp(32px,6vw,96px)]">
        <Wrap className="grid grid-cols-12 gap-x-6 gap-y-10">
          <div className="col-span-12 flex flex-col lg:col-span-6 lg:pb-16">
            <p style={riseDelay(0)} className={cx(typeClass.eyebrow, typeClass.rise)}>
              {t("dashboard.kicker")}
            </p>
            <h1 id={ids.hero} style={riseDelay(60)} className={cx(typeClass.display, "mt-5 lg:mt-7", typeClass.rise)}>
              <Accent text={t("dashboard.title")} />
            </h1>
            <div style={riseDelay(140)} className={cx("mt-[clamp(28px,4vw,56px)] max-w-[30rem]", typeClass.rise)}>
              <p className="text-[17px] leading-[1.55] text-muted">{t("dashboard.lede")}</p>
              <div className="mt-8">
                <HeroActions
                  items={items}
                  messages={messages.dashboard.continue}
                  progressMessages={progressMessages}
                  labNames={labNames}
                  start={start}
                  browse={browse}
                  overallLabel={t("dashboard.overall")}
                />
              </div>
            </div>
          </div>
          {/* The Uno running Blink on its breadboard, live: drag it round. The drawing stands in until it's ready. */}
          <div style={riseDelay(220)} className={cx("col-span-12 flex min-w-0 flex-col lg:col-span-6", typeClass.rise)}>
            <div className="h-[min(50svh,460px)] lg:h-auto lg:min-h-[min(72vh,700px)] lg:flex-1">
              <FigureFrame
                src="/figures/boards/uno-r3.html?bare=1&view=breadboard&circuit=blink"
                title={t("dashboard.heroFigure")}
                controls={false}
                hideChrome={HERO_CHROME}
                fill
                className="[&_.ink-plate]:rounded-[6px] [&_.ink-plate]:border-0 [&_.ink-plate]:shadow-none"
                poster={<HeroArt className="h-full w-auto max-w-full object-contain p-4 sm:p-8" />}
              />
            </div>
            {/* The frame's title already names the figure; this is its caption for the eye. */}
            <p aria-hidden="true" className="mt-4 flex items-start gap-2.5 font-ui text-[12px] leading-[1.5] text-muted lg:justify-end">
              <span className="mt-[6px] size-1.5 shrink-0 rounded-full bg-mustard" />
              {t("dashboard.heroFigure")}
            </p>
          </div>
        </Wrap>
      </section>

      <section aria-labelledby={ids.labs} className={SECTION}>
        <Wrap>
          <SectionHead n="01" id={ids.labs} title={t("dashboard.labsTitle")} />
          <ul className="mt-[clamp(32px,4vw,56px)] grid grid-cols-1 lg:grid-cols-3">
            {labs.map((lab) => {
              const copy = labText[lab.lab];
              const keys = lab.items.flatMap((item) => item.entries.map((entry) => entry.key));
              return (
                <li
                  key={lab.lab}
                  className="min-w-0 border-t border-rule py-10 first:border-t-0 first:pt-0 last:pb-0 lg:border-t-0 lg:border-l lg:px-[clamp(20px,2.4vw,40px)] lg:py-0 lg:first:border-l-0 lg:first:pl-0 lg:last:pr-0"
                >
                  <article
                    aria-labelledby={`lab-${lab.lab}-${lang}`}
                    className="group relative flex h-full flex-col has-[a:focus-visible]:outline-[2.5px] has-[a:focus-visible]:outline-offset-[6px] has-[a:focus-visible]:outline-(--focus) has-[a:focus-visible]:outline-solid"
                  >
                    <FigureStill item={LAB_STILL[lab.lab]} className="h-[clamp(200px,40vw,280px)] w-full aspect-auto! rounded-[6px] dark:bg-plate lg:h-[clamp(200px,17vw,260px)]" />
                    <p className="mt-8 flex items-baseline gap-3">
                      <span className="tabular text-[clamp(56px,6vw,88px)] font-medium leading-[0.85] tracking-[-0.045em]">{copy.count}</span>
                      <span className={typeClass.eyebrow}>{copy.unit}</span>
                    </p>
                    <h3 id={`lab-${lab.lab}-${lang}`} className="mt-6 font-body text-[clamp(22px,1.9vw,28px)] font-medium tracking-[-0.015em]">
                      {/* One link per lab; its ::after makes the whole column the target. */}
                      <Link
                        href={`/${lang}/${lab.path}`}
                        className="no-underline after:absolute after:inset-0 focus-visible:shadow-none focus-visible:outline-none"
                      >
                        {labNames[lab.lab]}
                      </Link>
                    </h3>
                    <p className="mt-3 max-w-[46ch] flex-1 text-base leading-[1.55] text-muted">{copy.text}</p>
                    {keys.length > 0 ? (
                      <div className="mt-5">
                        <LabProgress keys={keys} label={copy.progress} messages={progressMessages} always={false} />
                      </div>
                    ) : null}
                    <span aria-hidden="true" className="mt-6 inline-flex items-center gap-2 text-[15px] font-medium">
                      <span className="underline decoration-rule decoration-1 underline-offset-[6px] transition-[text-decoration-color] duration-200 group-hover:decoration-ink">
                        {t("dashboard.open", { lab: labNames[lab.lab] })}
                      </span>
                      <span className="transition-transform duration-200 ease-out group-hover:translate-x-0.5 motion-reduce:transition-none">→</span>
                    </span>
                  </article>
                </li>
              );
            })}
          </ul>
        </Wrap>
      </section>

      <section aria-labelledby={ids.features} className={SECTION}>
        <Wrap>
          <SectionHead n="02" id={ids.features} title={t("dashboard.features.title")} />
          <ol className="mt-[clamp(24px,3vw,40px)]">
            {features.map((feature, i) => (
              <li key={feature.id} className="grid grid-cols-12 gap-x-6 gap-y-3 border-b border-rule py-[clamp(24px,3vw,44px)] last:border-b-0">
                <span aria-hidden="true" className={cx(typeClass.eyebrow, "tabular col-span-2 pt-2 md:pt-3")}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className={cx(typeClass.title, "col-span-10 md:col-span-5")}>{feature.title}</h3>
                <p className="col-span-10 col-start-3 max-w-[52ch] text-base leading-[1.55] text-muted md:col-span-5 md:col-start-8 md:pt-2">
                  {feature.text}
                </p>
              </li>
            ))}
          </ol>
        </Wrap>
      </section>

      <section aria-labelledby={ids.open} className={SECTION}>
        <Wrap>
          <SectionHead n="03" id={ids.open} title={t("dashboard.openSource.title")} />
          <div className="mt-[clamp(32px,4vw,56px)] grid grid-cols-12 gap-x-6 gap-y-8">
            <p className="col-span-12 max-w-[46ch] text-[17px] leading-[1.55] text-pretty md:col-span-7">{t("dashboard.openSource.fidelity")}</p>
            <ul className="col-span-12 flex flex-col md:col-span-4 md:col-start-9">
              {sourceLinks.map((link) => (
                <li key={link.id}>
                  <ArrowLink href={link.href} target="_blank" rel="noopener noreferrer">
                    {link.label}
                  </ArrowLink>
                </li>
              ))}
            </ul>
          </div>
          <ul aria-label={t("dashboard.languages")} className="mt-[clamp(40px,5vw,80px)] flex flex-wrap items-baseline gap-x-[clamp(20px,3vw,48px)] gap-y-2 border-t border-rule pt-[clamp(24px,3vw,40px)]">
            {LOCALES.map((locale) => (
              <li key={locale}>
                <Link
                  href={`/${locale}`}
                  lang={htmlLang(locale)}
                  hrefLang={htmlLang(locale)}
                  aria-current={locale === lang ? "page" : undefined}
                  className="inline-flex min-h-11 items-center font-body text-[clamp(26px,3.4vw,48px)] font-medium tracking-[-0.02em] text-muted no-underline transition-colors duration-200 hover:text-ink aria-[current=page]:text-ink"
                >
                  {LOCALE_NAMES[locale]}
                </Link>
              </li>
            ))}
          </ul>
        </Wrap>
      </section>

      <section aria-labelledby={ids.end} className={SECTION}>
        <Wrap>
          <div className="grid grid-cols-12 gap-x-6 gap-y-10 border-t border-rule pt-[clamp(40px,6vw,96px)]">
            <h2 id={ids.end} className={cx(typeClass.display, "col-span-12 lg:col-span-8")}>
              <Accent text={t("dashboard.closing.title")} />
            </h2>
            <div className="col-span-12 flex flex-col justify-end gap-8 lg:col-span-4">
              <p className="max-w-[34ch] text-[17px] leading-[1.55] text-muted">{t("dashboard.closing.text")}</p>
              <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
                <CtaLink href={start.href}>{start.label}</CtaLink>
              </div>
            </div>
          </div>
        </Wrap>
      </section>
    </div>
  );
}
