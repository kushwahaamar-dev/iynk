# Requests from hx:data

## 1. Orchestrator: log hx:data's additive changes in the HX-CONTRACT changelog (H8)

H12 doesn't let me edit the contract, so here is the entry:

- 14:15 hx:data:
  - Two new kinds: `flight.start` (data `{ course? }`), which feeds "drones flown", and `led.blink` (data `{ count }`), which feeds "LEDs blinked".
  - POST /api/telemetry also accepts `sentAt`, the client's clock at send time, for skew correction. It answers 202 `{ accepted, dropped }`.
  - GET /api/leaderboard also takes `session` (to return the asker's own row) and `limit` (1–50).
  - New route: DELETE /api/buddies `{ id, token }` (opt out). POST /api/buddies takes `{ profile, token }`.
  - `laps_best_daily` also groups by `session`; `activity_1m` also groups by `session` and has a `units` column.
  - Details: docs/hacktx/DATA.md.
- H2 says `export const runtime = 'nodejs'`. With cacheComponents on, Next 16.4 rejects that export (node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/02-route-segment-config/runtime.md). hx:server-ai found the same. Please fix H2 so the other route owners don't add it.

## 2. hx:server-ai: a non-hook features accessor in src/lib/features.ts

`src/lib/telemetry/client.ts` is plain TypeScript, not React, so it can't call `useFeatures()`. For now it fetches `/api/status` itself, once per page (the response is HTTP-cached for 60 s). If features.ts exported something like `getFeatures(): Promise<Features>`, sharing the same in-flight request and cache as `useFeatures()`, telemetry would switch to it and drop its own fetch. That would be one line to change in my file.

## 3. Wave 2 (hx:dock, flight, the lab UIs, shell-app, hx:realtime-client): where telemetry and the data components plug in

Import from `@/lib/telemetry`. Every call is synchronous and does nothing when the db feature is off.

| Where | Call |
|---|---|
| Flight range host (src/components/flight), on arm or takeoff | `track("flight.start", { course })` |
| Flight range host, once per second while flying | `track("flight.sample", { alt, speed, battery })` (extra calls within the same second are dropped) |
| Flight range host, on its `lap` event (`time` is in seconds) | `track("flight.lap", { course: course.id, timeMs: Math.round(time * 1000), name })`, with `name` the pilot's self-chosen name (≤ 24) if there is one |
| Board lab, on every LED rising edge in the run (or counted per tick) | `tally("led.blink", n)` |
| Lesson checks (board, robotics, drone tests) | `track("lesson.attempt", { key })` and `track("lesson.pass", { key })`, with `key` the D7 progress key |
| Failure modes (magic smoke, reversed LED, brown-out, crash) | `track("fault", { code })` |
| RoomProvider (hx:realtime-client) | `setTelemetryContext({ room })` on join, `setTelemetryContext({ room: undefined })` on leave, `track("room.join", { peers })`, and `track("room.action", { type })` for shared actions (the type only, never the payload) |
| Lab pages | `setTelemetryContext({ item: id })` |
| Partner (hx:partner) | `track("ai.call", { kind: "chat" \| "translate" \| … })` |
| Hardware twin (hx:hw) | `track("hw.connect", { board })` |
| Solana app | `track("credential.issued", { kind })` |

Components (strings load on the server page, then pass down as props):

```tsx
import { Leaderboard, LiveCounter, getDataMessages } from "@/components/data";
const m = await getDataMessages(lang);
<LiveCounter messages={m.live} />                                               // dashboard and /together lobby
<Leaderboard course={course.id} courseLabel={courseTitle} messages={m.leaderboard} />   // /drones/[drone]/fly, or a dock tab
```
