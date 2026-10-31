"use client";

import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";
import type { LabKind } from "@/components/dock/types";
import { useTogetherT, type TogetherT } from "@/components/realtime/messages";
import { eyebrow, sectionTitle } from "@/components/editorial/Editorial";
import { Button, Callout, SegmentedControl, Select, TextInput } from "@/components/ui";
import { cx } from "@/components/ui/cx";
import { useLocale } from "@/i18n/client";
import { createRoom, parseRoomInput, probeRoom, roomLink, type ProbeResult } from "@/lib/realtime";
import { roomPath } from "./api";
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
          className="border! border-muted/60!"
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
        error={state.kind === "bad" ? t("panel.badCode") : undefined}
      />
      <div aria-live="polite" className="empty:hidden">
        {message ? <Callout tone={message.tone}>{message.text}</Callout> : null}
      </div>
      <Button type="submit" variant="secondary" className="mt-auto self-start" disabled={state.kind === "looking"}>
        {t("lobby.join.go")}
      </Button>
    </form>
  );
}

/** The lobby's lede. */
export function LobbyLede({ className }: { className?: string }) {
  const t = useTogetherT()!;
  return <p className={className}>{t("lobby.ledePlain")}</p>;
}

/** The /together lobby: start or join a room. */
export function Lobby({ items }: { items: LobbyItem[] }) {
  const t = useTogetherT()!;

  return (
    // grid-cols-1 keeps the one phone column at the page width; an implicit column grows to the widest select option.
    <div className="mt-16 md:mt-24 grid grid-cols-1 border-t border-rule md:grid-cols-2">
      <section aria-labelledby="together-start" className="flex flex-col gap-6 pt-6 pb-10 sm:pt-8 md:pe-6 lg:pe-16">
        <RoomHead id="together-start" index="01" title={t("lobby.create.title")} hint={t("lobby.create.hint")} />
        <StartRoom items={items} t={t} />
      </section>
      <section
        aria-labelledby="together-join"
        className="flex flex-col gap-6 border-t border-rule pt-6 pb-10 sm:pt-8 md:border-t-0 md:border-s md:ps-6 lg:ps-16"
      >
        <RoomHead id="together-join" index="02" title={t("lobby.join.title")} hint={t("lobby.join.hint")} />
        <JoinRoom t={t} />
      </section>
    </div>
  );
}

function RoomHead({ id, index, title, hint }: { id: string; index: string; title: string; hint: string }) {
  return (
    <div>
      <p className={cx(eyebrow, "tabular")} aria-hidden="true">
        {index}
      </p>
      <h2 id={id} className={cx(sectionTitle, "mt-4")}>
        {title}
      </h2>
      <p className="mt-3 max-w-prose text-muted">{hint}</p>
    </div>
  );
}
