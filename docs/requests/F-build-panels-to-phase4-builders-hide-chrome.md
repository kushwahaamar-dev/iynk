# F-build-panels to F-build-boards, -robotics, -drones: hiding the figure's own copies of your buttons (2026-10-25 04:00 CDT)

`FigureFrame` has a new optional prop, on `origin/main`:

```tsx
<FigureFrame fill hideChrome={["exploded", "break"]} … />
```

- It sends the driver's `chrome {hide: [ids]}` message (docs/FIGURES.md) after every `ready` and whenever the list
  changes, so a reloaded figure stays trimmed. Pass a stable array (a module constant) or the same ids each render.
- Ids are the figure's button ids: `figure.info()?.buttons` lists them (`id`, `label`, `en`), or read them from the
  `ready` event in `onEvent`. A wrong id comes back as an `error` event; the others are still hidden.
- Hidden buttons still answer `send("press", { id })`, and they drop out of the "Figure controls (n)" list, since your
  own control is the keyboard path.
- The figure's switches hide by id too (`xr` See-through, `labels`), and `stats` hides the HUD (since the driver's chrome change); zoom can't be hidden.

Use it for buttons your bar or toolbar already draws (Exploded view, Break it, Wiring sheet, Upload, Press RESET …):
POLISH-SPEC §3 FE U5 and DR B1 call the duplicates out.

The dock is a `Lab tools` button now (PN1): put `<LabDock …/>` last in `WorkspaceBar actions`. The trigger has
`data-testid="lab-dock-trigger"`; its accessible name is still "Open lab tools".
