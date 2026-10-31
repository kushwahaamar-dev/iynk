import type { Text, WireColor } from "@/project/generated/types";
import type { WireablesExt } from "@/project/guided/plan";

export interface WireRow {
  part: string;
  supplyVolts: number;
  note: string;
  caution: string | null;
  connections: { from: string; to: string; color: WireColor }[];
  /** Every signal pin of the part is one of the lesson's pins. */
  forLesson: boolean;
}

const POWER_PIN = /^(GND\d*|5V|3V3|3\.3V|VIN|VCC|VBUS|VSYS|IOREF|AREF)$/i;

const say = (text: Text, locale: string): string => (typeof text === "string" ? text : (text[locale] ?? text.en));

/** The wire-it rows the converter kept for this lesson, with their texts in the learner's language. */
export function wireRows(ext: WireablesExt | undefined, guidePins: string[], locale: string): WireRow[] {
  const used = new Set(guidePins);
  return (ext?.items ?? []).map((item) => {
    const signals = item.connections.map((c) => c.to).filter((to) => !POWER_PIN.test(to));
    return {
      part: item.part,
      supplyVolts: item.supplyVolts,
      note: say(item.note, locale),
      caution: item.caution === undefined ? null : say(item.caution, locale),
      connections: item.connections.map((c) => ({ ...c })),
      forLesson: signals.length > 0 && signals.every((to) => used.has(to)),
    };
  });
}
