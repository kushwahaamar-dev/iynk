"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState, type FormEvent } from "react";
import { Section } from "@/components/editorial/Editorial";
import { useTogetherT, type TogetherT } from "@/components/realtime/messages";
import { Button, Callout, Icon, TextInput } from "@/components/ui";
import { useLocale } from "@/i18n/client";
import { createClient, type ServerClient } from "@/server-client/client";
import { idbKeyStore, keySupport, memoryKeyStore, type DeviceKeyStore } from "@/server-client/keys";
import { parseHash } from "@/server-client/links";
import { fetchConfig, probeServer } from "@/server-client/probe";
import {
  blockBuddy,
  idbProfileStore,
  memoryProfileStore,
  openServerDb,
  resolveServerUrl,
  settleLeave,
  type ProfileStore,
  type ServerProfile,
} from "@/server-client/profile";
import { ClientError, EnrolmentClosed, InsecureContext, KeysUnsupported, NeedsEnrolment, ServerUnreachable } from "@/server-client/types";
import type { Buddy, Identity } from "@/server-client/types";
import { BuddyList, type Entry } from "./BuddyList";
import { PairDialog } from "./PairDialog";

const GUIDE_URL = "https://github.com/kushwahaamar-dev/iynk/blob/main/docs/SELF_HOSTING.md";
const REFRESH_MS = 15_000;

type Stage =
  | { kind: "loading" }
  | { kind: "none" }
  | { kind: "insecure" }
  | { kind: "enrol"; closed: boolean; unknown: boolean }
  | { kind: "unreachable"; cache: ServerProfile["buddyCache"] }
  | { kind: "ready"; buddies: Buddy[] };

type Session = { url: string; client: ServerClient };

type PairOpen = { start: "show" | "enter"; input?: string } | null;

function openStores(): { keys: DeviceKeyStore; profile: ProfileStore } {
  if (typeof indexedDB === "undefined") return { keys: memoryKeyStore(), profile: memoryProfileStore() };
  return { keys: idbKeyStore(openServerDb), profile: idbProfileStore(openServerDb) };
}

async function allBuddies(client: ServerClient): Promise<Buddy[]> {
  const items: Buddy[] = [];
  let cursor: string | undefined;
  do {
    const page = await client.listBuddies({ cursor });
    items.push(...page.items);
    cursor = page.nextCursor ?? undefined;
  } while (cursor);
  return items;
}

/** The page address can carry an enrolment code or a pairing link. It is read once and then taken off the address. */
function takeHashAction() {
  const action = parseHash(window.location.hash);
  if (action) window.history.replaceState(null, "", window.location.pathname + window.location.search);
  return action;
}

function Skeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-2 border-y border-rule py-3">
      {[0, 1, 2].map((row) => (
        <div key={row} className="flex items-center gap-3 py-1">
          <div className="size-10 animate-pulse rounded-ink-sm bg-sunken" />
          <div className="h-4 w-40 animate-pulse rounded-ink-sm bg-sunken" />
        </div>
      ))}
    </div>
  );
}

function Plain({ title, children, action }: { title: string; children?: string; action?: React.ReactNode }) {
  return (
    <div className="border-s-2 border-line ps-4">
      <p className="font-semibold">{title}</p>
      {children ? <p className="mt-1 max-w-[60ch] text-muted">{children}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

function EnrolForm({
  t,
  closed,
  initialCode,
  onSubmit,
}: {
  t: TogetherT;
  closed: boolean;
  initialCode: string;
  onSubmit: (a: { code: string; name: string }) => Promise<string | null>;
}) {
  const id = useId();
  const [code, setCode] = useState(initialCode);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setProblem(await onSubmit({ code, name }));
    setBusy(false);
  };

  if (closed) return <Callout tone="warn">{t("buddies.enrol.closed")}</Callout>;
  return (
    <form onSubmit={submit} className="flex max-w-md flex-col gap-4" noValidate>
      <p className="text-sm text-muted">{t("buddies.enrol.help")}</p>
      <TextInput
        id={`${id}-code`}
        label={t("buddies.enrol.code")}
        value={code}
        onChange={(event) => setCode(event.target.value)}
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        aria-invalid={problem !== null}
        aria-describedby={problem ? `${id}-problem` : undefined}
        className="font-ui aria-invalid:border-bad"
      />
      <TextInput
        id={`${id}-name`}
        label={t("buddies.enrol.name")}
        value={name}
        onChange={(event) => setName(event.target.value)}
        autoComplete="nickname"
        maxLength={40}
      />
      {problem ? (
        <p id={`${id}-problem`} role="alert" className="text-sm text-bad">
          {problem}
        </p>
      ) : null}
      <Button type="submit" variant="primary" className="self-start" disabled={busy || !code.trim() || !name.trim()}>
        {t("buddies.enrol.submit")}
      </Button>
    </form>
  );
}

function BuddiesBody({ t }: { t: TogetherT }) {
  const locale = useLocale();
  const [stores] = useState(openStores);
  const [stage, setStage] = useState<Stage>({ kind: "loading" });
  const [session, setSession] = useState<Session | null>(null);
  const [pairing, setPairing] = useState<PairOpen>(null);
  const [welcome, setWelcome] = useState<string | null>(null);
  const [enrolCode, setEnrolCode] = useState("");
  const pendingPair = useRef<string | null>(null);
  const clients = useRef(new Map<string, ServerClient>());
  const hashRead = useRef(false);
  const run = useRef(0);

  const clientFor = useCallback(
    (url: string) => {
      const known = clients.current.get(url) ?? createClient({ base: url, keys: stores.keys });
      clients.current.set(url, known);
      setSession((current) => (current?.url === url ? current : { url, client: known }));
      return known;
    },
    [stores],
  );

  const listFor = useCallback(
    async (client: ServerClient, mine: number): Promise<Stage | null> => {
      try {
        const buddies = await allBuddies(client);
        const profile = await stores.profile.read();
        const items = buddies.map(({ identityId, displayName, alias, color }) => ({ identityId, displayName, alias, color }));
        await stores.profile.write({ ...profile, buddyCache: { at: Date.now(), items } }).catch(() => undefined);
        return mine === run.current ? { kind: "ready", buddies } : null;
      } catch (e) {
        if (mine !== run.current) return null;
        if (e instanceof NeedsEnrolment) return { kind: "enrol", closed: false, unknown: true };
        if (e instanceof ServerUnreachable) return { kind: "unreachable", cache: (await stores.profile.read()).buddyCache };
        throw e;
      }
    },
    [stores],
  );

  const load = useCallback(async () => {
    const mine = ++run.current;
    const next = async (): Promise<Stage | null> => {
      const profile = await settleLeave(stores.profile, stores.keys, Date.now);
      if (!hashRead.current) {
        hashRead.current = true;
        const action = takeHashAction();
        if (action?.kind === "enrol") setEnrolCode(action.code);
        if (action?.kind === "pair") pendingPair.current = action.token;
      }
      const config = await fetchConfig();
      const url = resolveServerUrl(config.ok ? config.config : null, profile);
      if (!url) return { kind: "none" };
      const probe = await probeServer(url);
      if (probe.state === "insecure") return { kind: "insecure" };
      if (probe.state === "unreachable") return { kind: "unreachable", cache: profile.buddyCache };
      const client = clientFor(url);
      const key = await stores.keys.get(url).catch(() => null);
      const enrolled = key !== null && profile.identityId !== null;
      if (!enrolled) {
        return keySupport() === "ok" ? { kind: "enrol", closed: probe.info?.enrollment === "closed", unknown: false } : { kind: "insecure" };
      }
      return listFor(client, mine);
    };
    try {
      const stage = await next();
      if (stage && mine === run.current) setStage(stage);
    } catch {
      if (mine === run.current) setStage({ kind: "unreachable", cache: null });
    }
  }, [stores, clientFor, listFor]);

  useEffect(() => {
    void load();
  }, [load]);

  const ready = stage.kind === "ready";
  useEffect(() => {
    if (!ready || !pendingPair.current) return;
    setPairing({ start: "enter", input: `${window.location.origin}/together#/pair/${pendingPair.current}` });
    pendingPair.current = null;
  }, [ready]);

  const client = session?.client ?? null;

  // Slow refresh of the list, only while this tab is on screen.
  const polling = stage.kind === "ready" || stage.kind === "unreachable";
  useEffect(() => {
    if (!polling) return;
    const tick = () => {
      if (document.visibilityState !== "visible") return;
      void (stage.kind === "unreachable" || !client ? load() : listFor(client, run.current).then((next) => next && setStage(next)));
    };
    const timer = setInterval(tick, REFRESH_MS);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [polling, stage.kind, client, load, listFor]);

  const refresh = useCallback(() => {
    if (client) void listFor(client, run.current).then((next) => next && setStage(next));
  }, [client, listFor]);

  const enrol = useCallback(
    async ({ code, name }: { code: string; name: string }): Promise<string | null> => {
      if (!client) return t("buddies.errors.generic");
      try {
        const identity: Identity = await client.enrol({ code, displayName: name, locale });
        const profile = await stores.profile.read();
        await stores.profile.write({ ...profile, identityId: identity.id, deviceId: identity.deviceId, displayName: identity.displayName });
        setWelcome(t("buddies.joined", { name: identity.displayName }));
        await load();
        return null;
      } catch (e) {
        if (e instanceof EnrolmentClosed) return t("buddies.enrol.closed");
        if (e instanceof InsecureContext || e instanceof KeysUnsupported) return t("buddies.insecure.body");
        if (e instanceof ServerUnreachable) return t("buddies.unreachable");
        if (e instanceof ClientError && (e.status === 401 || e.code === "invalid_enrolment_code")) return t("buddies.enrol.wrongCode");
        return t("buddies.errors.generic");
      }
    },
    [client, stores, t, locale, load],
  );

  const handlers = useMemo(
    () => ({
      onRename: async (buddy: Entry, alias: string) => {
        if (!client) return;
        await client.renameBuddy(buddy.identityId, alias);
        refresh();
      },
      onRemove: async (buddy: Entry) => {
        if (!client) return;
        await client.removeBuddy(buddy.identityId);
        refresh();
      },
      onBlock: async (buddy: Entry) => {
        if (!client) return;
        await blockBuddy(client, stores.profile, buddy.identityId);
        refresh();
      },
    }),
    [client, stores, refresh],
  );

  const open = (start: "show" | "enter") => setPairing({ start });

  const addButtons = (
    <div className="flex flex-wrap gap-2">
      <Button variant="primary" onClick={() => open("show")}>
        {t("buddies.empty.add")}
      </Button>
      <Button variant="secondary" onClick={() => open("enter")}>
        {t("buddies.empty.enter")}
      </Button>
    </div>
  );

  let body: React.ReactNode;
  switch (stage.kind) {
    case "loading":
      body = <Skeleton />;
      break;
    case "none":
      body = (
        <Plain
          title={t("buddies.needsServer.title")}
          action={
            <a href={GUIDE_URL} target="_blank" rel="noreferrer" className="inline-flex items-start gap-2 text-sm font-semibold text-ink underline underline-offset-2">
              <span>{t("buddies.needsServer.guide")}</span>
              <Icon name="external" size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
            </a>
          }
        >
          {t("buddies.needsServer.body")}
        </Plain>
      );
      break;
    case "insecure":
      body = <Plain title={t("buddies.insecure.title")}>{t("buddies.insecure.body")}</Plain>;
      break;
    case "enrol":
      body = (
        <div className="flex flex-col gap-4">
          {stage.unknown ? <Plain title={t("buddies.unknown.title")}>{t("buddies.unknown.body")}</Plain> : null}
          <EnrolForm key={enrolCode} t={t} closed={stage.closed} initialCode={enrolCode} onSubmit={enrol} />
        </div>
      );
      break;
    case "unreachable":
      body = stage.cache && stage.cache.items.length > 0 ? (
        <BuddyList buddies={stage.cache.items} t={t} offlineAsOf={stage.cache.at} {...handlers} />
      ) : (
        <Callout tone="warn" live>
          {t("buddies.unreachable")}
        </Callout>
      );
      break;
    case "ready":
      body =
        stage.buddies.length === 0 ? (
          <Plain title={t("buddies.empty.title")} action={addButtons} />
        ) : (
          <div className="flex flex-col gap-6">
            <BuddyList buddies={stage.buddies} t={t} offlineAsOf={null} {...handlers} />
            {addButtons}
          </div>
        );
      break;
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        {welcome && stage.kind === "ready" ? <Callout tone="success" live>{welcome}</Callout> : null}
        {body}
      </div>
      {pairing && client ? (
        <PairDialog client={client} t={t} start={pairing.start} initialInput={pairing.input} onPaired={refresh} onClose={() => setPairing(null)} />
      ) : null}
    </>
  );
}

/** The Buddies section of the Together page: enrol, pair, and see who is paired. */
export function BuddiesPage() {
  const t = useTogetherT();
  if (!t) return null;
  return (
    <Section id="buddies" title={t("buddies.title")}>
      <BuddiesBody t={t} />
    </Section>
  );
}
