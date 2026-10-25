# P2-rob-power → phase 3: strings to translate

Filed 2026-10-25 by P2-rob-power (wave B).

## UI message keys

None added. Both benches use only the keys the robotics pages already have.

## Item prose (English only, as wave B asks)

- `src/i18n/content/en/robotics/a4988.json` (new in wave B)
- `src/i18n/content/en/robotics/lm2596.json` (new in wave B)

## Figure strings

`src/i18n/figure-keys.json` needs regenerating (`node scripts/figure-strings.mjs`) for these figures, which are new or
changed in wave B and show strings through `T()` / `CF_T` that the file does not list yet:

- `figures/parts/nema17.js`, `figures/parts/multimeter.js` (mat parts: readings such as "{id} · holding",
  "{id} · over range", "{id} · {v} {unit}")
- `figures/modules/a4988.js`, `figures/robotics/a4988.js` (part names, the status line, the toasts: "Vref 0.544 V on
  the meter: the limit is 1.0 A", "Thermal shutdown: the chip reached 165 °C", the status "Coils mixed: buzzing" …)
- `figures/modules/lm2596.js`, `figures/robotics/lm2596.js` (part names, mode titles "Turn the trimmer to 5 V" …,
  the picker "Turn the trimmer ▾" and stat "Trimmer", the status line "Regulating", "Feedback open: OUT follows
  IN", the toasts "Asked for {v} V from {vin} V: a buck only steps down" …)

The bench-notes lines both LM2596 figures print ("Vout = 1.23 x (1 + 1011 / 330) = 5.00 V" …) and the A4988
sketches' serial lines are program output and stay as they are.

`node scripts/figure-strings.mjs --check` on 2026-10-25 reported 1329 strings missing across all figures, these
among them, so the regeneration is a repo-wide one, not mine alone.
