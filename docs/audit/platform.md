# Audit: platform (shell, i18n, theming, a11y, deploy)

Written 2026-10-24 15:25 CDT by the platform auditor; read-only. tsc: 34 errors; platform vitest 92/94; eslint clean.

## Headline

The shell is solid (layout, nav, theming, progress, FigureFrame, UI kit). What ties it together is missing:
1. No item page renders outside English: no es/fr/de/zh/hi content prose, and the loaders 404 by design without it.
2. Uno R3 has no English prose: `/en/boards/uno-r3` 404s, and the dashboard's Start button goes there.
3. tsc fails, so the Vercel build (which always type-checks) fails.
4. LabDock renders null: no hackathon panel is reachable from a lab page; /together, /passport, /verify not in nav.
5. README is stale and lists no prompts; 25 of 42 item figures have no prompt record.

## Routes

| Route | State |
|---|---|
| `/` | redirects by cookie → Accept-Language → /en (e2e covered) |
| `/[lang]` dashboard | renders; en counts 5 boards, 4 benches, 1 drone; other locales 0; Start → uno-r3 (404) |
| `/[lang]/boards`, `/[board]`, `/[board]/[lesson]` | 7 boards in AVAILABLE; uno-r3, uno-r4 404 (no en prose); all non-en 404 |
| `/[lang]/robotics`, `/[bench]` | renders transistor-switch, esp32-s3-build, tb6612fng, pi5-ros2 (en only); uno-r3-build has prose but no module |
| `/[lang]/robotics/fixture-preview` | dev fixture; delete |
| `/[lang]/drones`, `/[drone]`, `/fly` | only quad5 renders (en); whoop, cinewhoop, longrange, wing have modules but no prose |
| `/[lang]/about` | credits + Colorfigures MIT licence |
| `/[lang]/passport`, `/verify`, `/together` | exist, unlinked; together/strings.ts has 3 tsc errors |
| API (21) | status; ai/{chat,translate,transcribe,story,image,plan,match}; search/{offers,nearby,events,videos,web}; solana/{attest,credentials,faucet}; telemetry, leaderboard, buddies, live; mcp, mcp/tools/[name], openapi.json |

## i18n

Registered namespaces: common, shell, boardlab, robotics, dronelab, flight, ai. **Unregistered: search, solana,
together, hw** (parity untested). Share of strings actually translated (not English copies):

| ns | en | es | fr | de | zh | hi |
|---|---|---|---|---|---|---|
| common | 18 | 94% | 94% | 94% | 94% | 94% |
| shell | 93 | 96% | 92% | 96% | 97% | 97% |
| boardlab | 349 | 88% | 2%, -2/+13 keys | same | same | same |
| robotics | 217 | 0% | 0% | 0% | 0% | 0% |
| dronelab | 273 | 1%, -1/+5 | same | same | same | same |
| flight | 163 | 98% | 98% | 97% | 100% | 99% |
| ai | 106 | 98% | 97% | 95% | 100% | 100% |
| search | 183 | 95% | 93% | 92% | 96% | 96% |
| solana | 175 | 98% | 97% | 97% | 98% | 98% |
| together | 185 | 99% | 98% | 0%, -1/+2 | same | same |
| hw | 64 | 87% | 90% | 87% | 94% | 94% |

Content prose: en has 5 boards, 5 benches, 1 drone (~47.5k words), **uno-r3 missing**; other languages 0 files.
Figure strings: `src/i18n/figures/` missing (build warning; non-en figures stay English); no extraction tool.

## Design, theming, a11y, mobile

- Design system done (21 components, tokens, palettes, ink classes). Theme system/light/dark done, no flash.
- Reduce motion: CSS exists, no toggle. **Sound/lofi: absent** (no src/lib/sound, src/components/sound).
- Progress `iynk:v1` done per D7. Keyboard/ARIA good on the shell; axe on lab pages unverified.
- Mobile: shell drawer only; no phone spec; touch rotate and lab pages untested on a phone.
- FigureFrame done; **embed.js has no pause/resume** (hidden figures keep animating).
- LabDock stub; nav lacks hackathon pages.

## Deploy

- Build fails on tsc (esp32-s3-build.ts 16, RealBuildPanel.test.tsx 10, together/strings.ts 3,
  realtime/messages.ts 3, nodemcu.test.ts 2). Skip-typecheck is off on Vercel by design.
- Pin Node 24 (`engines`): the content generator loads .ts directly (needs ≥22.18).
- **.vercelignore missing**: list .env* (keep .env.example), solana/target, solana/.anchor, solana/node_modules,
  server/realtime/node_modules, .next*, test-results, tsconfig.tsbuildinfo.
- Env vars all optional; **NEXT_PUBLIC_SITE_URL must be the production URL** (canonical, hreflang, OG).
- e2e: 4 specs (shell, boardlab, robotics, dronelab); boardlab targets the 404 Uno page; no phone or hackathon specs.

## Gaps

BLOCKER: B1 tsc; B2 no non-en item pages; B3 no Uno R3 (and uno-r4, whoop, cinewhoop, longrange, wing) en prose;
B4 UI strings copied not translated (robotics 0%, dronelab 1%, boardlab fr/de/zh/hi 2%, together de/zh/hi 0%);
B5 README wrong (old figures path, wrong progress key, "no env vars", no prompts, no deploy steps); B6 25 of 42 item
figures lack figures/prompts/<id>.md (boards esp32-s3-devkitc-1, nano, nodemcu, pico, uno-r4; parts breadboard, led,
resistor, wire; all 6 modules; all 3 robotics; drones cinewhoop, delivery, gpscam, longrange, racer, whoop, wing) and
figures/prompts/README.md is missing.

MAJOR: M1 LabDock stub; M2 nav entries; M3 4 unregistered namespaces; M4 figure strings; M5 sound and settings UI;
M6 embed.js pause/resume (+ rebuild 43 figures); M7 .vercelignore + Node pin; M8 NEXT_PUBLIC_SITE_URL;
M9 e2e phone + hackathon flows.

MINOR: delete fixture-preview; tsconfig .next-* entries; stale .audit/presentable.tsv; messages.test reports only the
first failing locale; phone overflow check covers only 3 paths; `/foo` 404 unverified.

## Estimate (agent-hours)

tsc + key drift 0.75; namespaces 0.5; UI translation 5 (parallel, ~1 h wall); figure strings 3; en prose for
uno-r3/uno-r4/4 drones 3–4; translating existing prose (~240k words) 12–16; hx:dock 3; sound 2; embed.js 0.75;
prompts 1.5; README 1; deploy prep 1; e2e 2; cleanup 0.5. Total ~36–41 (~21–25 without full prose translation).

## Risks

1. Translation volume: full prose for 38 items × 5 languages is ~850k words. Choose a curated translated core or an
   English-prose fallback with a visible notice — never 404s behind the language picker.
2. One half-written content file fails the Vercel build: freeze content an hour before deploy; run `npm run check`.
3. Node version on Vercel. 4. Secrets upload until .vercelignore exists. 5. Demo path broken until Uno R3 renders.
6. embed.js change means rebuilding every figure. 7. Lab pages unverified in dark, phone and axe.
