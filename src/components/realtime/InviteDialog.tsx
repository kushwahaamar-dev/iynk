"use client";

import { useEffect, useId, useState } from "react";
import { Button, Dialog, IconButton, InlineStatus, Skeleton, TextInput } from "@/components/ui";
import type { TogetherT } from "./messages";

type Qr = { size: number; path: string } | "error" | null;

/** One SVG path for the dark modules, so the code stays crisp at any size. */
async function drawQr(text: string): Promise<{ size: number; path: string }> {
  const { create } = await import("qrcode");
  const { modules } = create(text, { errorCorrectionLevel: "M" });
  let path = "";
  for (let row = 0; row < modules.size; row += 1) {
    for (let col = 0; col < modules.size; col += 1) {
      if (modules.get(row, col)) path += `M${col} ${row}h1v1h-1z`;
    }
  }
  return { size: modules.size, path };
}

export function QrCode({ text, label, t }: { text: string; label: string; t: TogetherT }) {
  const [qr, setQr] = useState<{ text: string; value: Qr }>({ text: "", value: null });

  useEffect(() => {
    let live = true;
    drawQr(text).then(
      (value) => live && setQr({ text, value }),
      () => live && setQr({ text, value: "error" }),
    );
    return () => {
      live = false;
    };
  }, [text]);

  const value = qr.text === text ? qr.value : null;
  if (value === "error") return <p className="text-sm text-bad">{t("bar.qrError")}</p>;
  return (
    <div className="plate mx-auto w-full max-w-60 p-3">
      {value ? (
        <svg role="img" aria-label={label} viewBox={`-2 -2 ${value.size + 4} ${value.size + 4}`} className="block aspect-square w-full text-ink-fixed" shapeRendering="crispEdges">
          <path d={value.path} fill="currentColor" />
        </svg>
      ) : (
        <Skeleton className="aspect-square w-full" />
      )}
    </div>
  );
}

/** The room link to share: QR code, copy and the system share sheet. */
export function InviteDialog({
  open,
  onClose,
  link,
  title,
  hint,
  code,
  action,
  t,
}: {
  open: boolean;
  /** A main button next to Copy, such as "Open the room" in the lobby. */
  action?: { label: string; run: () => void };
  onClose: () => void;
  link: string;
  title: string;
  hint: string;
  code: string;
  t: TogetherT;
}) {
  const id = useId();
  const [copy, setCopy] = useState<"idle" | "done" | "failed">("idle");
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopy("done");
    } catch {
      setCopy("failed");
    }
  };

  const share = async () => {
    try {
      await navigator.share({ title: t("bar.shareText", { code }), url: link });
    } catch {
      // Dismissed: nothing to report.
    }
  };

  return (
    <Dialog
      open={open}
      onClose={() => {
        setCopy("idle");
        onClose();
      }}
      title={title}
      description={hint}
      closeLabel={t("bar.close")}
      size="sm"
    >
      <div className="flex flex-col gap-3">
        <QrCode text={link} label={t("bar.qr", { code })} t={t} />
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <TextInput
              id={`${id}-link`}
              label={t("bar.invite")}
              hideLabel
              readOnly
              value={link}
              onFocus={(event) => event.currentTarget.select()}
              className="text-xs"
            />
          </div>
          <IconButton label={t("bar.copy")} icon={copy === "done" ? "check" : "copy"} variant="solid" onClick={copyLink} />
        </div>
        <div className="flex flex-wrap gap-2">
          {action ? (
            <Button variant="primary" onClick={action.run}>
              {action.label}
            </Button>
          ) : null}
          {canShare ? <Button variant={action ? "secondary" : "primary"} onClick={share}>{t("bar.share")}</Button> : null}
        </div>
        <div className="min-h-6">
          {copy === "done" ? (
            <InlineStatus tone="good" live>
              {t("bar.copied")}
            </InlineStatus>
          ) : copy === "failed" ? (
            <InlineStatus tone="bad" live>
              {t("bar.copyFailed")}
            </InlineStatus>
          ) : null}
        </div>
      </div>
    </Dialog>
  );
}
