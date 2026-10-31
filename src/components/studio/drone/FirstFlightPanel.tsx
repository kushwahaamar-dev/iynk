"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui";
import { readAck } from "@/studio/drone/ack";
import { FIRST_FLIGHT } from "@/sim/flight/notices";
import { SafetyNotice, type DroneT } from "./SafetyNotice";

/** The "before you fly" reminders. Reading them never gates simulating or exporting. */
export function FirstFlightPanel({ t, onAck, acked }: { t: DroneT; onAck(): void; acked: boolean }) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), []);
  const date = acked ? readAck()?.slice(0, 10) : undefined;

  return (
    <section aria-labelledby="first-flight-title" className="flex flex-col gap-3">
      <h2 id="first-flight-title" ref={heading} tabIndex={-1} className="text-lg font-semibold text-balance outline-none">
        {t("notice.title")}
      </h2>
      <SafetyNotice id="SN-8" t={t} />
      {FIRST_FLIGHT.map((id) => (
        <SafetyNotice key={id} id={id} t={t} />
      ))}
      {acked ? (
        <p className="text-sm text-muted tabular-nums">{t("notice.acked", { date: date ?? "" })}</p>
      ) : (
        <Button variant="primary" className="self-start" onClick={onAck}>
          {t("notice.ack")}
        </Button>
      )}
    </section>
  );
}
