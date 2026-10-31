"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Callout, Chip, Dialog } from "@/components/ui";
import { useT } from "@/i18n/client";
import type { Messages } from "@/i18n/namespaces";
import type { Translate } from "@/i18n/translate";
import type { Descriptor } from "@/parts/descriptor";
import { goldenDelta } from "@/parts/golden";
import type { GoldenDelta, GoldenFixture } from "@/parts/golden";
import { planUpgrade } from "@/parts/versions";
import type { DescriptorChange, UpgradePlan } from "@/parts/versions";
import type { ModelEnv } from "@/sim/models/kinds";
import type { Op, Project } from "@/project/generated/types";
import type { CommitResult } from "@/studio/stores/doc";

type PartInfoMessages = Messages["partinfo"];
type UpgradeT = Translate<PartInfoMessages>;

export interface UpgradeDialogProps {
  plan: UpgradePlan;
  delta: GoldenDelta[];
  messages: PartInfoMessages;
  error?: string;
  onApply(): void;
  onCancel(): void;
}

export interface UpgradeHostProps {
  from: Descriptor;
  to: Descriptor;
  origin: "library" | "embedded";
  doc: Project;
  fixtures: ReadonlyMap<string, GoldenFixture>;
  env: ModelEnv;
  messages: PartInfoMessages;
  commit(ops: Op[], opts: { label: string }): CommitResult;
  onClose(): void;
}

const DROPPED_PARAMETER = /^\/parameters\/([^/]+)$/;

const droppedParameters = (changes: DescriptorChange[]): string[] =>
  changes.flatMap((c) => (c.change === "removed" ? (DROPPED_PARAMETER.exec(c.path)?.[1] ?? []) : []));

const show = (value: unknown): string => (typeof value === "string" ? value : JSON.stringify(value));

function Changes({ changes, t }: { changes: DescriptorChange[]; t: UpgradeT }) {
  if (changes.length === 0) return <p className="text-base text-muted">{t("upgrade.noChanges")}</p>;
  return (
    <ul className="space-y-2">
      {changes.map((c) => (
        <li key={c.path} className="rounded-lg bg-sunken p-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="min-w-0 break-all font-ui text-sm font-semibold">{c.path}</span>
            <Chip>{t(`upgrade.change.${c.change}`)}</Chip>
            {c.readsByModel ? <Chip tone="warn">{t("upgrade.readByModel")}</Chip> : null}
          </div>
          {c.change === "changed" ? (
            <p className="mt-1 break-all font-ui text-sm tabular text-muted">{`${show(c.before)} → ${show(c.after)}`}</p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function Golden({ delta, plan, t }: { delta: GoldenDelta[]; plan: UpgradePlan; t: UpgradeT }) {
  if (delta.length === 0) return <p className="text-base text-muted">{t("upgrade.golden.empty")}</p>;
  const cell = (value: GoldenDelta["before"]) => (value === null ? t("upgrade.golden.missing") : String(value));
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="text-muted">
          <tr>
            <th className="py-2 pr-4 font-semibold">{t("upgrade.golden.fixture")}</th>
            <th className="py-2 pr-4 font-semibold">{t("upgrade.golden.quantity")}</th>
            <th className="py-2 pr-4 font-semibold">{t("upgrade.golden.before", { version: plan.from })}</th>
            <th className="py-2 font-semibold">{t("upgrade.golden.after", { version: plan.to })}</th>
          </tr>
        </thead>
        <tbody className="font-ui tabular">
          {delta.map((row) => (
            <tr key={`${row.fixtureId}/${row.quantity}`} className={row.changed ? "font-semibold" : "text-muted"}>
              <td className="py-2 pr-4 break-all">{row.fixtureId}</td>
              <td className="py-2 pr-4">{row.quantity === "error" ? t("upgrade.golden.error") : row.quantity}</td>
              <td className="py-2 pr-4 break-all">{cell(row.before)}</td>
              <td className="py-2 break-all">{cell(row.after)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Heading({ children }: { children: string }) {
  return <h3 className="mb-2 mt-6 text-balance text-base font-semibold">{children}</h3>;
}

/** What upgrading would do, shown before anything changes: the descriptor diff, pin changes and golden trace quantities, old against new. */
export function UpgradeDialog({ plan, delta, messages, error, onApply, onCancel }: UpgradeDialogProps) {
  const t = useT(messages);
  const dropped = droppedParameters(plan.changes);
  const blockedBy = plan.blocked === "pins-removed-in-use" ? plan.wiresOnRemovedPins.map((w) => `${w.instance}.${w.pin}`).join(", ") : "";

  return (
    <Dialog
      open
      onClose={onCancel}
      size="lg"
      title={t("upgrade.title", { version: plan.to })}
      description={t("upgrade.summary", { from: plan.from, to: plan.to, bump: t(`upgrade.bump.${plan.bump}`), count: plan.instances.length })}
      closeLabel={t("upgrade.close")}
      footer={
        <>
          <Button variant="ghost" onClick={onCancel}>
            {t("upgrade.cancel", { from: plan.from })}
          </Button>
          <Button variant="primary" onClick={onApply} disabled={plan.blocked !== undefined}>
            {t("upgrade.apply")}
          </Button>
        </>
      }
    >
      {plan.blocked ? (
        <Callout tone="danger" live>
          {t(`upgrade.blocked.${plan.blocked}`, { list: blockedBy, from: plan.from, to: plan.to })}
        </Callout>
      ) : null}
      {error ? (
        <Callout tone="danger" live>
          {error}
        </Callout>
      ) : null}
      {plan.removedPins.length > 0 ? <p className="mt-3 text-base">{t("upgrade.pinsRemoved", { list: plan.removedPins.join(", ") })}</p> : null}
      {plan.addedPins.length > 0 ? <p className="mt-3 text-base">{t("upgrade.pinsAdded", { list: plan.addedPins.join(", ") })}</p> : null}
      {dropped.length > 0 ? <p className="mt-3 text-base">{t("upgrade.dropped", { list: dropped.join(", ") })}</p> : null}
      <Heading>{t("upgrade.changes")}</Heading>
      <Changes changes={plan.changes} t={t} />
      <Heading>{t("upgrade.golden.heading")}</Heading>
      <Golden delta={delta} plan={plan} t={t} />
    </Dialog>
  );
}

/** Builds the plan and the golden delta for one upgrade and commits the plan as a single undoable batch when the person applies it. */
export function UpgradeHost({ from, to, origin, doc, fixtures, env, messages, commit, onClose }: UpgradeHostProps) {
  const plan = useMemo(() => planUpgrade(doc, from, to, origin), [doc, from, to, origin]);
  const [delta, setDelta] = useState<GoldenDelta[] | null>(null);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let current = true;
    void goldenDelta(from, to, fixtures, env).then((rows) => current && setDelta(rows));
    return () => {
      current = false;
    };
  }, [from, to, fixtures, env]);

  if (delta === null) return null;
  const apply = () => {
    const done = commit(plan.ops, { label: `Upgrade ${to.id} to ${to.version}` });
    if (done.ok) onClose();
    else setError(done.message);
  };
  return <UpgradeDialog plan={plan} delta={delta} messages={messages} error={error} onApply={apply} onCancel={onClose} />;
}
