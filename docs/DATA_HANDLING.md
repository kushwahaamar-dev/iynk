# Data handling

Where iynk keeps your data, what leaves your device, and how to wipe it. There is no account, no analytics and no remote telemetry.

## In your browser

| What | Where | Notes |
|---|---|---|
| Settings and progress | `localStorage["iynk:v1"]` | Language, theme, lesson progress, saved projects. |
| Keys | `localStorage["iynk:keys:v1"]` | The AI key, the search key and the server token, if you pasted them. Kept apart from progress so an export of your progress never carries a key. |
| Local log | `localStorage["iynk:log:v1"]` | The last 200 events and errors, in this browser only. Events are recorded only if you switch the log on. Errors are always kept. "Copy for a bug report" replaces every stored key with `[key]` first. |

Nothing above is sent anywhere by iynk on its own. Clearing site data for the page removes all of it.

## On the server

The server stores one thing: `<IYNK_DATA_DIR>/usage.json` (default `.iynk-data/usage.json`). It holds, per key, a short salted hash and counts: tokens and requests per UTC day, searches per UTC month. Old days and months are pruned.

The server never stores your key. The key arrives in a request header, is used for that one call and is dropped. It is not written to the usage file, to a log line or to an event. The hash cannot be turned back into the key.

A server that has no AI or search switched on writes nothing.

## What goes to AI and search providers

Only when you use a feature that needs one, and only through the server you point the app at.

| Feature | Sent | To |
|---|---|---|
| AI partner chat and translate | Your message, the conversation so far, and the project text the partner needs to answer | The AI provider the operator chose (`IYNK_AI_PROVIDER`) |
| Voice input | The recording you just made | The same provider, and only `meta` supports it |
| Search (web, videos, events, offers) | Your query text | The search provider |
| Nearby places | Your query and the place or coordinates you typed or allowed | The search provider |

Your key goes to the provider so that it can serve that one call. Nothing is sent in the background. With the AI and search off, nothing leaves the page.

## Content rule

The AI partner and the builders refuse to help make weapons or other craft built to hurt people or damage property. This applies in the ROBOT, DRONE and AI phases. A refusal is intended behaviour, not a bug.

## How to wipe

1. In the app: Settings, then Keys and usage, then Remove on each key. This clears the key from the browser.
2. To clear everything the browser holds: clear site data for the page in your browser settings.
3. On a server you run: stop the app and delete the `.iynk-data` folder (or the folder `IYNK_DATA_DIR` names).

The provider keeps its own records under its own terms. Delete the key at the provider if you want it gone there.
