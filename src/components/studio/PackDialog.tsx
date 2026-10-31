"use client";

import { Button, Callout, Chip, Dialog } from "@/components/ui";
import { useT } from "@/i18n/client";
import type { Messages } from "@/i18n/namespaces";
import type { Translate } from "@/i18n/translate";
import type { PackError, PackItem, PackPlan } from "@/export/pack";

type PackMessages = Messages["partpack"];
type PackT = Translate<PackMessages>;

export interface PackDialogProps {
  plan: PackPlan;
  messages: PackMessages;
  onUse(ids: string[]): void;
  onAdd(ids: string[]): void;
  onCancel(): void;
}

const keyOf = (item: PackItem): string => `${item.id}@${item.version}`;

function refusal(error: PackError, t: PackT): string {
  return t(`errors.${error.code}`, { limit: error.limit ?? "", path: error.path ?? "" });
}

function Facts({ item, t }: { item: PackItem; t: PackT }) {
  const { descriptor: def, labels } = item;
  const sources = def.sources.map((s) => (s.license ? `${s.title} (${s.license})` : s.title));
  return (
    <dl className="mt-2 grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[8rem_1fr]">
      <dt className="text-muted">{t("row.licence")}</dt>
      <dd className="min-w-0 break-words">
        {def.provenance.license}
        {` · ${labels.thirdPartyContent ? t("labels.thirdParty.yes") : t("labels.thirdParty.no")}`}
      </dd>
      <dt className="text-muted">{t("row.sources")}</dt>
      <dd className="min-w-0 break-words">{sources.length > 0 ? sources.join("; ") : t("row.noSources")}</dd>
      <dt className="text-muted">{t("row.code")}</dt>
      <dd className="min-w-0">
        {labels.code ? (
          <>
            {t("labels.code.yes")}
            {labels.permissions.length > 0 ? ` · ${t("row.permissions", { list: labels.permissions.join(", ") })}` : ""}
          </>
        ) : (
          t("labels.code.no")
        )}
      </dd>
    </dl>
  );
}

function Row({ item, t }: { item: PackItem; t: PackT }) {
  const { descriptor: def, labels } = item;
  return (
    <li className="rounded-lg bg-sunken p-3">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="min-w-0 break-words text-base font-semibold">{`${def.identity.manufacturer} ${def.identity.model}`.trim()}</h3>
        <Chip tone="neutral">{t(`tier.${def.simulation.tier}`)}</Chip>
        <Chip tone="neutral">{t(`status.${def.simulation.status}`)}</Chip>
      </div>
      <p className="mt-1 break-all font-mono text-sm text-muted">{keyOf(item)}</p>
      <p className="text-sm text-muted">{t("row.pins", { count: def.pins.length })}</p>
      <Facts item={item} t={t} />
      <div className="mt-2 flex flex-wrap gap-2">
        <Chip tone={labels.schemaValid ? "good" : "bad"}>{t("labels.schema")}</Chip>
        <Chip tone="neutral">{labels.hasTests ? t("labels.tests.yes") : t("labels.tests.no")}</Chip>
        <Chip tone="neutral">{t(`labels.run.${labels.testsRun}`)}</Chip>
        <Chip tone="neutral">{labels.hasReferenceTest ? t("labels.reference.yes") : t("labels.reference.no")}</Chip>
      </div>
      {item.collision ? (
        <Callout tone="warn" className="mt-2">
          {t("row.collision")}
        </Callout>
      ) : null}
      {item.code ? (
        <Callout tone="warn" className="mt-2">
          {t("row.codeOff")}
        </Callout>
      ) : null}
      {item.artWarnings.length > 0 ? (
        <Callout tone="note" className="mt-2" title={t("row.art")}>
          <ul>
            {item.artWarnings.map((warning) => (
              <li key={warning} className="break-words">
                {warning}
              </li>
            ))}
          </ul>
        </Callout>
      ) : null}
    </li>
  );
}

/** One decision per pack: what is inside, under what licence, whether it holds code, and what the person can do. */
export function PackDialog({ plan, messages, onUse, onAdd, onCancel }: PackDialogProps) {
  const t = useT(messages);

  if (!plan.ok) {
    return (
      <Dialog
        open
        onClose={onCancel}
        title={t("refused.title")}
        closeLabel={t("close")}
        footer={
          <Button variant="primary" onClick={onCancel}>
            {t("actions.close")}
          </Button>
        }
      >
        <Callout tone="danger" live>
          {refusal(plan.error, t)}
        </Callout>
        <p className="mt-3 text-sm text-muted">{t("refused.unchanged")}</p>
      </Dialog>
    );
  }

  const keys = plan.items.map(keyOf);
  const addable = plan.items.filter((item) => !item.collision).map(keyOf);
  const anyCode = plan.items.some((item) => item.code);

  return (
    <Dialog
      open
      onClose={onCancel}
      size="lg"
      title={t("dialog.title", { name: plan.manifest.id })}
      description={t("dialog.description", { sender: plan.sender })}
      closeLabel={t("close")}
      footer={
        <>
          <Button variant="ghost" onClick={onCancel}>
            {t("actions.cancel")}
          </Button>
          {anyCode ? null : (
            <Button variant="secondary" onClick={() => onUse(keys)}>
              {t("actions.use")}
            </Button>
          )}
          <Button variant="primary" disabled={addable.length === 0} onClick={() => onAdd(addable)}>
            {anyCode ? t("actions.addDisabled") : t("actions.add")}
          </Button>
        </>
      }
    >
      <ul className="flex flex-col gap-3">
        {plan.items.map((item) => (
          <Row key={keyOf(item)} item={item} t={t} />
        ))}
      </ul>
    </Dialog>
  );
}
