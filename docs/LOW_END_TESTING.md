# Low-end device testing

How to check iynk on a slow phone, an old Chromebook or a cheap laptop. Every claim about a device stays UNKNOWN until a row for it exists in `docs/device-results.md`.

## Before you start

- Use a fresh browser profile or a private window, so no old data skews the load.
- Close other tabs. Plug the device in.
- Open the app from a production build (`npm run build`, then `npm start`), not `npm run dev`. The dev server is much slower.
- Note the device: model, browser and version, and the date.

## Pages to open

Open each one and note whether it becomes usable and how long that takes.

1. `/en` (home)
2. `/en/boards` (the board labs)
3. One board lab, for example the first lesson of the Uno lab
4. `/en/robotics`
5. `/en/drones`
6. `/en/together`

## Slow it down on a fast computer

If you have no slow device, simulate one in Chrome or Edge.

1. Open DevTools (F12), then the Performance tab.
2. Click the gear icon. Set CPU to "4x slowdown".
3. Set Network to "Slow 4G" (or "Fast 3G" for a harder run).
4. Tick "Disable cache" and reload.

A throttled desktop is a rough guide only. Record it as "throttled", never as a device result.

## What to time

Use a stopwatch or the Performance tab. Write each number with its unit.

| Measure | How | Unit | Target |
|---|---|---|---|
| First working Run | Open the first lab, press Run, stop when the first serial line or LED change shows | seconds | under 2 s at normal speed, under 4 s at 4x (a proposal, BUD-06) |
| Page ready | Reload a page, stop when you can click a button and it responds | seconds | none set, record it |
| Idle CPU | Leave a lab open and untouched for 30 seconds. In the Performance monitor, read CPU usage | percent | none set, record it |
| Idle frames | Same 30 seconds, read the frame rate | frames per second | none set, record it |

Repeat each timing three times and write all three.

## Where to record

Add a row to `docs/device-results.md`. The first tester creates the file with this header and no rows are written for you.

```
| Date | Device | Browser | Throttle | Measure | Run 1 | Run 2 | Run 3 | Unit | Notes |
```

Until a row exists for a device or a throttle setting, anything said about it is UNKNOWN.
