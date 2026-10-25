import type { CourseKind } from "./types";

// The daily challenge (BUILD-PLAN §1, Most Entertaining lever 5): one craft, one course, one pack and the wind, the
// same for everyone on a UTC day, picked from the crafts that fly. A link carries the day (and the time to beat),
// and the day's laps go to their own leaderboard, `daily-<yyyymmdd>`.

export interface ChallengeCraft {
  id: string;
  courses: Array<{ id: string; kind?: CourseKind }>;
  /** The design's battery keys: the challenge flies one of them on the factory build. */
  batts: string[];
}

export interface DailyChallenge {
  date: string; // YYYY-MM-DD, UTC
  craft: string;
  course: string;
  batt: string;
  wind: boolean;
  /** The leaderboard's course id for the day. */
  board: string;
}

const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Today's date in UTC, the challenge's day everywhere. */
export function challengeDay(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function isChallengeDay(v: unknown): v is string {
  if (typeof v !== "string" || !DATE.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}

/** FNV-1a: a small, stable hash, so a day picks the same challenge on every machine. */
function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

/** The day's challenge, or null when nothing flies. */
export function dailyChallenge(date: string, pool: ChallengeCraft[]): DailyChallenge | null {
  if (!isChallengeDay(date)) return null;
  const crafts = pool.filter((c) => c.courses.length > 0 && c.batts.length > 0).sort((a, b) => (a.id < b.id ? -1 : 1));
  if (!crafts.length) return null;
  const h = hash(`simlab:${date}`);
  const craft = crafts[h % crafts.length];
  const course = craft.courses[(h >>> 8) % craft.courses.length];
  const batt = [...craft.batts].sort()[(h >>> 16) % craft.batts.length];
  return { date, craft: craft.id, course: course.id, batt, wind: ((h >>> 24) & 1) === 1, board: `daily-${date.replaceAll("-", "")}` };
}

/** The share link's path and query: the day, and optionally the time to beat and who flew it. */
export function challengeLink(lang: string, c: DailyChallenge, beat?: { time: number; by?: string }): string {
  const q = new URLSearchParams({ challenge: c.date });
  if (beat) {
    q.set("beat", beat.time.toFixed(2));
    if (beat.by) q.set("by", beat.by.slice(0, 24));
  }
  return `/${lang}/drones/${c.craft}/fly?${q}`;
}

/** What a challenge link asks for, read from the query; anything malformed is dropped. */
export function readChallengeQuery(search: string): { date: string; beat: number | null; by: string | null } | null {
  const q = new URLSearchParams(search);
  const date = q.get("challenge");
  if (!isChallengeDay(date)) return null;
  const beat = Number(q.get("beat"));
  const by = (q.get("by") ?? "").replace(/[\p{Cc}\p{Cf}]/gu, "").trim().slice(0, 24);
  return { date, beat: Number.isFinite(beat) && beat > 0 && beat < 3600 ? beat : null, by: by || null };
}

const bestKey = (date: string) => `simlab:challenge:v1:${date}`;

/** This browser's best time on a day's challenge, in seconds. */
export function loadChallengeBest(date: string): number | null {
  try {
    const v = Number(localStorage.getItem(bestKey(date)));
    return Number.isFinite(v) && v > 0 ? v : null;
  } catch {
    return null;
  }
}

/** Keeps the faster time; true when this one is the new best. */
export function saveChallengeBest(date: string, time: number): boolean {
  const best = loadChallengeBest(date);
  if (best !== null && best <= time) return false;
  try {
    localStorage.setItem(bestKey(date), String(time));
  } catch {
    // storage blocked: the time still shows for this visit
  }
  return true;
}
