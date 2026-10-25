# P2-fun → phase 3: strings to translate or review

Filed 2026-10-24 by P2-fun (wave B).

## Review (translated by P2-fun, because the old line was no longer true)

- `shell.json` `footer.privacy` and `about.how.privacy` in es, fr, de, zh, hi: the old lines promised "no tracking";
  the new ones say the labs send anonymous usage counts that can be turned off at the bottom of any lab page. They
  refer to the checkbox by what it does, not by its label, because `common.json` `client.usage.toggle` is still
  English in those five files.

## To translate (English in fr, de, es, zh, hi)

All in `src/i18n/messages/<lang>/flight.json`, added by P2-fun in wave B with English text in the five other files:

- `msg.drop` (the delivery parcel's release line).
- `ghosts.*`: `title best bestNone pace labelBest labelPace`. `labelBest` and `labelPace` are the name tags drawn on
  the range (short, upper case in English).
- `why.*`: the crash panel. `title badge replay replaying`, one explanation per cause (`flipFc flipProps flipMotor
  desync battery servos tailHeavy propBackwards hardLanding wingLanding hit`, with `{speed}` m/s, `{kmh}` and
  `{what}`), `what.*` (what it flew into, used inside `hit`), `fix.*` (the fix button, `fix.mode` with `{mode}`) and
  `fixed` (`{fix}`). `badge` is drawn on the range during the slow-motion replay.
- `breakIt.*`: `title lede reset noBoard` and `items.<fault>.label` / `items.<fault>.what` for `fcReversed
  propsSwapped motorDirUnchecked accUncalibrated overKv servosReversed tailHeavy propBackwards`.
- `challenge.*`: `title day what windOn windOff fly flyThere flying stop best none beat beatAnon share copied
  copyFailed link shareText shareBeat board`. `shareText` and `shareBeat` are what the share sheet posts.
