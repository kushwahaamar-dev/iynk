"use client";

import { useId, useState, type FormEvent } from "react";
import type { TogetherT } from "@/components/realtime/messages";
import { Button, TextInput } from "@/components/ui";
import type { Buddy } from "@/server-client/types";

/** What the list needs of a buddy: the saved copy from an earlier visit has no key, status or room. */
export type Entry = Pick<Buddy, "identityId" | "displayName" | "alias" | "color"> & Partial<Pick<Buddy, "keyThumbprint" | "online" | "activity">>;

type Props = {
  buddies: Entry[];
  t: TogetherT;
  /** Set when the list is the saved copy from an earlier visit: the actions are off. */
  offlineAsOf: number | null;
  onRename: (buddy: Entry, alias: string) => Promise<void>;
  onRemove: (buddy: Entry) => Promise<void>;
  onBlock: (buddy: Entry) => Promise<void>;
};

type Mode = { kind: "rename" } | { kind: "remove" } | { kind: "block" } | null;

const FINGERPRINT_LENGTH = 8;

export const shortThumbprint = (thumbprint: string) => thumbprint.slice(0, FINGERPRINT_LENGTH);

/** The alias wins over the name. Two buddies that read the same get their key fingerprint added. */
export function buddyNames(buddies: Entry[]): Map<string, string> {
  const base = (b: Entry) => b.alias?.trim() || b.displayName;
  const seen = new Map<string, number>();
  for (const b of buddies) seen.set(base(b), (seen.get(base(b)) ?? 0) + 1);
  return new Map(buddies.map((b) => [b.identityId, (seen.get(base(b)) ?? 0) > 1 ? `${base(b)} (${shortThumbprint(b.keyThumbprint ?? b.identityId)})` : base(b)]));
}

function Avatar({ name, color }: { name: string; color?: string }) {
  const swatch = color && /^#[0-9a-f]{6}$/i.test(color) ? color : undefined;
  return (
    <span
      aria-hidden="true"
      style={swatch ? { borderColor: swatch } : undefined}
      className="grid size-10 shrink-0 place-items-center rounded-ink-sm border-2 border-line bg-sunken font-semibold uppercase"
    >
      {Array.from(name)[0]}
    </span>
  );
}

function Row({ buddy, name, t, disabled, reasonId, onRename, onRemove, onBlock }: Omit<Props, "buddies" | "offlineAsOf"> & {
  buddy: Entry;
  name: string;
  disabled: boolean;
  reasonId: string | undefined;
}) {
  const id = useId();
  const [mode, setMode] = useState<Mode>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const close = () => {
    setMode(null);
    setFailed(false);
  };

  const attempt = async (act: () => Promise<void>) => {
    setBusy(true);
    setFailed(false);
    try {
      await act();
      setMode(null);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  const save = (event: FormEvent) => {
    event.preventDefault();
    void attempt(() => onRename(buddy, draft.trim()));
  };

  const status = buddy.activity ? t("buddies.list.inRoom", { code: buddy.activity.roomId }) : buddy.online === true ? t("buddies.list.online") : buddy.online === false ? t("buddies.list.offline") : null;
  const aliased = Boolean(buddy.alias?.trim()) && buddy.alias !== buddy.displayName;
  const guarded = { disabled: disabled || busy, "aria-describedby": disabled ? reasonId : undefined };

  return (
    <li className="flex flex-col gap-3 py-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Avatar name={name} color={buddy.color} />
        <div className="min-w-40 flex-1">
          <p className="truncate font-semibold">{name}</p>
          <p className="truncate text-sm text-muted">
            {[aliased ? buddy.displayName : null, status].filter(Boolean).join(" · ")}
          </p>
        </div>
        {mode === null ? (
          <div className="flex basis-full flex-wrap gap-1 ps-[52px] sm:basis-auto sm:justify-end sm:ps-0">
            <Button
              size="sm"
              variant="ghost"
              {...guarded}
              onClick={() => {
                setDraft(buddy.alias ?? "");
                setMode({ kind: "rename" });
              }}
            >
              {t("buddies.list.rename")}
            </Button>
            <Button size="sm" variant="ghost" {...guarded} onClick={() => setMode({ kind: "remove" })}>
              {t("buddies.list.remove")}
            </Button>
            <Button size="sm" variant="ghost" {...guarded} onClick={() => setMode({ kind: "block" })}>
              {t("buddies.list.block")}
            </Button>
          </div>
        ) : null}
      </div>

      {mode?.kind === "rename" ? (
        <form onSubmit={save} className="flex items-end gap-2 ps-[52px]" noValidate>
          <div className="min-w-0 flex-1">
            <TextInput
              id={`${id}-alias`}
              label={t("buddies.list.rename")}
              value={draft}
              maxLength={40}
              autoFocus
              autoComplete="off"
              placeholder={buddy.displayName}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => event.key === "Escape" && close()}
            />
          </div>
          <Button type="submit" size="md" variant="secondary" disabled={busy}>
            {t("buddies.list.save")}
          </Button>
          <Button size="md" variant="ghost" disabled={busy} onClick={close}>
            {t("buddies.list.cancel")}
          </Button>
        </form>
      ) : null}

      {mode?.kind === "remove" || mode?.kind === "block" ? (
        <div role="group" aria-label={name} className="flex flex-col gap-2 border-s-[1.5px] border-rule ps-3 ms-[52px]">
          <p className="text-sm text-muted">{t(mode.kind === "remove" ? "buddies.list.removeConfirm" : "buddies.list.blockConfirm", { name })}</p>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="danger"
              disabled={busy}
              onClick={() => attempt(() => (mode.kind === "remove" ? onRemove(buddy) : onBlock(buddy)))}
            >
              {t(mode.kind === "remove" ? "buddies.list.remove" : "buddies.list.block")}
            </Button>
            <Button size="sm" variant="ghost" disabled={busy} onClick={close}>
              {t("buddies.list.cancel")}
            </Button>
          </div>
        </div>
      ) : null}

      {failed ? (
        <p role="alert" className="ps-[52px] text-sm text-bad">
          {t("buddies.errors.generic")}
        </p>
      ) : null}
    </li>
  );
}

export function BuddyList({ buddies, t, offlineAsOf, onRename, onRemove, onBlock }: Props) {
  const reasonId = useId();
  const names = buddyNames(buddies);
  const offline = offlineAsOf !== null;
  return (
    <div className="flex flex-col gap-2">
      {offline ? (
        <p id={reasonId} className="text-sm text-muted">
          {t("buddies.unreachable")} {t("buddies.list.asOf", { time: new Date(offlineAsOf).toLocaleString() })}
        </p>
      ) : null}
      <ul className="divide-y divide-rule border-y border-rule">
        {buddies.map((buddy) => (
          <Row
            key={buddy.identityId}
            buddy={buddy}
            name={names.get(buddy.identityId) ?? buddy.displayName}
            t={t}
            disabled={offline}
            reasonId={offline ? reasonId : undefined}
            onRename={onRename}
            onRemove={onRemove}
            onBlock={onBlock}
          />
        ))}
      </ul>
    </div>
  );
}
