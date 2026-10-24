// Response shapes of the hx:data routes, shared by the route handlers and the
// components that read them. Errors are { error: { code, message } } (H2).

import type { Locale } from "@/i18n/config";

export type LeaderboardRow = {
  rank: number;
  /** The pilot's self-chosen name, or null when they flew without one. */
  name: string | null;
  timeMs: number;
  laps: number;
  /** True on the row of the session that asked. */
  you: boolean;
};

/** GET /api/leaderboard?course=&session=&limit= */
export type LeaderboardResponse = {
  course: string;
  rows: LeaderboardRow[];
  /** The asking session's own row, also when it is below the top rows; null if it has no lap. */
  you: LeaderboardRow | null;
  pilots: number;
  updatedAt: string;
};

/** GET /api/live: the last 60 minutes, from activity_1m. */
export type LiveResponse = {
  windowMinutes: number;
  builders: number;
  ledsBlinked: number;
  dronesFlown: number;
  lessonsPassed: number;
  events: number;
  /** Events per minute, oldest first, one entry per minute of the window. */
  perMinute: number[];
  updatedAt: string;
};

/** HX-CONTRACT H4 Profile: no contact data; people connect by room invite. */
export type BuddyProfile = {
  id: string;
  name: string;
  lang: Locale;
  interests: string[];
  built: string[];
  wants: string;
};

/** GET /api/buddies */
export type BuddiesResponse = { profiles: BuddyProfile[] };

/** POST /api/buddies */
export type BuddyPostResponse = { profile: BuddyProfile; expiresAt: string };
