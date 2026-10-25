"use client";

import { useRouter } from "next/navigation";
import { useId, useMemo, useState, type FormEvent } from "react";
import type { LabKind } from "@/components/dock/types";
import { InviteDialog } from "@/components/realtime/InviteDialog";
import type { TogetherT } from "@/components/realtime/messages";
import { Action, Note, Section, eyebrow, area, field } from "@/components/editorial/Editorial";
import { Callout } from "@/components/ui";
import { cx } from "@/components/ui/cx";
import { useLocale } from "@/i18n/client";
import type { Locale } from "@/i18n/config";
import { reloadFeatures, useFeatures } from "@/lib/features";
import { useSaved } from "@/lib/progress";
import { createRoom, useIdentity } from "@/lib/realtime";
import { track } from "@/lib/telemetry";
import { FeatureGate, postJson, roomPath } from "./api";

type Profile = { id: string; name: string; lang: Locale; interests: string[]; built: string[]; wants: string };
type Match = { id: string; score: number; why: string; sharedInterest: string; suggestedProject: { lab: LabKind; id: string } };

const KEY = "iynk:buddies:v1";
const label = cx(eyebrow, "flex flex-col gap-2");

/** This browser's buddy-pool id and the token that proves it owns it. */
function credentials(): { id: string; token: string } {
  const make = () => {
    const bytes = crypto.getRandomValues(new Uint8Array(24));
    return Array.from(bytes, (b) => b.toString(36).padStart(2, "0")).join("");
  };
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? "null") as { id?: unknown; token?: unknown } | null;
    if (typeof saved?.id === "string" && typeof saved.token === "string") return { id: saved.id, token: saved.token };
  } catch {
    // Unreadable or blocked: start fresh below.
  }
  const fresh = { id: make().slice(0, 24), token: make() };
  try {
    localStorage.setItem(KEY, JSON.stringify(fresh));
  } catch {
    // Storage blocked: this id lasts for the page.
  }
  return fresh;
}

const splitList = (text: string) =>
  text
    .split(/[,，、;]/)
    .map((part) => part.trim().slice(0, 40))
    .filter(Boolean)
    .slice(0, 12);

type State =
  | { kind: "idle" }
  | { kind: "missing" }
  | { kind: "busy" }
  | { kind: "error" }
  | { kind: "done"; matches: Match[]; pool: Map<string, Profile> };

export function Buddies({ t, titles, index }: { t: TogetherT; titles: Map<string, string>; index?: string }) {
  const id = useId();
  const router = useRouter();
  const locale = useLocale();
  const identity = useIdentity();
  const saved = useSaved();
  const features = useFeatures();
  const [name, setName] = useState<string | null>(null);
  const [interests, setInterests] = useState("");
  const [wants, setWants] = useState("");
  const [state, setState] = useState<State>({ kind: "idle" });
  const [inviting, setInviting] = useState<{ match: Match; name: string; link: string } | null>(null);
  const built = useMemo(() => Object.keys(saved.done).slice(0, 64), [saved]);
  const shownName = name ?? identity?.name ?? "";

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!shownName.trim() || !wants.trim()) return setState({ kind: "missing" });
    setState({ kind: "busy" });
    const { id: me, token } = credentials();
    const profile: Profile = { id: me, name: shownName.trim().slice(0, 24), lang: locale, interests: splitList(interests), built, wants: wants.trim().slice(0, 280) };
    const posted = await postJson("/api/buddies", { profile, token });
    if (!posted.ok) return setState({ kind: "error" });
    let pool: Profile[];
    try {
      const res = await fetch(`/api/buddies?exclude=${encodeURIComponent(me)}&limit=50`);
      if (!res.ok) throw new Error(String(res.status));
      pool = ((await res.json()) as { profiles: Profile[] }).profiles.filter((p) => p.id !== me);
    } catch {
      return setState({ kind: "error" });
    }
    if (pool.length === 0) return setState({ kind: "done", matches: [], pool: new Map() });
    track("ai.call", { kind: "match" });
    const matched = await postJson<{ matches: Match[] }>("/api/ai/match", { me: profile, pool });
    if (!matched.ok) return setState({ kind: "error" });
    setState({ kind: "done", matches: matched.data.matches, pool: new Map(pool.map((p) => [p.id, p])) });
  };

  return (
    <Section id={`${id}-title`} index={index} title={t("lobby.buddies.title")} lede={t("lobby.buddies.lede")}>
      <div className="flex flex-col gap-8">
      <FeatureGate t={t} state={features} needs={["db", "ai"]} notSetUp={t("lobby.buddies.notSetUp")} onRetry={reloadFeatures}>
        <form onSubmit={submit} className="grid gap-x-5 gap-y-6 sm:grid-cols-2" noValidate>
          <label className={label} htmlFor={`${id}-name`}>
            {t("lobby.buddies.name")}
            <input
              id={`${id}-name`}
              value={shownName}
              onChange={(event) => setName(event.target.value)}
              maxLength={24}
              autoComplete="nickname"
              className={field}
            />
          </label>
          <label className={label} htmlFor={`${id}-interests`}>
            {t("lobby.buddies.interests")}
            <input
              id={`${id}-interests`}
              value={interests}
              onChange={(event) => setInterests(event.target.value)}
              aria-describedby={`${id}-interests-hint`}
              className={field}
            />
            <span id={`${id}-interests-hint`} className="font-body text-xs font-normal tracking-normal normal-case text-muted">
              {t("lobby.buddies.interestsHint")}
            </span>
          </label>
          <label className={cx(label, "sm:col-span-2")} htmlFor={`${id}-wants`}>
            {t("lobby.buddies.wants")}
            <textarea
              id={`${id}-wants`}
              value={wants}
              onChange={(event) => setWants(event.target.value)}
              maxLength={280}
              rows={3}
              className={area}
            />
          </label>
          <p className="max-w-[62ch] text-sm text-muted sm:col-span-2">
            {t("lobby.buddies.privacy")}
            {built.length > 0 ? ` ${t("lobby.buddies.builtNote", { count: built.length })}` : ""}
          </p>
          <div className="sm:col-span-2">
            <Action type="submit" kind="primary" size="lg" disabled={state.kind === "busy"}>
              {state.kind === "busy" ? t("lobby.buddies.finding") : t("lobby.buddies.submit")}
            </Action>
          </div>
        </form>
        <div aria-live="polite" className="flex flex-col gap-4 empty:hidden">
          {state.kind === "missing" ? <Callout tone="warn">{t("lobby.buddies.missing")}</Callout> : null}
          {state.kind === "error" ? <Callout tone="danger">{t("lobby.buddies.failed")}</Callout> : null}
          {state.kind === "done" && state.pool.size === 0 ? <Note>{t("lobby.buddies.alone")}</Note> : null}
          {state.kind === "done" && state.pool.size > 0 && state.matches.length === 0 ? <Note>{t("lobby.buddies.none")}</Note> : null}
          {state.kind === "done" && state.matches.length > 0 ? (
            <>
              <h3 className={eyebrow}>{t("lobby.buddies.matches")}</h3>
              <ul className="grid grid-cols-1 border-t border-rule md:grid-cols-2 md:gap-x-10">
                {state.matches.map((match) => {
                  const buddy = state.pool.get(match.id);
                  const project = titles.get(`${match.suggestedProject.lab}:${match.suggestedProject.id}`);
                  if (!buddy) return null;
                  return (
                    <li key={match.id} className="flex flex-col gap-2 border-b border-rule py-6">
                      <p className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                        <span className="text-2xl font-medium tracking-[-0.02em]">{buddy.name}</span>
                        <span className="font-ui text-sm tabular text-muted">{t("lobby.buddies.score", { score: match.score })}</span>
                      </p>
                      <p className="max-w-[56ch]">{match.why}</p>
                      <p className="text-sm text-muted">{t("lobby.buddies.shared", { interest: match.sharedInterest })}</p>
                      {project ? (
                        <>
                          <p className="mt-2 text-sm font-semibold">{t("lobby.buddies.project", { item: project })}</p>
                          <Action
                            size="sm"
                            className="mt-1 self-start"
                            onClick={() =>
                              setInviting({ match, name: buddy.name, link: createRoom(match.suggestedProject.lab, match.suggestedProject.id, locale) })
                            }
                          >
                            {t("lobby.buddies.invite")}
                          </Action>
                        </>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </>
          ) : null}
        </div>
      </FeatureGate>
      </div>
      {inviting ? (
        <InviteDialog
          open
          onClose={() => setInviting(null)}
          link={inviting.link}
          code={new URL(inviting.link).searchParams.get("room") ?? ""}
          title={t("lobby.buddies.inviteTitle", {
            item: titles.get(`${inviting.match.suggestedProject.lab}:${inviting.match.suggestedProject.id}`) ?? "",
            name: inviting.name,
          })}
          hint={t("lobby.buddies.inviteHint", {
            name: inviting.name,
            item: titles.get(`${inviting.match.suggestedProject.lab}:${inviting.match.suggestedProject.id}`) ?? "",
          })}
          action={{ label: t("lobby.create.go"), run: () => router.push(roomPath(inviting.link)) }}
          t={t}
        />
      ) : null}
    </Section>
  );
}
