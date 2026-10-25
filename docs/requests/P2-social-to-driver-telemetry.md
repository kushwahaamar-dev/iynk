# P2-social → driver: telemetry opt-out, two new kinds, the privacy copy

Filed 2026-10-24 by P2-social. BUILD-PLAN §3.2 item 9 asks for telemetry on lesson pass, bench step, fault, ai call and
search call, "disclosed as anonymous, opt-out". Three of those landed in P2-social's own files (`9bb1fd0`, `89c0140`).
The rest needs files no wave-A label owns (`src/lib/telemetry/**`, `src/lib/search/client.ts`, `shell.json`), so here
are the exact changes. Each is small; (1) matters most, because the opt-out checkbox is already on every lab page.

## 1. The client honours the opt-out (`src/lib/telemetry/client.ts`)

`settings.telemetry` (on by default, D7 settings, `src/lib/progress/storage.ts`) is what the "Share anonymous usage
counts" checkbox at the bottom of each lab page writes. Today `track()` ignores it.

```ts
import { getSettings } from "@/lib/settings/settings";

const optedOut = () => !getSettings().telemetry;

export function track<K extends TelemetryKind>(kind: K, data?: DataFor<K>): void {
  if (!inBrowser() || mode === "off" || optedOut()) return;
  …
}

export function tally(kind: TallyKind, n = 1): void {
  if (!inBrowser() || mode === "off" || optedOut() || !(n > 0)) return;
  …
}
```

and in `flush()` / `beacon()`, drop what is queued when opted out (someone unticks the box with events waiting):

```ts
if (optedOut()) { queue = []; tallies.clear(); return; }
```

Test: in `client.test.ts`, `setSetting("telemetry", false)` then `track("lesson.pass", { key })` sends nothing.

## 2. Two kinds (`src/lib/telemetry/kinds.ts`, additive)

```ts
export const TELEMETRY_KINDS = [
  …,
  "credential.issued",
  "step.done",    // { key }: a build step with a D7 key (a robotics bench step, a drone's finished build)
  "search.call",  // { engine }: offers | nearby | events | videos
] as const;
```

The ingest route validates with `z.enum(TELEMETRY_KINDS)` and the database has no constraint on `kind`, so nothing
else changes. Then the two call sites:

- `src/lib/sound/react.ts`, in `report()`, after the `fault` line:
  `else if (moment.kind === "step" && moment.key) track("step.done", { key: moment.key });`
  (the bench moments already carry `robotics:<bench>:step:<step>` and the drone's `drone:<id>:build`; board assembly
  steps have no key and stay uncounted.)
- `src/lib/search/client.ts`, in `post()`, before the fetch:
  `track("search.call", { engine: path.slice(path.lastIndexOf("/") + 1) });` (import `track` from `@/lib/telemetry`).

## 3. The privacy copy (`src/i18n/messages/<locale>/shell.json`)

Both still promise "no tracking", which is no longer true on a deployment with a database:

- `footer.privacy`: "No accounts. Your progress stays in this browser; the labs send anonymous usage counts, which you
  can turn off at the bottom of any lab page."
- `about.how.privacy`: "Progress and settings are saved in this browser's local storage. There are no accounts. When
  this deployment has a database, the labs send anonymous usage counts (a lesson passed, a step built, a fault tried,
  a lap time) for the live counters and leaderboards, with a random id for this browser and never your name or your
  code. Untick "Share anonymous usage counts" at the bottom of any lab page to stop them."

The other five locales need the same change (phase 3 translates; until then English or the old line).

## 4. Log the D7 settings change (`docs/ARCHITECTURE.md` §0)

Additive: `settings.telemetry: boolean` (default true, opt-out), and `settings.sound` now defaults to false (BUILD-PLAN
§3.1 "off by default"). Old saved documents keep their stored `sound` value; a document without `telemetry` reads true.

P2-fun (wave B, 2026-10-24 ~22:40): done, all four. (1) `track()`, `tally()`, `flush()` and `beacon()` read
`settings.telemetry`; unticking drops the queue and the tallies, and a test in `client.test.ts` checks that nothing is
posted or beaconed after it. (2) `step.done` and `search.call` are in `TELEMETRY_KINDS`, sent from
`src/lib/sound/react.ts` (step moments with a key) and `src/lib/search/client.ts` (the engine name only), with a test
each. (3) The privacy copy is replaced in all six `shell.json` files (translated, listed for review in
`P2-fun-to-phase3-strings.md`). (4) Logged as ARCHITECTURE.md v1.6.
