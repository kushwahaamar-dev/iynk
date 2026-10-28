# Contributing to iynk

Thanks for wanting to help. This page covers how to run the app and the tests, and how to add a string, a lesson or a
part.

## Docs

- [docs/FIGURES.md](docs/FIGURES.md): how the 3D figures are written, built and shot
- [docs/FIGURES-BENCH.md](docs/FIGURES-BENCH.md): the data format for boards, parts, modules and robotics benches
- [docs/FIGURES-DRONE.md](docs/FIGURES-DRONE.md): the data format for drones
- [docs/PROJECT_CORE.md](docs/PROJECT_CORE.md): the shared project code, its import rules and commands
- [docs/SELF_HOSTING.md](docs/SELF_HOSTING.md): running your own copy
- [docs/DATA_HANDLING.md](docs/DATA_HANDLING.md): what is stored, where, and what leaves your machine
- [docs/SERVER_AND_KEYS.md](docs/SERVER_AND_KEYS.md): `/config.json`, where keys live, the caps and the usage route
- [docs/LOW_END_TESTING.md](docs/LOW_END_TESTING.md): testing on slow devices
- [docs/PROVENANCE.md](docs/PROVENANCE.md): where the content came from

## Set up

You need the Node version in `.nvmrc` (24) and Python 3 (the figure tests run the figure builder).

```bash
git clone https://github.com/kushwahaamar-dev/iynk.git
cd iynk
npm ci
npm run dev
```

The app runs without any key. AI and search are off until a key is pasted in Settings, so you never need a
`.env.local` value to work on iynk.

## Run the checks

```bash
npm run content:check        # every board, robotics and drone item loads and its text keys exist
npm run typecheck
npm run lint
npm test                     # unit tests (vitest)
npm run check                # all of the above plus the Playwright specs
bash scripts/ci-local.sh     # what CI runs, step by step; --list shows the steps, --only a,b picks some
```

`scripts/ci-local.sh` blanks the variables that switch a real service on. If you run Playwright or `next build` by
hand, do the same:

```bash
env META_API_KEY= GEMINI_API_KEY= SERPAPI_KEY= NEXT_PUBLIC_REALTIME_URL= IYNK_SERVER_TOKEN= IYNK_AI_ENABLE= IYNK_SEARCH_ENABLE= npm run build
```

## Add or change a string

The app speaks six languages: `en de es fr hi zh`. UI strings live in `src/i18n/messages/<lang>/<namespace>.json`. The
English file defines the keys. Add the key to the English file, then add the same key, with the same `{placeholders}`,
to the other five. Change copy in all six files in one commit.

```bash
npx vitest run src/i18n
```

The parity test fails if a language misses a key or drops a placeholder. Lesson and part prose is separate: it lives in
`src/i18n/content/<lang>/<lab>/<id>.json`, one file per item and language.

## Add a board, lesson or part

1. Write the item data in `src/content/boards/<id>.ts` (or `robotics/`, `drones/`). Copy a neighbour, for example
   `uno-r3.ts`. Lesson text is written as keys; the words go in the content files above.
2. Run `npm run content`. `scripts/gen-content-index.mjs` rescans the folders and rewrites
   `src/content/index.generated.ts`. Commit that file with your change.
3. Write the figure in `figures/<kind>/<id>.js`. The formats are in `docs/FIGURES.md`, `docs/FIGURES-BENCH.md` and
   `docs/FIGURES-DRONE.md`. Build it with `python3 -I figures/tools/cfbuild.py boards/<id>`.
4. Add a fact sheet at `docs/facts/<id>.md` with the sources for every number you used.
5. Run `npm run content:check` and `npm test`.

Don't see the part you want? Open an issue with the "Request a part" template.

## Rules

- Do not edit `public/figures` by hand. Those pages are build output from `figures/`; change the source and rebuild.
- Do not put a key, a token or a `.env.local` value in a pull request, an issue or a test. Tests that need one use
  the fixed strings the existing tests use.
- Keep a pull request to one change, and say how you checked it.
- Commit messages are a short line in the imperative, for example `Add the Nano lesson on PWM`.

## Conduct and security

Please read the [Code of Conduct](CODE_OF_CONDUCT.md). To report a security problem, follow [SECURITY.md](SECURITY.md)
and do not open a public issue.
