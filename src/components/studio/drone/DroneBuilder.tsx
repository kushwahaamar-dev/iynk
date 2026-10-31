"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import { Button, Callout, Chip, Dialog, EmptyState, SegmentedControl, Tabs, TextInput, type TabItem } from "@/components/ui";
import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/namespaces";
import { createTranslator } from "@/i18n/translate";
import { droneBom, toCsv, type PartInfo } from "@/export/bom-drone";
import { getAppRegistry } from "@/parts/builtin";
import type { Descriptor } from "@/parts/descriptor";
import { readFrame, roleOf, type Role } from "@/parts/mechanics";
import { flipToPartsPatch } from "@/project/domains/drone-ops";
import type { Resolve } from "@/project/domains/drone-semantic";
import type { Op } from "@/project/generated/types";
import { makerKey, type Build } from "@/sim/flight/build";
import type { Library, PriceTable } from "@/sim/flight/optimise";
import { propClash } from "@/sim/flight/clash";
import { craftSvg } from "@/studio/art/craft";
import { readAck, writeAck } from "@/studio/drone/ack";
import { priceOf } from "@/studio/drone/picker";
import { setupOps, withBodies } from "@/studio/drone/setup";
import { geometryOf, useDroneBuild, usePinnedBuild } from "@/studio/drone/use-build";
import type { Layout } from "@/studio/drone/layout";
import type { DocStore } from "@/studio/stores/doc";
import { ChecksList } from "./ChecksList";
import { CompareView } from "./CompareView";
import { FirstFlightPanel } from "./FirstFlightPanel";
import { FlyBuild } from "./FlyBuild";
import { LegacyBanner } from "./LegacyBanner";
import { NumbersPanel } from "./NumbersPanel";
import { OptimiserPanel } from "./OptimiserPanel";
import { PartEntryForm } from "./PartEntryForm";
import type { DroneBuildT } from "./PartPicker";
import { SafetyNotice } from "./SafetyNotice";
import { PickerCell, SlotsEditor } from "./SlotsEditor";

export interface DroneBuilderMessages {
  drone: Messages["drone"];
  dronebuild: Messages["dronebuild"];
  droneparts: Messages["droneparts"];
  droneopt: Messages["droneopt"];
  flight: Messages["flight"];
}

interface DroneBuilderProps {
  doc: DocStore;
  lang: Locale;
  messages: DroneBuilderMessages;
}

const LAYOUTS: readonly Layout[] = ["x", "plus", "h", "hex", "octo"];
const MAKER_ROLES: readonly Role[] = ["motor", "prop", "esc", "battery", "frame", "fc"];
const MM_PER_M = 1000;
const FIGURE_STYLE = {
  "--studio-ink": "var(--color-ink-fixed)",
  "--studio-body": "var(--color-mono-50)",
  "--studio-pin": "var(--color-metal-d)",
  "--studio-warn": "var(--color-tomato-m)",
} as CSSProperties;

type SetupRole = "frame" | "motor" | "prop" | "esc";
type SetupPicks = Partial<Record<SetupRole, Descriptor>>;

const readLibrary = (): Descriptor[] => {
  const registry = getAppRegistry();
  return registry.list().flatMap(({ ref, version }) => registry.get(ref, version) ?? []);
};

const resolvePart: Resolve = ({ ref, version }) => getAppRegistry().get(ref, version);

const libraryOf = (parts: readonly Descriptor[]): Library => {
  const pick = (role: Role) => parts.filter((part) => roleOf(part) === role).map((part) => ({ ref: part.id, version: part.version }));
  return { motors: pick("motor"), props: pick("prop"), packs: pick("battery") };
};

/** The shop prices the parts carry, in the currency of the first priced part. Prices in another currency are left out. */
function pricesOf(parts: readonly Descriptor[]): { prices: PriceTable; currency: string } {
  const priced = parts.flatMap((part) => {
    const price = priceOf(part);
    return price ? [{ key: `${part.id}@${part.version}`, price }] : [];
  });
  const currency = priced[0]?.price.currency ?? "USD";
  const prices = new Map(priced.filter((p) => p.price.currency === currency).map(({ key, price }) => [key, { amount: price.amount, asOf: price.asOf, estimate: price.estimate }]));
  return { prices, currency };
}

/** Every part in the app registry, read again whenever a part is added or removed. */
function usePartLibrary(): Descriptor[] {
  const [lib, setLib] = useState(readLibrary);
  useEffect(() => getAppRegistry().onChange(() => setLib(readLibrary())), []);
  return lib;
}

/** The drawing is parsed from the generator's own string and attached as nodes, never as markup. */
function CraftFigure({ svg, label }: { svg: string; label: string }) {
  const host = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const element = host.current;
    if (!element) return;
    const drawing = new DOMParser().parseFromString(svg, "image/svg+xml").documentElement;
    element.replaceChildren(document.importNode(drawing, true));
  }, [svg]);
  return <div ref={host} role="img" aria-label={label} style={FIGURE_STYLE} className="aspect-square w-full max-w-md rounded-2xl bg-(--color-paper-fixed) p-4 [&>svg]:size-full" />;
}

function downloadText(name: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

interface SetupFormProps {
  lib: readonly Descriptor[];
  readOnly: boolean;
  onCreate(picks: Required<SetupPicks> & { layout: Layout; wheelbase_mm: number }): void;
  t: DroneBuildT;
}

function SetupForm({ lib, readOnly, onCreate, t }: SetupFormProps) {
  const [picks, setPicks] = useState<SetupPicks>({});
  const [layout, setLayout] = useState<Layout>("x");
  const [typed, setTyped] = useState<string | null>(null);

  const frame = picks.frame ? readFrame(picks.frame) : null;
  const fromFrame = frame?.ok ? frame.value.wheelbase_mm : undefined;
  const wheelbaseText = typed ?? (fromFrame === undefined ? "" : String(fromFrame));
  const wheelbase = Number(wheelbaseText.trim().replace(",", "."));
  const wheelbaseOk = wheelbaseText.trim() !== "" && Number.isFinite(wheelbase) && wheelbase > 0;
  const { frame: chosenFrame, motor, prop, esc } = picks;
  const complete = chosenFrame && motor && prop && esc && wheelbaseOk;

  const cell = (role: SetupRole) => {
    const part = picks[role];
    const shown = part?.identity.model ?? t("slots.choose");
    const name = t(`setup.label.${role}`);
    return (
      <div key={role} className="flex items-center justify-between gap-3">
        <span className="text-sm text-muted">{name}</span>
        <PickerCell
          label={t("setup.trigger", { role: name, part: shown })}
          shown={shown}
          disabled={readOnly}
          role={role}
          lib={lib}
          ctx={{ frame: frame?.ok ? frame.value : null }}
          value={part?.id ?? null}
          onPick={(picked) => setPicks((current) => ({ ...current, [role]: picked }))}
          t={t}
        />
      </div>
    );
  };

  return (
    <section aria-labelledby="setup-title" className="flex flex-col gap-4">
      <h2 id="setup-title" className="text-lg font-semibold text-balance">
        {t("setup.title")}
      </h2>
      <p className="max-w-prose text-sm text-muted text-pretty">{t("setup.hint")}</p>
      {cell("frame")}
      <SegmentedControl
        label={t("setup.label.layout")}
        options={LAYOUTS.map((value) => ({ value, label: t(`layout.${value}`) }))}
        value={layout}
        onChange={setLayout}
      />
      <TextInput
        label={t("setup.wheelbase")}
        hint={t("setup.wheelbaseHint")}
        error={typed !== null && !wheelbaseOk ? t("setup.wheelbaseBad") : undefined}
        inputMode="decimal"
        className="tabular-nums"
        value={wheelbaseText}
        disabled={readOnly}
        onChange={(event) => setTyped(event.target.value)}
      />
      {cell("motor")}
      {cell("prop")}
      {cell("esc")}
      <Button
        variant="primary"
        className="self-start"
        disabled={readOnly || !complete}
        onClick={() => complete && onCreate({ frame: chosenFrame, motor, prop, esc, layout, wheelbase_mm: wheelbase })}
      >
        {t("setup.create")}
      </Button>
      {!complete && !readOnly ? <p className="text-sm text-muted">{t("setup.incomplete")}</p> : null}
    </section>
  );
}

export function DroneBuilder({ doc, lang, messages }: DroneBuilderProps) {
  const lib = usePartLibrary();
  const view = useSyncExternalStore(doc.subscribe, doc.getState, doc.getState);
  const { build, out, state, commit } = useDroneBuild(doc, resolvePart);
  const { pinned, pin, clear } = usePinnedBuild();
  const [tab, setTab] = useState("numbers");
  const [refusal, setRefusal] = useState<string | null>(null);
  const [partFormOpen, setPartFormOpen] = useState(false);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [exportFailed, setExportFailed] = useState(false);

  const t = useMemo(() => createTranslator(lang, messages.dronebuild, `${lang}/dronebuild`), [lang, messages.dronebuild]);
  const droneT = useMemo(() => createTranslator(lang, messages.drone, `${lang}/drone`), [lang, messages.drone]);
  const optT = useMemo(() => createTranslator(lang, messages.droneopt, `${lang}/droneopt`), [lang, messages.droneopt]);
  const partsT = useMemo(() => createTranslator(lang, messages.droneparts, `${lang}/droneparts`), [lang, messages.droneparts]);

  const project = view.state;
  const readOnly = view.readOnly;
  const data = project.domains?.drone?.data;
  const hasSlots = (data?.motors?.length ?? 0) > 0;

  const geometry = useMemo(() => {
    if (!build) return null;
    const discs = build.slots.map((s) => ({ id: s.id, x_mm: s.axis_mm[0], y_mm: s.axis_mm[1], z_mm: s.z_mm, r_mm: (s.prop.d_m * MM_PER_M) / 2 }));
    return geometryOf(build, propClash(discs), out?.mass ?? null);
  }, [build, out?.mass]);
  const library = useMemo(() => libraryOf(lib), [lib]);
  const shop = useMemo(() => pricesOf(lib), [lib]);
  const svg = useMemo(() => (geometry ? craftSvg(geometry, { palette: "cobalt", showThrust: false, showCom: true }) : null), [geometry]);

  function write(ops: Op[], label: string) {
    const result = commit(ops, label);
    setRefusal(result.ok ? null : result.message);
  }

  function describe(b: Build): (ref: string) => PartInfo {
    return (ref) => {
      const instance = [...project.components, ...project.boards].find((c) => c.definition.ref === ref);
      const part = instance && resolvePart(instance.definition);
      const basis = MAKER_ROLES.some((role) => b.makerRated.has(makerKey(ref, role))) ? "maker" : "assumption";
      const price = part ? priceOf(part) : undefined;
      return { name: part?.identity.model ?? ref, ...(part?.identity.mpn && { mpn: part.identity.mpn }), ...(price && { priceTag: price }), basis };
    };
  }

  function exportBom() {
    if (!build) return;
    setExportFailed(false);
    try {
      const csv = toCsv(droneBom(build, describe(build)), { sn8: droneT("notice.SN-8"), made: new Date().toISOString(), columns: messages.droneopt.columns });
      const slug = project.meta.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      downloadText(`${slug || "drone"}-bom.csv`, csv);
    } catch {
      setExportFailed(true);
    }
  }

  function tabsFor(content: ReactNode): TabItem[] {
    const numbers: TabItem = { id: "numbers", label: t("tabs.numbers"), content };
    if (!build || !out) return [numbers];
    return [
      numbers,
      {
        id: "compare",
        label: t("tabs.compare"),
        content: tab === "compare" && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => pin(t("tabs.pinLabel", { title: project.meta.title, time: new Date().toLocaleTimeString(lang) }), out)}>{t("tabs.pin")}</Button>
              {pinned ? <Button onClick={clear}>{t("tabs.unpin")}</Button> : null}
            </div>
            <CompareView pinned={pinned} current={out} lang={lang} t={droneT} tp={partsT} />
          </div>
        ),
      },
      {
        id: "optimise",
        label: t("tabs.optimise"),
        content: tab === "optimise" && (
          <OptimiserPanel
            build={build}
            lib={library}
            resolve={resolvePart}
            prices={shop.prices}
            currency={shop.currency}
            components={project.components}
            lang={lang}
            onApply={write}
            t={optT}
            droneT={droneT}
          />
        ),
      },
      { id: "fly", label: t("tabs.fly"), content: tab === "fly" && <FlyBuild build={build} out={out} lang={lang} flight={messages.flight} drone={droneT} /> },
    ];
  }

  if (!data) {
    return (
      <EmptyState icon="drone" title={t("notDrone.title")} action={<a href="#/" className="text-base font-semibold underline">{t("notDrone.back")}</a>}>
        {t("notDrone.body")}
      </EmptyState>
    );
  }

  const overview = (
  <div className="grid gap-8 lg:grid-cols-2">
    <div className="flex flex-col gap-6">
      {svg && build && build.slots.length > 0 ? (
        <CraftFigure svg={svg} label={t("header.figure")} />
      ) : null}
      {hasSlots && build ? (
        <SlotsEditor build={build} project={project} lib={lib} readOnly={readOnly} onChange={(ops, label) => write(withBodies(project, resolvePart, ops), label)} t={t} />
      ) : (
        <SetupForm
          lib={lib}
          readOnly={readOnly}
          onCreate={({ layout, wheelbase_mm, ...parts }) => write(setupOps(project, resolvePart, { layout, wheelbase_mm, ...parts }), "drone.setup")}
          t={t}
        />
      )}
      <section aria-labelledby="actions-title" className="flex flex-col gap-3">
        <h2 id="actions-title" className="text-lg font-semibold text-balance">
          {t("actions.title")}
        </h2>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setPartFormOpen(true)} disabled={readOnly}>
            {t("actions.addPart")}
          </Button>
          <Button disabled={!build || build.slots.length === 0} onClick={() => (readAck() ? exportBom() : setNoticeOpen(true))}>
            {t("actions.exportBom")}
          </Button>
        </div>
        {exportFailed ? (
          <Callout tone="danger" live>
            {t("actions.exportFailed")}
          </Callout>
        ) : null}
        {noticeOpen ? (
          <FirstFlightPanel
            t={droneT}
            acked={false}
            onAck={() => {
              writeAck(new Date().toISOString());
              setNoticeOpen(false);
              exportBom();
            }}
          />
        ) : null}
      </section>
    </div>
    <div className="flex flex-col gap-6">
      {out ? (
        <>
          <NumbersPanel out={out} lang={lang} t={droneT} />
          <ChecksList checks={out.checks} errors={out.errors} t={droneT} />
        </>
      ) : (
        <EmptyState icon="empty" title={t("numbersTitle")}>
          {t("setup.incomplete")}
        </EmptyState>
      )}
    </div>
  </div>
  );
  const tabs = tabsFor(overview);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold text-balance">{project.meta.title}</h1>
          {out ? <Chip tone="info">{t("header.tier", { tier: out.tier })}</Chip> : null}
        </div>
        <SafetyNotice id="SN-8" t={droneT} />
      </header>

      {state === "legacy" ? (
        <LegacyBanner t={t} onConfirm={() => write([flipToPartsPatch(data)], "drone.flip")} />
      ) : (
        <>
          {readOnly ? <Callout tone="note">{t("readOnly")}</Callout> : null}
          {refusal ? (
            <Callout tone="danger" live>
              {refusal}
            </Callout>
          ) : null}
          <Tabs
            label={t("tabs.label")}
            value={tabs.some((item) => item.id === tab) ? tab : "numbers"}
            onChange={setTab}
            tabs={tabs}
          />
        </>
      )}

      <Dialog open={partFormOpen} onClose={() => setPartFormOpen(false)} title={t("actions.addPart")} closeLabel={t("actions.closePart")} size="lg">
        <PartEntryForm t={partsT} onSaved={() => setPartFormOpen(false)} />
      </Dialog>
    </div>
  );
}
