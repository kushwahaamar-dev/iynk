export type NoticeId = "SN-1" | "SN-2" | "SN-3" | "SN-4" | "SN-5" | "SN-6" | "SN-7" | "SN-8";

export type Placement = "builder" | "bench" | "fly" | "first-flight" | "export" | "trace" | "comparison" | "autopilot";

export type Trigger = { kind: "always" } | { kind: "has-battery" } | { kind: "autonomous" } | { kind: "auw-over"; grams: number };

export interface SafetyNotice {
  id: NoticeId;
  topic: string;
  /** Key in the `drone` namespace. */
  text_key: string;
  trigger: Trigger;
  placement: readonly Placement[];
  source_label: "EXTERNAL" | "HYPOTHESIS" | "iynk statement";
}

export interface NoticeContext {
  hasBattery: boolean;
  auwG: number;
  autonomous: boolean;
}

const ALL_PLACEMENTS: readonly Placement[] = ["builder", "bench", "fly", "first-flight", "export", "trace", "comparison", "autopilot"];

export const NOTICES: readonly SafetyNotice[] = [
  { id: "SN-1", topic: "Lithium battery hazards", text_key: "notice.SN-1", trigger: { kind: "has-battery" }, placement: ["builder", "export", "first-flight"], source_label: "HYPOTHESIS" },
  { id: "SN-2", topic: "Propeller injury", text_key: "notice.SN-2", trigger: { kind: "always" }, placement: ["bench", "first-flight"], source_label: "HYPOTHESIS" },
  { id: "SN-3", topic: "High-current electrical systems", text_key: "notice.SN-3", trigger: { kind: "always" }, placement: ["bench", "export", "first-flight"], source_label: "HYPOTHESIS" },
  { id: "SN-4", topic: "Flight stability", text_key: "notice.SN-4", trigger: { kind: "always" }, placement: ["fly", "trace"], source_label: "iynk statement" },
  { id: "SN-5", topic: "Physical testing", text_key: "notice.SN-5", trigger: { kind: "always" }, placement: ["first-flight", "export"], source_label: "HYPOTHESIS" },
  { id: "SN-6", topic: "Operational regulations", text_key: "notice.SN-6", trigger: { kind: "always" }, placement: ["first-flight", "export"], source_label: "EXTERNAL" },
  { id: "SN-7", topic: "Autonomous control limits", text_key: "notice.SN-7", trigger: { kind: "autonomous" }, placement: ["autopilot", "export"], source_label: "iynk statement" },
  { id: "SN-8", topic: "Not certification", text_key: "notice.SN-8", trigger: { kind: "always" }, placement: ALL_PLACEMENTS, source_label: "iynk statement" },
];

/** The notices on the first-flight panel besides SN-8. */
export const FIRST_FLIGHT: readonly NoticeId[] = ["SN-1", "SN-2", "SN-3", "SN-5", "SN-6"];

function triggered(trigger: Trigger, ctx: NoticeContext): boolean {
  switch (trigger.kind) {
    case "always":
      return true;
    case "has-battery":
      return ctx.hasBattery;
    case "autonomous":
      return ctx.autonomous;
    case "auw-over":
      return ctx.auwG > trigger.grams;
  }
}

/** The notices that apply at a placement, SN-8 first. */
export function noticesFor(p: Placement, ctx: NoticeContext): SafetyNotice[] {
  const shown = NOTICES.filter((n) => n.placement.includes(p) && triggered(n.trigger, ctx));
  return [...shown.filter((n) => n.id === "SN-8"), ...shown.filter((n) => n.id !== "SN-8")];
}

/** Words that over-claim about a design (DA-14). */
export const BANNED_WORDS: readonly RegExp[] = [/\bsafe to fly\b/i, /\bcertif/i, /\bvalidat/i, /\bguarantee/i, /\bapprov/i];

/** The text of every banned match in `text`. */
export function bannedHits(text: string): string[] {
  return BANNED_WORDS.flatMap((re) => text.match(new RegExp(re.source, "gi")) ?? []);
}
