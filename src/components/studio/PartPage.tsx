"use client";

import type { ReactNode } from "react";
import { Button, Callout, Chip, Icon, VisuallyHidden, buttonClass } from "@/components/ui";
import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/namespaces";
import { createTranslator } from "@/i18n/translate";
import type { Quantity, Unit } from "@/parts/generated/types";
import type { LayerFact, PartFacts, RatingFact, SlotFact } from "@/parts/facts";
import { ELEMENT_EQUATIONS } from "@/parts/facts";
import type { ComponentDependency } from "@/project/generated/types";
import { versionCompare } from "@/parts/descriptor";
import { routeHash } from "@/studio/router";

type PartInfoMessages = Messages["partinfo"];
type PartInfoT = ReturnType<typeof createTranslator<PartInfoMessages>>;
type SlotName = keyof RatingFact["slots"];

export interface PartUsage {
  instances: { id: string; label: string; version: string }[];
  pinned: ComponentDependency[];
}

export interface PartPageProps {
  facts: PartFacts;
  messages: PartInfoMessages;
  lang: Locale;
  onOpenEditor?: () => void;
  usage?: PartUsage;
  onUpgrade?: (toVersion: string) => void;
}

const SLOTS: readonly SlotName[] = ["manufacturer", "simulation", "measured"];

const UNIT_LABEL: Record<Unit, string> = {
  V: "V", A: "A", ohm: "Ω", F: "F", H: "H", W: "W", Hz: "Hz", s: "s", degC: "°C", C_per_W: "°C/W", mm: "mm", g: "g",
  N_m: "N m", rad_per_s: "rad/s", deg: "°", deg_per_s: "°/s", g0: "g", lux: "lx", ratio: "", percent: "%", "1": "", bit: "bit", byte: "byte", ppm: "ppm",
};
const PREFIXED: ReadonlySet<Unit> = new Set(["V", "A", "ohm", "F", "H", "W", "Hz", "s"]);
const PREFIXES: readonly (readonly [number, string])[] = [[1e6, "M"], [1e3, "k"], [1, ""], [1e-3, "m"], [1e-6, "µ"], [1e-9, "n"], [1e-12, "p"]];

const isWebUrl = (url: string): boolean => /^https?:\/\//i.test(url);

function formatQuantity(q: Quantity): string {
  const given = ([["min", q.min], ["typ", q.typ], ["max", q.max]] as const).flatMap(([name, n]) => (n === undefined ? [] : [[name, n] as const]));
  const entries = q.value === undefined ? given : [["", q.value] as const];
  const biggest = Math.max(...entries.map(([, n]) => Math.abs(n)));
  const [factor, prefix] = PREFIXED.has(q.unit) && biggest > 0 ? (PREFIXES.find(([f]) => biggest >= f) ?? PREFIXES[PREFIXES.length - 1]) : ([1, ""] as const);
  const unit = `${prefix}${UNIT_LABEL[q.unit]}`;
  return entries.map(([name, n]) => `${name ? `${name} ` : ""}${Number((n / factor).toPrecision(4))}${unit ? ` ${unit}` : ""}`).join(", ");
}

function Section({ id, heading, children }: { id: string; heading: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="mt-12">
      <h3 id={id} className="text-balance text-xl font-semibold">
        {heading}
      </h3>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function BulletList({ heading, items }: { heading: string; items: readonly string[] }) {
  return (
    <div>
      <h4 className="text-base font-semibold">{heading}</h4>
      <ul className="mt-2 list-disc space-y-2 pl-4 text-base text-pretty">
        {items.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </div>
  );
}

function SourceText({ slot, t }: { slot: SlotFact; t: PartInfoT }) {
  if (slot.sourceTitle === undefined) {
    return slot.unsourced ? (
      <Chip tone="warn">
        <Icon name="warn" size={16} aria-hidden="true" />
        {t("unsourced")}
      </Chip>
    ) : null;
  }
  const title =
    slot.url !== undefined && isWebUrl(slot.url) ? (
      <a href={slot.url} rel="noopener noreferrer" target="_blank" className="font-semibold text-accent underline underline-offset-2 hover:text-accent-hover">
        {slot.sourceTitle}
      </a>
    ) : (
      <span className="font-semibold">{slot.sourceTitle}</span>
    );
  return (
    <p className="text-sm text-pretty">
      {title}
      {slot.loc ? <span className="text-muted">, {slot.loc}</span> : null}
    </p>
  );
}

function SlotCell({ slot, used, name, t }: { slot: SlotFact | undefined; used: boolean; name: SlotName; t: PartInfoT }) {
  if (slot === undefined) {
    return (
      <td className="px-4 py-4 align-top text-muted">
        <span aria-hidden="true">–</span>
        <VisuallyHidden>{`${t(`slot.${name}`)}: ${t("ratings.notGiven")}`}</VisuallyHidden>
      </td>
    );
  }
  return (
    <td className="px-4 py-4 align-top">
      <div className="space-y-2">
        <p className="font-ui text-base font-semibold tabular">{formatQuantity(slot.value)}</p>
        {used ? (
          <Chip tone="ink">
            <Icon name="check" size={16} aria-hidden="true" />
            {t("ratings.readBy")}
          </Chip>
        ) : null}
        <SourceText slot={slot} t={t} />
        {slot.rationale ? <p className="text-sm text-pretty text-muted">{slot.rationale}</p> : null}
        {slot.confidence ? <p className="text-sm text-muted">{t("ratings.confidence", { level: t(`confidence.${slot.confidence}`) })}</p> : null}
      </div>
    </td>
  );
}

function RatingsTable({ ratings, t }: { ratings: readonly RatingFact[]; t: PartInfoT }) {
  if (ratings.length === 0) return <p className="text-base text-muted">{t("ratings.empty")}</p>;
  return (
    <div role="region" aria-labelledby="partinfo-ratings" tabIndex={0} className="overflow-x-auto rounded-xl bg-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
      <table className="w-full min-w-176 border-collapse text-left">
        <thead>
          <tr className="text-sm text-muted">
            <th scope="col" className="px-4 py-3 font-semibold">
              {t("ratings.rating")}
            </th>
            {SLOTS.map((name) => (
              <th key={name} scope="col" className="px-4 py-3 font-semibold">
                {t(`slot.${name}`)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-paper">
          {ratings.map((rating) => (
            <tr key={rating.key} className="border-t border-rule">
              <th scope="row" className="px-4 py-4 align-top font-normal">
                <span className="block font-ui text-sm font-semibold break-all">{rating.key}</span>
                <span className="mt-1 block text-sm text-muted">
                  {t(`ratings.measure.${rating.measure === "other" ? "misc" : (rating.measure as Exclude<keyof PartInfoMessages["ratings"]["measure"], "misc">)}`)}, {t(`ratings.role.${rating.role as keyof PartInfoMessages["ratings"]["role"]}`)}
                </span>
                {rating.usedByModel === "none" ? <span className="mt-2 block text-sm text-muted">{t("ratings.readByNone")}</span> : null}
              </th>
              {SLOTS.map((name) => (
                <SlotCell key={name} slot={rating.slots[name]} used={rating.usedByModel === name} name={name} t={t} />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LayerItem({ layer, t }: { layer: LayerFact; t: PartInfoT }) {
  const equation = layer.equationKey === undefined ? undefined : ELEMENT_EQUATIONS[layer.equationKey];
  return (
    <li className="rounded-xl bg-sunken p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-ui text-sm font-semibold">{layer.id}</span>
        <Chip>{layer.domain}</Chip>
        <Chip>{t(`layers.kind.${layer.kind as keyof PartInfoMessages["layers"]["kind"]}`)}</Chip>
        {layer.element ? <Chip mono>{layer.element}</Chip> : null}
        {layer.ref ? <Chip mono>{layer.ref}</Chip> : null}
        {layer.noneReason ? (
          <Chip tone="warn">
            <Icon name="empty" size={16} aria-hidden="true" />
            {t("layers.notModelledYet")}
          </Chip>
        ) : null}
      </div>
      {equation ? (
        <p className="mt-2 text-sm">
          <span className="text-muted">{t("layers.equation")}: </span>
          <code className="font-ui tabular">{equation}</code>
        </p>
      ) : null}
      {layer.noneReason ? (
        <p className="mt-2 text-sm text-pretty">
          {t(`layers.reason.${layer.noneReason}`)}
          {layer.detail ? <span className="text-muted">. {layer.detail}</span> : null}
        </p>
      ) : null}
    </li>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-xl bg-sunken p-4">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="mt-1 text-base font-semibold">{children}</dd>
    </div>
  );
}

export function PartPage({ facts, messages, lang, onOpenEditor, usage, onUpgrade }: PartPageProps) {
  const t = createTranslator(lang, messages, `${lang}/partinfo`);
  const yesNo = (flag: boolean) => (flag ? t("labels.yes") : t("labels.no"));
  const { labels } = facts;
  const others = facts.versions.filter((v) => v !== facts.version);
  const pinnedVersions = usage?.pinned.filter((dep) => dep.ref === facts.id).map((dep) => dep.version) ?? [];
  const upgradable = onUpgrade ? others.filter((v) => pinnedVersions.some((pinned) => versionCompare(v, pinned) > 0)) : [];

  return (
    <article className="mt-8 max-w-5xl" aria-labelledby="partinfo-name">
      <a href="#/" className={buttonClass("ghost", "sm", "-ml-3")}>
        <Icon name="chevron-left" size={16} aria-hidden="true" />
        {t("back")}
      </a>

      <header className="mt-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 id="partinfo-name" className="text-balance text-3xl font-semibold">
              {facts.name}
            </h2>
            <p className="mt-1 font-ui text-sm text-muted break-all">
              {facts.id}@{facts.version}
            </p>
          </div>
          {facts.trust === "local" && onOpenEditor ? (
            <Button variant="solid" onClick={onOpenEditor}>
              {t("edit")}
            </Button>
          ) : null}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Chip tone={facts.tier === "none" ? "neutral" : "ink"}>
            {facts.tier === "none" ? <Icon name="empty" size={16} aria-hidden="true" /> : <span className="font-ui tabular">{facts.tier}</span>}
            {t(`tier.${facts.tier as keyof PartInfoMessages["tier"]}`)}
          </Chip>
          <Chip>{t(`status.${facts.status as keyof PartInfoMessages["status"]}`)}</Chip>
          <Chip>{t(`trust.${facts.trust}`)}</Chip>
          {facts.thirdPartyContent ? <Chip tone="warn">{t("thirdParty")}</Chip> : null}
        </div>
      </header>

      <Section id="partinfo-unsourced" heading={t("unsourcedSummary.heading")}>
        {facts.unsourcedNumbers.length === 0 ? (
          <p className="text-base text-muted">{t("unsourcedSummary.none")}</p>
        ) : (
          <Callout tone="warn" title={t("unsourcedSummary.count", { count: facts.unsourcedNumbers.length })}>
            <ul className="mt-2 flex flex-wrap gap-2">
              {facts.unsourcedNumbers.map((id) => (
                <li key={id}>
                  <Chip mono>{id}</Chip>
                </li>
              ))}
            </ul>
          </Callout>
        )}
      </Section>

      <div className="mt-12 grid gap-8 md:grid-cols-2">
        <BulletList heading={t("models")} items={facts.whatItModels} />
        <BulletList heading={t("notModelled")} items={facts.notModelled} />
      </div>

      <Section id="partinfo-ratings" heading={t("ratings.heading")}>
        <RatingsTable ratings={facts.ratings} t={t} />
      </Section>

      {facts.validity.length > 0 ? (
        <Section id="partinfo-validity" heading={t("validity")}>
          <ul className="list-disc space-y-2 pl-4 text-base text-pretty">
            {facts.validity.map((line) => (
              <li key={line} className="tabular">
                {line}
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {facts.knownGaps.length > 0 ? (
        <Section id="partinfo-gaps" heading={t("gaps.heading")}>
          <ul className="space-y-4">
            {facts.knownGaps.map((gap) => (
              <li key={gap.id} className="rounded-xl bg-sunken p-4">
                <p className="text-base text-pretty">{gap.text}</p>
                {gap.evidence ? <p className="mt-1 text-sm text-muted">{t("gaps.evidence", { text: gap.evidence })}</p> : null}
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      <Section id="partinfo-layers" heading={t("layers.heading")}>
        <ul className="space-y-4">
          {facts.layers.map((layer) => (
            <LayerItem key={layer.id} layer={layer} t={t} />
          ))}
        </ul>
      </Section>

      <Section id="partinfo-sources" heading={t("sources.heading")}>
        {facts.sources.length === 0 ? (
          <p className="text-base text-muted">{t("sources.empty")}</p>
        ) : (
          <ul className="space-y-4">
            {facts.sources.map((source) => (
              <li key={source.id} className="rounded-xl bg-sunken p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Chip>{t(`sources.kind.${source.kind as keyof PartInfoMessages["sources"]["kind"]}`)}</Chip>
                  <Chip>{t(`sources.reliability.${source.reliability as keyof PartInfoMessages["sources"]["reliability"]}`)}</Chip>
                  {source.retrieved ? <span className="text-sm text-muted">{t("sources.retrieved", { date: source.retrieved })}</span> : null}
                </div>
                <p className="mt-2 text-base text-pretty">
                  {source.url !== undefined && isWebUrl(source.url) ? (
                    <a href={source.url} rel="noopener noreferrer" target="_blank" className="font-semibold text-accent underline underline-offset-2 hover:text-accent-hover">
                      {source.title}
                    </a>
                  ) : (
                    source.title
                  )}
                </p>
                {source.url !== undefined && !isWebUrl(source.url) ? <p className="mt-1 font-ui text-sm text-muted break-all">{source.url}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section id="partinfo-labels" heading={t("labels.heading")}>
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Fact label={t("labels.schemaValid")}>{yesNo(labels.schemaValid)}</Fact>
          <Fact label={t("labels.hasTests")}>{yesNo(labels.hasTests)}</Fact>
          <Fact label={t("labels.testsRun")}>{t(`labels.run.${labels.testsRun}`)}</Fact>
          <Fact label={t("labels.hasReferenceTest")}>{yesNo(labels.hasReferenceTest)}</Fact>
          <Fact label={t("labels.code")}>{yesNo(labels.code)}</Fact>
          <Fact label={t("labels.permissions")}>{labels.permissions.length > 0 ? labels.permissions.join(", ") : t("labels.none")}</Fact>
          <Fact label={t("labels.thirdPartyContent")}>{yesNo(labels.thirdPartyContent)}</Fact>
          <Fact label={t("license")}>
            <span className="font-ui text-sm break-all">{facts.license}</span>
          </Fact>
        </dl>
      </Section>

      <Section id="partinfo-tests" heading={t("tests.heading")}>
        {facts.tests.length === 0 ? (
          <p className="text-base text-muted">{t("tests.empty")}</p>
        ) : (
          <ul className="space-y-2">
            {facts.tests.map((test) => (
              <li key={test.id} className="flex flex-wrap items-center gap-2 text-base">
                <span className="font-ui text-sm font-semibold">{test.id}</span>
                <Chip>{test.kind}</Chip>
                <Chip tone={test.state === "present" ? "good" : "warn"}>{t(`tests.${test.state}`)}</Chip>
                <span className="font-ui text-sm text-muted break-all">{test.file}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section id="partinfo-versions" heading={t("versions.heading")}>
        {others.length === 0 ? (
          <p className="text-base text-muted">{t("versions.only")}</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {others.map((version) => (
              <li key={version}>
                <a href={routeHash({ kind: "parts-info", key: `${facts.id}@${version}` })} className={buttonClass("secondary", "sm", "font-ui tabular")}>
                  {version}
                </a>
              </li>
            ))}
          </ul>
        )}
        {upgradable.length > 0 ? (
          <ul className="mt-4 flex flex-wrap gap-2">
            {upgradable.map((version) => (
              <li key={version}>
                <Button variant="primary" size="sm" onClick={() => onUpgrade?.(version)}>
                  {t("upgrade.button", { version })}
                </Button>
              </li>
            ))}
          </ul>
        ) : null}
      </Section>

      {usage ? (
        <Section id="partinfo-usage" heading={t("usage.heading")}>
          {usage.instances.length === 0 ? (
            <p className="text-base text-muted">{t("usage.empty")}</p>
          ) : (
            <ul className="space-y-2 text-base">
              {usage.instances.map((instance) => (
                <li key={instance.id} className="tabular">
                  {t("usage.instance", { label: instance.label, version: instance.version })}
                </li>
              ))}
            </ul>
          )}
        </Section>
      ) : null}
    </article>
  );
}
