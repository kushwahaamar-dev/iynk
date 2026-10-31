"use client";

import { Callout } from "@/components/ui";
import { WIRE_HEX } from "@/components/boardlab/WireInPanel";
import type { Messages } from "@/i18n/namespaces";
import type { WireRow } from "@/studio/guide/wire";

export interface WireGuideProps {
  rows: WireRow[];
  messages: Messages["studio"];
}

export function WireGuide({ rows, messages }: WireGuideProps) {
  const text = messages.lesson.wire;
  return (
    <section aria-labelledby="wire-guide-title" className="flex flex-col gap-2" data-testid="wire-guide">
      <h3 id="wire-guide-title" className="text-sm font-semibold">
        {text.title}
      </h3>
      {rows.length === 0 ? (
        <p className="text-sm text-muted">{text.none}</p>
      ) : (
        <>
          <p className="text-sm text-muted">{text.lede}</p>
          <ul className="divide-y divide-rule border-y border-rule">
            {rows.map((row) => (
              <li key={row.part} data-part={row.part}>
                <details className="group">
                  <summary className="flex min-h-12 cursor-pointer items-center gap-3 py-2">
                    <span className="min-w-0 flex-1 font-semibold">{row.part}</span>
                    <span className="tabular-nums shrink-0 text-sm text-muted">{text.supply.replace("{volts}", String(row.supplyVolts))}</span>
                  </summary>
                  <div className="flex max-w-[68ch] flex-col gap-3 pb-4">
                    <p className="text-sm">{row.note}</p>
                    <table className="w-full max-w-md text-sm">
                      <thead>
                        <tr className="text-muted">
                          <th scope="col" className="py-1 text-start font-semibold">
                            {text.partPin}
                          </th>
                          <th scope="col" className="py-1 text-start font-semibold">
                            {text.boardPin}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {row.connections.map((c) => (
                          <tr key={`${c.from}-${c.to}`} className="border-t border-rule">
                            <td className="py-1 font-mono">{c.from}</td>
                            <td className="py-1">
                              <span className="flex items-center gap-2 font-mono tabular-nums">
                                <span aria-hidden="true" className="inline-block size-4 shrink-0 rounded-md border border-ink" style={{ background: WIRE_HEX[c.color] }} />
                                {c.to}
                                <span className="font-sans text-muted">{text.colors[c.color]}</span>
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {row.caution && (
                      <Callout tone="warn" title={text.caution}>
                        <p>{row.caution}</p>
                      </Callout>
                    )}
                  </div>
                </details>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
