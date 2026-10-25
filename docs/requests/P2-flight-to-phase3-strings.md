# P2-flight to phase 3: UI strings to translate

Written 2026-10-24 by P2-flight. These keys are new in all six message files; fr, de, es, zh and hi carry the English
text until phase 3 translates them. Placeholders in braces stay as they are.

## `src/i18n/messages/<lang>/flight.json`

| Key | English |
|---|---|
| `modes.demo` | Demo: the autopilot flies it |
| `demoHint` | The autopilot flies this course's line with the same physics you fly. Watch it, then beat it: its times never count. |
| `msg.hintDemo` | The autopilot is flying the course: switch mode to take over |
| `msg.demoTime` | Demo done in {time} s: the autopilot's time does not count |
| `msg.missionTime` | Mission complete: {time} s |
| `msg.missionBest` | Mission complete: {time} s (best!) |
| `msg.medal` | {line}. {medal} medal! (`{line}` is a whole lap, run or mission line, `{medal}` one of `medals.*`) |
| `msg.noMedal` | {line}. Bronze is {s} s |
| `medals.gold`, `medals.silver`, `medals.bronze` | Gold, Silver, Bronze (also used mid-sentence in `fly.bestMedal`) |
| `stats.par` | Medal times |
| `stats.parValue` | {gold} / {silver} / {bronze} |

## `src/i18n/messages/<lang>/dronelab.json`

| Key | English |
|---|---|
| `fly.medalTimes` | Gold {gold} s · silver {silver} s · bronze {bronze} s |
| `fly.bestMedal` | Best: {s} s, {medal} |

Removed: `fly.par` (the course list shows the three medal times instead).
