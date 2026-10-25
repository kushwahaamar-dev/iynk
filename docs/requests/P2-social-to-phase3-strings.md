# P2-social → phase 3: new UI strings to translate

Added by P2-social on 2026-10-24 in `src/i18n/messages/<locale>/common.json`. The es, fr, de, zh and hi files carry the
English text for now; please translate them.

| Key | English |
|---|---|
| `client.sound.label` | Sound |
| `client.sound.turnOn` | Turn sound on |
| `client.sound.turnOff` | Turn sound off |
| `client.usage.label` | Anonymous usage counts |
| `client.usage.body` | iynk counts what happens in the labs (a lesson passed, a step built, a fault tried) for the live counters and leaderboards. Each event carries a random id for this browser, never your name or your code. |
| `client.usage.toggle` | Share anonymous usage counts |

Where they show: the sound toggle (`src/components/settings/SoundToggle.tsx`) in the header row of the board, lesson,
bench and drone workspaces, and the usage note with its opt-out (`UsageToggle.tsx`) at the bottom of the same pages.
