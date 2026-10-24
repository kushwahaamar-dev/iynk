"use client";

import { useRouter } from "next/navigation";
import { useId, useMemo, useState, type FormEvent } from "react";
import type { LabKind } from "@/components/dock/types";
import { useTogetherT, type TogetherT } from "@/components/realtime/messages";
import { Button, Callout, Card, SegmentedControl } from "@/components/ui";
import { useLocale } from "@/i18n/client";
import { createRoom, parseRoomInput, probeRoom, roomLink, type ProbeResult } from "@/lib/realtime";
import { roomPath } from "./api";
import { Buddies } from "./Buddies";
import { Planner } from "./Planner";
import type { LobbyItem } from "./strings";

const LABS: LabKind[] = ["board", "robotics", "drone"];

function StartRoom({ items, t }: { items: LobbyItem[]; t: TogetherT }) {
  const id = useId();
  const router = useRouter();
  const locale = useLocale();
  const labs = LABS.filter((lab) => items.some((item) => item.lab === lab));
  const [lab, setLab] = useState<LabKind>(labs[0] ?? "board");
  const inLab = items.filter((item) => item.lab === lab);
  const [itemId, setItemId] = useState("");
  const chosen = inLab.find((item) => item.id === itemId) ?? inLab[0];

  if (items.length === 0) return <p className="text-sm text-muted">{t("lobby.create.empty")}</p>;

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (chosen) router.push(roomPath(createRoom(chosen.lab, chosen.id, locale)));
      }}
    >
      {labs.length > 1 ? (
        <SegmentedControl
          label={t("lobby.create.lab")}
          options={labs.map((value) => ({ value, label: t(`labs.${value}`) }))}
          value={lab}
          onChange={(value) => {
            setLab(value);
            setItemId("");
          }}
        />
      ) : null}
      <label htmlFor={`${id}-item`} className="flex flex-col gap-1 text-sm font-bold">
        {t("lobby.create.item")}
        <select
          id={`${id}-item`}
          value={chosen?.id ?? ""}
          onChange={(event) => setItemId(event.target.value)}
          className="min-h-11 rounded-ink-sm border-2 border-line bg-surface px-2 font-body text-base font-normal text-ink"
        >
          {inLab.map((item) => (
            <option key={item.id} value={item.id}>
              {item.title}
            </option>
          ))}
        </select>
      </label>
      <Button type="submit" variant="primary" className="self-start" disabled={!chosen}>
        {t("lobby.create.go")}
      </Button>
    </form>
  );
}

type JoinState = { kind: "idle" } | { kind: "bad" } | { kind: "looking"; code: string } | { kind: "result"; code: string; result: ProbeResult };

function JoinRoom({ t }: { t: TogetherT }) {
  const id = useId();
  const router = useRouter();
  const locale = useLocale();
  const [value, setValue] = useState("");
  const [state, setState] = useState<JoinState>({ kind: "idle" });

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const code = parseRoomInput(value);
    if (!code) return setState({ kind: "bad" });
    setState({ kind: "looking", code });
    const result = await probeRoom(code, locale);
    setState({ kind: "result", code, result });
    if (result.kind === "found") router.push(roomPath(roomLink(code, result.lab, result.itemId, locale)));
  };

  const message = (() => {
    if (state.kind === "bad") return { tone: "warn" as const, text: t("panel.badCode") };
    if (state.kind === "looking") return { tone: "note" as const, text: t("lobby.join.looking", { code: state.code }) };
    if (state.kind !== "result") return null;
    const { code, result } = state;
    switch (result.kind) {
      case "found":
        return { tone: "success" as const, text: t("lobby.join.found") };
      case "empty":
        return { tone: "note" as const, text: t("lobby.join.empty", { code }) };
      case "full":
        return { tone: "warn" as const, text: t("lobby.join.full", { code }) };
      case "unknown-item":
        return { tone: "warn" as const, text: t("lobby.join.unknown", { code }) };
      case "unavailable":
        return { tone: "warn" as const, text: t("lobby.join.unavailable") };
      case "timeout":
        return { tone: "warn" as const, text: t("lobby.join.timeout", { code }) };
    }
  })();

  return (
    <form onSubmit={submit} className="flex flex-col gap-2" noValidate>
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
          aria-invalid={state.kind === "bad"}
          className="min-h-11 min-w-0 flex-1 rounded-ink-sm border-2 border-line bg-surface px-3 font-ui text-base text-ink aria-invalid:border-bad"
        />
        <Button type="submit" disabled={state.kind === "looking"}>
          {t("lobby.join.go")}
        </Button>
      </div>
      <div aria-live="polite">{message ? <Callout tone={message.tone}>{message.text}</Callout> : null}</div>
    </form>
  );
}

/** The /together lobby: start or join a room, Build Buddies and the Build Night planner. */
export function Lobby({ items }: { items: LobbyItem[] }) {
  const t = useTogetherT()!;
  const titles = useMemo(() => new Map(items.map((item) => [`${item.lab}:${item.id}`, item.title])), [items]);

  return (
    <div className="mt-10 flex flex-col gap-8">
      <div className="grid gap-6 md:grid-cols-2">
        <Card as="section" aria-labelledby="together-start" className="flex flex-col gap-3">
          <h2 id="together-start" className="text-xl">
            {t("lobby.create.title")}
          </h2>
          <p className="text-sm text-muted">{t("lobby.create.hint")}</p>
          <StartRoom items={items} t={t} />
        </Card>
        <Card as="section" aria-labelledby="together-join" className="flex flex-col gap-3">
          <h2 id="together-join" className="text-xl">
            {t("lobby.join.title")}
          </h2>
          <p className="text-sm text-muted">{t("lobby.join.hint")}</p>
          <JoinRoom t={t} />
        </Card>
      </div>
      <Buddies t={t} titles={titles} />
      <Planner t={t} titles={titles} />
    </div>
  );
}
