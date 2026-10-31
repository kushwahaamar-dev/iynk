import { Callout, Chip } from "@/components/ui";
import type { Messages } from "@/i18n/namespaces";
import type { Translate } from "@/i18n/translate";
import { logError } from "@/lib/telemetry";
import { NOTICES, type NoticeId, type SafetyNotice as NoticeData } from "@/sim/flight/notices";

export type DroneT = Translate<Messages["drone"]>;

const LABEL_KEY = {
  EXTERNAL: "notice.sourceLabel.external",
  HYPOTHESIS: "notice.sourceLabel.hypothesis",
  "iynk statement": "notice.sourceLabel.iynk",
} as const satisfies Record<NoticeData["source_label"], Parameters<DroneT>[0]>;

function noticeText(notice: NoticeData, t: DroneT): string {
  try {
    return t(notice.text_key as Parameters<DroneT>[0]);
  } catch {
    logError("drone.notice", `missing string ${notice.text_key}`);
    return notice.text_key;
  }
}

/** One lab safety reminder with where its wording comes from. */
export function SafetyNotice({ id, t }: { id: NoticeId; t: DroneT }) {
  const notice = NOTICES.find((n) => n.id === id);
  if (!notice) return null;
  return (
    <Callout tone={notice.source_label === "iynk statement" ? "note" : "warn"}>
      <p className="text-pretty">{noticeText(notice, t)}</p>
      <Chip className="mt-2">{t(LABEL_KEY[notice.source_label])}</Chip>
    </Callout>
  );
}
