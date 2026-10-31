# The server and the keys

How the browser and the server share the work of AI and search, and where a key lives. This page names things and
describes behaviour. It holds no key value. Settings for the operator are in [SELF_HOSTING.md](SELF_HOSTING.md); what
is stored and what leaves a device is in [DATA_HANDLING.md](DATA_HANDLING.md).

## /config.json

The browser asks `GET /config.json` to learn what this server offers. The answer is built per request from the
environment and is never cached.

```json
{ "server": null, "protocol": 1, "modules": { "ai": false, "search": false, "voice": false } }
```

- `server` is the address in `IYNK_SERVER_URL`, or `null` when there is no separate iynk server.
- `protocol` is the version of the contract between the app and the server.
- `modules` says whether the operator switched on the AI partner, search and voice. It exists because the AI and search
  routes are still routes of this Next.js app, so the browser cannot tell from `server` alone. It is removed when those
  routes move to the separate server.

A module that is off answers its routes with "feature disabled", and the app shows it as not set up.

## Where a key lives

Nobody puts the provider key in the server's environment. Each person brings their own.

- In the browser: `localStorage["iynk:keys:v1"]` holds up to three values, the AI key, the search key and the server
  token. They are kept apart from `iynk:v1` (settings and progress), so exporting progress never exports a key.
- On a request: the AI or search key goes in the header `X-Iynk-Provider-Key`, and the server token in
  `X-Iynk-Server-Token`. Without a key the app sends no request at all.
- On the server: the key is used for that one call and dropped. It is not written to a file, a log line, an error
  message or an event. The server keeps a short salted hash of the key, 16 hex characters, to count use. The hash
  cannot be turned back into the key.

The operator chooses the AI provider (`IYNK_AI_PROVIDER`) and its address. A caller cannot aim the server at another
host.

## Caps and the ledger

The server counts use per key hash and refuses calls past the caps with `429 quota_exhausted` and a `Retry-After`
header.

| Cap | Setting | Default | Counted |
|---|---|---|---|
| AI tokens per key | `IYNK_AI_DAILY_TOKENS` | `200000` | per UTC day |
| Searches per key | `IYNK_SEARCH_MONTHLY` | `200` | per UTC month |

A cap of `0` allows none. The counts live in `<IYNK_DATA_DIR>/usage.json` (default `.iynk-data/usage.json`), so a
restart does not reset them. The file holds the key hash and the counts and nothing else. Old days and months are
pruned. A server with AI and search both off writes nothing. To reset the counts, stop the app and delete the file.

## GET /api/usage

`GET /api/usage?kind=ai` or `?kind=search` returns what the calling key has used: the current UTC day and month, the
use today, the use this month and the cap. The caller sends the same two headers as for any AI or search call. It
answers 400 for another `kind`, "feature disabled" when the module is off, and 429 when called more than 60 times a
minute. The client reader is `src/lib/keys/usage.ts`. The route goes away with the AI and search routes when they move to
the separate server.

## Origins and the Content-Security-Policy

Two lists of origins exist and they do different jobs.

- `IYNK_CONNECT_ORIGINS` is the list of extra origins the browser may connect to, such as a relay at
  `https://rt.example.org`. It belongs in the `connect-src` part of the Content-Security-Policy and nowhere else.
- `IYNK_ALLOWED_ORIGINS` is for the server only: the origin check on API calls and on sockets. The app does not read it
  yet.

At the moment the app sends the policy `frame-ancestors 'self'` on every page and figure, which stops other sites
framing it. The fuller policy is still being built, and `IYNK_CONNECT_ORIGINS` is read from the environment but not yet
written into a header. Figures are plain HTML files in `public/figures`, made by the figure build. They load nothing
from the network, and a test fails the build if one does.

## MCP

`/api/mcp` lets an AI assistant search the catalogue, run the drone calculator and open a room. Its parts price tool
answers "not set up", because an MCP call carries no search key and so cannot be counted against one.
