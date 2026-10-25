"use client";

import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";
import type { LabKind } from "@/components/dock/types";
import type { TogetherT } from "@/components/realtime/messages";
import { Button, Callout, Card, IconButton } from "@/components/ui";
import { useLocale } from "@/i18n/client";
import { LOCALES, type Locale } from "@/i18n/config";
import { reloadFeatures, useFeatures } from "@/lib/features";
import { createRoom, useIdentity } from "@/lib/realtime";
import { track } from "@/lib/telemetry";
import { FeatureGate, postJson, roomPath } from "./api";

type Level = "new" | "some" | "lots";
type Person = { key: number; name: string; lang: Locale; level: Level; wants: string };
type Plan = { title: string; item: { lab: LabKind; id: string }; why: string; roles: { name: string; role: string; firstTask: string }[]; steps: string[]; parts?: string[] };

const LEVELS: Level[] = ["new", "some", "lots"];
const MAX_PEOPLE = 8;
const field = "ink-field w-full font-normal";
const area = "rounded-ink-sm border-2 border-line bg-surface px-3 py-2 font-body text-base font-normal text-ink";

type State = { kind: "idle" } | { kind: "missing" } | { kind: "busy" } | { kind: "error" } | { kind: "unknown" } | { kind: "done"; plan: Plan };

export function Planner({ t, titles }: { t: TogetherT; titles: Map<string, string> }) {
  const id = useId();
  const router = useRouter();
  const locale = useLocale();
  const identity = useIdentity();
  const features = useFeatures();
  const [people, setPeople] = useState<Person[]>([
    { key: 1, name: "", lang: locale, level: "some", wants: "" },
    { key: 2, name: "", lang: locale, level: "new", wants: "" },
  ]);
  const [next, setNext] = useState(3);
  const [state, setState] = useState<State>({ kind: "idle" });
  // The first row is you, once you've picked a name for rooms.
  const rows = people.map((p, i) => (i === 0 && !p.name && identity ? { ...p, name: identity.name } : p));

  const update = (key: number, patch: Partial<Person>) =>
    setPeople((list) => list.map((p, i) => (p.key === key ? { ...(i === 0 && !p.name && identity ? { ...p, name: identity.name } : p), ...patch } : p)));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const participants = rows.filter((p) => p.name.trim() || p.wants.trim());
    if (participants.length === 0 || participants.some((p) => !p.name.trim() || !p.wants.trim())) return setState({ kind: "missing" });
    setState({ kind: "busy" });
    track("ai.call", { kind: "plan" });
    const result = await postJson<Plan>("/api/ai/plan", {
      locale,
      participants: participants.map(({ name, lang, level, wants }) => ({ name: name.trim().slice(0, 24), lang, level, wants: wants.trim().slice(0, 300) })),
    });
    if (!result.ok) return setState({ kind: "error" });
    if (!titles.has(`${result.data.item.lab}:${result.data.item.id}`)) return setState({ kind: "unknown" });
    setState({ kind: "done", plan: result.data });
  };

  return (
    <Card as="section" aria-labelledby={`${id}-title`} className="flex flex-col gap-4">
      <div>
        <h2 id={`${id}-title`} className="text-xl">
          {t("lobby.plan.title")}
        </h2>
        <p className="mt-1 max-w-2xl text-sm">{t("lobby.plan.lede")}</p>
      </div>
      <FeatureGate t={t} state={features} needs={["ai"]} notSetUp={t("lobby.plan.notSetUp")} onRetry={reloadFeatures}>
        {state.kind === "done" ? (
          <PlanCard
            plan={state.plan}
            item={titles.get(`${state.plan.item.lab}:${state.plan.item.id}`) ?? ""}
            t={t}
            onStart={() => router.push(roomPath(createRoom(state.plan.item.lab, state.plan.item.id, locale)))}
            onAgain={() => setState({ kind: "idle" })}
          />
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-3" noValidate>
            <fieldset className="flex flex-col gap-3">
              <legend className="mb-1 text-sm font-semibold">{t("lobby.plan.people")}</legend>
              {rows.map((person, index) => {
                const label = person.name.trim() || t("lobby.plan.person", { n: index + 1 });
                return (
                  <div key={person.key} role="group" aria-label={label} className="grid gap-2 rounded-ink-sm bg-sunken p-3 sm:grid-cols-[1fr_auto_auto_auto]">
                    <label className="flex flex-col gap-1 text-xs font-semibold">
                      {t("lobby.plan.name")}
                      <input value={person.name} maxLength={24} onChange={(e) => update(person.key, { name: e.target.value })} className={field} />
                    </label>
                    <label className="flex flex-col gap-1 text-xs font-semibold">
                      {t("lobby.plan.lang")}
                      <select value={person.lang} onChange={(e) => update(person.key, { lang: e.target.value as Locale })} className={field}>
                        {LOCALES.map((code) => (
                          <option key={code} value={code}>
                            {t(`languages.${code}`)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="flex flex-col gap-1 text-xs font-semibold">
                      {t("lobby.plan.level")}
                      <select value={person.level} onChange={(e) => update(person.key, { level: e.target.value as Level })} className={field}>
                        {LEVELS.map((level) => (
                          <option key={level} value={level}>
                            {t(`lobby.plan.levels.${level}`)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="flex items-end">
                      <IconButton
                        icon="close"
                        label={t("lobby.plan.remove", { name: label })}
                        disabled={people.length <= 1}
                        onClick={() => setPeople((list) => list.filter((p) => p.key !== person.key))}
                      />
                    </div>
                    <label className="flex flex-col gap-1 text-xs font-semibold sm:col-span-4">
                      {t("lobby.plan.wants")}
                      <textarea value={person.wants} maxLength={300} rows={2} onChange={(e) => update(person.key, { wants: e.target.value })} className={area} />
                    </label>
                  </div>
                );
              })}
            </fieldset>
            <div className="flex flex-wrap gap-2">
              <Button
                disabled={people.length >= MAX_PEOPLE}
                onClick={() => {
                  setPeople((list) => [...list, { key: next, name: "", lang: locale, level: "new", wants: "" }]);
                  setNext((n) => n + 1);
                }}
              >
                {t("lobby.plan.add")}
              </Button>
              <Button type="submit" variant="primary" disabled={state.kind === "busy"}>
                {state.kind === "busy" ? t("lobby.plan.planning") : t("lobby.plan.submit")}
              </Button>
            </div>
            <div aria-live="polite">
              {state.kind === "missing" ? <Callout tone="warn">{t("lobby.plan.missing")}</Callout> : null}
              {state.kind === "error" ? <Callout tone="danger">{t("lobby.plan.failed")}</Callout> : null}
              {state.kind === "unknown" ? <Callout tone="warn">{t("lobby.plan.unknownItem")}</Callout> : null}
            </div>
          </form>
        )}
      </FeatureGate>
    </Card>
  );
}

function PlanCard({ plan, item, t, onStart, onAgain }: { plan: Plan; item: string; t: TogetherT; onStart: () => void; onAgain: () => void }) {
  const id = useId();
  return (
    <article aria-labelledby={`${id}-plan`} className="flex flex-col gap-4 rounded-ink border-2 border-line bg-mustard p-4 text-ink-fixed shadow-ink">
      <header>
        <p className="ink-kicker">{item}</p>
        <h3 id={`${id}-plan`} className="text-xl text-ink-fixed">
          {plan.title}
        </h3>
        <p className="mt-2 text-sm">{plan.why}</p>
      </header>
      <section aria-labelledby={`${id}-roles`}>
        <h4 id={`${id}-roles`} className="text-base text-ink-fixed">
          {t("lobby.plan.roles")}
        </h4>
        <ul className="mt-2 grid gap-2 sm:grid-cols-2">
          {plan.roles.map((role) => (
            <li key={role.name} className="rounded-ink-sm border-2 border-line bg-paper-fixed p-2.5 text-sm">
              <p className="font-bold">
                {role.name} · {role.role}
              </p>
              <p>
                <span className="font-bold">{t("lobby.plan.firstTask")}: </span>
                {role.firstTask}
              </p>
            </li>
          ))}
        </ul>
      </section>
      <section aria-labelledby={`${id}-steps`}>
        <h4 id={`${id}-steps`} className="text-base text-ink-fixed">
          {t("lobby.plan.steps")}
        </h4>
        <ol className="mt-2 list-decimal pl-5 text-sm">
          {plan.steps.map((step, index) => (
            <li key={index}>{step}</li>
          ))}
        </ol>
      </section>
      {plan.parts && plan.parts.length > 0 ? (
        <section aria-labelledby={`${id}-parts`}>
          <h4 id={`${id}-parts`} className="text-base text-ink-fixed">
            {t("lobby.plan.parts")}
          </h4>
          <ul className="mt-2 list-disc pl-5 text-sm">
            {plan.parts.map((part, index) => (
              <li key={index}>{part}</li>
            ))}
          </ul>
        </section>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button variant="ink" onClick={onStart}>
          {t("lobby.plan.start")}
        </Button>
        <Button onClick={onAgain}>{t("lobby.plan.again")}</Button>
      </div>
    </article>
  );
}
