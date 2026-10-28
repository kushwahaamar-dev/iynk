"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Callout, type CalloutTone } from "@/components/ui/Callout";
import { TextInput } from "@/components/ui/Field";
import { Icon } from "@/components/ui/icons";
import { useCommonT } from "@/i18n/client";
import { createClient } from "@/server-client/client";
import { idbKeyStore, memoryKeyStore } from "@/server-client/keys";
import { fetchConfig, probeServer, type ServerProbe } from "@/server-client/probe";
import {
  emptyProfile,
  idbProfileStore,
  leaveServer,
  memoryProfileStore,
  openServerDb,
  parseServerAddress,
  resolveServerUrl,
  settleLeave,
  type ServerProfile,
} from "@/server-client/profile";

const GUIDE_URL = "https://github.com/kushwahaamar-dev/iynk/blob/main/docs/SELF_HOSTING.md";
const HOUR_MS = 3_600_000;

type View = {
  profile: ServerProfile;
  url: string | null;
  /** null while the probe runs. */
  probe: ServerProbe | null;
  enrolled: boolean;
  hoursLeft: number | null;
};

type Line = { tone: CalloutTone; text: string };

function openStores() {
  if (typeof indexedDB === "undefined") return { keys: memoryKeyStore(), profile: memoryProfileStore() };
  return { keys: idbKeyStore(openServerDb), profile: idbProfileStore(openServerDb) };
}

/** Server settings: where this browser's server is, whether it answers, and the way out of it. */
export function ServerPanel() {
  const t = useCommonT();
  const ids = useId();
  const [stores] = useState(openStores);
  const [view, setView] = useState<View | null>(null);
  const [draft, setDraft] = useState<string | null>(null);
  const [problem, setProblem] = useState<"invalid" | "insecure" | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const run = useRef(0);

  const refresh = useCallback(async () => {
    const mine = ++run.current;
    const current = () => mine === run.current;
    const profile = await settleLeave(stores.profile, stores.keys, Date.now).catch(emptyProfile);
    const config = await fetchConfig();
    const url = resolveServerUrl(config.ok ? config.config : null, profile);
    const hoursLeft = profile.leaving ? Math.max(1, Math.ceil((profile.leaving.effectiveAt - Date.now()) / HOUR_MS)) : null;
    if (!current()) return;
    setView({ profile, url, probe: null, enrolled: false, hoursLeft });
    if (!url) return;
    const [probe, key] = await Promise.all([probeServer(url), stores.keys.get(url).catch(() => null)]);
    if (!current()) return;
    setView({ profile, url, probe, enrolled: key !== null && profile.identityId !== null, hoursLeft });
  }, [stores]);

  useEffect(() => {
    void refresh();
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh]);

  const serverUrl = view?.url ?? null;
  const client = useMemo(() => (serverUrl ? createClient({ base: serverUrl, keys: stores.keys }) : null), [serverUrl, stores]);

  if (!view) return null;
  const { profile, url, probe, enrolled, hoursLeft } = view;
  const ready = probe?.state === "ready";
  const crossOrigin = url !== null && url !== window.location.origin;

  let line: Line;
  if (!url) line = { tone: "note", text: t("server.status.off") };
  else if (!probe) line = { tone: "note", text: t("server.status.checking") };
  else if (probe.state === "insecure") line = { tone: "warn", text: t("server.status.insecure") };
  else if (probe.upgradeRequired) line = { tone: "warn", text: t("server.status.upgrade") };
  else if (probe.state === "unreachable") line = { tone: "warn", text: t("server.status.unreachable") };
  else line = { tone: "success", text: t("server.status.ready") };

  let enrolment: string | null = null;
  if (ready && !enrolled) enrolment = t(probe.info?.enrollment === "closed" ? "server.status.closed" : "server.status.needsEnrol");
  else if (ready) enrolment = t("server.enrolled");

  const showHint = probe?.state === "unreachable" && !probe.upgradeRequired && crossOrigin;
  const statusId = `${ids}-status`;

  async function saveAddress(event: FormEvent) {
    event.preventDefault();
    const text = (draft ?? "").trim();
    let next: string | null = null;
    if (text) {
      const parsed = parseServerAddress(text);
      if (!parsed.ok) {
        setProblem(parsed.problem);
        return;
      }
      next = parsed.url;
    }
    setProblem(null);
    setDraft(null);
    await stores.profile.write({ ...profile, url: next }).catch(() => undefined);
    await refresh();
  }

  async function leave() {
    if (!client) return;
    setBusy(true);
    setFailed(false);
    try {
      await leaveServer(client, stores.profile, stores.keys, Date.now);
      setConfirming(false);
      await refresh();
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    await client?.signOut().catch(() => undefined);
  }

  return (
    <section aria-labelledby={`${ids}-title`} className="flex flex-col gap-3 border-t-[1.5px] border-rule pt-4">
      <h3 id={`${ids}-title`} className="ink-label">
        {t("server.title")}
      </h3>

      <form onSubmit={saveAddress} className="flex items-end gap-2" noValidate>
        <div className="min-w-0 flex-1">
          <TextInput
            label={t("server.address")}
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            placeholder="https://iynk.example"
            value={draft ?? url ?? ""}
            onChange={(event) => setDraft(event.target.value)}
            aria-invalid={problem !== null}
            aria-describedby={problem ? `${ids}-problem` : undefined}
          />
        </div>
        <Button type="submit" size="md" variant="secondary" disabled={draft === null}>
          {t("keys.save")}
        </Button>
      </form>
      {problem ? (
        <p id={`${ids}-problem`} role="alert" className="text-sm text-bad">
          {t(problem === "insecure" ? "server.status.insecure" : "server.addressInvalid")}
        </p>
      ) : null}

      <div id={statusId} className="flex flex-col gap-1">
        <Callout variant="quiet" tone={line.tone} live>
          {line.text}
        </Callout>
        {showHint ? <p className="ps-6 text-sm text-muted">{t("server.status.unreachableHint")}</p> : null}
        {enrolment ? <p className="ps-6 text-sm text-muted">{enrolment}</p> : null}
      </div>

      {!url ? (
        <a
          href={GUIDE_URL}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-start gap-2 text-sm font-semibold text-ink underline underline-offset-2"
        >
          <span>{t("server.guide")}</span>
          <Icon name="external" size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
        </a>
      ) : null}

      {hoursLeft !== null ? <p className="text-sm text-muted">{t("server.leave.grace", { hours: hoursLeft })}</p> : null}

      {enrolled && hoursLeft === null ? (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" disabled={!ready} onClick={signOut} aria-describedby={statusId}>
              {t("server.signOut")}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={!ready}
              aria-expanded={confirming}
              aria-describedby={statusId}
              onClick={() => setConfirming((open) => !open)}
            >
              {t("server.leave.title")}
            </Button>
          </div>
          {confirming ? (
            <div className="flex flex-col gap-2 border-s-[1.5px] border-rule ps-3">
              <p className="text-sm text-muted">{t("server.leave.body")}</p>
              {failed ? (
                <p role="alert" className="text-sm text-bad">
                  {t("server.status.unreachable")}
                </p>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="danger" disabled={busy || !ready} onClick={leave}>
                  {t("server.leave.confirm")}
                </Button>
                <Button size="sm" variant="ghost" disabled={busy} onClick={() => setConfirming(false)}>
                  {t("server.leave.cancel")}
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
