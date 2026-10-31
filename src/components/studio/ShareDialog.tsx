"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { QrCode } from "@/components/realtime";
import { useTogetherT } from "@/components/realtime/messages";
import { Button, Callout, Dialog, IconButton, InlineStatus, Select, Skeleton, TextInput, Toggle } from "@/components/ui";
import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/namespaces";
import type { Translate } from "@/i18n/translate";
import {
  createShare,
  describeShareError,
  listShares,
  revokeShare,
  type BlobReader,
  type ShareAudience,
  type ShareErrorKind,
  type ShareView,
} from "@/collab/share";
import type { Project } from "@/project/generated/types";
import { scanSecrets } from "@/project/secret-scan";
import type { ServerClient } from "@/server-client/client";
import { noticeFor } from "@/studio/provenance-notice";
import { UncheckedNotice } from "./UncheckedNotice";

export type StudioRooms = Messages["studio"]["rooms"];

type Props = {
  open: boolean;
  onClose: () => void;
  doc: Project;
  lang: Locale;
  t: Translate<StudioRooms>;
  /** The signed in client, or null when there is no server. */
  client: ServerClient | null;
  readBlob: BlobReader;
  /** The studio strings for the unreviewed text notice. Without them a link share goes out with no notice. */
  studio?: Messages["studio"];
};

type Server = "checking" | "none" | "ready";
type Stage = { kind: "form" } | { kind: "notice"; count: number } | { kind: "creating" } | { kind: "done"; link: string; mismatch: boolean };
type Shares = { kind: "loading" } | { kind: "failed" } | { kind: "ready"; items: ShareView[] };

const PRESET_DAYS = [7, 30, 90, 365] as const;
const NEVER = "never";
const LIVE_LIMIT = 20;

function expiryChoice(value: string) {
  if (value === NEVER) return { kind: "never" } as const;
  if (value === "30") return { kind: "default" } as const;
  return { kind: "days", days: Number(value) } as const;
}

export function ShareDialog({ open, onClose, doc, lang, t, client, readBlob, studio }: Props) {
  const id = useId();
  const together = useTogetherT();
  const hits = useMemo(() => scanSecrets(doc), [doc]);
  const [probed, setProbed] = useState<Server>("checking");
  const [stage, setStage] = useState<Stage>({ kind: "form" });
  const [shares, setShares] = useState<Shares>({ kind: "loading" });
  const [audience, setAudience] = useState<ShareAudience>("link");
  const [expiry, setExpiry] = useState("30");
  const [allowFork, setAllowFork] = useState(true);
  const [label, setLabel] = useState("");
  const [checked, setChecked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copy, setCopy] = useState<"idle" | "done" | "failed">("idle");
  const [confirming, setConfirming] = useState<string | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());

  useEffect(() => {
    if (!open || client === null) return;
    let live = true;
    client.probe().then(
      (info) => live && setProbed(info.features.shares ? "ready" : "none"),
      () => live && setProbed("none"),
    );
    listShares(client).then(
      (items) => live && setShares({ kind: "ready", items }),
      () => live && setShares({ kind: "failed" }),
    );
    return () => {
      live = false;
    };
  }, [open, client]);

  const close = () => {
    setStage({ kind: "form" });
    setChecked(false);
    setError(null);
    setCopy("idle");
    setConfirming(null);
    setIdempotencyKey(crypto.randomUUID());
    onClose();
  };

  const server = client === null ? "none" : probed;
  const blocked = hits.length > 0 && !checked;

  const errorText = (kind: ShareErrorKind): string => {
    if (kind === "liveLimit") return t("share.liveLimit", { count: LIVE_LIMIT });
    const keys = {
      needs_server: "share.needsServer",
      tooLarge: "share.tooLarge",
      secret: "share.secretWarning",
      expiry: "share.expiryError",
      network: "share.networkError",
    } as const;
    return t(keys[kind]);
  };

  const review = () => {
    const { show, count } = noticeFor(doc, "share-beyond-buddies");
    if (studio && audience === "link" && show) setStage({ kind: "notice", count });
    else void create();
  };

  const create = async () => {
    if (client === null) return;
    setStage({ kind: "creating" });
    setError(null);
    try {
      const made = await createShare(
        client,
        doc,
        { audience, expiry: expiryChoice(expiry), allowFork, label: label.trim() || undefined },
        { readBlob, lang, origin: window.location.origin, idempotencyKey },
      );
      setStage({ kind: "done", link: made.link, mismatch: !made.hashMatches });
      setIdempotencyKey(crypto.randomUUID());
      setShares((current) => (current.kind === "ready" ? { kind: "ready", items: [made.share, ...current.items] } : current));
    } catch (e) {
      setError(errorText(describeShareError(e)));
      setStage({ kind: "form" });
    }
  };

  const revoke = async (shareId: string) => {
    if (client === null) return;
    try {
      await revokeShare(client, shareId);
      const now = new Date().toISOString();
      setShares((current) => (current.kind === "ready" ? { kind: "ready", items: current.items.map((s) => (s.id === shareId ? { ...s, revokedAt: now } : s)) } : current));
    } catch {
      setError(t("share.networkError"));
    }
    setConfirming(null);
  };

  const copyLink = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      setCopy("done");
    } catch {
      setCopy("failed");
    }
  };

  const when = (iso: string) => new Intl.DateTimeFormat(lang, { dateStyle: "medium" }).format(new Date(iso));

  return (
    <Dialog open={open} onClose={close} title={t("share.title")} closeLabel={t("share.close")}>
      {server === "none" ? (
        <Callout tone="note">{t("share.needsServer")}</Callout>
      ) : stage.kind === "notice" && studio ? (
        <UncheckedNotice
          count={stage.count}
          action="share-beyond-buddies"
          messages={studio}
          lang={lang}
          continueLabel={t("share.create")}
          onCancel={() => setStage({ kind: "form" })}
          onContinue={() => void create()}
        />
      ) : stage.kind === "done" ? (
        <div className="flex flex-col gap-3">
          <InlineStatus tone="good" live>
            {t("share.done")}
          </InlineStatus>
          {stage.mismatch ? <Callout tone="danger">{t("share.hashMismatch")}</Callout> : null}
          {together ? <QrCode text={stage.link} label={t("share.linkQr")} t={together} /> : <Skeleton className="mx-auto aspect-square w-full max-w-60" />}
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <TextInput label={t("share.copy")} hideLabel readOnly value={stage.link} onFocus={(event) => event.currentTarget.select()} className="text-xs" />
            </div>
            <IconButton label={t("share.copy")} icon={copy === "done" ? "check" : "copy"} variant="solid" onClick={() => copyLink(stage.link)} />
          </div>
          <div className="min-h-6">
            {copy === "done" ? (
              <InlineStatus tone="good" live>
                {t("share.copied")}
              </InlineStatus>
            ) : copy === "failed" ? (
              <InlineStatus tone="bad" live>
                {t("share.copyFailed")}
              </InlineStatus>
            ) : null}
          </div>
          <Button variant="secondary" onClick={() => setStage({ kind: "form" })}>
            {t("share.yourShares")}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <Select label={t("share.audienceLabel")} value={audience} onChange={(event) => setAudience(event.target.value as ShareAudience)}>
            <option value="link">{t("share.audienceLink")}</option>
            <option value="buddies">{t("share.audienceBuddies")}</option>
          </Select>
          <Select label={t("share.expiryLabel")} value={expiry} onChange={(event) => setExpiry(event.target.value)}>
            {PRESET_DAYS.map((days) => (
              <option key={days} value={days}>
                {days === 30 ? t("share.expiry30") : t("share.expiryDays", { count: days })}
              </option>
            ))}
            <option value={NEVER}>{t("share.expiryNone")}</option>
          </Select>
          <TextInput label={t("share.labelField")} maxLength={60} value={label} onChange={(event) => setLabel(event.target.value)} />
          <Toggle label={t("share.allowFork")} checked={allowFork} onChange={setAllowFork} />
          {audience === "link" ? <Callout tone="warn">{t("share.linkWarning")}</Callout> : null}
          {hits.length > 0 ? (
            <Callout tone="danger">
              <p>{t("share.secretWarning")}</p>
              <ul className="mt-2 list-disc ps-4">
                {hits.map((hit) => (
                  <li key={`${hit.field}:${hit.rule}`}>{t("share.secretField", { field: hit.field })}</li>
                ))}
              </ul>
              <Toggle className="mt-2" label={t("share.secretAck")} checked={checked} onChange={setChecked} />
            </Callout>
          ) : null}
          {error ? (
            <InlineStatus tone="bad" live>
              {error}
            </InlineStatus>
          ) : null}
          <Button variant="primary" disabled={blocked || stage.kind === "creating" || server !== "ready"} aria-busy={stage.kind === "creating"} onClick={review}>
            {t("share.create")}
          </Button>
          <section aria-labelledby={`${id}-list`} className="flex flex-col gap-2 border-t border-rule pt-4">
            <h3 id={`${id}-list`} className="text-base font-semibold">
              {t("share.yourShares")}
            </h3>
            {shares.kind === "loading" ? (
              <Skeleton className="h-12 w-full" />
            ) : shares.kind === "failed" ? (
              <InlineStatus tone="bad">{t("share.loadError")}</InlineStatus>
            ) : shares.items.length === 0 ? (
              <p className="text-sm text-muted">{t("share.noShares")}</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {shares.items.map((share) => (
                  <li key={share.id} className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{share.label ?? (share.audience === "link" ? t("share.audienceLink") : t("share.audienceBuddies"))}</p>
                      <p className="text-sm text-muted tabular-nums">
                        {share.revokedAt !== null
                          ? t("share.revokedRow")
                          : share.expiresAt === null
                            ? t("share.expiryNone")
                            : t("share.expiresOn", { when: when(share.expiresAt) })}
                        {" · "}
                        {t("share.opened", { count: share.opens })}
                      </p>
                    </div>
                    {share.revokedAt !== null ? null : confirming === share.id ? (
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{t("share.confirmRevoke")}</span>
                        <Button size="sm" variant="danger" onClick={() => revoke(share.id)}>
                          {t("share.revoke")}
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => setConfirming(null)}>
                          {t("share.keep")}
                        </Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="secondary" onClick={() => setConfirming(share.id)}>
                        {t("share.revoke")}
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </Dialog>
  );
}
