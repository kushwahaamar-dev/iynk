# Self-hosting iynk

iynk has two parts you can run yourself. The web app is one Next.js app and needs no key: with every setting below left empty, the labs, the editor and the lessons all work. The collaboration server adds buddies (people you pair with by code or link) and keeps their sign-ins. It is optional. Without it, everything on one device keeps working.

The AI partner and live search switch on only when you set them up, and each is off by default.

This guide covers both. Run the web app by itself, or put the app and the server behind one address with the Docker kit.

## Run it

```
npm install
npm run build
npm start
```

`npm start` listens on port 3000 unless you pass `-- --port <n>`. Put it behind a reverse proxy that serves HTTPS if other people will use it.

## Settings

Copy `.env.example` to `.env.local` and fill in only what you need. An empty line means "not set". A value that cannot be read falls back to its default and the module that needs it stays off. Nothing in this file is ever a key for the AI or search provider: callers bring their own key (see `docs/DATA_HANDLING.md`).

<!-- env-names: the copy check compares the first column below with src/lib/server/env.ts -->

| Name | Default | What it does |
|---|---|---|
| `IYNK_AI_ENABLE` | `0` | `1` turns the AI partner on. Without it every AI route answers "feature disabled". |
| `IYNK_AI_PROVIDER` | `meta` | Which provider the server talks to for AI: `meta` or `gemini`. Voice transcription works only with `meta`. The operator picks the provider and its address, so a caller cannot aim the server at another host. |
| `IYNK_AI_DAILY_TOKENS` | `200000` | Tokens one key may spend per UTC day. `0` allows none. Past the cap the server answers 429 `quota_exhausted` until 00:00 UTC. |
| `IYNK_SEARCH_ENABLE` | `0` | `1` turns search (web, nearby, events, videos, offers) on. |
| `IYNK_SEARCH_MONTHLY` | `200` | Searches one key may run per UTC month. `0` allows none. |
| `IYNK_DATA_DIR` | `.iynk-data` | Folder where the server keeps `usage.json`, the usage count. It is git-ignored. The server creates it when it first needs it. |
| `IYNK_CONNECT_ORIGINS` | empty | Extra origins the browser may connect to, written into the Content-Security-Policy `connect-src` list. Comma separated, each a bare origin such as `https://rt.example.org`. It feeds the policy only. It does not change who may call the API. |
| `IYNK_SERVER_TOKEN` | not set | A secret of at least 32 random bytes, for example `openssl rand -base64 48`. Routes that spend your provider quota need it in the `X-Iynk-Server-Token` header. Not set means those routes stay closed. |
| `IYNK_TRUST_PROXY` | `0` | `1` only when the app sits behind one proxy you control. Then the caller address comes from `X-Forwarded-For`. At `0` that header is ignored, so nobody can fake an address to dodge the rate limits. |
| `IYNK_SERVER_URL` | not set | Address of a separate iynk server. The app serves it at `/config.json` so the browser knows where to connect. Not set means "no separate server". |

The provider address and model names (`META_API_BASE`, `META_MODEL`, `META_TRANSCRIBE_MODEL`, `GEMINI_MODEL`) and the public address (`NEXT_PUBLIC_SITE_URL`, `SITE_URL`) are listed in `.env.example` as well. `NEXT_PUBLIC_SITE_URL` is baked in at build time, so set it before `npm run build`. `NEXT_PUBLIC_REALTIME_URL` is baked in the same way: it holds the `ws://` or `wss://` address of a relay for shared rooms, and without it rooms work between tabs of one browser only.

## Turning the AI partner on

1. Set `IYNK_AI_ENABLE=1` and, if you want Gemini, `IYNK_AI_PROVIDER=gemini`.
2. Set `IYNK_SERVER_TOKEN` to a long random string.
3. Restart the app. `/config.json` now shows `"ai": true` under `modules`.
4. In the app, open Settings, then Keys and usage, and paste the provider key and the server token. They stay in that browser.

Search works the same way with `IYNK_SEARCH_ENABLE=1`.

## What the server writes

One file: `<IYNK_DATA_DIR>/usage.json`. It holds a short hash of each key and the counts that go with it, so a restart does not reset the caps. It never holds a key. To reset all counts, stop the app and delete the file.

## Back up and update the web app

Nothing here needs a backup except, if you care about the counts, `usage.json`. To update, pull, run `npm install` and `npm run build`, and restart.

## The collaboration server

### What you need

- Docker with the compose plugin, or Node 24 or newer for a run without Docker.
- A domain name that points at the machine, or `localhost` to try it on one machine.
- Ports 80 and 443 free for Caddy, which fetches and renews the HTTPS certificate by itself. Change them with `IYNK_HTTP_PORT` and `IYNK_HTTPS_PORT` if they are taken.

### Start it with one command

```
cp deploy/.env.example deploy/.env
```

Open `deploy/.env` and set `IYNK_DOMAIN` to your domain (or `localhost`). Then:

```
docker compose -f deploy/compose.yaml up -d --build
```

This starts the web app, the server and Caddy. Caddy sends `/v1/*`, `/healthz` and `/readyz` to the server and everything else to the web app, so people use one address. The server keeps its data in the `iynk-data` volume.

### First run

```
docker compose -f deploy/compose.yaml exec server node server/bin/iynk-server.ts init
```

`init` prepares the database, checks the configuration and prints the first enrolment link and a typed code of 12 characters (`XXXX-XXXX-XXXX`). Open the link in your browser, or open the app, go to Settings, Server address, paste your address and type the code. The first person to enrol on an empty server becomes the owner. Everyone after that is a member.

### Point the app at the server

In the app, open Settings and set Server address to your address, for example `https://iynk.example.com`. The app checks the server and shows whether it is connected, needs a code, or is closed to new people.

A server address pasted into Settings works only if it is the same origin as the app or is listed in `IYNK_CONNECT_ORIGINS` on the web app; otherwise the browser blocks the call and the app says the server is unreachable. With the Docker kit the app and the server share one origin, so nothing extra is needed.

### Keys need HTTPS

Each browser makes a signing key and uses it to sign in. Browsers allow that only on an HTTPS page, with one exception: `localhost`. So a server on a public address must serve HTTPS (the Docker kit does), and plain `http://localhost` is fine for a try-out on your own machine.

### Add a friend, then pair

```
docker compose -f deploy/compose.yaml exec server node server/bin/iynk-server.ts enrol --name Sam
```

Send the link or the typed code to your friend. A code works once and expires after 24 hours. When your friend has joined, open Buddies in the app, create a pairing and share its code, link or QR. Pairing connects two people who are already enrolled; it never enrols anyone.

### Day to day commands

Run these the same way as `init` (the examples drop the `docker compose ... exec server` prefix; on a plain Node install run `node server/bin/iynk-server.ts <command>` from the repository root with the same settings in the environment).

| Command | What it does |
|---|---|
| `iynk-server devices` | Lists every enrolled device with its role, last seen time and whether it is revoked. |
| `iynk-server revoke <deviceId or identityId>` | Cuts a device off and ends all its sessions. |
| `iynk-server enrol [--name n]` | Prints a new one-time enrolment link and typed code. `enroll` is accepted too. `--json` prints it as JSON. |
| `iynk-server backup` | Writes `backups/iynk-<time>.db` while the server runs and keeps the last 7. |
| `iynk-server restore <file>` | Replaces the database with a backup. Only while the server is stopped. |
| `iynk-server compact` | Shrinks the database file. Needs free disk space about the size of the database. |
| `iynk-server diagnostics` | Writes a tarball with versions, settings (secrets shown as set or unset), migration state, table row counts and an integrity check. Safe to attach to a bug report. |
| `iynk-server check-config` | Reads the environment and lists every unsafe or missing setting. Exit code 2 means a problem. |

### Back up and restore

Back up while the server runs:

```
docker compose -f deploy/compose.yaml exec server node server/bin/iynk-server.ts backup
docker compose -f deploy/compose.yaml cp server:/data/backups/. ./iynk-backups
```

The first command prints the file it wrote. Keep a copy off the machine. Schedule the pair with cron.

Restore on an empty or broken install:

```
docker compose -f deploy/compose.yaml stop server
docker compose -f deploy/compose.yaml run --rm --no-deps -v "$PWD/iynk-backups:/restore:ro" server node server/bin/iynk-server.ts restore /restore/iynk-<time>.db
docker compose -f deploy/compose.yaml up -d
```

`restore` checks the file's integrity, refuses a file from a newer server, refuses to run while the server holds the database, and removes the old `-wal` and `-shm` files. Devices and buddies come back. A browser whose session is missing from the older file signs a new challenge with its key and gets a new session without asking you anything.

### Upgrade and roll back

```
git pull
docker compose -f deploy/compose.yaml up -d --build
```

When the new version has a database change, the server writes `backups/pre-<number>-<time>.db` first (the last 3 are kept) and then applies it. A server refuses a database that is newer than itself, and says so.

To roll back, check out the earlier version, rebuild, and restore the pre-upgrade file:

```
docker compose -f deploy/compose.yaml stop server
git checkout <earlier version>
docker compose -f deploy/compose.yaml build server
docker compose -f deploy/compose.yaml run --rm --no-deps server node server/bin/iynk-server.ts restore /data/backups/pre-<number>-<time>.db
docker compose -f deploy/compose.yaml up -d
```

### Stopping

`docker compose stop` sends `SIGTERM`. The server stops taking new work, `/healthz` answers 503 with `"draining": true`, and it exits within 15 seconds, which is the `stop_grace_period` in the compose file.

### Settings of the server

Set these in `deploy/.env` or in the `environment` of the `server` service. The server reads its own `IYNK_DATA_DIR` and `IYNK_TRUST_PROXY`, apart from the web app's: the compose file gives each service its own values. A setting it cannot read stops the server with a message that names the setting.

| Name | Default | What it does |
|---|---|---|
| `IYNK_PUBLIC_URL` | required | The address people reach the server at, with no path. The compose file builds it from `IYNK_DOMAIN`. |
| `IYNK_ALLOWED_ORIGINS` | required | Exact origins of the web apps allowed to call the server, comma separated. |
| `IYNK_DATA_DIR` | `./data` | Where `iynk.db` and `backups/` live. Mode 700, owned by the user that runs the server. |
| `IYNK_HOST` | `127.0.0.1` | The address it listens on. Anything but loopback needs `IYNK_TRUST_PROXY` or `IYNK_ALLOW_DIRECT=1`. |
| `IYNK_PORT` | `8787` | The port it listens on. |
| `IYNK_TRUST_PROXY` | `0` | How many proxies sit in front, 0 to 8. Then the caller address comes from `X-Forwarded-For`. The compose file sets 1. |
| `IYNK_ENROL` | `code` | `code` lets people join with a code. `closed` admits nobody new. |
| `IYNK_MAX_IDENTITIES` | `100` | The most people the server will enrol. |
| `IYNK_TOKEN_TTL_HOURS` | `12` | How long a sign-in lasts, 1 to 720. |
| `IYNK_DELETION_GRACE_HOURS` | `24` | How long after Leave server an account waits before it is deleted. `0` deletes at once. |
| `IYNK_STORE_SYNC` | `full` | `full` or `normal`. See below. |
| `IYNK_LOG_LEVEL` | `info` | `debug`, `info`, `warn` or `error`. |
| `IYNK_SERVER_NAME` | `iynk` | The name the app shows for this server. |
| `IYNK_MIN_CLIENT` | `0.0.0` | The oldest app version the server accepts. |
| `IYNK_ALLOW_ROOT` | `0` | The server refuses to run as root unless this is `1`. |
| `IYNK_ALLOW_DIRECT` | `0` | `1` lets it listen on a public address without a proxy. Not recommended. |
| `IYNK_METRICS_ADDR` | empty | Reserved. The server has no metrics endpoint yet; leave it empty. |

The old relay settings (`IYNK_SECRET`, `IYNK_SERVER_TOKEN`, `LOG_LEVEL`, `TRUST_PROXY`, `MAX_ROOMS`, `MAX_CONNECTIONS`, `MAX_CONNECTIONS_PER_IP` and anything starting with `REALTIME_`) stop the server on purpose. Delete them from its environment.

### Durability and `IYNK_STORE_SYNC`

The default, `full`, makes the database wait until each change is on disk before it answers. On a Mac (Node 24.8, 400 writes a second, 50 rounds of `kill -9` during writes) that lost none of 53,906 acknowledged changes and left no damaged rows, and the database passed its integrity check every time. A change took 0.133 ms at the median and 2.3 ms at the 99th percentile. `normal` skips some waits. It cannot corrupt the database, but a power cut or an operating system crash can lose the last few changes. Keep `full` unless you measured a problem.

### Leave server and deletion

When someone chooses Leave server, their account is hidden from buddies and deleted after the grace period (`IYNK_DELETION_GRACE_HOURS`, 24 by default). During the grace they can still sign in and choose Keep my account. With `0` the deletion happens at once.

### What the operator can read

The database holds display names, public keys, who is a device of whom, who paired with whom, and when things happened. In this version there is no chat and no project text on the server, so there is nothing of that kind to read. The log never holds tokens or pairing secrets, and shows an address only in a warning about abuse. See [Data handling](DATA_HANDLING.md) for the rest.

### If it faces the internet

- Serve only HTTPS. The Docker kit does, through Caddy. Do not publish port 8787.
- When your friends have enrolled, set `IYNK_ENROL=closed` in `deploy/.env` and run `docker compose -f deploy/compose.yaml up -d` again. Open it for a moment whenever you add someone.
- Keep the server's `backups/` copied somewhere else, on a schedule.
- Leave `IYNK_METRICS_ADDR` empty. The Caddy file forwards only `/v1/*`, `/healthz` and `/readyz`, so nothing else reaches the server.
- Check from cron, and alert yourself on failure: `curl -f https://<your domain>/healthz` must succeed; disk use of the data volume stays under 80 percent; the newest file in `backups/` is less than a day old.

### Uninstall

```
docker compose -f deploy/compose.yaml down -v
```

This stops the containers and deletes the data volume. Nothing else is on the machine. Without `-v` the data stays.

### Check it works

`bash server/scripts/drill.sh` runs backup, restore, an upgrade with a database change, a rollback and a graceful stop against a temporary folder on your machine, and prints a PASS or FAIL line for each. It needs Node 24 and curl, uses no network beyond localhost and leaves nothing behind.
