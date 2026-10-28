"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { QrCode } from "@/components/realtime/InviteDialog";
import type { TogetherT } from "@/components/realtime/messages";
import { Button, Dialog, Tabs, TextInput } from "@/components/ui";
import { parsePairingCode } from "@/protocol/identity";
import type { ServerClient } from "@/server-client/client";
import { parseHash, pairLink } from "@/server-client/links";
import { ClientError, ServerUnreachable } from "@/server-client/types";
import type { Buddy, PairingCreated, PairingPeek, PairingRef } from "@/server-client/types";
import { shortThumbprint } from "./BuddyList";

const WATCH_MS = 3000;
const TICK_MS = 1000;

type Tab = "show" | "enter";

type Props = {
  client: ServerClient;
  t: TogetherT;
  start: Tab;
  /** A code or a pairing link to open on, such as one from the page address. */
  initialInput?: string;
  /** The server has a new buddy for this person. */
  onPaired: () => void;
  onClose: () => void;
};

/** Pairing codes and links are both secrets; the person can paste either. */
export function readPairingInput(raw: string): PairingRef | null {
  const hash = raw.indexOf("#");
  const link = hash === -1 ? null : parseHash(raw.slice(hash));
  if (link?.kind === "pair") return { token: link.token };
  return parsePairingCode(raw) ? { code: raw.trim() } : null;
}

const visible = () => document.visibilityState === "visible";

function formatLeft(ms: number): string {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function Joined({ buddy, t }: { buddy: Buddy; t: TogetherT }) {
  return (
    <div role="status" className="flex flex-col gap-1">
      <p className="font-semibold">{t("buddies.pair.joined", { name: buddy.alias?.trim() || buddy.displayName })}</p>
      <p className="tabular font-ui text-sm text-muted">{t("buddies.pair.fingerprint", { fingerprint: shortThumbprint(buddy.keyThumbprint) })}</p>
    </div>
  );
}

function ShowCode({ client, t, onJoined }: { client: ServerClient; t: TogetherT; onJoined: (buddy: Buddy) => void }) {
  const id = useId();
  const [created, setCreated] = useState<PairingCreated | null>(null);
  const [round, setRound] = useState(0);
  const [now, setNow] = useState(Date.now);
  const [copy, setCopy] = useState<"idle" | "done" | "failed">("idle");
  const [failed, setFailed] = useState(false);
  const joined = useRef(onJoined);
  useEffect(() => {
    joined.current = onJoined;
  });

  // A new code each round: the first, and again whenever the last one runs out.
  useEffect(() => {
    let live = true;
    let made: PairingCreated | null = null;
    client.createPairing().then(
      (pairing) => {
        made = pairing;
        if (live) {
          setCreated(pairing);
          setNow(Date.now());
        } else void client.revokePairing(pairing.id).catch(() => undefined);
      },
      () => live && setFailed(true),
    );
    return () => {
      live = false;
      if (made) void client.revokePairing(made.id).catch(() => undefined);
    };
  }, [client, round]);

  const expiresAt = created ? Date.parse(created.codeExpiresAt ?? created.expiresAt) : null;
  const left = expiresAt === null ? null : expiresAt - now;

  useEffect(() => {
    if (expiresAt === null) return;
    const timer = setInterval(() => {
      const time = Date.now();
      setNow(time);
      if (time >= expiresAt) {
        setCreated(null);
        setRound((r) => r + 1);
      }
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [expiresAt]);

  // Watching for the other person: the server has no push, so it is a slow poll, and none while the tab is hidden.
  useEffect(() => {
    if (!created) return;
    let live = true;
    const look = async () => {
      if (!visible()) return;
      try {
        const mine = (await client.listPairings()).items.find((p) => p.id === created.id);
        if (!live || mine?.status !== "redeemed") return;
        const buddy = (await client.listBuddies()).items.find((b) => b.identityId === mine.redeemedBy);
        if (live && buddy) joined.current(buddy);
      } catch {
        // The next round tries again; an offline server shows on the page behind.
      }
    };
    const timer = setInterval(() => void look(), WATCH_MS);
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, [client, created]);

  if (failed) return <p role="alert" className="text-sm text-bad">{t("buddies.errors.generic")}</p>;
  if (!created || left === null) {
    return <div aria-busy="true" className="h-64 animate-pulse rounded-ink-sm bg-sunken" />;
  }

  const link = pairLink(window.location.origin, created.token);
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopy("done");
    } catch {
      setCopy("failed");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="ink-label">{t("buddies.pair.code")}</p>
        <p data-testid="pair-code" className="tabular mt-1 select-all font-ui text-4xl font-semibold tracking-[0.12em]">
          {created.code}
        </p>
        <p className="tabular mt-2 text-sm text-muted">{t("buddies.pair.expires", { time: formatLeft(left) })}</p>
      </div>
      <QrCode text={link} label={t("buddies.pair.qr")} t={t} />
      <div className="flex flex-col gap-1">
        <label htmlFor={`${id}-link`} className="sr-only">
          {t("buddies.pair.link")}
        </label>
        <input
          id={`${id}-link`}
          readOnly
          value={link}
          onFocus={(event) => event.currentTarget.select()}
          className="min-h-11 w-full rounded-ink-sm border-2 border-line bg-sunken px-3 font-ui text-xs text-ink"
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="primary" onClick={copyLink}>
          {t("buddies.pair.copy")}
        </Button>
        <p role="status" className="text-sm text-muted">
          {copy === "done" ? t("buddies.pair.copied") : copy === "failed" ? t("buddies.errors.generic") : ""}
        </p>
      </div>
    </div>
  );
}

type Entering =
  | { kind: "idle" }
  | { kind: "busy" }
  | { kind: "error"; text: string }
  | { kind: "peeked"; ref: PairingRef; peek: PairingPeek };

function EnterCode({ client, t, initialInput, onJoined }: { client: ServerClient; t: TogetherT; initialInput?: string; onJoined: (buddy: Buddy) => void }) {
  const id = useId();
  const [value, setValue] = useState(initialInput ?? "");
  const [state, setState] = useState<Entering>({ kind: "idle" });
  const asked = useRef(false);

  const explain = (e: unknown): string => {
    if (e instanceof ServerUnreachable) return t("buddies.unreachable");
    if (e instanceof ClientError) {
      if (e.status === 404 || e.status === 400) return t("buddies.pair.wrong");
      if (e.status === 429) return t("buddies.pair.tooMany");
      if (e.code === "already_paired") return t("buddies.pair.already");
      if (e.code === "quota") return t("buddies.pair.full");
    }
    return t("buddies.errors.generic");
  };

  const look = async (text: string) => {
    const ref = readPairingInput(text);
    if (!ref) return setState({ kind: "error", text: t("buddies.pair.wrong") });
    setState({ kind: "busy" });
    try {
      setState({ kind: "peeked", ref, peek: await client.peekPairing(ref) });
    } catch (e) {
      setState({ kind: "error", text: explain(e) });
    }
  };

  useEffect(() => {
    if (!initialInput || asked.current) return;
    asked.current = true;
    void look(initialInput);
    // Runs once, for the link the page was opened with.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void look(value);
  };

  const accept = async (ref: PairingRef) => {
    setState({ kind: "busy" });
    try {
      onJoined(await client.redeemPairing(ref));
    } catch (e) {
      setState({ kind: "error", text: explain(e) });
    }
  };

  const busy = state.kind === "busy";
  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={submit} className="flex flex-col gap-3" noValidate>
        <TextInput
          id={`${id}-code`}
          label={t("buddies.pair.enterLabel")}
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            if (state.kind !== "idle") setState({ kind: "idle" });
          }}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          placeholder="XXXX-XXXXXX"
          aria-invalid={state.kind === "error"}
          aria-describedby={state.kind === "error" ? `${id}-problem` : undefined}
          className="font-ui aria-invalid:border-bad"
        />
        {state.kind !== "peeked" ? (
          <Button type="submit" variant="primary" disabled={busy || !value.trim()} className="self-start">
            {t("buddies.empty.enter")}
          </Button>
        ) : null}
      </form>
      {state.kind === "error" ? (
        <p id={`${id}-problem`} role="alert" className="text-sm text-bad">
          {state.text}
        </p>
      ) : null}
      {state.kind === "peeked" ? (
        <div role="status" className="flex flex-col gap-3 border-s-[1.5px] border-rule ps-3">
          <p className="font-semibold">{t("buddies.pair.peekFrom", { name: state.peek.from.displayName })}</p>
          <Button variant="primary" className="self-start" onClick={() => void accept(state.ref)}>
            {t("buddies.pair.accept")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

/** Pairing in one place: show a code to a friend, or type the one they showed. */
export function PairDialog({ client, t, start, initialInput, onPaired, onClose }: Props) {
  const [tab, setTab] = useState<Tab>(start);
  const [joined, setJoined] = useState<Buddy | null>(null);

  const done = (buddy: Buddy) => {
    setJoined(buddy);
    onPaired();
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title={t("buddies.pair.title")}
      closeLabel={t("bar.close")}
      size="sm"
      footer={
        joined ? (
          <Button variant="primary" onClick={onClose}>
            {t("bar.close")}
          </Button>
        ) : (
          <Button variant="ghost" onClick={onClose}>
            {tab === "show" ? t("buddies.pair.cancel") : t("buddies.list.cancel")}
          </Button>
        )
      }
    >
      {joined ? (
        <Joined buddy={joined} t={t} />
      ) : (
        <Tabs
          label={t("buddies.pair.title")}
          value={tab}
          onChange={(id) => setTab(id as Tab)}
          tabs={[
            { id: "show", label: t("buddies.pair.show"), content: tab === "show" ? <ShowCode client={client} t={t} onJoined={done} /> : null },
            { id: "enter", label: t("buddies.pair.enterCode"), content: <EnterCode client={client} t={t} initialInput={initialInput} onJoined={done} /> },
          ]}
        />
      )}
    </Dialog>
  );
}
