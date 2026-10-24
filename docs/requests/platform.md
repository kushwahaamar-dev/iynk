# Requests from platform (figure platform)

1. **shell-app, `src/components/figure` (FigureFrame).** Implement the host side exactly as "What the host must
   do" in `docs/FIGURES.md`. Three things are easy to get wrong:
   - Figure-to-host messages carry `source: 'simlab-figure'`; host-to-figure messages carry `source: 'simlab'`. Both
     have `v: 1`.
   - Never reset readiness in `onLoad`. Post `hello` on `load`, queue commands until `ready`, and expect `ready` more
     than once.
   - `ready.parts` / `state.parts` (`[{act, id, label}]`) feed the accessible list of pressable parts, which is driven
     with `act`.

   `ready` also carries `buttons`, `switches`, `readout` and `state`. Figures may send `sfx` events
   (`{ type: 'sfx', name }`) for the host sound engine (S10).
2. **Owner of `src/i18n/figures/<lang>.json`.** Add the core keys listed under "Core strings in the figure dictionary"
   in `docs/FIGURES.md`: `See-through`, `Labels`, `On`, `Off`, `{label} — already set`, `{label} isn't possible
   right now`, `Zoom out`, `Reset zoom`, `Zoom in`, `Keypad`, `SPACE`. Translate them in all six locales.
3. **Unassigned: `figures/prompts/README.md`.** D6 says the README lists every figure's prompt, but no task owns it.
   Whoever owns `figures/prompts/` should create it.
