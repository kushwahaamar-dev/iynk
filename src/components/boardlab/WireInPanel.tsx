"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { FigureFrame } from "@/components/figure";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { Dialog } from "@/components/ui/Dialog";
import { Icon } from "@/components/ui/icons";
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

const POWER_PIN = /^(GND\d*|5V|3V3|3\.3V|VIN|VCC|VBUS|VSYS|IOREF|AREF)$/i;

/** The parts a lesson wires: every signal pin of the part is one of the lesson's pins. */
export function lessonWireables(wireables: Wireable[], pins: string[]): Wireable[] {
  const used = new Set(pins);
  return wireables.filter((w) => {
    const signals = w.connections.map((c) => c.to).filter((to) => !POWER_PIN.test(to));
    return signals.length > 0 && signals.every((to) => used.has(to));
  });
}

type Props = {
  wireables: Wireable[];
  /** On a lesson: the parts open by default, and a link to the board page that lists them all. */
  all?: { href: string; label: string };
};

/** The sensors and actuators this board can drive: one row each, opening to the real pin-to-pin wiring and level cautions. */
export function WireInPanel({ wireables, all }: Props) {
  const { t, tc, has } = useText();
  const id = useId();
  const [inspect, setInspect] = useState<string | null>(null);
  if (wireables.length === 0 && !all) return null;
  const partName = (part: string) => t(`parts.${part}` as Parameters<typeof t>[0]);

  return (
    <section aria-labelledby={`${id}-title`} className="flex flex-col gap-2" data-testid="wire-panel">
      {/* On the board page a tab already names it. */}
      <h2 id={`${id}-title`} className={all ? "font-head text-2xl" : "sr-only"}>
        {t("wire.title")}
      </h2>
      <p className="text-sm text-muted">{t("wire.lede")}</p>
      <ul className="mt-1 divide-y-[1.5px] divide-rule border-y-[1.5px] border-rule">
        {wireables.map((w) => (
          <li key={w.part} data-part={w.part}>
            <details className="group" open={!!all}>
              <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 py-2 [&::-webkit-details-marker]:hidden">
                <Icon name="chevron-right" size={16} aria-hidden="true" className="shrink-0 text-muted transition-transform group-open:rotate-90" />
                <span className="min-w-0 flex-1 font-semibold">{partName(w.part)}</span>
                <span className="tabular shrink-0 text-sm text-muted">{t("wire.supply", { volts: w.supplyVolts })}</span>
              </summary>
              <div className="flex max-w-[68ch] flex-col gap-3 pb-4 ps-7">
                <p className="text-sm">{tc(w.note)}</p>
                <table className="w-full max-w-md text-sm">
                  <thead>
                    <tr className="text-muted">
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
                  <Callout tone="warn" title={t("wire.caution")}>
                    <p>{tc(w.caution)}</p>
                  </Callout>
                )}
                {/* Wraps: "Examinar Sensor capacitivo de humedad del suelo" is wider than a phone. */}
                <Button size="sm" variant="secondary" className="self-start" onClick={() => setInspect(w.part)}>
                  {t("wire.inspect", { part: partName(w.part) })}
                </Button>
              </div>
            </details>
          </li>
        ))}
      </ul>
      {all && (
        <Link href={all.href} className="inline-flex min-h-11 items-center gap-1 self-start text-sm font-semibold">
          {all.label}
          <Icon name="chevron-right" size={16} aria-hidden="true" />
        </Link>
      )}
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
