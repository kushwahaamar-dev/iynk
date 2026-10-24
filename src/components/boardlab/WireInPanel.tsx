"use client";

import { useId, useState } from "react";
import { FigureFrame } from "@/components/figure";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { Dialog } from "@/components/ui/Dialog";
import { MODULE_IDS } from "@/content/ids";
import type { WireColor, Wireable } from "@/content/schema";
import { useText } from "./text";

export const WIRE_HEX: Record<WireColor, string> = {
  red: "#d64a3a",
  black: "#231e16",
  orange: "#f0a53a",
  yellow: "#f4d03f",
  green: "#3f8a4f",
  blue: "#2a56a3",
  white: "#f7f4ec",
  purple: "#7b4fa0",
  brown: "#8a5a3b",
  grey: "#8e8a84",
};

export function WireDot({ color }: { color: WireColor }) {
  return <span aria-hidden="true" className="inline-block size-3 shrink-0 rounded-full border border-ink" style={{ background: WIRE_HEX[color] }} />;
}

const isModule = (part: string) => (MODULE_IDS as readonly string[]).includes(part);

/** The sensors and actuators this board can drive, with the real pin-to-pin wiring and level cautions. */
export function WireInPanel({ wireables }: { wireables: Wireable[] }) {
  const { t, tc, has } = useText();
  const id = useId();
  const [inspect, setInspect] = useState<string | null>(null);
  if (wireables.length === 0) return null;
  const partName = (part: string) => t(`parts.${part}` as Parameters<typeof t>[0]);

  return (
    <section aria-labelledby={`${id}-title`} className="ink-card p-3 sm:p-4" data-testid="wire-panel">
      <h3 id={`${id}-title`} className="text-lg">
        {t("wire.title")}
      </h3>
      <p className="mt-1 text-sm text-muted">{t("wire.lede")}</p>
      <ul className="mt-3 flex flex-col gap-3">
        {wireables.map((w) => (
          <li key={w.part} className="rounded-md border-2 border-line p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="me-auto font-semibold">{partName(w.part)}</span>
              <span className="text-sm text-muted">{t("wire.supply", { volts: w.supplyVolts })}</span>
              {/* Wraps: "Examinar Sensor capacitivo de humedad del suelo" is wider than a phone. "!" beats Button's nowrap. */}
              <Button size="sm" variant="secondary" className="max-w-full !whitespace-normal" onClick={() => setInspect(w.part)}>
                {t("wire.inspect", { part: partName(w.part) })}
              </Button>
            </div>
            <p className="mt-1 text-sm">{tc(w.note)}</p>
            <table className="mt-2 w-full text-sm">
              <thead>
                <tr className="text-start text-muted">
                  <th scope="col" className="py-1 text-start font-semibold">
                    {t("wire.partPin")}
                  </th>
                  <th scope="col" className="py-1 text-start font-semibold">
                    {t("wire.boardPin")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {w.connections.map((c) => (
                  <tr key={`${c.from}-${c.to}`} className="border-t border-rule">
                    <td className="py-1 font-mono">{c.from}</td>
                    <td className="py-1">
                      <span className="flex items-center gap-2 font-mono">
                        <WireDot color={c.color} />
                        {c.to}
                        <span className="sr-only">{t("wire.wire", { color: t(`wire.colors.${c.color}`) })}</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {has(w.caution) && (
              <Callout tone="warn" title={t("wire.caution")} className="mt-2">
                <p>{tc(w.caution)}</p>
              </Callout>
            )}
          </li>
        ))}
      </ul>
      <Dialog open={inspect !== null} onClose={() => setInspect(null)} title={inspect ? t("wire.inspectTitle", { part: partName(inspect) }) : ""} closeLabel={t("wire.close")} size="lg">
        {inspect && (
          <FigureFrame
            src={`/figures/${isModule(inspect) ? "modules" : "parts"}/${inspect}.html`}
            title={t("wire.inspectTitle", { part: partName(inspect) })}
          />
        )}
      </Dialog>
    </section>
  );
}
