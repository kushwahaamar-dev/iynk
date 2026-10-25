"use client";

import { useRouter } from "next/navigation";
import { useId, useMemo, useState, type FormEvent } from "react";
import type { LabKind } from "@/components/dock/types";
import { useTogetherT, type TogetherT } from "@/components/realtime/messages";
import { Button, Callout, Card, SegmentedControl, Select, TextInput } from "@/components/ui";
import { useLocale } from "@/i18n/client";
import { useFeatures } from "@/lib/features";
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
      className="flex flex-1 flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (chosen) router.push(roomPath(createRoom(chosen.lab, chosen.id, locale)));
      }}
    >
      {labs.length > 1 ? (
        <SegmentedControl
          label={t("lobby.create.lab")}
          stretch
          options={labs.map((value) => ({ value, label: t(`labs.${value}`) }))}
          value={lab}
          onChange={(value) => {
            setLab(value);
            setItemId("");
          }}
        />
      ) : null}
      <Select id={`${id}-item`} label={t("lobby.create.item")} value={chosen?.id ?? ""} onChange={(event) => setItemId(event.target.value)}>
        {inLab.map((item) => (
          <option key={item.id} value={item.id}>
            {item.title}
          </option>
        ))}
      </Select>
      <Button type="submit" variant="primary" className="mt-auto self-start" disabled={!chosen}>
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
    <form onSubmit={submit} className="flex flex-1 flex-col gap-4" noValidate>
      <TextInput
        id={`${id}-code`}
        label={t("panel.joinLabel")}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={t("panel.joinPlaceholder")}
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        aria-invalid={state.kind === "bad"}
        className="font-ui aria-invalid:border-bad"
      />
      <div aria-live="polite" className="empty:hidden">
        {message ? <Callout tone={message.tone}>{message.text}</Callout> : null}
      </div>
      <Button type="submit" className="mt-auto self-start" disabled={state.kind === "looking"}>
        {t("lobby.join.go")}
      </Button>
    </form>
  );
}

/** The /together lobby: start or join a room, Build Buddies and the Build Night planner. */
export function Lobby({ items }: { items: LobbyItem[] }) {
  const t = useTogetherT()!;
  const { status, features } = useFeatures();
  const titles = useMemo(() => new Map(items.map((item) => [`${item.lab}:${item.id}`, item.title])), [items]);
  // Both tools below need the AI service: without it they are one line, not two cards that say "not set up".
  const aiOff = status === "ready" && !features.ai;

  return (
    <div className="mt-10 flex flex-col gap-10 lg:mt-12 lg:gap-12">
      {/* grid-cols-1 keeps the one phone column at the page width; an implicit column grows to the widest select option. */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:gap-6">
        <Card as="section" aria-labelledby="together-start" className="flex flex-col gap-4">
          <div>
            <h2 id="together-start" className="text-2xl">
              {t("lobby.create.title")}
            </h2>
            <p className="mt-1 text-sm text-muted">{t("lobby.create.hint")}</p>
          </div>
          <StartRoom items={items} t={t} />
        </Card>
        <Card as="section" aria-labelledby="together-join" className="flex flex-col gap-4">
          <div>
            <h2 id="together-join" className="text-2xl">
              {t("lobby.join.title")}
            </h2>
            <p className="mt-1 text-sm text-muted">{t("lobby.join.hint")}</p>
          </div>
          <JoinRoom t={t} />
        </Card>
      </div>
      {aiOff ? (
        <Callout variant="quiet">{t("lobby.aiOff")}</Callout>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:gap-6 xl:grid-cols-2">
          <Buddies t={t} titles={titles} />
          <Planner t={t} titles={titles} />
        </div>
      )}
    </div>
  );
}
