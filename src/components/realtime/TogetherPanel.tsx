"use client";

import { useId, useState, type FormEvent } from "react";
import type { LabDockProps } from "@/components/dock/types";
import { Button, Callout } from "@/components/ui";
import { useLocale } from "@/i18n/client";
import { parseRoomInput, RoomProvider, useTogether, type Together } from "@/lib/realtime";
import { ChatPanel } from "./ChatPanel";
import { IdentityForm } from "./IdentityForm";
import { useTogetherT, type TogetherT } from "./messages";
import { RoomBar } from "./RoomBar";

function JoinForm({ t, onJoin }: { t: TogetherT; onJoin: (id: string) => void }) {
  const id = useId();
  const [value, setValue] = useState("");
  const [bad, setBad] = useState(false);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const room = parseRoomInput(value);
    if (!room) return setBad(true);
    setBad(false);
    onJoin(room);
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-1" noValidate>
      <label htmlFor={`${id}-code`} className="text-sm font-bold">
        {t("panel.joinLabel")}
      </label>
      <div className="flex gap-2">
        <input
          id={`${id}-code`}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={t("panel.joinPlaceholder")}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          aria-invalid={bad}
          aria-describedby={bad ? `${id}-error` : undefined}
          className="min-h-11 min-w-0 flex-1 rounded-ink-sm border-2 border-line bg-surface px-3 font-ui text-sm text-ink aria-invalid:border-bad"
        />
        <Button type="submit">{t("panel.join")}</Button>
      </div>
      {bad ? (
        <p id={`${id}-error`} className="text-sm text-bad">
          {t("panel.badCode")}
        </p>
      ) : null}
    </form>
  );
}

function PanelBody({ together, t }: { together: Together; t: TogetherT }) {
  const locale = useLocale();
  const [renaming, setRenaming] = useState(false);
  const { room, roomId, identity, transport } = together;

  if (transport === null) return <Callout tone="warn">{t("panel.unavailable")}</Callout>;

  if (roomId && !identity) {
    return <IdentityForm t={t} initial={null} submitLabel={t("identity.save")} />;
  }

  if (room && room.status !== "ended") {
    if (renaming) {
      return (
        <IdentityForm t={t} initial={identity} submitLabel={t("identity.saveOnly")} onDone={() => setRenaming(false)} onCancel={() => setRenaming(false)} />
      );
    }
    if (room.status === "connecting") {
      return (
        <p role="status" className="text-sm text-muted">
          {t("panel.connecting", { code: room.id })}
        </p>
      );
    }
    return (
      <div className="flex flex-col gap-4">
        <RoomBar room={room} t={t} onLeave={together.leave} />
        <ChatPanel room={room} t={t} locale={locale} />
        <Button size="sm" variant="ghost" className="self-start" onClick={() => setRenaming(true)}>
          {t("identity.rename")}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {together.ended ? (
        <Callout tone={together.ended === "removed" ? "warn" : "note"} live>
          {t(`panel.ended.${together.ended}`)}
        </Callout>
      ) : null}
      <p className="text-sm">{t("panel.intro")}</p>
      <Button variant="primary" className="self-start" onClick={together.start}>
        {together.ended ? t("panel.again") : t("panel.start")}
      </Button>
      <JoinForm t={t} onJoin={together.join} />
      {transport === "broadcast" ? <p className="text-xs text-muted">{t("panel.localOnly")}</p> : null}
    </div>
  );
}

function Panel({ t }: { t: TogetherT }) {
  const together = useTogether();
  if (!together) return null;
  return <PanelBody together={together} t={t} />;
}

/**
 * The Together tab of LabDock: start or join a room, who's here, the keyboard
 * baton, invite and chat. Inside a lab page's RoomProvider it uses that room;
 * on its own it brings one, so the tab works before the page is wrapped.
 */
export function TogetherPanel<S, A extends { type: string }>({ lab, itemId, store }: LabDockProps<S, A>) {
  const t = useTogetherT();
  const outer = useTogether();
  if (!t) return <div aria-busy="true" className="h-40 animate-pulse rounded-ink border-2 border-line bg-sunken" />;
  const body = (
    <section aria-label={t("panel.title")}>
      <Panel t={t} />
    </section>
  );
  if (outer && outer.lab === lab && outer.itemId === itemId) return body;
  return (
    <RoomProvider lab={lab} itemId={itemId} store={store}>
      {body}
    </RoomProvider>
  );
}
