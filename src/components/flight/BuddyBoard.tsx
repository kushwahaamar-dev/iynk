"use client";

import { useEffect, useState } from "react";
import { formatNumber } from "@/components/dronelab/text";
import { Button, Chip, EmptyState, Skeleton, Toggle } from "@/components/ui";
import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/namespaces";
import type { Translate } from "@/i18n/translate";
import { getBoard, isSignedOut, lapKey, readOptIn, removeScore, scoresSession, writeOptIn, type Board, type ScoresSession } from "@/server-client/scores";

type View =
  | { kind: "loading" }
  | { kind: "no-server" }
  | { kind: "signed-out" }
  | { kind: "off" }
  | { kind: "failed" }
  | { kind: "board"; board: Board | "none" };

type Props = {
  craftId: string;
  courseId: string;
  courseLabel: string;
  lang: Locale;
  t: Translate<Messages["flight"]>;
  /** Goes up after a lap is sent, so the board is read again. */
  refreshKey: number;
};

/** The buddies board for one course: the person's own time and their buddies', and nobody else's. */
export function BuddyBoard({ craftId, courseId, courseLabel, lang, t, refreshKey }: Props) {
  const key = lapKey(craftId, courseId);
  const [optIn, setOptIn] = useState(false);
  const [session, setSession] = useState<ScoresSession | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [fetched, setFetched] = useState<{ token: string; view: View } | null>(null);
  const token = `${key}|${refreshKey}|${attempt}`;

  useEffect(() => {
    let current = true;
    void scoresSession().then((s) => {
      if (!current) return;
      setOptIn(readOptIn());
      setSession(s);
    });
    return () => {
      current = false;
    };
  }, []);

  const reading = session?.state === "ready" && optIn ? session.client : null;
  useEffect(() => {
    if (!reading) return;
    let current = true;
    const settle = (view: View) => current && setFetched({ token, view });
    getBoard(reading, key).then(
      (board) => settle({ kind: "board", board }),
      (e: unknown) => settle({ kind: isSignedOut(e) ? "signed-out" : "failed" }),
    );
    return () => {
      current = false;
    };
  }, [reading, key, token]);

  let view: View = { kind: "loading" };
  if (session && session.state !== "ready") view = { kind: session.state };
  else if (session && !optIn) view = { kind: "off" };
  else if (fetched?.token === token) view = fetched.view;

  const toggle = (on: boolean) => {
    writeOptIn(on);
    setOptIn(on);
  };

  const remove = async () => {
    if (session?.state !== "ready") return;
    try {
      await removeScore(session.client, key);
      setAttempt((n) => n + 1);
    } catch {
      setFetched({ token, view: { kind: "failed" } });
    }
  };

  const mine = view.kind === "board" && view.board !== "none" && view.board.rows.some((r) => r.you);
  const canChoose = view.kind === "off" || view.kind === "failed" || view.kind === "board";

  return (
    <section aria-labelledby={`fly-board-${craftId}`} className="space-y-3" data-testid="buddy-board">
      <div>
        <h2 id={`fly-board-${craftId}`} className="text-lg">
          {t("board.title")}
        </h2>
        <p className="text-sm text-muted">{courseLabel}</p>
      </div>
      {canChoose ? <Toggle checked={optIn} onChange={toggle} label={t("board.optIn")} description={t("board.optInHint")} /> : null}
      {view.kind === "loading" ? (
        <div className="space-y-2" aria-hidden="true">
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-2/3" />
        </div>
      ) : null}
      {view.kind === "no-server" ? <EmptyState icon="globe" title={t("board.needsServer")} /> : null}
      {view.kind === "signed-out" ? <EmptyState icon="lock" title={t("board.signedOut")} /> : null}
      {view.kind === "failed" ? (
        <Button size="sm" onClick={() => setAttempt((n) => n + 1)}>
          {t("board.retry")}
        </Button>
      ) : null}
      {view.kind === "board" && view.board === "none" ? <p className="text-sm text-muted">{t("board.empty")}</p> : null}
      {view.kind === "board" && view.board !== "none" ? (
        <ol className="divide-y divide-rule">
          {view.board.rows.map((row) => (
            <li key={row.identityId} className="flex items-center gap-3 py-2">
              <span className="tabular w-6 shrink-0 text-sm font-semibold text-muted">
                <span className="sr-only">{t("board.rank", { rank: row.rank })}</span>
                <span aria-hidden="true">{row.rank}</span>
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-semibold">{row.displayName}</span>
              {row.you ? <Chip tone="mint">{t("board.you")}</Chip> : null}
              <span className="tabular font-ui text-sm font-semibold">{formatNumber(lang, row.value / 1000, 2)} s</span>
            </li>
          ))}
        </ol>
      ) : null}
      {mine ? (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted">{t("board.claimed")}</p>
          <Button size="sm" variant="ghost" onClick={remove}>
            {t("board.remove")}
          </Button>
        </div>
      ) : null}
      {view.kind === "board" && view.board !== "none" ? <p className="text-xs text-muted">{t("board.bestOnly")}</p> : null}
    </section>
  );
}
