"use client";

import { useEffect, useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { IconButton } from "@/components/ui/IconButton";
import { Kbd } from "@/components/ui/Kbd";
import type { DroneLabT } from "./text";

type Row = { keys: string; label: string };

function typing(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return el.isContentEditable || el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT";
}

/** The "?" button and dialog listing the Drone Lab keys; "?" opens it from anywhere on the page. */
export function KeyboardHelp({ t, flight = false }: { t: DroneLabT; flight?: boolean }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "?" && !event.ctrlKey && !event.metaKey && !event.altKey && !typing(event.target)) {
        event.preventDefault();
        setOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const workshop: Row[] = [
    { keys: t("keys.keys.question"), label: t("keys.rows.help") },
    { keys: t("keys.keys.f"), label: t("keys.rows.figure") },
    { keys: t("keys.keys.escape"), label: t("keys.rows.leaveFigure") },
    { keys: t("keys.keys.arrowsLr"), label: t("keys.rows.tabs") },
    { keys: t("keys.keys.arrowsUd"), label: t("keys.rows.cliHistory") },
    { keys: t("keys.keys.enter"), label: t("keys.rows.cliRun") },
  ];
  const flying: Row[] = [
    { keys: t("keys.keys.ws"), label: t("keys.rows.throttle") },
    { keys: t("keys.keys.ad"), label: t("keys.rows.yaw") },
    { keys: t("keys.keys.arrows"), label: t("keys.rows.pitchRoll") },
    { keys: t("keys.keys.space"), label: t("keys.rows.arm") },
    { keys: t("keys.keys.r"), label: t("keys.rows.reset") },
    { keys: t("keys.keys.v"), label: t("keys.rows.fpv") },
  ];
  const groups = flight
    ? [
        { title: t("keys.flight"), rows: flying },
        { title: t("keys.workshop"), rows: workshop.slice(0, 1) },
      ]
    : [
        { title: t("keys.workshop"), rows: workshop },
        { title: t("keys.flight"), rows: flying },
      ];

  return (
    <>
      <IconButton
        icon="info"
        label={t("keys.open")}
        variant="raised"
        onClick={() => setOpen(true)}
        aria-keyshortcuts="?"
        data-testid="keys-open"
      />
      <Dialog open={open} onClose={() => setOpen(false)} title={t("keys.title")} closeLabel={t("keys.close")}>
        <div className="space-y-5">
          {groups.map((group) => (
            <section key={group.title}>
              <h3 className="ink-kicker">{group.title}</h3>
              <dl className="mt-2 divide-y divide-rule">
                {group.rows.map((row) => (
                  <div key={row.label} className="flex items-center justify-between gap-4 py-1.5">
                    <dt>
                      <Kbd>{row.keys}</Kbd>
                    </dt>
                    <dd className="text-end text-sm">{row.label}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      </Dialog>
    </>
  );
}
