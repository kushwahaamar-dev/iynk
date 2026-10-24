"use client";

import { useEffect, useId, useState } from "react";
import { Button, Dialog } from "@/components/ui";
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
    <div className="ink-plate mx-auto w-full max-w-60 rounded-ink border-2 border-line p-3">
      {value ? (
        <svg role="img" aria-label={label} viewBox={`-2 -2 ${value.size + 4} ${value.size + 4}`} className="block aspect-square w-full text-ink-fixed" shapeRendering="crispEdges">
          <path d={value.path} fill="currentColor" />
        </svg>
      ) : (
        <div className="aspect-square w-full animate-pulse rounded-ink-sm bg-mono-200" aria-hidden="true" />
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
        <label htmlFor={`${id}-link`} className="sr-only">
          {t("bar.invite")}
        </label>
        <input
          id={`${id}-link`}
          readOnly
          value={link}
          onFocus={(event) => event.currentTarget.select()}
          className="min-h-11 w-full rounded-ink-sm border-2 border-line bg-sunken px-3 font-ui text-xs text-ink"
        />
        <div className="flex flex-wrap gap-2">
          {action ? (
            <Button variant="primary" onClick={action.run}>
              {action.label}
            </Button>
          ) : null}
          <Button variant={action ? "secondary" : "primary"} onClick={copyLink}>
            {t("bar.copy")}
          </Button>
          {canShare ? <Button onClick={share}>{t("bar.share")}</Button> : null}
        </div>
        <p role="status" className="min-h-5 text-sm text-muted">
          {copy === "done" ? t("bar.copied") : copy === "failed" ? t("bar.copyFailed") : ""}
        </p>
      </div>
    </Dialog>
  );
}
