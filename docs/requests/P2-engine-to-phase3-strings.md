# P2-engine → phase 3: new figure strings

Filed 2026-10-24 by P2-engine. Figures translate these with `CF_T`, keyed by the English text, from the figure
dictionaries `src/i18n/figures/<lang>.json` (that folder does not exist yet: `loadFigureStrings` expects it).
Placeholders in braces stay as they are. Added in wave A (`4b4a878`, `f06d126`, `e61a5b8`):

| English |
|---|
| No power on {rail}: nothing reaches the chip |
| Short between {a} and {b}: {name} limits its current, so {rail} falls to 0 V and the rest runs |
| Short from {a} to {b} |
| Leave out {name} |
| {v} V on {src} |
| Brown-out: the circuit draws {n} mA, more than {src} gives ({max} mA), so the chip keeps resetting |
| {name} burned out: {n} mA is more than it can carry |
| {name} overheated and failed |
| {name} burned out: {w} W is too much for its track |
| Boot strap |
| Free the pin and press RESET |
| Wrong level on {name} at reset |
| Status |
| Program |
| Bench |
