import type { RunKind } from "./runlog";
import { sha256 } from "./hash";

// Skill ids are the on-chain names of what a credential proves (H6). The
// program caps them at 64 bytes and hashes them as sha256(utf8(skill_id)).

export const MAX_SKILL_ID_BYTES = 64;

const ID = /^[a-z0-9][a-z0-9-]*$/;

export function skillIdFor(kind: RunKind, itemId: string, sub?: string): string | null {
  if (!ID.test(itemId)) return null;
  let id: string;
  switch (kind) {
    case "board-lessons":
      id = `board:${itemId}:lessons`;
      break;
    case "board-lesson":
      if (!sub || !ID.test(sub)) return null;
      id = `board:${itemId}:lesson:${sub}`;
      break;
    case "drone-safety":
      id = `drone:${itemId}:safety`;
      break;
    case "robotics-bench":
      id = `robotics:${itemId}:bench`;
      break;
    case "flight-course":
      if (!sub || !/^[1-9]\d{0,4}$/.test(sub)) return null;
      id = `flight:${itemId}:sub-${sub}`;
      break;
  }
  return new TextEncoder().encode(id).length <= MAX_SKILL_ID_BYTES ? id : null;
}

export type ParsedSkill =
  | { lab: "board"; itemId: string; lessonId?: string }
  | { lab: "drone"; itemId: string }
  | { lab: "robotics"; itemId: string }
  | { lab: "flight"; course: string; seconds: number };

/** Reads a skill id back, for the passport and verify pages. */
export function parseSkillId(skillId: string): ParsedSkill | null {
  const parts = skillId.split(":");
  const [lab, itemId] = parts;
  if (!itemId || !ID.test(itemId)) return null;
  if (lab === "board" && parts.length === 3 && parts[2] === "lessons") return { lab, itemId };
  if (lab === "board" && parts.length === 4 && parts[2] === "lesson" && ID.test(parts[3])) return { lab, itemId, lessonId: parts[3] };
  if (lab === "drone" && parts.length === 3 && parts[2] === "safety") return { lab, itemId };
  if (lab === "robotics" && parts.length === 3 && parts[2] === "bench") return { lab, itemId };
  const sub = /^sub-([1-9]\d{0,4})$/.exec(parts[2] ?? "");
  if (lab === "flight" && parts.length === 3 && sub) return { lab, course: itemId, seconds: Number(sub[1]) };
  return null;
}

export function skillHash(skillId: string): Promise<Uint8Array> {
  return sha256(skillId);
}
