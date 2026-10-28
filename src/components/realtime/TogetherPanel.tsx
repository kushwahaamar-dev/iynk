"use client";

import { useState, type FormEvent } from "react";
import type { LabDockProps } from "@/components/dock/types";
import { Button, Callout, InlineStatus, Skeleton, SkeletonGroup, TextInput } from "@/components/ui";
import { useCommonT, useLocale } from "@/i18n/client";
import { useFeatures } from "@/lib/features";
import { parseRoomInput, RoomProvider, useTogether, type Together } from "@/lib/realtime";
import { ChatPanel } from "./ChatPanel";
import { IdentityForm } from "./IdentityForm";
import { useTogetherT, type TogetherT } from "./messages";
import { RoomBar } from "./RoomBar";

function JoinForm({ t, onJoin }: { t: TogetherT; onJoin: (id: string) => void }) {
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
    <form onSubmit={submit} className="flex max-w-xs flex-col gap-2" noValidate>
      <TextInput
        label={t("panel.joinLabel")}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={t("panel.joinPlaceholder")}
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        error={bad ? t("panel.badCode") : undefined}
      />
      <Button type="submit" className="self-start">
        {t("panel.join")}
      </Button>
    </form>
  );
}

function PanelBody({ together, t }: { together: Together; t: TogetherT }) {
  const locale = useLocale();
  const [renaming, setRenaming] = useState(false);
  const { room, roomId, identity, transport } = together;
  const { status, features } = useFeatures();
  // Chat translation runs on the AI service; without it the intro doesn't promise it.
  const translates = status !== "ready" || features.ai;

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
        <InlineStatus tone="info" live>
          {t("panel.connecting", { code: room.id })}
        </InlineStatus>
      );
    }
    return (
      <div className="flex flex-col gap-4">
        <RoomBar room={room} t={t} onLeave={together.leave} onRename={() => setRenaming(true)} />
        <ChatPanel room={room} t={t} locale={locale} />
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
      <p className="text-sm text-pretty">{translates ? t("panel.intro") : t("panel.introPlain")}</p>
      <Button variant="primary" className="self-start" onClick={together.start}>
        {together.ended ? t("panel.again") : t("panel.start")}
      </Button>
      <JoinForm t={t} onJoin={together.join} />
      {transport === "broadcast" ? <InlineStatus tone="info">{t("panel.localOnly")}</InlineStatus> : null}
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
  const common = useCommonT();
  const outer = useTogether();
  if (!t) {
    return (
      <SkeletonGroup label={common("state.loading")} className="flex flex-col gap-2">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-24" />
      </SkeletonGroup>
    );
  }
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
