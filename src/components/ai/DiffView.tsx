import { foldDiff, LCS_LIMIT, numberLines } from "@/ai/diff";
import { netLines } from "@/ai/proposals/diffsummary";
import type { DiffSummary, PartLine } from "@/ai/proposals/types";
import type { AiT } from "@/ai/messages";

const MAX_LABEL = 120;

const cut = (text: string): string => (text.length > MAX_LABEL ? `${text.slice(0, MAX_LABEL - 1)}…` : text);

const show = (value: unknown): string => (typeof value === "string" ? value : (JSON.stringify(value) ?? "–"));

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-1">
      <h4 className="text-sm font-semibold">{title}</h4>
      {children}
    </section>
  );
}

function List({ items }: { items: { key: string; text: string }[] }) {
  return (
    <ul className="space-y-1 text-sm">
      {items.map((item) => (
        <li key={item.key} className="break-words font-mono text-xs">
          {item.text}
        </li>
      ))}
    </ul>
  );
}

function PartItems({ label, parts }: { label: string; parts: PartLine[] }) {
  return parts.map((part) => (
    <li key={`${label}:${part.id}`} className="break-words text-sm">
      <span className="font-semibold">{label}</span>
      {": "}
      {part.refdes ? <span className="font-mono text-xs">{part.refdes} </span> : null}
      {cut(part.label)}
    </li>
  ));
}

const prefix = { add: "+", del: "−", same: " " } as const;
const rowTone = { add: "bg-good-bg", del: "bg-bad-bg", same: "" } as const;

/** What a proposal changes, as text: lists with headings, and numbered line diffs for files. */
export function DiffView({ diff, t }: { diff: DiffSummary; t: AiT }) {
  const parts = diff.parts;
  const hasParts = parts.added.length + parts.removed.length + parts.changed.length > 0;
  const nets = netLines(diff);
  const hasWires = diff.wires.added + diff.wires.removed > 0;
  const hasTests = diff.tests.added.length + diff.tests.removed.length + diff.tests.changed.length > 0;
  const hasFaults = diff.faults.added.length + diff.faults.removed.length + diff.faults.changed.length > 0;
  const { cascade } = diff;
  const hasCascade = cascade.components + cascade.wires + cascade.pins + cascade.sources > 0;
  const idList = (kind: "tests" | "faults") => [
    ...diff[kind].added.map((id) => ({ key: `a:${id}`, text: `${t("proposal.diff.added")}: ${id}` })),
    ...diff[kind].removed.map((id) => ({ key: `r:${id}`, text: `${t("proposal.diff.removed")}: ${id}` })),
    ...diff[kind].changed.map((id) => ({ key: `c:${id}`, text: `${t("proposal.diff.changed")}: ${id}` })),
  ];

  const empty = !hasParts && nets.length === 0 && !hasWires && diff.sources.length === 0 && !hasTests && !hasFaults && diff.params.length === 0;

  return (
    <div className="space-y-3">
      {empty ? <p className="text-sm text-muted">{t("proposal.diff.noChange")}</p> : null}
      {hasParts ? (
        <Section title={t("proposal.diff.parts")}>
          <ul className="space-y-1">
            <PartItems label={t("proposal.diff.added")} parts={parts.added} />
            <PartItems label={t("proposal.diff.removed")} parts={parts.removed} />
            <PartItems label={t("proposal.diff.changed")} parts={parts.changed} />
          </ul>
        </Section>
      ) : null}
      {nets.length > 0 ? (
        <Section title={t("proposal.diff.nets")}>
          <List items={nets.map((text, index) => ({ key: `${index}:${text}`, text }))} />
        </Section>
      ) : null}
      {hasWires ? (
        <Section title={t("proposal.diff.wires")}>
          <p className="tabular text-sm">{t("proposal.diff.wireCounts", { added: diff.wires.added, removed: diff.wires.removed })}</p>
        </Section>
      ) : null}
      {diff.sources.length > 0 ? (
        <Section title={t("proposal.diff.files")}>
          <div className="space-y-2">
            {diff.sources.map((source) => (
              <div key={source.id} className="space-y-1">
                <p className="break-all font-mono text-xs font-semibold">
                  {t("proposal.fileLine", { path: source.path, added: source.added, removed: source.removed })}
                </p>
                {source.added > LCS_LIMIT || source.removed > LCS_LIMIT ? (
                  <p className="text-xs text-muted">{t("proposal.diff.bigFile")}</p>
                ) : null}
                <div className="max-h-64 overflow-auto rounded-lg bg-sunken py-1 font-mono text-xs">
                  {foldDiff(numberLines(source.lines)).map((row, index) =>
                    row.op === "skip" ? (
                      <p key={index} className="px-2 text-muted">
                        {t("proposal.diff.unchanged", { count: row.count })}
                      </p>
                    ) : (
                      <p key={index} className={`flex gap-2 px-2 ${rowTone[row.op]}`}>
                        <span aria-hidden className="tabular w-8 shrink-0 text-end text-muted">
                          {row.oldNo ?? ""}
                        </span>
                        <span aria-hidden className="tabular w-8 shrink-0 text-end text-muted">
                          {row.newNo ?? ""}
                        </span>
                        <span aria-hidden className="w-2 shrink-0">
                          {prefix[row.op]}
                        </span>
                        {row.op === "same" ? null : (
                          <span className="sr-only">{row.op === "add" ? t("proposal.diff.added") : t("proposal.diff.removed")}: </span>
                        )}
                        <span className="min-w-0 whitespace-pre-wrap break-all">{row.text}</span>
                      </p>
                    ),
                  )}
                </div>
              </div>
            ))}
          </div>
        </Section>
      ) : null}
      {hasTests ? (
        <Section title={t("proposal.diff.tests")}>
          <List items={idList("tests")} />
        </Section>
      ) : null}
      {hasFaults ? (
        <Section title={t("proposal.diff.faults")}>
          <List items={idList("faults")} />
        </Section>
      ) : null}
      {diff.params.length > 0 ? (
        <Section title={t("proposal.diff.params")}>
          <List
            items={diff.params.map((param) => ({
              key: param.id,
              text: t("proposal.diff.paramChange", { id: param.id, from: show(param.from), to: show(param.to) }),
            }))}
          />
        </Section>
      ) : null}
      {hasCascade ? (
        <Section title={t("proposal.diff.cascade")}>
          <p className="tabular text-sm">{t("proposal.diff.cascadeCounts", cascade)}</p>
        </Section>
      ) : null}
    </div>
  );
}
